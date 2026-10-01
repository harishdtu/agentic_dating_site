import { createHash } from "node:crypto";
import { loadEnvConfig } from "@next/env";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { analyzePerson, labels } from "../lib/profile-analyzer";
import { isCompleteApifyPerson, linkedInProfileLink, matchPublicProfiles, sanitizeSourceText, type PublicInstagramProfile, type PublicLinkedInProfile } from "../lib/apify-profile";
import { auditDataset } from "../lib/dataset-audit";
import { validateInstagramUrl, validateLinkedinUrl } from "../lib/source-parser";
import type { Person } from "../types";

type Actor = {
  id: string;
  username: string;
  name: string;
  title: string;
  isDeprecated?: boolean;
  taggedBuilds?: { latest?: { buildId?: string } };
};
type ActorSchema = { properties?: Record<string, { type?: string }>; required?: string[] };
type ActorPlan = { actor: Actor; inputSchema: ActorSchema };
type ActorRun = { id: string; status: string; defaultDatasetId?: string; usageTotalUsd?: number };
type Candidate = { linkedinUrl: string; instagram: PublicInstagramProfile };
type CachedRun<T> = { runId: string; datasetId: string; items: T[] };

const apiBase = "https://api.apify.com/v2";
const root = process.cwd();
const cacheDir = path.join(root, "data", "apify-cache");
const outputFile = path.join(root, "data", "apify-people.json");
const refresh = process.argv.includes("--refresh");
const maxChargePerRunUsd = 0.25;
const maxCandidates = 40;
const linkedinBatchSize = 5;
const linkedinSearches = [
  "Indian software engineer AI developer",
  "Indian startup founder technology",
  "Indian product manager designer",
  "Indian photographer filmmaker travel creator",
];
const instagramSearches = [
  '"linkedin.com/in" "software engineer" India Instagram',
  '"linkedin.com/in" "product manager" India Instagram',
  '"linkedin.com/in" founder India technology Instagram',
  '"linkedin.com/in" "AI researcher" India Instagram',
  '"linkedin.com/in" "travel creator" India Instagram',
  '"linkedin.com/in" "fitness creator" India Instagram',
];

loadEnvConfig(root);

function requiredToken(): string {
  const token = process.env.APIFY_API_TOKEN?.trim();
  if (!token) throw new Error("APIFY_API_TOKEN is missing. Add a fresh Apify token to the ignored .env.local file and rerun npm run build:dataset.");
  return token;
}

async function apifyRequest<T>(url: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: { Authorization: `Bearer ${requiredToken()}`, ...(init.headers ?? {}) },
    signal: init.signal ?? AbortSignal.timeout(90_000),
  });
  if (!response.ok) throw new Error(`Apify request failed (${response.status}) for ${new URL(url).pathname}.`);
  return await response.json() as T;
}

async function atomicJson(filePath: string, value: unknown): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
  const tempPath = `${filePath}.tmp`;
  await writeFile(tempPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  await rename(tempPath, filePath);
}

async function cachedRun<T>(name: string, run: () => Promise<CachedRun<T>>, cacheKey = ""): Promise<CachedRun<T>> {
  const suffix = cacheKey ? `-${createHash("sha256").update(cacheKey).digest("hex").slice(0, 12)}` : "";
  const filePath = path.join(cacheDir, `${name}${suffix}.json`);
  if (!refresh) {
    try {
      return JSON.parse(await readFile(filePath, "utf8")) as CachedRun<T>;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
  }
  const result = await run();
  await atomicJson(filePath, result);
  return result;
}

async function discoverActor(search: string, username: string, name: string): Promise<ActorPlan> {
  const store = await apifyRequest<{ data: { items: Actor[] } }>(`${apiBase}/store?search=${encodeURIComponent(search)}&limit=100`);
  const actor = store.data.items.find((item) => item.username === username && item.name === name && !item.isDeprecated);
  if (!actor) throw new Error(`No active ${search} Actor was found in the Apify Store.`);

  const detailResponse = await apifyRequest<{ data: Actor }>(`${apiBase}/actors/${actor.id}`);
  const detail = detailResponse.data;
  const buildId = detail.taggedBuilds?.latest?.buildId;
  if (!buildId) throw new Error(`The current build for ${detail.title} is unavailable.`);
  const openApi = await apifyRequest<{ components?: { schemas?: { inputSchema?: ActorSchema } } }>(`${apiBase}/actors/${actor.id}/builds/${buildId}/openapi.json`);
  const inputSchema = openApi.components?.schemas?.inputSchema;
  if (!inputSchema?.properties) throw new Error(`No input schema was published for ${detail.title}; refusing to run it.`);
  return { actor: detail, inputSchema };
}

function validateActorInput(plan: ActorPlan, input: Record<string, unknown>): void {
  const properties = plan.inputSchema.properties ?? {};
  const unknown = Object.keys(input).filter((key) => !(key in properties));
  if (unknown.length) throw new Error(`${plan.actor.title} input has unsupported fields: ${unknown.join(", ")}.`);
  const missing = (plan.inputSchema.required ?? []).filter((key) => !(key in input));
  if (missing.length) throw new Error(`${plan.actor.title} input is missing schema-required fields: ${missing.join(", ")}.`);
}

async function runActor<T>(plan: ActorPlan, input: Record<string, unknown>): Promise<CachedRun<T>> {
  validateActorInput(plan, input);
  const startUrl = new URL(`${apiBase}/acts/${plan.actor.id}/runs`);
  startUrl.searchParams.set("waitForFinish", "60");
  startUrl.searchParams.set("maxTotalChargeUsd", String(maxChargePerRunUsd));
  const started = await apifyRequest<{ data: ActorRun }>(startUrl.toString(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  let run = started.data;
  const startedAt = Date.now();
  while (["READY", "RUNNING"].includes(run.status) && Date.now() - startedAt < 20 * 60_000) {
    const waitUrl = new URL(`${apiBase}/actor-runs/${run.id}`);
    waitUrl.searchParams.set("waitForFinish", "60");
    run = (await apifyRequest<{ data: ActorRun }>(waitUrl.toString())).data;
  }
  if (run.status !== "SUCCEEDED" || !run.defaultDatasetId) throw new Error(`${plan.actor.title} ended with status ${run.status}.`);
  const items = await apifyRequest<T[]>(`${apiBase}/datasets/${run.defaultDatasetId}/items?format=json&clean=true&limit=100`);
  return { runId: run.id, datasetId: run.defaultDatasetId, items };
}

function normalizedName(value: string): string {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function canonicalProfileUrl(value: string): string {
  try {
    const url = new URL(value);
    return `${url.hostname.toLowerCase()}${url.pathname.replace(/\/+$/, "")}`;
  } catch {
    return "";
  }
}

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function strings(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((item) => typeof item === "string" ? item.trim() : asString((item as { name?: unknown })?.name)).filter(Boolean);
  return typeof value === "string" ? [value.trim()].filter(Boolean) : [];
}

function normalizeInstagram(item: Record<string, unknown>): PublicInstagramProfile | null {
  const url = asString(item.url ?? item.profileUrl ?? item.inputUrl);
  const name = asString(item.fullName ?? item.full_name ?? item.name);
  const username = asString(item.username);
  if (!validateInstagramUrl(url) || !name || !username || item.private === true || item.is_private === true) return null;
  const bioLinks = Array.isArray(item.bio_links) ? item.bio_links.map((link) => asString((link as { url?: unknown }).url)) : [];
  const rawBiography = asString(item.biography ?? item.bio);
  const linkedProfile = linkedInProfileLink([rawBiography, asString(item.externalUrl ?? item.external_url), ...bioLinks]);
  return {
    name,
    username,
    url,
    biography: sanitizeSourceText([rawBiography]),
    category: asString(item.businessCategoryName ?? item.categoryName ?? item.category ?? item.account_type),
    externalLinks: linkedProfile ? [linkedProfile] : [],
    isPrivate: false,
  };
}

function normalizeLinkedInCandidate(item: Record<string, unknown>): { name: string; url: string } | null {
  const url = asString(item.linkedinUrl ?? item.url ?? item.profileUrl);
  const name = asString(item.fullName ?? item.name ?? [item.firstName, item.lastName].map(asString).filter(Boolean).join(" "));
  return validateLinkedinUrl(url) && name ? { name, url } : null;
}

function buildCandidates(instagramProfiles: PublicInstagramProfile[], linkedinCandidates: { name: string; url: string }[]): Candidate[] {
  const linkedinByName = new Map<string, { name: string; url: string }[]>();
  for (const candidate of linkedinCandidates) {
    const key = normalizedName(candidate.name);
    linkedinByName.set(key, [...(linkedinByName.get(key) ?? []), candidate]);
  }
  const candidates: Candidate[] = [];
  const seenPairs = new Set<string>();
  for (const instagram of instagramProfiles) {
    const directLink = linkedInProfileLink([instagram.biography, ...instagram.externalLinks]);
    const matches = linkedinByName.get(normalizedName(instagram.name)) ?? [];
    const urls = directLink ? [directLink] : matches.map((candidate) => candidate.url);
    for (const linkedinUrl of urls) {
      if (!validateLinkedinUrl(linkedinUrl)) continue;
      const matchingSearchResult = matches.find((candidate) => canonicalProfileUrl(candidate.url) === canonicalProfileUrl(linkedinUrl));
      if (!directLink && !matchingSearchResult) continue;
      const key = `${canonicalProfileUrl(linkedinUrl)}|${canonicalProfileUrl(instagram.url)}`;
      if (seenPairs.has(key)) continue;
      seenPairs.add(key);
      candidates.push({ linkedinUrl, instagram });
      if (candidates.length >= maxCandidates) return candidates;
    }
  }
  return candidates;
}

function findLinkedInProfile(items: PublicLinkedInProfile[], url: string): PublicLinkedInProfile | undefined {
  const key = canonicalProfileUrl(url);
  return items.find((item) => canonicalProfileUrl(item.url) === key);
}

function normalizeLinkedInProfile(item: Record<string, unknown>, url: string): PublicLinkedInProfile | null {
  const profile = item.profile && typeof item.profile === "object" ? item.profile as Record<string, unknown> : item;
  const name = asString(profile.fullName ?? profile.full_name ?? profile.name ?? [profile.firstName ?? profile.first_name, profile.lastName ?? profile.last_name].map(asString).filter(Boolean).join(" "));
  const currentPositions = Array.isArray(profile.currentPosition) ? profile.currentPosition : [];
  const current = (currentPositions[0] ?? {}) as Record<string, unknown>;
  const groups = Array.isArray(profile.position_groups) ? profile.position_groups : [];
  const group = (groups[0] ?? {}) as Record<string, unknown>;
  const groupPositions = Array.isArray(group.profile_positions) ? group.profile_positions : [];
  const groupPosition = (groupPositions[0] ?? {}) as Record<string, unknown>;
  const experience = Array.isArray(profile.experience) ? profile.experience : [];
  const firstExperience = (experience[0] ?? {}) as Record<string, unknown>;
  const companyProfile = profile.company && typeof profile.company === "object" ? profile.company as Record<string, unknown> : {};
  const groupCompany = group.company && typeof group.company === "object" ? group.company as Record<string, unknown> : {};
  const headline = sanitizeSourceText([asString(profile.headline ?? profile.title ?? profile.position)]);
  const currentRole = sanitizeSourceText([asString(current.position ?? current.title ?? groupPosition.title ?? firstExperience.position)]);
  const company = sanitizeSourceText([asString(current.companyName ?? groupCompany.name ?? firstExperience.companyName ?? companyProfile.name ?? profile.companyName)]);
  const skills = strings(profile.topSkills ?? profile.skills).map((skill) => sanitizeSourceText([skill])).filter(Boolean).slice(0, 12);
  return name ? { name, url, headline, currentRole, company, skills } : null;
}

async function previousPeople(): Promise<Person[]> {
  try {
    const existing = JSON.parse(await readFile(outputFile, "utf8")) as Person[];
    return existing.filter(isCompleteApifyPerson).filter((person) => auditDataset([person], 1).issues.length === 0);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
}

async function main(): Promise<void> {
  const token = requiredToken();
  const auth = await fetch(`${apiBase}/users/me`, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(20_000) });
  if (!auth.ok) throw new Error(`Apify credential verification failed (${auth.status}); no Actor runs were started.`);
  console.log("Apify authentication: verified (credential value hidden).");

  const [instagramFinder, linkedinSearch, linkedinScraper] = await Promise.all([
    discoverActor("Instagram Profile Finder", "instagram-scraper", "instagram-profile-finder"),
    discoverActor("LinkedIn Profile Search Scraper No Cookies", "harvestapi", "linkedin-profile-search"),
    discoverActor("LinkedIn Profile Scraper NO COOKIES", "atomus", "linkedin-profile-scraper"),
  ]);
  const instagramInput = {
    queries: instagramSearches,
    emailDiscoveryMode: false,
    searchMode: "profiles",
    queryMaxPages: 1,
    searchCountry: "in",
    searchLanguage: "en",
    scrapeFacebookProfile: false,
    skipPostCount: true,
    skipLatestPosts: true,
    skipRelatedProfiles: true,
  };
  validateActorInput(instagramFinder, instagramInput);
  const instagramRun = await cachedRun<PublicInstagramProfile>("instagram-discovery", async () => {
    const result = await runActor<Record<string, unknown>>(instagramFinder, instagramInput);
    return { ...result, items: result.items.map((item) => normalizeInstagram(item as Record<string, unknown>)).filter((item): item is PublicInstagramProfile => Boolean(item)) };
  });

  const instagramProfiles = instagramRun.items.filter((profile) => !profile.isPrivate && validateInstagramUrl(profile.url));
  const linkedinCandidateRows: { name: string; url: string }[] = [];
  if (!refresh) {
    for (let index = 0; index < linkedinSearches.length; index += 1) {
      try {
        const cached = JSON.parse(await readFile(path.join(cacheDir, `linkedin-search-${index + 1}.json`), "utf8")) as CachedRun<{ name: string; url: string }>;
        linkedinCandidateRows.push(...cached.items);
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      }
    }
  }

  const nameParts = instagramProfiles.map((profile) => profile.name.trim().split(/\s+/).filter(Boolean)).filter((parts) => parts.length >= 2);
  const nameSearchInput = {
    firstNames: [...new Set(nameParts.map((parts) => parts[0]))].slice(0, 50),
    lastNames: [...new Set(nameParts.map((parts) => parts[parts.length - 1]))].slice(0, 50),
    maxItems: 100,
    profileScraperMode: "Short",
  };
  if (nameSearchInput.firstNames.length && nameSearchInput.lastNames.length) {
    const nameSearch = await cachedRun<{ name: string; url: string }>("linkedin-name-search", async () => {
      const result = await runActor<Record<string, unknown>>(linkedinSearch, nameSearchInput);
      return { ...result, items: result.items.map((item) => normalizeLinkedInCandidate(item as Record<string, unknown>)).filter((item): item is { name: string; url: string } => Boolean(item)) };
    }, JSON.stringify(nameSearchInput));
    linkedinCandidateRows.push(...nameSearch.items);
  }

  const candidates = buildCandidates(instagramProfiles, linkedinCandidateRows);
  await atomicJson(path.join(cacheDir, "matched-candidates.json"), candidates.map(({ linkedinUrl, instagram }) => ({ linkedinUrl, instagram })));
  console.log(`Candidates discovered: ${new Set(instagramProfiles.map((profile) => profile.url)).size} Instagram, ${new Set(linkedinCandidateRows.map((profile) => profile.url)).size} LinkedIn; ${candidates.length} paired for verification.`);

  const existing = await previousPeople();
  const existingLinkedinUrls = new Set(existing.map((person) => canonicalProfileUrl(person.linkedinUrl)));
  const existingInstagramUrls = new Set(existing.map((person) => canonicalProfileUrl(person.instagramUrl)));
  const selected = candidates.filter((candidate) =>
    !existingLinkedinUrls.has(canonicalProfileUrl(candidate.linkedinUrl)) &&
    !existingInstagramUrls.has(canonicalProfileUrl(candidate.instagram.url))
  ).slice(0, maxCandidates);
  const verified: Person[] = [...existing];
  const knownNames = new Set(existing.map((person) => normalizedName(person.name)));
  const knownLinkedIn = new Set(existing.map((person) => canonicalProfileUrl(person.linkedinUrl)));
  const knownInstagram = new Set(existing.map((person) => canonicalProfileUrl(person.instagramUrl)));
  let rejected = 0;
  for (let offset = 0; offset < selected.length && verified.length < 25; offset += linkedinBatchSize) {
    const batch = selected.slice(offset, offset + linkedinBatchSize);
    const batchUrls = batch.map((candidate) => canonicalProfileUrl(candidate.linkedinUrl)).join("\n");
    const linkedinRun = await cachedRun<PublicLinkedInProfile>("linkedin-profiles", async () => {
      const input = {
        profileUrls: batch.map((candidate) => candidate.linkedinUrl),
        findEmail: false,
        includeCompanyDetails: false,
      };
      const result = await runActor<Record<string, unknown>>(linkedinScraper, input);
      return {
        ...result,
        items: result.items.map((item) => {
          const url = asString(item.linkedinUrl ?? item.url ?? item.profileUrl);
          return normalizeLinkedInProfile(item, url);
        }).filter((profile): profile is PublicLinkedInProfile => Boolean(profile)),
      };
    }, `${linkedinScraper.actor.id}\n${batchUrls}`);

    for (const candidate of batch) {
      if (verified.length >= 25) break;
      const linkedin = findLinkedInProfile(linkedinRun.items, candidate.linkedinUrl);
      const match = linkedin && matchPublicProfiles(linkedin, candidate.instagram);
      if (!linkedin || !match || !labels(analyzePerson({
        id: "pending", name: linkedin.name, headline: linkedin.headline,
        linkedinUrl: candidate.linkedinUrl, instagramUrl: candidate.instagram.url, verified: true,
        sourceData: { linkedin: { text: match.linkedinText, verified: true }, instagram: { text: match.instagramText, verified: true } },
      } as Person).interests).length) {
        rejected += 1;
        continue;
      }
      const nameKey = normalizedName(linkedin.name);
      const liKey = canonicalProfileUrl(candidate.linkedinUrl);
      const igKey = canonicalProfileUrl(candidate.instagram.url);
      if (knownNames.has(nameKey) || knownLinkedIn.has(liKey) || knownInstagram.has(igKey)) {
        rejected += 1;
        continue;
      }
      const person: Person = {
        id: `person-${String(verified.length + 1).padStart(3, "0")}`,
        name: linkedin.name,
        headline: linkedin.headline || linkedin.currentRole,
        linkedinUrl: candidate.linkedinUrl,
        instagramUrl: candidate.instagram.url,
        verified: true,
        sourceData: {
          linkedin: { text: match.linkedinText, verified: true, retrievedVia: "apify", actorRunId: linkedinRun.runId, datasetId: linkedinRun.datasetId },
          instagram: { text: match.instagramText, verified: true, retrievedVia: "apify", actorRunId: instagramRun.runId, datasetId: instagramRun.datasetId },
        },
        identityVerification: match.identityVerification,
      };
      if (auditDataset([person], 1).issues.length) {
        rejected += 1;
        continue;
      }
      verified.push(person);
      knownNames.add(nameKey);
      knownLinkedIn.add(liKey);
      knownInstagram.add(igKey);
    }
  }

  const normalized = verified.slice(0, 25).map((person, index) => ({ ...person, id: `person-${String(index + 1).padStart(3, "0")}` }));
  await atomicJson(outputFile, normalized);
  const audit = auditDataset(normalized, 25);
  console.log(`Candidates rejected: ${rejected + Math.max(0, candidates.length - selected.length)}.`);
  console.log(`Verified people obtained: ${normalized.length}/25.`);
  console.log(`Actors used: ${selected.length ? [instagramFinder.actor.title, linkedinSearch.actor.title, linkedinScraper.actor.title].join("; ") : "0 (no profiles needed)"}.`);
  const runCountCap = 1 + Number(Boolean(nameSearchInput.firstNames.length)) + Math.ceil(selected.length / linkedinBatchSize);
  console.log(`Estimated maximum for new runs: USD ${(maxChargePerRunUsd * runCountCap).toFixed(2)}; LinkedIn profile results are USD 0.006 each with a USD 0.05 run minimum; check Apify usage for actual free-credit coverage.`);
  console.log(`Pair counts: ${audit.unorderedPairs} unique unordered; ${audit.directedRankings} directed.`);
  if (audit.issues.length) {
    console.log(`Dataset validation: ${audit.issues.length} issue(s); see npm run audit:dataset for the detailed report.`);
    process.exitCode = 1;
  } else {
    console.log("Dataset validation: PASS (25 verified records).");
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Dataset build failed.";
  console.error(`Dataset build stopped: ${message}`);
  if (message.includes("APIFY_API_TOKEN is missing")) console.log("Candidates discovered: 0. Candidates rejected: 0. Verified people obtained: 0. Actors used: 0.");
  process.exitCode = 1;
});
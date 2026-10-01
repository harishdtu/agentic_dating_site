import { analyzePerson } from "./profile-analyzer";
import { validateInstagramUrl, validateLinkedinUrl } from "./source-parser";
import type { IdentityMatchKey, Person } from "../types";

const matchKeys: IdentityMatchKey[] = ["name", "username", "cross-link", "role", "company", "bio-reference"];
const normalize = (value: string) => value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
const canonicalUrl = (value: string) => {
  try {
    const url = new URL(value);
    return `${url.hostname.toLowerCase()}${url.pathname.replace(/\/+$/, "")}`;
  } catch {
    return "";
  }
};

export type DatasetAudit = {
  people: number;
  verified: number;
  linkedinUrls: number;
  instagramUrls: number;
  duplicateIdentities: number;
  missingEvidence: number;
  externalEvidenceSources: number;
  unorderedPairs: number;
  directedRankings: number;
  issues: string[];
};

export function auditDataset(all: Person[], requiredPeople = 25): DatasetAudit {
  const issues: string[] = [];
  const verified = all.filter((person) => person.verified);
  const ids = new Set<string>();
  const linkedinUrls = new Set<string>();
  const instagramUrls = new Set<string>();
  const names = new Map<string, number>();
  let missingEvidence = 0;
  let externalEvidenceSources = 0;

  if (all.length !== requiredPeople) issues.push(`Expected exactly ${requiredPeople} records; found ${all.length}.`);
  if (verified.length !== requiredPeople) issues.push(`Expected ${requiredPeople} verified records; found ${verified.length}.`);

  for (const person of all) {
    if (!person.id.trim() || ids.has(person.id)) issues.push(`Missing or duplicate person ID: ${person.id || "(empty)"}.`);
    ids.add(person.id);
    if (!person.verified) issues.push(`Person ${person.id} is not verified.`);

    const normalizedName = normalize(person.name);
    if (!normalizedName) issues.push(`Person ${person.id} has no usable name.`);
    else if (person.verified) names.set(normalizedName, (names.get(normalizedName) ?? 0) + 1);

    if (!validateLinkedinUrl(person.linkedinUrl)) issues.push(`Person ${person.id} has no valid LinkedIn profile URL.`);
    else {
      const url = canonicalUrl(person.linkedinUrl);
      if (linkedinUrls.has(url)) issues.push(`Duplicate LinkedIn URL for person ${person.id}.`);
      linkedinUrls.add(url);
    }
    if (!validateInstagramUrl(person.instagramUrl)) issues.push(`Person ${person.id} has no valid Instagram profile URL.`);
    else {
      const url = canonicalUrl(person.instagramUrl);
      if (instagramUrls.has(url)) issues.push(`Duplicate Instagram URL for person ${person.id}.`);
      instagramUrls.add(url);
    }

    const linkedin = person.sourceData?.linkedin;
    const instagram = person.sourceData?.instagram;
    let personMissingEvidence = false;
    for (const [source, data] of [["LinkedIn", linkedin], ["Instagram", instagram]] as const) {
      if (!data?.verified || !data.text.trim()) {
        issues.push(`Person ${person.id} is missing verified ${source} source text.`);
        personMissingEvidence = true;
      }
      if (data?.retrievedVia !== "apify" || !data.actorRunId?.trim() || !data.datasetId?.trim()) {
        issues.push(`Person ${person.id} is missing ${source} Apify run/dataset provenance.`);
        personMissingEvidence = true;
      }
    }

    const verification = person.identityVerification;
    const linkedinProof = verification?.linkedinEvidence ?? [];
    const instagramProof = verification?.instagramEvidence ?? [];
    const matchedKeys = new Set(verification?.matchedOn ?? []);
    const validMatch = matchedKeys.size >= 2 && matchedKeys.has("name") && [...matchedKeys].every((key) => matchKeys.includes(key));
    const proofOccursInSources = (proof: string[], sourceText: string) =>
      proof.length > 0 && proof.every((snippet) => snippet.trim().length >= 3 && sourceText.toLowerCase().includes(snippet.trim().toLowerCase()));
    if (!validMatch || !proofOccursInSources(linkedinProof, linkedin?.text ?? "") || !proofOccursInSources(instagramProof, instagram?.text ?? "")) {
      issues.push(`Person ${person.id} lacks source-backed LinkedIn/Instagram identity-match evidence.`);
      personMissingEvidence = true;
    }

    const sourceKeys = Object.keys(person.sourceData ?? {}).sort();
    if (sourceKeys.join(",") !== "instagram,linkedin") externalEvidenceSources += 1;
    const signals = Object.values(analyzePerson(person)).flat();
    if (!signals.some((signal) => signal.label)) issues.push(`Person ${person.id} has no analyzable public interest signals.`);
    for (const signal of signals) {
      if (!signal.evidence?.trim()) {
        issues.push(`Person ${person.id} has a signal without evidence.`);
        personMissingEvidence = true;
      }
      if (signal.source !== "linkedin" && signal.source !== "instagram") externalEvidenceSources += 1;
    }
    if (personMissingEvidence) missingEvidence += 1;
  }

  const duplicateIdentities = [...names.values()].filter((count) => count > 1).length;
  if (duplicateIdentities) issues.push(`Found ${duplicateIdentities} duplicate normalized name identity group(s).`);
  if (externalEvidenceSources) issues.push(`Found ${externalEvidenceSources} evidence source(s) outside LinkedIn/Instagram.`);

  const count = verified.length;
  return {
    people: all.length,
    verified: count,
    linkedinUrls: linkedinUrls.size,
    instagramUrls: instagramUrls.size,
    duplicateIdentities,
    missingEvidence,
    externalEvidenceSources,
    unorderedPairs: count * (count - 1) / 2,
    directedRankings: count * (count - 1),
    issues,
  };
}
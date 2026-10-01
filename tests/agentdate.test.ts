import { describe, it, expect } from "vitest";
import { validateLinkedinUrl, validateInstagramUrl, parseMetadata, normalizeText } from "../lib/source-parser";
import { analyzeText, detect, labels } from "../lib/profile-analyzer";
import { compatibility, rankingsFor, allRankings, WEIGHTS } from "../lib/compatibility";
import { generateConversation } from "../lib/agent-engine";
import { auditDataset } from "../lib/dataset-audit";
import { linkedInProfileLink, matchPublicProfiles, sanitizeSourceText } from "../lib/apify-profile";
import { datasetStats, verifiedPeople, people } from "../data/people";
import type { Person } from "../types";

const mk = (id: string, li: string, ig: string): Person => ({
  id, name: id.toUpperCase(), linkedinUrl: "x", instagramUrl: "y", verified: true,
  sourceData: { linkedin: { text: li, verified: true }, instagram: { text: ig, verified: true } },
});
const A = mk("a", "AI software startup founder building products", "travel, coffee and cycling");
const B = mk("b", "Startup product engineering with AI", "travel photography and reading books");
const C = mk("c", "Music and film design", "cooking baking restaurant");
const all = [A, B, C];

describe("URL validation", () => {
  it("accepts a LinkedIn profile URL", () => expect(validateLinkedinUrl("https://www.linkedin.com/in/some-person/")).toBe(true));
  it("rejects non-profile LinkedIn URL", () => expect(validateLinkedinUrl("https://www.linkedin.com/company/x")).toBe(false));
  it("accepts Instagram profile", () => expect(validateInstagramUrl("https://instagram.com/some.user")).toBe(true));
  it("rejects Instagram post URL", () => expect(validateInstagramUrl("https://www.instagram.com/p/abc123/")).toBe(false));
  it("rejects http / other hosts", () => expect(validateInstagramUrl("http://evil.com/some.user")).toBe(false));
});
describe("metadata parsing", () => {
  const html = `<html><head><title>Jane &amp; Co</title><meta name="description" content="Builds AI products"><meta property="og:title" content="Jane"><meta content="Loves travel" property="og:description"></head></html>`;
  const m = parseMetadata(html);
  it("extracts title/description", () => { expect(m.title).toBe("Jane & Co"); expect(m.description).toBe("Builds AI products"); });
  it("extracts og tags in either attribute order", () => { expect(m.ogTitle).toBe("Jane"); expect(m.ogDescription).toBe("Loves travel"); });
  it("normalizes whitespace", () => expect(normalizeText("a \n  b")).toBe("a b"));
});
describe("analysis", () => {
  it("detects interests by category", () => expect(Object.keys(detect("AI and cricket"))).toEqual(["Technology", "Sports"]));
  it("uses word boundaries", () => expect(detect("maintain said")).toEqual({}));
  it("extracts hobbies from Instagram text", () => expect(labels(analyzeText("", "cycling and coffee").hobbies)).toEqual(expect.arrayContaining(["cycling", "coffee"])));
  it("every signal has label, evidence, source", () => {
    const a = analyzeText("AI startup building", "travel");
    for (const s of Object.values(a).flat()) { expect(s.label && s.evidence).toBeTruthy(); expect(["linkedin", "instagram"]).toContain(s.source); }
  });
  it("evidence cites the correct source", () => expect(analyzeText("", "travel").interests[0].evidence).toContain("Instagram"));
  it("infers needs only from explicit multi-term signals", () => {
    expect(analyzeText("startup building", "").needs[0].label).toMatch(/project-oriented/);
    expect(analyzeText("startup", "").needs).toHaveLength(0);
  });
  it("empty text yields no signals", () => expect(Object.values(analyzeText("", "")).flat()).toHaveLength(0));
});
describe("compatibility + ranking", () => {
  it("weights sum to 1", () => expect(Object.values(WEIGHTS).reduce<number>((x, y) => x + y, 0)).toBeCloseTo(1));
  it("scores within 0-100 and finds shared items", () => {
    const c = compatibility(A, B);
    expect(c.score).toBeGreaterThan(0); expect(c.score).toBeLessThanOrEqual(100);
    expect(c.sharedInterests).toEqual(expect.arrayContaining(["Technology", "Travel"]));
  });
  it("is symmetric", () => expect(compatibility(A, B).score).toBe(compatibility(B, A).score));
  it("ranks descending", () => { const r = rankingsFor(A, all); expect(r[0].person.id).toBe("b"); expect(r[0].score).toBeGreaterThanOrEqual(r[1].score); });
  it("excludes self-match", () => expect(rankingsFor(A, all).some((r) => r.person.id === "a")).toBe(false));
  it("yields N×(N-1) directed rankings", () => expect(Object.values(allRankings(all)).flat()).toHaveLength(6));
});
describe("conversation", () => {
  it("has 6-10 turns and ends complete", () => {
    const t = generateConversation(A, B);
    expect(t.length).toBeGreaterThanOrEqual(6); expect(t.length).toBeLessThanOrEqual(10);
    expect(t.at(-1)!.status).toBe("complete");
  });
  it("is deterministic", () => expect(generateConversation(A, B)).toEqual(generateConversation(A, B)));
  it("depends on the profiles", () => expect(generateConversation(A, B)).not.toEqual(generateConversation(A, C)));
  it("mentions a shared interest", () => expect(generateConversation(A, B)[1].text).toMatch(/Technology|Travel|Business/));
});
describe("dataset", () => {
  it("excludes unverified entries from the verified dataset", () => {
    const unverified = { ...people[0], id: "unverified-entry", verified: false };
    expect(verifiedPeople([unverified])).toHaveLength(0);
    expect(verifiedPeople([...people, unverified])).toEqual(people.filter((person) => person.verified));
  });
  it("computes stats dynamically", () => expect(datasetStats(all)).toMatchObject({ verified: 3, sources: 6, directed: 6, unorderedPairs: 3, complete: false }));
  it("audits record, verification, and pair counts dynamically", () => {
    const audit = auditDataset(people);
    expect(audit.people).toBe(people.length);
    expect(audit.verified).toBe(verifiedPeople(people).length);
    expect(audit.unorderedPairs).toBe(datasetStats(people).unorderedPairs);
    expect(audit.directedRankings).toBe(datasetStats(people).directed);
  });
});
describe("Apify profile verification", () => {
  const linkedin = { name: "Asha Rao", url: "https://www.linkedin.com/in/asha-rao/", headline: "AI engineer", currentRole: "Software Engineer", company: "Northstar Labs", skills: ["AI"] };
  const instagram = { name: "Asha Rao", username: "asharao", url: "https://www.instagram.com/asharao/", biography: "Software Engineer at Northstar Labs", category: "Technology", externalLinks: [], isPrivate: false };

  it("rejects same-name profiles without a second identity signal", () => {
    expect(matchPublicProfiles(linkedin, { ...instagram, biography: "Creator" })).toBeNull();
  });
  it("accepts exact names plus a company match and emits source-present evidence", () => {
    const match = matchPublicProfiles(linkedin, instagram);
    expect(match?.identityVerification.matchedOn).toEqual(expect.arrayContaining(["name", "company"]));
    expect(match?.linkedinText).toContain("Northstar Labs");
    expect(match?.instagramText).toContain("Northstar Labs");
  });
  it("accepts a direct Instagram-to-LinkedIn profile link", () => {
    const link = "https://www.linkedin.com/in/asha-rao/";
    expect(linkedInProfileLink([`Professional profile: ${link}`])).toBe("https://www.linkedin.com/in/asha-rao");
    const match = matchPublicProfiles(linkedin, { ...instagram, biography: "Creator", externalLinks: [link] });
    expect(match?.identityVerification.matchedOn).toContain("cross-link");
    expect(match?.instagramText).toContain("https://www.linkedin.com/in/asha-rao");
  });
  it("removes contact data and drops sensitive-attribute statements", () => {
    expect(sanitizeSourceText(["AI engineer, reach me at person@example.com", "My religion is private"])).toBe("AI engineer, reach me at");
  });
});

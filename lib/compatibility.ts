import type { Compatibility, Person } from "../types";
import { analyzePerson, labels } from "./profile-analyzer";
export const WEIGHTS = { interests: 0.4, hobbies: 0.25, topics: 0.2, lifestyle: 0.15 } as const;
const inter = (a: string[], b: string[]) => a.filter((x) => b.includes(x));
const jaccard = (a: string[], b: string[]) => {
  const u = new Set([...a, ...b]).size;
  return u === 0 ? 0 : inter(a, b).length / u;
};
export function compatibility(a: Person, b: Person): Compatibility {
  const A = analyzePerson(a), B = analyzePerson(b);
  const f = (k: keyof typeof A) => [labels(A[k]), labels(B[k])] as const;
  const [ai, bi] = f("interests"), [ah, bh] = f("hobbies"), [at, bt] = f("conversationTopics"), [al, bl] = f("lifestyleSignals");
  const raw = jaccard(ai, bi) * WEIGHTS.interests + jaccard(ah, bh) * WEIGHTS.hobbies +
    jaccard(at, bt) * WEIGHTS.topics + jaccard(al, bl) * WEIGHTS.lifestyle;
  const sharedInterests = inter(ai, bi), sharedHobbies = inter(ah, bh), sharedTopics = inter(at, bt), sharedLifestyle = inter(al, bl);
  const reasons = [
    sharedInterests.length && `${sharedInterests.length} shared interest${sharedInterests.length > 1 ? "s" : ""}`,
    sharedHobbies.length && `${sharedHobbies.length} shared hobb${sharedHobbies.length > 1 ? "ies" : "y"}`,
    sharedTopics.length && `${sharedTopics.length} overlapping conversation topic${sharedTopics.length > 1 ? "s" : ""}`,
  ].filter(Boolean) as string[];
  const score = Math.round(raw * 100);
  const explanation = reasons.length
    ? `Simulated compatibility based on public profile signals: ${reasons.join(", ")}.`
    : "No overlapping public signals were found; this is a simulation, not a statement about either person.";
  return { score, sharedInterests, sharedHobbies, sharedTopics, sharedLifestyle, reasons, explanation };
}
export type RankingRow = { person: Person; rank: number } & Compatibility;
export function rankingsFor(person: Person, all: Person[]): RankingRow[] {
  return all.filter((p) => p.id !== person.id)
    .map((p) => ({ person: p, rank: 0, ...compatibility(person, p) }))
    .sort((x, y) => y.score - x.score || x.person.name.localeCompare(y.person.name))
    .map((r, i) => ({ ...r, rank: i + 1 }));
}
export const allRankings = (all: Person[]) => Object.fromEntries(all.map((p) => [p.id, rankingsFor(p, all)]));

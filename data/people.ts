import type { Person } from "../types";
import apifyPeople from "./apify-people.json";

const placeholder = (n: number): Person => ({
  id: `person-${String(n).padStart(3, "0")}`, name: "DATASET PLACEHOLDER",
  linkedinUrl: "", instagramUrl: "", verified: false,
  sourceData: { linkedin: { text: "", verified: false }, instagram: { text: "", verified: false } },
});
export const people: Person[] = apifyPeople.length ? apifyPeople as Person[] : [placeholder(1), placeholder(2), placeholder(3)];
export const REQUIRED_PEOPLE = 25;
export const verifiedPeople = (all: Person[] = people) => all.filter((p) => p.verified);
export const datasetStats = (all: Person[] = people) => {
  const n = verifiedPeople(all).length;
  return { verified: n, sources: n * 2, directed: n * (n - 1), unorderedPairs: (n * (n - 1)) / 2, complete: n >= REQUIRED_PEOPLE };
};

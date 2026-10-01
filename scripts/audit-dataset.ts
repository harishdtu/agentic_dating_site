import { people } from "../data/people";
import { auditDataset } from "../lib/dataset-audit";

const audit = auditDataset(people);
const rows: [string, string | number][] = [
  ["People", `${audit.people}/25`],
  ["Verified", `${audit.verified}/25`],
  ["LinkedIn URLs", `${audit.linkedinUrls}/25`],
  ["Instagram URLs", `${audit.instagramUrls}/25`],
  ["Duplicate identities", audit.duplicateIdentities],
  ["Missing evidence", audit.missingEvidence],
  ["External evidence sources", audit.externalEvidenceSources],
  ["Unique unordered pairs", audit.unorderedPairs],
  ["Directed rankings", audit.directedRankings],
];

console.log("DATASET AUDIT");
console.log("-------------");
for (const [label, value] of rows.slice(0, 7)) console.log(`${label}: ${value}`);
console.log("\nPAIR AUDIT");
console.log("----------");
for (const [label, value] of rows.slice(7)) console.log(`${label}: ${value}`);
if (audit.issues.length) {
  console.log("\nISSUES");
  for (const issue of audit.issues) console.log(`- ${issue}`);
  process.exitCode = 1;
} else {
  console.log("\nDATASET AUDIT: PASS");
}
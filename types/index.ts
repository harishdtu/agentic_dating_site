export type Source = "linkedin" | "instagram";
export type Signal = { label: string; evidence: string; source: Source };
export type Analysis = {
  needs: Signal[]; hobbies: Signal[]; interests: Signal[];
  personalitySignals: Signal[]; conversationTopics: Signal[]; lifestyleSignals: Signal[];
};
export type IdentityMatchKey = "name" | "username" | "cross-link" | "role" | "company" | "bio-reference";
export type IdentityVerification = {
  matchedOn: IdentityMatchKey[];
  linkedinEvidence: string[];
  instagramEvidence: string[];
};
export type ProfileSourceData = {
  text: string;
  verified: boolean;
  retrievedVia?: "apify";
  actorRunId?: string;
  datasetId?: string;
};
export type Person = {
  id: string; name: string; headline?: string;
  linkedinUrl: string; instagramUrl: string; verified: boolean;
  sourceData: { linkedin: ProfileSourceData; instagram: ProfileSourceData };
  identityVerification?: IdentityVerification;
};
export type Compatibility = {
  score: number; sharedInterests: string[]; sharedHobbies: string[];
  sharedTopics: string[]; sharedLifestyle: string[]; reasons: string[]; explanation: string;
};
export type Turn = { speaker: "A" | "B"; status: string; text: string };

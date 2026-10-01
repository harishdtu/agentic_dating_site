import type { IdentityVerification, Person } from "../types";
import { validateInstagramUrl, validateLinkedinUrl } from "./source-parser";

export type PublicLinkedInProfile = {
  name: string;
  url: string;
  headline: string;
  currentRole: string;
  company: string;
  skills: string[];
};

export type PublicInstagramProfile = {
  name: string;
  username: string;
  url: string;
  biography: string;
  category: string;
  externalLinks: string[];
  isPrivate: boolean;
};

export type MatchedPublicProfiles = {
  linkedinText: string;
  instagramText: string;
  identityVerification: IdentityVerification;
};

const sensitiveContent = /\b(?:religion|religious|sikh(?:i|ism)?|hindu(?:ism)?|muslim|christian(?:ity)?|buddhist(?:m)?|jain(?:ism)?|jewish|judaism|political affiliation|politics|sexual orientation|race|ethnicity|caste|relationship status|married|wife|husband|boyfriend|girlfriend|medical condition|health condition|mental health|mental illness|diagnos(?:is|ed)|depression|anxiety|salary|income|net worth|home address|phone number)\b/i;
const contactData = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b|(?:\+?\d[\d\s().-]{8,}\d)/gi;
const normalizeIdentity = (value: string) => value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");

export function sanitizeSourceText(parts: string[]): string {
  return parts.map((part) => part.replace(contactData, " ").replace(/https?:\/\/\S+/gi, " ").replace(/\s+/g, " ").trim())
    .filter((part) => part.length > 0 && !sensitiveContent.test(part))
    .join(". ");
}

function canonicalLinkedinUrl(value: string): string {
  const trimmed = value.trim();
  if (!validateLinkedinUrl(trimmed)) return "";
  const url = new URL(trimmed);
  return `${url.hostname.toLowerCase()}${url.pathname.replace(/\/+$/, "")}`;
}

export function linkedInProfileLink(values: string[]): string {
  for (const value of values) {
    const match = value.match(/https:\/\/(?:www\.)?linkedin\.com\/in\/[A-Za-z0-9%_-]{3,100}\/?(?:\?[^\s]*)?/i);
    if (match && validateLinkedinUrl(match[0])) return match[0].split(/[?#]/, 1)[0].replace(/\/$/, "");
  }
  return "";
}

export function matchPublicProfiles(linkedin: PublicLinkedInProfile, instagram: PublicInstagramProfile): MatchedPublicProfiles | null {
  const linkedinUrl = canonicalLinkedinUrl(linkedin.url);
  if (!linkedinUrl || !validateInstagramUrl(instagram.url) || instagram.isPrivate) return null;
  if (!linkedin.name.trim() || normalizeIdentity(linkedin.name) !== normalizeIdentity(instagram.name)) return null;

  const linkedinText = sanitizeSourceText([
    linkedin.name,
    linkedin.headline,
    linkedin.currentRole,
    linkedin.company,
    ...linkedin.skills,
  ]);
  const instagramBaseText = sanitizeSourceText([instagram.name, instagram.biography, instagram.category]);
  if (!linkedinText || !instagramBaseText) return null;

  const linkedProfile = linkedInProfileLink([instagram.biography, ...instagram.externalLinks]);
  const hasCrossLink = linkedProfile && canonicalLinkedinUrl(linkedProfile) === linkedinUrl;
  const companyMatch = linkedin.company.trim().length >= 3 && instagramBaseText.toLowerCase().includes(linkedin.company.trim().toLowerCase());
  const roleMatch = linkedin.currentRole.trim().length >= 6 && instagramBaseText.toLowerCase().includes(linkedin.currentRole.trim().toLowerCase());
  if (!hasCrossLink && !companyMatch && !roleMatch) return null;

  const linkedinEvidence = [linkedin.name.trim()];
  const instagramEvidence = [instagram.name.trim()];
  const matchedOn: IdentityVerification["matchedOn"] = ["name"];
  if (hasCrossLink) {
    matchedOn.push("cross-link");
    instagramEvidence.push(linkedProfile);
  }
  if (companyMatch) {
    matchedOn.push("company");
    linkedinEvidence.push(linkedin.company.trim());
    instagramEvidence.push(linkedin.company.trim());
  }
  if (roleMatch) {
    matchedOn.push("role");
    linkedinEvidence.push(linkedin.currentRole.trim());
    instagramEvidence.push(linkedin.currentRole.trim());
  }

  const instagramText = [instagramBaseText, ...(hasCrossLink ? [linkedProfile] : [])].join(". ");
  return {
    linkedinText,
    instagramText,
    identityVerification: { matchedOn, linkedinEvidence, instagramEvidence },
  };
}

export function isCompleteApifyPerson(person: Person): boolean {
  return person.verified && Boolean(person.identityVerification) &&
    person.sourceData.linkedin.retrievedVia === "apify" && person.sourceData.instagram.retrievedVia === "apify" &&
    Boolean(person.sourceData.linkedin.actorRunId && person.sourceData.linkedin.datasetId) &&
    Boolean(person.sourceData.instagram.actorRunId && person.sourceData.instagram.datasetId);
}
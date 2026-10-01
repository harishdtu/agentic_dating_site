import type { Analysis, Person, Signal, Source } from "../types";
export const CATEGORIES: Record<string, string[]> = {
  Technology: ["AI", "software", "engineering", "machine learning", "developer", "technology", "data"],
  Creative: ["design", "music", "photography", "film", "writing", "art", "fashion"],
  Sports: ["running", "football", "cricket", "tennis", "gym", "fitness", "cycling", "basketball"],
  Travel: ["travel", "traveling", "backpacking", "adventure", "explore"],
  Food: ["food", "cooking", "restaurant", "coffee", "baking"],
  Business: ["startup", "founder", "entrepreneur", "investing", "business", "product", "building"],
  Learning: ["books", "reading", "research", "education", "learning"],
  Social: ["community", "events", "meetups", "networking"],
};
const HOBBY_CATS = ["Creative", "Sports", "Travel", "Food", "Learning"];
const LIFESTYLE_CATS = ["Sports", "Travel", "Food", "Social"];
const SRC: Record<Source, string> = { linkedin: "LinkedIn", instagram: "Instagram" };
const has = (text: string, term: string) => new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(text);
const quote = (t: string[]) => t.map((x) => `"${x}"`).join(", ");

export function detect(text: string) {
  const out: Record<string, string[]> = {};
  for (const [cat, terms] of Object.entries(CATEGORIES)) {
    const found = terms.filter((t) => has(text, t));
    if (found.length) out[cat] = found;
  }
  return out;
}
export function analyzeText(linkedinText: string, instagramText: string): Analysis {
  const a: Analysis = { needs: [], hobbies: [], interests: [], personalitySignals: [], conversationTopics: [], lifestyleSignals: [] };
  const hits: Record<Source, Record<string, string[]>> = { linkedin: detect(linkedinText), instagram: detect(instagramText) };
  const ev = (terms: string[], s: Source) => `${quote(terms)} ${terms.length > 1 ? "appear" : "appears"} in the supplied ${SRC[s]} profile text.`;
  for (const s of ["linkedin", "instagram"] as Source[]) {
    for (const [cat, terms] of Object.entries(hits[s])) {
      const sig = (label: string, t = terms): Signal => ({ label, evidence: ev(t, s), source: s });
      a.interests.push(sig(cat));
      if (LIFESTYLE_CATS.includes(cat)) a.lifestyleSignals.push(sig(cat));
      for (const t of terms) {
        const label = t.toLowerCase();
        a.conversationTopics.push(sig(label, [t]));
        if (HOBBY_CATS.includes(cat)) a.hobbies.push(sig(label, [t]));
      }
    }
    const b = hits[s].Business ?? [];
    if (b.length >= 2) {
      a.personalitySignals.push({ label: "Builder / project-oriented (simulation signal)", evidence: ev(b, s), source: s });
      a.needs.push({ label: "Enjoys ambitious project-oriented conversations", evidence: ev(b, s), source: s });
    }
    if (hits[s].Social) a.needs.push({ label: "Values community and event-based connection", evidence: ev(hits[s].Social, s), source: s });
    if (hits[s].Learning) a.personalitySignals.push({ label: "Curious / idea-sharing (simulation signal)", evidence: ev(hits[s].Learning, s), source: s });
  }
  return a;
}
export const analyzePerson = (p: Person) => analyzeText(p.sourceData.linkedin.text, p.sourceData.instagram.text);
export const labels = (s: Signal[]) => [...new Set(s.map((x) => x.label))];

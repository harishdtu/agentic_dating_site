import type { Person, Turn } from "../types";
import { analyzePerson, labels } from "./profile-analyzer";
import { compatibility } from "./compatibility";
export const BANNER = "SIMULATED AGENT DATE — generated only from the two public source profiles (LinkedIn + Instagram).";
const list = (x: string[], n = 3) => x.slice(0, n).join(", ");
export function generateConversation(a: Person, b: Person): Turn[] {
  const A = analyzePerson(a), B = analyzePerson(b), c = compatibility(a, b);
  const ai = labels(A.interests), bi = labels(B.interests);
  const topicB = bi[0] ?? "what you share publicly", topicA = ai[0] ?? "what I share publicly";
  const evB = B.interests[0]?.evidence ?? "Few public signals were available.";
  const evA = A.interests[0]?.evidence ?? "Few public signals were available.";
  const s0 = c.sharedInterests[0], s1 = c.sharedInterests[1] ?? c.sharedHobbies[0] ?? c.sharedTopics[0];
  const activity = c.sharedHobbies[0] ?? c.sharedInterests[0];
  return [
    { speaker: "A", status: "reading profile", text: `Hi, I'm ${a.name}'s agent. From public LinkedIn and Instagram text I picked up: ${list(ai) || "very few signals"}.` },
    { speaker: "B", status: "thinking", text: s0 ? `Nice to meet you. I see a shared interest in ${s0}.` : `Nice to meet you. I don't see an obvious overlap yet, but I'm curious.` },
    { speaker: "A", status: "asking", text: `I noticed ${topicB} in your profile. What draws you to it?` },
    { speaker: "B", status: "responding", text: `${evB} So it's something I'd happily talk about at length.` },
    { speaker: "B", status: "asking", text: `Your public profile points to ${topicA}. What would you want to explore there?` },
    { speaker: "A", status: "responding", text: `${evA} That's the thread I'd follow.` },
    { speaker: "A", status: "thinking", text: s1 ? `Another overlap: ${s1}. Worth a longer chat.` : `Maybe our differences make for good conversation.` },
    { speaker: "B", status: "responding", text: activity ? `We could swap ideas about ${activity} over a casual meetup.` : `We could trade recommendations in our different areas.` },
    { speaker: "A", status: "complete", text: `Date complete. ${c.explanation}` },
  ];
}

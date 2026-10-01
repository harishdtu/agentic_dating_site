import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { verifiedPeople } from "../../../../data/people";
import { compatibility } from "../../../../lib/compatibility";
import { generateConversation, BANNER } from "../../../../lib/agent-engine";
import { DateExperience } from "../../../components";

export default function DatingPage({ params }: { params: { personA: string; personB: string } }) {
  const all = verifiedPeople();
  const personA = all.find((person) => person.id === params.personA);
  const personB = all.find((person) => person.id === params.personB);
  if (!personA || !personB || personA.id === personB.id) notFound();
  return <div className="page">
    <Link href={`/person/${personA.id}`} className="text-link"><ArrowLeft size={14} /> Back to {personA.name}&apos;s profile</Link>
    <div className="eyebrow" style={{ marginTop: 28 }}>Agents meet before people do</div><h1 className="page-title">A first conversation.</h1>
    <p className="lede">{BANNER} Each message is generated from these two analyzed public profiles.</p>
    <DateExperience personA={personA} personB={personB} turns={generateConversation(personA, personB)} compatibility={compatibility(personA, personB)} />
  </div>;
}
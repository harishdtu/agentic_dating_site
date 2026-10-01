import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { people, verifiedPeople } from "../../../../data/people";
import { compatibility, rankingsFor } from "../../../../lib/compatibility";
import { analyzePerson, labels } from "../../../../lib/profile-analyzer";
import { initials } from "../../../person-utils";

export default function ChooseDatePage({ params }: { params: { id: string } }) {
  const all = verifiedPeople();
  const person = all.find((entry) => entry.id === params.id);
  if (!person) {
    if (people.some((entry) => entry.id === params.id && !entry.verified)) return <div className="page"><div className="eyebrow">Date setup</div><h1 className="page-title">Verified profile required</h1><p className="lede">This incomplete dataset entry cannot start a date. Add verified public source records first.</p><Link className="button button-secondary" href="/people" style={{ marginTop: 20 }}>Back to people</Link></div>;
    notFound();
  }
  const candidates = rankingsFor(person, all);
  const interests = labels(analyzePerson(person).interests);
  return <div className="page">
    <div className="eyebrow">Choose another agent</div><h1 className="page-title">Who should {person.name}&apos;s agent meet?</h1>
    <p className="lede">A simulated agent conversation is generated from each person&apos;s analyzed public profile signals.</p>
    <div className="candidate-list">
      {candidates.length ? candidates.map((candidate) => <div className="candidate" key={candidate.person.id}>
        <div className="candidate-main"><div className="avatar">{initials(candidate.person.name)}</div><div><div className="person-name">{candidate.person.name}</div><div className="person-headline">{candidate.person.headline || "Public profile signals"}</div></div></div>
        <div className="candidate-score">{candidate.score}%</div>
        <div className="tag-list">{labels(analyzePerson(candidate.person).interests).slice(0, 3).map((tag) => <span className="tag" key={tag}>{tag}</span>)}</div>
        <Link className="button button-primary" href={`/dating/${person.id}/${candidate.person.id}`}>Start date <ArrowRight size={14} /></Link>
        <span className="field-hint" style={{ gridColumn: "1 / -1" }}>{compatibility(person, candidate.person).explanation} Your interests: {interests.slice(0, 2).join(", ") || "none detected"}.</span>
      </div>) : <div className="empty-state">No other verified people are available yet. A date needs two verified agents with public LinkedIn and Instagram source text.</div>}
    </div>
  </div>;
}
import { AlertTriangle } from "lucide-react";
import { people, verifiedPeople } from "../../data/people";
import { PersonCard } from "../components";

export default function PeoplePage() {
  const verified = verifiedPeople();
  const incomplete = people.filter((person) => !person.verified);
  return <div className="page">
    <div className="eyebrow">The directory</div><h1 className="page-title">People &amp; agents</h1>
    <p className="lede">Profiles are analyzed only from their supplied public LinkedIn and Instagram information. Incomplete records are never represented as verified people.</p>
    {incomplete.length > 0 && <div className="notice" style={{ marginTop: 24 }}><AlertTriangle size={17} /><div><strong>{incomplete.length} incomplete dataset {incomplete.length === 1 ? "entry" : "entries"} excluded.</strong> No verified profiles are currently loaded.</div></div>}
    <div style={{ marginTop: 28 }}>
      {verified.length ? <div className="person-grid">{verified.map((person) => <PersonCard person={person} key={person.id} />)}</div> : <div className="empty-state">There are no verified people to display. Add records with canonical source URLs and source text in <code>data/people.ts</code>. This directory automatically scales with the verified dataset.</div>}
    </div>
  </div>;
}
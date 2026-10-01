import Link from "next/link";
import { ArrowRight, Play } from "lucide-react";
import { verifiedPeople } from "../../data/people";
import { analyzePerson, labels } from "../../lib/profile-analyzer";
import { PersonCard } from "../components";

export default function DemoPage() {
  const all = verifiedPeople();
  const first = all[0];
  const second = all[1];
  return <div className="page">
    <div className="eyebrow">A complete product walkthrough</div><h1 className="page-title">Watch the agents meet.</h1>
    <p className="lede">Profile analysis, a generated agent conversation, explainable compatibility, then the full ranking.</p>
    <div className="flow-steps"><span><b>1</b> PROFILE</span><ArrowRight size={12} /><span><b>2</b> ANALYSIS</span><ArrowRight size={12} /><span><b>3</b> DATE</span><ArrowRight size={12} /><span><b>4</b> RANKING</span></div>
    {first && second ? <div style={{ marginTop: 33 }}>
      <div className="section-head"><div><div className="eyebrow">Demo profiles</div><h2>Start with {first.name}</h2></div><Link className="text-link" href={`/person/${first.id}`}>Open profile <ArrowRight size={14} /></Link></div>
      <div className="person-grid"><PersonCard person={first} /><PersonCard person={second} /></div>
      <div className="notice" style={{ marginTop: 18 }}><Play size={16} /><div>Open the profile, review source-linked analysis, select <strong>Start a date</strong>, then watch each generated turn appear before viewing compatibility and rankings.</div></div>
      <div className="section-rule"><div className="eyebrow">First profile signals</div><div className="tag-list">{labels(analyzePerson(first).interests).map((item) => <span className="tag" key={item}>{item}</span>)}</div><Link className="button button-primary" href={`/person/${first.id}`}>Begin demo <ArrowRight size={14} /></Link></div>
    </div> : <div className="empty-state" style={{ marginTop: 30 }}><strong>No verified demo profiles are available.</strong><br />The dataset currently contains no verified source records, so the demo cannot honestly show a real profile or agent date. Add at least two verified people to <code>data/people.ts</code>; the full profile → analysis → date → compatibility → ranking flow will activate automatically. No sample people or profile claims are fabricated.</div>}
  </div>;
}
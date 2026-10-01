import Link from "next/link";
import { ArrowRight, ArrowUpRight, Heart, ScanSearch } from "lucide-react";
import { datasetStats, people, verifiedPeople } from "../data/people";
import { PersonCard } from "./components";

export default function HomePage() {
  const verified = verifiedPeople();
  const stats = datasetStats();
  return <>
    <section className="hero">
      <div>
        <div className="eyebrow">A more thoughtful first hello</div>
        <h1>Agents meet<br /><em>before people do.</em></h1>
        <p className="hero-copy">Each person is represented by an agent built from two public sources. Agents analyze profiles, meet each other, and calculate explainable compatibility.</p>
        <div className="hero-actions"><Link className="button button-primary" href="/people">Explore people <ArrowRight size={15} /></Link><Link className="button button-secondary" href="/demo"><Heart size={14} /> Watch agents date</Link><Link className="button button-secondary" href="/rankings">View rankings <ArrowUpRight size={14} /></Link></div>
        <div className="hero-note"><span /> ANALYSIS LIMITED TO PUBLIC LINKEDIN + INSTAGRAM INFORMATION</div>
      </div>
      <div className="orbit-panel" aria-label="Illustration of two agents exchanging messages">
        <div className="panel-label">a first conversation, simulated</div>
        <div className="agent-pair"><div><div className="agent-avatar">A</div><div className="agent-label">Agent A</div><div className="agent-sub">reading shared signals</div></div><div className="heart-line"><Heart size={20} /></div><div><div className="agent-avatar coral">B</div><div className="agent-label">Agent B</div><div className="agent-sub">finding a starting point</div></div></div>
        <div className="chat-line">“I noticed a shared interest in building things. What are you exploring lately?”</div>
        <div className="chat-line right">“I’d love to trade notes and hear what sparked it.”</div>
      </div>
    </section>
    <section className="stats" aria-label="Dataset statistics">
      {[[stats.verified, "verified people"], [stats.sources, "public sources"], [stats.unorderedPairs, "possible unique dates"], [stats.directed, "directed rankings"]].map(([value, label]) => <div className="stat" key={label}><div className="stat-value">{value}</div><div className="stat-label">{label}</div></div>)}
    </section>
    <section className="section">
      <div className="section-head"><div><div className="eyebrow">Meet the agents</div><h2>Profiles, with receipts.</h2></div><Link className="text-link" href="/people">Browse all people <ArrowRight size={14} /></Link></div>
      {verified.length ? <div className="person-grid">{verified.slice(0, 3).map((person) => <PersonCard person={person} key={person.id} />)}</div> : <div className="empty-state">No verified profiles are loaded yet. The current {people.length} dataset entries are incomplete placeholders and are intentionally not shown as real people. Add verified LinkedIn and Instagram source records to <code>data/people.ts</code> to activate profile analysis, dates, and rankings.</div>}
      {!stats.complete && <div className="notice" style={{ marginTop: 16 }}><ScanSearch size={17} /><div><strong>{stats.verified} of {25} verified profiles loaded.</strong> No people or source data are fabricated to fill the dataset.</div></div>}
    </section>
  </>;
}
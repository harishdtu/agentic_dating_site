import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { verifiedPeople } from "../../data/people";
import { allRankings, WEIGHTS } from "../../lib/compatibility";

export default function RankingsPage() {
  const all = verifiedPeople();
  const rankings = allRankings(all);
  return <div className="page">
    <div className="eyebrow">Explainable by design</div><h1 className="page-title">Simulated match rankings</h1>
    <p className="lede">Every person is ranked against every other verified person. Self-matches are excluded; ties resolve by name.</p>
    <div className="section-rule"><h2 style={{ fontSize: 17, marginTop: 0 }}>How compatibility works</h2><div className="how-grid">
      {[ [WEIGHTS.interests, "Interests"], [WEIGHTS.hobbies, "Hobbies"], [WEIGHTS.topics, "Conversation"], [WEIGHTS.lifestyle, "Lifestyle"] ].map(([weight, label]) => <div className="weight" key={label}><strong>{Number(weight) * 100}%</strong><span>{label}</span></div>)}
    </div><p className="field-hint">The score measures overlap between publicly observable profile signals. It is not a prediction of real-world romantic compatibility.</p></div>
    <div style={{ marginTop: 38 }}>
      {all.length ? all.map((person) => <section key={person.id} style={{ marginBottom: 38 }}>
        <div className="eyebrow">Best simulated matches for {person.name}</div>
        <div className="ranking-table">{rankings[person.id]?.length ? rankings[person.id].map((row) => <div className="ranking-row" key={row.person.id}>
          <span className="rank-number">#{row.rank}</span><div><Link className="person-name" href={`/person/${row.person.id}`}>{row.person.name}</Link><div className="person-headline">{row.person.headline || "Public profile signals"}</div></div>
          <span className="score">{row.score}%</span><div className="rank-reasons">{row.sharedInterests.slice(0, 2).map((x) => <span className="tag" key={`i-${x}`}>{x}</span>)}{row.sharedHobbies.slice(0, 2).map((x) => <span className="tag" key={`h-${x}`}>{x}</span>)}<span className="field-hint">{row.explanation}</span></div>
          <Link className="small-link ranking-action" href={`/dating/${person.id}/${row.person.id}`}>Watch date <ArrowRight size={13} /></Link>
        </div>) : <div className="empty-state">No other verified people to rank against.</div>}</div>
      </section>) : <div className="empty-state">Rankings appear when verified profiles are added. The current dataset has no verified people, so no matches are fabricated.</div>}
    </div>
  </div>;
}
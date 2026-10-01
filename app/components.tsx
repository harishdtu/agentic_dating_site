"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, Instagram, Linkedin, Pause, Play, RotateCcw } from "lucide-react";
import type { Analysis, Compatibility, Person, Turn } from "../types";
import { analyzePerson, labels } from "../lib/profile-analyzer";
import { initials } from "./person-utils";

export function PersonCard({ person }: { person: Person }) {
  const analysis = analyzePerson(person);
  const interests = labels(analysis.interests).slice(0, 3);
  const hobbies = labels(analysis.hobbies).slice(0, 2);
  return (
    <article className="person-card">
      <div className="person-top">
        <div className="avatar">{initials(person.name)}</div>
        <div><div className="person-name">{person.name}</div><div className="person-headline">{person.headline || "Public profile signals"}</div></div>
      </div>
      <div className="tag-list">{interests.map((x) => <span className="tag" key={`interest-${x}`}>Interest · {x}</span>)}{hobbies.map((x) => <span className="tag" key={`hobby-${x}`}>Hobby · {x}</span>)}{!interests.length && !hobbies.length && <span className="tag">No detected signals</span>}</div>
      <div className="card-foot">
        <div className="socials">
          {person.linkedinUrl && <a href={person.linkedinUrl} target="_blank" rel="noopener noreferrer" aria-label="LinkedIn"><Linkedin size={15} /></a>}
          {person.instagramUrl && <a href={person.instagramUrl} target="_blank" rel="noopener noreferrer" aria-label="Instagram"><Instagram size={15} /></a>}
          {!person.verified && <span className="field-hint">Unverified</span>}
        </div>
        <Link className="small-link" href={`/person/${person.id}`}>View agent <ArrowRight size={13} /></Link>
      </div>
    </article>
  );
}

export function SignalSections({ analysis }: { analysis: Analysis }) {
  const sections: [string, keyof Analysis][] = [
    ["Needs", "needs"], ["Hobbies", "hobbies"], ["Interests", "interests"],
    ["Personality / work style signals", "personalitySignals"], ["Conversation topics", "conversationTopics"], ["Lifestyle signals", "lifestyleSignals"],
  ];
  return <div className="analysis-grid">{sections.map(([title, key]) => <section className="analysis-section" key={key}>
    <h2>{title}</h2>
    {analysis[key].length ? analysis[key].map((signal, i) => <div className="signal" key={`${signal.label}-${i}`}>
      <div className="signal-title"><span>{signal.label}</span><span className="signal-source">{signal.source === "linkedin" ? "LinkedIn" : "Instagram"}</span></div>
      <p className="signal-evidence">{signal.evidence}</p>
    </div>) : <p className="field-hint">No signals detected in the supplied public source text.</p>}
  </section>)}</div>;
}

export function CompatibilityPanel({ compatibility }: { compatibility: Compatibility }) {
  return <div className="compat-box" id="compatibility">
    <div className="compat-top"><div className="compat-ring">{compatibility.score}</div><div>
      <div className="compat-title">Simulated compatibility</div>
      <p className="compat-explain">{compatibility.explanation} This is overlap in public profile signals, not a prediction of real-world romantic compatibility.</p>
    </div></div>
    <div className="tag-list">
      {compatibility.sharedInterests.map((x) => <span className="tag" key={`i-${x}`}>Interest · {x}</span>)}
      {compatibility.sharedHobbies.map((x) => <span className="tag" key={`h-${x}`}>Hobby · {x}</span>)}
      {compatibility.sharedTopics.map((x) => <span className="tag" key={`t-${x}`}>Topic · {x}</span>)}
      {!compatibility.reasons.length && <span className="tag">No shared signals found</span>}
    </div>
  </div>;
}

export function DateExperience({ personA, personB, turns, compatibility }: { personA: Person; personB: Person; turns: Turn[]; compatibility: Compatibility }) {
  const [state, setState] = useState<"idle" | "running" | "paused" | "complete">("idle");
  const [visible, setVisible] = useState(0);
  useEffect(() => {
    if (state !== "running") return;
    const timer = window.setTimeout(() => {
      const next = Math.min(visible + 1, turns.length);
      setVisible(next);
      if (next === turns.length) setState("complete");
    }, 820);
    return () => window.clearTimeout(timer);
  }, [state, visible, turns.length]);
  const start = () => { if (state === "complete") setVisible(0); setState("running"); };
  const activeTurn = turns[Math.min(visible, turns.length - 1)];
  const status = state === "complete" ? "Date conversation complete" : state === "paused" ? "Date paused" : state === "idle" ? "Agents ready to meet" : `${activeTurn?.speaker === "A" ? personA.name : personB.name}'s agent is ${activeTurn?.status ?? "thinking"}...`;
  return <>
    <section className="date-stage">
      <div className="date-stage-head"><span className="eyebrow">Simulated agent date</span><span className="live-label"><span className="live-dot" />{state === "complete" ? "COMPLETE" : state === "idle" ? "READY" : state.toUpperCase()}</span></div>
      <div className="date-agents">
        {[personA, personB].map((person, i) => <div className="date-agent" key={person.id}><div className="avatar">{initials(person.name)}</div><div><div className="person-name">{person.name}&apos;s agent</div><div className="date-status">{state === "running" && activeTurn?.speaker === (i === 0 ? "A" : "B") ? activeTurn.status : state === "complete" ? "conversation complete" : "public signals loaded"}</div></div><div className="tag-list">{labels(analyzePerson(person).interests).slice(0, 2).map((tag) => <span className="tag" key={tag}>{tag}</span>)}</div></div>)}
      </div>
      <div className="chat-window" aria-live="polite">
        {turns.slice(0, visible).map((turn, i) => <div className={`message ${turn.speaker === "B" ? "agent-b" : ""}`} key={`${i}-${turn.text}`}>
          <div className="message-label">AGENT {turn.speaker} · {turn.status.toUpperCase()}</div><div className="message-bubble">{turn.text}</div>
        </div>)}
      </div>
      <div className="typing" role="status">{state === "running" ? `● ${status}` : state === "paused" ? `Ⅱ ${status}` : state === "complete" ? `✓ ${status}` : "● Start to watch the agents meet"}</div>
      <div className="date-controls">
        {state === "idle" && <button className="button button-primary" onClick={start}><Play size={14} /> Start date</button>}
        {state === "running" && <button className="button button-secondary" onClick={() => setState("paused")}><Pause size={14} /> Pause</button>}
        {state === "paused" && <button className="button button-primary" onClick={() => setState("running")}><Play size={14} /> Resume</button>}
        {state === "complete" && <button className="button button-secondary" onClick={() => { setVisible(0); setState("running"); }}><RotateCcw size={14} /> Replay</button>}
        {state === "complete" && <a className="button button-primary" href="#compatibility">View compatibility <ArrowRight size={14} /></a>}
      </div>
    </section>
    {state === "complete" && <CompatibilityPanel compatibility={compatibility} />}
  </>;
}

export function CreateAgentForm() {
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [instagramUrl, setInstagramUrl] = useState("");
  const [linkedinText, setLinkedinText] = useState("");
  const [instagramText, setInstagramText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ analysis: Analysis; sources: { linkedin: string; instagram: string } } | null>(null);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoading(true); setError(""); setResult(null);
    try {
      const response = await fetch("/api/analyze", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ linkedinUrl, instagramUrl, linkedinText, instagramText }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Profile analysis failed.");
      setResult(data);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Profile analysis failed."); }
    finally { setLoading(false); }
  }
  return <>
    <form className="form" onSubmit={submit}>
      <div className="field"><label htmlFor="linkedin">LinkedIn profile URL</label><input id="linkedin" type="url" required placeholder="https://www.linkedin.com/in/..." value={linkedinUrl} onChange={(e) => setLinkedinUrl(e.target.value)} /><span className="field-hint">Use the canonical public profile URL.</span></div>
      <div className="field"><label htmlFor="instagram">Instagram profile URL</label><input id="instagram" type="url" required placeholder="https://www.instagram.com/..." value={instagramUrl} onChange={(e) => setInstagramUrl(e.target.value)} /><span className="field-hint">Use the canonical public profile URL.</span></div>
      <div className="field"><label htmlFor="linkedin-text">Public LinkedIn text <span className="field-hint">(optional if automatic fetch works)</span></label><textarea id="linkedin-text" placeholder="Paste publicly available profile text if automated access is blocked." value={linkedinText} onChange={(e) => setLinkedinText(e.target.value)} /></div>
      <div className="field"><label htmlFor="instagram-text">Public Instagram text <span className="field-hint">(optional if automatic fetch works)</span></label><textarea id="instagram-text" placeholder="Paste publicly available bio or profile text if needed." value={instagramText} onChange={(e) => setInstagramText(e.target.value)} /></div>
      <button className="button button-primary" disabled={loading} type="submit">{loading ? "Analyzing public sources..." : "Analyze profile"} {!loading && <ArrowRight size={15} />}</button>
    </form>
    {error && <div className="form-result error-text" role="alert">{error}</div>}
    {result && <div className="form-result"><div className="notice"><Check size={17} /><div><strong>Analysis complete.</strong> Analysis limited to public LinkedIn + Instagram information.</div></div><div className="source-links" style={{ margin: "17px 0" }}><a className="source-button" href={result.sources.linkedin} target="_blank" rel="noopener noreferrer"><Linkedin size={14} /> LinkedIn</a><a className="source-button" href={result.sources.instagram} target="_blank" rel="noopener noreferrer"><Instagram size={14} /> Instagram</a></div><SignalSections analysis={result.analysis} /></div>}
  </>;
}
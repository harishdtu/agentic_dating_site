import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Check, Instagram, Linkedin } from "lucide-react";
import { people, verifiedPeople } from "../../../data/people";
import { analyzePerson, labels } from "../../../lib/profile-analyzer";
import { SignalSections } from "../../components";
import { initials } from "../../person-utils";

export default function PersonPage({ params }: { params: { id: string } }) {
  const person = verifiedPeople().find((entry) => entry.id === params.id);
  if (!person) {
    const incomplete = people.some((entry) => entry.id === params.id && !entry.verified);
    if (!incomplete) notFound();
    return <div className="page"><div className="eyebrow">Incomplete record</div><h1 className="page-title">Profile unavailable</h1><p className="lede">This dataset entry is not verified and does not have source records. It is not presented as a real person.</p><Link className="button button-secondary" style={{ marginTop: 22 }} href="/people">Back to people</Link></div>;
  }
  const analysis = analyzePerson(person);
  return <div className="page">
    <div className="eyebrow">Person profile</div>
    <div className="profile-head"><div className="profile-identity"><div className="avatar large">{initials(person.name)}</div><div><h1 className="page-title">{person.name}</h1><div className="lede">{person.headline || "Public profile signals"}</div></div></div><Link className="button button-primary" href={`/person/${person.id}/date`}>Start a date <ArrowRight size={15} /></Link></div>
    <div className="source-boundary"><div className="source-checks"><span className="source-check"><Check size={14} /> LinkedIn</span><span className="source-check"><Check size={14} /> Instagram</span><span className="tag">2-source analysis</span></div><span className="source-caption">Only public LinkedIn + Instagram information is used.</span></div>
    <div className="source-links" style={{ marginBottom: 23 }}><a className="source-button" href={person.linkedinUrl} target="_blank" rel="noopener noreferrer"><Linkedin size={14} /> LinkedIn source <ArrowRight size={12} /></a><a className="source-button" href={person.instagramUrl} target="_blank" rel="noopener noreferrer"><Instagram size={14} /> Instagram source <ArrowRight size={12} /></a></div>
    <SignalSections analysis={analysis} />
    <div className="section-rule"><div className="eyebrow">Agent signals</div><p className="lede" style={{ marginTop: 12 }}>Detected {labels(analysis.interests).length} interest categories and {analysis.hobbies.length} hobby signals from the supplied source text. Every signal above includes its source and evidence.</p></div>
  </div>;
}
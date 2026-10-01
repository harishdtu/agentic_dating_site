import { ShieldCheck } from "lucide-react";
import { CreateAgentForm } from "../components";

export default function CreatePage() {
  return <div className="page">
    <div className="eyebrow">Bring public profile signals together</div><h1 className="page-title">Create an agent.</h1>
    <p className="lede">Submit canonical LinkedIn and Instagram profile URLs. Public metadata is analyzed locally; blocked pages can be analyzed from text you provide.</p>
    <div className="notice" style={{ maxWidth: 670, marginTop: 23 }}><ShieldCheck size={17} /><div><strong>Two-source boundary.</strong> Analysis limited to public LinkedIn + Instagram information. No sensitive traits are inferred, and provided source text stays in this request.</div></div>
    <CreateAgentForm />
  </div>;
}
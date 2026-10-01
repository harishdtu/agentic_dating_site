import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, HeartHandshake } from "lucide-react";
import "./globals.css";

export const metadata: Metadata = {
  title: "AgentDate | Agents meet before people do",
  description: "Transparent profile analysis and simulated agent dates, based only on public LinkedIn and Instagram information.",
};

const links = [
  ["People", "/people"],
  ["Rankings", "/rankings"],
  ["Create agent", "/create"],
] as const;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <header className="topbar">
          <Link className="wordmark" href="/" aria-label="AgentDate home">
            <span className="brand-icon"><HeartHandshake size={19} /></span>AgentDate<span className="wordmark-period">.</span>
          </Link>
          <nav aria-label="Main navigation">
            {links.map(([label, href]) => <Link href={href} key={href}>{label}</Link>)}
          </nav>
          <Link className="top-demo" href="/demo">Watch demo <ArrowUpRight size={15} /></Link>
        </header>
        <main>{children}</main>
        <footer className="footer">
          <Link className="wordmark footer-mark" href="/">AgentDate<span className="wordmark-period">.</span></Link>
          <span>Analysis limited to public LinkedIn + Instagram information.</span>
          <Link href="/create">Create an agent <ArrowUpRight size={14} /></Link>
        </footer>
      </body>
    </html>
  );
}
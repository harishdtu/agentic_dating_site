# AgentDate

## Overview

AgentDate represents each person with a deterministic profile agent built from exactly two supplied public sources: LinkedIn and Instagram. Agents analyze observable profile text, have a simulated conversation, and receive an explainable overlap score. This is a simulation, not a claim about anyone's real romantic interest or compatibility.

## Features

- Data-driven verified people directory, with incomplete records explicitly excluded.
- Evidence-linked needs, hobbies, interests, personality/work-style, conversation, and lifestyle signals.
- Sequential, pausable, replayable agent conversations generated from profile data.
- Explainable weighted compatibility and directed rankings without self-matches.
- Optional public metadata analysis through `POST /api/analyze`, with user-supplied source text as fallback.
- Demo route, responsive interface, and local/static dataset operation with no paid LLM API or database.

## Product Flow

`/` → `/people` → `/person/[id]` → `/person/[id]/date` → `/dating/[personA]/[personB]` → compatibility → `/rankings`

Custom analysis is available at `/create`; the short demo path is `/demo`.

## Architecture

```text
LinkedIn ─────┐
              ├── Source Parser
Instagram ────┘
                     ↓
              Profile Analyzer
                     ↓
                   Agent
                     ↓
             Agent-to-Agent Date
                     ↓
            Compatibility Engine
                     ↓
                  Rankings
```

The Next.js App Router presents the existing TypeScript engine. The browser animates its deterministic turns; the server route validates URLs and optionally fetches public metadata for custom analysis.

## Data Flow

Verified entries in `data/people.ts` supply canonical source URLs and source text. `profile-analyzer.ts` derives signals and source-specific evidence; `agent-engine.ts` turns those signals into nine reproducible messages; `compatibility.ts` calculates scores and rankings. The create form sends only its two URLs and optional public text to `/api/analyze`; no custom profiles are persisted.

## Agent Engine

`generateConversation()` produces 9 deterministic turns using both agents' interests, hobbies, and conversation topics. The date page reveals turns one at a time, with start, pause, resume, and replay controls. Message content is generated from the supplied profile analysis; no language-model API is called.

## Compatibility Algorithm

The engine uses Jaccard overlap for each signal set and combines the results with these weights:

- Interests: 40%
- Hobbies: 25%
- Conversation topics: 20%
- Lifestyle signals: 15%

`rankingsFor()` excludes the current person and sorts by score, then name. `allRankings()` creates the directed rankings for the available verified people.

## Source Boundary

Analysis limited to public LinkedIn + Instagram information. Signals include the source and evidence phrase. The analyzer does not infer race, religion, political affiliation, sexual orientation, health, mental health, income, or other protected traits. Compatibility describes only signal overlap and is not a prediction of real-world romantic compatibility.

## Data Collection & Source Verification

The current demo contains **7 verified public profiles**, each backed by exactly one LinkedIn and one Instagram profile. Apify was used to retrieve public profile data; search results were discovery inputs only, not compatibility evidence. Each identity was checked by normalized name plus an Instagram-to-LinkedIn cross-link or matching public company/role. The generated profile text contains only source-backed professional and interest signals; sensitive/contact text is excluded. No Apify token is required for normal application browsing, profile analysis of the checked-in dataset, rankings, or dates.

`npm run build:dataset` can continue collection after a fresh `APIFY_API_TOKEN` is placed in the ignored `.env.local`; the value is not checked into source control and is not needed by production. The collector validates current Actor schemas, disables email and enrichment options, limits candidate volume, batches profile lookups, and rejects ambiguous matches. The free-user item limit prevented completion of 25 profiles; the existing 7 verified records were kept without fabrication. Sensitive values are removed before final profile evidence is stored. The ignored Apify cache is local-only.

Verification requires an exact normalized public name match plus an independent LinkedIn cross-link, employer, or role visible in the Instagram profile. Private profiles, ambiguous names, duplicate identities, profiles without analyzable signals, and any signals failing evidence checks are rejected. `verified` is set only after this comparison. `data/apify-people.json` is the source-backed application dataset. `npm run audit:dataset` validates record counts, unique IDs/URLs/normalized names, Apify provenance for both sources, identity evidence, and evidence-backed analyzer signals limited to LinkedIn/Instagram. Current audit: 7 people, 7 verified, 0 duplicate identities, 0 missing evidence, 0 external sources.

Use `npm run build:dataset -- --refresh` only when you intend to spend quota on fresh discovery; the default run reuses the minimized ignored cache and avoids repeating completed Actor runs.

## Custom Profile Analysis

`POST /api/analyze` accepts LinkedIn and Instagram profile URLs and optional public text for each source. It validates both URL types, fetches public HTML only when corresponding text is absent, extracts title/description/Open Graph metadata, normalizes text, then runs the existing analyzer. If a source blocks automated access, the endpoint returns guidance to provide publicly available source text; it never fabricates a result. Custom analyses are not saved.

## Running Locally

Requirements: Node.js 18.17+ and npm.

```bash
npm install
npm run dev
```

Open `http://localhost:3000`. Preloaded routes work without API keys. The custom analyzer may depend on source sites permitting server-side metadata requests.

## Testing

```bash
npm test
npm run lint
npm run build
```

## Deployment

Deploy as a standard Next.js application (for example, on Vercel). No secrets or environment variables are required for the preloaded experience. Public-source fetching is best-effort and can be blocked by the source websites.

## Responsible Use

The demo currently includes 7 verified records; the remaining 18 profiles needed for the challenge target are not fabricated. If no generated profiles are installed, the application falls back to unverified placeholders that are excluded from the directory, rankings, and dates. Do not mark a person verified without canonical public URLs, source text, provenance, and a cross-profile identity check. The UI does not assert real-world romantic intent or compatibility.
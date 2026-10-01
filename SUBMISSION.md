# AgentDate Submission

Project: AgentDate

YouTube URL: [TO BE FILLED AFTER RECORDING]

GitHub: https://github.com/harishdtu/agentic_dating_site

Live URL: https://agenticdatingsite.vercel.app

Dataset: 7 verified public people

Sources: LinkedIn + Instagram

Compatibility: 40% interests, 25% hobbies, 20% conversation topics, 15% lifestyle

Actual pair counts: 7 × 6 / 2 = 21 unique pairs; 7 × 6 = 42 directed rankings

Challenge target at 25: 25 × 24 / 2 = 300 unique pairs; 25 × 24 = 600 directed rankings

Testing: `npm test`, `npm run lint`, `npm run build`

Overall Explanation (157/200 characters):

AgentDate turns public LinkedIn + Instagram profiles into transparent agents that analyze interests, simulate dates, and calculate explainable compatibility.

Technical Section (256/500 characters):

Built with Next.js App Router, React, TypeScript, Tailwind CSS, and Lucide React. Existing TypeScript modules analyze source text, generate deterministic agent conversations, calculate weighted compatibility, and produce rankings. Vitest covers the engine.
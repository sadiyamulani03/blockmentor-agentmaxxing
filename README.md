<p align="center">
  <img src="public/blockmentor-logo.svg" alt="BlockMentor logo" width="360" />
</p>

# BlockMentor — AI Mentor Agent for Web3 (Agentmaxxing)

Week 1 (BlockMentor.v1): https://blockmentor-agentmaxxing.vercel.app/

## The problem it solves

Learning Web3 and Solidity as a beginner is fragmented: scattered tutorials, no idea where to start, no time budget, and no instant feedback. BlockMentor is a chat agent that answers with structure instead of links — a level-aware study plan, a beginner quiz, or a clear concept breakdown — instantly and for free, with no wallet, payment, or signup required to use its core tools.

## Description

BlockMentor is a Next.js chat app with a Gemini tool-calling loop and six tools. You type a prompt, the model picks a tool, and the UI shows each tool step and its structured result. Four of the tools are local, deterministic learning tools (`get_study_plan`, `generate_quiz`, `grade_quiz`, `explain_solidity_concept`); two are starter tools kept from the kit (`get_my_wallet`, `roll_dice`). The starter's wallet/x402 payment code is preserved so paid tools can be switched on later without re-architecting.

Built on the official [Agentmaxxing starter kit](https://www.npmjs.com/package/agentmaxxin) (`npx agentmaxxin blockmentor-agentmaxxing-web`).

## Tech stack (exact installed versions)

| Layer | Version |
| :--- | :--- |
| Next.js (App Router) | 16.4.0 |
| React / React DOM | 19.3.0 |
| TypeScript | 5.9.3 |
| Tailwind CSS / @tailwindcss/postcss | 4.3.3 |
| @google/genai (Gemini SDK) | 2.28.0 |
| viem (Stellar/Base wallet helpers) | 2.57.4 |
| lucide-react | 1.53.0 |
| @base-ui/react / shadcn / tw-animate-css | 1.8.0 / 1.0.0 / 1.4.0 |
| Node.js (runtime used here) | 22.23.2 |

## AI models

| Model | Status |
| :--- | :--- |
| `gemini-3.8-flash` | **Verified.** Configured in the Vercel production environment (`GEMINI_MODEL`); Google's API referenced it in a 429 quota response. This is what the live demo runs. |
| `gemini-flash-latest` | **Untested fallback.** The code default in `agent/agent.ts` when `GEMINI_MODEL` is unset. Not verified against the API — do not claim it as supported. |

Gemini free-tier quota observed during development: 20 requests/day for `gemini-3.8-flash`.

## All 6 tools

| # | Tool | Kind | What it does |
| :--- | :--- | :--- | :--- |
| 1 | `get_study_plan` | Local, deterministic | Structured study plan: `timeAllocation` (minutes sum exactly to the request), `learningObjectives`, `practiceActivity`, `finalReview`. Inputs: `topic`, `minutes` (clamped 15–240), `level`. |
| 2 | `generate_quiz` | Local, deterministic | Beginner/intermediate/advanced quiz for a supported concept: 1–3 questions with options only — **correct answers are withheld** until grading. Unknown topic → supported topic list. |
| 3 | `grade_quiz` | Local, deterministic | Grades the learner's answers against the same bank: `score`, `total`, `percentage`, per-question correctness with correct answer + explanation, and a deterministic `nextStep` recommendation. Structured errors for unknown topic, empty/invalid/mismatched answers. |
| 4 | `explain_solidity_concept` | Local, deterministic | Structured concept explanation: `summary`, `syntax`, `keyPoints`, `example`, `commonMistakes`. Unknown concept → the supported concept list. |
| 5 | `get_my_wallet` | Starter tool | Reads the agent's own demo wallet address and Base Sepolia balance (read-only). |
| 6 | `roll_dice` | Starter tool | Plain dice roll; no wallet, no API. |

Supported quiz/explanation topics: Solidity mappings, arrays, structs, data locations, `msg.sender`, error handling (`agent/concepts.ts`). Each topic has beginner, intermediate, and advanced questions — difficulty labels are honest (a beginner question is never marked advanced).

## Week 2 — interactive quiz workflow

Week 2 turns the one-shot quiz into a closed learning loop, all local and deterministic:

1. **Generate** — the learner asks for a quiz (topic + difficulty + count). `generate_quiz` returns questions *without* answers.
2. **Answer** — the learner replies with their picks (e.g. "My answers: [1, 0, 2]").
3. **Grade** — `grade_quiz` checks the answers against the same bank: score, percentage, per-question correct/incorrect with the correct answer and explanation.
4. **Next step** — a deterministic recommendation: 100% → harder difficulty or new topic; 50–99% → review explanations, re-explain, retry; <50% → study plan + explanation, then retry.

No server sessions, no external APIs, no Gemini calls for grading — the concept bank is the source of truth, so repeated runs return identical results and cost nothing.

Try it: `Quiz me on Solidity mappings at intermediate difficulty, 2 questions.` then `My answers: [1, 0].`

## Key features

- Chat UI (`app/page.tsx`) that auto-lists every registered tool from `GET /api/agent` — no manual tool wiring in the UI.
- Gemini function-calling loop with visible per-tool steps and structured JSON results.
- Interactive quiz loop (Week 2): generate without answers → learner answers → deterministic grading with explanations → next-step recommendation.
- Local learning tools: no external API, no randomness, no payment — same input always returns the same output.
- Wallet-aware loop preserved from the starter (read-only by default; payment path intact for future paid tools).
- Secrets stay local: `.env`, `.env.local`, `.agent-wallet.json` are gitignored; no keys in the repo.

## Demo video

https://drive.google.com/file/d/1f0G8Yj8ecNEGpPrJzGjTH7ygPYyJPjG4/view?usp=sharing

## Install, configure, run

```bash
git clone https://github.com/sadiyamulani03/blockmentor-agentmaxxing.git
cd blockmentor-agentmaxxing-web
npm install
cp .env.example .env   # then paste your key: GEMINI_API_KEY=...
npm run dev            # open http://localhost:3000
```

- Get a free Gemini key at https://aistudio.google.com/apikey — never commit it or paste it into docs/screenshots.
- Optional: `GEMINI_MODEL` overrides the model (production uses `gemini-3.8-flash`); `WALLET_PRIVATE_KEY` supplies a test key, otherwise use the in-app Create wallet button.
- Build check: `npm run build` and `npx tsc --noEmit`.

## Testing the local tools

1. Send `Create a 30-minute beginner study plan for Solidity mappings.` → expand the `get_study_plan` step: four sections summing to 30 minutes, three objectives, practice activity, review checklist.
2. Send `Quiz me on Solidity mappings at intermediate difficulty, 2 questions.` → `generate_quiz` returns 2 questions with options only (no answers).
3. Reply `My answers: [1, 0].` → `grade_quiz` returns score, percentage, per-question correctness with correct answer + explanation, and a next-step recommendation.
4. Send `Explain msg.sender.` → `explain_solidity_concept` returns summary, syntax, key points, example, common mistakes.
5. Determinism: repeat any of the above — identical output every time. Grading uses no Gemini quota.

## Project structure

| Path | Description |
| :--- | :--- |
| `agent/tools.ts` | All 6 tool definitions. |
| `agent/concepts.ts` | Local concept/quiz bank with per-question difficulty tags (content only, no I/O). |
| `agent/agent.ts` | Gemini tool-calling loop (unchanged from starter). |
| `agent/wallet.ts` | Starter wallet + x402 payment helpers (unchanged). |
| `app/page.tsx` | Chat UI, setup steps, auto tool list. |
| `app/api/agent/route.ts` | GET status/tools, POST runs the agent. |
| `app/api/wallet/route.ts` | Creates/reads the demo wallet. |
| `public/blockmentor-logo.svg` | Product logo (local SVG, no external assets). |
| `.env` | Local secrets — gitignored, never committed. |

## Week 1 learnings

1. Traced the chat flow from `app/page.tsx` → `app/api/agent/route.ts` → the Gemini function-calling loop, and saw how tool schemas (`name`, `description`, JSON parameters) drive model decisions.
2. Replaced the starter's paid-weather sample with `get_study_plan`, then added `generate_quiz` and `explain_solidity_concept` sharing one content bank — deterministic tools are free, testable, and quota-independent.
3. Fixed real build failures: a bad `shadcn` CSS import, a dependency downgraded by `npm audit fix --force`, and mixed Windows/WSL installs. Lesson: never run `npm audit fix --force`, install deps from one OS only.

## Week 2 learnings

1. Turned the one-shot quiz into an interactive loop by adding a second local tool (`grade_quiz`) that shares the same content bank as the generator — no server sessions needed because the bank is the source of truth for both sides.
2. Hid answers from `generate_quiz` output and moved them into grading, which forces honest difficulty labeling and makes the loop actually test the learner.
3. Kept everything deterministic: score, percentage, and next-step recommendations are pure functions of the bank + answers, so the workflow costs zero Gemini quota for grading and is fully covered by local tests.

## Future scope (planned, not built)

- **x402 payments:** wire a paid external-data tool through the starter's existing `verifyPayment`/`payAndFetch` helpers (requires a funded demo wallet; not enabled).
- **ZK integration:** explore a ZK-backed credential/attestation feature for completed study plans.
- Expand the concept bank; add spaced-repetition review plans and progress tracking across sessions.

## Socials

- **X (Twitter):** https://x.com/BlockMentor03
- Starter kit credit: [RiseIn Agentmaxxing kit](https://www.npmjs.com/package/agentmaxxin).

### Week 1 posts

1. https://x.com/BlockMentor03/status/2108883891872518210
2. https://x.com/BlockMentor03/status/2108883562804240582
3. https://x.com/BlockMentor03/status/2108883795613262154

## Troubleshooting

| Problem | Solution |
| :--- | :--- |
| Page says to add `GEMINI_API_KEY` | Add it to `.env`, restart `npm run dev`. |
| Agent never calls a study/quiz tool | Mention a topic (and minutes/level) in the prompt. |
| `429` quota errors from Gemini | Free tier is ~20 requests/day; wait for reset. |
| Port 3000 in use | `npm run dev -- -p 3001` |

## License

MIT (starter kit license).

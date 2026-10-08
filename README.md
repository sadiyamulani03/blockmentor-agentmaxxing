# BlockMentor — Agentmaxxing Starter (Week 1)

BlockMentor is a mentor agent that builds structured, level-aware study plans for Web3 and Solidity topics. Ask it for a plan and it returns time allocation, learning objectives, a practice activity, and a final review step — instantly and for free.

It is built on the official [Agentmaxxing starter kit](https://www.npmjs.com/package/agentmaxxin) (`npx agentmaxxin blockmentor-agentmaxxing-web`): a Next.js app with a Gemini tool-calling loop and an x402 demo wallet.

## Live Demo

https://blockmentor-agentmaxxing.vercel.app/

## What the agent does

1. Chats through `POST /api/agent`, which runs the tool loop in `agent/agent.ts`.
2. Calls `get_study_plan` to produce a deterministic study plan (no external API, no payment) from `topic`, `minutes`, and `level` (`beginner` | `intermediate` | `advanced`).
3. Also exposes the starter tools `get_my_wallet` (address + Base Sepolia balance) and `roll_dice`.
4. Keeps the starter's wallet/x402 code so paid-API tools can be added later.

## Install

```bash
git clone <your-repo-url>
cd blockmentor-agentmaxxing-web
npm install
```

(Fresh scaffold instead: `npx agentmaxxin blockmentor-agentmaxxing-web`.)

## Configure the Gemini API key

1. Get a free key at https://aistudio.google.com/apikey
2. Create your local `.env` from the template, then paste the key after the equals sign:

```bash
cp .env.example .env
```

```bash
GEMINI_API_KEY=paste_your_key_here
```

Never commit `.env` (it is in `.gitignore`) and never paste a real key into docs, code, or screenshots. Restart `npm run dev` after changing it.

## Run

```bash
npm run dev
```

Open http://localhost:3000. Type a prompt in the chat, or use an example button.

## Test get_study_plan

1. Start the app and send: `Create a 30-minute beginner study plan for Solidity mappings.`
2. Expand the `get_study_plan` tool step in the chat to inspect its output.
3. Expected result: an object with
   - `timeAllocation` — four sections (Warm-up, Core, Practice, Final review) whose minutes sum to 30
   - `learningObjectives` — three level-appropriate objectives
   - `practiceActivity` — task, deliverable, minutes
   - `finalReview` — a three-item checklist
4. Determinism check: the same `topic`/`minutes`/`level` always returns the identical plan (no randomness, no network).

The tool is listed in the Tools panel and is defined in `agent/tools.ts`.

## Week 1 learnings

1. Scaffolded the official Agentmaxxing starter and traced the chat flow from `app/page.tsx` to `app/api/agent/route.ts` into the Gemini function-calling loop.
2. Replaced the starter's sample paid-weather tool with `get_study_plan`, learning how tool schemas (`name`, `description`, JSON parameters) drive Gemini's decisions and how results flow back into the loop.
3. Made the tool deterministic and structured: fixed time-budget math (sums exactly to `minutes`), level-based objective templates, and validation/clamping of inputs.
4. Debugged real build failures: a bad `shadcn` CSS import, a dependency downgraded by `npm audit fix --force`, and platform-specific native binaries after mixed Windows/WSL installs. Lesson: avoid `npm audit fix --force`, and reinstall dependencies from one OS only.

## Project structure

| Path | Description |
| :--- | :--- |
| `agent/tools.ts` | Tool definitions, including `get_study_plan`. |
| `agent/agent.ts` | Gemini tool-calling loop (unchanged from starter). |
| `agent/wallet.ts` | Starter wallet + x402 payment helpers (unchanged). |
| `app/page.tsx` | Chat UI, setup steps, tools list. |
| `app/api/agent/route.ts` | GET status/tools, POST runs the agent. |
| `app/api/wallet/route.ts` | Creates/reads the demo wallet. |
| `.env` | Local secrets — gitignored, never committed. |

## Configuration

| Variable | Required | Description |
| :--- | :--- | :--- |
| `GEMINI_API_KEY` | Yes | Your Gemini API key (kept local in `.env`). |
| `GEMINI_MODEL` | No | Defaults to `gemini-flash-latest`. |
| `WALLET_PRIVATE_KEY` | No | Optional test wallet key; otherwise use the in-app Create wallet button. |

## Troubleshooting

| Problem | Solution |
| :--- | :--- |
| Page says to add `GEMINI_API_KEY` | Add it to `.env`, restart `npm run dev`. |
| Agent never calls `get_study_plan` | Make the prompt mention a topic, minutes, and level. |
| CSS error about `shadcn/tailwind.css` | Run `npm install` so dependencies match your OS. |
| Port 3000 in use | `npm run dev -- -p 3001` |

## License

MIT (starter kit license).

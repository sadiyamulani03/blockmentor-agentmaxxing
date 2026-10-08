/**
 * YOUR AGENT'S TOOLS
 *
 * A tool is just a function the agent is allowed to call.
 * Gemini reads the `description` to decide WHEN to use it,
 * and `parameters` to know WHAT to pass in.
 *
 * Add your own tool: copy one of the objects below, change it,
 * and save. It shows up in the "Tools" list on the page.
 */
import { getWalletAddress, getWalletBalance } from "./wallet";

export type Tool = {
  name: string;
  description: string;
  /** JSON Schema describing the inputs. */
  parameters: object;
  /** The code that runs when the agent calls this tool. */
  run: (args: any, ctx: { baseUrl: string }) => Promise<unknown>;
};

export const tools: Tool[] = [
  // ─── 1. A local tool: builds a BlockMentor study plan. No API, no payment ───
  {
    name: "get_study_plan",
    description:
      "Create a structured BlockMentor study plan for a topic. Returns time allocation, learning objectives, a practice activity, and a final review step. Runs locally and is free.",
    parameters: {
      type: "object",
      properties: {
        topic: { type: "string", description: "What to study, e.g. Solidity mappings" },
        minutes: { type: "number", description: "Total study time in minutes, e.g. 30" },
        level: {
          type: "string",
          enum: ["beginner", "intermediate", "advanced"],
          description: "Skill level of the learner",
        },
      },
      required: ["topic", "minutes", "level"],
    },
    run: async ({ topic, minutes, level }) => {
      const subject = String(topic ?? "").trim() || "the topic";
      const lvl: string = ["beginner", "intermediate", "advanced"].includes(level) ? level : "beginner";
      const total = Math.min(240, Math.max(15, Math.round(Number(minutes) || 30)));

      const review = Math.max(2, Math.round(total * 0.15));
      const rest = total - review;
      const warmup = Math.max(2, Math.round(rest * 0.18));
      const practice = Math.max(3, Math.round(rest * 0.3));
      const core = rest - warmup - practice;

      const objectives: Record<string, string[]> = {
        beginner: [
          `Define ${subject} in your own words and say when it is used.`,
          `Recognize the basic syntax and building blocks of ${subject}.`,
          `Follow a worked example of ${subject} step by step.`,
        ],
        intermediate: [
          `Implement ${subject} in a short snippet without a guide.`,
          `Compare ${subject} with the main alternatives and when to use each.`,
          `Find and fix common mistakes that involve ${subject}.`,
        ],
        advanced: [
          `Design a solution with ${subject} that handles edge cases and failure modes.`,
          `Optimize ${subject} for readability and cost.`,
          `Defend your ${subject} trade-offs in a code review.`,
        ],
      };

      const practiceByLevel: Record<string, { task: string; deliverable: string }> = {
        beginner: {
          task: `Work through 3 short ${subject} exercises using hints only when stuck.`,
          deliverable: "A small annotated example you can explain out loud.",
        },
        intermediate: {
          task: `Build a small feature that uses ${subject}, then break it on purpose and fix it.`,
          deliverable: "A working snippet plus one bug you found and fixed.",
        },
        advanced: {
          task: `Stress-test ${subject} with edge cases, then refactor and compare before/after.`,
          deliverable: "A refactored solution with a short trade-off note.",
        },
      };

      return {
        topic: subject,
        level: lvl,
        minutes: total,
        timeAllocation: [
          { section: "Warm-up & goals", minutes: warmup },
          { section: "Core concepts", minutes: core },
          { section: "Practice", minutes: practice },
          { section: "Final review", minutes: review },
        ],
        learningObjectives: objectives[lvl],
        practiceActivity: { ...practiceByLevel[lvl], minutes: practice },
        finalReview: {
          minutes: review,
          checklist: [
            `Summarize ${subject} in 2 minutes without notes.`,
            `Answer 3 self-quiz questions about ${subject}.`,
            "Write down one open question to revisit next session.",
          ],
        },
      };
    },
  },

  // ─── 2. Wallet tool: read the agent's own wallet ───
  {
    name: "get_my_wallet",
    description: "Get the agent's own wallet address and its ETH balance on Base Sepolia (testnet).",
    parameters: { type: "object", properties: {} },
    run: async () => ({
      address: getWalletAddress(),
      balance: await getWalletBalance(),
      network: "Base Sepolia (testnet)",
    }),
  },

  // ─── 3. A plain tool: no wallet, no API. Try changing this one first! ───
  {
    name: "roll_dice",
    description: "Roll a dice with the given number of sides.",
    parameters: {
      type: "object",
      properties: {
        sides: { type: "number", description: "How many sides the dice has. Default 6." },
      },
    },
    run: async ({ sides = 6 }) => ({ rolled: Math.floor(Math.random() * sides) + 1, sides }),
  },
];

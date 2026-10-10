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
import {
  DIFFICULTIES,
  findConcept,
  isDifficulty,
  questionsAtDifficulty,
  SUPPORTED_CONCEPTS,
  SUPPORTED_DIFFICULTIES,
  type Difficulty,
} from "./concepts";

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

  // ─── 2. A local tool: quiz for a supported concept at a chosen difficulty ───
  {
    name: "generate_quiz",
    description:
      "Generate a small multiple-choice quiz for a supported Solidity concept at a chosen difficulty (beginner, intermediate, or advanced). Questions never include the correct answer — grade with grade_quiz after the learner replies. Runs locally and is free. Returns the supported topic list if the topic is unknown.",
    parameters: {
      type: "object",
      properties: {
        topic: { type: "string", description: 'The concept to quiz on, e.g. "Solidity mappings"' },
        difficulty: {
          type: "string",
          enum: ["beginner", "intermediate", "advanced"],
          description: "Question difficulty. Default beginner.",
        },
        questionCount: { type: "number", description: "How many questions, 1-3. Default 3." },
      },
      required: ["topic"],
    },
    run: async ({ topic, questionCount, difficulty }) => {
      const concept = findConcept(topic);
      if (!concept) {
        return {
          supported: false,
          error: `No quiz bank for "${String(topic ?? "").trim() || "(empty)"}".`,
          supportedTopics: SUPPORTED_CONCEPTS,
        };
      }
      const diff: Difficulty = isDifficulty(difficulty) ? difficulty : "beginner";
      const pool = questionsAtDifficulty(concept, diff);
      const want = Number.isFinite(Number(questionCount)) && Number(questionCount) > 0 ? Math.round(Number(questionCount)) : 3;
      const n = Math.max(1, Math.min(pool.length, want));
      if (pool.length === 0) {
        return {
          supported: false,
          error: `No ${diff} questions for "${concept.title}" yet.`,
          topic: concept.title,
          difficulty: diff,
          available: { beginner: 0, intermediate: 0, advanced: 0 },
        };
      }
      return {
        supported: true,
        topic: concept.title,
        difficulty: diff,
        questionCount: n,
        availableAtDifficulty: pool.length,
        note:
          n < want
            ? `Only ${pool.length} ${diff} question(s) available for this topic; sent all of them. Ask for a different difficulty for more.`
            : undefined,
        // Answers are withheld on purpose — grade with grade_quiz after the learner answers.
        questions: pool.slice(0, n).map((q, i) => ({
          index: i,
          question: q.question,
          options: q.options,
        })),
        nextStep: "Ask the learner to answer, then call grade_quiz with their answers array.",
      };
    },
  },

  // ─── 3. A local tool: deterministic grading of a generated quiz ───
  {
    name: "grade_quiz",
    description:
      "Grade the learner's answers to a quiz from generate_quiz. Pass the same topic and difficulty that generated the quiz, plus an answers array with one option index per question (e.g. [1, 0, 2]). Returns score, percentage, per-question correctness with the correct answer and explanation, and a deterministic next-step recommendation. Runs locally and is free.",
    parameters: {
      type: "object",
      properties: {
        topic: { type: "string", description: 'The concept the quiz was on, e.g. "Solidity mappings"' },
        difficulty: {
          type: "string",
          enum: ["beginner", "intermediate", "advanced"],
          description: "Difficulty the quiz was generated at. Default beginner.",
        },
        answers: {
          type: "array",
          items: { type: "number" },
          description: "One option index (0-based) per question, in question order, e.g. [1, 0, 2].",
        },
      },
      required: ["topic", "answers"],
    },
    run: async ({ topic, answers, difficulty }) => {
      const concept = findConcept(topic);
      if (!concept) {
        return {
          supported: false,
          error: `No quiz bank for "${String(topic ?? "").trim() || "(empty)"}".`,
          supportedTopics: SUPPORTED_CONCEPTS,
        };
      }
      const diff: Difficulty = isDifficulty(difficulty) ? difficulty : "beginner";
      const pool = questionsAtDifficulty(concept, diff);

      if (pool.length === 0) {
        return {
          supported: false,
          error: `No ${diff} questions for "${concept.title}" — cannot grade.`,
          topic: concept.title,
          difficulty: diff,
        };
      }
      if (!Array.isArray(answers) || answers.length === 0) {
        return {
          supported: false,
          error: "answers must be a non-empty array of option indices, one per question.",
          expectedCount: Math.min(3, pool.length),
          example: "[0, 2, 1]",
        };
      }
      const valid = answers.every((a) => Number.isInteger(a) && a >= 0 && a < 4);
      if (!valid) {
        return {
          supported: false,
          error: "Each answer must be an integer option index from 0 to 3.",
          expectedCount: answers.length,
          received: answers,
        };
      }
      if (answers.length > pool.length) {
        return {
          supported: false,
          error: `Received ${answers.length} answers but only ${pool.length} ${diff} question(s) exist for "${concept.title}".`,
          expectedCount: pool.length,
          receivedCount: answers.length,
        };
      }

      const questions = pool.slice(0, answers.length);
      let score = 0;
      const results = questions.map((q, i) => {
        const correct = answers[i] === q.answerIndex;
        if (correct) score++;
        return {
          index: i,
          question: q.question,
          yourAnswerIndex: answers[i],
          yourAnswer: q.options[answers[i]],
          correct,
          correctAnswerIndex: q.answerIndex,
          correctAnswer: q.options[q.answerIndex],
          explanation: q.explanation,
        };
      });
      const total = questions.length;
      const percentage = Math.round((score / total) * 100);

      // Deterministic next step from the score.
      let nextStep: { action: string; prompt: string };
      if (percentage === 100) {
        nextStep = {
          action: "mastered",
          prompt: `Perfect score on ${diff} ${concept.title}. Try a harder difficulty or a new topic: "Quiz me on ${concept.title} at ${
            diff === "beginner" ? "intermediate" : diff === "intermediate" ? "advanced" : "a different concept"
          } difficulty."`,
        };
      } else if (percentage >= 50) {
        nextStep = {
          action: "review_then_retry",
          prompt: `Review the explanations above, then reinforce with: "Explain ${concept.title}." After that, retry the quiz on the same topic.`,
        };
      } else {
        nextStep = {
          action: "study_then_retry",
          prompt: `Score below 50% — rebuild the basics: "Explain ${concept.title}." and "Create a 20-minute beginner study plan for ${concept.title}." Then take the quiz again.`,
        };
      }

      return {
        supported: true,
        topic: concept.title,
        difficulty: diff,
        score,
        total,
        percentage,
        results,
        nextStep,
      };
    },
  },

  // ─── 4. A local tool: structured explanation of a supported concept ───
  {
    name: "explain_solidity_concept",
    description:
      "Return a concise structured explanation of a supported Solidity concept: summary, syntax, key points, an example, and common mistakes. Runs locally and is free. Returns the supported concept list if the concept is unknown.",
    parameters: {
      type: "object",
      properties: {
        concept: { type: "string", description: 'The concept to explain, e.g. "msg.sender" or "Solidity structs"' },
      },
      required: ["concept"],
    },
    run: async ({ concept }) => {
      const found = findConcept(concept);
      if (!found) {
        return {
          supported: false,
          error: `No explanation for "${String(concept ?? "").trim() || "(empty)"}".`,
          supportedConcepts: SUPPORTED_CONCEPTS,
        };
      }
      return {
        supported: true,
        concept: found.title,
        summary: found.summary,
        syntax: found.syntax,
        keyPoints: found.keyPoints,
        example: found.example,
        commonMistakes: found.commonMistakes,
      };
    },
  },

  // ─── 5. Wallet tool: read the agent's own wallet ───
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

  // ─── 6. A plain tool: no wallet, no API. Try changing this one first! ───
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

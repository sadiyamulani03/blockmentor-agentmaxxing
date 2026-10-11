/**
 * THE AGENT
 *
 * An agent is a loop:
 *   1. Send the chat + the list of tools to Gemini.
 *   2. If Gemini wants to call a tool -> run it, send back the result, repeat.
 *   3. If Gemini answers with text -> done.
 */
import { GoogleGenAI, type Content, type Part } from "@google/genai";
import { tools } from "./tools";

export const MODEL = process.env.GEMINI_MODEL || "gemini-flash-latest";
const MAX_STEPS = 5;

const MAX_RETRIES = 3;
const RETRY_DELAYS_MS = [1000, 2000, 4000];
const MAX_JITTER_MS = 250;

export const GEMINI_BUSY_MESSAGE = "Gemini is temporarily busy. Please try again in a few minutes.";

export class GeminiBusyError extends Error {
  constructor() {
    super(GEMINI_BUSY_MESSAGE);
    this.name = "GeminiBusyError";
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isTransientGeminiError(err: unknown): boolean {
  const status = (err as { status?: unknown } | null)?.status;
  if (typeof status === "number") return status >= 500 && status < 600;
  const message = err instanceof Error ? err.message : String(err);
  return /\b5\d\d\b|UNAVAILABLE/i.test(message);
}

async function withGeminiRetries<T>(fn: () => Promise<T>): Promise<T> {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (!isTransientGeminiError(err)) throw err;
      if (attempt === MAX_RETRIES) throw new GeminiBusyError();
      await sleep(RETRY_DELAYS_MS[attempt] + Math.floor(Math.random() * MAX_JITTER_MS));
    }
  }
  throw new GeminiBusyError();
}

const SYSTEM_PROMPT =
  "You are a helpful agent with your own crypto wallet. Use your tools when they help. " +
  "If a tool costs money, just use it: your wallet pays automatically. Keep answers short and friendly.";

export type ChatMessage = { role: "user" | "agent"; text: string };
export type Step = { tool: string; args: unknown; result: unknown; error?: boolean };

export async function runAgent(history: ChatMessage[], ctx: { baseUrl: string }) {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const contents: Content[] = history.map((m) => ({
    role: m.role === "user" ? "user" : "model",
    parts: [{ text: m.text }],
  }));
  const steps: Step[] = [];

  for (let i = 0; i < MAX_STEPS; i++) {
    const response = await withGeminiRetries(() =>
      ai.models.generateContent({
        model: MODEL,
        contents,
        config: {
          systemInstruction: SYSTEM_PROMPT,
          tools: [
            {
              functionDeclarations: tools.map((t) => ({
                name: t.name,
                description: t.description,
                parametersJsonSchema: t.parameters,
              })),
            },
          ],
        },
      })
    );

    const calls = response.functionCalls ?? [];
    if (calls.length === 0) return { answer: response.text ?? "", steps };

    // Keep Gemini's turn in the history, then run every tool it asked for.
    contents.push(response.candidates![0].content!);
    const results: Part[] = [];

    for (const call of calls) {
      const tool = tools.find((t) => t.name === call.name);
      let result: unknown;
      let error = false;
      try {
        if (!tool) throw new Error(`No tool named ${call.name}`);
        result = await tool.run(call.args ?? {}, ctx);
      } catch (err) {
        result = { error: err instanceof Error ? err.message : String(err) };
        error = true;
      }
      steps.push({ tool: call.name!, args: call.args, result, error });
      results.push({ functionResponse: { id: call.id, name: call.name, response: { result } } });
    }

    contents.push({ role: "user", parts: results });
  }

  return { answer: "I hit my step limit. Try a simpler question.", steps };
}

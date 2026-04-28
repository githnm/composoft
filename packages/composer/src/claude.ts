import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { compositionJsonSchema } from "@composoft/runtime";
import { SYSTEM_PROMPT, buildUserPrompt } from "./prompt.js";
import type { RegistrySummary } from "./registry-summary.js";

const DEFAULT_MODEL = "claude-opus-4-7";

/**
 * Resolve the Claude model id to use for this run. Reads `COMPOSOFT_MODEL`
 * if set, otherwise the default. Exported so the CLI can log which model
 * it picked before the API call goes out.
 */
export function resolveModel(): string {
  return process.env.COMPOSOFT_MODEL || DEFAULT_MODEL;
}

const composerResponseSchema = z.object({
  composition: compositionJsonSchema,
  contextSchemaTs: z.string().min(1),
  contextSchemaJson: z
    .record(z.string(), z.unknown())
    .refine((v) => "properties" in v || "type" in v, {
      message: "contextSchemaJson must be a JSON Schema object",
    }),
  notes: z.array(z.string()).optional(),
});

export type ComposerResponse = z.infer<typeof composerResponseSchema>;

export async function callComposer(
  brief: string,
  summary: RegistrySummary,
): Promise<ComposerResponse> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      "ANTHROPIC_API_KEY is not set. Export it in your shell before running the composer.",
    );
  }

  const model = resolveModel();
  const client = new Anthropic({ apiKey });

  const message = await client.messages.create({
    model,
    max_tokens: 8192,
    system: SYSTEM_PROMPT,
    messages: [{ role: "user", content: buildUserPrompt(brief, summary) }],
  });

  const text = message.content
    .filter((b): b is { type: "text"; text: string; citations?: unknown } => b.type === "text")
    .map((b) => b.text)
    .join("");

  const json = extractJson(text);
  const parsed = composerResponseSchema.safeParse(json);
  if (!parsed.success) {
    // Surface what Claude actually returned so the prompt/validator can be
    // iterated. The CLI is the right place to see this, not a log file.
    console.error("=== composer response did not match schema; raw JSON: ===");
    console.error(JSON.stringify(json, null, 2));
    console.error("=== schema issues: ===");
    for (const issue of parsed.error.issues) {
      console.error(`  - ${issue.path.join(".") || "(root)"}: ${issue.message}`);
    }
    throw new Error("composer response failed schema validation; see raw JSON above");
  }
  return parsed.data;
}

/**
 * Pulls the first top-level JSON object out of the model's response. Tolerates
 * accidental code fences or surrounding prose, since structured-output
 * compliance varies by model.
 */
function extractJson(text: string): unknown {
  const trimmed = text.trim();
  // Strip ```json … ``` or ``` … ``` fences.
  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenceMatch?.[1]?.trim() ?? trimmed;

  // Find the first balanced object.
  const start = candidate.indexOf("{");
  if (start === -1) {
    throw new Error(`composer response had no JSON object: "${trimmed.slice(0, 200)}…"`);
  }
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = start; i < candidate.length; i++) {
    const ch = candidate[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (ch === "\\") {
      escape = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) {
        const slice = candidate.slice(start, i + 1);
        try {
          return JSON.parse(slice);
        } catch (e) {
          throw new Error(
            `composer response JSON did not parse: ${(e as Error).message}\n---\n${slice.slice(0, 500)}`,
          );
        }
      }
    }
  }
  throw new Error("composer response had unbalanced JSON braces");
}

import { z } from "zod";
import { isZodSchema, manifestMetadataSchema } from "./common.js";

/**
 * A Workflow is a multi-step server-side action.
 *
 * `sideEffects` is human-readable documentation surfaced to the FDE during
 * composition ("sends email", "writes to db"). It is not enforced — treat it
 * as a label, not a sandbox.
 */
export type Workflow<TInput = unknown, TOutput = unknown> = {
  readonly id: string;
  readonly version: string;
  readonly description: string;
  readonly input: z.ZodType<TInput>;
  readonly output: z.ZodType<TOutput>;
  readonly sideEffects?: readonly string[];
  readonly run: (input: TInput) => Promise<TOutput>;
};

export type WorkflowConfig<TInput, TOutput> = Workflow<TInput, TOutput>;

/**
 * Erased Workflow type for storage at registry-keyed-by-id sites. See the
 * "Type erasure for storage" section in the package README.
 */
export type AnyWorkflow = Workflow<any, any>;

/** Extract a Workflow's input type. */
export type WorkflowInput<T> = T extends Workflow<infer I, infer _O> ? I : never;

/** Extract a Workflow's output type. */
export type WorkflowOutput<T> = T extends Workflow<infer _I, infer O> ? O : never;

/**
 * The function signature a Workflow exposes to a Block: input in, output out.
 * Use this to type a Block's `actions` prop without redeclaring the input /
 * output shape that already lives on the workflow definition.
 */
export type WorkflowAction<T> = T extends Workflow<infer I, infer O>
  ? (input: I) => Promise<O>
  : never;

/**
 * Caller-facing signature for an action whose manifest pre-fills some input
 * keys via `ActionRef.params`. The runtime supplies the keys named in `K`;
 * the component supplies the remaining keys.
 *
 * `K` is the union of pre-filled key names, passed manually as a string
 * literal (or union). Example:
 *
 *   type Actions = {
 *     escalate: WorkflowActionWithPrefilled<typeof escalateTicket, "ticketId">;
 *   };
 *
 * v1 limitation: `K` is *not* inferred from the manifest's `params` keys.
 * The author must keep `K` and the manifest's `params` keys in sync. Zod
 * validation at the manifest level catches structural problems; a typo in
 * `K` only manifests as the action accepting/missing a key at the call site.
 * A future helper may infer `K` from `typeof block` once the registry-level
 * lookup lands.
 */
export type WorkflowActionWithPrefilled<T, K extends string = never> =
  T extends Workflow<infer I, infer O>
    ? (input: Omit<I, K & keyof I>) => Promise<O>
    : never;

/**
 * See the note on `defineAdapter` — generics are the schema types so the
 * literal object shape survives inference.
 */
export function defineWorkflow<
  I extends z.ZodTypeAny,
  O extends z.ZodTypeAny,
>(config: {
  id: string;
  version: string;
  description: string;
  input: I;
  output: O;
  sideEffects?: readonly string[];
  run: (input: z.infer<I>) => Promise<z.infer<O>>;
}): Workflow<z.infer<I>, z.infer<O>> {
  return config as Workflow<z.infer<I>, z.infer<O>>;
}

export function validateWorkflow(workflow: unknown): Workflow {
  if (typeof workflow !== "object" || workflow === null) {
    throw new TypeError("workflow must be an object");
  }
  manifestMetadataSchema.parse(workflow);
  const w = workflow as Record<string, unknown>;
  if (!isZodSchema(w.input)) {
    throw new TypeError(`workflow ${String(w.id)}: input must be a Zod schema`);
  }
  if (!isZodSchema(w.output)) {
    throw new TypeError(`workflow ${String(w.id)}: output must be a Zod schema`);
  }
  if (typeof w.run !== "function") {
    throw new TypeError(`workflow ${String(w.id)}: run must be a function`);
  }
  if (w.sideEffects !== undefined) {
    if (
      !Array.isArray(w.sideEffects) ||
      !w.sideEffects.every((s) => typeof s === "string")
    ) {
      throw new TypeError(`workflow ${String(w.id)}: sideEffects must be string[]`);
    }
  }
  return workflow as Workflow;
}

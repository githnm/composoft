import type { ComponentType } from "react";
import { z } from "zod";
import { DOTTED_ID_REGEX, isZodSchema, manifestMetadataSchema } from "./common.js";

/**
 * Where a data-slot parameter comes from.
 * - `static`: a literal value baked into the manifest.
 * - `from-config`: read from the per-customer config the FDE writes once at
 *   composition time. Use for choices that vary by customer but not by
 *   request — column sets, page sizes, default filters, agent rosters.
 * - `from-context`: read from runtime context at render time (e.g. the
 *   active ticket id, the current user). Use for values that change per
 *   request rather than per customer. The runtime decides the context
 *   shape — the spec does not constrain it.
 *
 * NOTE: in v1, `path` (for both `from-config` and `from-context`) is a plain
 * string and is *not* type-checked against the Block's `config` Zod schema
 * or any context shape. A typo or stale path will only surface at runtime
 * when the composer wires the slot. A future version may expose typed
 * accessors (e.g. `fromConfig<TConfig>(c => c.defaultStatus)` and a
 * runtime-defined context contract) that resolve to paths checked at the
 * manifest construction site.
 */
export type ParamSource =
  | { readonly kind: "static"; readonly value: unknown }
  | { readonly kind: "from-config"; readonly path: string }
  | { readonly kind: "from-context"; readonly path: string };

/** A named data slot referencing an adapter by id with its params. */
export type DataSlot = {
  readonly adapter: string;
  readonly params: Readonly<Record<string, ParamSource>>;
};

/**
 * A named action surface referencing a workflow by id.
 *
 * `params` (optional) pre-fills a subset of the workflow's input keys at the
 * manifest level using the same `ParamSource` model as data-slot params. The
 * runtime resolves these before calling `run`. The component supplies only
 * the remaining keys at call time. If `params` is omitted, the component
 * supplies the full workflow input — current behavior preserved.
 */
export type ActionRef = {
  readonly workflow: string;
  readonly params?: Readonly<Record<string, ParamSource>>;
};

/**
 * Props the Block's React component receives.
 *
 * Type-inference tradeoff (v1):
 *   Ideally `TData` and `TActions` would be derived from the manifest's `data`
 *   and `actions` records by resolving each slot's id to its adapter /
 *   workflow's schemas. That requires a registry-level type map, which v1
 *   does not have — adapters and workflows are referenced by string id only.
 *
 *   For now the component author declares `TData` and `TActions` explicitly
 *   on their component's prop type. `TConfig` *is* inferred from the Zod
 *   schema. Runtime correctness is enforced by validating each slot's output
 *   against the adapter's `output` schema at the runtime boundary.
 *
 *   TODO(types): once a registry exists, expose `BlockPropsFor<typeof block>`
 *   that resolves slot ids to typed outputs at the manifest construction site.
 */
export type BlockProps<TConfig, TData, TActions> = {
  data: TData;
  actions: TActions;
  config: TConfig;
};

export type Block<
  TConfig = unknown,
  TData = Record<string, unknown>,
  TActions = Record<string, (...args: never[]) => Promise<unknown>>,
> = {
  readonly id: string;
  readonly version: string;
  readonly description: string;
  readonly data: Readonly<Record<string, DataSlot>>;
  readonly actions: Readonly<Record<string, ActionRef>>;
  readonly config: z.ZodType<TConfig>;
  readonly component: ComponentType<BlockProps<TConfig, TData, TActions>>;
};

export type BlockConfig<TConfig, TData, TActions> = Block<TConfig, TData, TActions>;

/**
 * Erased Block type for storage at registry-keyed-by-id sites. See the
 * "Type erasure for storage" section in the package README.
 */
export type AnyBlock = Block<any, any, any>;

/**
 * Identity at runtime. `TConfig` is inferred from the Zod `config` schema.
 * `TData` and `TActions` are inferred from the component's prop type, or fall
 * back to permissive defaults when the component is untyped.
 */
export function defineBlock<
  TConfigSchema extends z.ZodType,
  TData extends Record<string, unknown> = Record<string, unknown>,
  TActions extends Record<string, (...args: never[]) => Promise<unknown>> = Record<
    string,
    (...args: never[]) => Promise<unknown>
  >,
>(config: {
  id: string;
  version: string;
  description: string;
  data: Record<string, DataSlot>;
  actions: Record<string, ActionRef>;
  config: TConfigSchema;
  component: ComponentType<BlockProps<z.infer<TConfigSchema>, TData, TActions>>;
}): Block<z.infer<TConfigSchema>, TData, TActions> {
  return config as Block<z.infer<TConfigSchema>, TData, TActions>;
}

const paramSourceSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("static"), value: z.unknown() }),
  z.object({ kind: z.literal("from-config"), path: z.string().min(1) }),
  z.object({ kind: z.literal("from-context"), path: z.string().min(1) }),
]);

const dataSlotSchema = z.object({
  adapter: z
    .string()
    .regex(DOTTED_ID_REGEX, "data slot adapter id must be dot-namespaced"),
  params: z.record(z.string(), paramSourceSchema),
});

const actionRefSchema = z.object({
  workflow: z
    .string()
    .regex(DOTTED_ID_REGEX, "action workflow id must be dot-namespaced"),
  params: z.record(z.string(), paramSourceSchema).optional(),
});

const blockManifestSchema = manifestMetadataSchema.extend({
  data: z.record(z.string(), dataSlotSchema),
  actions: z.record(z.string(), actionRefSchema),
});

export function validateBlock(block: unknown): Block {
  if (typeof block !== "object" || block === null) {
    throw new TypeError("block must be an object");
  }
  blockManifestSchema.parse(block);
  const b = block as Record<string, unknown>;
  if (!isZodSchema(b.config)) {
    throw new TypeError(`block ${String(b.id)}: config must be a Zod schema`);
  }
  if (b.component == null) {
    throw new TypeError(`block ${String(b.id)}: component is required`);
  }
  return block as Block;
}

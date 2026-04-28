import type { AnyAdapter } from "./adapter.js";
import type { AnyWorkflow } from "./workflow.js";
import type { AnyBlock } from "./block.js";

/**
 * Signature for a registry's optional context-enrichment hook. The runtime
 * calls this once per request, after the composer-emitted `buildContext`
 * produces a raw context from route params and before any data slot or
 * action runs. The returned object replaces context for the rest of the
 * render. Use it to derive ambient ids the route doesn't carry.
 */
export type EnrichContextFn = (
  rawContext: unknown,
  registry: Registry,
) => Promise<unknown>;

/**
 * The public contract every registry package exports. Lives in `@composoft/spec`
 * so registry libraries do not need a dependency on `@composoft/runtime` just
 * to type their export.
 *
 * Schema generics on adapters/workflows/blocks are erased at this storage
 * layer via the `Any*` aliases — see "Type erasure for storage" in the
 * package README.
 */
export type Registry = {
  readonly name: string;
  readonly version: string;
  readonly adapters: Readonly<Record<string, AnyAdapter>>;
  readonly workflows: Readonly<Record<string, AnyWorkflow>>;
  readonly blocks: Readonly<Record<string, AnyBlock>>;
  /**
   * Derive additional fields on the runtime context. The returned object
   * fully replaces context (the runtime does not deep-merge), so
   * implementations typically spread `rawContext` and add fields.
   */
  readonly enrichContext?: EnrichContextFn;
  /**
   * Dot-paths the registry's `enrichContext` will populate on context. The
   * composer's path-existence check unions these into the model-emitted
   * `contextSchemaJson` during validation, so a `from-context` path the
   * route schema doesn't mention but the registry guarantees is still
   * accepted.
   */
  readonly enrichmentDeclares?: readonly string[];
};

import type { ParamSource } from "@composoft/spec";
import type { AnyBlock, Registry } from "./registry.js";
import { PathResolutionError, readPath } from "./path.js";

/**
 * Resolve a single ParamSource against the runtime context and per-customer
 * config. Wraps path errors with the slot/param they came from so the
 * stacktrace points at the actual offending line of the manifest.
 */
export function resolveParamSource(
  source: ParamSource,
  ctx: unknown,
  config: unknown,
): unknown {
  switch (source.kind) {
    case "static":
      return source.value;
    case "from-config":
      return readPath(config, source.path);
    case "from-context":
      return readPath(ctx, source.path);
  }
}

/**
 * Resolve all of a Block's data slots: walk each slot, build params from its
 * ParamSources, validate against the adapter's `params` schema, run the
 * adapter, validate the output against the adapter's `output` schema.
 *
 * Returns a record keyed by slot name. Throws on any miss — the runtime
 * does not silently substitute undefined.
 */
export async function resolveDataSlots(
  block: AnyBlock,
  registry: Pick<Registry, "adapters">,
  ctx: unknown,
  config: unknown,
): Promise<Record<string, unknown>> {
  const out: Record<string, unknown> = {};
  for (const [slotName, slot] of Object.entries(block.data)) {
    const adapter = registry.adapters[slot.adapter];
    if (!adapter) {
      throw new Error(
        `block ${block.id}: data slot "${slotName}" references unknown adapter "${slot.adapter}"`,
      );
    }

    const params: Record<string, unknown> = {};
    for (const [paramName, source] of Object.entries(slot.params)) {
      try {
        params[paramName] = resolveParamSource(source, ctx, config);
      } catch (e) {
        if (e instanceof PathResolutionError) {
          throw new PathResolutionError(
            `block ${block.id} slot "${slotName}" param "${paramName}": ${e.message}`,
          );
        }
        throw e;
      }
    }

    const validatedParams = adapter.params.parse(params);
    const result = await adapter.run(validatedParams);
    out[slotName] = adapter.output.parse(result);
  }
  return out;
}

/**
 * Build the action map a Block component receives. Each returned function:
 *   1. Merges caller-supplied input with manifest pre-filled params.
 *      Pre-filled values win on conflict — the runtime is the authority on
 *      ambient targets (e.g. ticket id from context).
 *   2. Validates the merged input against the workflow's `input` schema.
 *   3. Calls `run`.
 *   4. Validates the output against the workflow's `output` schema.
 *
 * The signature is `(callerInput: unknown) => Promise<unknown>` because the
 * generic `K` of `WorkflowActionWithPrefilled` is not visible at this site.
 * The component's prop type narrows the signature for callers; the runtime
 * accepts unknown and trusts Zod for correctness.
 */
export function bindActions(
  block: AnyBlock,
  registry: Pick<Registry, "workflows">,
  ctx: unknown,
  config: unknown,
): Record<string, (callerInput?: unknown) => Promise<unknown>> {
  const bound: Record<string, (callerInput?: unknown) => Promise<unknown>> = {};
  for (const [actionName, ref] of Object.entries(block.actions)) {
    const workflow = registry.workflows[ref.workflow];
    if (!workflow) {
      throw new Error(
        `block ${block.id}: action "${actionName}" references unknown workflow "${ref.workflow}"`,
      );
    }

    bound[actionName] = async (callerInput?: unknown) => {
      const prefilled: Record<string, unknown> = {};
      if (ref.params) {
        for (const [paramName, source] of Object.entries(ref.params)) {
          try {
            prefilled[paramName] = resolveParamSource(source, ctx, config);
          } catch (e) {
            if (e instanceof PathResolutionError) {
              throw new PathResolutionError(
                `block ${block.id} action "${actionName}" param "${paramName}": ${e.message}`,
              );
            }
            throw e;
          }
        }
      }

      const callerObject =
        callerInput !== undefined && typeof callerInput === "object" && callerInput !== null
          ? (callerInput as Record<string, unknown>)
          : {};

      const merged = { ...callerObject, ...prefilled };
      const validatedInput = workflow.input.parse(merged);
      const result = await workflow.run(validatedInput);
      return workflow.output.parse(result);
    };
  }
  return bound;
}

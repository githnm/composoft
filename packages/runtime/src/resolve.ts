import type { ParamSource } from "@composoft/spec";
import type { AnyBlock, Registry } from "./registry.js";
import { PathResolutionError, readPath } from "./path.js";

/**
 * Resolve a single ParamSource against config, context, and page state.
 *
 * Missing `from-config`, `from-context`, or `from-page-state` paths resolve
 * to `undefined` rather than throwing. The adapter's (or workflow's) Zod
 * schema is the source of truth on whether a param is required: optional
 * params accept undefined; required params raise a clear schema error at
 * the parse boundary. This pushes correctness to the schema layer where it
 * belongs.
 *
 * `static` values pass through unchanged, including `undefined` if a
 * manifest explicitly sets it.
 */
export function resolveParamSource(
  source: ParamSource,
  ctx: unknown,
  config: unknown,
  pageState: unknown = {},
): unknown {
  switch (source.kind) {
    case "static":
      return source.value;
    case "from-config":
      return tryReadPath(config, source.path);
    case "from-context":
      return tryReadPath(ctx, source.path);
    case "from-page-state":
      return tryReadPath(pageState, source.path);
  }
}

function tryReadPath(obj: unknown, path: string): unknown {
  try {
    return readPath(obj, path);
  } catch (e) {
    if (e instanceof PathResolutionError) return undefined;
    throw e;
  }
}

/**
 * Both `null` and `undefined` indicate "no selection" for a from-page-state
 * source. Composer-emitted `initialState` JSON typically uses explicit
 * `null` (JSON has no `undefined`), and an adopter might also write null
 * when clearing a selection. The auto-skip logic must treat both the same;
 * otherwise a null-leaf in page state cascades into a Zod parse failure
 * far away from the source of the issue.
 */
function isMissing(value: unknown): boolean {
  return value === undefined || value === null;
}

/**
 * Resolve all of a Block's data slots: walk each slot, build params from its
 * ParamSources, validate against the adapter's `params` schema, run the
 * adapter, validate the output against the adapter's `output` schema.
 *
 * Auto-skip semantics: if a slot has any `from-page-state` param that
 * resolves to `null` or `undefined`, the slot is **skipped** — the adapter
 * is not called and `data[slotName]` is set to `null`. Components reading
 * from page state must declare `Data = { item: T | null }` and render a
 * placeholder for null. See spec README "Slots that resolve to null".
 */
export async function resolveDataSlots(
  block: AnyBlock,
  registry: Pick<Registry, "adapters">,
  ctx: unknown,
  config: unknown,
  pageState: unknown = {},
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
    let skipDueToMissingPageState = false;
    for (const [paramName, source] of Object.entries(slot.params)) {
      const value = resolveParamSource(source, ctx, config, pageState);
      if (source.kind === "from-page-state" && isMissing(value)) {
        skipDueToMissingPageState = true;
        break;
      }
      params[paramName] = value;
    }

    if (skipDueToMissingPageState) {
      out[slotName] = null;
      continue;
    }

    const validatedParams = adapter.params.parse(params);
    const result = await adapter.run(validatedParams);
    out[slotName] = adapter.output.parse(result);
  }
  return out;
}

/**
 * Resolve a single named slot. Used by the action endpoint's sibling
 * `/api/composoft/resolve` route to re-fetch one slot when page state
 * changes — avoids the full `resolveDataSlots` walk when only one slot
 * needs to refresh.
 */
export async function resolveOneSlot(
  block: AnyBlock,
  slotName: string,
  registry: Pick<Registry, "adapters">,
  ctx: unknown,
  config: unknown,
  pageState: unknown = {},
): Promise<unknown> {
  const slot = block.data[slotName];
  if (!slot) {
    throw new Error(`block ${block.id}: no slot named "${slotName}"`);
  }
  const adapter = registry.adapters[slot.adapter];
  if (!adapter) {
    throw new Error(
      `block ${block.id}: data slot "${slotName}" references unknown adapter "${slot.adapter}"`,
    );
  }

  const params: Record<string, unknown> = {};
  for (const [paramName, source] of Object.entries(slot.params)) {
    const value = resolveParamSource(source, ctx, config, pageState);
    if (source.kind === "from-page-state" && isMissing(value)) {
      return null; // same auto-skip as resolveDataSlots
    }
    params[paramName] = value;
  }

  const validatedParams = adapter.params.parse(params);
  const result = await adapter.run(validatedParams);
  return adapter.output.parse(result);
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
 * `pageState` is accepted so action prefills can use `from-page-state` —
 * a "delete selected" button can prefill `itemId` from `selection.itemId`
 * without the component knowing about the selection mechanism.
 */
export function bindActions(
  block: AnyBlock,
  registry: Pick<Registry, "workflows">,
  ctx: unknown,
  config: unknown,
  pageState: unknown = {},
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
          prefilled[paramName] = resolveParamSource(source, ctx, config, pageState);
        }
      }

      const callerObject =
        callerInput !== undefined && typeof callerInput === "object" && callerInput !== null
          ? (callerInput as Record<string, unknown>)
          : {};

      const merged = { ...callerObject, ...prefilled };
      const validatedInput = workflow.input.parse(merged);

      // Workflows receive context as the second arg (spec change). The ctx
      // here is what the route handler passed in — already merged with the
      // authenticated identity, then run through enrichContext. Workflows
      // read ctx.user.id for audit log actor and tenancy filtering.
      const wfContext =
        ctx && typeof ctx === "object" && "user" in ctx
          ? (ctx as { user: { id: string } } & Record<string, unknown>)
          : { user: { id: "anonymous" } };

      const result = await workflow.run(validatedInput, wfContext);
      return workflow.output.parse(result);
    };
  }
  return bound;
}

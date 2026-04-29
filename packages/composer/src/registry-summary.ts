import type { ReferenceData, Registry } from "@composoft/spec";
import { zodToJsonSchema } from "zod-to-json-schema";

/**
 * A summary of a registry suitable for dropping into a Claude prompt.
 * JSON-serializable; intentionally lossy on the implementation side
 * (`run` functions and React components don't go to the model).
 */
export type RegistrySummary = {
  name: string;
  version: string;
  adapters: AdapterSummary[];
  workflows: WorkflowSummary[];
  blocks: BlockSummary[];
  /**
   * Union of every `from-context` path used by any block's data slots or
   * action prefills. Surfaced explicitly in the user prompt so the model
   * emits a contextSchemaJson with these exact dotted paths.
   */
  requiredContextPaths: string[];
  /**
   * Union of every `from-page-state` path used by any block. Informational
   * for the model — useful for understanding what cross-block coordination
   * looks like in this registry.
   */
  pageStatePathsRead: string[];
  pageStatePathsWritten: string[];
  /**
   * Real (id, label) pairs the registry uses, scoped by category. Populated
   * by the registry's optional `referenceData()` function. Surfaced verbatim
   * in the user prompt so the model emits configs with real ids instead of
   * guessing from labels in the brief.
   */
  referenceData?: ReferenceData;
};

type AdapterSummary = {
  id: string;
  description: string;
  paramsSchema: unknown;
  outputSchema: unknown;
};

type WorkflowSummary = {
  id: string;
  description: string;
  inputSchema: unknown;
  outputSchema: unknown;
  sideEffects: readonly string[] | null;
};

type BlockSummary = {
  id: string;
  description: string;
  configSchema: unknown;
  data: Record<string, { adapter: string; paramKeys: string[] }>;
  actions: Record<string, { workflow: string; prefilledParamKeys: string[] }>;
  writes: Record<string, { path: string }>;
};

export async function summarizeRegistry(registry: Registry): Promise<RegistrySummary> {
  let referenceData: ReferenceData | undefined;
  if (registry.referenceData) {
    try {
      referenceData = await registry.referenceData();
    } catch (e) {
      console.error(
        `-> warning: registry.referenceData() threw — continuing without it. ${(e as Error).message}`,
      );
    }
  }

  const ctxPaths = new Set<string>();
  const pageStateRead = new Set<string>();
  const pageStateWritten = new Set<string>();

  for (const b of Object.values(registry.blocks)) {
    for (const slot of Object.values(b.data)) {
      for (const source of Object.values(slot.params)) {
        if (source.kind === "from-context") ctxPaths.add(source.path);
        if (source.kind === "from-page-state") pageStateRead.add(source.path);
      }
    }
    for (const action of Object.values(b.actions)) {
      if (!action.params) continue;
      for (const source of Object.values(action.params)) {
        if (source.kind === "from-context") ctxPaths.add(source.path);
        if (source.kind === "from-page-state") pageStateRead.add(source.path);
      }
    }
    for (const w of Object.values(b.writes ?? {})) {
      if (w.kind === "page-state") pageStateWritten.add(w.path);
    }
  }

  return {
    name: registry.name,
    version: registry.version,
    adapters: Object.values(registry.adapters).map((a) => ({
      id: a.id,
      description: a.description,
      paramsSchema: zodToJsonSchema(a.params),
      outputSchema: zodToJsonSchema(a.output),
    })),
    workflows: Object.values(registry.workflows).map((w) => ({
      id: w.id,
      description: w.description,
      inputSchema: zodToJsonSchema(w.input),
      outputSchema: zodToJsonSchema(w.output),
      sideEffects: w.sideEffects ?? null,
    })),
    blocks: Object.values(registry.blocks).map((b) => ({
      id: b.id,
      description: b.description,
      configSchema: zodToJsonSchema(b.config),
      data: Object.fromEntries(
        Object.entries(b.data).map(([slotName, slot]) => [
          slotName,
          {
            adapter: slot.adapter,
            paramKeys: Object.keys(slot.params),
          },
        ]),
      ),
      actions: Object.fromEntries(
        Object.entries(b.actions).map(([actionName, action]) => [
          actionName,
          {
            workflow: action.workflow,
            prefilledParamKeys: action.params ? Object.keys(action.params) : [],
          },
        ]),
      ),
      writes: b.writes
        ? Object.fromEntries(
            Object.entries(b.writes).map(([writeName, write]) => [
              writeName,
              { path: write.path },
            ]),
          )
        : {},
    })),
    requiredContextPaths: Array.from(ctxPaths).sort(),
    pageStatePathsRead: Array.from(pageStateRead).sort(),
    pageStatePathsWritten: Array.from(pageStateWritten).sort(),
    referenceData,
  };
}

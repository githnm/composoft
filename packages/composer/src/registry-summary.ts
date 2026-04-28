import type { Registry } from "@composoft/spec";
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
};

export function summarizeRegistry(registry: Registry): RegistrySummary {
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
    })),
  };
}

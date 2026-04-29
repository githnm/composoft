// Manifest-only validation for the example registry. Does NOT hit the database.
// Run via `pnpm test`. For DB-touching checks, see `_smoke.ts` and `pnpm smoke`.

import { validateAdapter, validateBlock, validateWorkflow } from "@composoft/spec";
import { registry } from "./index.js";

const failures: string[] = [];

function record(scope: string, fn: () => void) {
  try {
    fn();
  } catch (e) {
    failures.push(`${scope}: ${(e as Error).message}`);
  }
}

for (const [key, adapter] of Object.entries(registry.adapters)) {
  record(`adapter ${key}`, () => {
    validateAdapter(adapter);
    if (adapter.id !== key) {
      throw new Error(`registry key "${key}" disagrees with manifest id "${adapter.id}"`);
    }
  });
}

for (const [key, workflow] of Object.entries(registry.workflows)) {
  record(`workflow ${key}`, () => {
    validateWorkflow(workflow);
    if (workflow.id !== key) {
      throw new Error(`registry key "${key}" disagrees with manifest id "${workflow.id}"`);
    }
  });
}

for (const [key, block] of Object.entries(registry.blocks)) {
  record(`block ${key}`, () => {
    validateBlock(block);
    if (block.id !== key) {
      throw new Error(`registry key "${key}" disagrees with manifest id "${block.id}"`);
    }
  });
}

const adapterIds = new Set(Object.keys(registry.adapters));
const workflowIds = new Set(Object.keys(registry.workflows));

for (const [key, block] of Object.entries(registry.blocks)) {
  for (const [slotName, slot] of Object.entries(block.data)) {
    if (!adapterIds.has(slot.adapter)) {
      failures.push(
        `block ${key}: data slot "${slotName}" references unknown adapter "${slot.adapter}"`,
      );
    }
  }
  for (const [actionName, action] of Object.entries(block.actions)) {
    if (!workflowIds.has(action.workflow)) {
      failures.push(
        `block ${key}: action "${actionName}" references unknown workflow "${action.workflow}"`,
      );
    }
  }
}

let actionParamCount = 0;
for (const [blockKey, block] of Object.entries(registry.blocks)) {
  for (const [actionName, action] of Object.entries(block.actions)) {
    if (!action.params) continue;
    for (const [paramName, source] of Object.entries(action.params)) {
      actionParamCount++;
      if (source.kind === "static") continue;
      if (typeof source.path !== "string" || source.path.length === 0) {
        failures.push(
          `block ${blockKey}: action "${actionName}" param "${paramName}" has empty ${source.kind} path`,
        );
      }
    }
  }
}

const counts = {
  adapters: Object.keys(registry.adapters).length,
  workflows: Object.keys(registry.workflows).length,
  blocks: Object.keys(registry.blocks).length,
  actionParams: actionParamCount,
};

if (failures.length > 0) {
  console.error(
    `FAIL — ${failures.length} issue${failures.length === 1 ? "" : "s"} in registry "${registry.name}@${registry.version}"`,
  );
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}

console.log(
  `OK — registry "${registry.name}@${registry.version}" passed: ` +
    `${counts.adapters} adapters, ${counts.workflows} workflows, ${counts.blocks} blocks, ` +
    `${counts.actionParams} action params. ` +
    `All data-slot adapter ids and action workflow ids resolve; all ParamSource paths are non-empty.`,
);

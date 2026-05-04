// Manifest validation. Does not require a database.

import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import {
  validateAdapter,
  validateBlock,
  validateProductInfo,
  validateWorkflow,
} from "@composoft/spec";
import { registry } from "./index.js";

const failures: string[] = [];

function record(scope: string, fn: () => void) {
  try {
    fn();
  } catch (e) {
    failures.push(`${scope}: ${(e as Error).message}`);
  }
}

/**
 * Block components are passed through the React Server Component boundary
 * as values. Every .component.tsx file MUST start with `"use client"` —
 * regardless of whether it uses hooks. This validator catches missing
 * directives at registry-test time instead of in `next dev`.
 */
async function validateBlockComponentDirectives(): Promise<void> {
  const blocksDir = join(process.cwd(), "src", "blocks");
  let entries: string[];
  try {
    entries = await readdir(blocksDir);
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return;
    failures.push(`use-client check: cannot read ${blocksDir}: ${(e as Error).message}`);
    return;
  }
  const directiveRe = /^\s*["']use client["']\s*;?\s*$/;
  for (const entry of entries) {
    if (!entry.endsWith(".component.tsx") && !entry.endsWith(".component.ts")) continue;
    const path = join(blocksDir, entry);
    const raw = await readFile(path, "utf8");
    const firstLine = raw.split(/\r?\n/)[0] ?? "";
    if (!directiveRe.test(firstLine)) {
      failures.push(
        `block component file ${path} must start with "use client". ` +
          `composoft block components are passed through the RSC boundary and must be Client Components.`,
      );
    }
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

if (registry.product) {
  record("product", () => {
    validateProductInfo(registry.product);
  });
}

const adapterIds = new Set(Object.keys(registry.adapters));
const workflowIds = new Set(Object.keys(registry.workflows));

let actionParamCount = 0;

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
    if (action.params) {
      actionParamCount += Object.keys(action.params).length;
    }
  }
}

await validateBlockComponentDirectives();

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
  `OK — registry ${registry.name}@${registry.version} passed: ` +
    `${counts.adapters} adapters, ` +
    `${counts.workflows} workflows, ` +
    `${counts.blocks} blocks, ` +
    `${counts.actionParams} action params`,
);

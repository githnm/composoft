import type { Registry } from "@composoft/spec";

import { todosList } from "./adapters/items-list.js";
import { todosToggle } from "./workflows/items-toggle.js";
import { todoListBlock } from "./blocks/item-list.js";

export const adapters = {
  "todos.list": todosList,
} as const;

export const workflows = {
  "todos.toggle": todosToggle,
} as const;

export const blocks = {
  "todos.item-list": todoListBlock,
} as const;

/**
 * The composer surfaces these to the model so it writes configs with real
 * id values instead of guessing from the brief. Add more scopes as you add
 * id-typed config fields elsewhere in the registry.
 */
async function referenceData() {
  return {
    "todos.completed": [
      { id: "true", label: "Done" },
      { id: "false", label: "Open" },
    ],
  };
}

export const registry: Registry = {
  name: "todo-list",
  version: "0.0.1",
  adapters,
  workflows,
  blocks,
  referenceData,
  // Add `authenticate` and `authorize` here before deploying. See the README
  // and the @composoft/spec README for the contract.
};

export type TodoRegistry = typeof registry;

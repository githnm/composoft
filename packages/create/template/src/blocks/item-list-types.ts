import { z } from "zod";
import type { AdapterOutput, BlockProps, WorkflowAction } from "@composoft/spec";
import type { todosList } from "../adapters/items-list.js";
import type { todosToggle } from "../workflows/items-toggle.js";

const FILTER = z.enum(["all", "open", "done"]);

export const configSchema = z.object({
  defaultFilter: FILTER.default("all"),
  showCreatedAt: z.boolean().default(false),
});

export type Config = z.infer<typeof configSchema>;
export type Data = { items: AdapterOutput<typeof todosList> };
export type Actions = { toggle: WorkflowAction<typeof todosToggle> };
export type Props = BlockProps<Config, Data, Actions>;

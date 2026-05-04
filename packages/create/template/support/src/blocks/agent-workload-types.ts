import { z } from "zod";
import type { AdapterOutput, BlockProps } from "@composoft/spec";
import type { agentsList } from "../adapters/agents-list.js";

export const configSchema = z.object({
  activeOnly: z.boolean().default(true),
});

export type Config = z.infer<typeof configSchema>;
export type Data = { agents: AdapterOutput<typeof agentsList> };
export type Actions = Record<string, never>;
export type Props = BlockProps<Config, Data, Actions>;

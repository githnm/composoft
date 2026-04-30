import { z } from "zod";
import type { AdapterOutput, BlockProps } from "@composoft/spec";
import type { dealsList } from "../adapters/deals-list.js";
import type { repsList } from "../adapters/reps-list.js";

export const configSchema = z.object({
  excludeLost: z.boolean().default(true),
  title: z.string().default("Rep leaderboard"),
});

export type Config = z.infer<typeof configSchema>;
export type Data = {
  deals: AdapterOutput<typeof dealsList>;
  reps: AdapterOutput<typeof repsList>;
};
export type Actions = Record<string, never>;
export type Props = BlockProps<Config, Data, Actions>;

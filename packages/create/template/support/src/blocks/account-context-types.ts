import { z } from "zod";
import type { AdapterOutput, BlockProps } from "@composoft/spec";
import type { accountsById } from "../adapters/accounts-by-id.js";

export const configSchema = z.object({
  // Optional fallback. When the page has no selection.accountId yet,
  // adopters can pin a specific account here so the block always renders.
  defaultAccountId: z.string().optional(),
});

export type Config = z.infer<typeof configSchema>;
export type Data = { account: AdapterOutput<typeof accountsById> };
export type Actions = Record<string, never>;
export type Props = BlockProps<Config, Data, Actions>;

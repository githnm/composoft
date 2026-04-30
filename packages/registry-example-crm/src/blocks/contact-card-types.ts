import { z } from "zod";
import type { AdapterOutput, BlockProps } from "@composoft/spec";
import type { contactsList } from "../adapters/contacts-list.js";

export const configSchema = z.object({
  emptyMessage: z.string().default("Select a deal to see its contacts."),
});

export type Config = z.infer<typeof configSchema>;
// `contacts` is nullable because its `dealId` param reads from page state.
// The runtime auto-skips the slot when the page-state path resolves to null,
// which is the case on initial render before a deal is selected.
export type Data = { contacts: AdapterOutput<typeof contactsList> | null };
export type Actions = Record<string, never>;
export type Props = BlockProps<Config, Data, Actions>;

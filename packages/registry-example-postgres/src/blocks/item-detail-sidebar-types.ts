import { z } from "zod";
import type { AdapterOutput, BlockProps } from "@composoft/spec";
import type { inventoryItemById } from "../adapters/inventory-items-by-id.js";

const SECTION = z.enum(["warehouse", "vendor", "stockHistory"]);

export const configSchema = z.object({
  sections: z
    .array(SECTION)
    .min(1)
    .default(["warehouse", "vendor", "stockHistory"]),
  showSku: z.boolean().default(true),
});

export type Config = z.infer<typeof configSchema>;
/**
 * `item` is nullable because the data slot uses a `from-page-state` path. On
 * initial render with nothing selected, the runtime auto-skips the slot and
 * passes null. The component renders a placeholder for that case.
 */
export type Data = { item: AdapterOutput<typeof inventoryItemById> | null };
export type Actions = Record<string, never>;
export type Props = BlockProps<Config, Data, Actions>;
export type Section = z.infer<typeof SECTION>;

import { z } from "zod";
import type { AdapterOutput, BlockProps } from "@composoft/spec";
import type { vendorById } from "../adapters/vendors-by-id.js";

const SECTION = z.enum(["categoryBadge", "contactInfo", "paymentTerms", "openPos"]);

export const configSchema = z.object({
  sections: z
    .array(SECTION)
    .min(1)
    .default(["categoryBadge", "contactInfo", "paymentTerms", "openPos"]),
});

export type Config = z.infer<typeof configSchema>;
export type Data = { vendor: AdapterOutput<typeof vendorById> };
export type Actions = Record<string, never>;
export type Props = BlockProps<Config, Data, Actions>;
export type VendorCategory = Data["vendor"]["category"];

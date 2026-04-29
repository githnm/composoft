import { defineAdapter } from "@composoft/spec";
import { z } from "zod";
import { db } from "../db.js";

const categorySchema = z.enum(["beans", "packaging", "equipment"]);

export const vendorsList = defineAdapter({
  id: "vendors.list",
  version: "0.1.0",
  description: "List vendors, optionally filtered by category. Includes count of open POs.",
  params: z.object({
    category: categorySchema.optional(),
  }),
  output: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      contactEmail: z.string().nullable(),
      paymentTerms: z.string().nullable(),
      category: categorySchema,
      openPoCount: z.number().int(),
    }),
  ),
  run: async (params) => {
    const vendors = await db.vendors.list(params);
    const counts = await Promise.all(vendors.map((v) => db.vendors.openPoCount(v.id)));
    return vendors.map((v, i) => ({ ...v, openPoCount: counts[i] ?? 0 }));
  },
});

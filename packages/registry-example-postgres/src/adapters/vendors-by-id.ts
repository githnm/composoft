import { defineAdapter } from "@composoft/spec";
import { z } from "zod";
import { db } from "../db.js";

export const vendorById = defineAdapter({
  id: "vendors.by-id",
  version: "0.1.0",
  description: "Return a vendor record with its open-PO count.",
  params: z.object({
    vendorId: z.string(),
  }),
  output: z.object({
    id: z.string(),
    name: z.string(),
    contactEmail: z.string().nullable(),
    paymentTerms: z.string().nullable(),
    category: z.enum(["beans", "packaging", "equipment"]),
    openPoCount: z.number().int(),
  }),
  run: async ({ vendorId }) => {
    const v = await db.vendors.byId(vendorId);
    if (!v) {
      throw new Error(`vendor ${vendorId} not found`);
    }
    const openPoCount = await db.vendors.openPoCount(v.id);
    return { ...v, openPoCount };
  },
});

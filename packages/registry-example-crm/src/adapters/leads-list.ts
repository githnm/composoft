import { defineAdapter } from "@composoft/spec";
import { z } from "zod";
import { db } from "../db.js";

const LEAD_STATUS = z.enum([
  "new",
  "contacted",
  "qualified",
  "unqualified",
  "converted",
]);

export const leadsList = defineAdapter({
  id: "leads.list",
  version: "0.1.0",
  description:
    "List leads, optionally filtered by status. Supports limit/offset pagination.",
  params: z.object({
    status: LEAD_STATUS.optional(),
    limit: z.number().int().positive().max(200).optional(),
    offset: z.number().int().min(0).optional(),
  }),
  output: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      company: z.string(),
      email: z.string(),
      source: z.string(),
      status: LEAD_STATUS,
      createdAt: z.string(),
    }),
  ),
  run: async (params) => {
    return db.leads.list(params);
  },
});

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

export const leadsById = defineAdapter({
  id: "leads.by-id",
  version: "0.1.0",
  description: "Fetch a single lead by id, or null if it does not exist.",
  params: z.object({
    id: z.string(),
  }),
  output: z
    .object({
      id: z.string(),
      name: z.string(),
      company: z.string(),
      email: z.string(),
      source: z.string(),
      status: LEAD_STATUS,
      createdAt: z.string(),
    })
    .nullable(),
  run: async ({ id }) => {
    return db.leads.byId(id);
  },
});

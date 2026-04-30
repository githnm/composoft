import { defineAdapter } from "@composoft/spec";
import { z } from "zod";
import { db } from "../db.js";

const DEAL_STAGE = z.enum([
  "discovery",
  "qualified",
  "proposal",
  "negotiation",
  "closed-won",
  "closed-lost",
]);

export const dealsById = defineAdapter({
  id: "deals.by-id",
  version: "0.1.0",
  description: "Fetch a single deal by id, or null if it does not exist.",
  params: z.object({
    id: z.string(),
  }),
  output: z
    .object({
      id: z.string(),
      name: z.string(),
      leadId: z.string().nullable(),
      stage: DEAL_STAGE,
      value: z.number(),
      ownerId: z.string().nullable(),
      closeDate: z.string(),
      createdAt: z.string(),
    })
    .nullable(),
  run: async ({ id }) => {
    return db.deals.byId(id);
  },
});

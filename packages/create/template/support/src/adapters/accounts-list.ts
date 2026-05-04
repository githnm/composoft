import { defineAdapter } from "@composoft/spec";
import { z } from "zod";
import { db } from "../db.js";

const accountPlan = z.enum(["starter", "growth", "enterprise"]);

export const accountsList = defineAdapter({
  id: "accounts.list",
  version: "0.1.0",
  description: "Paginated list of customer accounts.",
  params: z.object({
    search: z.string().optional(),
    page: z.number().int().positive().default(1),
    pageSize: z.number().int().positive().max(200).default(50),
  }),
  output: z.object({
    rows: z.array(
      z.object({
        id: z.string(),
        name: z.string(),
        plan: accountPlan,
        arr: z.number(),
        healthScore: z.number(),
        accountManagerId: z.string(),
        createdAt: z.string(),
      }),
    ),
    total: z.number().int(),
    page: z.number().int(),
    pageSize: z.number().int(),
  }),
  run: async (params) => db.accounts.list(params),
});

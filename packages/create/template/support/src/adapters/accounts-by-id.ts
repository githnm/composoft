import { defineAdapter } from "@composoft/spec";
import { z } from "zod";
import { db } from "../db.js";

const accountPlan = z.enum(["starter", "growth", "enterprise"]);

export const accountsById = defineAdapter({
  id: "accounts.by-id",
  version: "0.1.0",
  description: "Single account by id. Used by the account-context block.",
  params: z.object({ accountId: z.string() }),
  output: z
    .object({
      id: z.string(),
      name: z.string(),
      plan: accountPlan,
      arr: z.number(),
      healthScore: z.number(),
      accountManagerId: z.string(),
      createdAt: z.string(),
    })
    .nullable(),
  run: async ({ accountId }) => db.accounts.byId(accountId),
});

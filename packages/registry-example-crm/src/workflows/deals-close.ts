import { defineWorkflow } from "@composoft/spec";
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

export const dealsClose = defineWorkflow({
  id: "deals.close",
  version: "0.1.0",
  description: "Close a deal as won or lost. Sets stage to closed-won or closed-lost.",
  input: z.object({
    dealId: z.string(),
    won: z.boolean(),
  }),
  output: z.object({
    dealId: z.string(),
    stage: DEAL_STAGE,
  }),
  sideEffects: ["writes to db"],
  run: async ({ dealId, won }) => {
    const stage = won ? "closed-won" : "closed-lost";
    const updated = db.deals.setStage(dealId, stage);
    return { dealId: updated.id, stage: updated.stage };
  },
});

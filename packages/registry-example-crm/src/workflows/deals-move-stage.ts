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

export const dealsMoveStage = defineWorkflow({
  id: "deals.move-stage",
  version: "0.1.0",
  description: "Move a deal to a new pipeline stage.",
  input: z.object({
    dealId: z.string(),
    stage: DEAL_STAGE,
  }),
  output: z.object({
    dealId: z.string(),
    stage: DEAL_STAGE,
  }),
  sideEffects: ["writes to db"],
  run: async ({ dealId, stage }) => {
    const updated = db.deals.setStage(dealId, stage);
    return { dealId: updated.id, stage: updated.stage };
  },
});

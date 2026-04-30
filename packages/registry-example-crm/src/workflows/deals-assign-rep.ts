import { defineWorkflow } from "@composoft/spec";
import { z } from "zod";
import { db } from "../db.js";

export const dealsAssignRep = defineWorkflow({
  id: "deals.assign-rep",
  version: "0.1.0",
  description: "Assign a sales rep as the owner of a deal.",
  input: z.object({
    dealId: z.string(),
    repId: z.string(),
  }),
  output: z.object({
    dealId: z.string(),
    repId: z.string(),
  }),
  sideEffects: ["writes to db"],
  run: async ({ dealId, repId }) => {
    const rep = db.reps.byId(repId);
    if (!rep) throw new Error(`rep ${repId} not found`);
    const updated = db.deals.setOwner(dealId, repId);
    return { dealId: updated.id, repId };
  },
});

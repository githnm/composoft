import { defineWorkflow } from "@composoft/spec";
import { z } from "zod";
import { db } from "../db.js";

export const leadsConvert = defineWorkflow({
  id: "leads.convert",
  version: "0.1.0",
  description:
    "Convert a qualified lead into a new deal in the discovery stage. Marks the lead as converted.",
  input: z.object({
    leadId: z.string(),
    dealName: z.string().optional(),
    value: z.number().nonnegative().optional(),
    ownerId: z.string().optional(),
    closeDate: z.string().optional(),
  }),
  output: z.object({
    dealId: z.string(),
  }),
  sideEffects: ["writes to db"],
  run: async ({ leadId, dealName, value, ownerId, closeDate }) => {
    const lead = db.leads.byId(leadId);
    if (!lead) throw new Error(`lead ${leadId} not found`);

    const deal = db.deals.create({
      name: dealName ?? `${lead.company} — new opportunity`,
      leadId: lead.id,
      stage: "discovery",
      value: value ?? 0,
      ownerId: ownerId ?? null,
      closeDate: closeDate ?? new Date(Date.now() + 1000 * 60 * 60 * 24 * 60).toISOString().slice(0, 10),
    });

    db.leads.setStatus(lead.id, "converted");

    return { dealId: deal.id };
  },
});

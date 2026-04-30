import { defineWorkflow } from "@composoft/spec";
import { z } from "zod";
import { db } from "../db.js";

const ACTIVITY_TYPE = z.enum(["call", "email", "meeting", "note", "task"]);

export const activitiesLog = defineWorkflow({
  id: "activities.log",
  version: "0.1.0",
  description: "Log a new activity (call, email, meeting, note, task) on a deal.",
  input: z.object({
    type: ACTIVITY_TYPE,
    dealId: z.string(),
    contactId: z.string().optional(),
    summary: z.string().min(1),
  }),
  output: z.object({
    activityId: z.string(),
    at: z.string(),
  }),
  sideEffects: ["writes to db"],
  run: async ({ type, dealId, contactId, summary }) => {
    const activity = db.activities.create({
      type,
      dealId,
      contactId: contactId ?? null,
      summary,
    });
    return { activityId: activity.id, at: activity.at };
  },
});

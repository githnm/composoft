import { defineAdapter } from "@composoft/spec";
import { z } from "zod";
import { db } from "../db.js";

const ACTIVITY_TYPE = z.enum(["call", "email", "meeting", "note", "task"]);

export const activitiesList = defineAdapter({
  id: "activities.list",
  version: "0.1.0",
  description:
    "List activities, optionally filtered by deal id, sorted newest-first by `at`.",
  params: z.object({
    dealId: z.string().optional(),
  }),
  output: z.array(
    z.object({
      id: z.string(),
      type: ACTIVITY_TYPE,
      dealId: z.string().nullable(),
      contactId: z.string().nullable(),
      summary: z.string(),
      at: z.string(),
    }),
  ),
  run: async (params) => {
    return db.activities.list(params);
  },
});

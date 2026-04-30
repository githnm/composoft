import { defineAdapter } from "@composoft/spec";
import { z } from "zod";
import { db } from "../db.js";

export const contactsList = defineAdapter({
  id: "contacts.list",
  version: "0.1.0",
  description: "List contacts, optionally filtered by deal id.",
  params: z.object({
    dealId: z.string().optional(),
  }),
  output: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      email: z.string(),
      company: z.string(),
      dealId: z.string().nullable(),
      role: z.string(),
      createdAt: z.string(),
    }),
  ),
  run: async (params) => {
    return db.contacts.list(params);
  },
});

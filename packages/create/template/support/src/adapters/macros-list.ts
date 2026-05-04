import { defineAdapter } from "@composoft/spec";
import { z } from "zod";
import { db } from "../db.js";

export const macrosList = defineAdapter({
  id: "macros.list",
  version: "0.1.0",
  description: "Canned responses, optionally filtered by category.",
  params: z.object({
    category: z.string().optional(),
  }),
  output: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      body: z.string(),
      category: z.string(),
    }),
  ),
  run: async (params) => db.macros.list(params),
});

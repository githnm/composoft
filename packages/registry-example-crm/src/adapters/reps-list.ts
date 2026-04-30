import { defineAdapter } from "@composoft/spec";
import { z } from "zod";
import { db } from "../db.js";

export const repsList = defineAdapter({
  id: "reps.list",
  version: "0.1.0",
  description: "List all sales reps.",
  params: z.object({}),
  output: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      email: z.string(),
    }),
  ),
  run: async () => {
    return db.reps.list();
  },
});

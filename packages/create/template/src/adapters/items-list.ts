import { defineAdapter } from "@composoft/spec";
import { z } from "zod";
import { db } from "../db.js";

export const todosList = defineAdapter({
  id: "todos.list",
  version: "0.1.0",
  description: "List todos. Optional `completed` filter scopes to done or open items.",
  params: z.object({
    completed: z.boolean().optional(),
  }),
  output: z.array(
    z.object({
      id: z.string(),
      text: z.string(),
      completed: z.boolean(),
      createdAt: z.string(),
    }),
  ),
  run: async (params) => {
    return db.todos.list(params);
  },
});

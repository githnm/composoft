import { defineWorkflow } from "@composoft/spec";
import { z } from "zod";
import { db } from "../db.js";

export const todosToggle = defineWorkflow({
  id: "todos.toggle",
  version: "0.1.0",
  description: "Flip a todo's completed flag.",
  input: z.object({
    todoId: z.string(),
  }),
  output: z.object({
    todoId: z.string(),
    completed: z.boolean(),
  }),
  sideEffects: ["writes to db"],
  run: async ({ todoId }) => {
    const updated = db.todos.toggle(todoId);
    return {
      todoId: updated.id,
      completed: updated.completed,
    };
  },
});

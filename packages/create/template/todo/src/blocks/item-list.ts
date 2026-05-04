import { defineBlock } from "@composoft/spec";
import { configSchema } from "./item-list-types.js";
import { TodoListView } from "./item-list.component.js";

export const todoListBlock = defineBlock({
  id: "todos.item-list",
  version: "0.1.0",
  description: "Filterable list of todos with one-click toggle on each item.",
  config: configSchema,
  data: {
    items: {
      adapter: "todos.list",
      params: {},
    },
  },
  actions: {
    toggle: { workflow: "todos.toggle" },
  },
  component: TodoListView,
});

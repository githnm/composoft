// In-memory data layer. Replace before deploying — see the README.
//
// The shape (`db.todos.list`, `db.todos.byId`, `db.todos.toggle`) is what
// adapters and workflows depend on. Keep it stable when you swap out the
// backend, and adapter/workflow code won't need to change.

export type Todo = {
  id: string;
  text: string;
  completed: boolean;
  createdAt: string;
};

const todos: Todo[] = [
  { id: "td_001", text: "Wire src/db.ts to a real database",                 completed: true,  createdAt: "2026-01-15T09:00:00Z" },
  { id: "td_002", text: "Replace the placeholder authenticate hook",          completed: false, createdAt: "2026-01-16T09:00:00Z" },
  { id: "td_003", text: "Add a workflow that creates new items",              completed: false, createdAt: "2026-01-18T09:00:00Z" },
  { id: "td_004", text: "Define a contextSchema for your routes",             completed: true,  createdAt: "2026-02-01T09:00:00Z" },
  { id: "td_005", text: "Run the composer against this registry",             completed: false, createdAt: "2026-02-05T09:00:00Z" },
  { id: "td_006", text: "Add reference data so the model uses real ids",      completed: true,  createdAt: "2026-02-10T09:00:00Z" },
  { id: "td_007", text: "Write a brief; let composoft generate the app",      completed: false, createdAt: "2026-02-14T09:00:00Z" },
];

export const db = {
  todos: {
    list(filter: { completed?: boolean } = {}): Todo[] {
      return todos.filter(
        (t) => filter.completed === undefined || t.completed === filter.completed,
      );
    },
    byId(id: string): Todo | null {
      return todos.find((t) => t.id === id) ?? null;
    },
    toggle(id: string): Todo {
      const t = todos.find((todo) => todo.id === id);
      if (!t) throw new Error(`todo ${id} not found`);
      t.completed = !t.completed;
      return t;
    },
  },
};

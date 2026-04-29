"use client";

import { useMemo, useState } from "react";
import type { Props } from "./item-list-types.js";

export function TodoListView({ data, actions, config }: Props) {
  const [filter, setFilter] = useState<"all" | "open" | "done">(config.defaultFilter);

  const visible = useMemo(() => {
    if (filter === "all") return data.items;
    if (filter === "open") return data.items.filter((t) => !t.completed);
    return data.items.filter((t) => t.completed);
  }, [data.items, filter]);

  return (
    <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <header className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Todos</h2>
          <p className="text-xs text-slate-500">
            {visible.length} of {data.items.length} shown
          </p>
        </div>
        <div className="flex gap-1 text-xs">
          {(["all", "open", "done"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded px-2 py-1 ${
                filter === f
                  ? "bg-slate-900 text-white"
                  : "border border-slate-300 text-slate-700 hover:bg-slate-100"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </header>
      {visible.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-slate-500">Nothing here.</p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {visible.map((t) => (
            <li key={t.id} className="flex items-start gap-3 px-4 py-3 hover:bg-slate-50">
              <input
                type="checkbox"
                checked={t.completed}
                className="mt-1 h-4 w-4 cursor-pointer accent-slate-900"
                onChange={async () => {
                  await actions.toggle({ todoId: t.id });
                }}
              />
              <div className="flex-1">
                <p className={`text-sm ${t.completed ? "text-slate-400 line-through" : "text-slate-900"}`}>
                  {t.text}
                </p>
                {config.showCreatedAt && (
                  <time className="text-xs text-slate-400" dateTime={t.createdAt}>
                    {new Date(t.createdAt).toLocaleDateString()}
                  </time>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

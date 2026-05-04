"use client";

import type { Props } from "./event-type-grid-types.js";

const colorRing: Record<string, string> = {
  emerald: "ring-emerald-200",
  blue: "ring-blue-200",
  purple: "ring-purple-200",
  amber: "ring-amber-200",
  rose: "ring-rose-200",
  indigo: "ring-indigo-200",
};

const colorBar: Record<string, string> = {
  emerald: "bg-emerald-500",
  blue: "bg-blue-500",
  purple: "bg-purple-500",
  amber: "bg-amber-500",
  rose: "bg-rose-500",
  indigo: "bg-indigo-500",
};

export function EventTypeGrid({ data, config, writes }: Props) {
  const visible = data.eventTypes.filter((e) => e.enabled);
  const isList = config.layout === "list";

  return (
    <section className="rounded-lg border bg-card p-4">
      <header className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-semibold">Event types</h2>
        <span className="text-xs text-muted-foreground">
          {visible.length} active
        </span>
      </header>
      {visible.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">
          No event types available.
        </p>
      ) : (
        <div
          className={
            isList
              ? "flex flex-col gap-2"
              : "grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3"
          }
        >
          {visible.map((et) => (
            <button
              key={et.id}
              onClick={() => writes.selectedEventType(et.id)}
              className={`group relative flex flex-col gap-2 overflow-hidden rounded-lg border bg-background p-4 text-left ring-1 ring-transparent transition hover:bg-muted hover:${colorRing[et.color] ?? "ring-slate-200"}`}
            >
              <span
                className={`absolute inset-y-0 left-0 w-1 ${colorBar[et.color] ?? "bg-slate-400"}`}
                aria-hidden
              />
              <div className="flex items-center justify-between pl-2">
                <h3 className="text-sm font-semibold">{et.name}</h3>
                <span className="text-xs text-muted-foreground">
                  {et.durationMinutes} min
                </span>
              </div>
              <p className="line-clamp-2 pl-2 text-xs text-muted-foreground">
                {et.description}
              </p>
              <div className="flex items-center justify-between pl-2 pt-1 text-xs">
                <span className="text-muted-foreground">
                  {et.requiresPayment ? `$${et.price}` : "Free"}
                </span>
                <span className="font-medium text-primary opacity-0 transition group-hover:opacity-100">
                  Book →
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

"use client";

import { useMemo, useState } from "react";
import type { Props } from "./calendar-view-types.js";

type View = "month" | "week" | "day";
type Status = "all" | "confirmed" | "cancelled" | "completed";

const statusBadge: Record<string, string> = {
  confirmed: "bg-emerald-100 text-emerald-800",
  cancelled: "bg-rose-100 text-rose-800",
  completed: "bg-slate-100 text-slate-700",
};

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function rangeForView(view: View, anchor: Date): { from: Date; to: Date; days: Date[] } {
  if (view === "day") {
    const from = startOfDay(anchor);
    return { from, to: addDays(from, 1), days: [from] };
  }
  if (view === "week") {
    const from = startOfDay(addDays(anchor, -anchor.getDay()));
    const days = Array.from({ length: 7 }, (_, i) => addDays(from, i));
    return { from, to: addDays(from, 7), days };
  }
  const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const from = startOfDay(addDays(first, -first.getDay()));
  const days = Array.from({ length: 42 }, (_, i) => addDays(from, i));
  return { from, to: addDays(from, 42), days };
}

export function CalendarView({ data, config, writes }: Props) {
  const [view, setView] = useState<View>(config.defaultView);
  const [status, setStatus] = useState<Status>(config.defaultStatus);
  const [anchor, setAnchor] = useState<Date>(new Date());

  const { days, from, to } = useMemo(() => rangeForView(view, anchor), [view, anchor]);

  const visible = useMemo(() => {
    return data.bookings.filter((b) => {
      if (status !== "all" && b.status !== status) return false;
      const start = new Date(b.startTime);
      return start >= from && start < to;
    });
  }, [data.bookings, status, from, to]);

  const byDay = useMemo(() => {
    const m = new Map<string, typeof visible>();
    for (const b of visible) {
      const key = startOfDay(new Date(b.startTime)).toISOString();
      const arr = m.get(key) ?? [];
      arr.push(b);
      m.set(key, arr);
    }
    return m;
  }, [visible]);

  return (
    <section className="rounded-lg border bg-card">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <button
            className="rounded border px-2 py-1 text-xs hover:bg-muted"
            onClick={() => setAnchor(addDays(anchor, view === "day" ? -1 : view === "week" ? -7 : -30))}
          >
            ←
          </button>
          <h2 className="text-sm font-semibold">
            {anchor.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
          </h2>
          <button
            className="rounded border px-2 py-1 text-xs hover:bg-muted"
            onClick={() => setAnchor(addDays(anchor, view === "day" ? 1 : view === "week" ? 7 : 30))}
          >
            →
          </button>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <select
            className="rounded border bg-background px-2 py-1"
            value={status}
            onChange={(e) => setStatus(e.target.value as Status)}
          >
            <option value="all">All statuses</option>
            <option value="confirmed">Confirmed</option>
            <option value="cancelled">Cancelled</option>
            <option value="completed">Completed</option>
          </select>
          <div className="flex overflow-hidden rounded border">
            {(["day", "week", "month"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-2 py-1 ${view === v ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
              >
                {v}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div
        className={
          view === "day"
            ? "p-4"
            : view === "week"
              ? "grid grid-cols-7 gap-px bg-border"
              : "grid grid-cols-7 gap-px bg-border"
        }
      >
        {days.map((d) => {
          const list = byDay.get(d.toISOString()) ?? [];
          const isToday = startOfDay(new Date()).getTime() === d.getTime();
          return (
            <div
              key={d.toISOString()}
              className={`min-h-[80px] bg-background p-2 ${isToday ? "ring-1 ring-primary/40" : ""}`}
            >
              <div className="mb-1 flex items-center justify-between">
                <span className="text-xs font-medium">
                  {d.toLocaleDateString(undefined, view === "day" ? { weekday: "long", month: "short", day: "numeric" } : { weekday: "short", day: "numeric" })}
                </span>
                {list.length > 0 && (
                  <span className="text-[10px] text-muted-foreground">{list.length}</span>
                )}
              </div>
              <ul className="flex flex-col gap-1">
                {list.map((b) => (
                  <li key={b.id}>
                    <button
                      onClick={() => writes.selectedBooking(b.id)}
                      className={`w-full truncate rounded px-2 py-1 text-left text-xs hover:bg-muted ${statusBadge[b.status] ?? ""}`}
                      title={b.attendeeName}
                    >
                      {new Date(b.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} {b.attendeeName}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </section>
  );
}

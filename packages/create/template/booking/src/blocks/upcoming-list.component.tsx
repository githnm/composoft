"use client";

import { useMemo, useState } from "react";
import type { Props } from "./upcoming-list-types.js";

function formatWhen(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function UpcomingList({ data, actions, config }: Props) {
  const [busyId, setBusyId] = useState<string | null>(null);

  const eventTypeById = useMemo(() => {
    const m = new Map<string, (typeof data.eventTypes)[number]>();
    for (const e of data.eventTypes) m.set(e.id, e);
    return m;
  }, [data.eventTypes]);

  return (
    <section className="rounded-lg border bg-card">
      <header className="border-b px-4 py-3">
        <h2 className="text-sm font-semibold">Upcoming bookings</h2>
        <p className="text-xs text-muted-foreground">
          Next 7 days · {data.bookings.length} confirmed
        </p>
      </header>
      {data.bookings.length === 0 ? (
        <p className="px-4 py-12 text-center text-sm text-muted-foreground">
          Nothing on the calendar this week.
        </p>
      ) : (
        <ul className="divide-y">
          {data.bookings.map((b) => {
            const et = eventTypeById.get(b.eventTypeId);
            return (
              <li key={b.id} className="flex items-start justify-between gap-4 px-4 py-3 hover:bg-muted">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{b.attendeeName}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {et?.name ?? b.eventTypeId} · {formatWhen(b.startTime)}
                  </p>
                  {config.showNotes && b.notes && (
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{b.notes}</p>
                  )}
                </div>
                <button
                  disabled={busyId === b.id}
                  onClick={async () => {
                    setBusyId(b.id);
                    try {
                      await actions.cancel({ bookingId: b.id });
                    } finally {
                      setBusyId(null);
                    }
                  }}
                  className="rounded border px-2 py-1 text-xs hover:bg-background disabled:opacity-50"
                >
                  {busyId === b.id ? "Cancelling…" : "Cancel"}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

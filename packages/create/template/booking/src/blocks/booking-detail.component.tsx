"use client";

import { useMemo, useState } from "react";
import type { Props } from "./booking-detail-types.js";

const statusBadge: Record<string, string> = {
  confirmed: "bg-emerald-100 text-emerald-800",
  cancelled: "bg-rose-100 text-rose-800",
  completed: "bg-slate-100 text-slate-700",
};

function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function BookingDetail({ data, actions, config }: Props) {
  const [reason, setReason] = useState("");
  const [newStart, setNewStart] = useState("");
  const [busy, setBusy] = useState<"cancel" | "reschedule" | null>(null);

  const eventType = useMemo(() => {
    if (!data.booking) return null;
    return data.eventTypes.find((e) => e.id === data.booking!.eventTypeId) ?? null;
  }, [data.booking, data.eventTypes]);

  if (!data.booking) {
    return (
      <section className="rounded-lg border bg-card p-8 text-center">
        <p className="text-sm text-muted-foreground">
          Pick a booking from the calendar to see its details.
        </p>
      </section>
    );
  }

  const b = data.booking;
  const isPast = b.status !== "confirmed";

  return (
    <section className="rounded-lg border bg-card">
      <header className="flex items-start justify-between gap-4 border-b px-4 py-3">
        <div>
          <h2 className="text-base font-semibold">{eventType?.name ?? b.eventTypeId}</h2>
          <p className="text-xs text-muted-foreground">{formatWhen(b.startTime)}</p>
        </div>
        <span className={`rounded-full px-2 py-1 text-xs font-medium ${statusBadge[b.status]}`}>
          {b.status}
        </span>
      </header>

      <dl className="divide-y text-sm">
        <div className="flex items-center justify-between px-4 py-2">
          <dt className="text-xs text-muted-foreground">Attendee</dt>
          <dd className="font-medium">{b.attendeeName}</dd>
        </div>
        {config.showAttendeeContact && (
          <div className="flex items-center justify-between px-4 py-2">
            <dt className="text-xs text-muted-foreground">Email</dt>
            <dd className="font-mono text-xs">{b.attendeeEmail}</dd>
          </div>
        )}
        <div className="flex items-center justify-between px-4 py-2">
          <dt className="text-xs text-muted-foreground">Duration</dt>
          <dd>
            {eventType?.durationMinutes ?? "—"} min
          </dd>
        </div>
        {b.notes && (
          <div className="px-4 py-2">
            <dt className="text-xs text-muted-foreground">Notes</dt>
            <dd className="mt-1 whitespace-pre-wrap text-sm">{b.notes}</dd>
          </div>
        )}
        {b.cancelReason && (
          <div className="px-4 py-2">
            <dt className="text-xs text-muted-foreground">Cancellation reason</dt>
            <dd className="mt-1 text-sm text-rose-700">{b.cancelReason}</dd>
          </div>
        )}
      </dl>

      {!isPast && (
        <div className="flex flex-col gap-3 border-t px-4 py-3">
          <div className="flex items-center gap-2">
            <input
              type="datetime-local"
              value={newStart}
              onChange={(e) => setNewStart(e.target.value)}
              className="flex-1 rounded border bg-background px-2 py-1 text-sm"
            />
            <button
              disabled={!newStart || busy !== null}
              onClick={async () => {
                setBusy("reschedule");
                try {
                  await actions.reschedule({ newStartTime: new Date(newStart).toISOString() });
                  setNewStart("");
                } finally {
                  setBusy(null);
                }
              }}
              className="rounded border px-3 py-1 text-sm hover:bg-muted disabled:opacity-50"
            >
              {busy === "reschedule" ? "Rescheduling…" : "Reschedule"}
            </button>
          </div>
          <div className="flex items-center gap-2">
            <input
              placeholder="Cancellation reason (optional)"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="flex-1 rounded border bg-background px-2 py-1 text-sm"
            />
            <button
              disabled={busy !== null}
              onClick={async () => {
                setBusy("cancel");
                try {
                  await actions.cancel({ reason: reason || undefined });
                  setReason("");
                } finally {
                  setBusy(null);
                }
              }}
              className="rounded border border-rose-200 bg-rose-50 px-3 py-1 text-sm text-rose-800 hover:bg-rose-100 disabled:opacity-50"
            >
              {busy === "cancel" ? "Cancelling…" : "Cancel booking"}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

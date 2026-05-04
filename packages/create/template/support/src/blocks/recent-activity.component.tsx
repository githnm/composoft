"use client";

import type { Props } from "./recent-activity-types.js";

const CHANNEL_DOT: Record<string, string> = {
  email: "bg-slate-400",
  slack: "bg-violet-500",
  web:   "bg-blue-500",
};

const STATUS_TONE: Record<string, string> = {
  new:      "text-blue-700 dark:text-blue-400",
  open:     "text-amber-700 dark:text-amber-400",
  pending:  "text-muted-foreground",
  resolved: "text-emerald-700 dark:text-emerald-400",
  closed:   "text-muted-foreground",
};

function formatRelative(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.round(ms / 60_000);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

export function RecentActivityView({ data }: Props) {
  const rows = [...data.recent.rows].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
  return (
    <section>
      <header className="mb-4">
        <h2 className="text-base font-semibold text-foreground">Activity</h2>
        <p className="text-xs text-muted-foreground">Latest ticket updates</p>
      </header>
      {rows.length === 0 ? (
        <p className="py-6 text-center text-xs text-muted-foreground">No recent activity.</p>
      ) : (
        <ol className="relative space-y-3 pl-6">
          {/* The vertical timeline rail. Sits flush behind every dot, with
              a small gap before the first dot and after the last to soften
              the start/end. */}
          <span
            className="absolute left-2 top-1.5 h-[calc(100%-0.75rem)] w-px bg-border"
            aria-hidden
          />
          {rows.map((t) => {
            const channelDot = CHANNEL_DOT[t.channel] ?? "bg-slate-400";
            const statusTone = STATUS_TONE[t.status] ?? "text-muted-foreground";
            return (
              <li key={t.id} className="relative">
                {/* Outer ring + inner colored dot, anchored to the timeline. */}
                <span
                  className="absolute -left-[1.375rem] top-1.5 flex h-3 w-3 items-center justify-center rounded-full bg-card ring-2 ring-border"
                  aria-hidden
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${channelDot}`} />
                </span>
                <p className="text-sm font-medium leading-snug text-foreground">{t.subject}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  <span className={statusTone}>{t.status}</span>
                  <span> · {t.accountName}</span>
                  <span> · {formatRelative(t.updatedAt)}</span>
                </p>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}

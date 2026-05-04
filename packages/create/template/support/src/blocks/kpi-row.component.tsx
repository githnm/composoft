"use client";

import type { Props } from "./kpi-row-types.js";

type KpiCard = {
  label: string;
  value: string;
  hint: string;
  /** When true, draws a 2px red accent bar at the top of the card. */
  alarm?: boolean;
};

export function KpiRowView({ data }: Props) {
  const m = data.metrics;
  const cards: KpiCard[] = [
    {
      label: "Open",
      value: m.openCount.toString(),
      hint: "tickets in new + open",
    },
    {
      label: "New today",
      value: m.newToday.toString(),
      hint: "in the last 24 hours",
    },
    {
      label: "SLA at risk",
      value: m.slaAtRisk.toString(),
      hint: "due in <4h, unresolved",
      alarm: m.slaAtRisk > 0,
    },
    {
      label: "Avg resolution",
      value: `${m.avgResolutionHours.toFixed(1)}h`,
      hint: "across resolved tickets",
    },
  ];
  return (
    <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {cards.map((c) => (
        <div
          key={c.label}
          className="relative overflow-hidden rounded-lg border border-border bg-card px-4 py-3"
        >
          {/* Top accent bar. Only present when the KPI is in alarm
              state — keeps the card chrome consistent across the grid
              while still giving the alarm KPI extra visual weight. */}
          {c.alarm ? (
            <div className="absolute inset-x-0 top-0 h-0.5 bg-red-500" aria-hidden />
          ) : null}
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            {c.label}
          </p>
          <p
            className={
              "mt-1 text-3xl font-semibold tabular-nums leading-tight " +
              (c.alarm ? "text-red-600 dark:text-red-400" : "text-foreground")
            }
          >
            {c.value}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">{c.hint}</p>
        </div>
      ))}
    </section>
  );
}

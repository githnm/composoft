"use client";

import { useMemo } from "react";
import type { Props } from "./metrics-cards-types.js";

function thisMonthRange(now = new Date()): { from: Date; to: Date } {
  const from = new Date(now.getFullYear(), now.getMonth(), 1);
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return { from, to };
}

export function MetricsCards({ data }: Props) {
  const metrics = useMemo(() => {
    const { from, to } = thisMonthRange();
    const monthBookings = data.bookings.filter((b) => {
      const t = new Date(b.startTime);
      return t >= from && t < to;
    });

    const total = monthBookings.length;
    const completed = monthBookings.filter((b) => b.status === "completed").length;
    const cancelled = monthBookings.filter((b) => b.status === "cancelled").length;
    const noShows = monthBookings.filter(
      (b) => b.status === "cancelled" && (b.cancelReason ?? "").toLowerCase().includes("no-show"),
    ).length;

    const decided = completed + cancelled;
    const conversion = decided === 0 ? 0 : Math.round((completed / decided) * 100);
    const noShowRate = total === 0 ? 0 : Math.round((noShows / total) * 100);

    const leadTimes = data.bookings
      .filter((b) => b.status !== "cancelled")
      .map((b) => new Date(b.startTime).getTime() - new Date(b.createdAt).getTime())
      .filter((ms) => ms > 0);
    const avgLeadDays =
      leadTimes.length === 0
        ? 0
        : Math.round(
            leadTimes.reduce((a, b) => a + b, 0) / leadTimes.length / (1000 * 60 * 60 * 24),
          );

    return { total, conversion, noShowRate, avgLeadDays };
  }, [data.bookings]);

  const cards = [
    { label: "Bookings this month", value: String(metrics.total) },
    { label: "Conversion rate", value: `${metrics.conversion}%` },
    { label: "No-show rate", value: `${metrics.noShowRate}%` },
    { label: "Avg lead time", value: `${metrics.avgLeadDays}d` },
  ];

  return (
    <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((c) => (
        <div key={c.label} className="rounded-lg border bg-card p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{c.label}</p>
          <p className="mt-2 text-2xl font-semibold">{c.value}</p>
        </div>
      ))}
    </section>
  );
}

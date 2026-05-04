"use client";

import type { Props } from "./inv-kpi-row-types.js";

export function InventoryKpiRow({ data }: Props) {
  const cards: Array<{ label: string; value: string; tone?: string }> = [
    { label: "SKUs",            value: data.summary.totalSkus.toLocaleString() },
    { label: "Units on hand",   value: data.summary.totalUnits.toLocaleString() },
    {
      label: "Low stock",
      value: data.summary.lowStockCount.toLocaleString(),
      tone: data.summary.lowStockCount > 0 ? "text-amber-700" : undefined,
    },
    {
      label: "Out of stock",
      value: data.summary.outOfStockCount.toLocaleString(),
      tone: data.summary.outOfStockCount > 0 ? "text-rose-700" : undefined,
    },
  ];

  return (
    <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      {cards.map((c) => (
        <div key={c.label}>
          <p className="text-xs uppercase tracking-wide text-slate-500">{c.label}</p>
          <p className={`mt-1 text-2xl font-semibold ${c.tone ?? "text-slate-900"}`}>{c.value}</p>
        </div>
      ))}
    </section>
  );
}

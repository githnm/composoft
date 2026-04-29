"use client";

import type { CardId, Data, Props } from "./kpi-cards-types.js";

const CARD_LABEL: Record<CardId, string> = {
  totalSkus: "Total SKUs",
  lowStockCount: "Below reorder",
  openPoCount: "Open POs",
  openSpend: "Open spend",
};

const CARD_TONE: Record<CardId, string> = {
  totalSkus: "bg-white border-slate-200",
  lowStockCount: "bg-red-50 border-red-200",
  openPoCount: "bg-sky-50 border-sky-200",
  openSpend: "bg-emerald-50 border-emerald-200",
};

function format(card: CardId, kpis: Data["kpis"]): string {
  switch (card) {
    case "totalSkus":
      return kpis.totalSkus.toLocaleString();
    case "lowStockCount":
      return kpis.lowStockCount.toLocaleString();
    case "openPoCount":
      return kpis.openPoCount.toLocaleString();
    case "openSpend":
      return `$${Math.round(kpis.openSpend).toLocaleString()}`;
  }
}

export function OpsKpiCards({ data, config }: Props) {
  return (
    <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {config.cards.map((card) => (
        <div
          key={card}
          className={`rounded-lg border p-4 shadow-sm ${CARD_TONE[card]}`}
        >
          <p className="text-xs uppercase tracking-wide text-slate-500">
            {CARD_LABEL[card]}
          </p>
          <p className="mt-2 text-2xl font-semibold text-slate-900 tabular-nums">
            {format(card, data.kpis)}
          </p>
        </div>
      ))}
    </section>
  );
}

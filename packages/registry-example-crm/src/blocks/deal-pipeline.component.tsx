"use client";

import { useMemo, useState } from "react";
import type { Props } from "./deal-pipeline-types.js";

const STAGE_LABEL: Record<string, string> = {
  "discovery": "Discovery",
  "qualified": "Qualified",
  "proposal": "Proposal",
  "negotiation": "Negotiation",
  "closed-won": "Closed Won",
  "closed-lost": "Closed Lost",
};

function fmtCurrency(n: number): string {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

export function DealPipelineView({ data, actions, config, writes }: Props) {
  const [dragging, setDragging] = useState<string | null>(null);

  const byStage = useMemo(() => {
    const map = new Map<string, typeof data.deals>();
    for (const stage of config.stages) map.set(stage, []);
    for (const d of data.deals) {
      const bucket = map.get(d.stage);
      if (bucket) bucket.push(d);
    }
    return map;
  }, [data.deals, config.stages]);

  return (
    <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <header className="border-b border-slate-200 bg-slate-50 px-4 py-3">
        <h2 className="text-sm font-semibold text-slate-900">{config.title}</h2>
        <p className="text-xs text-slate-500">{data.deals.length} deals across {config.stages.length} stages</p>
      </header>
      <div className="grid grid-cols-1 gap-3 p-3 md:grid-cols-2 lg:grid-cols-4">
        {config.stages.map((stage) => {
          const items = byStage.get(stage) ?? [];
          const total = items.reduce((sum, d) => sum + d.value, 0);
          return (
            <div
              key={stage}
              className="flex flex-col rounded-md border border-slate-200 bg-slate-50/40"
              onDragOver={(e) => e.preventDefault()}
              onDrop={async (e) => {
                e.preventDefault();
                const dealId = e.dataTransfer.getData("text/plain");
                setDragging(null);
                if (!dealId) return;
                await actions.moveStage({ dealId, stage });
              }}
            >
              <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-700">
                  {STAGE_LABEL[stage] ?? stage}
                </span>
                <span className="text-xs text-slate-500">{items.length} · {fmtCurrency(total)}</span>
              </div>
              <ul className="flex flex-1 flex-col gap-2 p-2">
                {items.length === 0 ? (
                  <li className="rounded border border-dashed border-slate-200 px-3 py-4 text-center text-xs text-slate-400">
                    No deals
                  </li>
                ) : (
                  items.map((d) => (
                    <li
                      key={d.id}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData("text/plain", d.id);
                        setDragging(d.id);
                      }}
                      onDragEnd={() => setDragging(null)}
                      onClick={() => writes.selectedDealId(d.id)}
                      className={`cursor-pointer rounded border bg-white px-3 py-2 shadow-sm transition hover:shadow ${
                        dragging === d.id ? "border-slate-900 opacity-50" : "border-slate-200"
                      }`}
                    >
                      <p className="text-sm font-medium text-slate-900">{d.name}</p>
                      <p className="text-xs text-slate-500">
                        {fmtCurrency(d.value)} · close {new Date(d.closeDate).toLocaleDateString()}
                      </p>
                    </li>
                  ))
                )}
              </ul>
            </div>
          );
        })}
      </div>
    </section>
  );
}

"use client";

import { useMemo, useState } from "react";
import type { Data, Props } from "./low-stock-alerts-types.js";

type Item = Data["items"][number];

type VendorGroup = {
  vendorId: string;
  vendorName: string;
  items: Item[];
};

function groupByVendor(items: Item[]): VendorGroup[] {
  const groups = new Map<string, VendorGroup>();
  for (const it of items) {
    let g = groups.get(it.vendorId);
    if (!g) {
      g = { vendorId: it.vendorId, vendorName: it.vendorName, items: [] };
      groups.set(it.vendorId, g);
    }
    g.items.push(it);
  }
  return Array.from(groups.values()).sort((a, b) => a.vendorName.localeCompare(b.vendorName));
}

export function OpsLowStockAlerts({ data, actions, config }: Props) {
  const groups = useMemo(() => groupByVendor(data.items), [data.items]);
  const [busy, setBusy] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const onCreatePo = async (g: VendorGroup) => {
    const lineItems = g.items.map((it) => ({
      itemId: it.id,
      quantity: Math.max(1, Math.ceil((it.reorderPoint - it.quantityOnHand) * config.reorderQuantityMultiplier)),
      unitCost: it.unitCost,
    }));
    setBusy(g.vendorId);
    setFeedback(null);
    try {
      const result = await actions.createPo({ vendorId: g.vendorId, lineItems });
      setFeedback(`Created draft ${result.poNumber} for ${g.vendorName}.`);
    } finally {
      setBusy(null);
    }
  };

  return (
    <section className="overflow-hidden rounded-lg border border-red-200 bg-white shadow-sm">
      <header className="flex items-center justify-between border-b border-red-200 bg-red-50 px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold text-red-900">Low stock alerts</h2>
          <p className="text-xs text-red-700">
            {data.items.length} item{data.items.length === 1 ? "" : "s"} at or below reorder, across {groups.length}{" "}
            vendor{groups.length === 1 ? "" : "s"}
          </p>
        </div>
        {feedback && <span className="text-xs text-slate-700">{feedback}</span>}
      </header>
      {groups.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-slate-500">Everything is in stock.</p>
      ) : (
        <div className="divide-y divide-slate-100">
          {groups.map((g) => (
            <div key={g.vendorId} className="px-4 py-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">{g.vendorName}</h3>
                  <p className="text-xs text-slate-500">{g.items.length} item{g.items.length === 1 ? "" : "s"} below reorder</p>
                </div>
                <button
                  className="shrink-0 rounded bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
                  disabled={busy !== null}
                  onClick={() => onCreatePo(g)}
                >
                  {busy === g.vendorId ? "Creating…" : "Create draft PO"}
                </button>
              </div>
              <ul className="mt-2 divide-y divide-slate-100 text-xs">
                {g.items.map((it) => {
                  const gap = it.reorderPoint - it.quantityOnHand;
                  return (
                    <li key={it.id} className="flex items-center justify-between gap-3 py-1.5">
                      <div className="min-w-0">
                        <span className="font-medium text-slate-900">{it.name}</span>
                        <span className="ml-2 font-mono text-[11px] text-slate-500">{it.sku}</span>
                      </div>
                      <div className="flex shrink-0 items-center gap-2 text-slate-600">
                        <span>
                          on hand <strong className="text-red-700">{it.quantityOnHand}</strong> · reorder at {it.reorderPoint}
                        </span>
                        <span className="rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-red-700">
                          −{gap}
                        </span>
                        <button
                          className="rounded border border-slate-300 px-2 py-0.5 text-[11px] text-slate-700 hover:bg-slate-100"
                          onClick={async () => {
                            const raw = window.prompt(`Bump on-hand for ${it.name} by?`);
                            if (raw === null || raw === "") return;
                            const delta = parseInt(raw, 10);
                            if (!Number.isFinite(delta) || delta === 0) return;
                            await actions.adjustStock({
                              itemId: it.id,
                              delta,
                              reason: "manual low-stock bump",
                            });
                          }}
                        >
                          Adjust
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

"use client";

import { useState } from "react";
import type { Props } from "./product-detail-types.js";

export function ProductDetail({ data, actions }: Props) {
  const [adjLocation, setAdjLocation] = useState("");
  const [adjQty, setAdjQty] = useState(0);
  const [adjReason, setAdjReason] = useState("cycle_count");
  const [busy, setBusy] = useState<"adjust" | "transfer" | null>(null);

  if (!data.product) {
    return (
      <section>
        <p className="py-6 text-center text-sm text-slate-500">
          Pick a product from the table to see details.
        </p>
      </section>
    );
  }

  const p = data.product;

  return (
    <section className="space-y-4">
      <header>
        <p className="text-xs uppercase tracking-wide text-slate-500">{p.category}</p>
        <h2 className="text-base font-semibold text-slate-900">{p.name}</h2>
        <p className="font-mono text-xs text-slate-500">{p.sku}</p>
      </header>
      <dl className="grid grid-cols-2 gap-2 text-xs">
        <div><dt className="text-slate-500">Unit cost</dt><dd className="font-medium">${p.unitCost.toFixed(2)}</dd></div>
        <div><dt className="text-slate-500">UoM</dt><dd className="font-medium">{p.unitOfMeasure}</dd></div>
        <div><dt className="text-slate-500">Reorder pt</dt><dd className="font-medium">{p.reorderPoint}</dd></div>
        <div><dt className="text-slate-500">Reorder qty</dt><dd className="font-medium">{p.reorderQuantity}</dd></div>
      </dl>

      <div>
        <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Stock by location</h3>
        {data.stock.length === 0 ? (
          <p className="text-xs text-slate-500">No stock at any location.</p>
        ) : (
          <table className="w-full text-sm">
            <tbody className="divide-y divide-slate-100">
              {data.stock.map((s) => (
                <tr key={s.locationId}>
                  <td className="py-1 pr-2 text-slate-700">{s.locationName}</td>
                  <td className="py-1 pr-2 text-right tabular-nums">{s.onHand}</td>
                  <td className="py-1 text-right text-xs text-slate-500">avail {s.available}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="space-y-2 border-t border-slate-200 pt-3">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Adjust stock</h3>
        <div className="grid grid-cols-2 gap-2">
          <input
            value={adjLocation}
            onChange={(e) => setAdjLocation(e.target.value)}
            placeholder="location id"
            className="rounded border border-slate-300 px-2 py-1 text-sm"
          />
          <input
            type="number"
            value={adjQty}
            onChange={(e) => setAdjQty(Number(e.target.value))}
            placeholder="Δ qty"
            className="rounded border border-slate-300 px-2 py-1 text-sm"
          />
        </div>
        <input
          value={adjReason}
          onChange={(e) => setAdjReason(e.target.value)}
          placeholder="reason"
          className="w-full rounded border border-slate-300 px-2 py-1 text-sm"
        />
        <button
          type="button"
          disabled={!adjLocation || adjQty === 0 || busy !== null}
          onClick={async () => {
            setBusy("adjust");
            try {
              await actions.adjust({ locationId: adjLocation, quantity: adjQty, reason: adjReason });
              setAdjQty(0);
            } finally {
              setBusy(null);
            }
          }}
          className="rounded bg-slate-900 px-3 py-1 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
        >
          {busy === "adjust" ? "Adjusting…" : "Adjust"}
        </button>
      </div>
    </section>
  );
}

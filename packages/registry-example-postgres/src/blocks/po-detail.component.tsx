"use client";

import { useState } from "react";
import type { PoStatus, Props } from "./po-detail-types.js";

const STATUS_BADGE: Record<PoStatus, string> = {
  draft: "bg-slate-100 text-slate-700",
  approved: "bg-sky-100 text-sky-800",
  partial: "bg-amber-100 text-amber-800",
  received: "bg-emerald-100 text-emerald-800",
};

export function OpsPoDetail({ data, actions, config }: Props) {
  const po = data.po;
  const [busy, setBusy] = useState<"approve" | "receive" | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  return (
    <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <header className="flex items-start justify-between border-b border-slate-200 bg-slate-50 px-4 py-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-mono text-sm font-semibold text-slate-900">{po.poNumber}</h2>
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[po.status]}`}>
              {po.status}
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-700">{po.vendorName}</p>
          {config.showTimestamps && (
            <p className="text-xs text-slate-500">
              Created {new Date(po.createdAt).toLocaleDateString()}
              {po.approvedAt ? ` · Approved ${new Date(po.approvedAt).toLocaleDateString()}` : ""}
              {po.receivedAt ? ` · Received ${new Date(po.receivedAt).toLocaleDateString()}` : ""}
            </p>
          )}
        </div>
        <div className="text-right">
          <div className="text-xs text-slate-500">Total</div>
          <div className="text-lg font-semibold text-slate-900">
            ${po.totalAmount.toLocaleString()} {po.currency}
          </div>
        </div>
      </header>

      <table className="w-full text-sm">
        <thead className="bg-white text-left text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th className="border-b border-slate-200 px-4 py-2 font-medium">Item</th>
            <th className="border-b border-slate-200 px-4 py-2 font-medium">SKU</th>
            <th className="border-b border-slate-200 px-4 py-2 text-right font-medium">Qty</th>
            <th className="border-b border-slate-200 px-4 py-2 text-right font-medium">Unit cost</th>
            <th className="border-b border-slate-200 px-4 py-2 text-right font-medium">Subtotal</th>
          </tr>
        </thead>
        <tbody>
          {po.lineItems.map((l) => (
            <tr key={l.id} className="border-b border-slate-100 last:border-0">
              <td className="px-4 py-2 font-medium text-slate-900">{l.itemName}</td>
              <td className="px-4 py-2 font-mono text-xs text-slate-500">{l.itemSku}</td>
              <td className="px-4 py-2 text-right tabular-nums">{l.quantity.toLocaleString()}</td>
              <td className="px-4 py-2 text-right tabular-nums">${l.unitCost.toFixed(2)}</td>
              <td className="px-4 py-2 text-right tabular-nums font-medium">
                ${(l.quantity * l.unitCost).toFixed(2)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <footer className="flex items-center justify-end gap-2 border-t border-slate-200 bg-slate-50 px-4 py-3">
        {feedback && <span className="mr-auto text-xs text-slate-600">{feedback}</span>}
        {po.status === "draft" && (
          <button
            className="rounded bg-sky-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-sky-500 disabled:opacity-50"
            disabled={busy !== null}
            onClick={async () => {
              setBusy("approve");
              setFeedback(null);
              try {
                const r = await actions.approve({});
                setFeedback(`Approved at ${new Date(r.approvedAt).toLocaleString()}.`);
              } finally {
                setBusy(null);
              }
            }}
          >
            {busy === "approve" ? "Approving…" : "Approve"}
          </button>
        )}
        {(po.status === "approved" || po.status === "partial") && (
          <button
            className="rounded bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
            disabled={busy !== null}
            onClick={async () => {
              setBusy("receive");
              setFeedback(null);
              try {
                const r = await actions.receive({});
                setFeedback(`Received ${r.itemsReceived} line${r.itemsReceived === 1 ? "" : "s"}; stock incremented.`);
              } finally {
                setBusy(null);
              }
            }}
          >
            {busy === "receive" ? "Receiving…" : "Mark received"}
          </button>
        )}
      </footer>
    </section>
  );
}

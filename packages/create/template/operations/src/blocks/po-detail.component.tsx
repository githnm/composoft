"use client";

import { useState } from "react";
import type { Props } from "./po-detail-types.js";

const STATUS_STYLE: Record<string, string> = {
  draft:     "bg-slate-100 text-slate-700",
  submitted: "bg-blue-50 text-blue-700",
  approved:  "bg-emerald-50 text-emerald-700",
  rejected:  "bg-rose-50 text-rose-700",
  received:  "bg-violet-50 text-violet-700",
  closed:    "bg-slate-100 text-slate-500",
};

export function PoDetail({ data, actions }: Props) {
  const [busy, setBusy] = useState(false);
  const [comments, setComments] = useState("");

  if (!data.po) {
    return (
      <section>
        <p className="py-6 text-center text-sm text-slate-500">
          Pick a PO from the list to see details.
        </p>
      </section>
    );
  }

  const po = data.po;
  const vendor = data.vendors.items.find((v) => v.id === po.vendorId);

  return (
    <section className="space-y-3">
      <header>
        <p className="text-xs uppercase tracking-wide text-slate-500">{po.poNumber}</p>
        <h2 className="text-base font-semibold text-slate-900">{vendor?.name ?? po.vendorId}</h2>
        <span className={`mt-1 inline-flex rounded px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[po.status] ?? "bg-slate-100"}`}>
          {po.status}
        </span>
      </header>
      <dl className="grid grid-cols-2 gap-2 text-xs">
        <div><dt className="text-slate-500">Total</dt><dd className="font-medium">${po.totalAmount.toFixed(2)}</dd></div>
        <div><dt className="text-slate-500">Created</dt><dd className="font-medium">{new Date(po.createdAt).toLocaleDateString()}</dd></div>
      </dl>
      {po.status === "submitted" ? (
        <div className="space-y-2 border-t border-slate-200 pt-3">
          <textarea
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            placeholder="Approval comments (optional)"
            rows={2}
            className="w-full rounded border border-slate-300 px-2 py-1 text-sm"
          />
          <button
            type="button"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await actions.approve({ comments: comments || undefined });
                setComments("");
              } finally {
                setBusy(false);
              }
            }}
            className="rounded bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {busy ? "Approving…" : "Approve PO"}
          </button>
        </div>
      ) : null}
    </section>
  );
}

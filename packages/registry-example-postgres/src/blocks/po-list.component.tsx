"use client";

import { useMemo, useState } from "react";
import type { Column, Props, Status } from "./po-list-types.js";

const COLUMN_LABEL: Record<Column, string> = {
  poNumber: "PO #",
  vendor: "Vendor",
  status: "Status",
  lineCount: "Lines",
  totalAmount: "Total",
  createdAt: "Created",
};

const STATUS_BADGE: Record<Status, string> = {
  draft: "bg-slate-100 text-slate-700",
  approved: "bg-sky-100 text-sky-800",
  partial: "bg-amber-100 text-amber-800",
  received: "bg-emerald-100 text-emerald-800",
};

export function OpsPoList({ data, actions, config }: Props) {
  const [page, setPage] = useState(0);
  const pageCount = Math.max(1, Math.ceil(data.pos.length / config.pageSize));
  const visible = useMemo(() => {
    const start = page * config.pageSize;
    return data.pos.slice(start, start + config.pageSize);
  }, [data.pos, page, config.pageSize]);

  return (
    <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <header className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Purchase orders</h2>
          <p className="text-xs text-slate-500">
            {data.pos.length} matching{config.defaultStatus ? ` · status=${config.defaultStatus}` : ""} · page {page + 1} of {pageCount}
          </p>
        </div>
      </header>
      <table className="w-full text-sm">
        <thead className="bg-white text-left text-xs uppercase tracking-wide text-slate-500">
          <tr>
            {config.columns.map((col) => (
              <th key={col} className="border-b border-slate-200 px-4 py-2 font-medium">
                {COLUMN_LABEL[col]}
              </th>
            ))}
            <th className="border-b border-slate-200 px-4 py-2 text-right font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {visible.length === 0 ? (
            <tr>
              <td colSpan={config.columns.length + 1} className="px-4 py-8 text-center text-sm text-slate-500">
                No POs match this view.
              </td>
            </tr>
          ) : (
            visible.map((p) => (
              <tr key={p.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                {config.columns.map((col) => (
                  <td key={col} className="px-4 py-2 align-top text-slate-700">
                    {col === "poNumber" && (
                      <a href={`#/purchase-orders/${p.id}`} className="font-mono text-xs text-sky-700 hover:underline">
                        {p.poNumber}
                      </a>
                    )}
                    {col === "vendor" && <span className="font-medium text-slate-900">{p.vendorName}</span>}
                    {col === "status" && (
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[p.status]}`}>
                        {p.status}
                      </span>
                    )}
                    {col === "lineCount" && p.lineItems.length}
                    {col === "totalAmount" && (
                      <span className="tabular-nums">${p.totalAmount.toLocaleString()}</span>
                    )}
                    {col === "createdAt" && (
                      <time className="text-xs text-slate-500" dateTime={p.createdAt}>
                        {new Date(p.createdAt).toLocaleDateString()}
                      </time>
                    )}
                  </td>
                ))}
                <td className="px-4 py-2 text-right">
                  {p.status === "draft" ? (
                    <button
                      className="rounded border border-sky-300 bg-sky-50 px-2 py-1 text-xs font-medium text-sky-800 hover:bg-sky-100"
                      onClick={async () => {
                        await actions.approve({ poId: p.id });
                      }}
                    >
                      Approve
                    </button>
                  ) : (
                    <span className="text-xs text-slate-400">—</span>
                  )}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
      <footer className="flex items-center justify-end gap-2 border-t border-slate-200 bg-slate-50 px-4 py-2 text-xs">
        <button
          className="rounded border border-slate-300 px-2 py-1 disabled:opacity-50"
          disabled={page === 0}
          onClick={() => setPage((p) => Math.max(0, p - 1))}
        >
          Prev
        </button>
        <button
          className="rounded border border-slate-300 px-2 py-1 disabled:opacity-50"
          disabled={page >= pageCount - 1}
          onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
        >
          Next
        </button>
      </footer>
    </section>
  );
}

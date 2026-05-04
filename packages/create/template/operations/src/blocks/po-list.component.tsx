"use client";

import { useMemo } from "react";
import type { Props } from "./po-list-types.js";

export const statusBadge: Record<string, string> = {
  draft: "bg-slate-100 text-slate-700",
  submitted: "bg-blue-100 text-blue-800",
  approved: "bg-emerald-100 text-emerald-800",
  received: "bg-purple-100 text-purple-800",
  closed: "bg-zinc-200 text-zinc-700",
  cancelled: "bg-rose-100 text-rose-800",
};

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function fmtCurrency(n: number): string {
  return n.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

export function PoList({ data, writes }: Props) {
  const vendorById = useMemo(() => {
    const m = new Map<string, (typeof data.vendors.items)[number]>();
    for (const v of data.vendors.items) m.set(v.id, v);
    return m;
  }, [data.vendors.items]);

  return (
    <section className="rounded-lg border bg-card">
      <header className="flex items-center justify-between border-b px-4 py-3">
        <h2 className="text-sm font-semibold">Purchase orders</h2>
        <p className="text-xs text-muted-foreground">
          {data.pos.total} total · page {data.pos.page}
        </p>
      </header>
      <table className="w-full text-sm">
        <thead className="bg-muted text-xs text-muted-foreground">
          <tr>
            <th className="px-3 py-2 text-left font-medium">PO #</th>
            <th className="px-3 py-2 text-left font-medium">Vendor</th>
            <th className="px-3 py-2 text-left font-medium">Status</th>
            <th className="px-3 py-2 text-left font-medium">Order date</th>
            <th className="px-3 py-2 text-left font-medium">Expected</th>
            <th className="px-3 py-2 text-right font-medium">Total</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {data.pos.items.length === 0 ? (
            <tr>
              <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                No POs match.
              </td>
            </tr>
          ) : (
            data.pos.items.map((p) => (
              <tr
                key={p.id}
                onClick={() => writes.selectedPo(p.id)}
                className="cursor-pointer hover:bg-muted"
              >
                <td className="px-3 py-1.5 font-mono text-xs">{p.poNumber}</td>
                <td className="px-3 py-1.5">{vendorById.get(p.vendorId)?.name ?? p.vendorId}</td>
                <td className="px-3 py-1.5">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs ${statusBadge[p.status]}`}
                  >
                    {p.status}
                  </span>
                </td>
                <td className="px-3 py-1.5 text-xs text-muted-foreground">
                  {fmtDate(p.orderDate)}
                </td>
                <td className="px-3 py-1.5 text-xs text-muted-foreground">
                  {fmtDate(p.expectedDelivery)}
                </td>
                <td className="px-3 py-1.5 text-right font-medium tabular-nums">
                  {fmtCurrency(p.totalAmount)}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </section>
  );
}

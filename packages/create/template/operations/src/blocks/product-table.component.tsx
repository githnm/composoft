"use client";

import { useMemo, useState } from "react";
import type { Props } from "./product-table-types.js";

type SortKey = "sku" | "name" | "category";

// Stock indicator: a colored dot + the status word. Same dot-and-label
// pattern the support template uses for ticket statuses, so the visual
// idiom carries across blocks the composer might lay out side-by-side.
const stockDot: Record<string, string> = {
  "in-stock":     "bg-emerald-500",
  "low-stock":    "bg-amber-500",
  "out-of-stock": "bg-red-500",
};

const stockText: Record<string, string> = {
  "in-stock":     "text-emerald-700 dark:text-emerald-400",
  "low-stock":    "text-amber-700 dark:text-amber-400",
  "out-of-stock": "text-red-600 dark:text-red-400 font-medium",
};

export function ProductTable({ data, config, writes }: Props) {
  const [sort, setSort] = useState<SortKey>(config.defaultSort);

  const lowMap = useMemo(() => {
    const m = new Map<string, { onHand: number; reorderPoint: number }>();
    for (const r of data.lowStock) m.set(r.productId, { onHand: r.onHand, reorderPoint: r.reorderPoint });
    return m;
  }, [data.lowStock]);

  const rows = useMemo(() => {
    return [...data.products.items].sort((a, b) => {
      if (sort === "sku") return a.sku.localeCompare(b.sku);
      if (sort === "name") return a.name.localeCompare(b.name);
      return a.category.localeCompare(b.category);
    });
  }, [data.products.items, sort]);

  function statusFor(productId: string, reorderPoint: number): {
    label: string;
    onHand: number;
  } {
    const low = lowMap.get(productId);
    if (!low) return { label: "in-stock", onHand: reorderPoint };
    if (low.onHand === 0) return { label: "out-of-stock", onHand: 0 };
    return { label: "low-stock", onHand: low.onHand };
  }

  function header(label: string, key: SortKey) {
    const active = sort === key;
    return (
      <th
        onClick={() => setSort(key)}
        className={`cursor-pointer select-none px-3 py-2 text-left font-medium ${
          active ? "text-foreground" : "text-muted-foreground"
        }`}
      >
        {label}
        {active && <span aria-hidden> ↑</span>}
      </th>
    );
  }

  return (
    <section className="rounded-lg border bg-card">
      <header className="flex items-center justify-between border-b px-4 py-3">
        <h2 className="text-sm font-semibold">Products</h2>
        <p className="text-xs text-muted-foreground">
          {data.products.total} total · page {data.products.page}
        </p>
      </header>
      <table className="w-full text-sm">
        <thead className="bg-muted text-xs">
          <tr>
            {header("SKU", "sku")}
            {header("Name", "name")}
            {header("Category", "category")}
            <th className="px-3 py-2 text-right font-medium text-muted-foreground">On hand</th>
            <th className="px-3 py-2 text-right font-medium text-muted-foreground">Reorder</th>
            <th className="px-3 py-2 text-left font-medium text-muted-foreground">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {rows.length === 0 ? (
            <tr>
              <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                No products.
              </td>
            </tr>
          ) : (
            rows.map((p) => {
              const status = statusFor(p.id, p.reorderPoint);
              return (
                <tr
                  key={p.id}
                  onClick={() => writes.selectedProduct(p.id)}
                  className="cursor-pointer hover:bg-muted"
                >
                  <td className="px-3 py-1.5 font-mono text-xs">{p.sku}</td>
                  <td className="px-3 py-1.5 font-medium">{p.name}</td>
                  <td className="px-3 py-1.5 text-xs text-muted-foreground">{p.category}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums">
                    {status.onHand.toLocaleString()}
                  </td>
                  <td className="px-3 py-1.5 text-right tabular-nums text-muted-foreground">
                    {p.reorderPoint}
                  </td>
                  <td className="px-3 py-1.5">
                    <span className="inline-flex items-center gap-1.5 text-xs">
                      <span
                        className={`inline-block h-2 w-2 rounded-full ${stockDot[status.label] ?? "bg-slate-400"}`}
                        aria-hidden
                      />
                      <span className={stockText[status.label] ?? ""}>{status.label}</span>
                    </span>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </section>
  );
}

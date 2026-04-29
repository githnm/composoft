"use client";

import { useMemo, useState } from "react";
import { usePageState } from "@composoft/runtime";
import type { Column, Data, Props } from "./inventory-table-types.js";

const COLUMN_LABEL: Record<Column, string> = {
  sku: "SKU",
  name: "Item",
  category: "Category",
  warehouse: "Warehouse",
  onHand: "On hand",
  reorderPoint: "Reorder",
  vendor: "Vendor",
  lowStock: "Status",
};

const CATEGORY_BADGE: Record<Data["items"][number]["category"], string> = {
  "green-coffee": "bg-emerald-100 text-emerald-800",
  roasted: "bg-amber-100 text-amber-800",
  packaging: "bg-slate-100 text-slate-700",
  equipment: "bg-sky-100 text-sky-800",
};

export function OpsInventoryTable({ data, actions, config, writes }: Props) {
  const selectedItemId = usePageState("selection.itemId") as string | undefined;
  const [page, setPage] = useState(0);
  const pageCount = Math.max(1, Math.ceil(data.items.length / config.pageSize));
  const visible = useMemo(() => {
    const start = page * config.pageSize;
    return data.items.slice(start, start + config.pageSize);
  }, [data.items, page, config.pageSize]);

  return (
    <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <header className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Inventory</h2>
          <p className="text-xs text-slate-500">
            {data.items.length} items · page {page + 1} of {pageCount}
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
              <td
                colSpan={config.columns.length + 1}
                className="px-4 py-8 text-center text-sm text-slate-500"
              >
                No items match this view.
              </td>
            </tr>
          ) : (
            visible.map((it) => {
              const low = it.quantityOnHand <= it.reorderPoint;
              const selected = selectedItemId === it.id;
              return (
                <tr
                  key={it.id}
                  onClick={() => writes.selectedItem(it.id)}
                  className={`cursor-pointer border-b border-slate-100 last:border-0 ${selected ? "bg-sky-50 ring-2 ring-inset ring-sky-300" : low ? "bg-red-50/40 hover:bg-red-50/70" : "hover:bg-slate-50"}`}
                >
                  {config.columns.map((col) => (
                    <td key={col} className="px-4 py-2 align-top text-slate-700">
                      {col === "sku" && <span className="font-mono text-xs">{it.sku}</span>}
                      {col === "name" && <span className="font-medium text-slate-900">{it.name}</span>}
                      {col === "category" && (
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${CATEGORY_BADGE[it.category]}`}
                        >
                          {it.category}
                        </span>
                      )}
                      {col === "warehouse" && it.warehouseName}
                      {col === "onHand" && (
                        <span className={low ? "font-semibold text-red-700" : ""}>
                          {it.quantityOnHand.toLocaleString()}
                        </span>
                      )}
                      {col === "reorderPoint" && it.reorderPoint.toLocaleString()}
                      {col === "vendor" && it.vendorName}
                      {col === "lowStock" &&
                        (low ? (
                          <span className="rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-red-700">
                            Low
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        ))}
                    </td>
                  ))}
                  <td className="px-4 py-2 text-right">
                    <button
                      className="rounded border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
                      onClick={async (e) => {
                        e.stopPropagation();
                        const raw = window.prompt("Adjust by (positive or negative integer)?");
                        if (raw === null || raw === "") return;
                        const delta = parseInt(raw, 10);
                        if (!Number.isFinite(delta) || delta === 0) return;
                        const reason = window.prompt("Reason?") ?? "";
                        if (!reason.trim()) return;
                        await actions.adjustStock({ itemId: it.id, delta, reason: reason.trim() });
                      }}
                    >
                      Adjust
                    </button>
                  </td>
                </tr>
              );
            })
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

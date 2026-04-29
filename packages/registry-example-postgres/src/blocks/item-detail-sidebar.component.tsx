"use client";

import type { Props, Section } from "./item-detail-sidebar-types.js";

export function OpsItemDetailSidebar({ data, config }: Props) {
  if (!data.item) {
    return (
      <aside className="flex w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500 shadow-sm">
        <p className="font-medium text-slate-700">No item selected</p>
        <p className="text-xs">Click a row in the inventory table to see details here.</p>
      </aside>
    );
  }

  const it = data.item;
  const sections = new Set<Section>(config.sections);
  const low = it.quantityOnHand <= it.reorderPoint;

  return (
    <aside className="flex w-full flex-col gap-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <header>
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900">{it.name}</h2>
          {low && (
            <span className="rounded bg-red-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-red-700">
              Low stock
            </span>
          )}
        </div>
        {config.showSku && (
          <p className="mt-1 font-mono text-xs text-slate-500">{it.sku}</p>
        )}
      </header>

      <dl className="grid grid-cols-2 gap-2 text-sm">
        <div>
          <dt className="text-xs text-slate-500">On hand</dt>
          <dd className={`text-lg font-semibold ${low ? "text-red-700" : "text-slate-900"}`}>
            {it.quantityOnHand.toLocaleString()}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-slate-500">Reorder at</dt>
          <dd className="text-lg font-semibold text-slate-900">
            {it.reorderPoint.toLocaleString()}
          </dd>
        </div>
      </dl>

      {sections.has("warehouse") && (
        <section className="rounded border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
          <div className="font-semibold uppercase tracking-wide text-slate-500">Warehouse</div>
          <div className="mt-1 text-sm text-slate-800">{it.warehouseName}</div>
        </section>
      )}

      {sections.has("vendor") && (
        <section className="rounded border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
          <div className="font-semibold uppercase tracking-wide text-slate-500">Vendor</div>
          <div className="mt-1 text-sm text-slate-800">{it.vendorName}</div>
          <div className="mt-0.5 text-xs text-slate-500">Unit cost ${it.unitCost.toFixed(2)}</div>
        </section>
      )}

      {sections.has("stockHistory") && it.recentAdjustments.length > 0 && (
        <section>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Recent adjustments
          </h3>
          <ul className="mt-1 divide-y divide-slate-100 text-xs text-slate-600">
            {it.recentAdjustments.slice(0, 5).map((a) => (
              <li key={a.id} className="flex items-center justify-between py-1.5">
                <span>
                  <span className={a.delta > 0 ? "text-emerald-700" : "text-red-700"}>
                    {a.delta > 0 ? "+" : ""}
                    {a.delta}
                  </span>{" "}
                  · {a.reason}
                </span>
                <time className="text-slate-400">{new Date(a.at).toLocaleDateString()}</time>
              </li>
            ))}
          </ul>
        </section>
      )}
    </aside>
  );
}

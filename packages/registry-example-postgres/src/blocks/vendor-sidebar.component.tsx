"use client";

import type { Props, VendorCategory } from "./vendor-sidebar-types.js";

const CATEGORY_BADGE: Record<VendorCategory, string> = {
  beans: "bg-emerald-100 text-emerald-800",
  packaging: "bg-slate-100 text-slate-700",
  equipment: "bg-sky-100 text-sky-800",
};

export function OpsVendorSidebar({ data, config }: Props) {
  const v = data.vendor;
  const sections = new Set(config.sections);

  return (
    <aside className="flex w-full flex-col gap-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <header>
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900">{v.name}</h2>
          {sections.has("categoryBadge") && (
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium uppercase ${CATEGORY_BADGE[v.category]}`}>
              {v.category}
            </span>
          )}
        </div>
        <p className="mt-1 font-mono text-xs text-slate-500">{v.id}</p>
      </header>

      {sections.has("contactInfo") && v.contactEmail && (
        <section>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Contact</h3>
          <p className="mt-1 font-mono text-xs text-slate-700">{v.contactEmail}</p>
        </section>
      )}

      {sections.has("paymentTerms") && v.paymentTerms && (
        <section>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Terms</h3>
          <p className="mt-1 text-sm text-slate-700">{v.paymentTerms}</p>
        </section>
      )}

      {sections.has("openPos") && (
        <section>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Open POs</h3>
          <p className="mt-1 text-2xl font-semibold text-slate-900">{v.openPoCount}</p>
        </section>
      )}
    </aside>
  );
}

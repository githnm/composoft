"use client";

import { useMemo, useState } from "react";
import type { Props } from "./lead-list-types.js";

const STATUSES = ["new", "contacted", "qualified", "unqualified", "converted"] as const;

const STATUS_STYLE: Record<string, string> = {
  "new":         "bg-blue-50 text-blue-700 ring-blue-200",
  "contacted":   "bg-amber-50 text-amber-700 ring-amber-200",
  "qualified":   "bg-emerald-50 text-emerald-700 ring-emerald-200",
  "unqualified": "bg-slate-100 text-slate-600 ring-slate-200",
  "converted":   "bg-violet-50 text-violet-700 ring-violet-200",
};

export function LeadListView({ data, actions, config }: Props) {
  const [filter, setFilter] = useState<string>(config.defaultStatus ?? "all");
  const [busyId, setBusyId] = useState<string | null>(null);

  const visible = useMemo(() => {
    if (filter === "all") return data.leads;
    return data.leads.filter((l) => l.status === filter);
  }, [data.leads, filter]);

  return (
    <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50 px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Leads</h2>
          <p className="text-xs text-slate-500">{visible.length} of {data.leads.length} shown</p>
        </div>
        <div className="flex flex-wrap gap-1 text-xs">
          <button
            onClick={() => setFilter("all")}
            className={`rounded px-2 py-1 ${filter === "all" ? "bg-slate-900 text-white" : "border border-slate-300 text-slate-700 hover:bg-slate-100"}`}
          >
            all
          </button>
          {STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`rounded px-2 py-1 ${filter === s ? "bg-slate-900 text-white" : "border border-slate-300 text-slate-700 hover:bg-slate-100"}`}
            >
              {s}
            </button>
          ))}
        </div>
      </header>

      {visible.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-slate-500">No leads match this filter.</p>
      ) : (
        <table className="min-w-full divide-y divide-slate-100 text-sm">
          <thead className="bg-slate-50/50">
            <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
              <th className="px-4 py-2 font-medium">Name</th>
              <th className="px-4 py-2 font-medium">Company</th>
              <th className="px-4 py-2 font-medium">Source</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2 font-medium text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {visible.map((l) => (
              <tr key={l.id} className="hover:bg-slate-50">
                <td className="px-4 py-2">
                  <p className="font-medium text-slate-900">{l.name}</p>
                  <p className="text-xs text-slate-500">{l.email}</p>
                </td>
                <td className="px-4 py-2 text-slate-700">{l.company}</td>
                <td className="px-4 py-2 text-slate-600">{l.source}</td>
                <td className="px-4 py-2">
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-xs ring-1 ring-inset ${STATUS_STYLE[l.status] ?? ""}`}>
                    {l.status}
                  </span>
                </td>
                <td className="px-4 py-2 text-right">
                  <button
                    disabled={l.status === "converted" || busyId === l.id}
                    onClick={async () => {
                      setBusyId(l.id);
                      try {
                        await actions.convert({ leadId: l.id });
                      } finally {
                        setBusyId(null);
                      }
                    }}
                    className="rounded border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {busyId === l.id ? "Converting…" : "Convert"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

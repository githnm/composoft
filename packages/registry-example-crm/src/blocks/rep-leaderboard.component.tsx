"use client";

import { useMemo } from "react";
import type { Props } from "./rep-leaderboard-types.js";

function fmtCurrency(n: number): string {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

export function RepLeaderboardView({ data, config }: Props) {
  const rows = useMemo(() => {
    const totals = new Map<string, { count: number; value: number; won: number }>();
    for (const rep of data.reps) totals.set(rep.id, { count: 0, value: 0, won: 0 });

    for (const d of data.deals) {
      if (config.excludeLost && d.stage === "closed-lost") continue;
      if (!d.ownerId) continue;
      const bucket = totals.get(d.ownerId);
      if (!bucket) continue;
      bucket.count += 1;
      bucket.value += d.value;
      if (d.stage === "closed-won") bucket.won += d.value;
    }

    return data.reps
      .map((rep) => ({
        ...rep,
        ...(totals.get(rep.id) ?? { count: 0, value: 0, won: 0 }),
      }))
      .sort((a, b) => b.value - a.value);
  }, [data.deals, data.reps, config.excludeLost]);

  return (
    <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <header className="border-b border-slate-200 bg-slate-50 px-4 py-3">
        <h2 className="text-sm font-semibold text-slate-900">{config.title}</h2>
        <p className="text-xs text-slate-500">
          {rows.length} reps · {data.deals.length} deals total
        </p>
      </header>
      <table className="min-w-full divide-y divide-slate-100 text-sm">
        <thead className="bg-slate-50/50">
          <tr className="text-left text-xs uppercase tracking-wide text-slate-500">
            <th className="px-4 py-2 font-medium">Rep</th>
            <th className="px-4 py-2 font-medium text-right">Deals</th>
            <th className="px-4 py-2 font-medium text-right">Pipeline</th>
            <th className="px-4 py-2 font-medium text-right">Closed-won</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((r, i) => (
            <tr key={r.id} className="hover:bg-slate-50">
              <td className="px-4 py-2">
                <p className="font-medium text-slate-900">
                  <span className="mr-2 text-slate-400">#{i + 1}</span>
                  {r.name}
                </p>
                <p className="text-xs text-slate-500">{r.email}</p>
              </td>
              <td className="px-4 py-2 text-right text-slate-700">{r.count}</td>
              <td className="px-4 py-2 text-right text-slate-700">{fmtCurrency(r.value)}</td>
              <td className="px-4 py-2 text-right font-medium text-emerald-700">{fmtCurrency(r.won)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

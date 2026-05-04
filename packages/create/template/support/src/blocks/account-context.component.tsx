"use client";

import type { Props } from "./account-context-types.js";

const PLAN_STYLE: Record<string, string> = {
  starter:    "bg-slate-100 text-slate-700",
  growth:     "bg-blue-50 text-blue-700",
  enterprise: "bg-violet-50 text-violet-700",
};

function healthColor(score: number): string {
  if (score >= 80) return "text-emerald-600";
  if (score >= 60) return "text-amber-600";
  return "text-rose-600";
}

export function AccountContextView({ data }: Props) {
  const a = data.account;
  if (!a) {
    return (
      <section>
        <p className="py-4 text-center text-xs text-slate-500">
          Account context will appear when a ticket or account is selected.
        </p>
      </section>
    );
  }
  return (
    <section className="space-y-3">
      <header className="space-y-1">
        <h2 className="text-base font-semibold text-slate-900">{a.name}</h2>
        <span className={`inline-flex rounded px-2 py-0.5 text-xs font-medium ${PLAN_STYLE[a.plan] ?? "bg-slate-100 text-slate-700"}`}>
          {a.plan}
        </span>
      </header>
      <dl className="grid grid-cols-2 gap-2 text-xs">
        <div>
          <dt className="text-slate-500">ARR</dt>
          <dd className="font-medium text-slate-900">${(a.arr / 1000).toFixed(0)}k</dd>
        </div>
        <div>
          <dt className="text-slate-500">Health</dt>
          <dd className={`font-medium ${healthColor(a.healthScore)}`}>{a.healthScore}/100</dd>
        </div>
        <div className="col-span-2">
          <dt className="text-slate-500">Account manager</dt>
          <dd className="text-slate-700">{a.accountManagerId}</dd>
        </div>
      </dl>
    </section>
  );
}

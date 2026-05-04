"use client";

import type { Props } from "./account-context-types.js";

// Plan pill colors. Starter is intentionally muted-neutral so the visual
// weight tracks ARR — enterprise customers should pop in a quick scan.
const PLAN_BADGE: Record<string, string> = {
  starter:    "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  growth:     "bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300",
  enterprise: "bg-violet-50 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300",
};

function healthTone(score: number): { text: string; bar: string } {
  if (score >= 80) return { text: "text-emerald-700 dark:text-emerald-400", bar: "bg-emerald-500" };
  if (score >= 60) return { text: "text-amber-700 dark:text-amber-400",     bar: "bg-amber-500" };
  return { text: "text-red-600 dark:text-red-400", bar: "bg-red-500" };
}

function initialsOf(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return (parts[0] ?? "?").charAt(0).toUpperCase();
  return ((parts[0] ?? "").charAt(0) + (parts[parts.length - 1] ?? "").charAt(0)).toUpperCase();
}

export function AccountContextView({ data }: Props) {
  const a = data.account;
  if (!a) {
    return (
      <section>
        <p className="py-6 text-center text-xs text-muted-foreground">
          Account context will appear when a ticket or account is selected.
        </p>
      </section>
    );
  }
  const health = healthTone(a.healthScore);
  return (
    <section className="space-y-4">
      <header className="space-y-2">
        <h2
          className="text-lg font-semibold leading-tight text-foreground"
          style={{ fontFamily: "ui-serif, Georgia, Cambria, 'Times New Roman', Times, serif" }}
        >
          {a.name}
        </h2>
        <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${PLAN_BADGE[a.plan] ?? "bg-slate-100 text-slate-700"}`}>
          {a.plan}
        </span>
      </header>

      {/* 2x2 stat grid. Each cell is a small framed metric — same shape
          as a real product's "account at a glance" rail in Pylon / HubSpot. */}
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-md border border-border bg-background px-3 py-2">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">ARR</p>
          <p className="mt-0.5 text-lg font-semibold tabular-nums text-foreground">${(a.arr / 1000).toFixed(0)}k</p>
        </div>
        <div className="rounded-md border border-border bg-background px-3 py-2">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Health</p>
          <p className={`mt-0.5 text-lg font-semibold tabular-nums ${health.text}`}>{a.healthScore}<span className="text-xs text-muted-foreground">/100</span></p>
          {/* Tiny health bar, color-matched. */}
          <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-muted">
            <div className={`h-full ${health.bar}`} style={{ width: `${Math.min(100, Math.max(0, a.healthScore))}%` }} />
          </div>
        </div>
      </div>

      {/* Account manager: avatar + name. Mirrors the avatar idiom used in
          ticket-detail's conversation thread for visual consistency. */}
      <div className="flex items-center gap-2 border-t border-border pt-3">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-semibold text-muted-foreground">
          {initialsOf(a.accountManagerId)}
        </div>
        <div className="min-w-0 text-xs">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Account manager</p>
          <p className="truncate font-medium text-foreground">{a.accountManagerId}</p>
        </div>
      </div>
    </section>
  );
}

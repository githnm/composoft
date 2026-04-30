"use client";

import { useState } from "react";
import type { Props } from "./activity-feed-types.js";

const TYPES = ["call", "email", "meeting", "note", "task"] as const;

const TYPE_STYLE: Record<string, string> = {
  "call":    "bg-sky-50 text-sky-700 ring-sky-200",
  "email":   "bg-violet-50 text-violet-700 ring-violet-200",
  "meeting": "bg-emerald-50 text-emerald-700 ring-emerald-200",
  "note":    "bg-slate-100 text-slate-600 ring-slate-200",
  "task":    "bg-amber-50 text-amber-700 ring-amber-200",
};

export function ActivityFeedView({ data, actions, config }: Props) {
  const [type, setType] = useState<typeof TYPES[number]>(config.defaultType);
  const [summary, setSummary] = useState("");
  const [dealId, setDealId] = useState("");
  const [busy, setBusy] = useState(false);

  // data.activities is null on first render when selection.dealId hasn't been
  // set yet — the runtime auto-skips slots whose from-page-state params are null.
  const isUnscoped = data.activities === null;
  const all = data.activities ?? [];
  const items = all.slice(0, config.showLimit);

  return (
    <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <header className="border-b border-slate-200 bg-slate-50 px-4 py-3">
        <h2 className="text-sm font-semibold text-slate-900">Activity</h2>
        <p className="text-xs text-slate-500">
          {isUnscoped ? "Select a deal to scope the feed." : `${items.length} of ${all.length} shown`}
        </p>
      </header>

      <form
        className="grid grid-cols-1 gap-2 border-b border-slate-200 bg-slate-50/40 p-3 md:grid-cols-[110px_140px_1fr_auto]"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!summary.trim() || !dealId.trim()) return;
          setBusy(true);
          try {
            await actions.log({ type, dealId: dealId.trim(), summary: summary.trim() });
            setSummary("");
          } finally {
            setBusy(false);
          }
        }}
      >
        <select
          value={type}
          onChange={(e) => setType(e.target.value as typeof TYPES[number])}
          className="rounded border border-slate-300 px-2 py-1 text-sm text-slate-700"
        >
          {TYPES.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <input
          value={dealId}
          onChange={(e) => setDealId(e.target.value)}
          placeholder="deal_id"
          className="rounded border border-slate-300 px-2 py-1 text-sm text-slate-700"
        />
        <input
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          placeholder="What happened?"
          className="rounded border border-slate-300 px-2 py-1 text-sm text-slate-700"
        />
        <button
          type="submit"
          disabled={busy || !summary.trim() || !dealId.trim()}
          className="rounded bg-slate-900 px-3 py-1 text-sm text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {busy ? "Logging…" : "Log"}
        </button>
      </form>

      {isUnscoped ? (
        <p className="px-4 py-8 text-center text-sm text-slate-500">
          Select a deal to see its activity, or log a new one above.
        </p>
      ) : items.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-slate-500">No activity yet.</p>
      ) : (
        <ol className="divide-y divide-slate-100">
          {items.map((a) => (
            <li key={a.id} className="flex items-start gap-3 px-4 py-3">
              <span className={`mt-0.5 inline-flex shrink-0 rounded-full px-2 py-0.5 text-xs ring-1 ring-inset ${TYPE_STYLE[a.type] ?? ""}`}>
                {a.type}
              </span>
              <div className="flex-1">
                <p className="text-sm text-slate-800">{a.summary}</p>
                <p className="text-xs text-slate-500">
                  {new Date(a.at).toLocaleString()} {a.dealId ? `· ${a.dealId}` : ""}
                </p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

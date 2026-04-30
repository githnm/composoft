"use client";

import { useState } from "react";
import type { Props } from "./deal-detail-types.js";

const STAGES = [
  "discovery",
  "qualified",
  "proposal",
  "negotiation",
  "closed-won",
  "closed-lost",
] as const;

function fmtCurrency(n: number): string {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

export function DealDetailView({ data, actions, config }: Props) {
  const { deal } = data;
  const [busy, setBusy] = useState<string | null>(null);

  // All three slots read selection.dealId. When nothing is selected the runtime
  // auto-skips them and they arrive as null — short-circuit to the empty state.
  if (!deal) {
    return (
      <section className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
        Select a deal to view details.
      </section>
    );
  }

  const contacts = data.contacts ?? [];
  const activities = data.activities ?? [];
  const visibleActivities = activities.slice(0, config.showActivityCount);

  return (
    <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">{deal.name}</h2>
          <p className="text-xs text-slate-500">
            {fmtCurrency(deal.value)} · close {new Date(deal.closeDate).toLocaleDateString()} · stage{" "}
            <span className="font-medium text-slate-700">{deal.stage}</span>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <select
            value={deal.stage}
            disabled={busy === "stage"}
            onChange={async (e) => {
              setBusy("stage");
              try {
                await actions.moveStage({ dealId: deal.id, stage: e.target.value as typeof STAGES[number] });
              } finally {
                setBusy(null);
              }
            }}
            className="rounded border border-slate-300 px-2 py-1 text-xs text-slate-700"
          >
            {STAGES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <button
            disabled={busy === "won"}
            onClick={async () => {
              setBusy("won");
              try { await actions.close({ dealId: deal.id, won: true }); } finally { setBusy(null); }
            }}
            className="rounded bg-emerald-600 px-2 py-1 text-xs text-white hover:bg-emerald-700 disabled:opacity-40"
          >
            Close won
          </button>
          <button
            disabled={busy === "lost"}
            onClick={async () => {
              setBusy("lost");
              try { await actions.close({ dealId: deal.id, won: false }); } finally { setBusy(null); }
            }}
            className="rounded border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:bg-slate-100 disabled:opacity-40"
          >
            Close lost
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-2">
        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Contacts</h3>
          {contacts.length === 0 ? (
            <p className="text-sm text-slate-500">No contacts on this deal yet.</p>
          ) : (
            <ul className="divide-y divide-slate-100 rounded border border-slate-200">
              {contacts.map((c) => (
                <li key={c.id} className="px-3 py-2">
                  <p className="text-sm font-medium text-slate-900">{c.name}</p>
                  <p className="text-xs text-slate-500">{c.role} · {c.email}</p>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-3">
            <label className="mb-1 block text-xs text-slate-500">Reassign owner</label>
            <input
              type="text"
              defaultValue={deal.ownerId ?? ""}
              placeholder="rep_id"
              onBlur={async (e) => {
                const repId = e.target.value.trim();
                if (!repId || repId === deal.ownerId) return;
                setBusy("owner");
                try { await actions.assignRep({ dealId: deal.id, repId }); } finally { setBusy(null); }
              }}
              className="w-full rounded border border-slate-300 px-2 py-1 text-sm text-slate-700"
            />
          </div>
        </div>

        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Recent activity</h3>
          {visibleActivities.length === 0 ? (
            <p className="text-sm text-slate-500">No activity yet.</p>
          ) : (
            <ul className="divide-y divide-slate-100 rounded border border-slate-200">
              {visibleActivities.map((a) => (
                <li key={a.id} className="px-3 py-2">
                  <p className="text-xs uppercase tracking-wide text-slate-500">
                    {a.type} · {new Date(a.at).toLocaleDateString()}
                  </p>
                  <p className="text-sm text-slate-800">{a.summary}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}

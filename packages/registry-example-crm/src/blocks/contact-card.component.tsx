"use client";

import type { Props } from "./contact-card-types.js";

export function ContactCardView({ data, config }: Props) {
  // `contacts` is null when no deal is selected (the runtime auto-skips the
  // slot because its dealId param reads from page state). Treat null and the
  // empty array the same — both should render the empty-state message.
  const contacts = data.contacts ?? [];

  if (contacts.length === 0) {
    return (
      <section className="rounded-lg border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500 shadow-sm">
        {config.emptyMessage}
      </section>
    );
  }

  const primary = contacts[0]!;
  const others = contacts.slice(1);

  return (
    <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <header className="border-b border-slate-200 bg-slate-50 px-4 py-3">
        <h2 className="text-sm font-semibold text-slate-900">{primary.name}</h2>
        <p className="text-xs text-slate-500">{primary.role} · {primary.company}</p>
      </header>
      <dl className="grid grid-cols-1 gap-2 px-4 py-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-xs uppercase tracking-wide text-slate-500">Email</dt>
          <dd className="text-slate-800">{primary.email}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-slate-500">Deal</dt>
          <dd className="text-slate-800">{primary.dealId ?? "—"}</dd>
        </div>
      </dl>
      {others.length > 0 && (
        <div className="border-t border-slate-200 px-4 py-3">
          <p className="mb-2 text-xs uppercase tracking-wide text-slate-500">Other contacts on this deal</p>
          <ul className="divide-y divide-slate-100 rounded border border-slate-200">
            {others.map((c) => (
              <li key={c.id} className="px-3 py-2">
                <p className="text-sm font-medium text-slate-900">{c.name}</p>
                <p className="text-xs text-slate-500">{c.role} · {c.email}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

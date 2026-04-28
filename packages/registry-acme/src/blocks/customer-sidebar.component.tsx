"use client";

import type { z } from "zod";
import type { AdapterOutput, BlockProps } from "@composoft/spec";
import type { customerById } from "../adapters/customers-by-id.js";
import type { configSchema } from "./customer-sidebar.js";

type Config = z.infer<typeof configSchema>;
type Data = { customer: AdapterOutput<typeof customerById> };
type Actions = Record<string, never>;

export function CustomerSidebar({ data, config }: BlockProps<Config, Data, Actions>) {
  const c = data.customer;
  const sections = new Set(config.sections);

  return (
    <aside className="flex w-full flex-col gap-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <header>
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900">{c.name}</h2>
          {sections.has("vipBadge") && c.vip && (
            <span className="rounded bg-purple-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-purple-800">
              VIP
            </span>
          )}
        </div>
        <p className="text-xs text-slate-500">
          Customer since {new Date(c.createdAt).toLocaleDateString()}
        </p>
      </header>

      {sections.has("contactInfo") && (
        <section>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Contact</h3>
          <dl className="mt-1 space-y-1 text-sm text-slate-700">
            <div className="flex justify-between">
              <dt className="text-slate-500">Email</dt>
              <dd className="font-mono text-xs">{c.email}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">ID</dt>
              <dd className="font-mono text-xs">{c.id}</dd>
            </div>
          </dl>
        </section>
      )}

      {sections.has("tags") && c.tags.length > 0 && (
        <section>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Tags</h3>
          <div className="mt-1 flex flex-wrap gap-1">
            {c.tags.map((tag) => (
              <span key={tag} className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700">
                {tag}
              </span>
            ))}
          </div>
        </section>
      )}

      {sections.has("recentTickets") && (
        <section>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Recent tickets</h3>
          {c.recentTicketIds.length === 0 ? (
            <p className="mt-1 text-xs text-slate-500">No recent activity.</p>
          ) : (
            <ul className="mt-1 space-y-1 text-sm">
              {c.recentTicketIds.map((id) => (
                <li key={id}>
                  <a href={`#/tickets/${id}`} className="font-mono text-xs text-sky-700 hover:underline">
                    {id}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </aside>
  );
}

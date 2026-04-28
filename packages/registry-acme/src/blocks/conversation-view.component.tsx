"use client";

import type { z } from "zod";
import type { AdapterOutput, BlockProps } from "@composoft/spec";
import type { conversationsByTicketId } from "../adapters/conversations-by-ticket-id.js";
import type { configSchema } from "./conversation-view.js";

type Config = z.infer<typeof configSchema>;
type Data = { messages: AdapterOutput<typeof conversationsByTicketId> };
type Actions = Record<string, never>;
type Message = Data["messages"][number];

const AUTHOR_BADGE: Record<Message["author"]["kind"], string> = {
  customer: "bg-sky-100 text-sky-800",
  agent: "bg-emerald-100 text-emerald-800",
  system: "bg-slate-100 text-slate-500",
};

function MessageRow({ m }: { m: Message }) {
  const time = new Date(m.createdAt).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
  return (
    <li className="flex gap-3 border-b border-slate-100 px-4 py-3 last:border-0">
      <div className="flex w-32 flex-col text-xs text-slate-500">
        <span className={`inline-flex w-fit rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${AUTHOR_BADGE[m.author.kind]}`}>
          {m.author.kind}
        </span>
        <span className="mt-1 font-medium text-slate-700">{m.author.name}</span>
        <span className="text-slate-400">{time}</span>
      </div>
      <p className="flex-1 whitespace-pre-wrap text-sm text-slate-800">{m.body}</p>
    </li>
  );
}

function groupByDay(messages: Message[]): Array<{ day: string; messages: Message[] }> {
  const groups = new Map<string, Message[]>();
  for (const m of messages) {
    const day = m.createdAt.slice(0, 10);
    const arr = groups.get(day);
    if (arr) arr.push(m);
    else groups.set(day, [m]);
  }
  return Array.from(groups, ([day, msgs]) => ({ day, messages: msgs }));
}

export function ConversationView({ data, config }: BlockProps<Config, Data, Actions>) {
  const filtered = data.messages.filter(
    (m) => config.showSystemMessages || m.author.kind !== "system",
  );

  if (filtered.length === 0) {
    return (
      <section className="rounded-lg border border-slate-200 bg-white p-8 text-center text-sm text-slate-500 shadow-sm">
        No messages on this ticket yet.
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
      <header className="border-b border-slate-200 bg-slate-50 px-4 py-3">
        <h2 className="text-sm font-semibold text-slate-900">Conversation</h2>
        <p className="text-xs text-slate-500">
          {filtered.length} message{filtered.length === 1 ? "" : "s"} ·{" "}
          {config.showSystemMessages ? "showing system events" : "hiding system events"}
        </p>
      </header>
      {config.groupByDay ? (
        <div>
          {groupByDay(filtered).map((g) => (
            <div key={g.day}>
              <div className="bg-slate-50 px-4 py-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                {new Date(g.day).toLocaleDateString(undefined, {
                  weekday: "long",
                  month: "short",
                  day: "numeric",
                })}
              </div>
              <ul>
                {g.messages.map((m) => (
                  <MessageRow key={m.id} m={m} />
                ))}
              </ul>
            </div>
          ))}
        </div>
      ) : (
        <ul>
          {filtered.map((m) => (
            <MessageRow key={m.id} m={m} />
          ))}
        </ul>
      )}
    </section>
  );
}

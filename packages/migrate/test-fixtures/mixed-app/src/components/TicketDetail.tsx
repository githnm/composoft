import { useState, useReducer } from "react";
import useSWR from "swr";

type Ticket = { id: string; subject: string; body: string; status: string };

type Action =
  | { type: "set-reply"; reply: string }
  | { type: "clear" };

function replyReducer(state: { reply: string }, action: Action) {
  if (action.type === "set-reply") return { reply: action.reply };
  return { reply: "" };
}

export function TicketDetail({ id }: { id: string }) {
  const { data, mutate } = useSWR<Ticket>(`/api/tickets/${id}`);
  const [composer, dispatch] = useReducer(replyReducer, { reply: "" });
  const [busy, setBusy] = useState(false);

  if (!data) return <div>Loading…</div>;

  return (
    <article>
      <h2>{data.subject}</h2>
      <p>{data.body}</p>
      <textarea
        value={composer.reply}
        onChange={(e) => dispatch({ type: "set-reply", reply: e.target.value })}
      />
      <button
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          await fetch(`/api/tickets/${id}/reply`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ body: composer.reply }),
          });
          dispatch({ type: "clear" });
          setBusy(false);
          await mutate();
        }}
      >
        Send reply
      </button>
    </article>
  );
}

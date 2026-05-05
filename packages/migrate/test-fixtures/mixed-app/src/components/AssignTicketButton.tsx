import { useState } from "react";

export function AssignTicketButton({ ticketId, agentId }: { ticketId: string; agentId: string }) {
  const [busy, setBusy] = useState(false);
  return (
    <button
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        await fetch(`/api/tickets/${ticketId}/assign`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ agentId }),
        });
        setBusy(false);
      }}
    >
      Assign
    </button>
  );
}

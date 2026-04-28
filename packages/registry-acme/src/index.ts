import { listTickets } from "./adapters/tickets-list.js";
import { customerById } from "./adapters/customers-by-id.js";
import { conversationsByTicketId } from "./adapters/conversations-by-ticket-id.js";
import { escalateTicket } from "./workflows/tickets-escalate.js";
import { assignAgent } from "./workflows/tickets-assign-agent.js";
import { ticketListBlock } from "./blocks/ticket-list.js";
import { conversationViewBlock } from "./blocks/conversation-view.js";
import { customerSidebarBlock } from "./blocks/customer-sidebar.js";
import { agentHandoffPanelBlock } from "./blocks/agent-handoff-panel.js";
import { escalationQueueBlock } from "./blocks/escalation-queue.js";
import { db } from "./db.js";

export const adapters = {
  "tickets.list": listTickets,
  "customers.by-id": customerById,
  "conversations.by-ticket-id": conversationsByTicketId,
} as const;

export const workflows = {
  "tickets.escalate": escalateTicket,
  "tickets.assign-agent": assignAgent,
} as const;

export const blocks = {
  "support.ticket-list": ticketListBlock,
  "support.conversation-view": conversationViewBlock,
  "support.customer-sidebar": customerSidebarBlock,
  "support.agent-handoff-panel": agentHandoffPanelBlock,
  "support.escalation-queue": escalationQueueBlock,
} as const;

/**
 * Derive customer.id from ticket.id when a route carries the ticket but not
 * the customer. This is the registry's call to make — the ticket→customer
 * relationship is part of Acme Support's data model, not the spec's.
 */
async function enrichContext(rawContext: unknown): Promise<unknown> {
  if (typeof rawContext !== "object" || rawContext === null) return rawContext;
  const ctx = rawContext as Record<string, unknown>;
  const ticketRef = ctx.ticket as { id?: string } | undefined;
  const customerRef = ctx.customer as { id?: string } | undefined;
  if (ticketRef?.id && !customerRef?.id) {
    const ticket = db.tickets.byId(ticketRef.id);
    if (ticket) {
      return { ...ctx, customer: { ...(customerRef ?? {}), id: ticket.customerId } };
    }
  }
  return rawContext;
}

// Typed as Registry so consumers (runtime, composer-generated route handlers)
// can index `registry.blocks[someString]` without TS narrowing the keys to
// the literal id set. The narrow object literal is structurally assignable
// to Registry because adapter/workflow/block schema generics widen via the
// spec's Any* aliases.
import type { Registry } from "@composoft/spec";

export const registry: Registry = {
  name: "acme-support",
  version: "0.0.1",
  adapters,
  workflows,
  blocks,
  enrichContext,
  enrichmentDeclares: ["customer.id"],
};

export type AcmeRegistry = typeof registry;

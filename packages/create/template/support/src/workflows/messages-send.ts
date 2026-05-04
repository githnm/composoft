import { defineWorkflow } from "@composoft/spec";
import { z } from "zod";
import { db } from "../db.js";

const ticketChannel = z.enum(["email", "slack", "web"]);

export const messagesSend = defineWorkflow({
  id: "messages.send",
  version: "0.1.0",
  description:
    "Send a reply on a ticket's conversation. Defaults to the ticket's channel if `channel` is omitted.",
  input: z.object({
    ticketId: z.string(),
    // Trim before validating so an all-whitespace body fails the same way
    // as an empty one. The error message is human-friendly so adopters
    // don't have to translate a generic Zod "String must contain at least
    // 1 character" into UI copy.
    body: z.string().trim().min(1, "reply body cannot be empty"),
    channel: ticketChannel.optional(),
  }),
  output: z.object({
    messageId: z.string(),
    ticketId: z.string(),
  }),
  sideEffects: ["writes to db"],
  run: async ({ ticketId, body, channel }, context) => {
    // The caller's userId comes from the authenticated identity. In demos
    // it's the literal "demo-user" the runtime wraps every request with —
    // an id that isn't seeded in `agents`. We resolve it: a registered
    // agent's name is preferred (and the message is flagged fromAgent=true);
    // anything else is accepted as a free-form sender (fromAgent=false) so
    // demos work without per-environment seeding, while production setups
    // where X-Composoft-User is a real agent id keep their attribution.
    const userId = context.user.id;
    const agent = db.agents.byId(userId);
    const fromName = agent ? agent.name : userId;
    const fromAgent = agent !== null;

    const m = db.conversations.addMessage(ticketId, {
      body,
      channel,
      fromName,
      fromAgent,
    });
    return { messageId: m.id, ticketId };
  },
});

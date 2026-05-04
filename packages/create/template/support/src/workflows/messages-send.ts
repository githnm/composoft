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
    body: z.string().min(1),
    channel: ticketChannel.optional(),
  }),
  output: z.object({
    messageId: z.string(),
    ticketId: z.string(),
  }),
  sideEffects: ["writes to db"],
  run: async ({ ticketId, body, channel }, context) => {
    const m = db.conversations.addMessage(ticketId, {
      body,
      channel,
      fromAgentId: context.user.id,
    });
    return { messageId: m.id, ticketId };
  },
});

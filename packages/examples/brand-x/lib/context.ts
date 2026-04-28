import { z } from "zod";

export const contextSchema = z.object({
  user: z.object({ id: z.string() }),
  ticket: z.object({ id: z.string() }).optional(),
  customer: z.object({ id: z.string() }).optional(),
});

export type Context = z.infer<typeof contextSchema>;

function firstParam(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

export function buildContext(params: Record<string, string | string[] | undefined>): Context {
  const ticketId = firstParam(params.ticketId);
  const customerId = firstParam(params.customerId);
  const ctx: Context = {
    user: { id: "current-user" },
  };
  if (ticketId) ctx.ticket = { id: ticketId };
  if (customerId) ctx.customer = { id: customerId };
  return ctx;
}

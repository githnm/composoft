import { z } from "zod";

export const contextSchema = z.object({
  ticket: z.object({ id: z.string() }).optional(),
  customer: z.object({ id: z.string() }).optional(),
  user: z.object({ id: z.string() }),
});

export type Context = z.infer<typeof contextSchema>;

export function buildContext(
  params: Record<string, string | string[] | undefined>
): Context {
  const ticketIdRaw = params.ticketId;
  const customerIdRaw = params.customerId;
  const ticketId = Array.isArray(ticketIdRaw) ? ticketIdRaw[0] : ticketIdRaw;
  const customerId = Array.isArray(customerIdRaw) ? customerIdRaw[0] : customerIdRaw;

  const ctx: Context = {
    user: { id: "current-user" },
  };

  if (ticketId) ctx.ticket = { id: ticketId };
  if (customerId) ctx.customer = { id: customerId };

  return ctx;
}

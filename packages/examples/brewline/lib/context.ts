import { z } from "zod";

export const contextSchema = z.object({
  user: z.object({ id: z.string() }),
  po: z.object({ id: z.string() }).optional(),
  vendor: z.object({ id: z.string() }).optional(),
});

export type Context = z.infer<typeof contextSchema>;

function firstParam(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

export function buildContext(params: Record<string, string | string[] | undefined>): Context {
  const ctx: Context = {
    user: { id: "current-user" },
  };
  const poId = firstParam(params.poId);
  if (poId) ctx.po = { id: poId };
  const vendorId = firstParam(params.vendorId);
  if (vendorId) ctx.vendor = { id: vendorId };
  return ctx;
}

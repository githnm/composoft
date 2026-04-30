import { z } from "zod";

export const contextSchema = z.object({
  user: z.object({ id: z.string() }),
  po: z.object({ id: z.string() }).partial({ id: true }).optional(),
  vendor: z.object({ id: z.string() }).partial({ id: true }).optional(),
});

export type Context = z.infer<typeof contextSchema>;

function firstParam(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

export function buildContext(params: Record<string, string | string[] | undefined>): Context {
  const poId = firstParam(params.poId);
  const vendorId = firstParam(params.vendorId);
  return {
    user: { id: "current-user" },
    ...(poId ? { po: { id: poId } } : {}),
    ...(vendorId ? { vendor: { id: vendorId } } : {}),
  };
}

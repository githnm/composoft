import { z } from "zod";

export const contextSchema = z.object({
  user: z.object({ id: z.string() }),
  po: z.object({ id: z.string().optional() }).partial(),
  vendor: z.object({ id: z.string().optional() }).partial(),
});

export type Context = z.infer<typeof contextSchema>;

export function buildContext(
  params: Record<string, string | string[] | undefined>,
): Context {
  const pick = (v: string | string[] | undefined): string | undefined =>
    Array.isArray(v) ? v[0] : v;
  return {
    user: { id: "current-user" },
    po: { id: pick(params.poId) },
    vendor: { id: pick(params.vendorId) },
  };
}

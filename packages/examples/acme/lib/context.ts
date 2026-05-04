import { z } from "zod";

export const contextSchema = z.object({
  user: z.object({ id: z.string() }),
});

export type Context = z.infer<typeof contextSchema>;

export function buildContext(
  _params: Record<string, string | string[] | undefined>,
): Context {
  return {
    user: { id: "current-user" },
  };
}

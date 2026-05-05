import { cookies, headers } from "next/headers";

// Server-only header reads — analyzer should flag in limitations.
export function getServerContext() {
  const c = cookies();
  const h = headers();
  return { sessionToken: c.get("sid")?.value, userAgent: h.get("user-agent") };
}

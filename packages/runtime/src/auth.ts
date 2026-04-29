import type { AuthRequest, Identity, Registry } from "@composoft/spec";

/**
 * Auth helpers used by the composer-generated route handlers. Three pieces:
 *
 *   1. `authenticateRequest` — calls `registry.authenticate` if present,
 *      handles the "no hook" warning and the "anonymous" fallback.
 *   2. `authorizeRequest` — calls `registry.authorize` if present.
 *   3. `mergeIdentityIntoContext` — splices the identity into context.user
 *      so workflows and adapters see the real caller via `from-context`.
 *
 * All hook errors return 500 with a generic message — the registry's
 * exception detail never crosses the wire.
 */

export type AuthenticateResult =
  | { ok: true; identity: Identity }
  | { ok: false; status: 401 | 500; error: string };

export type AuthorizeResult =
  | { ok: true }
  | { ok: false; status: 403 | 500; error: string };

let warnedNoAuthenticate = false;

/**
 * Reset the once-per-process warning state. For tests only.
 * @internal
 */
export function _resetAuthWarningForTests(): void {
  warnedNoAuthenticate = false;
}

export async function authenticateRequest(
  registry: Registry,
  request: Request,
): Promise<AuthenticateResult> {
  if (!registry.authenticate) {
    if (!warnedNoAuthenticate) {
      warnedNoAuthenticate = true;
      console.warn(
        "[composoft] No `authenticate` function on registry; allowing all requests as user 'anonymous'. Wire registry.authenticate before deploying.",
      );
    }
    return { ok: true, identity: { userId: "anonymous", claims: {} } };
  }
  try {
    const identity = await registry.authenticate(request);
    if (identity === null) {
      return { ok: false, status: 401, error: "unauthenticated" };
    }
    return { ok: true, identity };
  } catch (e) {
    console.error("[composoft] authenticate threw:", e);
    return { ok: false, status: 500, error: "authentication error" };
  }
}

export async function authorizeRequest(
  registry: Registry,
  identity: Identity,
  authRequest: AuthRequest,
): Promise<AuthorizeResult> {
  if (!registry.authorize) {
    return { ok: true };
  }
  try {
    const allowed = await registry.authorize(identity, authRequest);
    if (!allowed) {
      return { ok: false, status: 403, error: "unauthorized" };
    }
    return { ok: true };
  } catch (e) {
    console.error("[composoft] authorize threw:", e);
    return { ok: false, status: 500, error: "authorization error" };
  }
}

/**
 * Splice identity into `context.user`. `user.id` from the identity is
 * authoritative — claims merge in BEFORE id is set, so a malicious or
 * confused registry that puts `id` in claims cannot override the real
 * `userId`. Any prior `context.user.id` from route params is replaced.
 */
export function mergeIdentityIntoContext(
  context: unknown,
  identity: Identity,
): unknown {
  const base =
    context && typeof context === "object" ? (context as Record<string, unknown>) : {};
  const userBase =
    base.user && typeof base.user === "object" && base.user !== null
      ? (base.user as Record<string, unknown>)
      : {};
  return {
    ...base,
    user: {
      ...userBase,
      ...identity.claims,
      id: identity.userId,
    },
  };
}

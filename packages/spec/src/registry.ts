import { z } from "zod";
import type { AnyAdapter } from "./adapter.js";
import type { AnyWorkflow } from "./workflow.js";
import type { AnyBlock } from "./block.js";

/**
 * One entry in a product's primary navigation. The composer turns these into
 * sidebar links in the generated app's chrome. `icon` is a string name that
 * the generator looks up in `lucide-react` — invalid names render as a
 * default fallback rather than crashing.
 */
export type NavigationItem = {
  readonly label: string;
  readonly path: string;
  readonly icon?: string;
};

/**
 * Optional product/branding metadata a registry may declare. The composer
 * uses this to render real B2B-SaaS chrome (navbar, sidebar, page headers)
 * around the generated app. Registries without a `product` block still work
 * — the generator falls back to a bare layout.
 *
 * Why a registry-level field rather than a per-page one: the registry is
 * the framework-author's surface, and the chrome (product name, accent
 * color, primary nav) is constant across all customers built from one
 * registry. Per-customer overrides happen via the composer's `--customer`
 * flag, not here.
 */
export type ProductInfo = {
  readonly name: string;
  /** CSS color (hex, rgb, named). Threaded into the generated app's theme. */
  readonly accentColor?: string;
  readonly navigation?: ReadonlyArray<NavigationItem>;
};

const navigationItemSchema = z
  .object({
    label: z.string().min(1),
    path: z.string().min(1),
    icon: z.string().min(1).optional(),
  })
  .strict();

export const productInfoSchema = z
  .object({
    name: z.string().min(1, "product.name is required"),
    accentColor: z.string().min(1).optional(),
    navigation: z.array(navigationItemSchema).optional(),
  })
  .strict();

/**
 * Throws on invalid product info, returns the parsed value otherwise.
 * Callers (the composer, registry _test.ts files) use this to surface
 * configuration errors at validation time rather than at render time.
 */
export function validateProductInfo(value: unknown): ProductInfo {
  return productInfoSchema.parse(value);
}

/**
 * Signature for a registry's optional context-enrichment hook. The runtime
 * calls this once per request, after the composer-emitted `buildContext`
 * produces a raw context from route params and before any data slot or
 * action runs. The returned object replaces context for the rest of the
 * render. Use it to derive ambient ids the route doesn't carry.
 */
export type EnrichContextFn = (
  rawContext: unknown,
  registry: Registry,
) => Promise<unknown>;

/**
 * One row of reference data: an id the registry actually uses paired with
 * a human-readable label. Briefs name things by label ("Roastery warehouse");
 * configs need the id (`wh_oakland`). The composer surfaces these to the
 * model so it doesn't hallucinate ids from labels.
 */
export type ReferenceItem = {
  readonly id: string;
  readonly label: string;
};

/**
 * Reference data scoped by a free-form key the registry author picks. Keys
 * are typically the plural noun a block config uses (`warehouses`,
 * `vendors`) or a dotted enum path (`inventory.categories`, `po.statuses`).
 * The shape is intentionally untyped at the spec level — the composer
 * renders it into the prompt as-is.
 */
export type ReferenceData = Readonly<
  Record<string, ReadonlyArray<ReferenceItem>>
>;

/**
 * Optional registry-level function the composer calls during prompt
 * generation. Async because real registries need to query a database.
 */
export type ReferenceDataFn = () => Promise<ReferenceData>;

/**
 * Authenticated caller. `userId` is the registry's stable identifier for the
 * caller (a database user id, an OIDC subject, etc.). `claims` is everything
 * else the registry wants to thread through to workflows and adapters via
 * `context.user` — typically role, tenant, scopes.
 */
export type Identity = {
  readonly userId: string;
  readonly claims: Readonly<Record<string, unknown>>;
};

/**
 * What the runtime hands to `authorize` so the registry can decide whether
 * the caller is allowed to perform this specific operation. Two kinds for
 * the two endpoints the runtime exposes.
 *
 * `params` / `input` carry caller-controlled values (page state for resolve,
 * caller input for action). They are NOT the fully-resolved adapter/workflow
 * arguments — server-side `from-config`/`from-context`/`from-page-state`
 * resolution happens after authorize. Use this hook for "may this caller
 * invoke this workflow on this block at all" decisions; tenancy filtering
 * belongs in workflow/adapter SQL via `context.user.id`.
 */
export type AuthRequest =
  | {
      readonly kind: "action";
      readonly workflowId: string;
      readonly input: unknown;
      readonly blockInstanceId: string;
    }
  | {
      readonly kind: "resolve";
      readonly adapterId: string;
      readonly params: unknown;
      readonly blockInstanceId: string;
      readonly slotName: string;
    };

/**
 * Validate a request and return an Identity, or null to reject as 401.
 * Receives the raw Request so registries can pull JWTs from headers, look
 * up sessions from cookies, integrate Clerk/NextAuth/Auth0/etc.
 *
 * If this function throws, the runtime returns 500 with a generic error
 * (no message leak). Don't return null on internal errors — null means
 * "this caller is not authenticated", which is a 401.
 */
export type AuthenticateFn = (request: Request) => Promise<Identity | null>;

/**
 * Decide whether the authenticated caller may perform this operation.
 * Return false to reject as 403. Throws → 500 (same leak prevention).
 */
export type AuthorizeFn = (
  identity: Identity,
  request: AuthRequest,
) => Promise<boolean>;

/**
 * The public contract every registry package exports. Lives in `@composoft/spec`
 * so registry libraries do not need a dependency on `@composoft/runtime` just
 * to type their export.
 *
 * Schema generics on adapters/workflows/blocks are erased at this storage
 * layer via the `Any*` aliases — see "Type erasure for storage" in the
 * package README.
 */
export type Registry = {
  readonly name: string;
  readonly version: string;
  readonly adapters: Readonly<Record<string, AnyAdapter>>;
  readonly workflows: Readonly<Record<string, AnyWorkflow>>;
  readonly blocks: Readonly<Record<string, AnyBlock>>;
  /**
   * Derive additional fields on the runtime context. The returned object
   * fully replaces context (the runtime does not deep-merge), so
   * implementations typically spread `rawContext` and add fields.
   */
  readonly enrichContext?: EnrichContextFn;
  /**
   * Dot-paths the registry's `enrichContext` will populate on context. The
   * composer's path-existence check unions these into the model-emitted
   * `contextSchemaJson` during validation, so a `from-context` path the
   * route schema doesn't mention but the registry guarantees is still
   * accepted.
   */
  readonly enrichmentDeclares?: readonly string[];
  /**
   * Optional. If present, the composer calls this during prompt generation
   * and includes the result in the user prompt. Use it to surface real ids
   * (warehouse / vendor / category / status keys) so the model writes
   * correct configs instead of guessing from labels in the brief.
   */
  readonly referenceData?: ReferenceDataFn;
  /**
   * Optional. If present, the runtime calls this on every action/resolve
   * request before any other registry logic runs. Returning null → 401.
   * If absent, the runtime warns once per process and treats every caller
   * as `userId: "anonymous"` — fine for demos, NEVER for production.
   */
  readonly authenticate?: AuthenticateFn;
  /**
   * Optional. If present, runs after authenticate. Returning false → 403.
   * If absent, all authenticated callers are allowed.
   */
  readonly authorize?: AuthorizeFn;
  /**
   * Optional product/branding metadata. When present, the composer
   * generates real B2B chrome (navbar, sidebar with the listed nav items,
   * per-page headers). When absent, the generated app falls back to the
   * bare layout — no chrome, just the runtime regions.
   */
  readonly product?: ProductInfo;
};

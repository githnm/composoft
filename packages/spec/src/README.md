# @composoft/spec

The manifest spec for composoft's three primitives: **Adapter**, **Workflow**, **Block**.

This package only defines contracts. It ships no adapters, workflows, or blocks — those live in registry packages such as `@composoft/registry-example-postgres`. Everything downstream (composer, runtime) consumes these types and validators.

## Adapter — a typed query against a data source

```ts
import { z } from "zod";
import { defineAdapter } from "@composoft/spec";

export const listTickets = defineAdapter({
  id: "tickets.list",
  version: "0.1.0",
  description: "List support tickets, optionally filtered by status.",
  params: z.object({ status: z.enum(["open", "closed"]).optional() }),
  output: z.array(
    z.object({ id: z.string(), subject: z.string(), status: z.string() }),
  ),
  run: async ({ status }) => {
    // call the source-of-truth here
    return [];
  },
});
```

## Workflow — a server-side action with documented side effects

```ts
import { z } from "zod";
import { defineWorkflow } from "@composoft/spec";

export const closeTicket = defineWorkflow({
  id: "tickets.close",
  version: "0.1.0",
  description: "Mark a ticket closed and notify the customer.",
  input: z.object({ ticketId: z.string(), reason: z.string() }),
  output: z.object({ ok: z.literal(true) }),
  sideEffects: ["writes to db", "sends email"],
  run: async ({ ticketId, reason }) => {
    // ...
    return { ok: true as const };
  },
});
```

## Block — React component + data needs + action surface + per-customer config

The Block author imports the adapter and workflow definitions to derive types
via `AdapterOutput` and `WorkflowAction` — no redeclaration. (In real use, the
adapter and workflow live in a registry package such as
`@composoft/registry-example-postgres`; they are inlined below for the example.)

```tsx
import { z } from "zod";
import {
  defineAdapter,
  defineBlock,
  defineWorkflow,
  type AdapterOutput,
  type BlockProps,
  type WorkflowAction,
} from "@composoft/spec";

// In real use these come from a registry package.
const listTickets = defineAdapter({
  id: "tickets.list",
  version: "0.1.0",
  description: "List tickets.",
  params: z.object({ status: z.enum(["open", "closed"]).optional() }),
  output: z.array(
    z.object({ id: z.string(), subject: z.string(), status: z.string() }),
  ),
  run: async () => [],
});

const closeTicket = defineWorkflow({
  id: "tickets.close",
  version: "0.1.0",
  description: "Close a ticket.",
  input: z.object({ ticketId: z.string(), reason: z.string() }),
  output: z.object({ ok: z.literal(true) }),
  run: async () => ({ ok: true as const }),
});

const configSchema = z.object({
  defaultStatus: z.enum(["open", "closed"]),
  pageSize: z.number().int().positive(),
});

type Data = { tickets: AdapterOutput<typeof listTickets> };
type Actions = { close: WorkflowAction<typeof closeTicket> };

function TicketList({
  data,
  actions,
  config,
}: BlockProps<z.infer<typeof configSchema>, Data, Actions>) {
  return null; // your UI
}

export const ticketListBlock = defineBlock({
  id: "support.ticket-list",
  version: "0.1.0",
  description: "A paginated list of tickets with a close action.",
  config: configSchema,
  data: {
    tickets: {
      adapter: "tickets.list",
      params: {
        status: { kind: "from-config", path: "defaultStatus" },
      },
    },
  },
  actions: {
    close: { workflow: "tickets.close" },
  },
  component: TicketList,
});
```

### When to use `from-context`

`from-config` covers values the FDE picks once per customer (default filters,
column sets, page sizes). `from-context` covers values that change per render
— the active ticket id, the current user — that the runtime injects at
request time. Rule of thumb: if the value belongs to "this customer's
deployment" use `from-config`; if it belongs to "this user's current view"
use `from-context`. The runtime defines the context shape; common entries
look like `ticket.id`, `customer.id`, and `user.id`.

### Page state coordination

Blocks on the same page can share client-side state. Two manifest declarations and one runtime concept:

- **Read** state in a data slot or action prefill: `{ kind: "from-page-state", path: "selection.itemId" }`. The runtime resolves it on initial render from `composition.initialState`, and re-resolves on the client whenever any block writes to that path.
- **Write** state from a component: declare on the manifest:

  ```ts
  writes: {
    selectedItem: { kind: "page-state", path: "selection.itemId" },
  }
  ```

  The component receives a typed setter on its `writes` prop:

  ```ts
  type Writes = { selectedItem: PageStateWriter<string> };
  function MyBlock({ writes }: BlockProps<Config, Data, Actions, Writes>) {
    return <button onClick={() => writes.selectedItem("itm_001")}>Select</button>;
  }
  ```

When state at a `from-page-state` path changes, the runtime POSTs to a server-side resolve endpoint and re-renders only the affected slot. Other slots stay stable.

Page state is **per-page-instance** — it lives in a React provider and resets on navigation. For cross-page state, use URL params (which arrive via `from-context`).

### Slots that resolve to null or undefined

Two cases where a data slot's data may be null/undefined and the component author must handle it:

- **`from-config` paths that miss when the adapter param is optional** resolve to `undefined`. The adapter's Zod schema accepts it; the component sees a normal output. (See [resolve.ts](https://github.com/githnm/composoft/blob/main/packages/runtime/src/resolve.ts) in the runtime.)
- **`from-page-state` paths that resolve to undefined on initial render** (e.g. nothing selected yet) cause the runtime to **skip the slot entirely**: no adapter call, no output validation, `data[slotName]` is set to `null`. The component should declare `Data = { item: ItemOutput | null }` and render a placeholder for null.

Both cases push correctness to the schema and component layers — the runtime never silently substitutes a wrong value, but it also doesn't 500 on perfectly normal "nothing here yet" states.

### When to use action params

Same idea as `from-context` for data slots, applied to action targets:

- **Row-scoped action target** — the component renders one row per item and acts on that item. The target id is per-click, not ambient. The component supplies it at call time. **No action params needed.** (Example: a ticket list where each row's Escalate button targets its own ticket.)
- **Ambient action target** — the component is scoped to a single ambient entity (the active ticket, the active customer). The target is whatever the runtime context says it is. **Declare it via `actions[*].params` with `from-context`,** and the component never sees the target id. (Example: a single-ticket handoff panel.)

Mixing the two in one block is fine — pre-fill the ambient parts via `params` and keep row/free-form fields on the component-supplied side.

### String ids vs. typed imports — what each is for

The string id in the manifest (`adapter: "tickets.list"`) is for **runtime**
resolution: the registry and composer use it to look up the adapter or
workflow at composition and execution time. The TypeScript import of the
adapter/workflow (`typeof listTickets`) is for **type-time** inference only —
it never appears in the running manifest. The two must stay in sync, and v1
does not enforce that they do; a stale import paired with a renamed id will
typecheck but fail at runtime. A future registry-level check will close the
gap (the registry knows both the id-to-definition map and the manifest, so it
can verify each `data` slot's id corresponds to the imported adapter and that
its output type matches the slot's expected type).

## Validation

```ts
import { validateAdapter, validateWorkflow, validateBlock } from "@composoft/spec";

validateAdapter(listTickets);
validateWorkflow(closeTicket);
validateBlock(ticketListBlock);
```

These run Zod checks on the manifest metadata and confirm the structural presence of schemas / `run` / `component`. They do **not** invoke `run` or render the component.

## Authoring rule: split component and manifest

A Block bundles a server-side concept (config / data / actions schemas) with a client-side concept (a React component that may use hooks). When the runtime renders a composition it dots into the manifest's schemas on the server and passes the component as a reference to a client renderer. This only works if the manifest module is *not* a `"use client"` module — Next.js's RSC boundary forbids server components from accessing properties of values exported from client modules.

**Convention**: split each block into two files. `<name>.component.tsx` starts with `"use client"` and exports the React component only. `<name>.ts` has no directive, imports the component, defines the manifest via `defineBlock(...)`, and exports it. The component file type-imports the manifest's `configSchema` for its prop typing — that's a type-only cycle which is erased at compile time. See `@composoft/registry-example-postgres`'s README for the canonical example.

## Authentication and authorization

Two optional registry-level hooks. Both run on every action and resolve request, before any other registry code.

```ts
import type { AuthenticateFn, AuthorizeFn, Identity } from "@composoft/spec";

const authenticate: AuthenticateFn = async (request) => {
  // pull a JWT, look up a session, call Clerk/NextAuth/Auth0 — your choice.
  // Return Identity to allow; return null to reject as 401.
  // Throws → 500. Don't return null on internal errors.
};

const authorize: AuthorizeFn = async (identity, authRequest) => {
  // Permission gate. Return false → 403.
  // Tenancy filtering belongs in workflow/adapter SQL via context.user.id,
  // not here.
};

export const registry: Registry = { /* ... */, authenticate, authorize };
```

Both are optional. If `authenticate` is missing, the runtime warns once per process and treats every caller as `userId: "anonymous"` — fine for demos, NEVER for production. If `authorize` is missing, all authenticated callers are allowed.

The runtime merges identity into context: `context.user = { ...identity.claims, id: identity.userId }`. **`user.id` from the identity is authoritative** — claims cannot override it, and any prior `context.user.id` from route params is replaced. Workflows receive the merged context as their second argument:

```ts
defineWorkflow({
  // ...
  run: async ({ ticketId, reason }, context) => {
    return db.tickets.update(ticketId, { reason }, context.user.id);
  },
});
```

The framework defines the hooks; the registry implements them. Use any auth library — the runtime calls the hooks with the raw `Request`, so anything that reads from headers/cookies works.

## Reference data

Registries with id-typed config fields (`warehouseId`, `vendorId`) or enum-like fields (categories, statuses) should export a `referenceData` function. The composer calls it during prompt generation and includes the result in the user prompt — without it, the model has to guess ids from human labels in the brief, which produces hallucinations like `warehouseId: "roastery"` when the real id is `wh_oakland`.

```ts
import type { Registry, ReferenceDataFn } from "@composoft/spec";

const referenceData: ReferenceDataFn = async () => ({
  warehouses: (await db.warehouses.list()).map((w) => ({ id: w.id, label: w.name })),
  vendors:    (await db.vendors.list()).map((v)    => ({ id: v.id, label: v.name })),
  "inventory.categories": [
    { id: "green-coffee", label: "Green coffee" },
    { id: "roasted",      label: "Roasted coffee" },
    /* ... */
  ],
});

export const registry: Registry = { /* ... */, referenceData };
```

The function is async because real registries need to query their datastore. Scope keys are free-form strings the registry author picks — typically the plural noun a config field uses, or a dotted enum path. Optional: registries without `referenceData` work fine but the composer can't catch hallucinated ids.

## Type erasure for storage

Manifests are typed *narrowly* at two sites: at construction (`defineAdapter` / `defineWorkflow` / `defineBlock` infer schemas to specific types) and at use (a Block's component prop type sees its config / data / actions concretely). Both rely on the schema generics being precise.

When you key manifests by id in a registry — `Record<string, Adapter>` etc. — those generics get erased. `Adapter`, `Workflow`, and `Block` are *invariant* in their schema type parameters (the schemas appear in both input and output positions of `run`), so a concrete `Adapter<{ status: ... }, ...>` is **not** assignable to the default `Adapter<unknown, unknown>`. Use `AnyAdapter`, `AnyWorkflow`, `AnyBlock` at the storage layer:

```ts
import type { AnyAdapter, AnyBlock, AnyWorkflow } from "@composoft/spec";

export const registry = {
  adapters: {
    "tickets.list": listTickets,
  } as Record<string, AnyAdapter>,
  workflows: { /* ... */ } as Record<string, AnyWorkflow>,
  blocks: { /* ... */ } as Record<string, AnyBlock>,
} as const;
```

The runtime validates Zod schemas at the boundary (adapter params/output, workflow input/output, block config), so the erasure is safe — type information is recovered structurally where it matters.

## Type-inference tradeoff

`Block.data` references adapters by string id, so the component's `data` prop type cannot be derived from the adapters' output schemas in v1. Authors annotate `TData` and `TActions` on their component manually. `TConfig` is inferred from the Zod schema. See the comment on `BlockProps` in [block.ts](./block.ts) for the long version and the planned fix.

`from-context` paths are not type-checked against any context shape in v1, the same caveat as `from-config` paths. A future runtime contract may type the context (e.g. an interface the runtime publishes that the spec consumes), turning typos in `path` into compile errors.

Action params (`ActionRef.params`) use the same `ParamSource` model as data-slot params, so context values can flow into action calls without the component knowing about context. The component-facing signature for an action is the workflow's input minus the keys listed in `params` — the runtime fills those in. v1 does not infer the prefilled-key set from the manifest; authors specify it manually via `WorkflowActionWithPrefilled<T, K>` (passing `K` as a string-literal union) and keep it in sync with the manifest. Zod validation catches structural issues at the manifest level.

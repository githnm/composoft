# @composoft/spec

Manifest contract for [composoft](https://github.com/githnm/composoft) — types and Zod-backed validators for the three primitives: **Adapter**, **Workflow**, **Block**. Zero runtime dependencies on React or Next.js.

> Status: alpha. APIs may change before 0.1.0 final.

## Install

```bash
pnpm add @composoft/spec@alpha
```

Peers: `react ^18 || ^19` (peer; types optional).

## Quick look

```ts
import { defineAdapter } from "@composoft/spec";
import { z } from "zod";

export const listTickets = defineAdapter({
  id: "tickets.list",
  version: "0.1.0",
  description: "List support tickets, optionally filtered by status.",
  params: z.object({ status: z.enum(["open", "closed"]).optional() }),
  output: z.array(z.object({ id: z.string(), subject: z.string() })),
  run: async ({ status }) => {
    // call your data source here
    return [];
  },
});
```

`defineWorkflow` and `defineBlock` follow the same shape. Blocks bundle a React component with a typed `config`, a `data` map of adapter slots, an `actions` map of workflow refs, and an optional `writes` declaration for cross-block page state.

## What this package gives you

- `defineAdapter`, `defineWorkflow`, `defineBlock` — identity functions whose value is type inference.
- `Registry` type — what your registry package exports.
- `validateAdapter` / `validateWorkflow` / `validateBlock` — runtime checks.
- Helper types: `AdapterOutput<T>`, `WorkflowAction<T>`, `WorkflowActionWithPrefilled<T, K>`, `PageStateWriter<T>`.
- Auth contract: `Identity`, `AuthRequest`, `AuthenticateFn`, `AuthorizeFn`.
- Reference data contract: `ReferenceItem`, `ReferenceData`, `ReferenceDataFn`.

For the full spec, the design rationale, and the longer reference, see the [top-level README](https://github.com/githnm/composoft#readme) and [packages/spec/src/README.md](https://github.com/githnm/composoft/blob/main/packages/spec/src/README.md).

## Block components require `"use client"`

Every block's `.component.tsx` file MUST start with `"use client";` as its first line. composoft passes block components through the React Server Component boundary as values; only Client Components can be passed this way.

This is true regardless of whether the component uses hooks. A block that just displays data with no interactive state still needs `"use client"`.

```tsx
"use client";

import type { Props } from "./kpi-row-types.js";

export function KpiRowView({ data }: Props) {
  return <div>{data.metrics.openCount} open</div>;
}
```

If you forget, `next dev` surfaces a confusing framework error: *"Functions cannot be passed directly to Client Components unless you explicitly expose it by marking it with 'use server'."* The error is misleading — the fix is to add `"use client"` to the block component file, not to mark anything as `"use server"`.

To catch this at the registry level instead of in the generated app, every scaffolded registry's `_test.ts` walks `src/blocks/*.component.tsx` and verifies the first line is the directive. The `@composoft/create` templates ship this check by default.

## Page-state writes: pass the leaf value, not a wrapper object

Every entry in a block's `writes` manifest binds a writer to a dot-delimited path. **The value the component passes to that writer is what lands AT the path verbatim** — the runtime does not unwrap or splat it.

```ts
// manifest
writes: {
  selectTicket: { kind: "page-state", path: "selection.ticketId" },
}

// component — correct
writes.selectTicket("tkt_001");
// page state becomes: { selection: { ticketId: "tkt_001" } }

// component — INCORRECT (cold-user footgun)
writes.selectTicket({ ticketId: "tkt_001" });
// page state becomes: { selection: { ticketId: { ticketId: "tkt_001" } } }
// downstream readers of `selection.ticketId` get the OBJECT and Zod fails.
```

If you want the writer to set multiple fields atomically, point it one level shallower:

```ts
// manifest
writes: {
  setSelection: { kind: "page-state", path: "selection" },
}

// component
writes.setSelection({ ticketId: "tkt_001", accountId: "acc_acme" });
// page state becomes: { selection: { ticketId: "...", accountId: "..." } }
// readers of `selection.ticketId` and `selection.accountId` both work.
```

The writer's TypeScript signature should match what the path expects:

```ts
// path "selection.ticketId" → leaf value, type is the leaf's type
type Writes = { selectTicket: PageStateWriter<string> };

// path "selection" → object, type is the full object shape
type Writes = { setSelection: PageStateWriter<{ ticketId: string; accountId: string }> };
```

Mismatched writer types compile but fail at runtime when the page-state reader receives an unexpected shape.

## Versioning

Follows semver. `0.1.0-alpha.x` is the first published series — expect spec-level changes between alpha tags.

## License

MIT. See [LICENSE](https://github.com/githnm/composoft/blob/main/LICENSE).

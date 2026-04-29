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

## Versioning

Follows semver. `0.1.0-alpha.x` is the first published series — expect spec-level changes between alpha tags.

## License

MIT. See [LICENSE](https://github.com/githnm/composoft/blob/main/LICENSE).

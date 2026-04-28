# @composoft/registry-acme

Acme Support's published library: 3 adapters, 2 workflows, 5 blocks. Consumed by `@composoft/composer` and `@composoft/runtime` to compose per-customer support UIs.

## Authoring blocks

Split each block into two files:

- `<name>.component.tsx` — starts with `"use client"`, exports the React component only.
- `<name>.ts` — no directive, imports the component, defines the manifest with `defineBlock(...)`, exports it.

The manifest must be importable from a server component for the runtime to read its schemas, data slots, and action refs. The component is referenced by the manifest but never dereferenced on the server — the runtime passes it as a client reference to its renderer (`<ComposoftBlockHost>`).

```
src/blocks/
├── ticket-list.component.tsx   ("use client" + the component)
└── ticket-list.ts              (manifest, no directive)
```

The component file type-imports `configSchema` from the manifest file (`import type { configSchema } from "./ticket-list.js"`) and uses `z.infer<typeof configSchema>` for its props. This creates a TS-only cycle that is erased at compile time, so there is no runtime cycle.

## Layout

```
src/
├── adapters/                   (per-adapter file)
├── workflows/                  (per-workflow file)
├── blocks/
│   ├── <name>.ts               (manifest)
│   └── <name>.component.tsx    (component)
├── db.ts                       (in-memory data layer)
├── index.ts                    (registry export, including enrichContext)
└── _test.ts                    (registry self-validation)
```

## Context enrichment

The registry exports an `enrichContext` hook that derives `customer.id` from `ticket.id` via the in-memory store, and declares `enrichmentDeclares: ["customer.id"]` so the composer's path validator accepts blocks that read `customer.id` from context even when no route param carries it.

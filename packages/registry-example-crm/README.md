# @composoft/registry-example-crm

A fully **in-memory CRM registry** — no database, no env vars, no setup beyond `pnpm install`. Used for the per-customer-tailoring demo: one registry, two generated apps (Northwind, Acme), wildly different layouts.

> Status: alpha. Not published to npm — `private: true`. The package lives in the workspace so the composer can resolve it.

## What's in here

```
src/
├── db.ts                          in-memory store with seed data
├── adapters/                      typed reads
│   ├── leads-list.ts              list leads, optional status filter
│   ├── leads-by-id.ts             single lead lookup
│   ├── deals-list.ts              list deals, optional stage filter
│   ├── deals-by-id.ts             single deal lookup
│   ├── contacts-list.ts           contacts on a deal
│   ├── activities-list.ts         activity feed (global or scoped)
│   └── reps-list.ts               sales reps + per-rep deal totals
├── workflows/                     typed writes
│   ├── leads-convert.ts           lead → new deal
│   ├── deals-move-stage.ts        change a deal's stage
│   ├── deals-assign-rep.ts        assign / reassign a deal owner
│   ├── activities-log.ts          append a call / email / note
│   └── deals-close.ts             closed-won or closed-lost
├── blocks/                        UI surface (manifest + component)
│   ├── deal-pipeline.{ts,component.tsx}
│   ├── lead-list.{ts,component.tsx}
│   ├── deal-detail.{ts,component.tsx}
│   ├── activity-feed.{ts,component.tsx}
│   ├── contact-card.{ts,component.tsx}
│   └── rep-leaderboard.{ts,component.tsx}
├── index.ts                       registry export with product info
└── _test.ts                       manifest validation
```

7 adapters, 5 workflows, 6 blocks, 5 referenceData scopes. Zero runtime dependencies on a database.

## Run the tests

```bash
pnpm --filter @composoft/registry-example-crm test
```

Should print `OK — registry "example-crm@0.0.1" passed: 7 adapters, 5 workflows, 6 blocks, ...`.

## Compose an app against it

From the workspace root:

```bash
export ANTHROPIC_API_KEY=sk-ant-...

# Northwind: enterprise sales, MEDDIC-style
pnpm --filter @composoft/composer compose:northwind

# Acme: high-velocity inside sales
pnpm --filter @composoft/composer compose:acme
```

Each command writes a Next.js app into `packages/examples/<customer>/` against the same registry. The registry is identical; the layouts diverge because the customer briefs differ.

## Why no database

Two reasons:

1. **The demo runs in 30 seconds, on any machine, with no setup.** A Postgres example exists separately at `@composoft/registry-example-postgres` for the production-grade story. This one is for showing the per-customer-tailoring story without forcing the reader to spin up a database first.
2. **It exercises the spec's surface.** The registry hits enough of the spec — referenceData, page-state writers, multi-region blocks, action params, enrichContext-free baseline — to be a meaningful conformance test.

The downside: every change is lost on process exit, and there's no audit trail. Don't deploy this as-is. Replace `src/db.ts` with a real client (Postgres via `pg`, Supabase, Prisma, whatever) and the rest of the registry continues to work without touching adapters, workflows, or blocks.

## Auth

`authenticate` trusts `X-Composoft-User` from the request header — same placeholder as the Postgres example. Anyone calling the API can claim to be anyone. Replace with a real session/JWT check before deploying.

## License

MIT. See [LICENSE](https://github.com/githnm/composoft/blob/main/LICENSE).

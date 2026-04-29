# @composoft/registry-example-postgres

Canonical Postgres-backed reference registry. A fictional specialty coffee brand's inventory and procurement library — six adapters, four workflows, six blocks. Use it as the starting point for your own registry.

## What this is

A working registry against a real datastore. `src/db.ts` is a `pg.Pool` with parameterized queries, transactions, and `json_agg` for one-round-trip joins. Adapters and workflows call into `db`; the rest of the registry never knows about Postgres.

## Schema

Six tables, defined in [seed/001_schema.sql](seed/001_schema.sql):

- `warehouses (id, name)` — small lookup; joined inline.
- `vendors (id, name, contact_email, payment_terms, category)` — `category` constrained to `beans | packaging | equipment`.
- `inventory_items (id, sku, name, category, warehouse_id → warehouses, quantity_on_hand, reorder_point, unit_cost, vendor_id → vendors)` — `category` is the item-side enum (`green-coffee | roasted | packaging | equipment`).
- `purchase_orders (id, po_number, vendor_id, status, created_at, approved_at, received_at, total_amount, currency)` — `status` is `draft | approved | received | partial`.
- `po_line_items (po_id → purchase_orders, item_id → inventory_items, quantity, unit_cost)` — `ON DELETE CASCADE` from PO.
- `audit_log (action, entity_id, actor, details jsonb, at)` — every state-changing workflow writes one entry. The `details` JSONB carries action-specific shape (e.g. `{delta, reason, newQuantity}` for `inventory.adjust-stock`).

Indexed on the obvious lookup paths (`warehouse_id`, `vendor_id`, `status`, `entity_id`, `po_id`).

## Setup

```bash
# Local Postgres
export DATABASE_URL=postgres://user:pass@localhost:5432/composoft_example

# Or any hosted provider — Supabase / Neon / Render / Railway
export DATABASE_URL=postgres://user:pass@hostname:port/dbname

pnpm --filter @composoft/registry-example-postgres seed     # creates schema + fixtures (idempotent)
pnpm --filter @composoft/registry-example-postgres build    # compile TS
pnpm --filter @composoft/registry-example-postgres smoke    # one query per adapter against the live DB
```

`pnpm test` runs manifest validation only and does not need a database.

**The composer also needs `DATABASE_URL` at compose time** when using this registry — `referenceData()` queries `warehouses` and `vendors` so the model gets real ids. Without it, the composer logs a warning and continues; the model may then hallucinate ids.

### SSL

`db.ts` reads an env var `COMPOSOFT_PG_SSL`:

| Value | Behavior |
|---|---|
| `require` / `true` / `1` | Force SSL on, accept self-signed certs (`rejectUnauthorized: false`). |
| `disable` / `false` / `0` | SSL off; let the pg client default for the URL. |
| unset | Auto-detect: hostnames ending in `.supabase.co`, `.supabase.com`, `.neon.tech`, or `.render.com` enable SSL with a one-time warning. Everything else gets no SSL config. |

This means the `DATABASE_URL` for a hosted provider does **not** need `?sslmode=...` query params — the pool just enables SSL at the right strictness for that host. For high-trust prod setups, install the provider's CA chain and remove the `rejectUnauthorized: false` line in `db.ts`.

The seed inserts: 2 warehouses, 5 vendors, 30 inventory items (10 green / 8 roasted / 8 packaging / 4 equipment), and 12 purchase orders distributed evenly across the four statuses.

## The pattern

Adapters separate from the data layer on purpose. Look at any adapter, e.g. [src/adapters/inventory-items-list.ts](src/adapters/inventory-items-list.ts):

```ts
import { defineAdapter } from "@composoft/spec";
import { z } from "zod";
import { db } from "../db.js";

export const inventoryItemsList = defineAdapter({
  id: "inventory-items.list",
  // ... params, output schemas ...
  run: async (params) => {
    return db.inventoryItems.list(params);
  },
});
```

The adapter is a Zod-validated boundary that calls into `db`. The spec doesn't know about Postgres. The blocks don't know about Postgres. The runtime doesn't know about Postgres. **Replace `src/db.ts` with anything else and the rest of the registry is unchanged.**

## Adapting to Supabase

Replace the Postgres pool with a Supabase client and rewrite `src/db.ts`'s methods to use `from(...).select(...)`:

```ts
import { createClient } from "@supabase/supabase-js";
const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_KEY!);

// Equivalent of db.inventoryItems.list:
const { data, error } = await supabase
  .from("inventory_items")
  .select("*, warehouses(name), vendors(name)")
  .match({ warehouse_id: filter.warehouseId, vendor_id: filter.vendorId })
  .order("name");
```

That's basically all that changes. No schema migration. The adapter and workflow code is untouched.

## Adapting to DuckDB

Same pattern, different client. Parameter syntax is `?` instead of `$1`:

```ts
import { DuckDBInstance } from "@duckdb/node-api";
const conn = (await DuckDBInstance.create(":memory:")).connect();

const result = await conn.runAndReadAll(
  `SELECT i.*, w.name AS warehouse_name FROM inventory_items i
   JOIN warehouses w ON w.id = i.warehouse_id WHERE i.warehouse_id = ?`,
  [filter.warehouseId],
);
```

Schema DDL is mostly compatible (drop the `serial` types in favor of explicit sequences, drop `jsonb` for `JSON`).

## Authentication (placeholder!)

The `authenticate` hook reads `X-Composoft-User` from the request header and trusts it. **Anyone calling the API can claim to be anyone.** Fine for local demos and the smoke flow; never for production.

```bash
# Hits the action endpoint as user "hoshang"
curl -X POST http://localhost:3000/api/composoft/action \
  -H "Content-Type: application/json" \
  -H "X-Composoft-User: hoshang" \
  -d '{"blockInstanceId":"home-inventory","actionName":"adjustStock", \
       "input":{"itemId":"itm_001","delta":10,"reason":"manual"}, \
       "context":{"user":{"id":"current-user"}},"pageState":{}}'
```

The `audit_log.actor` column for that request will be `hoshang`. The runtime overrides `context.user.id` from the route — the registry's `authenticate` is authoritative.

Real implementations:

- **JWT**: validate with `jose` or `jsonwebtoken`. Pull from `Authorization: Bearer …`.
- **NextAuth / Clerk / Auth0**: call their server-side `getSession`/`auth()` from inside `authenticate`.
- **Custom session**: parse a cookie, look up a row in your sessions table.

The `authorize` placeholder allows everything. Real implementations check `identity.claims.role` against the `AuthRequest` and rely on the workflows/adapters for tenancy filtering via `context.user.id`.

## What this teaches

The composoft spec is portable across datastores because adapters are the only place datastore code lives. Blocks render React. Workflows orchestrate side effects via `db`. The runtime resolves data slots by calling `adapter.run(params)`. None of those layers ever mention the word "Postgres" — the only file that does is `src/db.ts`.

Want SQLite for local dev and Postgres in prod? Two `db.ts` files behind an env switch. Want to migrate from Mongo to Postgres? Rewrite `db.ts`, leave the rest alone. The spec is the contract, the adapters are the boundary, everything else doesn't care.

// Postgres data layer for the example registry. Adapters and workflows in
// this package call into `db`; the rest of the registry never knows about pg.
//
// To adapt this layer to Supabase: replace the pg Pool with createClient from
// @supabase/supabase-js, and use `.from('table').select(...)` queries.
// To adapt to DuckDB: replace pg with @duckdb/node-api and change parameter
// markers from $1 to ?.

import pg from "pg";

const { Pool } = pg;

let _pool: pg.Pool | null = null;

const HOSTED_PG_SUFFIXES = [
  ".supabase.co",
  ".supabase.com",
  ".neon.tech",
  ".render.com",
];

/**
 * SSL config for the pg pool / client. Behavior:
 *
 *   COMPOSOFT_PG_SSL=require|true|1   → SSL on, accept self-signed.
 *   COMPOSOFT_PG_SSL=disable|false|0  → SSL off (lets pg default for the URL).
 *   unset                             → auto-detect by hostname; if it ends in a
 *                                       known hosted-Postgres suffix
 *                                       (Supabase, Neon, Render), enable SSL
 *                                       with a one-time warning.
 *
 * `rejectUnauthorized: false` is intentional. Hosted Postgres providers
 * present self-signed certs in the chain; the connection is still
 * encrypted, we just don't try to verify the chain. For high-trust prod
 * setups, install the provider's CA and remove this flag.
 */
export function pgSslConfig(
  connectionString: string,
): { rejectUnauthorized: false } | undefined {
  const env = (process.env.COMPOSOFT_PG_SSL ?? "").toLowerCase();
  if (env === "require" || env === "true" || env === "1") {
    return { rejectUnauthorized: false };
  }
  if (env === "disable" || env === "false" || env === "0") {
    return undefined;
  }
  try {
    const u = new URL(connectionString);
    if (HOSTED_PG_SUFFIXES.some((s) => u.hostname.endsWith(s))) {
      console.warn(
        `Detected hosted Postgres provider (${u.hostname}); enabling SSL. ` +
          `Set COMPOSOFT_PG_SSL=disable to override.`,
      );
      return { rejectUnauthorized: false };
    }
  } catch {
    // not a parseable URL; fall through to no-SSL default
  }
  return undefined;
}

function pool(): pg.Pool {
  if (_pool) return _pool;
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not set. The example registry needs a running Postgres database — see README for setup.",
    );
  }
  const ssl = pgSslConfig(connectionString);
  _pool = new Pool(ssl ? { connectionString, ssl } : { connectionString });
  return _pool;
}

async function tx<T>(fn: (client: pg.PoolClient) => Promise<T>): Promise<T> {
  const client = await pool().connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

// --- Domain types ---------------------------------------------------------

export type Warehouse = { id: string; name: string };

export type VendorCategory = "beans" | "packaging" | "equipment";

export type Vendor = {
  id: string;
  name: string;
  contactEmail: string | null;
  paymentTerms: string | null;
  category: VendorCategory;
};

export type ItemCategory = "green-coffee" | "roasted" | "packaging" | "equipment";

export type InventoryItem = {
  id: string;
  sku: string;
  name: string;
  category: ItemCategory;
  warehouseId: string;
  warehouseName: string;
  quantityOnHand: number;
  reorderPoint: number;
  unitCost: number;
  vendorId: string;
  vendorName: string;
};

export type PoStatus = "draft" | "approved" | "received" | "partial";

export type PoLineItem = {
  id: number;
  itemId: string;
  itemName: string;
  itemSku: string;
  quantity: number;
  unitCost: number;
};

export type PurchaseOrder = {
  id: string;
  poNumber: string;
  vendorId: string;
  vendorName: string;
  status: PoStatus;
  createdAt: string;
  approvedAt: string | null;
  receivedAt: string | null;
  totalAmount: number;
  currency: string;
  lineItems: PoLineItem[];
};

export type AuditEntry = {
  id: number;
  action: string;
  entityId: string;
  actor: string;
  details: Record<string, unknown>;
  at: string;
};

// --- Row mappers ----------------------------------------------------------

const N = (v: unknown) => Number(v);
const S = (v: unknown) => (v === null || v === undefined ? null : String(v));

function mapWarehouse(r: pg.QueryResultRow): Warehouse {
  return { id: String(r.id), name: String(r.name) };
}

function mapVendor(r: pg.QueryResultRow): Vendor {
  return {
    id: String(r.id),
    name: String(r.name),
    contactEmail: S(r.contact_email),
    paymentTerms: S(r.payment_terms),
    category: r.category as VendorCategory,
  };
}

function mapItem(r: pg.QueryResultRow): InventoryItem {
  return {
    id: String(r.id),
    sku: String(r.sku),
    name: String(r.name),
    category: r.category as ItemCategory,
    warehouseId: String(r.warehouse_id),
    warehouseName: String(r.warehouse_name),
    quantityOnHand: N(r.quantity_on_hand),
    reorderPoint: N(r.reorder_point),
    unitCost: N(r.unit_cost),
    vendorId: String(r.vendor_id),
    vendorName: String(r.vendor_name),
  };
}

function mapPo(r: pg.QueryResultRow): PurchaseOrder {
  const rawLines = (r.line_items as unknown[] | null) ?? [];
  const lineItems: PoLineItem[] = rawLines
    .filter((x): x is Record<string, unknown> => x !== null && typeof x === "object")
    .map((l) => ({
      id: N(l.id),
      itemId: String(l.itemId),
      itemName: String(l.itemName),
      itemSku: String(l.itemSku),
      quantity: N(l.quantity),
      unitCost: N(l.unitCost),
    }));
  return {
    id: String(r.id),
    poNumber: String(r.po_number),
    vendorId: String(r.vendor_id),
    vendorName: String(r.vendor_name),
    status: r.status as PoStatus,
    createdAt: new Date(r.created_at as string | Date).toISOString(),
    approvedAt: r.approved_at ? new Date(r.approved_at as string | Date).toISOString() : null,
    receivedAt: r.received_at ? new Date(r.received_at as string | Date).toISOString() : null,
    totalAmount: N(r.total_amount),
    currency: String(r.currency),
    lineItems,
  };
}

function mapAudit(r: pg.QueryResultRow): AuditEntry {
  return {
    id: N(r.id),
    action: String(r.action),
    entityId: String(r.entity_id),
    actor: String(r.actor),
    details: (r.details as Record<string, unknown>) ?? {},
    at: new Date(r.at as string | Date).toISOString(),
  };
}

// --- db ------------------------------------------------------------------

export const db = {
  warehouses: {
    async list(): Promise<Warehouse[]> {
      const { rows } = await pool().query("SELECT id, name FROM warehouses ORDER BY name");
      return rows.map(mapWarehouse);
    },
    async byId(id: string): Promise<Warehouse | null> {
      const { rows } = await pool().query("SELECT id, name FROM warehouses WHERE id = $1", [id]);
      return rows[0] ? mapWarehouse(rows[0]) : null;
    },
  },

  vendors: {
    async list(filter: { category?: VendorCategory } = {}): Promise<Vendor[]> {
      const where: string[] = [];
      const params: unknown[] = [];
      if (filter.category !== undefined) {
        params.push(filter.category);
        where.push(`category = $${params.length}`);
      }
      const sql = `SELECT id, name, contact_email, payment_terms, category FROM vendors${
        where.length ? ` WHERE ${where.join(" AND ")}` : ""
      } ORDER BY name`;
      const { rows } = await pool().query(sql, params);
      return rows.map(mapVendor);
    },
    async byId(id: string): Promise<Vendor | null> {
      const { rows } = await pool().query(
        "SELECT id, name, contact_email, payment_terms, category FROM vendors WHERE id = $1",
        [id],
      );
      return rows[0] ? mapVendor(rows[0]) : null;
    },
    async openPoCount(vendorId: string): Promise<number> {
      const { rows } = await pool().query(
        "SELECT COUNT(*)::int AS n FROM purchase_orders WHERE vendor_id = $1 AND status IN ('draft','approved','partial')",
        [vendorId],
      );
      return N(rows[0]?.n ?? 0);
    },
  },

  inventoryItems: {
    async list(
      filter: {
        warehouseId?: string;
        vendorId?: string;
        category?: ItemCategory;
        lowStock?: boolean;
      } = {},
    ): Promise<InventoryItem[]> {
      const where: string[] = [];
      const params: unknown[] = [];
      if (filter.warehouseId !== undefined) {
        params.push(filter.warehouseId);
        where.push(`i.warehouse_id = $${params.length}`);
      }
      if (filter.vendorId !== undefined) {
        params.push(filter.vendorId);
        where.push(`i.vendor_id = $${params.length}`);
      }
      if (filter.category !== undefined) {
        params.push(filter.category);
        where.push(`i.category = $${params.length}`);
      }
      if (filter.lowStock === true) {
        where.push("i.quantity_on_hand <= i.reorder_point");
      }
      const sql = `
        SELECT i.id, i.sku, i.name, i.category,
               i.warehouse_id, w.name AS warehouse_name,
               i.quantity_on_hand, i.reorder_point, i.unit_cost,
               i.vendor_id, v.name AS vendor_name
        FROM inventory_items i
        JOIN warehouses w ON w.id = i.warehouse_id
        JOIN vendors v ON v.id = i.vendor_id
        ${where.length ? ` WHERE ${where.join(" AND ")}` : ""}
        ORDER BY i.name
      `;
      const { rows } = await pool().query(sql, params);
      return rows.map(mapItem);
    },

    async byId(id: string): Promise<InventoryItem | null> {
      const { rows } = await pool().query(
        `SELECT i.id, i.sku, i.name, i.category,
                i.warehouse_id, w.name AS warehouse_name,
                i.quantity_on_hand, i.reorder_point, i.unit_cost,
                i.vendor_id, v.name AS vendor_name
         FROM inventory_items i
         JOIN warehouses w ON w.id = i.warehouse_id
         JOIN vendors v ON v.id = i.vendor_id
         WHERE i.id = $1`,
        [id],
      );
      return rows[0] ? mapItem(rows[0]) : null;
    },

    async adjustStock(
      id: string,
      delta: number,
      reason: string,
      actor = "system",
    ): Promise<InventoryItem> {
      return tx(async (client) => {
        const { rows } = await client.query(
          `UPDATE inventory_items
           SET quantity_on_hand = quantity_on_hand + $2
           WHERE id = $1
           RETURNING id, sku, name, category, warehouse_id,
                     quantity_on_hand, reorder_point, unit_cost, vendor_id`,
          [id, delta],
        );
        if (rows.length === 0) {
          throw new Error(`inventory item ${id} not found`);
        }
        await client.query(
          `INSERT INTO audit_log (action, entity_id, actor, details)
           VALUES ('inventory.adjust-stock', $1, $2, $3::jsonb)`,
          [id, actor, JSON.stringify({ delta, reason, newQuantity: rows[0]?.quantity_on_hand })],
        );

        // Re-read with joins to return the full shape.
        const refreshed = await client.query(
          `SELECT i.id, i.sku, i.name, i.category,
                  i.warehouse_id, w.name AS warehouse_name,
                  i.quantity_on_hand, i.reorder_point, i.unit_cost,
                  i.vendor_id, v.name AS vendor_name
           FROM inventory_items i
           JOIN warehouses w ON w.id = i.warehouse_id
           JOIN vendors v ON v.id = i.vendor_id
           WHERE i.id = $1`,
          [id],
        );
        return mapItem(refreshed.rows[0]!);
      });
    },

    async recentAdjustments(itemId: string, limit = 10): Promise<AuditEntry[]> {
      const { rows } = await pool().query(
        `SELECT id, action, entity_id, actor, details, at
         FROM audit_log
         WHERE entity_id = $1 AND action = 'inventory.adjust-stock'
         ORDER BY at DESC
         LIMIT $2`,
        [itemId, limit],
      );
      return rows.map(mapAudit);
    },
  },

  purchaseOrders: {
    async list(filter: { status?: PoStatus; vendorId?: string } = {}): Promise<PurchaseOrder[]> {
      const where: string[] = [];
      const params: unknown[] = [];
      if (filter.status !== undefined) {
        params.push(filter.status);
        where.push(`p.status = $${params.length}`);
      }
      if (filter.vendorId !== undefined) {
        params.push(filter.vendorId);
        where.push(`p.vendor_id = $${params.length}`);
      }
      const sql = `
        SELECT p.id, p.po_number, p.vendor_id, v.name AS vendor_name,
               p.status, p.created_at, p.approved_at, p.received_at,
               p.total_amount, p.currency,
               COALESCE(json_agg(
                 json_build_object(
                   'id', li.id,
                   'itemId', li.item_id,
                   'itemName', it.name,
                   'itemSku', it.sku,
                   'quantity', li.quantity,
                   'unitCost', li.unit_cost
                 ) ORDER BY li.id
               ) FILTER (WHERE li.id IS NOT NULL), '[]'::json) AS line_items
        FROM purchase_orders p
        JOIN vendors v ON v.id = p.vendor_id
        LEFT JOIN po_line_items li ON li.po_id = p.id
        LEFT JOIN inventory_items it ON it.id = li.item_id
        ${where.length ? ` WHERE ${where.join(" AND ")}` : ""}
        GROUP BY p.id, v.name
        ORDER BY p.created_at DESC
      `;
      const { rows } = await pool().query(sql, params);
      return rows.map(mapPo);
    },

    async byId(id: string): Promise<PurchaseOrder | null> {
      const { rows } = await pool().query(
        `SELECT p.id, p.po_number, p.vendor_id, v.name AS vendor_name,
                p.status, p.created_at, p.approved_at, p.received_at,
                p.total_amount, p.currency,
                COALESCE(json_agg(
                  json_build_object(
                    'id', li.id,
                    'itemId', li.item_id,
                    'itemName', it.name,
                    'itemSku', it.sku,
                    'quantity', li.quantity,
                    'unitCost', li.unit_cost
                  ) ORDER BY li.id
                ) FILTER (WHERE li.id IS NOT NULL), '[]'::json) AS line_items
         FROM purchase_orders p
         JOIN vendors v ON v.id = p.vendor_id
         LEFT JOIN po_line_items li ON li.po_id = p.id
         LEFT JOIN inventory_items it ON it.id = li.item_id
         WHERE p.id = $1
         GROUP BY p.id, v.name`,
        [id],
      );
      return rows[0] ? mapPo(rows[0]) : null;
    },

    async create(input: {
      id: string;
      poNumber: string;
      vendorId: string;
      lineItems: Array<{ itemId: string; quantity: number; unitCost: number }>;
      actor?: string;
    }): Promise<PurchaseOrder> {
      const total = input.lineItems.reduce((s, l) => s + l.quantity * l.unitCost, 0);
      return tx(async (client) => {
        await client.query(
          `INSERT INTO purchase_orders (id, po_number, vendor_id, status, total_amount)
           VALUES ($1, $2, $3, 'draft', $4)`,
          [input.id, input.poNumber, input.vendorId, total],
        );
        for (const l of input.lineItems) {
          await client.query(
            `INSERT INTO po_line_items (po_id, item_id, quantity, unit_cost)
             VALUES ($1, $2, $3, $4)`,
            [input.id, l.itemId, l.quantity, l.unitCost],
          );
        }
        await client.query(
          `INSERT INTO audit_log (action, entity_id, actor, details)
           VALUES ('purchase-orders.create', $1, $2, $3::jsonb)`,
          [input.id, input.actor ?? "system", JSON.stringify({ poNumber: input.poNumber, total })],
        );
        const out = await this.byId(input.id);
        if (!out) throw new Error(`purchase order ${input.id} not found after insert`);
        return out;
      });
    },

    async update(
      id: string,
      patch: { status?: PoStatus },
      actor = "system",
    ): Promise<PurchaseOrder> {
      return tx(async (client) => {
        const { rows: existing } = await client.query(
          "SELECT id, status FROM purchase_orders WHERE id = $1",
          [id],
        );
        if (existing.length === 0) {
          throw new Error(`purchase order ${id} not found`);
        }
        if (patch.status !== undefined) {
          const sets: string[] = ["status = $2"];
          if (patch.status === "approved") sets.push("approved_at = now()");
          if (patch.status === "received" || patch.status === "partial")
            sets.push("received_at = now()");
          await client.query(
            `UPDATE purchase_orders SET ${sets.join(", ")} WHERE id = $1`,
            [id, patch.status],
          );
          await client.query(
            `INSERT INTO audit_log (action, entity_id, actor, details)
             VALUES ('purchase-orders.update', $1, $2, $3::jsonb)`,
            [id, actor, JSON.stringify({ from: existing[0]?.status, to: patch.status })],
          );
        }
        const out = await this.byId(id);
        if (!out) throw new Error(`purchase order ${id} not found after update`);
        return out;
      });
    },
  },

  kpis: {
    /**
     * Aggregate dashboard KPIs in a single round-trip. `warehouseId` (optional)
     * scopes the inventory metrics. PO metrics are global (a PO can pull
     * from multiple warehouses; scoping it would be misleading).
     */
    async summary(filter: { warehouseId?: string } = {}): Promise<{
      totalSkus: number;
      lowStockCount: number;
      openPoCount: number;
      openSpend: number;
    }> {
      const wid = filter.warehouseId ?? null;
      const { rows } = await pool().query(
        `WITH inv AS (
           SELECT
             COUNT(*)::int AS total_skus,
             COUNT(*) FILTER (WHERE quantity_on_hand <= reorder_point)::int AS low_stock_count
           FROM inventory_items
           WHERE ($1::text IS NULL OR warehouse_id = $1)
         ),
         po AS (
           SELECT
             COUNT(*)::int AS open_po_count,
             COALESCE(SUM(total_amount), 0)::numeric AS open_spend
           FROM purchase_orders
           WHERE status IN ('draft', 'approved', 'partial')
         )
         SELECT inv.total_skus, inv.low_stock_count, po.open_po_count, po.open_spend
         FROM inv, po`,
        [wid],
      );
      const r = rows[0];
      if (!r) {
        throw new Error("kpis.summary returned no rows");
      }
      return {
        totalSkus: Number(r.total_skus),
        lowStockCount: Number(r.low_stock_count),
        openPoCount: Number(r.open_po_count),
        openSpend: Number(r.open_spend),
      };
    },
  },

  auditLog: {
    async write(entry: Omit<AuditEntry, "id" | "at">): Promise<AuditEntry> {
      const { rows } = await pool().query(
        `INSERT INTO audit_log (action, entity_id, actor, details)
         VALUES ($1, $2, $3, $4::jsonb)
         RETURNING id, action, entity_id, actor, details, at`,
        [entry.action, entry.entityId, entry.actor, JSON.stringify(entry.details)],
      );
      return mapAudit(rows[0]!);
    },

    async list(filter: { entityId?: string; action?: string; limit?: number } = {}): Promise<AuditEntry[]> {
      const where: string[] = [];
      const params: unknown[] = [];
      if (filter.entityId !== undefined) {
        params.push(filter.entityId);
        where.push(`entity_id = $${params.length}`);
      }
      if (filter.action !== undefined) {
        params.push(filter.action);
        where.push(`action = $${params.length}`);
      }
      params.push(filter.limit ?? 100);
      const sql = `SELECT id, action, entity_id, actor, details, at
        FROM audit_log
        ${where.length ? ` WHERE ${where.join(" AND ")}` : ""}
        ORDER BY at DESC
        LIMIT $${params.length}`;
      const { rows } = await pool().query(sql, params);
      return rows.map(mapAudit);
    },
  },
};

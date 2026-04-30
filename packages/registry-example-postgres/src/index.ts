import type {
  AuthenticateFn,
  AuthorizeFn,
  Registry,
} from "@composoft/spec";

import { vendorsList } from "./adapters/vendors-list.js";
import { vendorById } from "./adapters/vendors-by-id.js";
import { inventoryItemsList } from "./adapters/inventory-items-list.js";
import { inventoryItemById } from "./adapters/inventory-items-by-id.js";
import { purchaseOrdersList } from "./adapters/purchase-orders-list.js";
import { purchaseOrderById } from "./adapters/purchase-orders-by-id.js";
import { kpisSummary } from "./adapters/kpis-summary.js";

import { adjustStock } from "./workflows/inventory-adjust-stock.js";
import { createPurchaseOrder } from "./workflows/purchase-orders-create.js";
import { approvePurchaseOrder } from "./workflows/purchase-orders-approve.js";
import { receivePurchaseOrder } from "./workflows/purchase-orders-receive.js";

import { opsKpiCardsBlock } from "./blocks/kpi-cards.js";
import { opsInventoryTableBlock } from "./blocks/inventory-table.js";
import { opsItemDetailSidebarBlock } from "./blocks/item-detail-sidebar.js";
import { opsLowStockAlertsBlock } from "./blocks/low-stock-alerts.js";
import { opsPoListBlock } from "./blocks/po-list.js";
import { opsPoDetailBlock } from "./blocks/po-detail.js";
import { opsVendorSidebarBlock } from "./blocks/vendor-sidebar.js";

import { db } from "./db.js";

export const adapters = {
  "vendors.list": vendorsList,
  "vendors.by-id": vendorById,
  "inventory-items.list": inventoryItemsList,
  "inventory-items.by-id": inventoryItemById,
  "purchase-orders.list": purchaseOrdersList,
  "purchase-orders.by-id": purchaseOrderById,
  "kpis.summary": kpisSummary,
} as const;

export const workflows = {
  "inventory.adjust-stock": adjustStock,
  "purchase-orders.create": createPurchaseOrder,
  "purchase-orders.approve": approvePurchaseOrder,
  "purchase-orders.receive": receivePurchaseOrder,
} as const;

export const blocks = {
  "ops.kpi-cards": opsKpiCardsBlock,
  "ops.inventory-table": opsInventoryTableBlock,
  "ops.item-detail-sidebar": opsItemDetailSidebarBlock,
  "ops.low-stock-alerts": opsLowStockAlertsBlock,
  "ops.po-list": opsPoListBlock,
  "ops.po-detail": opsPoDetailBlock,
  "ops.vendor-sidebar": opsVendorSidebarBlock,
} as const;

type RawContext = {
  user?: { id?: string };
  warehouse?: { id?: string };
  vendor?: { id?: string };
  item?: { id?: string };
  po?: { id?: string };
};

/**
 * Resolve `vendor.id` from `po.id` when a route carries the active PO but
 * not its vendor. The registry decides what derivations are valid.
 */
async function enrichContext(rawContext: unknown): Promise<unknown> {
  if (typeof rawContext !== "object" || rawContext === null) return rawContext;
  const r = rawContext as RawContext;
  const enriched: RawContext = { ...r };
  if (enriched.po?.id && !enriched.vendor?.id) {
    const po = await db.purchaseOrders.byId(enriched.po.id);
    if (po) {
      enriched.vendor = { ...(enriched.vendor ?? {}), id: po.vendorId };
    }
  }
  return enriched;
}

/**
 * Demo placeholder. Reads `X-Composoft-User` from the request header and
 * trusts it. Anyone calling the API can claim to be anyone.
 *
 * NEVER use this in production. Real implementations:
 *   - validate a JWT (jose, jsonwebtoken)
 *   - look up a session cookie (NextAuth, Clerk, custom)
 *   - call Auth0 / Supabase Auth / etc.
 *
 * Returning `null` becomes a 401. Throw on internal errors — the runtime
 * returns 500 with a generic message and never leaks the cause.
 */
const authenticate: AuthenticateFn = async (request) => {
  const userId = request.headers.get("X-Composoft-User");
  if (!userId) return null;
  return {
    userId,
    claims: {
      // Placeholder claim; real registries put role / tenant / scopes here.
      role: "operator",
    },
  };
};

/**
 * Demo placeholder. Allows everything. Real implementations enforce by:
 *   - the AuthRequest's `kind` and id (workflowId / adapterId)
 *   - identity.claims (role, scopes)
 *   - tenant scoping — but **prefer doing tenancy in the workflow/adapter
 *     SQL** via `context.user.id`, not here. This hook is the wrong place
 *     for row-level checks because it doesn't see the resolved data.
 */
const authorize: AuthorizeFn = async (_identity, _authRequest) => {
  return true;
};

async function referenceData() {
  const [warehouses, vendors] = await Promise.all([
    db.warehouses.list(),
    db.vendors.list(),
  ]);
  return {
    warehouses: warehouses.map((w) => ({ id: w.id, label: w.name })),
    vendors: vendors.map((v) => ({ id: v.id, label: v.name })),
    "inventory.categories": [
      { id: "green-coffee", label: "Green coffee" },
      { id: "roasted", label: "Roasted coffee" },
      { id: "packaging", label: "Packaging" },
      { id: "equipment", label: "Equipment" },
    ],
    "po.statuses": [
      { id: "draft", label: "Draft" },
      { id: "approved", label: "Approved" },
      { id: "received", label: "Received" },
      { id: "partial", label: "Partial" },
    ],
  };
}

export const registry: Registry = {
  name: "example-ops",
  version: "0.0.1",
  adapters,
  workflows,
  blocks,
  enrichContext,
  enrichmentDeclares: ["vendor.id"],
  referenceData,
  authenticate,
  authorize,
  product: {
    name: "Operations",
    accentColor: "#6366f1",
    navigation: [
      { label: "Home", path: "/", icon: "Home" },
      { label: "Purchase orders", path: "/purchase-orders", icon: "FileText" },
    ],
  },
};

export type ExampleOpsRegistry = typeof registry;

// Re-export the data layer for the seed and smoke scripts.
export { db } from "./db.js";

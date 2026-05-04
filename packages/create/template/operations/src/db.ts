// In-memory ERP data layer. Replace before deploying.
//
// Seed data is generated deterministically so adapter outputs are stable
// across reloads. Adapters and workflows depend on the shape of the
// `db.products.*`, `db.purchaseOrders.*`, … namespaces below — keep that
// stable when swapping in a real backend (Postgres / Snowflake / etc.).

export type LocationType = "warehouse" | "store" | "supplier";
export type Direction = "in" | "out" | "transfer";
export type POStatus =
  | "draft"
  | "submitted"
  | "approved"
  | "received"
  | "closed"
  | "cancelled";
export type ApprovalStatus = "pending" | "approved" | "rejected";

export type Product = {
  id: string;
  sku: string;
  name: string;
  description: string;
  category: string;
  unitOfMeasure: string;
  unitCost: number;
  primaryVendorId: string;
  reorderPoint: number;
  reorderQuantity: number;
  createdAt: string;
};

export type Vendor = {
  id: string;
  name: string;
  code: string;
  contactName: string;
  email: string;
  phone: string;
  terms: string;
  leadTimeDays: number;
  performanceScore: number;
  createdAt: string;
};

export type Location = {
  id: string;
  name: string;
  type: LocationType;
  address: string;
  isActive: boolean;
};

export type Customer = {
  id: string;
  name: string;
  accountNumber: string;
  email: string;
  phone: string;
  billingAddress: string;
  shippingAddress: string;
  totalLifetimeOrders: number;
};

export type StockLevel = {
  id: string;
  productId: string;
  locationId: string;
  onHand: number;
  allocated: number;
  available: number;
  lastCountedAt: string;
};

export type StockMovement = {
  id: string;
  productId: string;
  locationId: string;
  quantity: number;
  direction: Direction;
  reason: string;
  referenceType: string | null;
  referenceId: string | null;
  createdAt: string;
  createdBy: string;
};

export type PurchaseOrder = {
  id: string;
  poNumber: string;
  vendorId: string;
  status: POStatus;
  orderDate: string;
  expectedDelivery: string;
  actualDelivery: string | null;
  totalAmount: number;
  approvedBy: string | null;
  approvedAt: string | null;
  notes: string;
  createdBy: string;
  createdAt: string;
};

export type PurchaseOrderLine = {
  id: string;
  poId: string;
  productId: string;
  quantity: number;
  unitCost: number;
  lineTotal: number;
  receivedQuantity: number;
};

export type ApprovalRequest = {
  id: string;
  poId: string;
  requestedBy: string;
  requestedAt: string;
  status: ApprovalStatus;
  approver: string | null;
  decidedAt: string | null;
  comments: string;
};

export type ReceivingRecord = {
  id: string;
  poId: string;
  receivedAt: string;
  receivedBy: string;
  condition: string;
  discrepancies: string;
  notes: string;
};

export type AuditEntry = {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  userId: string;
  timestamp: string;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
};

export type DateRange = { from?: string; to?: string };

// ---------- RNG -----------------------------------------------------------

function mulberry32(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rng = mulberry32(20260502);

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(rng() * arr.length)] as T;
}

function intBetween(lo: number, hi: number): number {
  return Math.floor(lo + rng() * (hi - lo + 1));
}

const NOW = new Date("2026-05-02T12:00:00Z");
const DAY = 24 * 60 * 60 * 1000;
const NINETY_DAYS = 90 * DAY;

function daysAgo(n: number): string {
  return new Date(NOW.getTime() - n * DAY).toISOString();
}

function inRange(iso: string, range?: DateRange): boolean {
  if (!range) return true;
  if (range.from && iso < range.from) return false;
  if (range.to && iso > range.to) return false;
  return true;
}

// ---------- Master data ---------------------------------------------------

const locations: Location[] = [
  {
    id: "loc_east",
    name: "East Warehouse",
    type: "warehouse",
    address: "120 Harbor Way, Newark, NJ 07105",
    isActive: true,
  },
  {
    id: "loc_west",
    name: "West Warehouse",
    type: "warehouse",
    address: "8800 Logistics Blvd, Reno, NV 89506",
    isActive: true,
  },
  {
    id: "loc_central",
    name: "Central Warehouse",
    type: "warehouse",
    address: "4400 Distribution Pkwy, Indianapolis, IN 46241",
    isActive: true,
  },
  {
    id: "loc_store",
    name: "Flagship Store",
    type: "store",
    address: "12 Market Street, Brooklyn, NY 11201",
    isActive: true,
  },
];

const TERMS = ["Net 15", "Net 30", "Net 45", "Net 60", "COD"];

const vendors: Vendor[] = [
  ["Highland Roastery Co.", "HRC", "Mira Tan", "mira@highland.test"],
  ["Pacific Bean Imports", "PBI", "Jonas Berg", "jonas@pacificbean.test"],
  ["Andes Coffee Collective", "ACC", "Rafael Costa", "rafael@andescoffee.test"],
  ["Atlas Packaging", "ATP", "Sofia Reyes", "sofia@atlaspackaging.test"],
  ["Northwind Cartons", "NWC", "Liam O'Connor", "liam@northwindcartons.test"],
  ["Sunrise Labels", "SRL", "Yuki Tanaka", "yuki@sunriselabels.test"],
  ["Stitchworks Apparel", "STA", "Dakota Williams", "dakota@stitchworks.test"],
  ["Loomside Textiles", "LST", "Beatriz Alvarez", "beatriz@loomside.test"],
  ["Tessera Knitwear", "TKN", "Asha Iyer", "asha@tessera.test"],
  ["Brassmark Hardware", "BMH", "Theo Nguyen", "theo@brassmark.test"],
  ["Kestrel Accessories", "KAC", "Elena Volkov", "elena@kestrel.test"],
  ["Ironbeam Logistics", "IBL", "Ahmed Hassan", "ahmed@ironbeam.test"],
].map(([name, code, contactName, email], i): Vendor => {
  const lt = intBetween(5, 30);
  const score = intBetween(70, 98);
  return {
    id: `v_${code!.toLowerCase()}`,
    name: name!,
    code: code!,
    contactName: contactName!,
    email: email!,
    phone: `+1-555-01${String(20 + i).padStart(2, "0")}`,
    terms: pick(TERMS),
    leadTimeDays: lt,
    performanceScore: score,
    createdAt: daysAgo(intBetween(120, 720)),
  };
});

const CATEGORIES: Array<{ key: string; prefix: string; uom: string; cost: [number, number] }> = [
  { key: "Beans", prefix: "BEA", uom: "lb", cost: [4.5, 22] },
  { key: "Packaging", prefix: "PKG", uom: "ea", cost: [0.15, 2.5] },
  { key: "Apparel", prefix: "APP", uom: "ea", cost: [8, 38] },
  { key: "Accessories", prefix: "ACC", uom: "ea", cost: [3, 28] },
];

const PRODUCT_NAMES: Record<string, readonly string[]> = {
  Beans: [
    "Highland Honey Process",
    "Yirgacheffe G1",
    "Sumatran Aged",
    "Decaf Swiss Water",
    "House Espresso",
    "Single Origin Brazil",
    "Costa Rica Tarrazu",
    "Ethiopia Natural",
    "Kenya AA",
    "Guatemala Antigua",
    "Colombia Excelso",
    "Mexico Chiapas",
    "Peru Organic",
    "Sumatra Mandheling",
    "Cold Brew Blend",
  ],
  Packaging: [
    "12oz Kraft Bag",
    "16oz Foil Bag",
    "5lb Bulk Bag",
    "Ribbon Tie",
    "Tin Tie 12oz",
    "Sticker Roll",
    "Cardboard Mailer S",
    "Cardboard Mailer M",
    "Cardboard Mailer L",
    "Bubble Wrap Roll",
    "Branded Tape",
    "Insert Card",
    "Thank-You Postcard",
    "Hangtag",
    "Care Booklet",
  ],
  Apparel: [
    "Heavyweight Tee",
    "Cropped Tee",
    "Long-Sleeve Tee",
    "Field Hoodie",
    "Zip Hoodie",
    "Sweatpants",
    "Beanie",
    "Cap",
    "Field Jacket",
    "Vest",
    "Crew Sweatshirt",
    "Tote Bag",
    "Apron",
    "Polo",
    "Henley",
  ],
  Accessories: [
    "Travel Mug 14oz",
    "Ceramic Mug 12oz",
    "Tumbler 20oz",
    "Pour-Over Kit",
    "Espresso Tamper",
    "Milk Frother",
    "Hand Grinder",
    "Aeropress",
    "Filter Pack 100ct",
    "Scale Mini",
    "Carafe Glass",
    "Spoon Set",
    "Cup Set",
    "Stickers Pack",
    "Patch Pack",
  ],
};

function genProducts(): Product[] {
  const out: Product[] = [];
  let counter = 0;
  for (const cat of CATEGORIES) {
    const names = PRODUCT_NAMES[cat.key]!;
    for (let i = 0; i < 15; i++) {
      counter += 1;
      const name = names[i] ?? `${cat.key} Item ${i + 1}`;
      const sku = `${cat.prefix}-${String(i + 1).padStart(3, "0")}`;
      const cost = Math.round((cat.cost[0] + rng() * (cat.cost[1] - cat.cost[0])) * 100) / 100;
      const reorderPoint = intBetween(20, 120);
      out.push({
        id: `p_${String(counter).padStart(3, "0")}`,
        sku,
        name,
        description: `${name} (${cat.key.toLowerCase()})`,
        category: cat.key,
        unitOfMeasure: cat.uom,
        unitCost: cost,
        primaryVendorId: pick(vendors).id,
        reorderPoint,
        reorderQuantity: reorderPoint * intBetween(2, 4),
        createdAt: daysAgo(intBetween(30, 540)),
      });
    }
  }
  return out;
}

const products: Product[] = genProducts();

const customers: Customer[] = Array.from({ length: 25 }, (_, i): Customer => {
  const i1 = i + 1;
  const names = [
    "Northwind Cafés",
    "Contoso Coffee",
    "Globex Roastery",
    "Initech Provisions",
    "Umbrella Hotels",
    "Hooli Marketplaces",
    "Pied Piper Co-op",
    "Wayne Hospitality",
    "Stark Catering",
    "Acme Foodservice",
    "Duff Distribution",
    "Cyberdyne Cafeterias",
    "Tyrell Beverages",
    "Soylent Greens",
    "Massive Dynamic",
    "Wonka Confections",
    "Oceanic Cruises",
    "Aperture Tea",
    "BlackMesa Snacks",
    "Vandelay Imports",
    "Sterling Cooper",
    "Pendant Publishing",
    "Costanza Coffee",
    "Genco Imports",
    "Spacely Sprockets",
  ];
  const name = names[i] ?? `Customer ${i1}`;
  return {
    id: `c_${String(i1).padStart(3, "0")}`,
    name,
    accountNumber: `ACCT-${String(10000 + i1)}`,
    email: `accounts@${name.toLowerCase().replace(/[^a-z0-9]+/g, "")}.test`,
    phone: `+1-555-02${String(10 + i).padStart(2, "0")}`,
    billingAddress: `${100 + i1} Market St, Suite ${200 + i1}`,
    shippingAddress: `${500 + i1} Warehouse Rd`,
    totalLifetimeOrders: intBetween(1, 240),
  };
});

// ---------- Inventory state ----------------------------------------------

function genStockLevels(): StockLevel[] {
  const out: StockLevel[] = [];
  let counter = 0;
  for (const p of products) {
    // Most products at 2–3 locations; occasionally only 1
    const n = pick([2, 2, 3, 3, 3, 1]);
    const chosen = new Set<string>();
    while (chosen.size < n) {
      const loc = pick(locations.filter((l) => l.type !== "supplier"));
      chosen.add(loc.id);
    }
    for (const locId of chosen) {
      counter += 1;
      // Bias 15% of rows below reorderPoint (low stock) and 5% to zero
      const roll = rng();
      let onHand: number;
      if (roll < 0.05) onHand = 0;
      else if (roll < 0.2) onHand = intBetween(0, Math.max(1, p.reorderPoint - 1));
      else onHand = intBetween(p.reorderPoint, p.reorderPoint * 4);
      const allocated = Math.min(onHand, intBetween(0, Math.floor(onHand * 0.3)));
      out.push({
        id: `sl_${String(counter).padStart(4, "0")}`,
        productId: p.id,
        locationId: locId,
        onHand,
        allocated,
        available: onHand - allocated,
        lastCountedAt: daysAgo(intBetween(0, 60)),
      });
    }
  }
  return out;
}

const stockLevels: StockLevel[] = genStockLevels();

const MOVEMENT_REASONS: Record<Direction, readonly string[]> = {
  in: ["po_receipt", "vendor_return", "cycle_count_up"],
  out: ["sales_order", "damage", "cycle_count_down", "internal_use"],
  transfer: ["rebalance", "store_replenishment"],
};

function genStockMovements(): StockMovement[] {
  const out: StockMovement[] = [];
  for (let i = 1; i <= 200; i++) {
    const p = pick(products);
    const direction: Direction = pick(["in", "in", "out", "out", "out", "transfer"]);
    const loc = pick(locations.filter((l) => l.type !== "supplier"));
    const qty = direction === "in" ? intBetween(20, 250) : intBetween(1, 80);
    const reason = pick(MOVEMENT_REASONS[direction]);
    out.push({
      id: `mv_${String(i).padStart(4, "0")}`,
      productId: p.id,
      locationId: loc.id,
      quantity: qty,
      direction,
      reason,
      referenceType: direction === "in" ? "purchase_order" : null,
      referenceId: null,
      createdAt: daysAgo(intBetween(0, 89)),
      createdBy: pick(["u_demo", "u_alex", "u_priya", "u_sam", "u_min"]),
    });
  }
  return out.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

const stockMovements: StockMovement[] = genStockMovements();

// ---------- Procurement state --------------------------------------------

const PO_STATUS_PLAN: Array<[POStatus, number]> = [
  ["draft", 8],
  ["submitted", 6],
  ["approved", 6],
  ["received", 5],
  ["closed", 3],
];

function genPurchaseOrders(): {
  pos: PurchaseOrder[];
  lines: PurchaseOrderLine[];
} {
  const pos: PurchaseOrder[] = [];
  const lines: PurchaseOrderLine[] = [];
  let poCounter = 0;
  let lineCounter = 0;
  for (const [status, n] of PO_STATUS_PLAN) {
    for (let i = 0; i < n; i++) {
      poCounter += 1;
      const vendor = pick(vendors);
      const orderAgo = intBetween(2, 80);
      const orderDate = daysAgo(orderAgo);
      const expected = daysAgo(orderAgo - vendor.leadTimeDays);
      const lineCount = intBetween(2, 4);
      const poId = `po_${String(poCounter).padStart(4, "0")}`;
      let total = 0;
      const usedProducts = new Set<string>();
      for (let j = 0; j < lineCount; j++) {
        let p = pick(products);
        let guard = 0;
        while (usedProducts.has(p.id) && guard < 5) {
          p = pick(products);
          guard += 1;
        }
        usedProducts.add(p.id);
        const qty = intBetween(20, 240);
        const unitCost = Math.round(p.unitCost * (0.9 + rng() * 0.2) * 100) / 100;
        const lineTotal = Math.round(qty * unitCost * 100) / 100;
        const receivedQty =
          status === "received" || status === "closed" ? qty : 0;
        lineCounter += 1;
        lines.push({
          id: `pol_${String(lineCounter).padStart(4, "0")}`,
          poId,
          productId: p.id,
          quantity: qty,
          unitCost,
          lineTotal,
          receivedQuantity: receivedQty,
        });
        total += lineTotal;
      }
      const approvedBy =
        status === "approved" || status === "received" || status === "closed"
          ? "u_alex"
          : null;
      const approvedAt = approvedBy ? daysAgo(orderAgo - 1) : null;
      const actualDelivery =
        status === "received" || status === "closed" ? expected : null;
      pos.push({
        id: poId,
        poNumber: `PO-2026-${String(1000 + poCounter)}`,
        vendorId: vendor.id,
        status,
        orderDate,
        expectedDelivery: expected,
        actualDelivery,
        totalAmount: Math.round(total * 100) / 100,
        approvedBy,
        approvedAt,
        notes: "",
        createdBy: "u_priya",
        createdAt: orderDate,
      });
    }
  }
  return { pos, lines };
}

const { pos: purchaseOrders, lines: purchaseOrderLines } = genPurchaseOrders();

const approvalRequests: ApprovalRequest[] = purchaseOrders
  .filter((p) => p.status === "submitted")
  .map((p, i): ApprovalRequest => ({
    id: `ar_${String(i + 1).padStart(4, "0")}`,
    poId: p.id,
    requestedBy: p.createdBy,
    requestedAt: p.orderDate,
    status: "pending",
    approver: null,
    decidedAt: null,
    comments: "",
  }));

// Fold in already-decided approvals so the audit trail is plausible.
purchaseOrders
  .filter((p) => p.status === "approved" || p.status === "received" || p.status === "closed")
  .forEach((p, i) => {
    approvalRequests.push({
      id: `ar_${String(approvalRequests.length + i + 1).padStart(4, "0")}`,
      poId: p.id,
      requestedBy: p.createdBy,
      requestedAt: p.orderDate,
      status: "approved",
      approver: p.approvedBy,
      decidedAt: p.approvedAt,
      comments: "Approved per quarterly plan.",
    });
  });

const receivingRecords: ReceivingRecord[] = purchaseOrders
  .filter((p) => p.status === "received" || p.status === "closed")
  .map((p, i): ReceivingRecord => ({
    id: `rc_${String(i + 1).padStart(4, "0")}`,
    poId: p.id,
    receivedAt: p.actualDelivery ?? daysAgo(intBetween(1, 30)),
    receivedBy: pick(["u_sam", "u_min"]),
    condition: pick(["clean", "clean", "clean", "minor_damage"]),
    discrepancies: pick(["", "", "1 unit short on line 2"]),
    notes: "",
  }));

// ---------- Audit log -----------------------------------------------------

const auditLog: AuditEntry[] = (() => {
  const out: AuditEntry[] = [];
  let counter = 0;
  function push(entry: Omit<AuditEntry, "id">) {
    counter += 1;
    out.push({ id: `au_${String(counter).padStart(4, "0")}`, ...entry });
  }
  // Historical PO state changes
  for (const po of purchaseOrders) {
    push({
      action: "purchase_order.created",
      entityType: "purchase_order",
      entityId: po.id,
      userId: po.createdBy,
      timestamp: po.createdAt,
      before: null,
      after: { status: "draft", totalAmount: po.totalAmount },
    });
    if (po.status !== "draft") {
      push({
        action: "purchase_order.submitted",
        entityType: "purchase_order",
        entityId: po.id,
        userId: po.createdBy,
        timestamp: po.orderDate,
        before: { status: "draft" },
        after: { status: "submitted" },
      });
    }
    if (po.approvedAt) {
      push({
        action: "purchase_order.approved",
        entityType: "purchase_order",
        entityId: po.id,
        userId: po.approvedBy ?? "u_alex",
        timestamp: po.approvedAt,
        before: { status: "submitted" },
        after: { status: "approved" },
      });
    }
    if (po.status === "received" || po.status === "closed") {
      push({
        action: "purchase_order.received",
        entityType: "purchase_order",
        entityId: po.id,
        userId: "u_sam",
        timestamp: po.actualDelivery ?? po.expectedDelivery,
        before: { status: "approved" },
        after: { status: "received" },
      });
    }
    if (po.status === "closed") {
      push({
        action: "purchase_order.closed",
        entityType: "purchase_order",
        entityId: po.id,
        userId: "u_priya",
        timestamp: daysAgo(intBetween(0, 5)),
        before: { status: "received" },
        after: { status: "closed" },
      });
    }
    if (out.length >= 50) break;
  }
  return out.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
})();

// ---------- Sequences for new rows ----------------------------------------

let movementSeq = stockMovements.length;
let poSeq = purchaseOrders.length;
let lineSeq = purchaseOrderLines.length;
let approvalSeq = approvalRequests.length;
let receivingSeq = receivingRecords.length;
let auditSeq = auditLog.length;

function nextId(prefix: string, seq: number, width = 4): string {
  return `${prefix}_${String(seq).padStart(width, "0")}`;
}

function appendAudit(entry: Omit<AuditEntry, "id">): AuditEntry {
  auditSeq += 1;
  const row: AuditEntry = { id: nextId("au", auditSeq), ...entry };
  auditLog.unshift(row);
  return row;
}

function ensureStockLevel(productId: string, locationId: string): StockLevel {
  let row = stockLevels.find(
    (s) => s.productId === productId && s.locationId === locationId,
  );
  if (!row) {
    row = {
      id: nextId("sl", stockLevels.length + 1),
      productId,
      locationId,
      onHand: 0,
      allocated: 0,
      available: 0,
      lastCountedAt: NOW.toISOString(),
    };
    stockLevels.push(row);
  }
  return row;
}

// ---------- DB facade -----------------------------------------------------

export const db = {
  products: {
    list(opts: {
      page?: number;
      pageSize?: number;
      category?: string;
      search?: string;
    } = {}): { items: Product[]; total: number; page: number; pageSize: number } {
      const page = opts.page ?? 1;
      const pageSize = opts.pageSize ?? 25;
      let arr = products;
      if (opts.category) arr = arr.filter((p) => p.category === opts.category);
      if (opts.search) {
        const q = opts.search.toLowerCase();
        arr = arr.filter(
          (p) =>
            p.sku.toLowerCase().includes(q) ||
            p.name.toLowerCase().includes(q) ||
            p.description.toLowerCase().includes(q),
        );
      }
      const sorted = [...arr].sort((a, b) => a.sku.localeCompare(b.sku));
      const start = (page - 1) * pageSize;
      return {
        items: sorted.slice(start, start + pageSize),
        total: sorted.length,
        page,
        pageSize,
      };
    },
    byId(id: string): Product | null {
      return products.find((p) => p.id === id) ?? null;
    },
    updateReorderPoint(input: {
      productId: string;
      reorderPoint: number;
      reorderQuantity: number;
    }): Product {
      const p = products.find((it) => it.id === input.productId);
      if (!p) throw new Error(`product ${input.productId} not found`);
      p.reorderPoint = input.reorderPoint;
      p.reorderQuantity = input.reorderQuantity;
      return p;
    },
    categories(): string[] {
      return Array.from(new Set(products.map((p) => p.category))).sort();
    },
  },
  vendors: {
    list(opts: { page?: number; pageSize?: number; search?: string } = {}): {
      items: Vendor[];
      total: number;
      page: number;
      pageSize: number;
    } {
      const page = opts.page ?? 1;
      const pageSize = opts.pageSize ?? 25;
      let arr = vendors;
      if (opts.search) {
        const q = opts.search.toLowerCase();
        arr = arr.filter(
          (v) =>
            v.name.toLowerCase().includes(q) ||
            v.code.toLowerCase().includes(q),
        );
      }
      const sorted = [...arr].sort((a, b) => a.name.localeCompare(b.name));
      const start = (page - 1) * pageSize;
      return {
        items: sorted.slice(start, start + pageSize),
        total: sorted.length,
        page,
        pageSize,
      };
    },
    byId(id: string): Vendor | null {
      return vendors.find((v) => v.id === id) ?? null;
    },
    scorecard(input: { vendorId: string }): {
      onTimeDelivery: number;
      qualityScore: number;
      fillRate: number;
      totalSpend: number;
      totalOrders: number;
      recentTrend: Array<{ date: string; spend: number }>;
    } {
      const v = vendors.find((it) => it.id === input.vendorId);
      if (!v) {
        return {
          onTimeDelivery: 0,
          qualityScore: 0,
          fillRate: 0,
          totalSpend: 0,
          totalOrders: 0,
          recentTrend: [],
        };
      }
      const vendorPOs = purchaseOrders.filter((p) => p.vendorId === input.vendorId);
      const completed = vendorPOs.filter(
        (p) => p.status === "received" || p.status === "closed",
      );
      const onTime = completed.filter(
        (p) =>
          p.actualDelivery && p.actualDelivery <= p.expectedDelivery,
      ).length;
      const onTimeDelivery =
        completed.length === 0 ? 0 : Math.round((onTime / completed.length) * 100);
      const totalSpend = vendorPOs.reduce((a, p) => a + p.totalAmount, 0);
      const fillRate = (() => {
        const linesForVendor = purchaseOrderLines.filter((l) =>
          vendorPOs.some((p) => p.id === l.poId),
        );
        const ordered = linesForVendor.reduce((a, l) => a + l.quantity, 0);
        const received = linesForVendor.reduce((a, l) => a + l.receivedQuantity, 0);
        return ordered === 0 ? 0 : Math.round((received / ordered) * 100);
      })();

      const trendBuckets = new Map<string, number>();
      for (const p of vendorPOs) {
        const day = p.orderDate.slice(0, 10);
        trendBuckets.set(day, (trendBuckets.get(day) ?? 0) + p.totalAmount);
      }
      const recentTrend = Array.from(trendBuckets.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .slice(-30)
        .map(([date, spend]) => ({ date, spend: Math.round(spend * 100) / 100 }));

      return {
        onTimeDelivery,
        qualityScore: v.performanceScore,
        fillRate,
        totalSpend: Math.round(totalSpend * 100) / 100,
        totalOrders: vendorPOs.length,
        recentTrend,
      };
    },
    updateTerms(input: {
      vendorId: string;
      terms: string;
      leadTimeDays: number;
    }): Vendor {
      const v = vendors.find((it) => it.id === input.vendorId);
      if (!v) throw new Error(`vendor ${input.vendorId} not found`);
      v.terms = input.terms;
      v.leadTimeDays = input.leadTimeDays;
      return v;
    },
  },
  locations: {
    list(): Location[] {
      return [...locations];
    },
    byId(id: string): Location | null {
      return locations.find((l) => l.id === id) ?? null;
    },
  },
  customers: {
    list(opts: { page?: number; pageSize?: number } = {}): {
      items: Customer[];
      total: number;
      page: number;
      pageSize: number;
    } {
      const page = opts.page ?? 1;
      const pageSize = opts.pageSize ?? 25;
      const sorted = [...customers].sort((a, b) => a.name.localeCompare(b.name));
      const start = (page - 1) * pageSize;
      return {
        items: sorted.slice(start, start + pageSize),
        total: sorted.length,
        page,
        pageSize,
      };
    },
  },
  stock: {
    byProduct(input: { productId: string }): Array<{
      locationId: string;
      locationName: string;
      onHand: number;
      allocated: number;
      available: number;
    }> {
      const rows = stockLevels.filter((s) => s.productId === input.productId);
      return rows.map((s) => ({
        locationId: s.locationId,
        locationName: locations.find((l) => l.id === s.locationId)?.name ?? s.locationId,
        onHand: s.onHand,
        allocated: s.allocated,
        available: s.available,
      }));
    },
    summary(input: { dateRange?: DateRange; locationId?: string } = {}): {
      totalSkus: number;
      totalUnits: number;
      lowStockCount: number;
      outOfStockCount: number;
    } {
      const productById = new Map(products.map((p) => [p.id, p]));
      const rows = stockLevels.filter(
        (s) => !input.locationId || s.locationId === input.locationId,
      );
      const skus = new Set(rows.map((r) => r.productId));
      const totalUnits = rows.reduce((a, r) => a + r.onHand, 0);
      const totalsByProduct = new Map<string, number>();
      for (const r of rows) {
        totalsByProduct.set(r.productId, (totalsByProduct.get(r.productId) ?? 0) + r.onHand);
      }
      let low = 0;
      let out = 0;
      for (const [pid, qty] of totalsByProduct.entries()) {
        const p = productById.get(pid);
        if (!p) continue;
        if (qty === 0) out += 1;
        else if (qty < p.reorderPoint) low += 1;
      }
      // dateRange currently has no effect on the snapshot — kept on the API for forward-compat.
      void input.dateRange;
      return {
        totalSkus: skus.size,
        totalUnits,
        lowStockCount: low,
        outOfStockCount: out,
      };
    },
    lowStock(input: { locationId?: string } = {}): Array<{
      productId: string;
      sku: string;
      name: string;
      category: string;
      onHand: number;
      reorderPoint: number;
      reorderQuantity: number;
      primaryVendorId: string;
      unitCost: number;
    }> {
      const totals = new Map<string, number>();
      for (const r of stockLevels) {
        if (input.locationId && r.locationId !== input.locationId) continue;
        totals.set(r.productId, (totals.get(r.productId) ?? 0) + r.onHand);
      }
      const rows: Array<{
        productId: string;
        sku: string;
        name: string;
        category: string;
        onHand: number;
        reorderPoint: number;
        reorderQuantity: number;
        primaryVendorId: string;
        unitCost: number;
      }> = [];
      for (const p of products) {
        const onHand = totals.get(p.id) ?? 0;
        if (onHand < p.reorderPoint) {
          rows.push({
            productId: p.id,
            sku: p.sku,
            name: p.name,
            category: p.category,
            onHand,
            reorderPoint: p.reorderPoint,
            reorderQuantity: p.reorderQuantity,
            primaryVendorId: p.primaryVendorId,
            unitCost: p.unitCost,
          });
        }
      }
      return rows.sort((a, b) => a.onHand / a.reorderPoint - b.onHand / b.reorderPoint);
    },
    valueByLocation(): Array<{
      locationId: string;
      locationName: string;
      totalValue: number;
    }> {
      const productById = new Map(products.map((p) => [p.id, p]));
      const totals = new Map<string, number>();
      for (const s of stockLevels) {
        const p = productById.get(s.productId);
        if (!p) continue;
        totals.set(s.locationId, (totals.get(s.locationId) ?? 0) + s.onHand * p.unitCost);
      }
      return locations
        .filter((l) => l.type !== "supplier")
        .map((l) => ({
          locationId: l.id,
          locationName: l.name,
          totalValue: Math.round((totals.get(l.id) ?? 0) * 100) / 100,
        }))
        .sort((a, b) => b.totalValue - a.totalValue);
    },
    adjust(input: {
      productId: string;
      locationId: string;
      quantity: number;
      reason: string;
      notes?: string;
      userId: string;
    }): { movement: StockMovement; newOnHand: number } {
      const level = ensureStockLevel(input.productId, input.locationId);
      const before = level.onHand;
      level.onHand = Math.max(0, level.onHand + input.quantity);
      level.available = Math.max(0, level.onHand - level.allocated);
      level.lastCountedAt = new Date().toISOString();
      movementSeq += 1;
      const movement: StockMovement = {
        id: nextId("mv", movementSeq),
        productId: input.productId,
        locationId: input.locationId,
        quantity: input.quantity,
        direction: input.quantity >= 0 ? "in" : "out",
        reason: input.reason,
        referenceType: "manual_adjustment",
        referenceId: null,
        createdAt: new Date().toISOString(),
        createdBy: input.userId,
      };
      stockMovements.unshift(movement);
      appendAudit({
        action: "stock.adjust",
        entityType: "stock_level",
        entityId: level.id,
        userId: input.userId,
        timestamp: movement.createdAt,
        before: { onHand: before },
        after: { onHand: level.onHand, reason: input.reason, notes: input.notes ?? "" },
      });
      return { movement, newOnHand: level.onHand };
    },
    transfer(input: {
      productId: string;
      fromLocationId: string;
      toLocationId: string;
      quantity: number;
      reason: string;
      userId: string;
    }): { fromMovement: StockMovement; toMovement: StockMovement } {
      if (input.quantity <= 0) throw new Error("transfer quantity must be positive");
      if (input.fromLocationId === input.toLocationId) {
        throw new Error("cannot transfer to the same location");
      }
      const fromLevel = ensureStockLevel(input.productId, input.fromLocationId);
      const toLevel = ensureStockLevel(input.productId, input.toLocationId);
      if (fromLevel.onHand < input.quantity) {
        throw new Error(`insufficient stock at ${input.fromLocationId}`);
      }
      const beforeFrom = fromLevel.onHand;
      const beforeTo = toLevel.onHand;
      fromLevel.onHand -= input.quantity;
      fromLevel.available = Math.max(0, fromLevel.onHand - fromLevel.allocated);
      toLevel.onHand += input.quantity;
      toLevel.available = Math.max(0, toLevel.onHand - toLevel.allocated);

      const ts = new Date().toISOString();
      movementSeq += 1;
      const fromMovement: StockMovement = {
        id: nextId("mv", movementSeq),
        productId: input.productId,
        locationId: input.fromLocationId,
        quantity: -input.quantity,
        direction: "transfer",
        reason: input.reason,
        referenceType: "stock_transfer",
        referenceId: null,
        createdAt: ts,
        createdBy: input.userId,
      };
      movementSeq += 1;
      const toMovement: StockMovement = {
        id: nextId("mv", movementSeq),
        productId: input.productId,
        locationId: input.toLocationId,
        quantity: input.quantity,
        direction: "transfer",
        reason: input.reason,
        referenceType: "stock_transfer",
        referenceId: fromMovement.id,
        createdAt: ts,
        createdBy: input.userId,
      };
      stockMovements.unshift(toMovement, fromMovement);
      appendAudit({
        action: "stock.transfer",
        entityType: "stock_level",
        entityId: `${fromLevel.id}->${toLevel.id}`,
        userId: input.userId,
        timestamp: ts,
        before: { from: beforeFrom, to: beforeTo },
        after: { from: fromLevel.onHand, to: toLevel.onHand, reason: input.reason },
      });
      return { fromMovement, toMovement };
    },
    movementsRecent(input: {
      limit?: number;
      productId?: string;
      locationId?: string;
    } = {}): StockMovement[] {
      const limit = input.limit ?? 50;
      let arr = stockMovements;
      if (input.productId) arr = arr.filter((m) => m.productId === input.productId);
      if (input.locationId) arr = arr.filter((m) => m.locationId === input.locationId);
      return arr.slice(0, limit);
    },
  },
  purchaseOrders: {
    list(input: {
      status?: POStatus;
      vendorId?: string;
      dateRange?: DateRange;
      page?: number;
      pageSize?: number;
    } = {}): {
      items: PurchaseOrder[];
      total: number;
      page: number;
      pageSize: number;
    } {
      const page = input.page ?? 1;
      const pageSize = input.pageSize ?? 25;
      let arr = purchaseOrders;
      if (input.status) arr = arr.filter((p) => p.status === input.status);
      if (input.vendorId) arr = arr.filter((p) => p.vendorId === input.vendorId);
      arr = arr.filter((p) => inRange(p.orderDate, input.dateRange));
      const sorted = [...arr].sort((a, b) => b.orderDate.localeCompare(a.orderDate));
      const start = (page - 1) * pageSize;
      return {
        items: sorted.slice(start, start + pageSize),
        total: sorted.length,
        page,
        pageSize,
      };
    },
    byId(id: string): PurchaseOrder | null {
      return purchaseOrders.find((p) => p.id === id) ?? null;
    },
    lines(input: { poId: string }): Array<
      PurchaseOrderLine & { productSku: string; productName: string; productUom: string }
    > {
      const productById = new Map(products.map((p) => [p.id, p]));
      return purchaseOrderLines
        .filter((l) => l.poId === input.poId)
        .map((l) => {
          const p = productById.get(l.productId);
          return {
            ...l,
            productSku: p?.sku ?? "",
            productName: p?.name ?? "",
            productUom: p?.unitOfMeasure ?? "",
          };
        });
    },
    create(input: {
      vendorId: string;
      lines: Array<{ productId: string; quantity: number; unitCost: number }>;
      expectedDelivery: string;
      notes?: string;
      userId: string;
    }): PurchaseOrder {
      const vendor = vendors.find((v) => v.id === input.vendorId);
      if (!vendor) throw new Error(`vendor ${input.vendorId} not found`);
      poSeq += 1;
      const id = nextId("po", poSeq);
      const orderDate = new Date().toISOString();
      let total = 0;
      for (const line of input.lines) {
        const product = products.find((p) => p.id === line.productId);
        if (!product) throw new Error(`product ${line.productId} not found`);
        const lineTotal = Math.round(line.quantity * line.unitCost * 100) / 100;
        total += lineTotal;
        lineSeq += 1;
        purchaseOrderLines.push({
          id: nextId("pol", lineSeq),
          poId: id,
          productId: line.productId,
          quantity: line.quantity,
          unitCost: line.unitCost,
          lineTotal,
          receivedQuantity: 0,
        });
      }
      const po: PurchaseOrder = {
        id,
        poNumber: `PO-2026-${String(2000 + poSeq)}`,
        vendorId: input.vendorId,
        status: "draft",
        orderDate,
        expectedDelivery: input.expectedDelivery,
        actualDelivery: null,
        totalAmount: Math.round(total * 100) / 100,
        approvedBy: null,
        approvedAt: null,
        notes: input.notes ?? "",
        createdBy: input.userId,
        createdAt: orderDate,
      };
      purchaseOrders.push(po);
      appendAudit({
        action: "purchase_order.created",
        entityType: "purchase_order",
        entityId: po.id,
        userId: input.userId,
        timestamp: orderDate,
        before: null,
        after: { status: "draft", totalAmount: po.totalAmount, vendorId: po.vendorId },
      });
      return po;
    },
    submit(input: { poId: string; userId: string }): PurchaseOrder {
      const po = purchaseOrders.find((p) => p.id === input.poId);
      if (!po) throw new Error(`po ${input.poId} not found`);
      if (po.status !== "draft")
        throw new Error(`po ${input.poId} cannot be submitted from status ${po.status}`);
      const before = po.status;
      po.status = "submitted";
      approvalSeq += 1;
      approvalRequests.push({
        id: nextId("ar", approvalSeq),
        poId: po.id,
        requestedBy: input.userId,
        requestedAt: new Date().toISOString(),
        status: "pending",
        approver: null,
        decidedAt: null,
        comments: "",
      });
      appendAudit({
        action: "purchase_order.submitted",
        entityType: "purchase_order",
        entityId: po.id,
        userId: input.userId,
        timestamp: new Date().toISOString(),
        before: { status: before },
        after: { status: po.status },
      });
      return po;
    },
    approve(input: { poId: string; comments?: string; userId: string }): PurchaseOrder {
      const po = purchaseOrders.find((p) => p.id === input.poId);
      if (!po) throw new Error(`po ${input.poId} not found`);
      if (po.status !== "submitted")
        throw new Error(`po ${input.poId} cannot be approved from status ${po.status}`);
      const before = po.status;
      po.status = "approved";
      po.approvedBy = input.userId;
      po.approvedAt = new Date().toISOString();
      const ar = approvalRequests.find(
        (a) => a.poId === po.id && a.status === "pending",
      );
      if (ar) {
        ar.status = "approved";
        ar.approver = input.userId;
        ar.decidedAt = po.approvedAt;
        ar.comments = input.comments ?? "";
      }
      appendAudit({
        action: "purchase_order.approved",
        entityType: "purchase_order",
        entityId: po.id,
        userId: input.userId,
        timestamp: po.approvedAt,
        before: { status: before },
        after: { status: po.status, approvedBy: input.userId, comments: input.comments ?? "" },
      });
      return po;
    },
    reject(input: { poId: string; comments?: string; userId: string }): PurchaseOrder {
      const po = purchaseOrders.find((p) => p.id === input.poId);
      if (!po) throw new Error(`po ${input.poId} not found`);
      if (po.status !== "submitted")
        throw new Error(`po ${input.poId} cannot be rejected from status ${po.status}`);
      const before = po.status;
      po.status = "cancelled";
      const ar = approvalRequests.find(
        (a) => a.poId === po.id && a.status === "pending",
      );
      const ts = new Date().toISOString();
      if (ar) {
        ar.status = "rejected";
        ar.approver = input.userId;
        ar.decidedAt = ts;
        ar.comments = input.comments ?? "";
      }
      appendAudit({
        action: "purchase_order.rejected",
        entityType: "purchase_order",
        entityId: po.id,
        userId: input.userId,
        timestamp: ts,
        before: { status: before },
        after: { status: po.status, comments: input.comments ?? "" },
      });
      return po;
    },
    receive(input: {
      poId: string;
      lines: Array<{
        lineId: string;
        receivedQuantity: number;
        condition?: string;
        discrepancies?: string;
      }>;
      userId: string;
    }): { po: PurchaseOrder; receiving: ReceivingRecord } {
      const po = purchaseOrders.find((p) => p.id === input.poId);
      if (!po) throw new Error(`po ${input.poId} not found`);
      if (po.status !== "approved")
        throw new Error(`po ${input.poId} cannot be received from status ${po.status}`);

      const ts = new Date().toISOString();
      const conditions: string[] = [];
      const discrepancies: string[] = [];
      for (const update of input.lines) {
        const line = purchaseOrderLines.find(
          (l) => l.id === update.lineId && l.poId === po.id,
        );
        if (!line) throw new Error(`po line ${update.lineId} not found on ${po.id}`);
        line.receivedQuantity = update.receivedQuantity;
        if (update.condition) conditions.push(update.condition);
        if (update.discrepancies) discrepancies.push(update.discrepancies);

        const level = ensureStockLevel(line.productId, "loc_central");
        const beforeOnHand = level.onHand;
        level.onHand += update.receivedQuantity;
        level.available = Math.max(0, level.onHand - level.allocated);
        level.lastCountedAt = ts;

        movementSeq += 1;
        stockMovements.unshift({
          id: nextId("mv", movementSeq),
          productId: line.productId,
          locationId: "loc_central",
          quantity: update.receivedQuantity,
          direction: "in",
          reason: "po_receipt",
          referenceType: "purchase_order",
          referenceId: po.id,
          createdAt: ts,
          createdBy: input.userId,
        });
        appendAudit({
          action: "stock.receive",
          entityType: "stock_level",
          entityId: level.id,
          userId: input.userId,
          timestamp: ts,
          before: { onHand: beforeOnHand },
          after: { onHand: level.onHand, poId: po.id, lineId: line.id },
        });
      }

      const before = po.status;
      po.status = "received";
      po.actualDelivery = ts;

      receivingSeq += 1;
      const receiving: ReceivingRecord = {
        id: nextId("rc", receivingSeq),
        poId: po.id,
        receivedAt: ts,
        receivedBy: input.userId,
        condition: conditions.length === 0 ? "clean" : conditions.join("; "),
        discrepancies: discrepancies.join("; "),
        notes: "",
      };
      receivingRecords.push(receiving);

      appendAudit({
        action: "purchase_order.received",
        entityType: "purchase_order",
        entityId: po.id,
        userId: input.userId,
        timestamp: ts,
        before: { status: before },
        after: { status: po.status, receivingId: receiving.id },
      });
      return { po, receiving };
    },
    close(input: { poId: string; userId: string }): PurchaseOrder {
      const po = purchaseOrders.find((p) => p.id === input.poId);
      if (!po) throw new Error(`po ${input.poId} not found`);
      if (po.status !== "received")
        throw new Error(`po ${input.poId} cannot be closed from status ${po.status}`);
      const before = po.status;
      po.status = "closed";
      appendAudit({
        action: "purchase_order.closed",
        entityType: "purchase_order",
        entityId: po.id,
        userId: input.userId,
        timestamp: new Date().toISOString(),
        before: { status: before },
        after: { status: po.status },
      });
      return po;
    },
  },
  approvals: {
    list(input: { approverUserId?: string } = {}): Array<
      ApprovalRequest & {
        poNumber: string;
        vendorId: string;
        vendorName: string;
        totalAmount: number;
      }
    > {
      const vendorById = new Map(vendors.map((v) => [v.id, v]));
      const poById = new Map(purchaseOrders.map((p) => [p.id, p]));
      return approvalRequests
        .filter(
          (ar) =>
            ar.status === "pending" &&
            (!input.approverUserId || ar.approver === null || ar.approver === input.approverUserId),
        )
        .sort((a, b) => a.requestedAt.localeCompare(b.requestedAt))
        .map((ar): ApprovalRequest & {
          poNumber: string;
          vendorId: string;
          vendorName: string;
          totalAmount: number;
        } => {
          const po = poById.get(ar.poId);
          const vendor = po ? vendorById.get(po.vendorId) : undefined;
          return {
            ...ar,
            poNumber: po?.poNumber ?? "",
            vendorId: po?.vendorId ?? "",
            vendorName: vendor?.name ?? "",
            totalAmount: po?.totalAmount ?? 0,
          };
        });
    },
  },
  procurement: {
    metrics(input: { dateRange?: DateRange } = {}): {
      totalSpend: number;
      openPOs: number;
      avgPOValue: number;
      vendorCount: number;
      onTimeDeliveryRate: number;
      spendByVendor: Array<{ vendorId: string; vendorName: string; spend: number }>;
    } {
      const range =
        input.dateRange ??
        { from: new Date(NOW.getTime() - NINETY_DAYS).toISOString(), to: NOW.toISOString() };
      const filtered = purchaseOrders.filter((p) => inRange(p.orderDate, range));
      const totalSpend = filtered.reduce((a, p) => a + p.totalAmount, 0);
      const openPOs = filtered.filter(
        (p) => p.status === "submitted" || p.status === "approved",
      ).length;
      const avgPOValue =
        filtered.length === 0 ? 0 : totalSpend / filtered.length;
      const vendorIds = new Set(filtered.map((p) => p.vendorId));
      const completed = filtered.filter(
        (p) => p.status === "received" || p.status === "closed",
      );
      const onTime = completed.filter(
        (p) => p.actualDelivery && p.actualDelivery <= p.expectedDelivery,
      ).length;
      const onTimeDeliveryRate =
        completed.length === 0 ? 0 : Math.round((onTime / completed.length) * 100);

      const buckets = new Map<string, number>();
      for (const p of filtered) {
        buckets.set(p.vendorId, (buckets.get(p.vendorId) ?? 0) + p.totalAmount);
      }
      const vendorById = new Map(vendors.map((v) => [v.id, v]));
      const spendByVendor = Array.from(buckets.entries())
        .map(([id, spend]) => ({
          vendorId: id,
          vendorName: vendorById.get(id)?.name ?? id,
          spend: Math.round(spend * 100) / 100,
        }))
        .sort((a, b) => b.spend - a.spend);

      return {
        totalSpend: Math.round(totalSpend * 100) / 100,
        openPOs,
        avgPOValue: Math.round(avgPOValue * 100) / 100,
        vendorCount: vendorIds.size,
        onTimeDeliveryRate,
        spendByVendor,
      };
    },
  },
  audit: {
    list(input: { entityType?: string; entityId?: string; limit?: number } = {}): AuditEntry[] {
      const limit = input.limit ?? 50;
      let arr = auditLog;
      if (input.entityType) arr = arr.filter((a) => a.entityType === input.entityType);
      if (input.entityId) arr = arr.filter((a) => a.entityId === input.entityId);
      return arr.slice(0, limit);
    },
    append(entry: Omit<AuditEntry, "id">): AuditEntry {
      return appendAudit(entry);
    },
  },
};

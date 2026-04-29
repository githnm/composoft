/**
 * Local-dev seed for the example registry. Reads DATABASE_URL, runs the
 * schema, inserts fixtures. Re-running is safe (the schema DROPs first).
 */
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { pgSslConfig } from "../src/db.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

type Warehouse = { id: string; name: string };
type Vendor = {
  id: string;
  name: string;
  contactEmail: string;
  paymentTerms: string;
  category: "beans" | "packaging" | "equipment";
};
type InventoryItem = {
  id: string;
  sku: string;
  name: string;
  category: "green-coffee" | "roasted" | "packaging" | "equipment";
  warehouseId: string;
  quantityOnHand: number;
  reorderPoint: number;
  unitCost: number;
  vendorId: string;
};
type PoLine = { itemId: string; quantity: number; unitCost: number };
type Po = {
  id: string;
  poNumber: string;
  vendorId: string;
  status: "draft" | "approved" | "received" | "partial";
  createdDaysAgo: number;
  approvedDaysAgo: number | null;
  receivedDaysAgo: number | null;
  lines: PoLine[];
};

const warehouses: Warehouse[] = [
  { id: "wh_oakland", name: "Oakland Roastery" },
  { id: "wh_brooklyn", name: "Brooklyn Distribution" },
];

const vendors: Vendor[] = [
  { id: "ven_andes", name: "Andes Direct Coffee", contactEmail: "orders@andesdirect.example", paymentTerms: "net-30", category: "beans" },
  { id: "ven_kenya", name: "Kenya Cooperative Imports", contactEmail: "ops@kenyacoop.example", paymentTerms: "net-45", category: "beans" },
  { id: "ven_ethiopia", name: "Ethiopia Heritage Beans", contactEmail: "trade@ethheritage.example", paymentTerms: "prepaid", category: "beans" },
  { id: "ven_packsmith", name: "Packsmith Co", contactEmail: "sales@packsmith.example", paymentTerms: "net-30", category: "packaging" },
  { id: "ven_probat", name: "Probat Equipment", contactEmail: "service@probat.example", paymentTerms: "net-60", category: "equipment" },
];

const items: InventoryItem[] = [
  // Green coffee — 10
  { id: "itm_001", sku: "GC-COL-NAR-01",  name: "Colombia Nariño washed",         category: "green-coffee", warehouseId: "wh_oakland", quantityOnHand: 320,  reorderPoint: 200, unitCost: 6.10,  vendorId: "ven_andes" },
  { id: "itm_002", sku: "GC-COL-HUI-02",  name: "Colombia Huila natural",         category: "green-coffee", warehouseId: "wh_oakland", quantityOnHand: 180,  reorderPoint: 200, unitCost: 6.40,  vendorId: "ven_andes" },
  { id: "itm_003", sku: "GC-PER-CAJ-01",  name: "Peru Cajamarca washed",          category: "green-coffee", warehouseId: "wh_oakland", quantityOnHand: 410,  reorderPoint: 250, unitCost: 5.80,  vendorId: "ven_andes" },
  { id: "itm_004", sku: "GC-KEN-NYE-01",  name: "Kenya Nyeri AA",                 category: "green-coffee", warehouseId: "wh_oakland", quantityOnHand: 95,   reorderPoint: 150, unitCost: 8.20,  vendorId: "ven_kenya" },
  { id: "itm_005", sku: "GC-KEN-KIA-02",  name: "Kenya Kiambu AB",                category: "green-coffee", warehouseId: "wh_oakland", quantityOnHand: 220,  reorderPoint: 150, unitCost: 7.90,  vendorId: "ven_kenya" },
  { id: "itm_006", sku: "GC-ETH-YIR-01",  name: "Ethiopia Yirgacheffe washed",    category: "green-coffee", warehouseId: "wh_oakland", quantityOnHand: 75,   reorderPoint: 200, unitCost: 9.10,  vendorId: "ven_ethiopia" },
  { id: "itm_007", sku: "GC-ETH-GUJ-02",  name: "Ethiopia Guji natural",          category: "green-coffee", warehouseId: "wh_oakland", quantityOnHand: 260,  reorderPoint: 150, unitCost: 9.50,  vendorId: "ven_ethiopia" },
  { id: "itm_008", sku: "GC-ETH-SID-03",  name: "Ethiopia Sidamo Grade 2",        category: "green-coffee", warehouseId: "wh_oakland", quantityOnHand: 340,  reorderPoint: 200, unitCost: 8.40,  vendorId: "ven_ethiopia" },
  { id: "itm_009", sku: "GC-COL-DEC-01",  name: "Colombia decaf SWP",             category: "green-coffee", warehouseId: "wh_oakland", quantityOnHand: 130,  reorderPoint: 100, unitCost: 7.20,  vendorId: "ven_andes" },
  { id: "itm_010", sku: "GC-KEN-PEAB-01", name: "Kenya peaberry",                 category: "green-coffee", warehouseId: "wh_oakland", quantityOnHand: 50,   reorderPoint: 100, unitCost: 9.80,  vendorId: "ven_kenya" },

  // Roasted — 8 (in distribution warehouse)
  { id: "itm_011", sku: "RO-HOUSE-12OZ",  name: "House blend 12oz",               category: "roasted",      warehouseId: "wh_brooklyn", quantityOnHand: 480,  reorderPoint: 300, unitCost: 7.50,  vendorId: "ven_andes" },
  { id: "itm_012", sku: "RO-DARK-12OZ",   name: "Dark roast 12oz",                category: "roasted",      warehouseId: "wh_brooklyn", quantityOnHand: 220,  reorderPoint: 250, unitCost: 7.80,  vendorId: "ven_andes" },
  { id: "itm_013", sku: "RO-LIGHT-12OZ",  name: "Light single-origin 12oz",       category: "roasted",      warehouseId: "wh_brooklyn", quantityOnHand: 140,  reorderPoint: 200, unitCost: 8.20,  vendorId: "ven_andes" },
  { id: "itm_014", sku: "RO-DECAF-12OZ",  name: "Decaf 12oz",                     category: "roasted",      warehouseId: "wh_brooklyn", quantityOnHand: 90,   reorderPoint: 120, unitCost: 8.50,  vendorId: "ven_andes" },
  { id: "itm_015", sku: "RO-ESPR-1KG",    name: "Espresso blend 1kg cafe",        category: "roasted",      warehouseId: "wh_brooklyn", quantityOnHand: 310,  reorderPoint: 200, unitCost: 18.00, vendorId: "ven_andes" },
  { id: "itm_016", sku: "RO-COLD-32OZ",   name: "Cold-brew concentrate 32oz",     category: "roasted",      warehouseId: "wh_brooklyn", quantityOnHand: 160,  reorderPoint: 150, unitCost: 11.40, vendorId: "ven_andes" },
  { id: "itm_017", sku: "RO-SAMPLE-3PK",  name: "Three-pack sampler",             category: "roasted",      warehouseId: "wh_brooklyn", quantityOnHand: 75,   reorderPoint: 100, unitCost: 14.00, vendorId: "ven_andes" },
  { id: "itm_018", sku: "RO-SUB-12OZ",    name: "Subscription roast 12oz",        category: "roasted",      warehouseId: "wh_brooklyn", quantityOnHand: 540,  reorderPoint: 400, unitCost: 7.20,  vendorId: "ven_andes" },

  // Packaging — 8
  { id: "itm_019", sku: "PK-BAG-12OZ-K",  name: "12oz kraft bag, valve",          category: "packaging",    warehouseId: "wh_brooklyn", quantityOnHand: 4200, reorderPoint: 2000, unitCost: 0.42,  vendorId: "ven_packsmith" },
  { id: "itm_020", sku: "PK-BAG-12OZ-W",  name: "12oz white bag, valve",          category: "packaging",    warehouseId: "wh_brooklyn", quantityOnHand: 1800, reorderPoint: 2000, unitCost: 0.45,  vendorId: "ven_packsmith" },
  { id: "itm_021", sku: "PK-BAG-1KG",     name: "1kg cafe bag",                   category: "packaging",    warehouseId: "wh_brooklyn", quantityOnHand: 950,  reorderPoint: 1000, unitCost: 0.95,  vendorId: "ven_packsmith" },
  { id: "itm_022", sku: "PK-LBL-12OZ",    name: "12oz label sheet, 100ct",        category: "packaging",    warehouseId: "wh_brooklyn", quantityOnHand: 60,   reorderPoint: 50,   unitCost: 8.40,  vendorId: "ven_packsmith" },
  { id: "itm_023", sku: "PK-BOX-SH-12",   name: "Shipping box, 12-bag",           category: "packaging",    warehouseId: "wh_brooklyn", quantityOnHand: 280,  reorderPoint: 150,  unitCost: 1.80,  vendorId: "ven_packsmith" },
  { id: "itm_024", sku: "PK-BOX-SH-3",    name: "Shipping box, 3-bag",            category: "packaging",    warehouseId: "wh_brooklyn", quantityOnHand: 1200, reorderPoint: 800,  unitCost: 0.90,  vendorId: "ven_packsmith" },
  { id: "itm_025", sku: "PK-INSERT-CARD", name: "Insert card with brewing notes", category: "packaging",    warehouseId: "wh_brooklyn", quantityOnHand: 3400, reorderPoint: 2000, unitCost: 0.08,  vendorId: "ven_packsmith" },
  { id: "itm_026", sku: "PK-BAG-HOLI",    name: "Holiday gift bag",               category: "packaging",    warehouseId: "wh_brooklyn", quantityOnHand: 220,  reorderPoint: 300,  unitCost: 1.40,  vendorId: "ven_packsmith" },

  // Equipment — 4
  { id: "itm_027", sku: "EQ-PROBAT-P1",   name: "Probat P1 sample roaster",       category: "equipment",    warehouseId: "wh_oakland",  quantityOnHand: 1,    reorderPoint: 1,    unitCost: 7800.00, vendorId: "ven_probat" },
  { id: "itm_028", sku: "EQ-DRUM-12KG",   name: "Probat 12kg drum (spare)",       category: "equipment",    warehouseId: "wh_oakland",  quantityOnHand: 0,    reorderPoint: 1,    unitCost: 1200.00, vendorId: "ven_probat" },
  { id: "itm_029", sku: "EQ-COOL-TRAY",   name: "Cooling tray refurb kit",        category: "equipment",    warehouseId: "wh_oakland",  quantityOnHand: 2,    reorderPoint: 2,    unitCost: 480.00,  vendorId: "ven_probat" },
  { id: "itm_030", sku: "EQ-AIRFLOW-FAN", name: "Airflow fan assembly",           category: "equipment",    warehouseId: "wh_oakland",  quantityOnHand: 1,    reorderPoint: 1,    unitCost: 320.00,  vendorId: "ven_probat" },
];

const pos: Po[] = [
  // 3 draft
  { id: "po_001", poNumber: "PO-2026-001", vendorId: "ven_andes",     status: "draft",    createdDaysAgo: 1,  approvedDaysAgo: null, receivedDaysAgo: null,
    lines: [{ itemId: "itm_002", quantity: 600, unitCost: 6.40 }, { itemId: "itm_009", quantity: 200, unitCost: 7.20 }] },
  { id: "po_002", poNumber: "PO-2026-002", vendorId: "ven_packsmith", status: "draft",    createdDaysAgo: 2,  approvedDaysAgo: null, receivedDaysAgo: null,
    lines: [{ itemId: "itm_020", quantity: 4000, unitCost: 0.45 }, { itemId: "itm_026", quantity: 500, unitCost: 1.40 }] },
  { id: "po_003", poNumber: "PO-2026-003", vendorId: "ven_kenya",     status: "draft",    createdDaysAgo: 3,  approvedDaysAgo: null, receivedDaysAgo: null,
    lines: [{ itemId: "itm_010", quantity: 200, unitCost: 9.80 }] },

  // 3 approved
  { id: "po_004", poNumber: "PO-2026-004", vendorId: "ven_ethiopia",  status: "approved", createdDaysAgo: 7,  approvedDaysAgo: 5,    receivedDaysAgo: null,
    lines: [{ itemId: "itm_006", quantity: 400, unitCost: 9.10 }, { itemId: "itm_008", quantity: 300, unitCost: 8.40 }] },
  { id: "po_005", poNumber: "PO-2026-005", vendorId: "ven_andes",     status: "approved", createdDaysAgo: 6,  approvedDaysAgo: 4,    receivedDaysAgo: null,
    lines: [{ itemId: "itm_001", quantity: 500, unitCost: 6.10 }] },
  { id: "po_006", poNumber: "PO-2026-006", vendorId: "ven_packsmith", status: "approved", createdDaysAgo: 5,  approvedDaysAgo: 3,    receivedDaysAgo: null,
    lines: [{ itemId: "itm_021", quantity: 1500, unitCost: 0.95 }, { itemId: "itm_023", quantity: 200, unitCost: 1.80 }] },

  // 3 received
  { id: "po_007", poNumber: "PO-2026-007", vendorId: "ven_kenya",     status: "received", createdDaysAgo: 21, approvedDaysAgo: 19,   receivedDaysAgo: 11,
    lines: [{ itemId: "itm_004", quantity: 300, unitCost: 8.20 }, { itemId: "itm_005", quantity: 250, unitCost: 7.90 }] },
  { id: "po_008", poNumber: "PO-2026-008", vendorId: "ven_andes",     status: "received", createdDaysAgo: 30, approvedDaysAgo: 28,   receivedDaysAgo: 18,
    lines: [{ itemId: "itm_003", quantity: 800, unitCost: 5.80 }] },
  { id: "po_009", poNumber: "PO-2026-009", vendorId: "ven_packsmith", status: "received", createdDaysAgo: 25, approvedDaysAgo: 23,   receivedDaysAgo: 14,
    lines: [{ itemId: "itm_019", quantity: 5000, unitCost: 0.42 }, { itemId: "itm_025", quantity: 5000, unitCost: 0.08 }] },

  // 3 partial
  { id: "po_010", poNumber: "PO-2026-010", vendorId: "ven_ethiopia",  status: "partial",  createdDaysAgo: 12, approvedDaysAgo: 10,   receivedDaysAgo: 4,
    lines: [{ itemId: "itm_007", quantity: 350, unitCost: 9.50 }, { itemId: "itm_006", quantity: 200, unitCost: 9.10 }] },
  { id: "po_011", poNumber: "PO-2026-011", vendorId: "ven_probat",    status: "partial",  createdDaysAgo: 18, approvedDaysAgo: 16,   receivedDaysAgo: 6,
    lines: [{ itemId: "itm_028", quantity: 1, unitCost: 1200.00 }, { itemId: "itm_029", quantity: 2, unitCost: 480.00 }] },
  { id: "po_012", poNumber: "PO-2026-012", vendorId: "ven_andes",     status: "partial",  createdDaysAgo: 9,  approvedDaysAgo: 7,    receivedDaysAgo: 2,
    lines: [{ itemId: "itm_011", quantity: 400, unitCost: 7.50 }, { itemId: "itm_018", quantity: 600, unitCost: 7.20 }] },
];

async function main(): Promise<void> {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL is required");
    process.exit(2);
  }
  const ssl = pgSslConfig(url);
  const client = new pg.Client(ssl ? { connectionString: url, ssl } : { connectionString: url });
  await client.connect();
  try {
    const schema = await readFile(resolve(__dirname, "001_schema.sql"), "utf8");
    await client.query(schema);

    for (const w of warehouses) {
      await client.query("INSERT INTO warehouses (id, name) VALUES ($1, $2)", [w.id, w.name]);
    }

    for (const v of vendors) {
      await client.query(
        "INSERT INTO vendors (id, name, contact_email, payment_terms, category) VALUES ($1, $2, $3, $4, $5)",
        [v.id, v.name, v.contactEmail, v.paymentTerms, v.category],
      );
    }

    for (const i of items) {
      await client.query(
        `INSERT INTO inventory_items
           (id, sku, name, category, warehouse_id, quantity_on_hand, reorder_point, unit_cost, vendor_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [i.id, i.sku, i.name, i.category, i.warehouseId, i.quantityOnHand, i.reorderPoint, i.unitCost, i.vendorId],
      );
    }

    let lineCount = 0;
    for (const p of pos) {
      const total = p.lines.reduce((s, l) => s + l.quantity * l.unitCost, 0);
      await client.query(
        `INSERT INTO purchase_orders
           (id, po_number, vendor_id, status, created_at, approved_at, received_at, total_amount)
         VALUES ($1, $2, $3, $4, now() - ($5 || ' days')::interval,
                 CASE WHEN $6::int IS NULL THEN NULL ELSE now() - ($6 || ' days')::interval END,
                 CASE WHEN $7::int IS NULL THEN NULL ELSE now() - ($7 || ' days')::interval END,
                 $8)`,
        [p.id, p.poNumber, p.vendorId, p.status, p.createdDaysAgo, p.approvedDaysAgo, p.receivedDaysAgo, total],
      );
      for (const l of p.lines) {
        await client.query(
          "INSERT INTO po_line_items (po_id, item_id, quantity, unit_cost) VALUES ($1, $2, $3, $4)",
          [p.id, l.itemId, l.quantity, l.unitCost],
        );
        lineCount++;
      }
    }

    console.log(
      `Seeded ${warehouses.length} warehouses, ${vendors.length} vendors, ${items.length} items, ${pos.length} POs, ${lineCount} line items.`,
    );
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

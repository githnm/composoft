// Smoke test: hits the database. Requires DATABASE_URL.
// Runs each adapter once with reasonable params, prints row counts.

import { registry, db } from "./index.js";

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is required to run smoke. See README.");
    process.exit(2);
  }

  console.log(`Smoke against registry "${registry.name}@${registry.version}"`);

  const kpis = (await registry.adapters["kpis.summary"]!.run({})) as {
    totalSkus: number;
    lowStockCount: number;
    openPoCount: number;
    openSpend: number;
  };
  console.log(
    `  kpis.summary returned: totalSkus=${kpis.totalSkus}, lowStockCount=${kpis.lowStockCount}, openPoCount=${kpis.openPoCount}, openSpend=$${Math.round(kpis.openSpend).toLocaleString()}`,
  );

  const items = await registry.adapters["inventory-items.list"]!.run({});
  console.log(`  inventory-items.list returned ${items.length} rows`);

  const lowStock = await registry.adapters["inventory-items.list"]!.run({ lowStock: true });
  console.log(`  inventory-items.list (lowStock=true) returned ${lowStock.length} rows`);

  if (items.length > 0) {
    const sample = items[0]!;
    const detail = await registry.adapters["inventory-items.by-id"]!.run({ itemId: sample.id });
    console.log(`  inventory-items.by-id (${sample.id}) returned: ${detail.name} on hand=${detail.quantityOnHand}`);
  }

  const vendors = await registry.adapters["vendors.list"]!.run({});
  console.log(`  vendors.list returned ${vendors.length} rows`);

  if (vendors.length > 0) {
    const v = vendors[0]!;
    const vd = await registry.adapters["vendors.by-id"]!.run({ vendorId: v.id });
    console.log(`  vendors.by-id (${v.id}) returned: { name: '${vd.name}', openPoCount: ${vd.openPoCount} }`);
  }

  const pos = await registry.adapters["purchase-orders.list"]!.run({});
  console.log(`  purchase-orders.list returned ${pos.length} rows`);

  if (pos.length > 0) {
    const p = pos[0]!;
    const detail = await registry.adapters["purchase-orders.by-id"]!.run({ poId: p.id });
    console.log(
      `  purchase-orders.by-id (${p.id}) returned: ${detail.poNumber} status=${detail.status} lines=${detail.lineItems.length}`,
    );
  }

  // Test enrichment hook end-to-end.
  if (pos.length > 0) {
    const enriched = (await registry.enrichContext!(
      { user: { id: "smoke" }, po: { id: pos[0]!.id } },
      registry,
    )) as { vendor?: { id?: string } };
    console.log(`  enrichContext({po.id}) → vendor.id=${enriched.vendor?.id ?? "(missing)"}`);
  }

  if (registry.referenceData) {
    const ref = await registry.referenceData();
    const summary = Object.entries(ref)
      .map(([scope, items]) => `${scope}=${items.length}`)
      .join(", ");
    console.log(`  referenceData() returned scopes: ${summary}`);
    for (const [scope, items] of Object.entries(ref)) {
      const sample = items.slice(0, 2).map((it) => `${it.id} (${it.label})`).join(", ");
      console.log(`    ${scope}: ${sample}${items.length > 2 ? `, ... +${items.length - 2}` : ""}`);
    }
  } else {
    console.log("  referenceData: not exported by this registry");
  }

  console.log("Smoke OK.");
  // Pool keeps the process alive; explicit exit.
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

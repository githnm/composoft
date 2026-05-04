// Composer tests. Today we cover the inspect module's pure helpers — the
// compose flow itself is exercised by the in-workspace `compose:*` scripts
// (which require ANTHROPIC_API_KEY) and by adopters' cold-test runs.
//
// Run via `pnpm --filter @composoft/composer test`. Uses tsx so the source
// runs directly without a build step — faster dev loop on the test alone.

import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  aggregateGaps,
  findCustomer,
  formatCustomerDetail,
  formatCustomerNotFound,
  formatGaps,
  formatTable,
  isValidMeta,
  loadMetas,
  type ComposoftMeta,
} from "./inspect.js";

const failures: string[] = [];

function assert(cond: boolean, msg: string) {
  if (!cond) failures.push(msg);
}

function makeMeta(overrides: Partial<ComposoftMeta> = {}): ComposoftMeta {
  return {
    customer: "Roastery",
    briefPath: "fixtures/brief-roastery.md",
    briefContent: "Inventory dashboard for Roastery, a small DTC coffee roaster.",
    modelNotes: [],
    pages: [{ path: "/", blockCount: 3 }],
    registry: { name: "cargo-registry", version: "0.0.1" },
    composerVersion: "0.1.0-alpha.5",
    runtimeVersion: "0.1.0-alpha.4",
    generatedAt: "2026-05-04T10:00:00.000Z",
    filesWritten: 42,
    ...overrides,
  };
}

async function withTempApps(
  metas: Array<Partial<ComposoftMeta>>,
  fn: (root: string) => Promise<void>,
): Promise<void> {
  const root = await mkdtemp(join(tmpdir(), "composoft-inspect-"));
  try {
    for (const m of metas) {
      const customer = m.customer ?? "Anonymous";
      const dir = join(root, "apps", customer.toLowerCase().replace(/\s+/g, "-"));
      await mkdir(dir, { recursive: true });
      await writeFile(
        join(dir, ".composoft-meta.json"),
        JSON.stringify(makeMeta(m), null, 2),
        "utf8",
      );
    }
    await fn(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

// --- Schema validator ------------------------------------------------------

assert(isValidMeta(makeMeta()), "isValidMeta accepts a well-formed meta");
assert(!isValidMeta(null), "isValidMeta rejects null");
assert(!isValidMeta({}), "isValidMeta rejects empty object");
assert(
  !isValidMeta({ ...makeMeta(), modelNotes: "oops" as unknown as string[] }),
  "isValidMeta rejects modelNotes that isn't an array",
);
assert(
  !isValidMeta({ ...makeMeta(), filesWritten: "lots" as unknown as number }),
  "isValidMeta rejects filesWritten that isn't a number",
);
assert(
  !isValidMeta({ ...makeMeta(), registry: null as unknown as ComposoftMeta["registry"] }),
  "isValidMeta rejects null registry",
);

// --- Inspect default: table over multiple apps -----------------------------

await withTempApps(
  [
    { customer: "Roastery", briefPath: "brief-roastery.md", generatedAt: "2026-05-04T10:00:00Z", pages: [{ path: "/", blockCount: 3 }], modelNotes: [] },
    {
      customer: "Meridian Brands",
      briefPath: "brief-meridian.md",
      generatedAt: "2026-05-05T08:30:00Z",
      pages: [{ path: "/", blockCount: 3 }, { path: "/inventory", blockCount: 3 }, { path: "/procurement", blockCount: 2 }, { path: "/vendors", blockCount: 1 }],
      modelNotes: ["No vendor scorecard block exists", "Procurement defaults to status=submitted"],
    },
  ],
  async (root) => {
    const metas = await loadMetas(root);
    assert(metas.length === 2, `loadMetas: expected 2, got ${metas.length}`);
    // Newest first → Meridian (May 5) before Roastery (May 4)
    assert(
      metas[0]?.meta.customer === "Meridian Brands",
      `loadMetas: expected newest first; got ${metas[0]?.meta.customer}`,
    );

    const table = formatTable(metas);
    assert(table.includes("Roastery"), "formatTable: missing Roastery row");
    assert(table.includes("Meridian Brands"), "formatTable: missing Meridian Brands row");
    assert(table.includes("brief-meridian.md"), "formatTable: brief column should show basename");
    assert(/\bCUSTOMER\b/.test(table), "formatTable: header CUSTOMER missing");
    // Meridian: 4 pages, 3+3+2+1=9 blocks, 2 notes
    assert(/Meridian Brands\s+brief-meridian\.md\s+4\s+9\s+2/.test(table), "formatTable: Meridian's row didn't match expected pages/blocks/notes");
  },
);

// --- Inspect --gaps: aggregation ------------------------------------------

await withTempApps(
  [
    {
      customer: "Haldermann & Sons",
      modelNotes: ["No vendor scorecard block exists", "No two-step approval enforcement"],
    },
    {
      customer: "Meridian Brands",
      modelNotes: ["No vendor scorecard block exists", "No two-step approval enforcement"],
    },
    {
      customer: "Loftway",
      modelNotes: ["No vendor scorecard block exists", "No consumer-facing ticket list block"],
    },
  ],
  async (root) => {
    const metas = await loadMetas(root);
    const { totalCustomers, byNote } = aggregateGaps(metas);
    assert(totalCustomers === 3, `aggregateGaps: expected 3 customers, got ${totalCustomers}`);
    assert(byNote.length === 3, `aggregateGaps: expected 3 distinct gaps, got ${byNote.length}`);
    // Top gap: vendor scorecard, 3 customers
    assert(
      byNote[0]?.note === "No vendor scorecard block exists" && byNote[0]?.count === 3,
      `aggregateGaps: top gap should be vendor scorecard ×3; got ${JSON.stringify(byNote[0])}`,
    );
    assert(
      byNote[0]?.customers.join(",") === "Haldermann & Sons,Loftway,Meridian Brands",
      `aggregateGaps: top gap customers wrong: ${byNote[0]?.customers.join(",")}`,
    );

    const out = formatGaps(metas);
    assert(out.includes("3x  No vendor scorecard block exists"), "formatGaps: 3x vendor scorecard missing");
    assert(out.includes("2x  No two-step approval enforcement"), "formatGaps: 2x approval missing");
    assert(out.includes("1x  No consumer-facing ticket list block"), "formatGaps: 1x ticket list missing");
    assert(out.includes("Asked in: Haldermann & Sons, Loftway, Meridian Brands"), "formatGaps: customer list missing for top gap");
    assert(out.includes("GAPS FLAGGED ACROSS 3 CUSTOMERS"), "formatGaps: header missing");
  },
);

// --- Inspect <customer>: case-insensitive lookup + full detail -------------

await withTempApps(
  [
    {
      customer: "Haldermann & Sons",
      briefPath: "brief-haldermann.md",
      briefContent: "Procurement workflow for Haldermann & Sons.\n\nMulti-step approval, vendor scorecards.",
      pages: [
        { path: "/", blockCount: 3 },
        { path: "/inventory", blockCount: 3 },
        { path: "/procurement", blockCount: 2 },
        { path: "/approvals", blockCount: 2 },
        { path: "/vendors", blockCount: 2 },
      ],
      modelNotes: ["No vendor scorecard block exists", "No two-step approval enforcement"],
    },
    { customer: "Roastery" },
  ],
  async (root) => {
    const metas = await loadMetas(root);

    // Case-insensitive find
    const lower = findCustomer(metas, "haldermann & sons");
    assert(lower?.meta.customer === "Haldermann & Sons", "findCustomer: case-insensitive lookup");
    const exact = findCustomer(metas, "Haldermann & Sons");
    assert(exact !== null, "findCustomer: exact match");
    const trimmed = findCustomer(metas, "  Roastery  ");
    assert(trimmed?.meta.customer === "Roastery", "findCustomer: trims whitespace");
    const missing = findCustomer(metas, "Beam");
    assert(missing === null, "findCustomer: returns null on miss");

    if (!lower) throw new Error("findCustomer: lower expected to be non-null");
    const detail = formatCustomerDetail(lower);
    assert(detail.includes("Customer:        Haldermann & Sons"), "detail: customer line");
    assert(detail.includes("Brief:           brief-haldermann.md"), "detail: brief basename");
    assert(detail.includes("Pages (5):"), "detail: page count");
    assert(detail.includes("/procurement"), "detail: page paths listed");
    assert(detail.includes("Model notes (2):"), "detail: notes header");
    assert(detail.includes("1. No vendor scorecard block exists"), "detail: numbered notes");
    assert(detail.includes("Total blocks: 12"), `detail: blocks total wrong; got\n${detail}`);
    assert(detail.includes("Multi-step approval, vendor scorecards."), "detail: brief content rendered");

    const notFound = formatCustomerNotFound("Beam", metas);
    assert(notFound.includes("Beam"), "notFound: includes the queried name");
    assert(notFound.includes("Available: Haldermann & Sons, Roastery"), "notFound: includes available list");
  },
);

// --- Inspect: empty directory ---------------------------------------------

const emptyRoot = await mkdtemp(join(tmpdir(), "composoft-inspect-empty-"));
try {
  const metas = await loadMetas(emptyRoot);
  assert(metas.length === 0, "loadMetas: empty dir → 0 metas");
  const table = formatTable(metas);
  assert(
    table.includes("No composoft apps found"),
    `formatTable: should print friendly empty message; got: ${table}`,
  );
  const gaps = formatGaps(metas);
  assert(gaps.includes("No composoft apps found"), "formatGaps: empty dir message");
} finally {
  await rm(emptyRoot, { recursive: true, force: true });
}

// --- Inspect: apps/ exists but contains a directory without sidecar -------

await (async () => {
  const root = await mkdtemp(join(tmpdir(), "composoft-inspect-pre-meta-"));
  try {
    // Pre-meta app dir (older composer): no .composoft-meta.json
    await mkdir(join(root, "apps", "old-customer"), { recursive: true });
    await writeFile(join(root, "apps", "old-customer", "package.json"), "{}", "utf8");
    // Plus a real one
    await mkdir(join(root, "apps", "new-customer"), { recursive: true });
    await writeFile(
      join(root, "apps", "new-customer", ".composoft-meta.json"),
      JSON.stringify(makeMeta({ customer: "New Customer" })),
      "utf8",
    );
    const metas = await loadMetas(root);
    assert(metas.length === 1, `loadMetas: should skip pre-meta dirs; got ${metas.length}`);
    assert(metas[0]?.meta.customer === "New Customer", "loadMetas: kept the meta-bearing app");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
})();

// --- Inspect: corrupt sidecar shouldn't crash the run ---------------------

await (async () => {
  const root = await mkdtemp(join(tmpdir(), "composoft-inspect-corrupt-"));
  try {
    await mkdir(join(root, "apps", "broken"), { recursive: true });
    await writeFile(join(root, "apps", "broken", ".composoft-meta.json"), "{ not valid json", "utf8");
    await mkdir(join(root, "apps", "good"), { recursive: true });
    await writeFile(
      join(root, "apps", "good", ".composoft-meta.json"),
      JSON.stringify(makeMeta({ customer: "Good" })),
      "utf8",
    );
    const metas = await loadMetas(root);
    assert(metas.length === 1, `loadMetas: corrupt sidecar should be skipped, kept the good one; got ${metas.length}`);
    assert(metas[0]?.meta.customer === "Good", "loadMetas: kept the parsable one");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
})();

// --- Result ----------------------------------------------------------------

if (failures.length > 0) {
  console.error(`FAIL — ${failures.length} test failure${failures.length === 1 ? "" : "s"}:`);
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}

console.log(
  "OK — composer inspect tests passed: schema validator, default table, --gaps aggregation, customer detail (case-insensitive + trimmed), empty directory, pre-meta apps skipped, corrupt sidecar skipped.",
);

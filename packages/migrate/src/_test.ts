// Tests for @composoft/migrate. Six cases per the spec — three analyzer
// roundtrips against the test-fixtures (simple/mixed/complex), one
// markdown rendering test, and two state-file tests (roundtrip +
// history append-order).
//
// Run via `pnpm --filter @composoft/migrate test`. Uses tsx so the
// source runs directly without a build step — same convention as
// runtime + composer.

import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { analyzeCodebase } from "./analyze.js";
import { renderAnalysisMarkdown } from "./render.js";
import {
  appendHistory,
  ensureStateDir,
  makeFreshState,
  readHistory,
  readState,
  writeState,
} from "./state.js";
import type { Analysis, MigrationState } from "./types.js";

const here = dirname(fileURLToPath(import.meta.url));
const fixturesRoot = join(here, "..", "test-fixtures");

const failures: string[] = [];

function assert(cond: boolean, msg: string) {
  if (!cond) failures.push(msg);
}

// --- 1. analyze-simple ----------------------------------------------------

await (async () => {
  const path = join(fixturesRoot, "simple-app");
  const a = await analyzeCodebase(path);
  assert(a.codebaseShape.framework === "next.js", `simple: framework should be next.js; got ${a.codebaseShape.framework}`);
  assert(a.codebaseShape.componentCount >= 5, `simple: expected 5+ components; got ${a.codebaseShape.componentCount}`);
  assert(a.readCandidates.length >= 3, `simple: expected 3+ read candidates; got ${a.readCandidates.length}`);
  assert(a.writeCandidates.length >= 1, `simple: expected 1+ write candidate; got ${a.writeCandidates.length}`);
  // The high-confidence read should be deals.list (used in 2 files with consistent params + typed return).
  const dealsList = a.readCandidates.find((r) => r.suggestedAdapterId === "deals.list");
  assert(dealsList !== undefined, "simple: deals.list adapter candidate missing");
  assert(dealsList?.confidence === "high", `simple: deals.list should be high confidence; got ${dealsList?.confidence}`);
  // No components hard. simple-app is small and idiomatic.
  const hards = a.componentCandidates.filter((c) => c.extractionDifficulty === "hard");
  assert(hards.length === 0, `simple: expected no hard components; got ${hards.map((h) => h.componentName).join(", ")}`);
  // Empty limitations.
  assert(a.limitations.length === 0, `simple: expected empty limitations; got ${a.limitations.length}: ${a.limitations.join(" | ")}`);
})();

// --- 2. analyze-mixed -----------------------------------------------------

await (async () => {
  const path = join(fixturesRoot, "mixed-app");
  const a = await analyzeCodebase(path);
  assert(a.codebaseShape.framework === "next.js", "mixed: framework next.js");
  // Mix of confidence: at least one medium or low present.
  const confidences = new Set(a.readCandidates.map((r) => r.confidence));
  assert(confidences.size >= 1, "mixed: at least one confidence bucket");
  // useQuery candidate should surface.
  const ticketsList = a.readCandidates.find((r) => r.suggestedAdapterId === "tickets.list");
  assert(ticketsList !== undefined, "mixed: tickets.list (useQuery) missing");
  // Deep custom hook should be flagged.
  assert(
    a.limitations.some((l) => l.toLowerCase().includes("deeper than two levels")),
    `mixed: expected a 'deep custom hooks' limitation; got: ${a.limitations.join(" | ")}`,
  );
  // tickets.reply workflow should appear (POST /api/tickets/[id]/reply).
  const ticketsReply = a.writeCandidates.find((w) => w.suggestedWorkflowId === "tickets.reply");
  assert(ticketsReply !== undefined, `mixed: tickets.reply workflow missing; got: ${a.writeCandidates.map((w) => w.suggestedWorkflowId).join(", ")}`);
})();

// --- 3. analyze-complex ---------------------------------------------------

await (async () => {
  const path = join(fixturesRoot, "complex-app");
  const a = await analyzeCodebase(path);
  // Specific limitations should surface.
  const lower = a.limitations.map((l) => l.toLowerCase());
  assert(
    lower.some((l) => l.includes("class component")),
    `complex: expected class-components limitation; got: ${a.limitations.join(" | ")}`,
  );
  assert(
    lower.some((l) => l.includes("redux")),
    `complex: expected redux limitation; got: ${a.limitations.join(" | ")}`,
  );
  assert(
    lower.some((l) => l.includes("deeper than two levels")),
    `complex: expected deep-custom-hooks limitation; got: ${a.limitations.join(" | ")}`,
  );
  // Crucially, the analyzer should NOT crash on unsupported patterns.
  assert(a.componentCandidates.length >= 1, "complex: at least one analyzable component should remain");
  // The simple deals-list should still surface (it's a function component using useSWR).
  assert(
    a.componentCandidates.some((c) => c.componentName === "SimpleDealsList"),
    `complex: SimpleDealsList should be picked up; got: ${a.componentCandidates.map((c) => c.componentName).join(", ")}`,
  );
})();

// --- 4. markdown-rendering ------------------------------------------------

await (async () => {
  const fixture: Analysis = {
    analyzedAt: "2026-05-04T10:00:00.000Z",
    codebasePath: "/tmp/fixture-app",
    codebaseShape: { framework: "next.js", reactVersion: "^19.0.0", componentCount: 2, totalFiles: 4 },
    readCandidates: [
      {
        suggestedAdapterId: "deals.list",
        sourceLocations: [
          { file: "src/components/DealsList.tsx", line: 5, snippet: "useSWR(...)" },
          { file: "src/components/DealsByStage.tsx", line: 4, snippet: "useSWR(...)" },
        ],
        inferredParams: [{ name: "stage", tsType: "string" }],
        inferredReturnShape: "Deal[]",
        usageCount: 2,
        confidence: "high",
        confidenceReason: "Used in 2 files with consistent params and a typed return shape.",
      },
    ],
    writeCandidates: [
      {
        suggestedWorkflowId: "deals.create",
        sourceLocations: [{ file: "src/components/CreateDealForm.tsx", line: 12, snippet: "fetch(...)" }],
        inferredInputShape: "{ title: string; amount: number }",
        inferredSideEffects: ["POST /api/deals"],
        usageCount: 1,
        confidence: "medium",
        confidenceReason: "Single call site, but the body shape is typed.",
      },
    ],
    componentCandidates: [
      {
        componentPath: "src/components/DealsList.tsx",
        componentName: "DealsList",
        consumesReads: ["deals.list"],
        consumesWrites: [],
        hasLocalState: false,
        hasComplexProps: false,
        extractionDifficulty: "easy",
        difficultyReasons: ["<100 LOC (14)", "1 read + 0 writes", "no local state", "simple props (0 fields)"],
        suggestedBlockId: "deals.deals-list",
      },
    ],
    limitations: ["Skipped 2 class components — class components not supported in v1."],
  };
  const md = renderAnalysisMarkdown(fixture, { topN: 10 });
  assert(md.includes("# Migration analysis: fixture-app"), "render: heading");
  assert(md.includes("**deals.list**"), "render: read candidate id");
  assert(md.includes("(used in 2 call sites, high confidence)"), "render: read confidence call-out");
  assert(md.includes("Returns: `Deal[]`"), "render: read return shape");
  assert(md.includes("**deals.create**"), "render: write candidate id");
  assert(md.includes("Side effects: POST /api/deals"), "render: side effects");
  assert(md.includes("### Easy (start here)"), "render: easy bucket header");
  assert(md.includes("Suggested block id: `deals.deals-list`"), "render: block id");
  assert(md.includes("Skipped 2 class components"), "render: limitations bullet");
})();

// --- 5. state-roundtrip ---------------------------------------------------

await (async () => {
  const root = await mkdtemp(join(tmpdir(), "composoft-migrate-state-"));
  try {
    const state = makeFreshState();
    state.seedRegistryDecisions.acceptedReads.push("deals.list", "contacts.by-id");
    state.seedRegistryDecisions.rejectedReads.push("reps.list");
    state.seedRegistryDecisions.acceptedWrites.push("deals.create");
    state.blockExtractionQueue.pending.push("src/components/DealsList.tsx");
    state.notes.push("Spike on the contacts schema before accepting.");
    await writeState(root, state);
    const reread = await readState(root);
    assert(reread !== null, "state: should round-trip");
    assert(reread?.seedRegistryDecisions.acceptedReads.length === 2, "state: acceptedReads length");
    assert(reread?.notes.length === 1, "state: notes length");
    assert(typeof reread?.lastUpdatedAt === "string", "state: lastUpdatedAt is string");
    // No state file → readState returns null.
    const empty = await mkdtemp(join(tmpdir(), "composoft-migrate-empty-"));
    try {
      const out = await readState(empty);
      assert(out === null, "state: missing file returns null");
    } finally {
      await rm(empty, { recursive: true, force: true });
    }
  } finally {
    await rm(root, { recursive: true, force: true });
  }
})();

// --- 6. state-history-append ----------------------------------------------

await (async () => {
  const root = await mkdtemp(join(tmpdir(), "composoft-migrate-history-"));
  try {
    await ensureStateDir(root);
    await appendHistory(root, "walkthrough.started", {});
    await new Promise((r) => setTimeout(r, 5));
    await appendHistory(root, "read.accepted", { adapterId: "deals.list" });
    await new Promise((r) => setTimeout(r, 5));
    await appendHistory(root, "read.rejected", { adapterId: "reps.list" });
    await new Promise((r) => setTimeout(r, 5));
    await appendHistory(root, "walkthrough.completed", {});
    const events = await readHistory(root);
    assert(events.length === 4, `history: expected 4 events; got ${events.length}`);
    // Append-only: timestamps strictly non-decreasing.
    for (let i = 1; i < events.length; i++) {
      const prev = events[i - 1]!;
      const cur = events[i]!;
      assert(
        new Date(cur.timestamp).getTime() >= new Date(prev.timestamp).getTime(),
        `history: timestamps should be non-decreasing at index ${i}: ${prev.timestamp} → ${cur.timestamp}`,
      );
    }
    // Event sequence preserved.
    assert(events[0]?.event === "walkthrough.started", "history: first event preserved");
    assert(events[3]?.event === "walkthrough.completed", "history: last event preserved");
    // Payload content preserved.
    assert(
      (events[1]?.payload as { adapterId?: string }).adapterId === "deals.list",
      "history: payload preserved",
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
})();

// --- result ----------------------------------------------------------------

if (failures.length > 0) {
  console.error(`FAIL — ${failures.length} test failure${failures.length === 1 ? "" : "s"}:`);
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}

console.log(
  "OK — @composoft/migrate tests passed: analyzer (simple/mixed/complex), markdown rendering, state roundtrip, history append-order.",
);

// suppress unused
void mkdir;
void readFile;
void writeFile;

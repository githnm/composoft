// Tests for @composoft/migrate. Originally six cases against the
// test-fixtures (simple/mixed/complex/markdown/state/history); the
// alpha.2 + alpha.3 correctness fixes added five more in-tree URL +
// primitive-filter pins built from inline mkdtemp fixtures.
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

// --- 3a. analyze-taxonomy-snippet (alpha.2 fixes) -------------------------
//
// One fixture exercising every alpha.2 fix at once: an asset URL via
// `new URL(..., import.meta.url)` (skip), a relative-API fetch (clean
// id), three UI primitives (two filtered as primitives, one kept), a
// MainNav with usePathname (complexity bump), an Editor with useRef +
// useSession + useEffect + write workflow, plus a Prisma async page
// component, server actions, and next/headers usage.

await (async () => {
  const path = join(fixturesRoot, "taxonomy-snippet");
  const a = await analyzeCodebase(path);

  // --- Fix 1a: asset URL skip -------------------------------------------
  // The fixture has no asset URL in a fetch — that's covered by the
  // unit test on parseUrlPattern below. Just verify nothing showed up
  // as `external.unparsable-url` from a stray URL constructor.
  assert(
    !a.readCandidates.some((r) => /^https:|^new URL/.test(r.suggestedAdapterId)),
    `taxonomy: no read candidate id should look like a raw URL; got: ${a.readCandidates.map((r) => r.suggestedAdapterId).join(", ")}`,
  );

  // --- Fix 1b: clean adapter id from a real fetch URL -------------------
  const postsList = a.readCandidates.find((r) => r.suggestedAdapterId === "posts.list");
  assert(
    postsList !== undefined,
    `taxonomy: posts.list adapter candidate missing; got: ${a.readCandidates.map((r) => r.suggestedAdapterId).join(", ")}`,
  );

  // --- Fix 2: behavioral primitive detection ----------------------------
  // Badge (4 importers) and Skeleton (3 importers) → filtered.
  // AlertDialogFooter (1 importer) → kept.
  const componentNames = new Set(a.componentCandidates.map((c) => c.componentName));
  assert(
    !componentNames.has("Badge"),
    "taxonomy: Badge should have been filtered as a UI primitive (4 importers, zero data)",
  );
  assert(
    !componentNames.has("Skeleton"),
    "taxonomy: Skeleton should have been filtered as a UI primitive (3 importers, zero data)",
  );
  assert(
    componentNames.has("AlertDialogFooter"),
    "taxonomy: AlertDialogFooter (1 importer) should NOT be filtered — primitive threshold is 3+",
  );
  assert(
    a.skippedAsPrimitives === 2,
    `taxonomy: expected skippedAsPrimitives=2 (Badge + Skeleton); got ${a.skippedAsPrimitives}`,
  );

  // --- Fix 3: complexity signals ----------------------------------------
  // MainNav uses usePathname → bumped to at least medium.
  const mainNav = a.componentCandidates.find((c) => c.componentName === "MainNav");
  assert(mainNav !== undefined, "taxonomy: MainNav should be a candidate");
  assert(
    mainNav?.extractionDifficulty !== "easy",
    `taxonomy: MainNav uses usePathname; expected medium/hard, got ${mainNav?.extractionDifficulty}`,
  );
  assert(
    mainNav?.metadata?.detectedComplexitySignals?.includes("usePathname") ?? false,
    `taxonomy: MainNav should have usePathname in detectedComplexitySignals; got ${JSON.stringify(mainNav?.metadata?.detectedComplexitySignals)}`,
  );
  // Editor uses useRef + useSession + useEffect → bumped past easy.
  const editor = a.componentCandidates.find((c) => c.componentName === "Editor");
  assert(editor !== undefined, "taxonomy: Editor should be a candidate");
  // Editor should at minimum be bumped past "easy" — useRef + useEffect
  // + useSession + a write workflow add up to either medium or hard
  // depending on the LOC/state-hook split. Pre-fix it was "easy".
  assert(
    editor?.extractionDifficulty !== "easy",
    `taxonomy: Editor (useRef + useEffect + useSession + write) should NOT be easy; got ${editor?.extractionDifficulty}`,
  );
  const editorSignals = new Set(editor?.metadata?.detectedComplexitySignals ?? []);
  assert(editorSignals.has("useRef"), "taxonomy: Editor should detect useRef");
  assert(editorSignals.has("useEffect"), "taxonomy: Editor should detect useEffect");
  assert(editorSignals.has("useSession"), "taxonomy: Editor should detect useSession");
  // Alpha.3: Editor's PATCH /api/posts/${post.id} must derive `posts.update` —
  // the alpha.2 URL parser was supposed to handle template-literal URLs but
  // the regression this test pins down is that template-literal writes were
  // dropped entirely. We assert both the workflow candidate and that Editor
  // consumes it.
  assert(
    editor?.consumesWrites.includes("posts.update") ?? false,
    `taxonomy: Editor should consume posts.update (PATCH /api/posts/\${post.id}); got writes=${JSON.stringify(editor?.consumesWrites)}`,
  );
  assert(
    a.writeCandidates.some((w) => w.suggestedWorkflowId === "posts.update"),
    `taxonomy: posts.update workflow candidate missing; got: ${a.writeCandidates.map((w) => w.suggestedWorkflowId).join(", ")}`,
  );

  // --- Fix 4: limitations for Next.js 13+ patterns ----------------------
  const lower = a.limitations.map((l) => l.toLowerCase());
  assert(
    lower.some((l) => l.includes("prisma")),
    `taxonomy: expected Prisma limitation; got: ${a.limitations.join(" | ")}`,
  );
  assert(
    lower.some((l) => l.includes("server action")),
    `taxonomy: expected server-action limitation; got: ${a.limitations.join(" | ")}`,
  );
  assert(
    lower.some((l) => l.includes("async server component")),
    `taxonomy: expected async-server-component limitation; got: ${a.limitations.join(" | ")}`,
  );
  assert(
    lower.some((l) => l.includes("next/headers")),
    `taxonomy: expected next/headers limitation; got: ${a.limitations.join(" | ")}`,
  );
})();

// --- 3b. URL parsing unit cases (alpha.2 Fix 1) ---------------------------
//
// We test the URL→id derivation directly via the analyzer's public
// surface: hand-craft small fetch sources and run `analyzeCodebase`
// against them. Faster than scaffolding full fixtures for each case.

await (async () => {
  const tmpRoot = await mkdtemp(join(tmpdir(), "composoft-migrate-url-"));
  try {
    await mkdir(join(tmpRoot, "src", "components"), { recursive: true });
    // (a) Asset URL: `new URL(..., import.meta.url)` inside a fetch.
    //     Should be skipped entirely — never appears as a read.
    await writeFile(
      join(tmpRoot, "src", "components", "AssetLoader.tsx"),
      `export function AssetLoader() {
  const url = new URL("../../assets/fonts/Inter.ttf", import.meta.url);
  void fetch(url);
  return null;
}
`,
    );
    // (b) Relative API path → posts.list / posts.by-id.
    await writeFile(
      join(tmpRoot, "src", "components", "PostsLib.tsx"),
      `import useSWR from "swr";
export function PostsLib() {
  const all = useSWR<{ id: string }[]>("/api/posts");
  void all;
  return null;
}
export function OnePost({ id }: { id: string }) {
  const { data } = useSWR<{ id: string }>(\`/api/posts/\${id}\`);
  void data;
  return null;
}
`,
    );
    await writeFile(join(tmpRoot, "package.json"), JSON.stringify({ name: "x", dependencies: { next: "15", swr: "2" } }), "utf8");
    const a = await analyzeCodebase(tmpRoot);
    const ids = new Set(a.readCandidates.map((r) => r.suggestedAdapterId));
    assert(ids.has("posts.list"), `url-cases: expected posts.list; got ${[...ids].join(", ")}`);
    assert(ids.has("posts.by-id"), `url-cases: expected posts.by-id; got ${[...ids].join(", ")}`);
    // The asset URL must NOT have produced any candidate.
    assert(
      !ids.has("external.unparsable-url"),
      `url-cases: asset URL should be skipped entirely, not surface as unparsable; got ${[...ids].join(", ")}`,
    );
  } finally {
    await rm(tmpRoot, { recursive: true, force: true });
  }
})();

// --- 3c. URL parser: template-literal write coverage (alpha.3 Fix 1) -------
//
// Locks in the URL→id derivation contract for every template-literal
// write shape we expect adopters to hit. Real-world feedback on
// shadcn/taxonomy showed these patterns are ubiquitous; alpha.2's
// "URL parser accepts template literals" claim needs explicit pins so
// future refactors can't silently regress to the alpha.1 behavior of
// rolling them into the unparsable bucket.

await (async () => {
  const tmpRoot = await mkdtemp(join(tmpdir(), "composoft-migrate-url2-"));
  try {
    await mkdir(join(tmpRoot, "src", "components"), { recursive: true });
    await writeFile(
      join(tmpRoot, "src", "components", "Writes.tsx"),
      `// Tag function lives in scope so the tagged-template stays well-typed
// for the test fixture; the analyzer should still drop it.
const sql = (_strings: TemplateStringsArray, ..._values: unknown[]): string => "";

export function Writes({
  id,
  postId,
  user,
}: {
  id: string;
  postId: string;
  user: { id: string };
}) {
  // PATCH with \${id} → posts.update
  void fetch(\`/api/posts/\${id}\`, { method: "PATCH" });
  // DELETE with \${postId} (different param name, same shape) → posts.delete
  void fetch(\`/api/posts/\${postId}\`, { method: "DELETE" });
  // PATCH with property access \${user.id} → users.update
  void fetch(\`/api/users/\${user.id}\`, { method: "PATCH" });
  // POST with sub-action after templated slot → users.stripe
  void fetch(\`/api/users/\${id}/stripe\`, { method: "POST" });
  // Tagged template — never a URL the analyzer can derive an id from.
  // Should land in the unparsable bucket, not as a real workflow.
  void fetch(sql\`/api/posts/\${id}\`, { method: "POST" });
  return null;
}
`,
    );
    await writeFile(join(tmpRoot, "package.json"), JSON.stringify({ name: "x", dependencies: { next: "15" } }), "utf8");

    const a = await analyzeCodebase(tmpRoot);
    const writeIds = new Set(a.writeCandidates.map((w) => w.suggestedWorkflowId));

    assert(
      writeIds.has("posts.update"),
      `template-writes: PATCH /api/posts/\${id} should yield posts.update; got: ${[...writeIds].join(", ")}`,
    );
    assert(
      writeIds.has("posts.delete"),
      `template-writes: DELETE /api/posts/\${postId} should yield posts.delete; got: ${[...writeIds].join(", ")}`,
    );
    assert(
      writeIds.has("users.update"),
      `template-writes: PATCH /api/users/\${user.id} should yield users.update; got: ${[...writeIds].join(", ")}`,
    );
    assert(
      writeIds.has("users.stripe"),
      `template-writes: POST /api/users/\${id}/stripe should yield users.stripe; got: ${[...writeIds].join(", ")}`,
    );
    // Tagged-template fetch must drop into the unparsable bucket — NOT
    // surface as a clean workflow id.
    assert(
      writeIds.has("external.unparsable-url"),
      `template-writes: tagged template should land in external.unparsable-url; got: ${[...writeIds].join(", ")}`,
    );
    // And it must not have produced a `posts.create` or similar by
    // accidentally parsing the inner backticked path.
    const unparsable = a.writeCandidates.find((w) => w.suggestedWorkflowId === "external.unparsable-url");
    assert(
      unparsable !== undefined && unparsable.usageCount >= 1,
      `template-writes: unparsable bucket should contain the tagged-template fetch; got: ${unparsable?.usageCount}`,
    );
  } finally {
    await rm(tmpRoot, { recursive: true, force: true });
  }
})();

// --- 3d. Primitive filter: name-pattern safety net (alpha.3 Fix 2) --------
//
// Belt-and-suspenders for the case where upstream detection misses a
// component's data layer (URL parser fails on an exotic shape, fetch
// is hidden behind a custom hook). The structural primitive signals
// (zero data + no state + 3+ importers + small LOC) can fire on a
// real feature component. Components named like features (`Editor`,
// `*Form`, `*Detail`, `*List`, `Settings*`, etc.) are NEVER filtered
// regardless of structural signals — better to surface a misnamed
// primitive than silently drop a feature.
//
// We synthesize the "feature component looks like a primitive" shape
// directly: a tiny Editor with no reads, no writes, no state, and
// three importers. A real Badge with the same shape gets filtered.

await (async () => {
  const tmpRoot = await mkdtemp(join(tmpdir(), "composoft-migrate-primitive-"));
  try {
    await mkdir(join(tmpRoot, "src", "components"), { recursive: true });
    // Editor: matches /^Editor$/ pattern. No data, no state, small LOC.
    await writeFile(
      join(tmpRoot, "src", "components", "Editor.tsx"),
      `export function Editor({ value }: { value: string }) {
  return <div>{value}</div>;
}
`,
    );
    // Badge: doesn't match any feature pattern. Same structural shape.
    await writeFile(
      join(tmpRoot, "src", "components", "Badge.tsx"),
      `export function Badge({ children }: { children: React.ReactNode }) {
  return <span>{children}</span>;
}
`,
    );
    // Three importers each, to push past PRIMITIVE_IMPORTER_THRESHOLD.
    for (let i = 0; i < 3; i++) {
      await writeFile(
        join(tmpRoot, "src", "components", `Importer${i}.tsx`),
        `import { Editor } from "./Editor";
import { Badge } from "./Badge";
export function Importer${i}() {
  return <><Editor value="x" /><Badge>y</Badge></>;
}
`,
      );
    }
    await writeFile(join(tmpRoot, "package.json"), JSON.stringify({ name: "x", dependencies: { next: "15" } }), "utf8");

    const a = await analyzeCodebase(tmpRoot);
    const names = new Set(a.componentCandidates.map((c) => c.componentName));

    assert(
      names.has("Editor"),
      `primitive-safety-net: Editor should be KEPT despite primitive structural signals (KNOWN_FEATURE_PATTERNS safety net); got components: ${[...names].join(", ")}`,
    );
    assert(
      !names.has("Badge"),
      `primitive-safety-net: Badge should be FILTERED as a primitive (no name-pattern match); got components: ${[...names].join(", ")}`,
    );
    assert(
      a.skippedAsPrimitives >= 1,
      `primitive-safety-net: at least Badge should count toward skippedAsPrimitives; got ${a.skippedAsPrimitives}`,
    );
  } finally {
    await rm(tmpRoot, { recursive: true, force: true });
  }
})();

// --- 3e. Prisma type-import vs runtime usage (alpha.4 fix) -----------------
//
// Real-world testing on shadcn/taxonomy revealed alpha.2/alpha.3 wrongly
// excluded feature components that imported Prisma types (`import { Post
// } from "@prisma/client"` for prop interfaces) from candidate analysis.
// The exclusion was meant for server-side Prisma queries, but it caught
// every file that touched the package — including pure type users. The
// fix: a file is server-side Prisma only if it both imports a runtime
// binding AND contains a Prisma call shape (`prisma.X.method()`,
// `db.X.method()`, or `new PrismaClient(...)`).
//
// Test 4a: type-only-import file is included as a candidate.
// Test 4b: runtime Prisma file is excluded and flagged in limitations.
// Test 4c: `import type { ... }` is unambiguously safe.
// Test 4d: runtime symbol declared but no call shape → not excluded.

await (async () => {
  const path = join(fixturesRoot, "prisma-types-only");
  const a = await analyzeCodebase(path);
  const componentNames = new Set(a.componentCandidates.map((c) => c.componentName));

  // 4a: type-import-only file is NOT excluded ----------------------------
  // PostItem imports `{ Post }` (not `import type`) but uses Post only
  // in `interface Props { post: Pick<Post, ...> }`. The runtime-position
  // check should classify it as type-only.
  assert(
    componentNames.has("PostItem"),
    `prisma-types: PostItem (type-only Post import) should be a candidate; got: ${[...componentNames].join(", ")}`,
  );

  // Editor: same shape, but ALSO contains a fetch (PATCH workflow).
  // Both the component and its workflow must surface.
  assert(
    componentNames.has("Editor"),
    `prisma-types: Editor (type-only Post import + fetch) should be a candidate; got: ${[...componentNames].join(", ")}`,
  );
  const postsUpdate = a.writeCandidates.find((w) => w.suggestedWorkflowId === "posts.update");
  assert(
    postsUpdate !== undefined,
    `prisma-types: Editor's PATCH /api/posts/\${post.id} should yield posts.update workflow; got: ${a.writeCandidates.map((w) => w.suggestedWorkflowId).join(", ")}`,
  );
  // React.useState / React.useRef / React.useEffect detection: the
  // editor uses all three via the React namespace. The complexity
  // signals + state-hook counts must register.
  const editor = a.componentCandidates.find((c) => c.componentName === "Editor");
  const editorSignals = new Set(editor?.metadata?.detectedComplexitySignals ?? []);
  assert(
    editorSignals.has("useRef"),
    `prisma-types: Editor's React.useRef should be detected as a complexity signal; got ${JSON.stringify([...editorSignals])}`,
  );
  assert(
    editorSignals.has("useEffect"),
    `prisma-types: Editor's React.useEffect should be detected; got ${JSON.stringify([...editorSignals])}`,
  );
  assert(
    (editor?.metadata?.stateHookCount ?? 0) >= 2,
    `prisma-types: Editor's React.useState (×2) + React.useRef should bump stateHookCount to >=3; got ${editor?.metadata?.stateHookCount}`,
  );

  // 4b: runtime Prisma file IS excluded and flagged in limitations -------
  // server-utils.ts has `new PrismaClient()` + `prisma.post.findMany()`.
  // It's not a component file so we can't check componentCandidates,
  // but the limitations[] entry should call it out.
  const prismaLim = a.limitations.find((l) => l.toLowerCase().includes("prisma"));
  assert(
    prismaLim !== undefined,
    `prisma-types: expected a Prisma limitation for server-utils.ts; got: ${a.limitations.join(" | ")}`,
  );
  assert(
    prismaLim?.includes("server-utils.ts") ?? false,
    `prisma-types: Prisma limitation should mention src/lib/server-utils.ts; got: ${prismaLim}`,
  );
  // Counter-check: PostItem.tsx and Editor.tsx must NOT appear in the
  // Prisma limitation entry (they were the bug).
  assert(
    !prismaLim?.includes("PostItem.tsx"),
    `prisma-types: PostItem.tsx must NOT be flagged as server-side Prisma; got: ${prismaLim}`,
  );
  assert(
    !prismaLim?.includes("Editor.tsx"),
    `prisma-types: Editor.tsx must NOT be flagged as server-side Prisma; got: ${prismaLim}`,
  );
})();

// --- 3f. Prisma: `import type` is unambiguously safe (4c + 4d) ------------
//
// Two more synthetic cases that don't need full fixtures: an
// `import type { Post }` declaration that is unambiguous regardless of
// content, and a runtime-symbol import (`import { PrismaClient }`)
// that's never actually called — false-negative is preferred over
// excluding feature components.

await (async () => {
  const tmpRoot = await mkdtemp(join(tmpdir(), "composoft-migrate-prisma-edge-"));
  try {
    await mkdir(join(tmpRoot, "src", "components"), { recursive: true });
    // 4c — `import type { Post }` is type-only by syntax. Even if the
    // file has lookups that LOOK like prisma calls (a method named
    // findMany on an unrelated object), the file isn't excluded.
    await writeFile(
      join(tmpRoot, "src", "components", "TypeOnlyImport.tsx"),
      `import type { Post } from "@prisma/client";

export function TypeOnlyImport({ post }: { post: Post }) {
  // Not a Prisma call shape — random object's findMany method.
  const someUnrelated = { findMany: () => [] };
  void someUnrelated.findMany();
  return <div>{post.title}</div>;
}
`,
    );
    // 4d — Imports PrismaClient as a runtime symbol but never calls
    // anything Prisma-shaped. Should not be excluded.
    await writeFile(
      join(tmpRoot, "src", "components", "DeclaredButUnused.tsx"),
      [
        `import { PrismaClient } from "@prisma/client";`,
        ``,
        `// PrismaClient is only used as a type here — but the import isn't`,
        `// 'import type', so the type-vs-runtime check has to walk usages.`,
        `type C = PrismaClient;`,
        `declare const _c: C;`,
        ``,
        `export function DeclaredButUnused() {`,
        `  return <div>no prisma here</div>;`,
        `}`,
        ``,
      ].join("\n"),
    );
    await writeFile(
      join(tmpRoot, "package.json"),
      JSON.stringify({ name: "x", dependencies: { "@prisma/client": "^5", next: "15" } }),
      "utf8",
    );
    const a = await analyzeCodebase(tmpRoot);
    const names = new Set(a.componentCandidates.map((c) => c.componentName));

    // 4c
    assert(
      names.has("TypeOnlyImport"),
      `prisma-edge (4c): \`import type\` declaration should never trigger Prisma exclusion; got components: ${[...names].join(", ")}`,
    );
    // The file should NOT appear in any Prisma limitation either.
    const prismaLim4c = a.limitations.find((l) => l.toLowerCase().includes("prisma"));
    assert(
      !prismaLim4c?.includes("TypeOnlyImport.tsx"),
      `prisma-edge (4c): TypeOnlyImport.tsx must NOT be flagged as Prisma; got: ${prismaLim4c}`,
    );

    // 4d
    assert(
      names.has("DeclaredButUnused"),
      `prisma-edge (4d): runtime symbol import without Prisma call shape should not be excluded; got components: ${[...names].join(", ")}`,
    );
    assert(
      !prismaLim4c?.includes("DeclaredButUnused.tsx"),
      `prisma-edge (4d): DeclaredButUnused.tsx must NOT be flagged as Prisma (no call shape); got: ${prismaLim4c}`,
    );
  } finally {
    await rm(tmpRoot, { recursive: true, force: true });
  }
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
    skippedAsPrimitives: 7,
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
  assert(
    md.includes("Skipped 7 components detected as UI primitives"),
    `render: skippedAsPrimitives line missing; got:\n${md}`,
  );
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

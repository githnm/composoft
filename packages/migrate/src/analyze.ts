// The static analyzer. Walks an existing React/Next.js codebase, finds
// common read/write patterns (useSWR / useQuery / fetch), maps each
// component to the reads + writes it consumes, and ranks the result by
// usage frequency (for adapter/workflow candidates) and extraction
// difficulty (for component candidates). Output is a typed `Analysis`
// object — see types.ts for the schema.
//
// Honesty about limits: anything the analyzer can't safely interpret
// (class components, Redux selectors, deep custom hooks, server actions,
// GraphQL clients) is recorded in `analysis.limitations[]` rather than
// silently misrepresented. Cold-user trust depends on knowing what the
// tool didn't see.

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { basename, dirname, isAbsolute, relative, resolve } from "node:path";
import {
  Node,
  Project,
  SyntaxKind,
  type CallExpression,
  type ImportSpecifier,
  type SourceFile,
} from "ts-morph";
import type {
  Analysis,
  CodebaseShape,
  ComponentCandidate,
  Confidence,
  Difficulty,
  ReadCandidate,
  SourceLocation,
  WriteCandidate,
} from "./types.js";

// --- public entry point ----------------------------------------------------

/**
 * Run the analyzer over `codebasePath` and return a typed Analysis.
 * Synchronous on the AST side, async only because we read package.json.
 */
export async function analyzeCodebase(codebasePath: string): Promise<Analysis> {
  const root = resolve(codebasePath);
  const limitations: string[] = [];

  const shape = readCodebaseShape(root, limitations);

  // Build a single ts-morph Project rooted at the codebase. We don't
  // resolve declarations into node_modules — that's too slow for the
  // ranges of codebases adopters point at, and v0 only needs the
  // surface-level call graph.
  const project = new Project({
    skipAddingFilesFromTsConfig: true,
    skipFileDependencyResolution: true,
    compilerOptions: {
      allowJs: true,
      jsx: 4 /* preserve */,
      target: 99 /* esnext */,
      module: 99 /* esnext */,
      moduleResolution: 100 /* bundler */,
    },
  });

  const sourcePaths = collectSourceFiles(root);
  for (const p of sourcePaths) {
    try {
      project.addSourceFileAtPath(p);
    } catch {
      // ts-morph rejects truly malformed files. Skip silently — the
      // user's actual build will catch real syntax errors.
    }
  }

  // First pass: log limitations from any unsupported pattern. We do this
  // before per-component analysis so the limitations section reads
  // top-down even when the detector logic runs interleaved.
  detectGlobalLimitations(project.getSourceFiles(), root, limitations);

  // Second pass: gather every read + write call site, plus a
  // file-by-file map of which call sites belong to which file. The
  // component pass below uses that map to attribute usage.
  const allReads: RawRead[] = [];
  const allWrites: RawWrite[] = [];
  const componentFunctions: ComponentFunction[] = [];
  for (const sf of project.getSourceFiles()) {
    if (isInLegacyOrStore(sf, root)) continue;
    visitFile(sf, root, allReads, allWrites, componentFunctions);
  }

  // Group raw call sites into ranked candidates.
  const readCandidates = rankReadCandidates(allReads);
  const writeCandidates = rankWriteCandidates(allWrites);

  // Build an import graph: for every named import across every file,
  // remember which files imported that name. Used by the primitive
  // detector below to count importers without resolving file paths.
  const importerCounts = buildImporterCounts(project.getSourceFiles(), root);

  // Map each component to the reads/writes it consumes by file path.
  const allCandidates = buildComponentCandidates(
    componentFunctions,
    allReads,
    allWrites,
    readCandidates,
    writeCandidates,
  );

  // Filter out UI-primitive components (zero data, no state, used in
  // 3+ other files, <100 LOC). These are library primitives — buttons,
  // badges, dialogs — that adopters never want to extract as blocks.
  // The threshold of 3+ importers is the primary signal; LOC + lack
  // of state are guardrails against falsely flagging a small feature
  // component that happens to be imported widely.
  const { kept: componentCandidates, skipped: skippedAsPrimitives } =
    filterPrimitives(allCandidates, importerCounts);

  // Update component count post-collection — totalFiles already comes
  // from the cheap readCodebaseShape call.
  return {
    analyzedAt: new Date().toISOString(),
    codebasePath: root,
    codebaseShape: { ...shape, componentCount: componentCandidates.length },
    readCandidates,
    writeCandidates,
    componentCandidates,
    skippedAsPrimitives,
    limitations,
  };
}

/**
 * Build a map of `componentName → number of OTHER files that import it`.
 * Walks every file's import declarations and counts named imports.
 *
 * Heuristic — we don't resolve module specifiers to actual files. Two
 * unrelated files that both have a function named `Button` (e.g. one
 * in `components/ui/button` and one in `vendor/legacy/Button.tsx`) would
 * be conflated. In practice, projects use unique component names; the
 * count is good enough to drive the primitive-detection filter and
 * underestimates rather than overestimates.
 */
function buildImporterCounts(
  files: SourceFile[],
  root: string,
): Map<string, Set<string>> {
  const counts = new Map<string, Set<string>>();
  for (const sf of files) {
    const fp = relative(root, sf.getFilePath());
    for (const imp of sf.getImportDeclarations()) {
      for (const named of imp.getNamedImports()) {
        const name = named.getName();
        let s = counts.get(name);
        if (!s) {
          s = new Set<string>();
          counts.set(name, s);
        }
        s.add(fp);
      }
    }
  }
  return counts;
}

/**
 * Component name patterns that always survive the primitive filter,
 * regardless of structural signals.
 *
 * Defensive safety net: if upstream detection misses a component's
 * data layer (URL parser bails on an exotic shape, the fetch is hidden
 * behind a custom hook the analyzer doesn't follow, the read happens
 * in a parent and is passed down via props), the structural primitive
 * signals can fire on a real feature component. Hiding a feature
 * component is far worse than surfacing a misnamed primitive — the
 * FDE can see a `Badge` in the candidate list and skip it; they can't
 * discover an `Editor` we silently dropped.
 *
 * The patterns cover the common real-world feature-component naming
 * conventions: `Editor`, `*Form`, `*Detail`, `*List`, `*Page`,
 * `*Operations`, `*Layout`, plus `Settings`/`Profile`/`Sidebar`
 * substrings. Tuned conservatively — we'd rather let one too many
 * components through than filter a real feature.
 */
const KNOWN_FEATURE_PATTERNS: readonly RegExp[] = [
  /^Editor$/,
  /^[A-Z][a-z]+Form$/,
  /^[A-Z][a-z]+Detail$/,
  /^[A-Z][a-z]+List$/,
  /^[A-Z][a-z]+Page$/,
  /^[A-Z][a-z]+Operations$/,
  /^[A-Z][a-z]+Layout$/,
  /Settings/,
  /Profile/,
  /Sidebar/,
];

function isKnownFeatureName(name: string): boolean {
  for (const re of KNOWN_FEATURE_PATTERNS) {
    if (re.test(name)) return true;
  }
  return false;
}

function filterPrimitives(
  components: ComponentCandidate[],
  importerCounts: Map<string, Set<string>>,
): { kept: ComponentCandidate[]; skipped: number } {
  const PRIMITIVE_IMPORTER_THRESHOLD = 3;
  const PRIMITIVE_LOC_CEILING = 100;
  const kept: ComponentCandidate[] = [];
  let skipped = 0;
  for (const c of components) {
    // Name-pattern safety net first: if the component's name matches a
    // known feature pattern, never filter it as a primitive — even if
    // the structural signals (zero data + no state + widely imported +
    // small LOC) all fire. See KNOWN_FEATURE_PATTERNS for rationale.
    if (isKnownFeatureName(c.componentName)) {
      kept.push(c);
      continue;
    }
    const importers = importerCounts.get(c.componentName)?.size ?? 0;
    const loc = c.metadata?.locOfComponent ?? 0;
    const noData = c.consumesReads.length === 0 && c.consumesWrites.length === 0;
    const noState =
      !c.hasLocalState &&
      (c.metadata?.detectedComplexitySignals?.length ?? 0) === 0;
    const widelyImported = importers >= PRIMITIVE_IMPORTER_THRESHOLD;
    const small = loc > 0 && loc < PRIMITIVE_LOC_CEILING;
    if (noData && noState && widelyImported && small) {
      skipped++;
      continue;
    }
    kept.push(c);
  }
  return { kept, skipped };
}

// --- codebase shape --------------------------------------------------------

function readCodebaseShape(root: string, limitations: string[]): CodebaseShape {
  const pkgPath = resolve(root, "package.json");
  let framework: CodebaseShape["framework"] = "unknown";
  let reactVersion: string | null = null;
  if (existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(readFileSync(pkgPath, "utf8")) as {
        dependencies?: Record<string, string>;
        devDependencies?: Record<string, string>;
      };
      const deps = { ...pkg.dependencies, ...pkg.devDependencies };
      if (deps.next) framework = "next.js";
      else if (deps.vite || deps["@vitejs/plugin-react"]) framework = "vite";
      else if (deps["react-scripts"]) framework = "cra";
      reactVersion = deps.react ?? null;
    } catch {
      limitations.push(
        "Could not parse package.json at the codebase root — framework + react version detection skipped.",
      );
    }
  } else {
    limitations.push(
      "No package.json at the codebase root — framework + react version detection skipped.",
    );
  }
  // totalFiles is the cheap up-front count; componentCount gets
  // overwritten after the AST pass completes.
  const totalFiles = collectSourceFiles(root).length;
  return { framework, reactVersion, componentCount: 0, totalFiles };
}

// --- file walker -----------------------------------------------------------

const SOURCE_DIRS = ["src", "app", "pages", "components", "lib", "hooks"] as const;
const SKIP_DIR_NAMES = new Set([
  "node_modules", "dist", ".next", "build", "out", "coverage", ".git",
]);

function collectSourceFiles(root: string): string[] {
  const out: string[] = [];
  // Walk the conventional source dirs if they exist; otherwise walk the
  // root. Adopters with non-standard layouts will hit the root walker.
  const startPoints: string[] = [];
  for (const dir of SOURCE_DIRS) {
    const full = resolve(root, dir);
    if (existsSync(full)) startPoints.push(full);
  }
  if (startPoints.length === 0) startPoints.push(root);
  for (const start of startPoints) {
    walkDir(start, out);
  }
  // Dedupe — startPoints may overlap when src/components etc. exist.
  return Array.from(new Set(out));
}

function walkDir(dir: string, out: string[]): void {
  let entries: import("node:fs").Dirent[];
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const ent of entries) {
    if (SKIP_DIR_NAMES.has(ent.name)) continue;
    const full = resolve(dir, ent.name);
    if (ent.isDirectory()) {
      walkDir(full, out);
    } else if (
      ent.isFile() &&
      (ent.name.endsWith(".ts") ||
        ent.name.endsWith(".tsx") ||
        ent.name.endsWith(".js") ||
        ent.name.endsWith(".jsx"))
    ) {
      // Skip declaration files; they're not interesting for read/write
      // pattern detection.
      if (ent.name.endsWith(".d.ts")) continue;
      out.push(full);
    }
  }
}

// --- limitations: what we can't analyze -----------------------------------

/**
 * Walk every source file and collect honest "we couldn't analyze this"
 * notes by category. Grouping by category in the output keeps the
 * limitations section readable when a real codebase has many of each.
 *
 * The detected categories cover the gap between the analyzer's
 * supported patterns (function components + useSWR / useQuery / fetch)
 * and what real Next.js 13+ codebases actually use:
 *   - class components
 *   - Redux state stores
 *   - Server actions (`"use server"`)
 *   - GraphQL clients
 *   - Prisma / server-side database queries
 *   - Async server components in `app/`
 *   - `next/headers` cookies/headers reads
 *   - Deep custom hook chains
 */
function detectGlobalLimitations(
  files: SourceFile[],
  root: string,
  limitations: string[],
): void {
  let classComponentCount = 0;
  let reduxFiles = 0;
  let graphqlFiles = 0;
  const serverActionFiles: string[] = [];
  const prismaFiles: string[] = [];
  const asyncServerComponentFiles: string[] = [];
  const nextHeadersFiles: string[] = [];
  const deepHookFiles: string[] = [];

  for (const sf of files) {
    const text = sf.getFullText();
    const fp = relative(root, sf.getFilePath());

    // Class components: any `class X extends Component` or `extends React.Component`.
    if (/extends\s+(React\.)?(Pure)?Component\b/.test(text)) {
      classComponentCount += sf
        .getClasses()
        .filter((c) => {
          const heritage = c.getExtends();
          if (!heritage) return false;
          const t = heritage.getText();
          return /Component\b/.test(t);
        }).length;
    }

    // Redux: any import from react-redux or @reduxjs/toolkit or 'redux'.
    if (
      sf.getImportDeclarations().some((d) => {
        const m = d.getModuleSpecifierValue();
        return m === "react-redux" || m === "@reduxjs/toolkit" || m === "redux";
      })
    ) {
      reduxFiles++;
    }

    // Server actions: `"use server"` directive at file or function scope.
    // Only flag actual directive lines (string-literal expression statements
    // at the top of the file or function body) so a comment / code that
    // happens to mention the phrase doesn't trigger.
    if (hasUseServerDirective(sf)) {
      serverActionFiles.push(fp);
    }

    // GraphQL clients: any import from @apollo/client, urql, react-relay.
    if (
      sf.getImportDeclarations().some((d) => {
        const m = d.getModuleSpecifierValue();
        return (
          m === "@apollo/client" ||
          m === "urql" ||
          m === "react-relay" ||
          m.startsWith("@apollo/")
        );
      })
    ) {
      graphqlFiles++;
    }

    // Prisma: a file is "server-side Prisma" only if both an
    // @prisma/client runtime binding is in scope AND a Prisma call
    // shape exists in the file. Type-only imports (`import type { Post
    // } from "@prisma/client"`, or named imports used only in type
    // positions) do not exclude. See fileUsesPrismaAtRuntime for the
    // full rule.
    if (fileUsesPrismaAtRuntime(sf)) {
      prismaFiles.push(fp);
    }

    // next/headers: server-only auth/header reads.
    if (
      sf.getImportDeclarations().some((d) => {
        const m = d.getModuleSpecifierValue();
        return m === "next/headers";
      })
    ) {
      nextHeadersFiles.push(fp);
    }

    // Async server components: files under app/ that export an async
    // default function. The Next.js 13+ idiom for server-side data
    // fetching at the page boundary.
    if (fp.startsWith("app/") || fp.includes("/app/")) {
      const def = sf.getDefaultExportSymbol();
      void def;
      // Look at default export: function declaration with async modifier,
      // or a default-exported variable bound to an async arrow.
      for (const fn of sf.getFunctions()) {
        if (fn.isDefaultExport() && fn.isAsync()) {
          asyncServerComponentFiles.push(fp);
          break;
        }
      }
      // export default async function Page(...) { ... } may appear as
      // an ExportAssignment with an async function expression too.
      for (const exp of sf.getExportAssignments()) {
        const expr = exp.getExpression();
        const k = expr.getKind();
        if (
          (k === SyntaxKind.ArrowFunction || k === SyntaxKind.FunctionExpression) &&
          /^\s*async\b/.test(expr.getText())
        ) {
          asyncServerComponentFiles.push(fp);
          break;
        }
      }
    }

    // Deep custom hooks: a function whose name starts with `use` and
    // calls another function whose name also starts with `use` (other
    // than the React built-ins). Heuristic — captures the nested-hook
    // shape without resolving across files.
    for (const fn of getCustomHookDeclarations(sf)) {
      if (callsAnotherCustomHook(fn)) {
        deepHookFiles.push(fp);
        break;
      }
    }
  }

  if (classComponentCount > 0) {
    limitations.push(
      `Skipped ${classComponentCount} class component${classComponentCount === 1 ? "" : "s"} — class components not supported in v1; convert to function components or open an issue if many remain.`,
    );
  }
  if (reduxFiles > 0) {
    limitations.push(
      `Skipped Redux state management in ${reduxFiles} file${reduxFiles === 1 ? "" : "s"} — Redux selectors and actions are out of scope for v1; only React-hook-driven reads + writes are analyzed.`,
    );
  }
  pushFileGroup(
    limitations,
    "Server actions",
    serverActionFiles,
    "server actions are not analyzed in v1; the analyzer only sees client-side reads and writes",
  );
  pushFileGroup(
    limitations,
    "Prisma server-side queries",
    prismaFiles,
    "server-side data layer not analyzed in v1; reads through Prisma won't appear as adapter candidates",
  );
  pushFileGroup(
    limitations,
    "Async server components",
    asyncServerComponentFiles,
    "Next.js 13+ async server components are not analyzed in v1; data fetched at the page boundary won't appear",
  );
  pushFileGroup(
    limitations,
    "next/headers usage",
    nextHeadersFiles,
    "server-only auth/header reads are not analyzed in v1",
  );
  if (graphqlFiles > 0) {
    limitations.push(
      `GraphQL client imports detected in ${graphqlFiles} file${graphqlFiles === 1 ? "" : "s"} — Apollo / urql / Relay are not analyzed in v1; reads through GraphQL won't appear as adapter candidates.`,
    );
  }
  const uniqueDeep = Array.from(new Set(deepHookFiles));
  if (uniqueDeep.length > 0) {
    limitations.push(
      `Custom hooks deeper than two levels detected in ${uniqueDeep.length} file${uniqueDeep.length === 1 ? "" : "s"}: ${uniqueDeep.slice(0, 5).join(", ")}${uniqueDeep.length > 5 ? ", …" : ""}. The reads/writes through them may show as separate candidates rather than aggregated.`,
    );
  }
}

/**
 * Render a category as one limitations[] entry: `<Title> in N file(s):
 * <list> — <reason>`. Truncates the file list to the first 5 with an
 * ellipsis so the markdown stays scannable on real codebases.
 */
function pushFileGroup(
  limitations: string[],
  title: string,
  files: string[],
  reason: string,
): void {
  const unique = Array.from(new Set(files));
  if (unique.length === 0) return;
  const head = unique.slice(0, 5).join(", ");
  const more = unique.length > 5 ? `, … (${unique.length - 5} more)` : "";
  limitations.push(
    `${title} in ${unique.length} file${unique.length === 1 ? "" : "s"}: ${head}${more}. ${reason}.`,
  );
}

/**
 * `"use server"` directive detection. Matches the directive at the top
 * of a file (`"use server"\n` as first executable statement) or the top
 * of any function body. Avoids false positives on string literals
 * appearing elsewhere in code.
 */
function hasUseServerDirective(sf: SourceFile): boolean {
  const stmts = sf.getStatements();
  if (
    stmts.length > 0 &&
    Node.isExpressionStatement(stmts[0]!) &&
    /^["']use server["']\s*;?$/.test(stmts[0]!.getText().trim())
  ) {
    return true;
  }
  // Function-scope directives.
  for (const fn of sf.getFunctions()) {
    const body = fn.getBody();
    if (!body || !Node.isBlock(body)) continue;
    const first = body.getStatements()[0];
    if (
      first &&
      Node.isExpressionStatement(first) &&
      /^["']use server["']\s*;?$/.test(first.getText().trim())
    ) {
      return true;
    }
  }
  return false;
}

/**
 * Distinguish a file that runs Prisma server-side queries from one that
 * just imports Prisma TYPES for prop interfaces.
 *
 * Real-world testing on shadcn/taxonomy surfaced a false positive in the
 * alpha.2 rule: feature components that did `import { Post } from
 * "@prisma/client"` for prop typing were excluded as "Prisma server-side"
 * even though the import was purely structural — Post was used in
 * `interface Props { post: Post }`, never as a value.
 *
 * The corrected rule: a file is server-side Prisma ONLY if it both
 *   (1) has at least one `@prisma/client` import binding USED at
 *       runtime (not just in type positions), AND
 *   (2) actually performs a Prisma call shape — `prisma.<model>.<method>(...)`,
 *       any client-aliased call (`db.user.findMany()`, etc.), or
 *       `new PrismaClient(...)`.
 *
 * Either condition alone is insufficient. Type-only import without
 * runtime call → not server-side, keep file in candidate analysis. A
 * runtime symbol declared but never used in a Prisma call → don't
 * penalize the file (false-negatives are cheaper than false-positives;
 * the FDE can decide). Both conditions → exclude from candidate
 * analysis and flag in `limitations[]`.
 */
function fileUsesPrismaAtRuntime(sf: SourceFile): boolean {
  const prismaImports = sf
    .getImportDeclarations()
    .filter((d) => d.getModuleSpecifierValue() === "@prisma/client");
  if (prismaImports.length === 0) return false;

  // Step 1: any binding used at runtime?
  const anyRuntimeBinding = prismaImports.some((d) => {
    // `import type { ... } from "@prisma/client"` is unambiguously type-only.
    if (d.isTypeOnly()) return false;
    // Default and namespace imports are runtime-shaped (you can't have
    // an `import type ns from`/`import type * as ns`). Bias toward "yes
    // this is runtime" — step 2's call-shape check is the gate.
    if (d.getDefaultImport()) return true;
    if (d.getNamespaceImport()) return true;
    // Named imports: each is either marked `type` (skip) or used in a
    // type or value position (walk references).
    for (const ni of d.getNamedImports()) {
      if (ni.isTypeOnly()) continue;
      if (isImportSpecifierUsedAtRuntime(ni)) return true;
    }
    return false;
  });
  if (!anyRuntimeBinding) return false;

  // Step 2: actual Prisma call shape in the file?
  return hasPrismaRuntimeCall(sf);
}

/**
 * Quick text-level check for Prisma-shaped runtime calls. Cheaper than
 * walking every CallExpression and checking the receiver chain. The
 * regexes accept both `prisma.user.findMany()` and `db.user.findMany()`
 * style aliasing (the receiver name doesn't have to be exactly
 * `prisma`) — Prisma's documented API is `<client>.<model>.<method>(...)`.
 *
 * Also accepts `new PrismaClient()`: a file constructing the Prisma
 * client itself counts as runtime usage even if it doesn't make a call
 * in the same file (typical for `lib/db.ts` shapes).
 */
function hasPrismaRuntimeCall(sf: SourceFile): boolean {
  const text = sf.getFullText();
  // <client>.<model>.<method>(...) — the canonical Prisma call shape.
  // We accept any `<lowerIdent>.<lowerIdent>.<knownPrismaMethod>` so
  // aliased clients (`db.post.findMany()`, `client.user.create()`) are
  // recognized too.
  const PRISMA_METHODS =
    "findMany|findFirst|findFirstOrThrow|findUnique|findUniqueOrThrow|create|update|delete|upsert|count|aggregate|groupBy|createMany|updateMany|deleteMany";
  const callRe = new RegExp(
    `\\b[a-z_$][\\w$]*\\.[a-zA-Z_$][\\w$]*\\.(?:${PRISMA_METHODS})\\b`,
  );
  if (callRe.test(text)) return true;
  // new PrismaClient(...) — direct client construction.
  if (/\bnew\s+PrismaClient\b/.test(text)) return true;
  return false;
}

/**
 * Check whether an `import { X } from "@prisma/client"` binding is
 * referenced anywhere in the file at a runtime (value) position.
 *
 * Strategy: find every reference to the binding's local name, then for
 * each reference walk up the parent chain. If we hit a TypeNode before
 * any value-position container, the reference is type-only. If we
 * reach a non-TypeNode parent (CallExpression, NewExpression, property
 * access target, JSX expression, return value, etc.) without crossing
 * a TypeNode, it's a runtime use.
 *
 * Errs toward "type-only" when the AST is ambiguous — undercounting
 * runtime use means we keep more files in candidate analysis, which is
 * the safer side.
 */
function isImportSpecifierUsedAtRuntime(ni: ImportSpecifier): boolean {
  // The "local name" of an import specifier is what the file uses to
  // refer to it: `import { X as Y } from "..."` → Y. ts-morph's
  // getNameNode() returns the identifier or string-literal of the
  // imported binding; we want the alias if any, falling back to the
  // imported name. Both expose findReferencesAsNodes via the symbol
  // resolver, but only on Identifier — string-literal imports
  // (`import { "type" as foo }`) are too rare to bother with.
  const aliasNode = ni.getAliasNode();
  const target = aliasNode ?? ni.getNameNode();
  if (!Node.isIdentifier(target)) return false;
  let refs: Node[];
  try {
    refs = target.findReferencesAsNodes();
  } catch {
    // Symbol resolution can fail on partially-typed projects; fall
    // back to "not runtime" so we don't false-positive.
    return false;
  }
  for (const ref of refs) {
    // Skip the declaration itself.
    if (ref === target) continue;
    if (!isInTypeOnlyPosition(ref)) return true;
  }
  return false;
}

/**
 * Walk up from a node and decide whether it's contained in a type
 * position (TypeReference, type alias, interface body, etc.) before
 * reaching a value-position ancestor.
 */
function isInTypeOnlyPosition(node: Node): boolean {
  let p: Node | undefined = node.getParent();
  while (p) {
    if (Node.isTypeNode(p)) return true;
    // ImportSpecifier itself is the declaration site — type-only by
    // construction (the binding name in the import declaration).
    if (Node.isImportSpecifier(p)) return true;
    // Stop at structural value-statement boundaries. If we got here
    // without hitting a TypeNode, the reference is in a runtime
    // position.
    if (
      Node.isCallExpression(p) ||
      Node.isNewExpression(p) ||
      Node.isPropertyAccessExpression(p) ||
      Node.isElementAccessExpression(p) ||
      Node.isVariableDeclaration(p) ||
      Node.isPropertyAssignment(p) ||
      Node.isShorthandPropertyAssignment(p) ||
      Node.isReturnStatement(p) ||
      Node.isThrowStatement(p) ||
      Node.isExpressionStatement(p) ||
      Node.isJsxExpression(p) ||
      Node.isJsxElement(p) ||
      Node.isJsxOpeningElement(p) ||
      Node.isJsxSelfClosingElement(p) ||
      Node.isBinaryExpression(p) ||
      Node.isConditionalExpression(p) ||
      Node.isArrayLiteralExpression(p) ||
      Node.isObjectLiteralExpression(p) ||
      Node.isTemplateExpression(p) ||
      Node.isAsExpression(p) ||
      Node.isSatisfiesExpression(p)
    ) {
      // AsExpression and SatisfiesExpression have a type-position child
      // (the type) and a value-position child (the expression). If the
      // node we walked up from was the TYPE side, we'd have hit the
      // TypeNode check first, so reaching here means it's the value
      // side.
      return false;
    }
    p = p.getParent();
  }
  return false;
}

function getCustomHookDeclarations(sf: SourceFile): Node[] {
  const out: Node[] = [];
  for (const fn of sf.getFunctions()) {
    const name = fn.getName();
    if (name && /^use[A-Z]/.test(name)) out.push(fn);
  }
  for (const v of sf.getVariableDeclarations()) {
    const name = v.getName();
    if (!/^use[A-Z]/.test(name)) continue;
    const init = v.getInitializer();
    if (
      init &&
      (init.getKind() === SyntaxKind.ArrowFunction ||
        init.getKind() === SyntaxKind.FunctionExpression)
    ) {
      out.push(init);
    }
  }
  return out;
}

// React's built-in hooks PLUS well-known data-layer "leaf" hooks from
// SWR / React Query. A custom hook that wraps any of these is shallow,
// not deep — the analyzer already understands these patterns directly.
// Only chains through user-defined `useFoo` functions count as "deep".
const REACT_BUILTIN_HOOKS = new Set([
  // React built-ins
  "useState",
  "useEffect",
  "useReducer",
  "useRef",
  "useMemo",
  "useCallback",
  "useContext",
  "useLayoutEffect",
  "useImperativeHandle",
  "useDebugValue",
  "useId",
  "useTransition",
  "useDeferredValue",
  "useSyncExternalStore",
  "useInsertionEffect",
  // SWR
  "useSWR",
  "useSWRImmutable",
  "useSWRConfig",
  "useSWRSubscription",
  // React Query
  "useQuery",
  "useQueries",
  "useInfiniteQuery",
  "useSuspenseQuery",
  "useMutation",
  "useQueryClient",
  // Next.js routing hooks
  "usePathname",
  "useRouter",
  "useSearchParams",
  "useParams",
]);

function callsAnotherCustomHook(fn: Node): boolean {
  for (const call of fn.getDescendantsOfKind(SyntaxKind.CallExpression)) {
    const callee = call.getExpression().getText();
    // Strip method call prefixes like `something.useThing` — rarely a
    // custom hook in practice but keep the leaf.
    const leaf = callee.split(".").pop() ?? callee;
    if (/^use[A-Z]/.test(leaf) && !REACT_BUILTIN_HOOKS.has(leaf)) {
      return true;
    }
  }
  return false;
}

function isInLegacyOrStore(sf: SourceFile, root: string): boolean {
  const rel = relative(root, sf.getFilePath());
  // Skip files we already counted in limitations — class components
  // live under legacy/, Redux state under store/. Adopters using
  // different conventions still get the correct skip path via the
  // per-file detector below.
  if (rel.startsWith("legacy/") || rel.includes("/legacy/")) return true;
  if (rel.startsWith("store/") || rel.includes("/store/")) return true;
  // Class component file? Don't extract reads/writes from inside class
  // bodies — the analyzer wasn't designed for them.
  for (const cls of sf.getClasses()) {
    const ext = cls.getExtends();
    if (ext && /Component\b/.test(ext.getText())) return true;
  }
  // Redux-using file? Same logic.
  if (
    sf.getImportDeclarations().some((d) => {
      const m = d.getModuleSpecifierValue();
      return m === "react-redux" || m === "@reduxjs/toolkit" || m === "redux";
    })
  ) {
    return true;
  }
  // Prisma-using file: server-side. The reads through Prisma aren't
  // client-side adapters; treating them as such would produce noise.
  // The limitations[] entry surfaces what was skipped.
  //
  // CRITICAL: `import { Post } from "@prisma/client"` for prop typing
  // is NOT server-side. Excluding it dropped feature components like
  // Editor / PostOperations / UserNameForm from candidate analysis in
  // alpha.2 + alpha.3 against shadcn/taxonomy. `fileUsesPrismaAtRuntime`
  // distinguishes type-only imports from runtime usage; only the
  // latter trips this exclusion.
  if (fileUsesPrismaAtRuntime(sf)) {
    return true;
  }
  // Server actions file ("use server" at file scope) — not a client component.
  if (hasUseServerDirective(sf)) {
    return true;
  }
  // Async server component file: an async default export under app/.
  // These do server-side data fetching at the page boundary, not the
  // client-side data-layer patterns the analyzer understands.
  if (rel.startsWith("app/") || rel.includes("/app/")) {
    for (const fn of sf.getFunctions()) {
      if (fn.isDefaultExport() && fn.isAsync()) return true;
    }
  }
  // next/headers user — server context, not client.
  if (
    sf.getImportDeclarations().some((d) => d.getModuleSpecifierValue() === "next/headers")
  ) {
    return true;
  }
  return false;
}

// --- per-file pass: collect raw reads + writes + components ---------------

type RawRead = {
  file: string;
  line: number;
  snippet: string;
  /** URL or query-key as text. */
  urlPattern: string;
  /** Best-effort TS type name for the return shape. */
  returnShape: string;
  /** Inferred params from URL template literal slots. */
  params: { name: string; tsType: string }[];
};

type RawWrite = {
  file: string;
  line: number;
  snippet: string;
  urlPattern: string;
  method: string;
  inputShape: string;
};

type ComponentFunction = {
  file: string;
  componentName: string;
  startLine: number;
  endLine: number;
  loc: number;
  propCount: number;
  hasComplexProps: boolean;
  /** useState + useReducer count. Pure local-state count. */
  stateHookCount: number;
  /**
   * Other complexity-bumping signals detected inside the component:
   * useRef, useEffect, useSession, usePathname, useRouter, useParams,
   * useSearchParams, useMemo/useCallback with non-trivial deps, etc.
   * Each entry is the hook name as it appears at the call site.
   */
  complexitySignals: string[];
};

function visitFile(
  sf: SourceFile,
  root: string,
  outReads: RawRead[],
  outWrites: RawWrite[],
  outComponents: ComponentFunction[],
): void {
  const fp = relative(root, sf.getFilePath());

  // Reads: useSWR(...), useSWRImmutable(...), useQuery({ queryKey, queryFn })
  for (const call of sf.getDescendantsOfKind(SyntaxKind.CallExpression)) {
    const callee = call.getExpression().getText();
    if (callee === "useSWR" || callee === "useSWRImmutable") {
      const read = readFromSwrCall(call, fp);
      if (read) outReads.push(read);
    } else if (callee === "useQuery") {
      const read = readFromUseQueryCall(call, fp);
      if (read) outReads.push(read);
    } else if (callee === "fetch") {
      // fetch can be either a read or a write depending on the method.
      const w = writeFromFetchCall(call, fp);
      if (w) outWrites.push(w);
      else {
        const r = readFromFetchCall(call, fp);
        if (r) outReads.push(r);
      }
    }
  }

  // Function components: top-level FunctionDeclaration/VariableDeclaration
  // with a Capitalized name in a .tsx file. We rely on the file extension
  // rather than walking the body looking for JSX — fast and right enough.
  if (sf.getFilePath().endsWith(".tsx")) {
    for (const fn of sf.getFunctions()) {
      const name = fn.getName();
      if (!name || !/^[A-Z]/.test(name)) continue;
      outComponents.push(componentMetadata(fn, name, fp));
    }
    for (const v of sf.getVariableDeclarations()) {
      const name = v.getName();
      if (!/^[A-Z]/.test(name)) continue;
      const init = v.getInitializer();
      if (!init) continue;
      const k = init.getKind();
      if (k !== SyntaxKind.ArrowFunction && k !== SyntaxKind.FunctionExpression) continue;
      outComponents.push(componentMetadata(init, name, fp));
    }
  }
}

function componentMetadata(
  fn: Node,
  componentName: string,
  file: string,
): ComponentFunction {
  const start = fn.getStartLineNumber();
  const end = fn.getEndLineNumber();
  const loc = end - start + 1;
  const props = analyzeProps(fn);
  const stateHookCount = countStateHooks(fn);
  const complexitySignals = detectComplexitySignals(fn);
  return {
    file,
    componentName,
    startLine: start,
    endLine: end,
    loc,
    propCount: props.count,
    hasComplexProps: props.complex,
    stateHookCount,
    complexitySignals,
  };
}

/**
 * Detect hook calls that bump extraction difficulty even when the
 * raw `useState`/`useReducer` count is zero. Real React components
 * carry state through more than just `useState` — refs, navigation
 * hooks, auth session hooks, effects all signal complexity that the
 * old "stateHookCount" alone missed (taxonomy's MainNav was tagged
 * "no local state" because it only used `usePathname`; alpha.1
 * marked Editor.tsx easy despite a useRef-driven debounce).
 *
 * Returns the deduplicated list of hook names found. Conservative —
 * we only pick up library hooks the analyzer specifically knows
 * about. Unknown `useFoo` custom hooks get a separate signal entry
 * so the FDE can decide whether to flag.
 */
const COMPLEXITY_HOOKS = new Set<string>([
  "useRef",
  "useEffect",
  "useLayoutEffect",
  "useImperativeHandle",
  "useSession",       // next-auth
  "useUser",          // common auth/session shape (clerk, custom)
  "usePathname",      // next/navigation
  "useSearchParams",  // next/navigation
  "useRouter",        // next/navigation (and pages-router shape)
  "useParams",        // next/navigation
]);

function detectComplexitySignals(fn: Node): string[] {
  const found = new Set<string>();
  for (const call of fn.getDescendantsOfKind(SyntaxKind.CallExpression)) {
    const calleeText = call.getExpression().getText();
    // Last segment so `something.useThing` and `useThing` both match.
    const leaf = calleeText.split(".").pop() ?? calleeText;
    if (COMPLEXITY_HOOKS.has(leaf)) {
      found.add(leaf);
      continue;
    }
    // useCallback / useMemo with deps array length > 1 → signals
    // co-coordinated state. Empty deps and single-dep are common
    // and cheap; wider arrays indicate the component is wiring
    // multiple values together.
    if (leaf === "useCallback" || leaf === "useMemo") {
      const args = call.getArguments();
      const depsArg = args[1];
      if (depsArg && Node.isArrayLiteralExpression(depsArg)) {
        if (depsArg.getElements().length > 1) {
          found.add(`${leaf}(deps>1)`);
        }
      }
      continue;
    }
    // Unknown custom hook (`use*` not in our React + data-layer
    // builtin set). Surface as a single signal entry — the FDE
    // sees "uses custom hook" without us speculating about what
    // it does.
    if (/^use[A-Z]/.test(leaf) && !REACT_BUILTIN_HOOKS.has(leaf)) {
      found.add("custom-hook");
    }
  }
  return Array.from(found);
}

function analyzeProps(fn: Node): { count: number; complex: boolean } {
  // Look at the first parameter's type. Inline destructured types
  // (`{ a, b }: { a: string }`) and named interfaces (`Props`) are both
  // accepted via the printed type text — heuristic, good enough for v1.
  const params = (fn as unknown as { getParameters?: () => Node[] }).getParameters?.() ?? [];
  if (!params[0]) return { count: 0, complex: false };
  const param = params[0];
  // ts-morph Parameter has getType() and getTypeNode()
  const typeNode = (param as unknown as { getTypeNode?: () => Node | undefined }).getTypeNode?.();
  const typeText = typeNode?.getText() ?? (param as unknown as { getType?: () => { getText: () => string } }).getType?.().getText() ?? "";
  // Count properties as roughly the number of `<name>:` pairs at depth 1.
  // For a referenced type alias we can't count without resolving — fall
  // back to a coarse "complex if any object/array type appears" check.
  const count = (typeText.match(/[a-zA-Z_$][\w$]*\s*[?]?:/g) ?? []).length;
  // "Complex" props: the prop type contains a function value, a generic
  // collection (Promise/Record/Map/Set/Array), or 5+ fields. Plain object
  // shapes like `{ id: string }` are NOT complex — those are the common
  // props passed to a sidebar/detail block in the wild.
  const complex =
    /(=>|Promise|Record|Map|Set|Array|\[\])/.test(typeText) || count > 4;
  return { count, complex };
}

function countStateHooks(fn: Node): number {
  let n = 0;
  for (const call of fn.getDescendantsOfKind(SyntaxKind.CallExpression)) {
    const callee = call.getExpression().getText();
    // Match both bare and namespaced calls: `useState`, `React.useState`,
    // `R.useState` (e.g. `import * as R from "react"`). Real codebases
    // mix both shapes — taxonomy's Editor uses `React.useRef`/
    // `React.useEffect`/`React.useState` via `import * as React`. The
    // leaf check is the same shape as detectComplexitySignals.
    const leaf = callee.split(".").pop() ?? callee;
    if (leaf === "useState" || leaf === "useReducer" || leaf === "useRef") {
      n++;
    }
  }
  return n;
}

// --- read extractors -------------------------------------------------------

function readFromSwrCall(call: CallExpression, file: string): RawRead | null {
  const args = call.getArguments();
  if (args.length === 0) return null;
  const urlNode = args[0];
  if (!urlNode) return null;
  if (isAssetUrlExpression(urlNode)) return null;
  const urlPattern = urlNode.getText();
  const params = inferParamsFromUrl(urlNode);
  const returnShape = inferReturnTypeFromGenerics(call);
  return {
    file,
    line: call.getStartLineNumber(),
    snippet: getSnippet(call),
    urlPattern,
    returnShape,
    params,
  };
}

function readFromUseQueryCall(call: CallExpression, file: string): RawRead | null {
  const args = call.getArguments();
  if (args.length === 0) return null;
  const cfg = args[0];
  if (!cfg || !Node.isObjectLiteralExpression(cfg)) return null;
  const queryKeyProp = cfg.getProperty("queryKey");
  const queryFnProp = cfg.getProperty("queryFn");
  if (!queryKeyProp) return null;
  // Look inside queryFn's body for a fetch() call to recover the URL.
  let urlPattern = "";
  let params: RawRead["params"] = [];
  if (queryFnProp && Node.isPropertyAssignment(queryFnProp)) {
    const initializer = queryFnProp.getInitializer();
    if (initializer) {
      for (const c of initializer.getDescendantsOfKind(SyntaxKind.CallExpression)) {
        if (c.getExpression().getText() === "fetch") {
          const fetchArg = c.getArguments()[0];
          if (fetchArg && !isAssetUrlExpression(fetchArg)) {
            urlPattern = fetchArg.getText();
            params = inferParamsFromUrl(fetchArg);
            break;
          }
        }
      }
    }
  }
  if (!urlPattern) {
    // Fall back to the queryKey text for grouping. Less informative
    // than a URL but still better than nothing.
    if (Node.isPropertyAssignment(queryKeyProp)) {
      const init = queryKeyProp.getInitializer();
      if (init) urlPattern = init.getText();
    }
  }
  return {
    file,
    line: call.getStartLineNumber(),
    snippet: getSnippet(call),
    urlPattern,
    returnShape: inferReturnTypeFromGenerics(call),
    params,
  };
}

function readFromFetchCall(call: CallExpression, file: string): RawRead | null {
  // Heuristic: a fetch() with no method arg (or method: GET) and a return
  // value used somewhere is a read. We only flag it as a read if it's
  // clearly a GET — otherwise it's a write.
  const method = inferFetchMethod(call);
  if (method && method !== "GET") return null;
  const args = call.getArguments();
  const urlNode = args[0];
  if (!urlNode) return null;
  if (isAssetUrlExpression(urlNode)) return null;
  // Skip fetches inside useQuery's queryFn — those were already
  // captured by readFromUseQueryCall via the parent.
  if (isInsideUseQueryFn(call)) return null;
  return {
    file,
    line: call.getStartLineNumber(),
    snippet: getSnippet(call),
    urlPattern: urlNode.getText(),
    returnShape: "unknown",
    params: inferParamsFromUrl(urlNode),
  };
}

function isInsideUseQueryFn(call: CallExpression): boolean {
  let p: Node | undefined = call.getParent();
  while (p) {
    if (Node.isCallExpression(p) && p.getExpression().getText() === "useQuery") {
      return true;
    }
    p = p.getParent();
  }
  return false;
}

/**
 * `new URL("...", import.meta.url)` is a bundler asset reference (webpack
 * 5 / turbopack idiom for shipping fonts, images, workers). It looks like
 * a URL but it's a build-time resolved path — never a data fetch. Treat
 * any urlNode whose source text starts with `new URL(` AND mentions
 * `import.meta.url` as an asset reference and reject the call entirely.
 *
 * Handles three shapes:
 *   - `fetch(new URL(..., import.meta.url))` — node is the NewExpression directly.
 *   - `const url = new URL(..., import.meta.url); fetch(url);` — node is an
 *     Identifier; we look up its declaration in the same file and check
 *     the initializer.
 *   - `fetch(new URL(...).href)` — node is a PropertyAccess on a
 *     NewExpression; we walk in and check.
 */
function isAssetUrlExpression(urlNode: Node): boolean {
  if (isAssetUrlNew(urlNode)) return true;
  // PropertyAccess on a NewExpression: `new URL(..., import.meta.url).href`.
  if (Node.isPropertyAccessExpression(urlNode)) {
    return isAssetUrlExpression(urlNode.getExpression());
  }
  // Identifier reference — follow to the declaration anywhere in the
  // same source file. Most asset-URL idioms shape as
  //   const url = new URL("...", import.meta.url);
  //   fetch(url);
  // so the declaration sits inside the same function scope. We walk
  // descendants (not just top-level) to catch that.
  if (Node.isIdentifier(urlNode)) {
    const sf = urlNode.getSourceFile();
    const name = urlNode.getText();
    for (const v of sf.getDescendantsOfKind(SyntaxKind.VariableDeclaration)) {
      if (v.getName() !== name) continue;
      const init = v.getInitializer();
      if (init && isAssetUrlExpression(init)) return true;
    }
  }
  return false;
}

function isAssetUrlNew(urlNode: Node): boolean {
  if (!Node.isNewExpression(urlNode)) return false;
  const calleeName = urlNode.getExpression().getText();
  if (calleeName !== "URL") return false;
  return urlNode.getText().includes("import.meta.url");
}

// --- write extractors ------------------------------------------------------

function writeFromFetchCall(call: CallExpression, file: string): RawWrite | null {
  const method = inferFetchMethod(call);
  if (!method || method === "GET") return null;
  const args = call.getArguments();
  const urlNode = args[0];
  if (!urlNode) return null;
  if (isAssetUrlExpression(urlNode)) return null;
  const inputShape = inferFetchBodyShape(call);
  return {
    file,
    line: call.getStartLineNumber(),
    snippet: getSnippet(call),
    urlPattern: urlNode.getText(),
    method,
    inputShape,
  };
}

function inferFetchMethod(call: CallExpression): string | null {
  const args = call.getArguments();
  if (args.length < 2) return null;
  const opts = args[1];
  if (!opts || !Node.isObjectLiteralExpression(opts)) return null;
  const methodProp = opts.getProperty("method");
  if (methodProp && Node.isPropertyAssignment(methodProp)) {
    const init = methodProp.getInitializer();
    if (init) {
      // Strip surrounding quotes / template ticks and uppercase.
      return init.getText().replace(/^["'`]|["'`]$/g, "").toUpperCase();
    }
  }
  return null;
}

function inferFetchBodyShape(call: CallExpression): string {
  const args = call.getArguments();
  if (args.length < 2) return "unknown";
  const opts = args[1];
  if (!opts || !Node.isObjectLiteralExpression(opts)) return "unknown";
  const bodyProp = opts.getProperty("body");
  if (!bodyProp || !Node.isPropertyAssignment(bodyProp)) return "unknown";
  const init = bodyProp.getInitializer();
  if (!init) return "unknown";
  // Most common case: JSON.stringify(<expr>). Pull out the inner expression's type.
  if (Node.isCallExpression(init)) {
    const callee = init.getExpression().getText();
    if (callee === "JSON.stringify") {
      const stringified = init.getArguments()[0];
      if (stringified) {
        const t = (stringified as unknown as { getType?: () => { getText: () => string } }).getType?.();
        if (t) return shortTypeText(t.getText());
      }
    }
  }
  return "unknown";
}

// --- common helpers --------------------------------------------------------

function inferParamsFromUrl(urlNode: Node): { name: string; tsType: string }[] {
  // For TemplateExpressions like `/api/deals/${id}?stage=${stage}`,
  // pull each interpolated identifier as a param. tsType is "unknown"
  // unless we can resolve cheaply.
  if (!Node.isTemplateExpression(urlNode)) return [];
  const out: { name: string; tsType: string }[] = [];
  for (const span of urlNode.getTemplateSpans()) {
    const expr = span.getExpression();
    const text = expr.getText();
    // Best-effort: variable references and property accesses get
    // surfaced as themselves; anything more complex becomes a generic
    // "param".
    out.push({
      name: simpleParamName(text),
      tsType: "string",
    });
  }
  return out;
}

function simpleParamName(text: string): string {
  // Extract the rightmost identifier from a property chain (`params.id` → "id"),
  // but for fallbacks (`x ?? "y"`, `x || "y"`) take the primary expression's
  // rightmost identifier so the same param across call sites with and
  // without fallbacks groups together. Falls back to "param" when nothing
  // identifier-shaped surfaces.
  const primary = text.split(/\?\?|\|\|/)[0]?.trim() ?? text;
  const tokens = primary.match(/[a-zA-Z_$][\w$]*/g) ?? [];
  return tokens[tokens.length - 1] ?? "param";
}

function inferReturnTypeFromGenerics(call: CallExpression): string {
  const tArgs = call.getTypeArguments();
  if (tArgs.length > 0 && tArgs[0]) {
    return shortTypeText(tArgs[0].getText());
  }
  // Fall back to the inferred return type — often a SWR/Query response
  // wrapper around the data. Keep it short.
  try {
    const t = call.getReturnType().getText();
    return shortTypeText(t);
  } catch {
    return "unknown";
  }
}

function shortTypeText(t: string): string {
  // Strip imports("…") qualifications and excess whitespace. Keeps the
  // type readable in the markdown report without losing the shape.
  const noImports = t.replace(/import\(".+?"\)\./g, "");
  const collapsed = noImports.replace(/\s+/g, " ").trim();
  if (collapsed.length <= 80) return collapsed;
  return collapsed.slice(0, 77) + "…";
}

function getSnippet(node: Node): string {
  const sf = node.getSourceFile();
  const text = sf.getFullText();
  const startLine = node.getStartLineNumber();
  const endLine = node.getEndLineNumber();
  const lines = text.split(/\r?\n/);
  // 1-3 lines: usually just one, but multiline calls span their full body.
  const slice = lines.slice(startLine - 1, Math.min(endLine, startLine + 2));
  return slice.join("\n").trim();
}

// --- ranking + grouping ----------------------------------------------------

/**
 * Tease an adapter/workflow id out of a URL pattern. Handles three shapes:
 *
 *   1. Relative API path: `/api/posts/${id}` → `{ resource: "posts", path: ["${id}"] }`.
 *      The `/api/` prefix is dropped; templated slots stay marked.
 *   2. Relative non-API path: `/users/${id}/stripe` → `{ resource: "users", path: ["${id}", "stripe"] }`.
 *   3. Absolute URL: `https://api.github.com/repos/shadcn/taxonomy` →
 *      `{ resource: "github", path: ["repos", ...] }` — host as namespace
 *      (with the leading `api.` dropped), path verbatim.
 *
 * Template literals are first-class. The interpolation slot (`${expr}`)
 * stays intact in the segment array — callers detect it via the
 * leading `${` and drop it from the action leaf. Multiple
 * interpolations work too: `/api/${tenant}/posts/${id}` → resource
 * `posts` (the first non-templated segment), tail `[${id}]`. The
 * leading templated segment is dropped from the resource lookup; the
 * trailing one becomes a `by-id` slot.
 *
 * Returns null when the URL pattern is genuinely unstructured: tagged
 * templates (`` sql`/api/posts` ``), opaque variable refs (`fetch(myUrl)`),
 * `new URL(...)` constructions, or anything that doesn't start with a
 * `/`-rooted path or `https?://`. Callers roll these into a single
 * low-confidence `external.unparsable-url` bucket.
 */
type ParsedUrl = {
  /** Source of the namespace: "path" (the URL was relative or rooted) vs "host" (absolute URL → host became namespace). */
  readonly origin: "path" | "host";
  readonly resource: string;
  /** Remaining path segments after the resource, including templated slots. */
  readonly tail: readonly string[];
};

function parseUrlPattern(urlPattern: string): ParsedUrl | null {
  const stripped = (urlPattern.replace(/^["'`]|["'`]$/g, "").split("?")[0] ?? "").trim();
  if (stripped.length === 0) return null;
  // Reject patterns that don't start with a recognizable URL shape.
  // `new URL(...)`, `someVar`, tagged templates, etc. land here.
  const looksAbsolute = /^https?:\/\//.test(stripped);
  const looksRelative = stripped.startsWith("/");
  if (!looksAbsolute && !looksRelative) return null;

  if (looksAbsolute) {
    // Pull host + path out manually rather than via the URL constructor —
    // the URL may contain `${...}` slots that the URL parser rejects.
    const m = stripped.match(/^https?:\/\/([^/]+)(\/.*)?$/);
    if (!m) return null;
    const host = m[1] ?? "";
    const path = m[2] ?? "";
    // Host as namespace: drop `api.` prefix (api.github.com → github.com),
    // keep the second-level domain as the namespace label.
    const cleanHost = host.replace(/^api\./i, "");
    const namespace = (cleanHost.split(".")[0] ?? "external")
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, "-");
    const segments = path.split("/").filter(Boolean);
    if (segments.length === 0) {
      return { origin: "host", resource: namespace || "external", tail: [] };
    }
    // Use the host's namespace as resource; the remaining path becomes
    // the action so e.g. `https://api.github.com/repos/...` → `github.repos`.
    return {
      origin: "host",
      resource: namespace || "external",
      tail: segments,
    };
  }

  // Relative path. Strip `/api/` if present; treat the rest as resource+tail.
  const path = stripped.replace(/^\/api\//, "").replace(/^\//, "");
  const segments = path.split("/").filter(Boolean);
  if (segments.length === 0) return null;
  // The first NON-templated segment is the resource. Templated leading
  // segments (rare) get rolled into the tail.
  let resourceIdx = -1;
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i]!;
    if (!seg.startsWith("${") && !seg.startsWith("[")) {
      resourceIdx = i;
      break;
    }
  }
  if (resourceIdx === -1) return null;
  return {
    origin: "path",
    resource: segments[resourceIdx]!,
    tail: segments.slice(resourceIdx + 1),
  };
}

function urlPatternToAdapterId(urlPattern: string): string | null {
  const parsed = parseUrlPattern(urlPattern);
  if (!parsed) return null;
  const { resource, tail } = parsed;
  // Map tail to a clean leaf:
  //   - no tail → list
  //   - single templated segment → by-id
  //   - non-templated segment(s) → join those (skipping templated slots)
  const nonTemplated = tail.filter((s) => !s.startsWith("${") && !s.startsWith("["));
  const hadTemplated = tail.length > nonTemplated.length;
  if (tail.length === 0) return `${resource}.list`;
  if (nonTemplated.length === 0) return `${resource}.by-id`;
  // Join non-templated tail as the action, e.g.
  //   /api/users/${id}/stripe → users.stripe
  //   /api/deals/[id]/move-stage → deals.move-stage
  // Drop templated slots from the leaf — they're params, not actions.
  void hadTemplated;
  return `${resource}.${nonTemplated.join("-")}`;
}

function urlPatternToWorkflowId(urlPattern: string, method: string): string | null {
  const parsed = parseUrlPattern(urlPattern);
  if (!parsed) return null;
  const { resource, tail } = parsed;
  const nonTemplated = tail.filter((s) => !s.startsWith("${") && !s.startsWith("["));
  if (nonTemplated.length > 0) {
    // Explicit sub-action in the URL wins (e.g. `/api/tickets/[id]/reply` → `tickets.reply`).
    return `${resource}.${nonTemplated.join("-")}`;
  }
  // No sub-action → derive from method.
  switch (method.toUpperCase()) {
    case "POST":   return `${resource}.create`;
    case "PUT":
    case "PATCH":  return `${resource}.update`;
    case "DELETE": return `${resource}.delete`;
    default:       return `${resource}.action`;
  }
}

function rankReadCandidates(reads: RawRead[]): ReadCandidate[] {
  const groups = new Map<string, RawRead[]>();
  // Reads whose URL doesn't yield a sensible id (opaque variables,
  // non-URL expressions). They surface as a single low-confidence
  // bucket so the FDE sees them but isn't pushed to extract them.
  const unparsable: RawRead[] = [];
  for (const r of reads) {
    const id = urlPatternToAdapterId(r.urlPattern);
    if (id === null) {
      unparsable.push(r);
      continue;
    }
    let arr = groups.get(id);
    if (!arr) {
      arr = [];
      groups.set(id, arr);
    }
    arr.push(r);
  }
  const out: ReadCandidate[] = [];
  for (const [id, group] of groups.entries()) {
    const sourceLocations: SourceLocation[] = group.map((r) => ({
      file: r.file,
      line: r.line,
      snippet: r.snippet,
    }));
    const fileCount = new Set(group.map((g) => g.file)).size;
    // Take the params from the first call site that declared any.
    const inferredParams = group.find((g) => g.params.length > 0)?.params ?? [];
    // Take the most-specific return shape. "unknown" loses to anything else.
    const shapes = group.map((g) => g.returnShape).filter((s) => s && s !== "unknown");
    const inferredReturnShape = shapes[0] ?? "unknown";
    const { confidence, confidenceReason } = scoreReadConfidence(group, fileCount, inferredReturnShape);
    out.push({
      suggestedAdapterId: id,
      sourceLocations,
      inferredParams,
      inferredReturnShape,
      usageCount: group.length,
      confidence,
      confidenceReason,
    });
  }
  // Group every unparsable read into one low-confidence "URL pattern
  // doesn't yield a clean adapter name" bucket. The FDE sees these as
  // candidates but knows they need manual extraction. This is
  // intentionally a single rolled-up entry — surfacing each call site
  // as its own candidate would produce the alpha.1 noise (URL strings
  // as adapter ids).
  if (unparsable.length > 0) {
    out.push({
      suggestedAdapterId: "external.unparsable-url",
      sourceLocations: unparsable.map((r) => ({ file: r.file, line: r.line, snippet: r.snippet })),
      inferredParams: [],
      inferredReturnShape: "unknown",
      usageCount: unparsable.length,
      confidence: "low",
      confidenceReason:
        "URL pattern doesn't yield a clean adapter name (likely a constructed URL, asset reference, or template tag). Consider extracting these manually after inspecting the call sites.",
    });
  }
  // Sort by usage descending, then alphabetical for stability.
  out.sort((a, b) => {
    if (b.usageCount !== a.usageCount) return b.usageCount - a.usageCount;
    return a.suggestedAdapterId.localeCompare(b.suggestedAdapterId);
  });
  return out;
}

function scoreReadConfidence(
  group: RawRead[],
  fileCount: number,
  returnShape: string,
): { confidence: Confidence; confidenceReason: string } {
  const sameParams =
    group.every((r) => JSON.stringify(r.params) === JSON.stringify(group[0]?.params ?? []));
  if (fileCount >= 2 && sameParams && returnShape !== "unknown") {
    return {
      confidence: "high",
      confidenceReason: `Used in ${fileCount} files with consistent params and a typed return shape.`,
    };
  }
  if (fileCount >= 2 || returnShape !== "unknown") {
    return {
      confidence: "medium",
      confidenceReason:
        fileCount >= 2
          ? `Used in ${fileCount} files but params or return shape vary across call sites.`
          : "Single call site, but the return shape is statically typed.",
    };
  }
  return {
    confidence: "low",
    confidenceReason: "Single call site with `unknown` return shape — verify before treating as an adapter candidate.",
  };
}

function rankWriteCandidates(writes: RawWrite[]): WriteCandidate[] {
  const groups = new Map<string, RawWrite[]>();
  const unparsable: RawWrite[] = [];
  for (const w of writes) {
    const id = urlPatternToWorkflowId(w.urlPattern, w.method);
    if (id === null) {
      unparsable.push(w);
      continue;
    }
    let arr = groups.get(id);
    if (!arr) {
      arr = [];
      groups.set(id, arr);
    }
    arr.push(w);
  }
  const out: WriteCandidate[] = [];
  for (const [id, group] of groups.entries()) {
    const sourceLocations: SourceLocation[] = group.map((w) => ({
      file: w.file,
      line: w.line,
      snippet: w.snippet,
    }));
    const fileCount = new Set(group.map((g) => g.file)).size;
    const inputShapes = group.map((g) => g.inputShape).filter((s) => s !== "unknown");
    const inferredInputShape = inputShapes[0] ?? "unknown";
    const sideEffects: string[] = [];
    const seenMethods = new Set(group.map((g) => g.method));
    for (const m of seenMethods) {
      // Surface the method-and-resource pair so the FDE sees what the
      // workflow actually does.
      const stripped = group[0]?.urlPattern.replace(/^["'`]|["'`]$/g, "") ?? "";
      sideEffects.push(`${m} ${stripped}`);
    }
    const confidence: Confidence =
      fileCount >= 2 && inferredInputShape !== "unknown"
        ? "high"
        : fileCount >= 2 || inferredInputShape !== "unknown"
          ? "medium"
          : "low";
    const confidenceReason =
      confidence === "high"
        ? `Called in ${fileCount} files with a typed body shape.`
        : confidence === "medium"
          ? fileCount >= 2
            ? `Called in ${fileCount} files but body shape isn't typed.`
            : "Single call site, but the body shape is typed."
          : "Single call site with an untyped body — verify before treating as a workflow candidate.";
    out.push({
      suggestedWorkflowId: id,
      sourceLocations,
      inferredInputShape,
      inferredSideEffects: sideEffects,
      usageCount: group.length,
      confidence,
      confidenceReason,
    });
  }
  if (unparsable.length > 0) {
    out.push({
      suggestedWorkflowId: "external.unparsable-url",
      sourceLocations: unparsable.map((w) => ({ file: w.file, line: w.line, snippet: w.snippet })),
      inferredInputShape: "unknown",
      inferredSideEffects: Array.from(
        new Set(unparsable.map((w) => `${w.method} (URL not statically resolvable)`)),
      ),
      usageCount: unparsable.length,
      confidence: "low",
      confidenceReason:
        "URL pattern doesn't yield a clean workflow name (constructed URL, asset reference, or template tag). Inspect the call sites before extracting.",
    });
  }
  out.sort((a, b) => {
    if (b.usageCount !== a.usageCount) return b.usageCount - a.usageCount;
    return a.suggestedWorkflowId.localeCompare(b.suggestedWorkflowId);
  });
  return out;
}

// --- component candidates --------------------------------------------------

function buildComponentCandidates(
  components: ComponentFunction[],
  allReads: RawRead[],
  allWrites: RawWrite[],
  readCandidates: ReadCandidate[],
  writeCandidates: WriteCandidate[],
): ComponentCandidate[] {
  // Map url-pattern → adapter-id for cheap lookup. Unparsable URLs map
  // to the rolled-up "external.unparsable-url" bucket so a component
  // that uses one still shows the dependency.
  const urlToAdapterId = new Map<string, string>();
  for (const r of allReads) {
    urlToAdapterId.set(r.urlPattern + "|read", urlPatternToAdapterId(r.urlPattern) ?? "external.unparsable-url");
  }
  const urlToWorkflowId = new Map<string, string>();
  for (const w of allWrites) {
    urlToWorkflowId.set(
      w.urlPattern + "|" + w.method,
      urlPatternToWorkflowId(w.urlPattern, w.method) ?? "external.unparsable-url",
    );
  }

  return components
    .map<ComponentCandidate>((c) => {
      const consumesReads = Array.from(
        new Set(
          allReads
            .filter((r) => r.file === c.file && r.line >= c.startLine && r.line <= c.endLine)
            .map((r) => urlPatternToAdapterId(r.urlPattern) ?? "external.unparsable-url"),
        ),
      );
      const consumesWrites = Array.from(
        new Set(
          allWrites
            .filter((w) => w.file === c.file && w.line >= c.startLine && w.line <= c.endLine)
            .map((w) => urlPatternToWorkflowId(w.urlPattern, w.method) ?? "external.unparsable-url"),
        ),
      );
      const { difficulty, reasons } = scoreDifficulty(c, consumesReads, consumesWrites);
      const suggestedBlockId = suggestBlockId(c.componentName, consumesReads);
      return {
        componentPath: c.file,
        componentName: c.componentName,
        consumesReads,
        consumesWrites,
        hasLocalState: c.stateHookCount > 0 || c.complexitySignals.length > 0,
        hasComplexProps: c.hasComplexProps,
        extractionDifficulty: difficulty,
        difficultyReasons: reasons,
        suggestedBlockId,
        metadata: {
          locOfComponent: c.loc,
          stateHookCount: c.stateHookCount,
          propCount: c.propCount,
          detectedComplexitySignals: c.complexitySignals,
        },
      };
    })
    .sort((a, b) => {
      // Easy first within the table; the markdown grouper re-buckets.
      const order: Record<Difficulty, number> = { easy: 0, medium: 1, hard: 2 };
      const d = order[a.extractionDifficulty] - order[b.extractionDifficulty];
      if (d !== 0) return d;
      return a.componentName.localeCompare(b.componentName);
    });
  // suppress unused warnings
  void readCandidates;
  void writeCandidates;
  void urlToAdapterId;
  void urlToWorkflowId;
}

function scoreDifficulty(
  c: ComponentFunction,
  reads: string[],
  writes: string[],
): { difficulty: Difficulty; reasons: string[] } {
  const reasons: string[] = [];
  const total = reads.length + writes.length;
  let score = 0;
  if (c.loc > 300) {
    score += 3;
    reasons.push(`>300 LOC (${c.loc})`);
  } else if (c.loc > 100) {
    score += 1;
    reasons.push(`100–300 LOC (${c.loc})`);
  } else {
    reasons.push(`<100 LOC (${c.loc})`);
  }
  if (total >= 4) {
    score += 3;
    reasons.push(`${reads.length} read${reads.length === 1 ? "" : "s"} + ${writes.length} write${writes.length === 1 ? "" : "s"}`);
  } else if (total >= 2) {
    score += 1;
    reasons.push(`${reads.length} read${reads.length === 1 ? "" : "s"} + ${writes.length} write${writes.length === 1 ? "" : "s"}`);
  } else {
    reasons.push(`${reads.length} read${reads.length === 1 ? "" : "s"} + ${writes.length} write${writes.length === 1 ? "" : "s"}`);
  }
  if (c.stateHookCount >= 4) {
    score += 3;
    reasons.push(`${c.stateHookCount} state hooks (complex local state)`);
  } else if (c.stateHookCount >= 2) {
    score += 1;
    reasons.push(`${c.stateHookCount} state hooks`);
  } else if (c.stateHookCount === 1) {
    reasons.push(`1 state hook`);
  } else {
    reasons.push(`no local state`);
  }
  if (c.hasComplexProps) {
    score += 1;
    reasons.push(`complex props (${c.propCount} fields, includes non-primitive)`);
  } else {
    reasons.push(`simple props (${c.propCount} field${c.propCount === 1 ? "" : "s"})`);
  }
  if (c.complexitySignals.length > 0) {
    reasons.push(`uses ${c.complexitySignals.join(", ")}`);
  }
  let difficulty: Difficulty;
  if (score >= 5) difficulty = "hard";
  else if (score >= 2) difficulty = "medium";
  else difficulty = "easy";
  // Complexity signals bump difficulty one level. Captures real
  // React patterns that aren't useState (refs for debouncing,
  // navigation hooks for active-route highlighting, session hooks
  // for auth-gated branches, effects coordinating multiple values).
  // The bump is conservative — capped at "hard" so a tiny component
  // with one useRef doesn't jump easy → hard.
  if (c.complexitySignals.length > 0) {
    if (difficulty === "easy") difficulty = "medium";
    else if (difficulty === "medium") difficulty = "hard";
  }
  return { difficulty, reasons };
}

function suggestBlockId(componentName: string, consumesReads: string[]): string {
  // If the component consumes exactly one read, derive `<resource>.<role>`
  // from the read's resource and a kebab-case role from the component
  // name. Otherwise, use the component name alone (`-` as separator).
  const kebab = componentName
    .replace(/([a-z])([A-Z])/g, "$1-$2")
    .replace(/_/g, "-")
    .toLowerCase();
  if (consumesReads.length === 1 && consumesReads[0]) {
    const resource = consumesReads[0].split(".")[0];
    return `${resource}.${kebab}`;
  }
  // No read or many reads → namespace by file basename heuristic, with
  // the component as the leaf.
  return `app.${kebab}`;
}

// suppress "unused" lints when isAbsolute or basename aren't needed in some flows
void isAbsolute;
void basename;
void dirname;

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

  // Map each component to the reads/writes it consumes by file path.
  const componentCandidates = buildComponentCandidates(
    componentFunctions,
    allReads,
    allWrites,
    readCandidates,
    writeCandidates,
  );

  // Update component count post-collection — totalFiles already comes
  // from the cheap readCodebaseShape call.
  return {
    analyzedAt: new Date().toISOString(),
    codebasePath: root,
    codebaseShape: { ...shape, componentCount: componentCandidates.length },
    readCandidates,
    writeCandidates,
    componentCandidates,
    limitations,
  };
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

function detectGlobalLimitations(
  files: SourceFile[],
  root: string,
  limitations: string[],
): void {
  let classComponentCount = 0;
  let reduxFiles = 0;
  let serverActionFiles = 0;
  let graphqlFiles = 0;
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

    // Server actions: a "use server" directive anywhere.
    if (/^["']use server["']/m.test(text)) {
      serverActionFiles++;
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
  if (serverActionFiles > 0) {
    limitations.push(
      `Detected "use server" directives in ${serverActionFiles} file${serverActionFiles === 1 ? "" : "s"} — Next.js server actions are not analyzed in v1.`,
    );
  }
  if (graphqlFiles > 0) {
    limitations.push(
      `Detected GraphQL client imports in ${graphqlFiles} file${graphqlFiles === 1 ? "" : "s"} — Apollo / urql / Relay are not analyzed in v1; reads through GraphQL won't appear as adapter candidates.`,
    );
  }
  const uniqueDeep = Array.from(new Set(deepHookFiles));
  if (uniqueDeep.length > 0) {
    limitations.push(
      `Custom hooks deeper than two levels detected in ${uniqueDeep.length} file${uniqueDeep.length === 1 ? "" : "s"}: ${uniqueDeep.slice(0, 5).join(", ")}${uniqueDeep.length > 5 ? ", …" : ""}. The reads/writes through them may show as separate candidates rather than aggregated.`,
    );
  }
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
  stateHookCount: number;
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
  return {
    file,
    componentName,
    startLine: start,
    endLine: end,
    loc,
    propCount: props.count,
    hasComplexProps: props.complex,
    stateHookCount,
  };
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
    if (callee === "useState" || callee === "useReducer" || callee === "useRef") n++;
  }
  return n;
}

// --- read extractors -------------------------------------------------------

function readFromSwrCall(call: CallExpression, file: string): RawRead | null {
  const args = call.getArguments();
  if (args.length === 0) return null;
  const urlNode = args[0];
  if (!urlNode) return null;
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
          if (fetchArg) {
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

// --- write extractors ------------------------------------------------------

function writeFromFetchCall(call: CallExpression, file: string): RawWrite | null {
  const method = inferFetchMethod(call);
  if (!method || method === "GET") return null;
  const args = call.getArguments();
  const urlNode = args[0];
  if (!urlNode) return null;
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

function urlPatternToAdapterId(urlPattern: string): string {
  // Strip surrounding quotes, query strings, template-literal tick marks.
  const stripped = urlPattern
    .replace(/^["'`]|["'`]$/g, "")
    .split("?")[0] ?? "";
  // Drop /api/ or leading slash, split on /, replace template-slots with by-id.
  const parts = stripped
    .replace(/^\/api\//, "")
    .replace(/^\//, "")
    .split("/")
    .filter(Boolean);
  if (parts.length === 0) return "unknown.list";
  // If the final segment is a parameter slot (`${...}` or `[id]` style),
  // map to `<resource>.by-id`. If a non-param segment follows a param
  // slot, treat it as a sub-action: `/api/deals/[id]/move-stage` →
  // `deals.move-stage`.
  const cleanedParts: string[] = [];
  let lastWasParam = false;
  for (const p of parts) {
    if (p.startsWith("${") || p.startsWith("[")) {
      lastWasParam = true;
      continue;
    }
    cleanedParts.push(p);
    lastWasParam = false;
  }
  if (cleanedParts.length === 0) return "unknown.list";
  if (cleanedParts.length === 1) {
    return `${cleanedParts[0]}.${lastWasParam ? "by-id" : "list"}`;
  }
  // resource + sub-action, e.g. `deals.move-stage`
  const resource = cleanedParts[0]!;
  const action = cleanedParts.slice(1).join("-");
  return `${resource}.${action}`;
}

function urlPatternToWorkflowId(urlPattern: string, method: string): string {
  const stripped = urlPattern
    .replace(/^["'`]|["'`]$/g, "")
    .split("?")[0] ?? "";
  const parts = stripped
    .replace(/^\/api\//, "")
    .replace(/^\//, "")
    .split("/")
    .filter(Boolean);
  if (parts.length === 0) return "unknown.action";
  const cleanedParts: string[] = [];
  for (const p of parts) {
    if (p.startsWith("${") || p.startsWith("[")) continue;
    cleanedParts.push(p);
  }
  if (cleanedParts.length === 0) return "unknown.action";
  const resource = cleanedParts[0]!;
  const subAction = cleanedParts.slice(1).join("-");
  if (subAction) {
    // Explicit sub-action in the URL wins (e.g. `/api/tickets/[id]/reply` → `tickets.reply`).
    return `${resource}.${subAction}`;
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
  for (const r of reads) {
    const id = urlPatternToAdapterId(r.urlPattern);
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
  for (const w of writes) {
    const id = urlPatternToWorkflowId(w.urlPattern, w.method);
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
  // Map url-pattern → adapter-id for cheap lookup.
  const urlToAdapterId = new Map<string, string>();
  for (const r of allReads) {
    urlToAdapterId.set(r.urlPattern + "|read", urlPatternToAdapterId(r.urlPattern));
  }
  const urlToWorkflowId = new Map<string, string>();
  for (const w of allWrites) {
    urlToWorkflowId.set(w.urlPattern + "|" + w.method, urlPatternToWorkflowId(w.urlPattern, w.method));
  }

  return components
    .map<ComponentCandidate>((c) => {
      const consumesReads = Array.from(
        new Set(
          allReads
            .filter((r) => r.file === c.file && r.line >= c.startLine && r.line <= c.endLine)
            .map((r) => urlPatternToAdapterId(r.urlPattern)),
        ),
      );
      const consumesWrites = Array.from(
        new Set(
          allWrites
            .filter((w) => w.file === c.file && w.line >= c.startLine && w.line <= c.endLine)
            .map((w) => urlPatternToWorkflowId(w.urlPattern, w.method)),
        ),
      );
      const { difficulty, reasons } = scoreDifficulty(c, consumesReads, consumesWrites);
      const suggestedBlockId = suggestBlockId(c.componentName, consumesReads);
      return {
        componentPath: c.file,
        componentName: c.componentName,
        consumesReads,
        consumesWrites,
        hasLocalState: c.stateHookCount > 0,
        hasComplexProps: c.hasComplexProps,
        extractionDifficulty: difficulty,
        difficultyReasons: reasons,
        suggestedBlockId,
        metadata: {
          locOfComponent: c.loc,
          stateHookCount: c.stateHookCount,
          propCount: c.propCount,
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
  let difficulty: Difficulty;
  if (score >= 5) difficulty = "hard";
  else if (score >= 2) difficulty = "medium";
  else difficulty = "easy";
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

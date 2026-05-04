#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { Registry } from "@composoft/spec";
import { validateComposition } from "@composoft/runtime";
import { callComposer, resolveModel } from "./claude.js";
import { generateNextApp } from "./generate.js";
import { summarizeRegistry } from "./registry-summary.js";
import { resolveRegistry } from "./resolve-registry.js";
import {
  findPageStateWriterGaps,
  formatIssue,
  formatReferenceWarning,
  formatWarning,
  validateCompositionAgainstRegistry,
  validateContextPaths,
  validateReferenceIds,
} from "./validate.js";
import {
  type ComposoftMeta,
  findCustomer,
  formatCustomerDetail,
  formatCustomerNotFound,
  formatGaps,
  formatTable,
  loadMetas,
} from "./inspect.js";

type Args = {
  brief: string;
  registry: string;
  out: string;
  customer?: string;
};

function parseArgs(argv: string[]): Args {
  const args: Args = { brief: "", registry: "", out: "" };
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i];
    const value = argv[i + 1];
    if (!flag) continue;
    if (flag === "--brief" && value !== undefined) {
      args.brief = value;
      i++;
    } else if (flag === "--registry" && value !== undefined) {
      args.registry = value;
      i++;
    } else if (flag === "--out" && value !== undefined) {
      args.out = value;
      i++;
    } else if (flag === "--customer" && value !== undefined) {
      args.customer = value;
      i++;
    } else if (flag === "--help" || flag === "-h") {
      printUsage();
      process.exit(0);
    }
  }
  if (!args.brief || !args.registry || !args.out) {
    printUsage();
    process.exit(2);
  }
  return args;
}

function printUsage(): void {
  console.error(
    [
      "Usage: composoft <command> [args]",
      "",
      "Commands:",
      "  compose --brief <path> --registry <package> --out <path> [--customer <name>]",
      "                                  Generate a Next.js app from a brief.",
      "  inspect [<customer>] [--gaps]   Read apps/*/.composoft-meta.json sidecars.",
      "                                  No args  → table of every generated app.",
      "                                  --gaps   → model-note frequencies across customers.",
      "                                  <name>   → full detail for one app.",
      "",
      "Compose flags:",
      "  --brief    path to a markdown brief",
      "  --registry name of an installed registry package (e.g. @composoft/registry-example-postgres)",
      "  --out      directory to write the generated Next.js app into",
      "  --customer customer display name shown in the generated app's chrome (e.g. \"Brewline\")",
      "",
      "Env:",
      "  ANTHROPIC_API_KEY    required for compose",
      "  COMPOSOFT_MODEL      optional (default: claude-opus-4-7)",
    ].join("\n"),
  );
}

async function compose(args: Args): Promise<void> {
  const briefPath = resolve(args.brief);
  const brief = await readFile(briefPath, "utf8");

  const resolved = await resolveRegistry(args.registry);
  const registry = resolved.module.registry as Registry | undefined;
  if (!registry || typeof registry !== "object") {
    throw new Error(
      `registry "${args.registry}" did not export a \`registry\` value. Make sure it is built and installed.`,
    );
  }

  console.error(`-> registry: ${registry.name}@${registry.version}`);
  console.error(
    `-> ${Object.keys(registry.adapters).length} adapters, ${Object.keys(registry.workflows).length} workflows, ${Object.keys(registry.blocks).length} blocks`,
  );
  console.error(`-> model: ${resolveModel()}`);

  const summary = await summarizeRegistry(registry);

  console.error(`-> calling composer...`);
  const response = await callComposer(brief, summary);

  console.error(`-> validating composition shape`);
  const composition = validateComposition(response.composition);

  // Dump the model-emitted artifacts before validation so failures still
  // surface them — useful for iterating the prompt and validators.
  console.error(`-> contextSchemaJson:`);
  console.error(JSON.stringify(response.contextSchemaJson, null, 2));
  console.error(`-> contextSchemaTs:`);
  console.error(response.contextSchemaTs);

  console.error(`-> validating composition against registry`);
  const registryIssues = validateCompositionAgainstRegistry(composition, registry);
  console.error(`-> validating from-context paths against contextSchemaJson`);
  const contextIssues = validateContextPaths(
    composition,
    registry,
    response.contextSchemaJson,
  );
  const issues = [...registryIssues, ...contextIssues];
  if (issues.length > 0) {
    console.error(`FAIL — ${issues.length} composition issue${issues.length === 1 ? "" : "s"}:`);
    for (const issue of issues) console.error(`  - ${formatIssue(issue)}`);
    process.exit(1);
  }

  console.error(`-> checking page-state reads have a writer on the same page`);
  const warnings = findPageStateWriterGaps(composition, registry);
  if (warnings.length > 0) {
    console.error(
      `-> ${warnings.length} page-state warning${warnings.length === 1 ? "" : "s"} (informational; not fatal):`,
    );
    for (const w of warnings) console.error(`  - ${formatWarning(w)}`);
  }

  console.error(`-> checking *Id config fields against registry referenceData`);
  const refWarnings = validateReferenceIds(composition, summary.referenceData);
  if (refWarnings.length > 0) {
    console.error(
      `-> ${refWarnings.length} reference-id warning${refWarnings.length === 1 ? "" : "s"} (informational; not fatal):`,
    );
    for (const w of refWarnings) console.error(`  - ${formatReferenceWarning(w)}`);
  }

  console.error(`-> generating Next.js app at ${args.out}`);
  const result = await generateNextApp({
    outDir: args.out,
    registryPackageName: resolved.packageName,
    registryDir: resolved.packageDir,
    composition,
    contextSchemaTs: response.contextSchemaTs,
    product: registry.product,
    customer: args.customer,
  });

  const blocksPerPage = composition.pages
    .map((p) => `${p.path}: ${p.blocks.length} block${p.blocks.length === 1 ? "" : "s"}`)
    .join(", ");

  console.log(`OK — wrote ${result.files.length} files to ${args.out}`);
  console.log(`     pages: ${blocksPerPage}`);
  if (response.notes && response.notes.length > 0) {
    console.log(`     model notes:`);
    for (const note of response.notes) console.log(`       - ${note}`);
  }

  // Write the metadata sidecar last. The generated app is the primary
  // deliverable; this file is for the FDE meta-view (`composoft inspect`).
  // If anything goes wrong (disk full, permission, etc.) we warn and
  // succeed — the brief / composition / app on disk are unaffected.
  try {
    const composerVersion = await readComposerVersion();
    const meta: ComposoftMeta = {
      customer: args.customer ?? "",
      briefPath: relative(process.cwd(), briefPath) || briefPath,
      briefContent: brief,
      modelNotes: response.notes ?? [],
      pages: composition.pages.map((p) => ({
        path: p.path,
        blockCount: p.blocks.length,
      })),
      registry: {
        name: registry.name,
        version: registry.version,
      },
      composerVersion,
      // The composer pins runtime to its own version (see generate.ts's
      // SHADCN_DEP_VERSIONS / runtime entry), so the two move together.
      runtimeVersion: composerVersion,
      generatedAt: new Date().toISOString(),
      filesWritten: result.files.length,
    };
    const metaPath = join(resolve(args.out), ".composoft-meta.json");
    await mkdir(dirname(metaPath), { recursive: true });
    await writeFile(metaPath, JSON.stringify(meta, null, 2) + "\n", "utf8");
    console.log(`     metadata: ${relative(process.cwd(), metaPath) || metaPath}`);
  } catch (e) {
    console.error(`Could not write metadata: ${(e as Error).message}`);
  }
}

/**
 * Read the composer's own package.json at runtime so the metadata sidecar
 * pins composer/runtime versions accurately. Walks up from this compiled
 * file (dist/cli.js) to find the package root — same approach generate.ts
 * uses for its own version stamping.
 */
async function readComposerVersion(): Promise<string> {
  const here = dirname(fileURLToPath(import.meta.url));
  let dir = here;
  for (;;) {
    const candidate = join(dir, "package.json");
    try {
      const raw = await readFile(candidate, "utf8");
      const pkg = JSON.parse(raw) as { name?: string; version?: string };
      if (pkg.name === "@composoft/composer" && typeof pkg.version === "string") {
        return pkg.version;
      }
    } catch {
      // keep walking
    }
    const parent = dirname(dir);
    if (parent === dir) {
      throw new Error("could not locate @composoft/composer package.json to read version");
    }
    dir = parent;
  }
}

// --- inspect subcommand ----------------------------------------------------

type InspectArgs =
  | { kind: "default" }
  | { kind: "gaps" }
  | { kind: "customer"; needle: string }
  | { kind: "help" };

function parseInspectArgs(argv: string[]): InspectArgs {
  if (argv.length === 0) return { kind: "default" };
  const first = argv[0];
  if (first === "--help" || first === "-h") return { kind: "help" };
  if (first === "--gaps") return { kind: "gaps" };
  if (first !== undefined && first.startsWith("-")) {
    console.error(`unknown inspect option: ${first}`);
    return { kind: "help" };
  }
  // Anything else is a customer name. Join remaining args so multi-word
  // customers (`composoft inspect Haldermann & Sons`) work without quoting.
  return { kind: "customer", needle: argv.join(" ") };
}

function printInspectUsage(): void {
  console.error(
    [
      "Usage: composoft inspect [<customer>] [--gaps]",
      "",
      "Reads apps/*/.composoft-meta.json from the current directory and surfaces:",
      "  composoft inspect              — table of every generated app (default)",
      "  composoft inspect --gaps       — model-note frequencies across customers",
      "  composoft inspect <customer>   — full detail for one app (case-insensitive)",
    ].join("\n"),
  );
}

async function inspect(argv: string[]): Promise<void> {
  const args = parseInspectArgs(argv);
  if (args.kind === "help") {
    printInspectUsage();
    return;
  }
  const metas = await loadMetas(process.cwd());
  if (args.kind === "default") {
    console.log(formatTable(metas));
    return;
  }
  if (args.kind === "gaps") {
    console.log(formatGaps(metas));
    return;
  }
  // customer detail
  if (metas.length === 0) {
    console.log("No composoft apps found in ./apps/. Run `composoft compose` first.");
    return;
  }
  const found = findCustomer(metas, args.needle);
  if (!found) {
    console.log(formatCustomerNotFound(args.needle, metas));
    process.exitCode = 1;
    return;
  }
  console.log(formatCustomerDetail(found));
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const command = argv[0];
  if (command === "compose") {
    await compose(parseArgs(argv.slice(1)));
    return;
  }
  if (command === "inspect") {
    await inspect(argv.slice(1));
    return;
  }
  if (command === "--help" || command === "-h" || command === undefined) {
    printUsage();
    process.exit(command === undefined ? 2 : 0);
  }
  console.error(`unknown command: ${command}`);
  printUsage();
  process.exit(2);
}

main().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : String(e));
  process.exit(1);
});

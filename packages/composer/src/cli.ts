#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { Registry } from "@composoft/spec";
import { validateComposition } from "@composoft/runtime";
import { callComposer, resolveModel } from "./claude.js";
import { generateNextApp } from "./generate.js";
import { summarizeRegistry } from "./registry-summary.js";
import {
  formatIssue,
  validateCompositionAgainstRegistry,
  validateContextPaths,
} from "./validate.js";

type Args = {
  brief: string;
  registry: string;
  out: string;
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
      "Usage: composoft compose --brief <path> --registry <package> --out <path>",
      "",
      "  --brief    path to a markdown brief",
      "  --registry name of an installed registry package (e.g. @composoft/registry-acme)",
      "  --out      directory to write the generated Next.js app into",
      "",
      "Env:",
      "  ANTHROPIC_API_KEY    required",
      "  COMPOSOFT_MODEL      optional (default: claude-opus-4-7)",
    ].join("\n"),
  );
}

async function compose(args: Args): Promise<void> {
  const briefPath = resolve(args.brief);
  const brief = await readFile(briefPath, "utf8");

  const mod = (await import(args.registry)) as { registry?: Registry };
  const registry = mod.registry;
  if (!registry || typeof registry !== "object") {
    throw new Error(
      `registry package "${args.registry}" did not export a \`registry\` value. Make sure it is built and installed.`,
    );
  }

  console.error(`-> registry: ${registry.name}@${registry.version}`);
  console.error(
    `-> ${Object.keys(registry.adapters).length} adapters, ${Object.keys(registry.workflows).length} workflows, ${Object.keys(registry.blocks).length} blocks`,
  );
  console.error(`-> model: ${resolveModel()}`);

  const summary = summarizeRegistry(registry);

  console.error(`-> calling composer...`);
  const response = await callComposer(brief, summary);

  console.error(`-> validating composition shape`);
  const composition = validateComposition(response.composition);

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

  console.error(`-> contextSchemaJson:`);
  console.error(JSON.stringify(response.contextSchemaJson, null, 2));
  console.error(`-> generating Next.js app at ${args.out}`);
  const result = await generateNextApp({
    outDir: args.out,
    registryPackage: args.registry,
    composition,
    contextSchemaTs: response.contextSchemaTs,
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
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const command = argv[0];
  if (command === "compose") {
    await compose(parseArgs(argv.slice(1)));
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

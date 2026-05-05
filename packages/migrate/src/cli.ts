#!/usr/bin/env node
import { resolve } from "node:path";
import { analyzeCodebase } from "./analyze.js";
import { renderAnalysisMarkdown } from "./render.js";
import { writeAnalysis, readState, ANALYSIS_FILE, STATE_FILE } from "./state.js";
import { formatSummary, runWalkthrough } from "./walkthrough.js";

type Cmd = "analyze" | "walkthrough" | "status" | "help";

type AnalyzeArgs = { path: string; topN: number };

function parseTopN(argv: string[]): number {
  const i = argv.indexOf("--top");
  if (i === -1) return 10;
  const v = argv[i + 1];
  const n = v ? parseInt(v, 10) : NaN;
  if (Number.isFinite(n) && n > 0) return n;
  console.error(`--top expects a positive integer; got ${v}`);
  process.exit(2);
}

function parseAnalyzeArgs(argv: string[]): AnalyzeArgs {
  const positional = argv.filter((a) => !a.startsWith("-"));
  const path = positional[0];
  if (!path) {
    console.error("Usage: composoft-migrate analyze <path> [--top N]");
    process.exit(2);
  }
  return { path: resolve(path), topN: parseTopN(argv) };
}

function parsePathArg(argv: string[]): string {
  const positional = argv.filter((a) => !a.startsWith("-"));
  return resolve(positional[0] ?? ".");
}

function printUsage(): void {
  console.log(
    [
      "Usage: composoft-migrate <command> [args]",
      "",
      "Commands:",
      "  analyze <path> [--top N]    Static analysis. Writes <path>/.composoft-migrate/",
      "                              analysis.json + analysis.md. --top controls how many",
      "                              read/write candidates to surface (default 10).",
      "  walkthrough [<path>]        Interactive decision flow over the analysis. Persists",
      "                              choices to state.json + history.json. Path defaults to",
      "                              current directory.",
      "  status [<path>]             Print what's been decided. Read-only.",
      "",
      "v0 of the migration tooling. Future iterations consume this state file to ship",
      "the block extractor + embeddable runtime.",
    ].join("\n"),
  );
}

async function cmdAnalyze(args: string[]): Promise<void> {
  const { path, topN } = parseAnalyzeArgs(args);
  console.error(`-> analyzing ${path}`);
  const analysis = await analyzeCodebase(path);
  console.error(
    `-> ${analysis.codebaseShape.componentCount} component(s), ` +
      `${analysis.codebaseShape.totalFiles} file(s); ` +
      `${analysis.readCandidates.length} read candidate(s), ` +
      `${analysis.writeCandidates.length} write candidate(s).`,
  );
  if (analysis.limitations.length > 0) {
    console.error(
      `-> ${analysis.limitations.length} limitation${analysis.limitations.length === 1 ? "" : "s"} flagged (see analysis.md).`,
    );
  }
  const md = renderAnalysisMarkdown(analysis, { topN });
  const { jsonPath, mdPath } = await writeAnalysis(path, analysis, md);
  console.log(`OK — wrote ${jsonPath}`);
  console.log(`     wrote ${mdPath}`);
  console.log("");
  console.log(`Next: \`composoft-migrate walkthrough ${path}\` to make decisions interactively.`);
}

async function cmdWalkthrough(args: string[]): Promise<void> {
  const codebasePath = parsePathArg(args);
  await runWalkthrough({ codebasePath });
}

async function cmdStatus(args: string[]): Promise<void> {
  const codebasePath = parsePathArg(args);
  const state = await readState(codebasePath);
  if (!state) {
    console.log(
      `No migration in progress in ${codebasePath}. Run \`composoft-migrate walkthrough\` to start.\n` +
        `(If you haven't analyzed yet, run \`composoft-migrate analyze ${codebasePath}\` first.)`,
    );
    return;
  }
  console.log(formatSummary(state));
  console.log("");
  console.log(`State file: ${codebasePath}/.composoft-migrate/${STATE_FILE}`);
  console.log(`Analysis:   ${codebasePath}/.composoft-migrate/${ANALYSIS_FILE}`);
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const cmd = (argv[0] ?? "help") as Cmd;
  const rest = argv.slice(1);
  if (cmd === "analyze") return cmdAnalyze(rest);
  if (cmd === "walkthrough") return cmdWalkthrough(rest);
  if (cmd === "status") return cmdStatus(rest);
  if (cmd === "help" || cmd === "--help" || (cmd as string) === "-h") {
    printUsage();
    return;
  }
  console.error(`unknown command: ${cmd}`);
  printUsage();
  process.exit(2);
}

main().catch((e: unknown) => {
  console.error(e instanceof Error ? e.stack ?? e.message : String(e));
  process.exit(1);
});

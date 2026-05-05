// Markdown rendering of an Analysis. Optimized for human readability —
// scannable headings, frequency-ranked lists, copy-pasteable into a
// planning doc. Anything exhaustive lives in analysis.json next to it.

import { basename } from "node:path";
import type {
  Analysis,
  ComponentCandidate,
  ReadCandidate,
  WriteCandidate,
} from "./types.js";

export type RenderOptions = {
  /** How many read/write candidates to feature in the "suggested seed registry" sections. */
  topN: number;
};

const DEFAULT_OPTIONS: RenderOptions = { topN: 10 };

export function renderAnalysisMarkdown(
  analysis: Analysis,
  options: Partial<RenderOptions> = {},
): string {
  const opts: RenderOptions = { ...DEFAULT_OPTIONS, ...options };
  const codebaseName = basename(analysis.codebasePath);
  const lines: string[] = [];

  lines.push(`# Migration analysis: ${codebaseName}`);
  lines.push("");
  lines.push(
    `Analyzed at ${analysis.analyzedAt}. ` +
      `${analysis.codebaseShape.componentCount} component${analysis.codebaseShape.componentCount === 1 ? "" : "s"}, ` +
      `${analysis.codebaseShape.totalFiles} total file${analysis.codebaseShape.totalFiles === 1 ? "" : "s"}. ` +
      `Framework: ${analysis.codebaseShape.framework}` +
      (analysis.codebaseShape.reactVersion ? ` (react ${analysis.codebaseShape.reactVersion}).` : "."),
  );
  lines.push("");

  lines.push("## Suggested seed registry");
  lines.push("");
  lines.push(renderReadsSection(analysis.readCandidates, opts.topN));
  lines.push("");
  lines.push(renderWritesSection(analysis.writeCandidates, opts.topN));
  lines.push("");

  lines.push("## Components ranked for extraction");
  lines.push("");
  lines.push(renderComponentsSection(analysis.componentCandidates));
  lines.push("");

  lines.push("## What this analyzer couldn't see");
  lines.push("");
  if (analysis.limitations.length === 0) {
    lines.push(
      "Nothing flagged. Every file the analyzer looked at fit one of its supported patterns " +
        "(useSWR / useQuery / fetch + function components). Don't take this as proof there's " +
        "nothing to worry about — take it as a clean baseline.",
    );
  } else {
    for (const l of analysis.limitations) {
      lines.push(`- ${l}`);
    }
  }
  lines.push("");

  return lines.join("\n");
}

function renderReadsSection(reads: ReadCandidate[], topN: number): string {
  if (reads.length === 0) {
    return "No read patterns detected. The analyzer looked for useSWR, useQuery, and GET-style fetch — none surfaced.";
  }
  const out: string[] = [];
  out.push(`Top ${Math.min(topN, reads.length)} reads to extract as adapters, ranked by usage:`);
  out.push("");
  for (const [i, r] of reads.slice(0, topN).entries()) {
    out.push(
      `${i + 1}. **${r.suggestedAdapterId}** (used in ${r.usageCount} call site${r.usageCount === 1 ? "" : "s"}, ${r.confidence} confidence)`,
    );
    out.push(`   - Returns: \`${r.inferredReturnShape}\``);
    if (r.inferredParams.length > 0) {
      const ps = r.inferredParams.map((p) => `${p.name}: ${p.tsType}`).join(", ");
      out.push(`   - Params: { ${ps} }`);
    }
    const fileList = uniqueFiles(r.sourceLocations).slice(0, 5);
    out.push(`   - Used in: ${fileList.join(", ")}${uniqueFiles(r.sourceLocations).length > 5 ? ", …" : ""}`);
    out.push(`   - Confidence: ${r.confidenceReason}`);
    out.push("");
  }
  return out.join("\n").trimEnd();
}

function renderWritesSection(writes: WriteCandidate[], topN: number): string {
  if (writes.length === 0) {
    return "No write patterns detected. The analyzer looked for fetch with non-GET methods — none surfaced.";
  }
  const out: string[] = [];
  out.push(`Top ${Math.min(topN, writes.length)} writes to extract as workflows, ranked by usage:`);
  out.push("");
  for (const [i, w] of writes.slice(0, topN).entries()) {
    out.push(
      `${i + 1}. **${w.suggestedWorkflowId}** (used in ${w.usageCount} call site${w.usageCount === 1 ? "" : "s"}, ${w.confidence} confidence)`,
    );
    out.push(`   - Input shape: \`${w.inferredInputShape}\``);
    out.push(`   - Side effects: ${w.inferredSideEffects.join("; ")}`);
    const fileList = uniqueFiles(w.sourceLocations).slice(0, 5);
    out.push(`   - Used in: ${fileList.join(", ")}${uniqueFiles(w.sourceLocations).length > 5 ? ", …" : ""}`);
    out.push(`   - Confidence: ${w.confidenceReason}`);
    out.push("");
  }
  return out.join("\n").trimEnd();
}

function renderComponentsSection(components: ComponentCandidate[]): string {
  const buckets: Record<"easy" | "medium" | "hard", ComponentCandidate[]> = {
    easy: [],
    medium: [],
    hard: [],
  };
  for (const c of components) buckets[c.extractionDifficulty].push(c);

  const out: string[] = [];
  out.push(renderBucket("Easy (start here)", buckets.easy));
  out.push("");
  out.push(renderBucket("Medium", buckets.medium));
  out.push("");
  out.push(renderBucket("Hard (do these last)", buckets.hard));
  return out.join("\n");
}

function renderBucket(heading: string, components: ComponentCandidate[]): string {
  const out: string[] = [];
  out.push(`### ${heading}`);
  out.push("");
  if (components.length === 0) {
    out.push("_(none)_");
    return out.join("\n");
  }
  for (const c of components) {
    const consumes: string[] = [];
    if (c.consumesReads.length > 0)
      consumes.push(`reads: ${c.consumesReads.join(", ")}`);
    if (c.consumesWrites.length > 0)
      consumes.push(`writes: ${c.consumesWrites.join(", ")}`);
    if (consumes.length === 0) consumes.push("no reads or writes detected");
    const stateNote = c.hasLocalState ? "has local state" : "no local state";
    out.push(`- **${c.componentName}** (${consumes.join("; ")}; ${stateNote})`);
    out.push(`  - File: ${c.componentPath}`);
    out.push(`  - Suggested block id: \`${c.suggestedBlockId}\``);
    out.push(`  - Why ${c.extractionDifficulty}: ${c.difficultyReasons.join("; ")}`);
    out.push("");
  }
  return out.join("\n").trimEnd();
}

function uniqueFiles(locs: { file: string }[]): string[] {
  return Array.from(new Set(locs.map((l) => l.file)));
}

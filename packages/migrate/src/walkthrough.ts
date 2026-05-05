// Interactive decision-driven walkthrough. Two phases (seed-registry
// decisions, then component extraction queue), each item one-at-a-time
// with single-key shortcuts. Spirit is `git rebase --interactive`: every
// choice explicit, the user can quit any time, choices persist in
// state.json + history.json so a teammate can resume.
//
// UX is built on Node's built-in readline — no extra dep. Single-key
// input via raw mode. We render to stdout, read keys from stdin.

import { stdin, stdout } from "node:process";
import { promisify } from "node:util";
import type {
  Analysis,
  ComponentCandidate,
  MigrationState,
  ReadCandidate,
  WriteCandidate,
} from "./types.js";
import {
  appendHistory,
  archivePreviousState,
  makeFreshState,
  readAnalysis,
  readState,
  writeState,
} from "./state.js";

export type WalkthroughOptions = {
  codebasePath: string;
};

/**
 * Run the full walkthrough. Reads analysis.json, prompts for resume vs
 * fresh start, runs the read-candidate phase, the write-candidate phase,
 * and the component-queue phase. Quitting at any time persists state.
 */
export async function runWalkthrough(opts: WalkthroughOptions): Promise<void> {
  const codebasePath = opts.codebasePath;
  const analysis = await readAnalysis(codebasePath);
  if (!analysis) {
    console.log(
      "No analysis found at " +
        codebasePath +
        ". Run `composoft-migrate analyze " +
        codebasePath +
        "` first.",
    );
    process.exitCode = 1;
    return;
  }

  let state = await readState(codebasePath);
  if (state) {
    const last = state.lastUpdatedAt;
    const continueAns = await singleKey(
      `Continuing previous walkthrough from ${last}? [y/N] `,
      ["y", "n", "\r"],
    );
    if (continueAns !== "y") {
      const archived = await archivePreviousState(codebasePath);
      if (archived) {
        console.log(`Archived previous state to ${archived}.`);
      }
      state = makeFreshState();
      await appendHistory(codebasePath, "walkthrough.archived", {
        archivedTo: archived,
      });
    } else {
      await appendHistory(codebasePath, "walkthrough.resumed", {});
    }
  } else {
    state = makeFreshState();
    await appendHistory(codebasePath, "walkthrough.started", {});
  }

  // Phase 1: seed-registry reads
  const phase1 = await runReadPhase(codebasePath, analysis.readCandidates, state);
  if (phase1 === "quit") return finish(codebasePath, state, "quit");

  // Phase 1b: seed-registry writes
  const phase1b = await runWritePhase(codebasePath, analysis.writeCandidates, state);
  if (phase1b === "quit") return finish(codebasePath, state, "quit");

  // Phase 2: component extraction queue
  const phase2 = await runComponentPhase(codebasePath, analysis.componentCandidates, state);
  if (phase2 === "quit") return finish(codebasePath, state, "quit");

  return finish(codebasePath, state, "completed");
}

async function finish(
  codebasePath: string,
  state: MigrationState,
  exitKind: "completed" | "quit",
): Promise<void> {
  await writeState(codebasePath, state);
  await appendHistory(
    codebasePath,
    exitKind === "completed" ? "walkthrough.completed" : "walkthrough.quit",
    {},
  );
  console.log("");
  console.log(formatSummary(state));
  console.log("");
  console.log(
    exitKind === "completed"
      ? "Walkthrough complete. Run `composoft-migrate status` any time to see this summary."
      : "Walkthrough paused. State saved. Run `composoft-migrate walkthrough` again to resume.",
  );
  if (exitKind === "completed") {
    console.log(
      "The block extractor that consumes this queue is on the roadmap. Open issues at https://github.com/githnm/composoft if blocked.",
    );
  }
}

// --- phases ----------------------------------------------------------------

type PhaseResult = "completed" | "quit";

async function runReadPhase(
  codebasePath: string,
  candidates: ReadCandidate[],
  state: MigrationState,
): Promise<PhaseResult> {
  if (candidates.length === 0) return "completed";
  console.log("");
  console.log("Phase 1a — Seed registry: reads (potential adapters)");
  console.log("─".repeat(64));
  for (const r of candidates) {
    if (alreadyDecided(r.suggestedAdapterId, state.seedRegistryDecisions.acceptedReads, state.seedRegistryDecisions.rejectedReads)) {
      continue;
    }
    renderReadCard(r);
    const key = await singleKey(
      "Accept this as a seed adapter? [a]ccept / [r]eject / [s]kip / [n]ote / [q]uit  ",
      ["a", "r", "s", "n", "q"],
    );
    if (key === "a") {
      state.seedRegistryDecisions.acceptedReads.push(r.suggestedAdapterId);
      await appendHistory(codebasePath, "read.accepted", { adapterId: r.suggestedAdapterId });
    } else if (key === "r") {
      state.seedRegistryDecisions.rejectedReads.push(r.suggestedAdapterId);
      await appendHistory(codebasePath, "read.rejected", { adapterId: r.suggestedAdapterId });
    } else if (key === "s") {
      await appendHistory(codebasePath, "read.skipped", { adapterId: r.suggestedAdapterId });
    } else if (key === "n") {
      const note = await readLine("  Note: ");
      state.notes.push(`[read ${r.suggestedAdapterId}] ${note}`);
      await appendHistory(codebasePath, "note.added", { context: r.suggestedAdapterId, note });
    } else if (key === "q") {
      return "quit";
    }
    await writeState(codebasePath, state);
  }
  return "completed";
}

async function runWritePhase(
  codebasePath: string,
  candidates: WriteCandidate[],
  state: MigrationState,
): Promise<PhaseResult> {
  if (candidates.length === 0) return "completed";
  console.log("");
  console.log("Phase 1b — Seed registry: writes (potential workflows)");
  console.log("─".repeat(64));
  for (const w of candidates) {
    if (alreadyDecided(w.suggestedWorkflowId, state.seedRegistryDecisions.acceptedWrites, state.seedRegistryDecisions.rejectedWrites)) {
      continue;
    }
    renderWriteCard(w);
    const key = await singleKey(
      "Accept this as a seed workflow? [a]ccept / [r]eject / [s]kip / [n]ote / [q]uit  ",
      ["a", "r", "s", "n", "q"],
    );
    if (key === "a") {
      state.seedRegistryDecisions.acceptedWrites.push(w.suggestedWorkflowId);
      await appendHistory(codebasePath, "write.accepted", { workflowId: w.suggestedWorkflowId });
    } else if (key === "r") {
      state.seedRegistryDecisions.rejectedWrites.push(w.suggestedWorkflowId);
      await appendHistory(codebasePath, "write.rejected", { workflowId: w.suggestedWorkflowId });
    } else if (key === "s") {
      await appendHistory(codebasePath, "write.skipped", { workflowId: w.suggestedWorkflowId });
    } else if (key === "n") {
      const note = await readLine("  Note: ");
      state.notes.push(`[write ${w.suggestedWorkflowId}] ${note}`);
      await appendHistory(codebasePath, "note.added", { context: w.suggestedWorkflowId, note });
    } else if (key === "q") {
      return "quit";
    }
    await writeState(codebasePath, state);
  }
  return "completed";
}

async function runComponentPhase(
  codebasePath: string,
  candidates: ComponentCandidate[],
  state: MigrationState,
): Promise<PhaseResult> {
  if (candidates.length === 0) return "completed";
  console.log("");
  console.log("Phase 2 — Component extraction queue");
  console.log("─".repeat(64));
  for (const c of candidates) {
    if (alreadyDecided(c.componentPath, state.blockExtractionQueue.pending, state.blockExtractionQueue.skipped)) {
      continue;
    }
    renderComponentCard(c);
    const key = await singleKey(
      "Queue for extraction? [q]ueue / [s]kip-permanently / [l]ater / [n]ote / [x]exit  ",
      ["q", "s", "l", "n", "x"],
    );
    if (key === "q") {
      state.blockExtractionQueue.pending.push(c.componentPath);
      await appendHistory(codebasePath, "component.queued", { componentPath: c.componentPath });
    } else if (key === "s") {
      state.blockExtractionQueue.skipped.push(c.componentPath);
      await appendHistory(codebasePath, "component.skipped", { componentPath: c.componentPath });
    } else if (key === "l") {
      await appendHistory(codebasePath, "component.deferred", { componentPath: c.componentPath });
      // No state change; the next walkthrough revisits.
    } else if (key === "n") {
      const note = await readLine("  Note: ");
      state.notes.push(`[component ${c.componentPath}] ${note}`);
      await appendHistory(codebasePath, "note.added", {
        context: c.componentPath,
        note,
      });
    } else if (key === "x") {
      return "quit";
    }
    await writeState(codebasePath, state);
  }
  return "completed";
}

function alreadyDecided(id: string, ...lists: string[][]): boolean {
  return lists.some((l) => l.includes(id));
}

// --- card renderers --------------------------------------------------------

function renderReadCard(r: ReadCandidate): void {
  console.log("");
  console.log(`Read candidate: ${r.suggestedAdapterId}  (${r.confidence} confidence)`);
  console.log(`  Used in ${r.usageCount} call site${r.usageCount === 1 ? "" : "s"}: ${uniqueFiles(r.sourceLocations).slice(0, 5).join(", ")}`);
  if (r.inferredParams.length > 0) {
    console.log(`  Params: { ${r.inferredParams.map((p) => `${p.name}: ${p.tsType}`).join(", ")} }`);
  }
  console.log(`  Returns: ${r.inferredReturnShape}`);
  console.log(`  Why ${r.confidence}: ${r.confidenceReason}`);
}

function renderWriteCard(w: WriteCandidate): void {
  console.log("");
  console.log(`Write candidate: ${w.suggestedWorkflowId}  (${w.confidence} confidence)`);
  console.log(`  Used in ${w.usageCount} call site${w.usageCount === 1 ? "" : "s"}: ${uniqueFiles(w.sourceLocations).slice(0, 5).join(", ")}`);
  console.log(`  Side effects: ${w.inferredSideEffects.join("; ")}`);
  console.log(`  Input shape: ${w.inferredInputShape}`);
  console.log(`  Why ${w.confidence}: ${w.confidenceReason}`);
}

function renderComponentCard(c: ComponentCandidate): void {
  console.log("");
  console.log(`Component: ${c.componentName}  (${c.extractionDifficulty})`);
  console.log(`  File: ${c.componentPath}`);
  console.log(`  Suggested block id: ${c.suggestedBlockId}`);
  if (c.consumesReads.length > 0)
    console.log(`  Consumes reads: ${c.consumesReads.join(", ")}`);
  if (c.consumesWrites.length > 0)
    console.log(`  Consumes writes: ${c.consumesWrites.join(", ")}`);
  console.log(`  Local state: ${c.hasLocalState ? "yes" : "no"}`);
  console.log(`  Why ${c.extractionDifficulty}: ${c.difficultyReasons.join("; ")}`);
}

function uniqueFiles(locs: { file: string }[]): string[] {
  return Array.from(new Set(locs.map((l) => l.file)));
}

// --- final summary ---------------------------------------------------------

export function formatSummary(state: MigrationState): string {
  const sd = state.seedRegistryDecisions;
  const q = state.blockExtractionQueue;
  return [
    "Walkthrough summary",
    "",
    "Seed registry decisions:",
    `  Accepted: ${sd.acceptedReads.length} reads, ${sd.acceptedWrites.length} writes`,
    `  Rejected: ${sd.rejectedReads.length} reads, ${sd.rejectedWrites.length} writes`,
    "",
    "Block extraction queue:",
    `  Pending: ${q.pending.length} components`,
    `  Skipped: ${q.skipped.length} components`,
    "",
    `Notes: ${state.notes.length}`,
  ].join("\n");
}

// --- single-key + line input ----------------------------------------------

// Module-scoped buffer for any chars the previous singleKey() call read
// off stdin but didn't consume. In a TTY we get one byte per keypress
// and this stays empty. In a pipe (non-TTY demos / CI) Node delivers
// the entire input as one chunk; we match the first allowed char and
// stash the tail here so subsequent singleKey() calls see the rest.
let pendingChars = "";
let stdinClosed = false;

async function singleKey(prompt: string, allowed: string[]): Promise<string> {
  stdout.write(prompt);

  // Drain the pending buffer first. Walks char-by-char looking for the
  // first allowed match; anything before it gets dropped (newlines /
  // garbage that fell out of a previous chunk).
  const fromPending = consumeFromBuffer(allowed);
  if (fromPending !== null) {
    stdout.write(fromPending + "\n");
    return fromPending;
  }

  // If stdin already closed and the buffer didn't satisfy us, quit.
  if (stdinClosed) {
    stdout.write("q\n");
    return "q";
  }

  // Pipe / no-TTY drained → wait for live input from the TTY.
  const wasRaw = stdin.isRaw;
  if (typeof stdin.setRawMode === "function") stdin.setRawMode(true);
  stdin.resume();
  return await new Promise<string>((resolveP) => {
    const onData = (chunk: Buffer) => {
      pendingChars += chunk.toString("utf8");
      const matched = consumeFromBuffer(allowed);
      if (matched !== null) {
        cleanup();
        stdout.write(matched + "\n");
        resolveP(matched);
      }
      // Otherwise keep listening — the user might press a different key.
    };
    const onEnd = () => {
      stdinClosed = true;
      cleanup();
      stdout.write("q\n");
      resolveP("q");
    };
    const cleanup = () => {
      stdin.off("data", onData);
      stdin.off("end", onEnd);
      if (typeof stdin.setRawMode === "function") stdin.setRawMode(wasRaw);
      stdin.pause();
    };
    stdin.on("data", onData);
    stdin.on("end", onEnd);
  });
}

function consumeFromBuffer(allowed: string[]): string | null {
  while (pendingChars.length > 0) {
    const ch = pendingChars[0]!;
    pendingChars = pendingChars.slice(1);
    if (ch === "") return "q"; // Ctrl-C
    const lower = ch.toLowerCase();
    if (allowed.includes(lower)) return lower;
    // Non-allowed (newline / whitespace / garbage) — drop and continue.
  }
  return null;
}

async function readLine(prompt: string): Promise<string> {
  stdout.write(prompt);
  // Disable raw mode so the user can type and edit the line normally.
  if (typeof stdin.setRawMode === "function") stdin.setRawMode(false);
  stdin.resume();
  const readline = await import("node:readline/promises");
  const rl = readline.createInterface({ input: stdin, output: stdout });
  try {
    // The prompt is already written, so pass an empty one to question().
    const answer = await rl.question("");
    return answer.trim();
  } finally {
    rl.close();
    stdin.pause();
  }
}

// keeps tsconfig happy when the import isn't used elsewhere
void promisify;

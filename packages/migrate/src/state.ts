// IO for `.composoft-migrate/`. Three files live here:
//
//   analysis.json   — the analyzer's output, immutable after `analyze` runs.
//   state.json      — user decisions from the walkthrough; mutable.
//   history.json    — append-only log of every decision event.
//
// The schema lives in types.ts and is the contract the future block
// extractor + embeddable runtime read against. Adding fields is fine,
// renaming or removing requires a new alpha.

import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import type { Analysis, HistoryEvent, MigrationState } from "./types.js";

export const STATE_DIR = ".composoft-migrate";
export const ANALYSIS_FILE = "analysis.json";
export const ANALYSIS_MD_FILE = "analysis.md";
export const STATE_FILE = "state.json";
export const HISTORY_FILE = "history.json";

export function stateDirPath(codebasePath: string): string {
  return join(codebasePath, STATE_DIR);
}

export async function ensureStateDir(codebasePath: string): Promise<string> {
  const dir = stateDirPath(codebasePath);
  await mkdir(dir, { recursive: true });
  return dir;
}

export async function writeAnalysis(
  codebasePath: string,
  analysis: Analysis,
  markdown: string,
): Promise<{ jsonPath: string; mdPath: string }> {
  const dir = await ensureStateDir(codebasePath);
  const jsonPath = join(dir, ANALYSIS_FILE);
  const mdPath = join(dir, ANALYSIS_MD_FILE);
  await writeFile(jsonPath, JSON.stringify(analysis, null, 2) + "\n", "utf8");
  await writeFile(mdPath, markdown, "utf8");
  return { jsonPath, mdPath };
}

export async function readAnalysis(codebasePath: string): Promise<Analysis | null> {
  const jsonPath = join(stateDirPath(codebasePath), ANALYSIS_FILE);
  if (!existsSync(jsonPath)) return null;
  const raw = await readFile(jsonPath, "utf8");
  return JSON.parse(raw) as Analysis;
}

export async function readState(codebasePath: string): Promise<MigrationState | null> {
  const path = join(stateDirPath(codebasePath), STATE_FILE);
  if (!existsSync(path)) return null;
  const raw = await readFile(path, "utf8");
  return JSON.parse(raw) as MigrationState;
}

export async function writeState(
  codebasePath: string,
  state: MigrationState,
): Promise<void> {
  const dir = await ensureStateDir(codebasePath);
  state.lastUpdatedAt = new Date().toISOString();
  await writeFile(join(dir, STATE_FILE), JSON.stringify(state, null, 2) + "\n", "utf8");
}

export function makeFreshState(): MigrationState {
  const now = new Date().toISOString();
  return {
    startedAt: now,
    lastUpdatedAt: now,
    seedRegistryDecisions: {
      acceptedReads: [],
      rejectedReads: [],
      acceptedWrites: [],
      rejectedWrites: [],
    },
    blockExtractionQueue: { pending: [], skipped: [] },
    notes: [],
  };
}

/**
 * Move state.json + history.json out of the way to a timestamped sibling.
 * Used when the user chooses to start a fresh walkthrough — preserves the
 * prior state for audit / replay rather than blowing it away.
 */
export async function archivePreviousState(codebasePath: string): Promise<string | null> {
  const dir = stateDirPath(codebasePath);
  const sp = join(dir, STATE_FILE);
  if (!existsSync(sp)) return null;
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const archived = join(dir, `state-${stamp}.json`);
  await rename(sp, archived);
  const hp = join(dir, HISTORY_FILE);
  if (existsSync(hp)) {
    await rename(hp, join(dir, `history-${stamp}.json`));
  }
  return archived;
}

// --- history (append-only) -------------------------------------------------

export async function readHistory(codebasePath: string): Promise<HistoryEvent[]> {
  const path = join(stateDirPath(codebasePath), HISTORY_FILE);
  if (!existsSync(path)) return [];
  const raw = await readFile(path, "utf8");
  try {
    const parsed = JSON.parse(raw) as HistoryEvent[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function appendHistory(
  codebasePath: string,
  event: HistoryEvent["event"],
  payload: Record<string, unknown>,
): Promise<void> {
  await ensureStateDir(codebasePath);
  const path = join(stateDirPath(codebasePath), HISTORY_FILE);
  const events = await readHistory(codebasePath);
  events.push({
    timestamp: new Date().toISOString(),
    event,
    payload,
  });
  await writeFile(path, JSON.stringify(events, null, 2) + "\n", "utf8");
}

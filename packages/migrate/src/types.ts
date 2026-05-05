// Schema contract shared across the analyzer, the markdown renderer, the
// walkthrough, and any future tools that consume `.composoft-migrate/`
// (the block extractor, the embeddable runtime). Adding fields is fine.
// Removing or renaming requires a new alpha version — downstream tools
// are written against this exact shape.

export type Confidence = "high" | "medium" | "low";
export type Difficulty = "easy" | "medium" | "hard";

export type SourceLocation = {
  /** File path relative to the analyzed codebase root. */
  readonly file: string;
  readonly line: number;
  /** 1–3 lines of source for context — enough to read at a glance. */
  readonly snippet: string;
};

export type ReadCandidate = {
  /** Composer-style id: lowercase, dot-namespaced, kebab-case-leaf. */
  readonly suggestedAdapterId: string;
  readonly sourceLocations: SourceLocation[];
  readonly inferredParams: { name: string; tsType: string }[];
  /** Best-effort TS type for the return shape. May be "unknown". */
  readonly inferredReturnShape: string;
  readonly usageCount: number;
  readonly confidence: Confidence;
  readonly confidenceReason: string;
};

export type WriteCandidate = {
  readonly suggestedWorkflowId: string;
  readonly sourceLocations: SourceLocation[];
  readonly inferredInputShape: string;
  /** Strings like "POST /api/deals" or "navigation". */
  readonly inferredSideEffects: string[];
  readonly usageCount: number;
  readonly confidence: Confidence;
  readonly confidenceReason: string;
};

export type ComponentCandidate = {
  /** Path relative to the codebase root. */
  readonly componentPath: string;
  readonly componentName: string;
  readonly consumesReads: string[];
  readonly consumesWrites: string[];
  readonly hasLocalState: boolean;
  readonly hasComplexProps: boolean;
  readonly extractionDifficulty: Difficulty;
  readonly difficultyReasons: string[];
  readonly suggestedBlockId: string;
  /** Captured for the future block extractor — not surfaced in v0 UX. */
  readonly metadata?: {
    readonly locOfComponent?: number;
    readonly stateHookCount?: number;
    readonly propCount?: number;
  };
};

export type CodebaseShape = {
  readonly framework: "next.js" | "vite" | "cra" | "unknown";
  readonly reactVersion: string | null;
  readonly componentCount: number;
  readonly totalFiles: number;
};

export type Analysis = {
  readonly analyzedAt: string;
  readonly codebasePath: string;
  readonly codebaseShape: CodebaseShape;
  readonly readCandidates: ReadCandidate[];
  readonly writeCandidates: WriteCandidate[];
  readonly componentCandidates: ComponentCandidate[];
  /** Honest list of patterns the analyzer skipped, with reasons. */
  readonly limitations: string[];
};

// --- migration state -------------------------------------------------------

export type MigrationState = {
  readonly startedAt: string;
  lastUpdatedAt: string;
  readonly seedRegistryDecisions: {
    acceptedReads: string[];
    rejectedReads: string[];
    acceptedWrites: string[];
    rejectedWrites: string[];
  };
  readonly blockExtractionQueue: {
    pending: string[];
    skipped: string[];
  };
  readonly notes: string[];
};

export type HistoryEvent = {
  readonly timestamp: string;
  readonly event:
    | "walkthrough.started"
    | "walkthrough.resumed"
    | "walkthrough.archived"
    | "walkthrough.completed"
    | "walkthrough.quit"
    | "read.accepted"
    | "read.rejected"
    | "read.skipped"
    | "write.accepted"
    | "write.rejected"
    | "write.skipped"
    | "component.queued"
    | "component.skipped"
    | "component.deferred"
    | "note.added";
  readonly payload: Record<string, unknown>;
};

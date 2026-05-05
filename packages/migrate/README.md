# @composoft/migrate

Static analyzer + interactive walkthrough for adopting [composoft](https://github.com/githnm/composoft) in an existing React/Next.js codebase. v0 of the migration story.

> Status: alpha. Single-pass analysis, decision-driven walkthrough, state file that future tools (block extractor, embeddable runtime) read against.

## What it does

`composoft-migrate analyze <path>` walks an existing app, finds the most-used reads (potential adapters), most-used writes (potential workflows), and ranks every component by extraction difficulty (potential blocks). Output is two files in `<path>/.composoft-migrate/`:

- `analysis.json` — machine-readable, immutable after analyze runs
- `analysis.md` — human-readable report you can paste into a planning doc

`composoft-migrate walkthrough` reads the analysis and runs an interactive flow: one decision at a time, single-key shortcuts, every choice persisted to `state.json` with an append-only `history.json` audit. Quit any time, resume later.

`composoft-migrate status` prints what's been decided. Read-only.

## What it analyzes (v0)

The analyzer recognizes idiomatic React data-layer patterns:

- `useSWR("...")`, `useSWRImmutable`
- `useQuery({ queryKey, queryFn })` (React Query)
- `fetch("...", { method: "POST", body: JSON.stringify(...) })` inside async functions or hooks
- Function components in `app/`, `pages/`, `src/components/`, `lib/`, `hooks/` (or the project root if none of those exist)
- Component props (typed), local state (`useState`/`useReducer`/`useRef`), import graph

It explicitly does **not** analyze (and flags in `analysis.limitations[]`):

- Class components — convert to function components first, or open an issue if many remain
- Redux / Zustand state stores — selectors and actions are out of scope for v0
- Server actions (`"use server"`)
- GraphQL clients (Apollo, urql, Relay)
- Custom hooks deeper than two levels — readings through them may show as separate candidates
- Anything in `node_modules`

Honesty about limits is the point. The analyzer surfaces what it could and couldn't see; cold-user trust depends on knowing both.

## Use

```bash
npx @composoft/migrate@alpha analyze ./my-app
npx @composoft/migrate@alpha walkthrough ./my-app
npx @composoft/migrate@alpha status ./my-app
```

`--top N` controls how many read/write candidates the markdown report features (default 10):

```bash
npx @composoft/migrate@alpha analyze ./my-app --top 20
```

## What ends up in `.composoft-migrate/`

```
.composoft-migrate/
├── analysis.json       # raw analyzer output, immutable after analyze runs
├── analysis.md         # human-readable report, derived from analysis.json
├── state.json          # user decisions, mutable by walkthrough + future tools
└── history.json        # append-only log of every decision event with timestamps
```

The schemas (`Analysis`, `MigrationState`, `HistoryEvent`) live in [src/types.ts](src/types.ts) and are the contract future tools (the block extractor, the embeddable runtime) read against. Adding fields is fine; renaming or removing requires a new alpha.

## How decisions persist

Every interactive choice writes to `state.json` immediately and appends an event to `history.json`. Quit the walkthrough mid-phase and your decisions survive. The next run prompts to resume.

For sharing decisions with a teammate, commit `.composoft-migrate/` alongside your code. The state is small, plain JSON, and travels with git history.

## Walkthrough phases

**Phase 1a — reads.** For each adapter candidate (sorted by usage frequency), the walkthrough surfaces:

```
Read candidate: deals.list  (high confidence)
  Used in 2 call sites: src/components/DealsByStage.tsx, src/components/DealsList.tsx
  Params: { stage: string }
  Returns: Deal[]
  Why high: Used in 2 files with consistent params and a typed return shape.

Accept this as a seed adapter? [a]ccept / [r]eject / [s]kip / [n]ote / [q]uit
```

**Phase 1b — writes.** Same shape, against workflow candidates.

**Phase 2 — components.** For each component (easy → medium → hard):

```
Component: TicketDetail  (medium)
  File: src/components/TicketDetail.tsx
  Suggested block id: tickets.ticket-detail
  Consumes reads: tickets.by-id
  Consumes writes: tickets.reply
  Local state: yes
  Why medium: <100 LOC (34); 1 read + 1 write; 2 state hooks; simple props (1 field)

Queue for extraction? [q]ueue / [s]kip-permanently / [l]ater / [n]ote / [x]exit
```

`later` (the default if you haven't decided) leaves the component out of the queue but doesn't mark it skipped — the next walkthrough revisits.

## What's NOT in v0

- **Block extractor.** Consumes the state file's queue and produces refactored components. Future iteration.
- **Embeddable runtime.** Lets composoft blocks render inside an existing React app (gradual migration). Future iteration.
- **Redux / GraphQL / server-actions analysis.** v2.
- **Multi-language support.** Vue, Angular, etc. v2 or later.

If during analysis you find a pattern that would be useful to capture for the future extractor, the analyzer captures it as best-effort metadata in `analysis.json` (in `componentCandidates[].metadata`) but doesn't act on it. Future tools will consume it.

## Versioning

`0.1.0-alpha.x` is the v0 series. The schema in `src/types.ts` is the contract future tools (extractor, embeddable runtime) read against. Adding fields ships as a new alpha; renaming or removing requires a new alpha and a migration note.

## License

MIT. See [LICENSE](https://github.com/githnm/composoft/blob/main/LICENSE).

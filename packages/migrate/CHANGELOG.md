# Changelog

## 0.1.0-alpha.1

First public alpha of the migration tooling. Static codebase analyzer + interactive walkthrough. Foundation for future block extractor and embeddable runtime.

- `composoft-migrate analyze <path>` walks an existing React/Next.js codebase and produces `.composoft-migrate/analysis.json` (machine-readable) + `.composoft-migrate/analysis.md` (human-readable). Detects useSWR / useSWRImmutable / useQuery / non-GET fetch as read+write candidates; ranks function components by extraction difficulty (easy/medium/hard).
- `composoft-migrate walkthrough` runs an interactive decision-driven flow with single-key shortcuts. Persists every choice to `state.json` and an append-only `history.json` for audit/replay. Quit any time, resume later.
- `composoft-migrate status` prints what's been decided. Read-only.
- Honest limitations: class components, Redux selectors, server actions, GraphQL clients, and deep custom-hook chains are explicitly flagged in `analysis.limitations[]` rather than silently dropped.
- The schemas in `src/types.ts` (`Analysis`, `MigrationState`, `HistoryEvent`) are the contract future tools read against — the block extractor and embeddable runtime in subsequent alphas will consume `state.json` as their input.
- Six tests in `src/_test.ts` cover analyzer roundtrips against three test fixtures (simple-app, mixed-app, complex-app), markdown rendering, state file roundtrip, and history append-order.

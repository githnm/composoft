# Changelog

## 0.1.0-alpha.4

Fix Prisma type-import false positive surfaced in real-world testing on shadcn/taxonomy. State schema is unchanged.

Alpha.2 introduced a rule that excluded files importing from `@prisma/client` from candidate analysis. The rule was too broad: it caught files importing Prisma TYPES (e.g., `import { Post } from "@prisma/client"` for prop interfaces) and excluded them along with files actually performing server-side Prisma queries. This was THE root cause of the alpha.2 + alpha.3 regressions where feature components like `Editor`, `PostOperations`, `UserNameForm`, `PostItem`, `UserAvatar` and three writes (`posts.update`, `posts.delete`, `users.update`) were invisible in taxonomy's analysis output.

Alpha.4 distinguishes type-only imports from runtime usage. A file is treated as server-side Prisma only if it both imports a runtime symbol AND contains a `prisma.<model>.<method>(...)` call (or `new PrismaClient(...)`). The runtime-position check walks each import binding's references via ts-morph's symbol resolver — `import { Post }` used only inside `interface Props { post: Post }` is correctly classified as type-only.

Net effect: feature components that import Prisma types for typed props now appear in candidate analysis as expected. Their fetch calls (typically writes to API routes) appear as workflow candidates. Real server-side Prisma files (`new PrismaClient()` + model calls) are still excluded and flagged in `limitations[]`.

Also: complexity-signal and state-hook detection now matches `React.useX` namespaced calls in addition to bare identifiers. Real codebases mix `import { useRef } from "react"` with `import * as React from "react"` + `React.useRef`; alpha.2 only saw the former. State hook counts and `useRef`/`useEffect`/`useState` complexity bumps now register either way.

## 0.1.0-alpha.3

Two regression fixes from continued real-world testing on shadcn/taxonomy. State schema is unchanged; adopters who ran alpha.2 can re-run `analyze` against alpha.3 without losing walkthrough decisions in `state.json` / `history.json`.

- **Lock in template-literal URL parsing.** alpha.2 was supposed to handle `fetch(\`/api/posts/${id}\`, { method: "PATCH" })` but real-world testing found the contract was implicit and easy to regress. This release pins down the URL→id derivation for every template-literal write shape we expect adopters to hit: `PATCH ${id}` → `posts.update`, `DELETE ${postId}` → `posts.delete`, `PATCH /api/users/${user.id}` → `users.update`, `POST /api/users/${id}/stripe` → `users.stripe`. Tagged templates (`` sql`/api/posts` ``) still drop into the low-confidence `external.unparsable-url` bucket.
- **Name-pattern safety net for the primitive filter.** alpha.2's behavioral primitive filter (zero data, no state, 3+ importers, <100 LOC) can fire on a real feature component when upstream detection misses its data layer — URL parser bails on an exotic shape, fetch is hidden behind a custom hook, the read happens in a parent. Component names matching `KNOWN_FEATURE_PATTERNS` (`Editor`, `*Form`, `*Detail`, `*List`, `*Page`, `*Operations`, `*Layout`, `Settings*`, `Profile*`, `Sidebar*`) are now never filtered as primitives, regardless of structural signals. False-negatives (a `Badge` slipping through) are far cheaper than false-positives (silently dropping an `Editor`).

## 0.1.0-alpha.2

Analyzer correctness fixes from real-world testing on shadcn/taxonomy.

- **Skip `new URL(..., import.meta.url)` bundler asset references.** alpha.1 wrongly flagged these as data fetches and produced unusable adapter ids. Detection now follows identifiers to their declaration in the same file, so both `fetch(new URL(...))` and `const url = new URL(...); fetch(url);` are skipped.
- **Derive sensible adapter ids from fetch URL paths instead of using URL strings verbatim.** `fetch("/api/posts")` → `posts.list`, `fetch("/api/posts/${id}")` → `posts.by-id`, `fetch("https://api.github.com/repos/shadcn/taxonomy")` → `github.repos`. URLs that don't yield a clean id are rolled up into a single low-confidence `external.unparsable-url` candidate so the FDE sees them but isn't pushed to extract them.
- **Behavioral UI-primitive detection.** Components with zero data, no local state, 3+ importers, and <100 LOC are excluded from extraction candidates. The count surfaces in `analysis.skippedAsPrimitives` and the markdown report as a deliberate-skip note. Generalizes to any `components/ui/`, `components/primitives/`, or scattered layout — no path hardcoding.
- **Tighter complexity signals.** `useRef`, `useEffect`, `useLayoutEffect`, `useImperativeHandle`, `useSession`, `useUser`, `usePathname`, `useSearchParams`, `useRouter`, `useParams`, `useCallback`/`useMemo` with deps>1, and unknown custom hooks all bump component difficulty by one level (easy→medium, medium→hard). Surfaced in `metadata.detectedComplexitySignals` and in the markdown's `difficultyReasons`. Editor-shaped components (refs + effects + auth + writes) no longer slip into "easy".
- **Honest limitations for Next.js 13+ patterns.** Analyzer now flags Prisma calls, server actions (`"use server"`), async server components in `app/`, and `next/headers` cookies/headers reads as separate categorized entries in `limitations[]`. Each entry lists the first 5 affected files (with a count for the rest) so the FDE can see exactly what was skipped.

State schema is unchanged. Adopters who ran alpha.1 can re-run `analyze` against alpha.2 without losing walkthrough decisions in `state.json` / `history.json`.

## 0.1.0-alpha.1

First public alpha of the migration tooling. Static codebase analyzer + interactive walkthrough. Foundation for future block extractor and embeddable runtime.

- `composoft-migrate analyze <path>` walks an existing React/Next.js codebase and produces `.composoft-migrate/analysis.json` (machine-readable) + `.composoft-migrate/analysis.md` (human-readable). Detects useSWR / useSWRImmutable / useQuery / non-GET fetch as read+write candidates; ranks function components by extraction difficulty (easy/medium/hard).
- `composoft-migrate walkthrough` runs an interactive decision-driven flow with single-key shortcuts. Persists every choice to `state.json` and an append-only `history.json` for audit/replay. Quit any time, resume later.
- `composoft-migrate status` prints what's been decided. Read-only.
- Honest limitations: class components, Redux selectors, server actions, GraphQL clients, and deep custom-hook chains are explicitly flagged in `analysis.limitations[]` rather than silently dropped.
- The schemas in `src/types.ts` (`Analysis`, `MigrationState`, `HistoryEvent`) are the contract future tools read against — the block extractor and embeddable runtime in subsequent alphas will consume `state.json` as their input.
- Six tests in `src/_test.ts` cover analyzer roundtrips against three test fixtures (simple-app, mixed-app, complex-app), markdown rendering, state file roundtrip, and history append-order.

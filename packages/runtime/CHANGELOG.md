# Changelog

## 0.1.0-alpha.4

`from-page-state` sources now auto-skip when the resolved value is `null` (previously only `undefined` triggered the skip). Block data slots receive `null` in this case, and components must render a graceful empty state.

The fix matters because composer-emitted `initialState` JSON typically uses explicit `null` for unset selections — JSON has no `undefined`. Pre-fix, an `initialState: { selection: { ticketId: null } }` would slip through the auto-skip check, the runtime would feed `null` into the adapter's params object, and the adapter's Zod schema would reject it with `Expected string, received null`. Adopters whose composer emitted null seed values hit a 500 on first render with no clue why. Aligns runtime semantics with the documented contract: page-state slots resolve to `null` when no selection is present, regardless of how that "no selection" is spelled in the underlying state.

`resolveDataSlots`, `resolveOneSlot`, and the action prefill path all share the same `isMissing(value)` helper. New tests cover null leaf, null branch, and `resolveOneSlot` round-trip.

## 0.1.0-alpha.3

Version bump for sync with composer 0.1.0-alpha.3 (shadcn chrome). No code changes.

## 0.1.0-alpha.2

- `CompositionPage` now accepts optional `title` and `subtitle` strings. The runtime ignores them; the composer emits and the generated app's chrome renders them as page headers. Compositions emitted by older composers (without these fields) continue to validate.
- Version bump to track `@composoft/composer` 0.1.0-alpha.2 — the composer pins runtime to its own version, so all four published packages move together.

## 0.1.0-alpha.1

Version bump for sync with composer 0.1.0-alpha.1. No code changes.

## 0.1.0-alpha.0

Initial alpha release.

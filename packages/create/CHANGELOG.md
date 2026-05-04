# Changelog

## 0.1.0-alpha.4

Added `--template <name>` flag with three working domain templates: `support` (Pylon-shaped B2B support inbox with multi-channel tickets and account context), `booking` (Calendly-shaped scheduling with event types, hosts, and bookings), and `operations` (inventory + procurement: products, stock levels, purchase orders). The TODO baseline remains as a fourth template option for minimal scaffolding.

- New CLI flag `--template <name>` skips the interactive picker. Unknown values fail with the available list. `--yes` without `--template` defaults to `todo` to preserve backward compat.
- Interactive picker (no flags) shows all four templates with one-line descriptions next to the names.
- Templates live at `packages/create/template/<id>/` with a `manifest.json` declaring display name, description, domain, and adapter/workflow/block counts. The CLI reads each manifest at startup to populate the picker.
- `support`: 8 adapters, 5 workflows, 6 blocks. 10 enterprise accounts ($12k–$250k ARR), 25 tickets across statuses, 6 agents (2 engineers for escalations), conversation threads, 8 macros. Page-state coordination wired between ticket-queue (writes selection.ticketId), ticket-detail (reads it), and account-context (reads selection.accountId).
- `booking`: 7 adapters, 3 workflows, 5 blocks. 3 hosts, 5 event types, 12 bookings, 10 customers. Page-state coordination on selection.bookingId.
- `operations`: 8 adapters, 4 workflows, 5 blocks. 15 products, 5 vendors, 3 locations, 8 purchase orders. Page-state coordination on selection.productId and selection.poId.
- `.template` is now the canonical going-forward suffix for variable substitution; `.tmpl` still works for back-compat with templates already on disk. Variables: `{{packageName}}`, `{{registryName}}`, `{{registryVersion}}`, plus the existing `{{packageNameSafe}}`, `{{dirName}}`, `{{domain}}`, `{{year}}`.
- New test `pnpm --filter @composoft/create test` walks every template, confirms manifest counts match the on-disk file counts (adapters / workflows / block manifests), and renders each template into a tmpdir to confirm no `{{key}}` placeholders or `.template`/`.tmpl` files survive.

## 0.1.0-alpha.3

Version bump for sync with composer 0.1.0-alpha.3. Template's `@composoft/spec` dep bumped to `^0.1.0-alpha.3`. No other code changes.

## 0.1.0-alpha.2

Version bump to track the rest of the alpha series. Template's `@composoft/spec` dep bumped to `^0.1.0-alpha.2` so newly-scaffolded registries pick up the new `ProductInfo` types. No other code changes.

## 0.1.0-alpha.1

Version bump for sync with composer 0.1.0-alpha.1. Template's `@composoft/spec` dep bumped to `^0.1.0-alpha.1` so newly-scaffolded registries pin to the matching alpha. No other code changes.

## 0.1.0-alpha.0

Initial alpha release.

# Changelog

## 0.1.0-alpha.7

Three cold-user fixes against alpha.6.

- **`messages.send` no longer crashes for unregistered users.** The workflow used to call `db.conversations.addMessage` with the caller's userId and the data layer threw `agent not found: demo-user` when the id wasn't seeded. The fix lifts agent resolution into the workflow itself: known agent ids resolve to the agent's name and `fromAgent: true`; unknown ids (including the runtime's default `demo-user`) accept the userId verbatim as `fromName` with `fromAgent: false`. Demos work without per-environment agent seeding; production setups that wire `X-Composoft-User` to a real agent id keep their attribution. The input schema's `body` field also gains `.trim().min(1, "reply body cannot be empty")` so empty replies fail with a clear, copy-friendly message.
- **Visual polish across all six support blocks.** Plain-Tailwind classes (no shadcn imports) using shadcn token names so they resolve correctly when the registry is consumed by a generated app. ticket-queue: status as a colored dot + label, hover/select states, channel SVG dots, weighted priority text, left-edge accent bar on the selected row. ticket-detail: serif subject heading, account name pill, status-dot row, conversation thread with avatars and accent-bordered cards (left-bordered primary for agents, neutral for requesters), composer with macro dropdown and primary-styled Send button, action buttons grouped above the composer. account-context: serif name, plan-colored pill (gray/blue/violet for starter/growth/enterprise), 2x2 stat grid with health bar, account-manager avatar+name. kpi-row: card per metric with big tabular-nums number, uppercase muted label, top accent bar when SLA-at-risk > 0. recent-activity: timeline rail with channel-colored dots and status-toned text. agent-workload: avatar + role pill + workload bar that turns red at capacity.
- **README sample brief now requests every page in `product.navigation`** so cold-test apps don't 404 on Tickets / Accounts / Agents links. Added a "Navigation vs pages" section explaining the relationship as a known limitation, with workarounds (request all paths in your brief, or trim `product.navigation` before composing).
- **Booking polish:** event-type-grid duration as a pill; calendar-view bookings prefix a status-colored dot.
- **Operations polish:** product-table stock indicator as a colored dot + status text; po-list status pills with semantic colors and dark-mode variants.

Every component still starts with `"use client"` (verified by the catalog and template-level `_test.ts` validators).

## 0.1.0-alpha.6

Fixes a cold-user resolve-route 500 in the support template surfaced on alpha.5.

- Fixed `support/blocks/ticket-queue.component.tsx` to call its page-state writer with the leaf string (`writes.selectTicket(t.id)`) instead of a wrapper object (`writes.selectTicket({ ticketId: t.id })`). The writer is bound to path `selection.ticketId` in the manifest; passing an object placed `{ ticketId: "tkt_001" }` AT that path, so downstream readers received the object and the adapter's Zod parse failed with `Expected string, received object`.
- Updated `support/blocks/ticket-queue-types.ts` to declare `PageStateWriter<string>` instead of `PageStateWriter<{ ticketId: string }>`. The previous type was internally consistent with the wrong call shape — TypeScript happily compiled both, the bug surfaced only at runtime.
- Audited every other `writes`-using block in templates (booking, operations) and example registries (registry-example-crm, registry-example-postgres). All of them already pass the leaf value correctly. Only the support template's ticket-queue had the misalignment.

## 0.1.0-alpha.5

Fixes a cold-user RSC-boundary issue surfaced on alpha.4 against the support template.

- Added `"use client"` as the first line of four block components that were missing it: `support/blocks/kpi-row.component.tsx`, `support/blocks/agent-workload.component.tsx`, `support/blocks/recent-activity.component.tsx`, and `operations/blocks/inv-kpi-row.component.tsx`. composoft passes block components through the React Server Component boundary as values, so every block component must be a Client Component regardless of whether it uses hooks. The previous omissions caused `next dev` to fail with a misleading "Functions cannot be passed directly to Client Components" error.
- New validator in every template's `_test.ts`: walks `src/blocks/*.component.tsx` and fails the test loud if any file's first line isn't the `"use client"` directive. Catches the issue at registry-test time rather than in the generated app's `next dev`. Failure message: `block component file <path> must start with "use client". composoft block components are passed through the RSC boundary and must be Client Components.`
- The validator is duplicated across the four templates (todo, support, booking, operations) per design discussion — keeping the helper inline avoids an extra package and lets adopters who scaffold a registry get the check for free, without needing to install a separate `@composoft/test-utils`.

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

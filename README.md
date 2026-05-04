# composoft

Per-customer software for AI-native B2B companies, generated from a brief.

> Alpha. Real but rough. Things will change.

## What this is

If you build B2B software, your customers want it tailored. Different layouts, different fields, different workflows. The way you solve this today is FDEs. Engineers who fork your main app per customer and hand-edit React for weeks.

composoft replaces hand-edits with composition. You define a typed library of blocks once. Customers get apps generated from natural-language briefs. The library compounds. The bottleneck moves from "FDE time per customer" to "registry expressiveness." A team of 10 can serve 200 customers instead of 30.

## demo

https://youtu.be/b-6pQLeG_Ak?si=hTDwu-xzf5N28hCY

Same registry. Two customer briefs. Two genuinely different apps.

Roastery is a small DTC coffee roaster with one warehouse. Their brief asks for one page: KPIs, low-stock alerts, and a product table. No procurement, no vendors, no approvals.

```
Inventory dashboard for Roastery, a small DTC coffee roaster.
Roastery operates one warehouse where they roast and ship from.
Home page (Overview) is the only page they need:

KPI row: total SKUs, units in stock, low stock count, total value
Low-stock alerts showing what to reorder
Product table with current stock levels

Skip everything procurement-related: vendors, purchase orders, approvals.
```

One command:

```bash
npx @composoft/composer@alpha compose \
  --brief brief-roastery.md \
  --registry ./cargo-registry \
  --customer Roastery \
  --out apps/roastery
```

<img width="832" height="467" alt="image" src="https://github.com/user-attachments/assets/39f6b382-ed96-497d-ba32-c117359417f3" />


Meridian Brands is a multi-brand consumer goods company with three warehouses, 50+ vendors, formal procurement workflows, and dedicated approval flows. Same registry, completely different brief.

```
Operations dashboard for Meridian Brands.
Meridian operates three warehouses with 50+ vendors and formal procurement.
Overview page: executive view with inventory + procurement KPIs.
Inventory page: product table, click to see per-location stock and transfer actions.
Procurement page: PO list, click to approve or receive.
Approvals page: dedicated approval workflow.
```

<img width="834" height="470" alt="image" src="https://github.com/user-attachments/assets/d61421b3-a4b2-4864-81af-4c5e811fbd6f" />


That's the whole pitch. One registry. One engineering team. Many customer apps, each shaped by what that customer actually does.

The composer also surfaces what it couldn't build. If your brief asks for something the registry doesn't support, you get a model note saying so — not a fake button that doesn't work. The framework knows what it can't do, and tells you.

## Templates

`@composoft/create` ships with four working domain templates:

```bash
npx @composoft/create my-support --template support
npx @composoft/create my-booking --template booking
npx @composoft/create my-ops --template operations
npx @composoft/create my-todo --template todo
```

Or run interactively to pick:

```bash
npx @composoft/create my-registry
```

| Template | Domain | Counts | Highlights |
|---|---|---|---|
| `support` | Modern B2B customer support | 8 adapters, 5 workflows, 6 blocks | Multi-channel ticket queue, account context, escalation, macros |
| `booking` | Calendly-shaped scheduling | 7 adapters, 3 workflows, 5 blocks | Event types, calendar view, booking detail sidebar |
| `operations` | Inventory + procurement | 8 adapters, 4 workflows, 5 blocks | Product table, stock levels, PO list + approval flow |
| `todo` | Minimal baseline | 1/1/1 | Starting point — three primitives, no domain bias |

Each template ships realistic seed data, working manifests, and a sample brief in its README. Run `pnpm install && pnpm test` to confirm the template builds, then compose against it with the composer.

## Install and try it

Scaffold a new registry:

```bash
npx @composoft/create@alpha my-registry
cd my-registry
pnpm install
pnpm test
```

The scaffolder generates a working in-memory registry. Pass `--template <name>` to start from a domain-specific baseline (support / booking / operations) instead of the minimal todo skeleton.

To run the composer against your registry:

```bash
pnpm add -D @composoft/composer@alpha
export ANTHROPIC_API_KEY=sk-ant-...
npx @composoft/composer@alpha compose \
  --brief brief.md \
  --registry ./my-registry \
  --customer "FirstCustomer" \
  --out apps/first-customer
```

The output is a Next.js 15 app with full chrome (shadcn navbar, sidebar, page headers), pointed at your registry. Run it with `pnpm dev`.

## Try the reference examples

The repo includes two reference registries you can run end-to-end:

**`registry-example-crm`** — in-memory CRM with leads, deals, contacts. No database setup required. Used to demonstrate the per-customer-tailoring story.

```bash
pnpm install
pnpm --filter @composoft/composer compose:northwind
pnpm --filter @composoft/composer compose:acme
pnpm --filter <generated-name> dev
```

**`registry-example-postgres`** — production-grade Postgres example with audit logging, real persistence, page-state coordination. Requires a Postgres connection string.

```bash
export DATABASE_URL=postgres://...
export ANTHROPIC_API_KEY=sk-ant-...
pnpm --filter @composoft/registry-example-postgres seed
pnpm --filter @composoft/composer compose:brewline
```

## Inspect across customers

After you've generated a few apps, the framework remembers what it built and what it couldn't build. Run `composoft inspect` from your workspace root.

```bash
$ npx @composoft/composer@alpha inspect
CUSTOMER         BRIEF              PAGES  BLOCKS  NOTES  GENERATED
Meridian Brands  brief-meridian.md  4      9       4      2026-05-04
Roastery         brief-roastery.md  1      3       4      2026-05-04
```

The default view lists every customer app generated in your workspace. Each row reads from a `.composoft-meta.json` sidecar that the composer writes next to every generated app.

To see which gaps customers asked for most often:

```bash
$ npx @composoft/composer@alpha inspect --gaps
GAPS FLAGGED ACROSS 2 CUSTOMERS

2x  No dedicated approvals block in the registry
     Asked in: Meridian Brands, Haldermann & Sons

1x  No stock-movement feed block exists in the registry
     Asked in: Meridian Brands
```

This is the FDE meta-view. With one customer, gaps are noise. With ten, they cluster. The blocks and adapters that show up most often are your registry roadmap, sourced from real customer asks.

For full detail on one customer:

```bash
$ npx @composoft/composer@alpha inspect Roastery
Customer:        Roastery
Brief:           brief-roastery.md
Generated:       2026-05-04T14:23:11Z
Registry:        cargo-registry@0.0.1
Pages (1):
  /              3 blocks
Model notes (4):
  1. ...
```

The framework turns from a one-shot generator into a record of what your customers want.

## The four primitives

**Adapter.** A typed read. Takes params, returns rows. Wraps a database query, an API call, or a calculation.

```ts
defineAdapter({
  id: "deals.list",
  params: z.object({ stage: z.string().optional() }),
  output: z.array(dealSchema),
  run: async ({ stage }) => db.deals.list({ stage }),
});
```

**Workflow.** A typed write. Takes input, performs side effects, returns output.

```ts
defineWorkflow({
  id: "deals.move-stage",
  input: z.object({ dealId: z.string(), stage: z.string() }),
  output: z.object({ dealId: z.string(), stage: z.string() }),
  run: async ({ dealId, stage }, context) => {
    await db.deals.update(dealId, { stage });
    return { dealId, stage };
  },
});
```

**Block.** A React component plus its data needs and action surface. The unit of UI composition.

```ts
defineBlock({
  id: "deals.pipeline",
  config: z.object({ defaultStage: z.string() }),
  data: {
    deals: {
      adapter: "deals.list",
      params: { stage: { kind: "from-config", path: "defaultStage" } },
    },
  },
  actions: { moveStage: { workflow: "deals.move-stage" } },
  writes: { selectedDealId: { kind: "page-state", path: "selection.dealId" } },
  component: DealPipeline,
});
```

**Registry.** A versioned npm package that exports adapters, workflows, blocks, plus optional product info (branding, navigation), reference data, and auth hooks.

## What's shipped

- Three primitives (adapters, workflows, blocks) with typed manifests.
- A composer CLI that turns briefs into Next.js 15 apps using Claude.
- A runtime that resolves data, binds actions, hosts page state. Auto-skips null/undefined values from page state cleanly, so first-render and pre-selection states render an empty state instead of crashing.
- Cross-block coordination via shared page state. Click in one block, another updates.
- Composer-time nav filtering: generated apps never ship orphan navigation links. If your brief skips a page, the sidebar drops the matching nav item automatically.
- Honest gap reporting. The composer tells you what your brief asked for that the registry can't satisfy, in plain text, before the app ships.
- Per-app metadata sidecar + `composoft inspect`. Workspace-level visibility into briefs, pages, and gap patterns across every customer.
- Auth hooks: registries declare `authenticate` and `authorize`, runtime enforces them.
- Reference data: registries publish their canonical ids so the composer doesn't hallucinate them.
- Product branding and navigation: registries declare `product.name`, `product.navigation`, `product.accentColor`. Generated apps inherit consistent chrome.
- Per-customer branding via `--customer` flag.
- shadcn-based generated apps. Full shadcn library vendored into every generated app's `components/ui/`.
- Four domain templates in `@composoft/create`: todo, support, booking, operations. Each ships seed data, working manifests, and a sample brief.
- Two reference registries (in-memory CRM and Postgres-backed operations).
- A scaffolder for new registries.

## What's missing

- Block-level permissions (today, all auth lives in the registry's `authorize` function).
- Workflow-level customization from briefs. The composer can route which workflow appears on which block, but can't generate new workflow logic. Workflow code stays registry-author territory.
- Multi-region layouts beyond main + sidebar.
- Hosted runtime (today, you deploy the generated app yourself).
- Per-customer theming beyond accent color.
- Migration assistant for porting existing components into a registry.
- Typed page-state and context schemas.
- Base composition + brief-as-overlay (today, every brief generates a full app from scratch).
- Agent-assisted registry extension: an agent writes candidate adapters and blocks for FDE review, sourcing from the gaps `inspect` surfaces. On the roadmap.

## Architecture

Four published packages, two reference registries, multiple example apps.

**`@composoft/spec`** — manifest types and validators. Defines what a block is, what an adapter is, what a workflow is. Zero runtime dependencies.

**`@composoft/runtime`** — resolves data slots, binds actions, manages page state, gates auth. React Server Components plus a client renderer.

**`@composoft/composer`** — CLI that calls Claude. Reads your registry, reads a brief, writes a composition, generates a Next.js 15 app with shadcn-styled chrome. Persists per-app metadata, surfaces workspace-wide patterns via `inspect`.

**`@composoft/create`** — `npx @composoft/create my-registry` scaffolds a new registry from one of four templates.

In the repo:

**`registry-example-crm`** — reference CRM registry (leads, deals, contacts, activities, reps). In-memory, no database required.

**`registry-example-postgres`** — reference operations registry (inventory, vendors, POs). Postgres-backed with audit logging and real persistence.

**`packages/examples/*`** — working example apps generated from briefs. Each app is a real Next.js 15 project anyone can clone, run, and modify.

## Companies this could fit

Concrete examples of the shape composoft is built for. Not every team here is using composoft. These are the kinds of companies whose engineering structure makes the framework worth considering.

### AI-native CRM

A company building a CRM for AI-augmented sales teams. Each enterprise customer wants their pipeline laid out differently. Today: 2 FDEs hand-build per-customer dashboards over 2-3 weeks each. With composoft: registry with blocks like `deal-pipeline`, `contact-list`, `activity-feed`. FDE writes a brief per customer, runs the composer, ships in a day.

### AI-native ERP for consumer brands

A company replacing NetSuite for mid-market DTC brands. Every brand has their own warehouses, vendor relationships, ops processes. Today: 3 FDEs configuring NetSuite-style admin panels. With composoft: registry with blocks like `inventory-table`, `po-list`, `low-stock-alerts`. Each customer gets an ops dashboard tuned to their workflow.

### AI-native customer support

A company building support tooling that drafts responses and surfaces context. Every customer's support org has different escalation rules and channel mixes. With composoft: registry with blocks like `ticket-queue`, `conversation-view`, `agent-handoff-panel`. Each customer's support workspace matches their org.

### What these companies share

Three things, in order of importance.

**FDE motion.** They have engineers whose entire job is configuring software per customer. composoft is leverage on that bottleneck.

**Shared backend, varying UI.** All customers point at the same APIs, same data models, same workflows. Only the interface varies.

**Customers that expect tailoring.** Their buyers don't want a generic interface. Tailoring is part of the product.

If your company has all three, composoft is worth a serious look. If you have one or two, the framework still helps but the ROI is smaller.

If your company has none of these (Salesforce-shaped enterprise SaaS with admin panels, vertical SaaS shipping one product to all customers, internal tools at a non-software company), the framework is probably not the right tool. Other tools fit your shape better.

## Status

Alpha. Things will change. Adopters should expect to update their registries when the spec evolves.

Current versions:
- `@composoft/spec` 0.1.0-alpha.3
- `@composoft/runtime` 0.1.0-alpha.4
- `@composoft/composer` 0.1.0-alpha.5
- `@composoft/create` 0.1.0-alpha.8

## License

MIT. Copyright Hoshang Mehta.

Built by [@githnm](https://github.com/githnm). Issues and PRs welcome.

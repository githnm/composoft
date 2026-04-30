# composoft

Per-customer software for AI-native B2B companies, generated from a brief.

> Alpha. Real but rough. Things will change.

## What this is

If you build B2B software, your customers want it tailored. Different layouts, different fields, different workflows. The way you solve this today is FDEs. Engineers who fork your main app per customer and hand-edit React for weeks.

composoft replaces hand-edits with composition. You define a typed library of blocks once. Customers get apps generated from natural-language briefs. The library compounds. The bottleneck moves from "FDE time per customer" to "registry expressiveness." A team of 10 can serve 200 customers instead of 30.

## demo


A customer brief, in plain English:

```
Sales dashboard for Northwind, a B2B SaaS company.
Northwind sells enterprise software with 6-month sales cycles. Reps focus on
champion identification and MEDDIC qualification.
Home page (Pipeline) shows: deal pipeline kanban, activity feed, rep leaderboard
on the right sidebar. Clicking a deal opens a detail view in a sidebar.
Leads page shows the lead list with default filter "qualified", with a
"Convert to deal" button on each row.
```
One command:

```bash
pnpm --filter @composoft/composer compose:northwind
```

30 seconds later: a working Next.js 15 app with shadcn-styled UI, real cross-block coordination, real auth hooks, real persistence. Pointing at the customer's data.

<img width="1462" height="914" alt="image" src="https://github.com/user-attachments/assets/71578873-1cb5-4d7e-8d91-5234319c6b89" />


The same registry, with a different brief, produces a totally different app:

<img width="1465" height="919" alt="image" src="https://github.com/user-attachments/assets/6f1eb608-e180-4ebd-a483-a44de1a69af6" />


Acme runs round-robin lead assignment. Different brief produced lead-list-led layout, no kanban on home, no leaderboard. Same registry, same backend, fundamentally different surface.

That's the whole pitch. One library, one engineering team, many customer apps, each tailored to how that customer actually works.

## Install and try it

Scaffold a new registry:

```bash
npx @composoft/create@alpha my-registry
cd my-registry
pnpm install
pnpm test
```

The scaffolder generates a working in-memory registry with one adapter, one workflow, one block. Modify it to fit your domain.

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
- A runtime that resolves data, binds actions, hosts page state.
- Cross-block coordination via shared page state. Click in one block, another updates.
- Auth hooks: registries declare `authenticate` and `authorize`, runtime enforces them.
- Reference data: registries publish their canonical ids so the composer doesn't hallucinate them.
- Product branding and navigation: registries declare `product.name`, `product.navigation`, `product.accentColor`. Generated apps inherit consistent chrome.
- Per-customer branding via `--customer` flag.
- shadcn-based generated apps. Full shadcn library vendored into every generated app's `components/ui/`.
- Two reference registries (in-memory CRM and Postgres-backed operations).
- A scaffolder for new registries.

## What's missing

- Block-level permissions (today, all auth lives in the registry's `authorize` function).
- Multi-region layouts beyond main + sidebar.
- Hosted runtime (today, you deploy the generated app yourself).
- Per-customer theming beyond accent color.
- Starter registries for specific domains beyond CRM and operations (support, scheduling, finance).
- Migration assistant for porting existing components into a registry.
- Typed page-state and context schemas.
- Base composition + brief-as-overlay (today, every brief generates a full app from scratch).

These are real gaps. Some matter more than others depending on what you're building. Open issues if you hit one.

## Architecture

Four published packages, two reference registries, multiple example apps.

**`@composoft/spec`** — manifest types and validators. Defines what a block is, what an adapter is, what a workflow is. Zero runtime dependencies.

**`@composoft/runtime`** — resolves data slots, binds actions, manages page state, gates auth. React Server Components plus a client renderer.

**`@composoft/composer`** — CLI that calls Claude. Reads your registry, reads a brief, writes a composition, generates a Next.js 15 app with shadcn-styled chrome.

**`@composoft/create`** — `npx @composoft/create my-registry` scaffolds a new registry.

In the repo:

**`registry-example-crm`** — reference CRM registry (leads, deals, contacts, activities, reps). In-memory, no database required.

**`registry-example-postgres`** — reference operations registry (inventory, vendors, POs). Postgres-backed with audit logging and real persistence.

**`packages/examples/*`** — three working example apps generated from briefs (Northwind, Acme, Brewline). Each app is a real Next.js 15 project anyone can clone, run, and modify.

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

Alpha. The spec is at `0.1.0-alpha.3`. Things will change. Adopters should expect to update their registries when the spec evolves.

## License

MIT. Copyright Hoshang Mehta.

Built by [@githnm](https://github.com/githnm). Issues and PRs welcome.

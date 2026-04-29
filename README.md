# composoft

Per-customer software for AI-native B2B companies, generated from a brief.

> Alpha. Real but rough. Things will change.

## What this is

If you build B2B software, your customers want it tailored. Different layouts, different fields, different workflows. The way you solve this today is FDEs. Engineers who fork your main app per customer and hand-edit React for weeks.

composoft replaces hand-edits with composition. You define a typed library of blocks once. Customers get apps generated from natural-language briefs.

The library compounds. The bottleneck moves from "FDE time per customer" to "registry expressiveness." A team of 10 can serve 200 customers instead of 30.

## A 30-second demo

A customer brief/prompt, in plain English:

```
Inventory dashboard for Brewline Coffee.

Show KPI cards at top: total SKUs, items below reorder, open POs, total open spend.
Below that, low-stock alerts grouped by vendor with one-click PO creation.
Below that, full inventory table with adjust-stock action.
Scope everything to the Oakland Roastery warehouse.

Separate page for purchase orders, defaulting to draft status.
PO detail page shows line items, vendor sidebar, approve and receive actions.
```

One command:

```bash
npx @composoft/composer compose \
  --brief brewline.md \
  --registry @your-org/registry \
  --out apps/brewline
```

30 seconds later, a working Next.js app pointed at the customer's database.

Click an inventory row, sidebar updates with item details. Click adjust on a row, change a quantity, refresh, persisted. Click approve on a PO, audit log records the real user. No page reloads, no stale data.

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
npx @composoft/composer compose \
  --brief brief.md \
  --registry my-registry \
  --out ../app
```

## The four primitives

### Adapter

A typed read. Takes params, returns rows. Wraps a database query, an API call, a calculation.

```ts
defineAdapter({
  id: "deals.list",
  params: z.object({ stage: z.string().optional() }),
  output: z.array(dealSchema),
  run: async ({ stage }) => db.deals.list({ stage }),
});
```

### Workflow

A typed write. Takes input, performs side effects, returns output.

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

### Block

A React component plus its data needs and action surface. The unit of UI composition.

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
  actions: {
    moveStage: { workflow: "deals.move-stage" },
  },
  component: DealPipeline,
});
```

### Registry

A versioned collection of adapters, workflows, and blocks. Owned by your engineering team. Shipped as an npm package. Used by your composer to generate apps.

## What's shipped

- Three primitives (adapters, workflows, blocks) with typed manifests.
- A composer CLI that turns briefs into Next.js apps using Claude.
- A runtime that resolves data, binds actions, hosts page state.
- Cross-block coordination via shared page state. Click in one block, another updates.
- Auth hooks: registries declare `authenticate` and `authorize`, runtime enforces them on every action and resolve.
- Reference data: registries publish their canonical ids so the composer doesn't hallucinate them.
- A scaffolder for new registries.
- A reference implementation against Postgres with real persistence and audit logging.

## What's missing

- Block-level permissions (today, all auth lives in the registry's `authorize` function).
- Multi-region layouts beyond main + sidebar.
- Hosted runtime (today, you deploy the generated app yourself).
- Per-customer theming.
- Starter registries for specific domains (CRM, ops, support, scheduling).
- Migration assistant for porting existing components into a registry.
- Typed page-state and context schemas.

These are real gaps. Some matter more than others depending on what you're building. Open issues if you hit one.

## Architecture

Four packages.

**`@composoft/spec`** — manifest types and validators. Defines what a block is, what an adapter is, what a workflow is. Zero runtime dependencies.

**`@composoft/runtime`** — resolves data slots, binds actions, manages page state, gates auth. React Server Components plus a client renderer.

**`@composoft/composer`** — CLI that calls Claude. Reads your registry, reads a brief, writes a composition, generates a Next.js app.

**`@composoft/create`** — `npx @composoft/create my-registry` scaffolds a new registry.

## Companies this could fit

Concrete examples of the shape composoft is built for. Not every team here is using composoft. These are the kinds of companies whose engineering structure makes the framework worth considering.

### AI-native CRM

A company building a CRM for AI-augmented sales teams. Their backend handles deals, contacts, activities, emails, AI-suggested next steps. Each enterprise customer wants their pipeline laid out differently. One sells to consumer brands, one sells to financial services, one runs round-robin across 200 reps.

Today: 2 FDEs hand-build per-customer dashboards over 2-3 weeks each.

With composoft: registry with blocks like `deal-pipeline`, `contact-list`, `activity-feed`, `email-composer`, `rep-leaderboard`. FDE writes a brief per customer, runs the composer, ships in a day.

### AI-native ERP for consumer brands

A company replacing NetSuite for mid-market DTC brands. Backend covers inventory, purchase orders, vendors, finance, customer service. Every brand has their own warehouses, vendor relationships, ops processes.

Today: 3 FDEs configuring NetSuite-style admin panels per brand, plus engineers building custom dashboards for power-user customers.

With composoft: registry with blocks like `inventory-table`, `po-list`, `low-stock-alerts`, `vendor-sidebar`, `kpi-cards`. Each customer gets an ops dashboard tuned to their actual workflow.

### AI-native customer support

A company building support tooling that drafts responses, surfaces context, escalates intelligently. Backend handles tickets, conversations, customer profiles, agent workload. Every customer's support org has different escalation rules, SLAs, channel mixes.

Today: support customers get a configurable interface, but anything beyond a config toggle requires engineering work.

With composoft: registry with blocks like `ticket-queue`, `conversation-view`, `agent-handoff-panel`, `customer-sidebar`, `escalation-rules-editor`. Each customer gets a support workspace that matches their org's actual structure.

### AI-native legal

A company building drafting and research tools for law firms. Backend covers matters, documents, clauses, citations, AI-generated drafts. Every firm has different practice areas, document types, review workflows.

Today: each firm needs a custom configuration of the platform, slow to ship and slow to update.

With composoft: registry with blocks like `matter-list`, `document-viewer`, `clause-library`, `citation-checker`, `redline-panel`. Each firm's deployment is composed from the same library, tailored to their practice areas and review process.

### AI-native dev tooling for enterprises

A company selling AI coding assistants to enterprise engineering teams. Backend covers repos, prompts, telemetry, governance, code review. Every enterprise has different security requirements, language stacks, deployment models.

Today: enterprise customers get the same UI, but enterprise IT wants surfaces tailored to their compliance posture.

With composoft: registry with blocks like `usage-dashboard`, `governance-panel`, `repo-explorer`, `prompt-library`, `audit-log-view`. Each enterprise gets an admin and operations interface matching their controls.

### AI-native ops/finance copilot

A company building a copilot that automates ops work for back-office teams. Backend covers transactions, reconciliations, vendors, approvals. Every customer has different chart of accounts, approval chains, vendor mixes.

Today: implementation consultants spend 4-6 weeks per customer wiring up their workflow.

With composoft: registry with blocks like `transaction-table`, `reconciliation-queue`, `approval-inbox`, `vendor-explorer`, `financial-kpis`. Each customer's deployment composed from one library, tuned to their actual finance org.

### What these companies share

Three things, in order of importance.

**FDE motion.** They have engineers whose entire job is configuring the software per customer. That motion is the bottleneck composoft works on.

**Shared backend, varying UI.** All customers point at the same APIs, same data models, same workflows. The thing that varies meaningfully is the interface.

**Customers that expect tailoring.** Their buyers don't want a generic interface. Tailoring is part of the product, not a nice-to-have.

If your company has all three, composoft is worth a serious look. If you have one or two, the framework still helps but the ROI is smaller.

If your company has none of these (Salesforce-shaped enterprise SaaS with admin panels, vertical SaaS shipping one product to all customers, internal tools at a non-software company), the framework is probably not the right tool. Other tools fit your shape better.

## Status

Alpha. The spec is at `0.1.0-alpha.0`. Things will change. Adopters should expect to update their registries when the spec evolves.

## License

MIT. Copyright Hoshang Mehta.

Built by [@githnm](https://github.com/githnm). Issues and PRs welcome.

# composoft

composoft is a framework for AI-native B2B companies to ship per-customer software. FDEs compose customer apps from a published library of blocks, adapters, and workflows. An AI composer turns a brief into a working Next.js app.

## Status

Alpha. One reference registry, Postgres-backed. No auth, no permissions, no hosted runtime. Built to validate the spec, not for production.

## What it does, in 30 seconds

The brief at [packages/composer/fixtures/brewline.md](packages/composer/fixtures/brewline.md):

> Operations dashboard for Brewline Coffee, a specialty roaster. Home page with low-stock alerts and a Roastery inventory table; a /purchase-orders list filtered to drafts with inline approve; a /purchase-orders/[poId] detail page with one-click approve and receive.

The command:

```bash
pnpm --filter @composoft/composer compose:brewline
```

The composer writes a Next.js 15 App Router project at `packages/examples/brewline` — the composition, context schema, action route handler, layout, tailwind config, page files for each route, and a `.env.example` listing required env vars (`DATABASE_URL`, `COMPOSOFT_PG_SSL`). A trimmed snippet of the generated code lives here once we've run it; the full output is at [packages/examples/brewline](packages/examples/brewline).

## Why this exists

FDEs at AI-native B2B companies hand-build customer-specific UIs against a shared backend. Real engineering — typed APIs, action wiring, layout, tenant config — but most of it is recombining patterns the company has shipped a dozen times.

LLMs can read a structured library of UI primitives plus a customer brief and produce a coherent composition. Machine-readable manifests — declarative descriptions of what each primitive does, what data it needs, what config it accepts — collapse the model's job to picking pieces and writing valid configs, which it does well.

composoft is a framework for orgs to publish that library and for agents or humans to compose against it. Four packages: a spec for the contract, registry packages, a runtime for rendering, and a composer CLI.

## The three primitives

- **Adapter** — a typed query against a data source. Zod-validated params and output, plus an implementation function.
- **Workflow** — a server-side action with declared side effects (e.g. "writes to db", "sends email"). Typed input and output via Zod.
- **Block** — a React component plus its data needs (which adapters with what params) and its action surface (which workflows). Takes a per-customer config schema for FDE-time configuration.

Full contract in [packages/spec/src/README.md](packages/spec/src/README.md).

## Architecture

Three layers. `@composoft/spec` at the bottom; everything else depends on it.

```
@composoft/spec               manifest contract
        ▲                     types + Zod validators, zero runtime
        │
        ├──── registry packages (e.g. @composoft/registry-example-postgres)
        │       what an org publishes: their adapters,
        │       workflows, blocks, and an enrichContext hook
        │
        ├──── @composoft/runtime
        │       consumes a registry + composition to render pages
        │
        └──── @composoft/composer
                CLI: brief + registry → Composition + Next.js app
                (calls Claude, validates, generates)
```

The runtime never imports a registry; it accepts one as a prop and trusts the spec contract. The composer imports a registry by name (passed via `--registry`) so it can summarize the available primitives for the model.

Each package's README has more: [spec](packages/spec/src/README.md), [composer](packages/composer/README.md), [registry-example-postgres](packages/registry-example-postgres/README.md), [runtime](packages/runtime/README.md).

## Quick start

Prereqs: Node 20+, pnpm 9+.

```bash
git clone <repo-url> composoft
cd composoft
pnpm install
pnpm -r build

export ANTHROPIC_API_KEY=...
export DATABASE_URL=postgres://user:pass@host:port/dbname   # required by the registry

pnpm --filter @composoft/registry-example-postgres seed     # one-time fixture load

pnpm --filter @composoft/composer compose:brewline

cd packages/examples/brewline
cp .env.example .env                                        # set DATABASE_URL again here
pnpm install
pnpm dev
```

Open http://localhost:3000. The dashboard renders inventory alerts at `/`, drafts at `/purchase-orders`, and the per-PO detail (line items, vendor card, approve/receive) at `/purchase-orders/po_001` or any seeded PO id.

The default model is `claude-opus-4-7`. Override with `COMPOSOFT_MODEL=claude-sonnet-4-6` or similar.

## What's missing / what's next

Real gaps, not polish items.

- **Registry distribution.** Registries link via `workspace:*` today. No npm publishing flow, no version pinning, no registry of registries.
- **Type-level link between action params and `WorkflowActionWithPrefilled<T, K>`.** Authors keep `K` and the manifest's `params` keys in sync by hand. A future helper could derive `K` from `typeof block`.
- **`from-context` paths are not type-checked** against the runtime context shape. The composer's path-existence check is value-level, against the model-emitted `contextSchemaJson`. A typed context contract would turn typos into compile errors.
- **No auth, no permissions, no multi-tenant runtime.** The action endpoint accepts any caller. Real deployments need an auth boundary in front of the route handler and a permission check before binding actions.
- **Composer prompt is naive.** Full registry dump per call, no retrieval. Fine for one-digit block counts, won't scale to a hundred.
- **Layout regions hardcoded to `main` / `sidebar`.** The composer chooses between them but has no notion of a third region or nested layout.
- **No cross-block coordination.** Two blocks on the same page can't subscribe to each other's actions or share local state. A "current selection" model is the obvious next thing.
- **Single context shape per registry.** Multiple page-specific context shapes would need composer changes.

If you want to pick one up, the spec change for any of these will need real justification — see below.

## Contributing / philosophy

- **The spec is the moat.** Adding a primitive or changing the shape of an existing one needs real justification. The runtime, the composer, and every registry package depend on the spec staying coherent.
- **Output is real code, not a runtime.** The composer generates a Next.js project the FDE can read, edit, commit, and deploy. There's no hosted composoft service intercepting requests. If something is broken in the generated app, it's broken in code you can grep.
- **Boring spec, clear contracts, no magic.** Zod schemas at every boundary. Validators that name the offending field. Errors that point at the manifest line. No "convention over configuration" surprises.

Issues and PRs welcome. If you're proposing a spec change, include the use case the spec doesn't cover and why a workaround in the registry or runtime layer isn't enough.

## License

MIT — see [LICENSE](LICENSE).

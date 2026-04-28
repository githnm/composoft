# composoft

composoft is a framework for AI-native B2B companies to ship per-customer software. FDEs compose customer apps from a published library of blocks, adapters, and workflows. An AI composer turns a brief into a working Next.js app.

## Status

Alpha. One reference registry. In-memory data. No auth, no permissions, no hosted runtime. Built to validate the spec, not for production.

## What it does, in 30 seconds

The brief at [packages/composer/fixtures/brand-x.md](packages/composer/fixtures/brand-x.md):

> Support dashboard for Brand X. Agents see open tickets with customer context on the side. One-click escalation to senior agents. Brand X tags VIP customers and we surface that prominently.

The command:

```bash
pnpm --filter @composoft/composer compose:brand-x
```

What the composer wrote at `packages/examples/brand-x/app/tickets/[ticketId]/page.tsx`:

```tsx
// app/tickets/[ticketId]/page.tsx (generated)
import { ComposoftRuntime } from "@composoft/runtime";
import { registry } from "@/lib/registry";
import { composition } from "@/lib/composition";
import { buildContext } from "@/lib/context";

export const dynamic = "force-dynamic";

type Params = Record<string, string | string[] | undefined>;

export default async function Page({ params }: { params: Promise<Params> }) {
  const context = buildContext(await params);
  return <ComposoftRuntime registry={registry} composition={composition} context={context} pagePath="/tickets/[ticketId]" />;
}
```

The same run also wrote 13 other files: composition, context schema, route handler for actions, layout, registry import, and config. See [packages/examples/brand-x](packages/examples/brand-x) for the full output.

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
        ├──── registry packages (e.g. @composoft/registry-acme)
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

Each package's README has more: [spec](packages/spec/src/README.md), [composer](packages/composer/README.md), [registry-acme](packages/registry-acme/README.md), [runtime](packages/runtime/README.md).

## Quick start

Prereqs: Node 20+, pnpm 9+.

```bash
git clone <repo-url> composoft
cd composoft
pnpm install
pnpm -r build

export ANTHROPIC_API_KEY=...

pnpm --filter @composoft/composer compose:brand-x

cd packages/examples/brand-x
pnpm install
pnpm dev
```

Open http://localhost:3000. The dashboard renders the open ticket list at `/` and the per-ticket detail (conversation thread, customer sidebar, agent handoff panel) at `/tickets/tk_001` or any other seeded ticket id.

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

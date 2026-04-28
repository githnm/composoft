# @composoft/composer

CLI that turns a customer brief and a registry into a Composition and a working Next.js 15 app.

## Install

The composer is a workspace package. From the repo root:

```bash
pnpm install
pnpm --filter @composoft/composer build
```

It depends on the registry it composes against. The shipped CLI is wired to `@composoft/registry-acme`; to compose against a different registry, add it to `packages/composer/package.json` `dependencies` and pass `--registry <package-name>` to the CLI.

## Environment

| Variable | Required | Default |
|---|---|---|
| `ANTHROPIC_API_KEY` | yes | — |
| `COMPOSOFT_MODEL` | no | `claude-opus-4-7` |

## Command

```bash
composoft compose --brief <path> --registry <package> --out <path>
```

| Flag | Description |
|---|---|
| `--brief` | Path to a markdown brief describing the customer's needs. |
| `--registry` | Name of an installed registry package. Must export a `registry` value that satisfies `Registry` from `@composoft/spec`. |
| `--out` | Directory to write the generated Next.js app into. Created if missing; existing contents are not cleaned. |

The CLI logs the resolved model id at startup. Validation issues exit non-zero with one line per issue.

## What gets generated

A Next.js 15 App Router project at `--out`:

```
<out>/
├── app/
│   ├── layout.tsx
│   ├── globals.css
│   ├── api/composoft/action/route.ts    POST endpoint that runs workflows
│   └── <route>/page.tsx                 one per page in the composition
├── lib/
│   ├── composition.ts                   the validated Composition
│   ├── context.ts                       Zod context schema + buildContext
│   └── registry.ts                      re-exports the registry package
├── package.json                         next 15, react 19, tailwind 3
├── tsconfig.json
├── next.config.mjs
├── tailwind.config.ts
├── postcss.config.mjs
└── .gitignore
```

Each `page.tsx` exports `dynamic = "force-dynamic"` so adapters always see fresh data — edit it for ISR or static if your adapters are cache-friendly.

## Validation

Three checks run before any file is written:

1. **Composition shape** — Zod parse of the model's JSON output. `.strict()` rejects unknown keys (catches hallucinated fields like `title` or `blockId`).
2. **Composition vs. registry** — every block id exists, every config validates against the block's config schema.
3. **`from-context` paths** — every dot-path used by a manifest's `from-context` ParamSource resolves either in the model-emitted `contextSchemaJson` or in the registry's `enrichmentDeclares` list.

If any check fails, the CLI prints which page, instance, block, slot/action, and path didn't resolve, and exits non-zero. There is no auto-retry.

## Sample run

```bash
pnpm --filter @composoft/composer compose:brand-x
```

This is a wrapper for:

```bash
composoft compose \
  --brief fixtures/brand-x.md \
  --registry @composoft/registry-acme \
  --out ../examples/brand-x
```

After it succeeds:

```bash
cd packages/examples/brand-x
pnpm install
pnpm dev
```

## Prompt design

The composer sends a single prompt with: a system message describing the spec primitives and required JSON output shape, and a user message with the brief plus a JSON-Schema summary of every block, adapter, and workflow in the registry. The model returns one JSON object: `{ composition, contextSchemaTs, contextSchemaJson, notes? }`. The composer parses, validates, and generates.

This is naive but works for registries with on the order of ten blocks. For larger registries, swap the user-prompt builder in [src/prompt.ts](src/prompt.ts) for a retrieval-based summarizer.

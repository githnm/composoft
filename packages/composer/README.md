# @composoft/composer

CLI for [composoft](https://github.com/githnm/composoft). Takes a customer brief and a registry, asks Claude to produce a Composition, validates against the registry, and generates a working Next.js 15 App Router project.

> Status: alpha. APIs may change before 0.1.0 final.

## Install

```bash
pnpm add -D @composoft/composer@alpha
```

You also need an `ANTHROPIC_API_KEY` and an installed registry package.

## Quick look

```bash
ANTHROPIC_API_KEY=sk-ant-... \
  npx @composoft/composer compose \
    --brief brief.md \
    --registry @yourorg/registry \
    --out ./generated-app
```

That writes ~17 files: pages, action + resolve route handlers, composition, context schema, registry import, env-example, and config. `cd generated-app && pnpm install && pnpm dev` and you're running.

## Flags

| Flag | Description |
|---|---|
| `--brief <path>` | markdown brief describing the customer's needs |
| `--registry <package>` | name of an installed registry package |
| `--out <path>` | directory to write the generated Next.js app into |

Env: `ANTHROPIC_API_KEY` required. `COMPOSOFT_MODEL` optional (default `claude-opus-4-7`).

## Validation, before any file is written

1. Composition shape (Zod parse, `.strict()` rejects unknown keys).
2. Composition vs. registry — every block id exists, every config validates.
3. `from-context` paths resolve in the model-emitted `contextSchemaJson` (or in `enrichmentDeclares`).
4. `*Id` config fields against `referenceData` from the registry.
5. `from-page-state` reads have a writer on the same page (warning, not fatal).

Failures exit non-zero with named issues — see [the top-level README](https://github.com/githnm/composoft#readme) for the full pipeline.

## Versioning

`0.1.0-alpha.x` matches the spec's alpha series.

## License

MIT. See [LICENSE](https://github.com/githnm/composoft/blob/main/LICENSE).

# @composoft/create

Scaffold a new [composoft](https://github.com/githnm/composoft) registry from a working in-memory template.

> Status: alpha. The template ships with seed data and one of each primitive — block, adapter, workflow.

## Use

```bash
npx @composoft/create@alpha my-registry
```

Drops you into an interactive flow that asks for the package name and domain, then writes a runnable registry to `./my-registry`. From there:

```bash
cd my-registry
pnpm test          # validates the manifests
pnpm build         # compiles TypeScript
```

Then edit the files under `src/` to fit your domain.

## Flags

| Flag | Description |
|---|---|
| `--yes`, `-y` | accept all defaults; skip prompts |
| `--no-install` | skip the post-scaffold dependency install |
| `--help`, `-h` | show usage |

## What you get

A fresh package with:

- `src/db.ts` — in-memory store with seed data (replace before deploying).
- `src/adapters/items-list.ts` — one example query.
- `src/workflows/items-toggle.ts` — one example state-changing action.
- `src/blocks/item-list.{ts,component.tsx,types.ts}` — one block, three files.
- `src/index.ts` — the registry export with `referenceData`.
- `src/_test.ts` — manifest validation. Already passing.
- `package.json`, `tsconfig.json`, `README.md` — wired up.

The generated README has the canonical "next steps" guide. The short version: replace `src/db.ts`, add more primitives, then `npx @composoft/composer compose` against your registry.

## Versioning

`0.1.0-alpha.x` matches the spec's alpha series. Template deps pin to the matching alpha tag.

## License

MIT. See [LICENSE](https://github.com/githnm/composoft/blob/main/LICENSE).

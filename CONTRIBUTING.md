# Contributing to composoft

## Repo layout

```
packages/
├── spec/                       Manifest types + Zod validators (no React, no Next).
├── runtime/                    Server runtime: resolves data, binds actions, hosts page state.
├── composer/                   CLI that calls Claude, validates, scaffolds Next.js apps.
├── create/                     `npx @composoft/create` registry scaffolder.
├── registry-example-postgres/  Reference registry, real Postgres.
├── registry-example-crm/       Reference registry, in-memory CRM.
└── examples/                   Generated apps (brewline, northwind, acme).
```

The four published packages (`spec`, `runtime`, `composer`, `create`) move together — every release bumps all four to the same version, even when only one has substantive changes. The composer pins `@composoft/runtime` to its own version, so a runtime that lags will fail to install in any newly-generated app.

## Local setup

```bash
pnpm install
pnpm -r --workspace-concurrency=1 build   # examples' next builds fight cache when parallel
pnpm -r test
```

## Refreshing the shadcn snapshot

The composer ships a vendored copy of [shadcn-ui](https://ui.shadcn.com/) (new-york style) under `packages/composer/template/shadcn/`. Generated apps get a copy of this snapshot at compose time — adopters then own the components and can edit them, without needing the shadcn CLI to be installed.

To pull in the latest shadcn library:

```bash
pnpm --filter @composoft/composer shadcn:sync
```

What the script does:
1. Fetches each component in the curated list from `https://ui.shadcn.com/r/styles/new-york/<name>.json`.
2. Recursively follows `registryDependencies` (so pulling `sidebar` also pulls `button`, `tooltip`, `sheet`, etc.).
3. Writes every file under `template/shadcn/` (preserving `ui/<name>.tsx`, `hooks/<name>.tsx`, `lib/utils.ts` paths).
4. Merges every component's `cssVars` and `tailwind.config.theme.extend` into three sidecar files the composer reads at generate time:
   - `template/shadcn/globals.css` — light and dark CSS variable declarations.
   - `template/shadcn/tailwind-extend.json` — `theme.extend` shape for the generated `tailwind.config.ts`.
   - `template/shadcn/dependencies.json` — every npm package referenced (deduped).

After running, review the diff and check `dependencies.json` for new packages. Any new package needs a version pin added to `SHADCN_DEP_VERSIONS` in `packages/composer/src/generate.ts` — the script intentionally fails the next compose if a pin is missing rather than silently picking up the latest.

### When shadcn updates after an adopter has generated their app

The snapshot is taken at compose time, not pulled at install time. Adopters who want newer shadcn primitives in an existing generated app run:

```bash
npx shadcn add <component> --overwrite
```

That's the same flow shadcn users have always used. The composer's vendoring is a clean starting point, not a managed dependency.

### Adding a component to the snapshot

Edit the `COMPONENTS` array in `packages/composer/scripts/sync-shadcn.js`, run `pnpm --filter @composoft/composer shadcn:sync`, then add a version pin for any newly-required npm dep to `SHADCN_DEP_VERSIONS` in `packages/composer/src/generate.ts`.

## Running the example compose flows

These require `ANTHROPIC_API_KEY` (and `DATABASE_URL` for brewline):

```bash
export ANTHROPIC_API_KEY=sk-ant-...
pnpm --filter @composoft/composer compose:northwind
pnpm --filter @composoft/composer compose:acme
pnpm --filter @composoft/composer compose:brewline
```

Each writes a Next.js app into `packages/examples/<name>/`. Run `pnpm install` from the root afterward to link the new workspace package, then `pnpm --filter <name> dev` to boot it.

## Releasing

1. Bump version in all four `packages/{spec,runtime,composer,create}/package.json` to the same value.
2. Bump `@composoft/spec` dep in `packages/create/template/package.json.tmpl` to match.
3. Add a CHANGELOG entry to each of the four packages (substantive entry for the package(s) that changed; "Version bump for sync" for the others).
4. From an authenticated shell, publish in dependency order: spec → runtime → create + composer.

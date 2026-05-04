# @composoft/create

Scaffold a new [composoft](https://github.com/githnm/composoft) registry from a working in-memory template. Three domain templates plus a minimal baseline.

> Status: alpha.

## Use

```bash
npx @composoft/create@alpha my-registry
```

Drops you into an interactive flow that asks which template, the package name, and the domain string, then writes a runnable registry to `./my-registry`. From there:

```bash
cd my-registry
pnpm install
pnpm test          # validates the manifests
pnpm build         # compiles TypeScript
```

Then edit the files under `src/` to fit your domain — the seed data, the per-customer config fields, the auth hooks.

## Templates

| Template | Domain | Counts | What ships |
|---|---|---|---|
| `support` | Modern B2B customer support | 8 adapters, 5 workflows, 6 blocks | Ticket queue with multi-channel routing, ticket-detail sidebar with macros, account-context block, KPI strip, agent workload, recent activity. Page-state coordination on `selection.ticketId` and `selection.accountId`. |
| `booking` | Calendly-shaped scheduling | 7 adapters, 3 workflows, 5 blocks | Event-type grid, calendar view, upcoming list, booking-detail sidebar, metrics cards. Page-state coordination on `selection.bookingId`. |
| `operations` | Inventory + procurement | 8 adapters, 4 workflows, 5 blocks | Inventory KPI row, product table + sidebar detail, PO list + sidebar detail with approval flow. Page-state coordination on `selection.productId` and `selection.poId`. |
| `todo` | Minimal baseline | 1 / 1 / 1 | One adapter, one workflow, one block. The starting point if your domain doesn't fit any template above. |

Pick non-interactively:

```bash
npx @composoft/create my-support --template support --yes
```

Or skip the picker but stay interactive on package name and domain:

```bash
npx @composoft/create --template booking
```

Each template's `README.md` includes a sample brief tailored to its domain — drop it into the composer to generate a Next.js dashboard against the freshly-scaffolded registry.

## Flags

| Flag | Description |
|---|---|
| `--template <name>` | pick a template (skips the interactive picker). Names: `todo`, `support`, `booking`, `operations`. |
| `--yes`, `-y` | accept all defaults; skip prompts. Combined with no `--template`, defaults to `todo` for backward compat. |
| `--no-install` | skip the post-scaffold dependency install |
| `--help`, `-h` | show usage |

## What you get

A fresh package with:

- `src/db.ts` — in-memory store with seed data (replace before deploying).
- `src/adapters/`, `src/workflows/`, `src/blocks/` — typed manifests + React components for the chosen template.
- `src/index.ts` — the registry export with `product` info (navbar, sidebar nav, accent color), `referenceData`, and placeholder `authenticate` / `authorize` hooks.
- `src/_test.ts` — manifest validation. Already passing.
- `package.json`, `tsconfig.json`, `README.md`, `.gitignore` — wired up.

The generated README has a sample brief and the canonical "next steps" guide. Short version: replace `src/db.ts` with a real database client, fix the auth hooks, then `npx @composoft/composer compose` against your registry.

## Versioning

`0.1.0-alpha.x` matches the spec's alpha series. Template deps pin to the matching alpha tag.

## License

MIT. See [LICENSE](https://github.com/githnm/composoft/blob/main/LICENSE).

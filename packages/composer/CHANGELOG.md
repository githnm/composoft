# Changelog

## 0.1.0-alpha.3

Replaces the custom layout chrome with the full shadcn-ui (new-york style) library.

- Added `template/shadcn/`: a snapshot of 47 shadcn components (every UI primitive plus `use-mobile` and `lib/utils.ts`), refreshed via `pnpm shadcn:sync`. The composer copies the snapshot into every generated app under `components/ui/`, `hooks/`, and `lib/utils.ts`.
- New script: `pnpm shadcn:sync` (`scripts/sync-shadcn.js`). Pulls components from `https://ui.shadcn.com/r/styles/new-york/<name>.json`, recurses through `registryDependencies`, and merges every contribution into three sidecar files: `globals.css` (CSS variables), `tailwind-extend.json` (theme.extend), `dependencies.json` (npm deps). Documented in [CONTRIBUTING.md](../../CONTRIBUTING.md).
- Generated layout now uses shadcn primitives: `Sidebar` compound (`SidebarProvider`, `SidebarHeader`, `SidebarContent`, `SidebarMenu`, `SidebarSeparator`) for the sidebar; `Avatar` + `DropdownMenu` + `Badge` + `Separator` for the navbar. `Toaster` from sonner is mounted at the layout root so any block can fire toasts. The custom navbar/sidebar files (`Navbar.tsx`, `Sidebar.tsx`) are gone.
- Generated `tailwind.config.ts` now emits shadcn's full theme extension (background/foreground/card/primary/secondary/muted/accent/destructive/border/input/ring/popover/chart, plus sidebar.* and accordion keyframes), `darkMode: "class"`, and the `tailwindcss-animate` plugin. Content globs cover `components/`, `lib/`, `hooks/`, and the registry's `src/`.
- Generated `globals.css` is the snapshot's full CSS-vars block (light + dark) with `--primary` overridden by `product.accentColor` (converted hex → HSL components). The `.composoft-region > *` card styling now uses shadcn tokens (`--card`, `--card-foreground`, `--border`, `--radius`).
- Generated `package.json` adds the full shadcn dep tree (45 packages: 27 `@radix-ui/*`, plus `class-variance-authority`, `clsx`, `cmdk`, `date-fns`, `embla-carousel-react`, `input-otp`, `lucide-react`, `next-themes`, `react-day-picker`, `react-hook-form`, `@hookform/resolvers`, `react-resizable-panels`, `recharts`, `sonner`, `tailwind-merge`, `tailwindcss-animate`, `tw-animate-css`, `vaul`, `zod`). Versions are pinned in a single `SHADCN_DEP_VERSIONS` map in `generate.ts` for one-place bumps.
- Backward compatible: registries without a `product` block still produce the bare layout the composer emitted before chrome existed (no shadcn, no `lucide-react`, no extra deps).

## 0.1.0-alpha.2

Major iteration: real product chrome in generated apps.

- New `--customer <name>` flag. Threads a customer display name through to the generated app's navbar (chip on the right of the product name) and browser title.
- When the registry declares `product` (`name`, `accentColor?`, `navigation?`), the generator now emits real B2B chrome: a sidebar with lucide icons + active-link styling, a navbar with the product name and customer chip, per-page headers (title + subtitle from the composition), and card backgrounds on every block instance via CSS targeting the runtime's region containers. `lucide-react` is added to the generated `package.json` only when chrome is on.
- When the registry has no `product` block, the generator falls back to the previous bare layout — no chrome, no `lucide-react` dep, no extra components. Backward-compatible.
- Composer prompt updated: the model now emits `title` and `subtitle` per page (required for every page) so the generated app's headers carry meaningful domain language. The previous prohibition on title fields is lifted.
- Two new fixture briefs for the per-customer-tailoring demo: `fixtures/northwind.md` (enterprise sales, MEDDIC-style) and `fixtures/acme.md` (high-velocity inside sales). Both target `@composoft/registry-example-crm`.
- New npm scripts: `compose:northwind`, `compose:acme`. The existing `compose:brewline` now passes `--customer Brewline` so the regenerated brewline app gets chrome on first run.

## 0.1.0-alpha.1

Fixes for adopting the composer against a registry that lives outside the composoft monorepo.

- `--registry` now accepts a relative path (`./my-registry`), an absolute path, a single-file entry path, or a bare module name. The CLI resolves whichever form the user passed and reads the registry's `package.json` to recover the actual package name.
- The generated `package.json` no longer pins the registry as `workspace:*`. It writes a `file:` dep computed relative to the output directory, so `pnpm install` works regardless of where the registry sits on disk.
- `@composoft/runtime` is pinned to the composer's own version (read from the running composer's `package.json`) instead of `workspace:*`, so generated apps install a published runtime that matches the composer that emitted them.
- The Tailwind config's third content glob is now derived from the resolved registry directory instead of a hardcoded `../../registry-example-postgres/...` path.
- `lib/registry.ts` re-exports by package name (read from the registry's `package.json`), not by whatever string the user passed to `--registry`.

## 0.1.0-alpha.0

Initial alpha release.

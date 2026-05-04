import { readFile, mkdir, readdir, writeFile } from "node:fs/promises";
import { dirname, join, relative as pathRelative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { ProductInfo } from "@composoft/spec";
import type { Composition } from "@composoft/runtime";

/**
 * The shadcn snapshot lives at packages/composer/template/shadcn/, populated
 * by `pnpm --filter @composoft/composer shadcn:sync`. We resolve it once
 * per generate run.
 */
async function findShadcnTemplate(): Promise<string> {
  const here = dirname(fileURLToPath(import.meta.url));
  let dir = here;
  for (;;) {
    const candidate = join(dir, "package.json");
    try {
      const raw = await readFile(candidate, "utf8");
      const pkg = JSON.parse(raw) as { name?: string };
      if (pkg.name === "@composoft/composer") {
        return join(dir, "template", "shadcn");
      }
    } catch {
      // keep walking
    }
    const parent = dirname(dir);
    if (parent === dir) {
      throw new Error("could not locate @composoft/composer template/shadcn directory");
    }
    dir = parent;
  }
}

type GenerateInput = {
  outDir: string;
  /** Bare package name from the registry's package.json (e.g. "@acme/registry"). */
  registryPackageName: string;
  /** Absolute, real (symlink-resolved) path to the registry package directory. */
  registryDir: string;
  composition: Composition;
  contextSchemaTs: string;
  /** Optional product/branding info from the registry. When present, the
   * generated app gets full chrome (navbar, sidebar, page headers, card
   * block backgrounds). When absent, the generator falls back to a bare
   * layout — same shape as before product info was a thing. */
  product?: ProductInfo;
  /** Optional customer display name. Shown as a chip in the navbar so
   * adopters can tell at a glance which customer instance they're looking
   * at. Only meaningful when `product` is also set. */
  customer?: string;
};

/**
 * Generate a Next.js 15 App Router project that renders the given
 * composition. Intentionally minimal: no auth UI, no middleware, no error
 * boundaries beyond Next's defaults. The shape an FDE forks from.
 *
 * Path resolution strategy:
 *   - The generated app's package.json declares the registry as a `file:`
 *     dependency pointing at `registryDir`, computed relative to outDir. This
 *     lets pnpm install link the registry into node_modules whether the
 *     registry is in a sibling repo, a sibling workspace package, or anywhere
 *     else on disk.
 *   - For the in-monorepo brewline flow the resolved registryDir is the
 *     symlink-resolved real path to packages/registry-example-postgres, so
 *     the `file:` link still lands on the actual source.
 *   - The Tailwind glob uses the same relative path so block components in
 *     the registry are scanned for utility classes.
 *   - lib/registry.ts re-exports by package name (registryPackageName), not
 *     by absolute path — pnpm makes the package importable by name once
 *     installed.
 *   - @composoft/runtime is pinned to the running composer's version so the
 *     generated app pulls a published runtime that matches the composer that
 *     emitted the code.
 */
export async function generateNextApp(input: GenerateInput): Promise<{ files: string[] }> {
  const { outDir, registryPackageName, registryDir, composition, contextSchemaTs, product, customer } = input;
  const root = resolve(outDir);
  const registryRelative = posixify(pathRelative(root, registryDir));
  const composerVersion = await readComposerVersion();
  const hasChrome = product !== undefined;
  const written: string[] = [];

  async function write(relative: string, content: string) {
    const path = join(root, relative);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, content, "utf8");
    written.push(relative);
  }

  // Load the shadcn snapshot once; every chrome-on file consumes some
  // slice of it (deps for package.json, theme for tailwind, vars for
  // globals, the components/ui copy itself).
  const shadcn = hasChrome ? await loadShadcnSnapshot() : null;

  await write(
    "package.json",
    projectPackageJson(
      composition.name,
      registryPackageName,
      registryRelative,
      composerVersion,
      shadcn,
    ),
  );
  await write("tsconfig.json", projectTsConfig());
  await write("next.config.mjs", nextConfig());
  await write("tailwind.config.ts", tailwindConfig(registryRelative, shadcn));
  await write("postcss.config.mjs", postcssConfig());
  await write(".gitignore", gitignore());
  await write(".env.example", envExampleFile());
  await write("README.md", generatedReadme(composition.name, registryPackageName));
  await write("app/layout.tsx", appLayout(composition.name, product, customer));
  await write("app/globals.css", globalsCss(product, shadcn));
  await write("lib/registry.ts", registryRedirect(registryPackageName));
  await write("lib/context.ts", contextSchemaTs);
  await write("lib/composition.ts", compositionTs(composition));

  if (hasChrome && shadcn !== null && product !== undefined) {
    // Copy shadcn snapshot: ui/* → components/ui/*, hooks/* → hooks/*,
    // lib/utils.ts → lib/utils.ts. Filenames preserved verbatim so
    // adopters can run `npx shadcn add <component> --overwrite` later
    // without surprises.
    for (const file of shadcn.files) {
      await write(file.dest, file.content);
    }
    // Build the set of page paths the composition actually emits. Used
    // below to filter `product.navigation` so the sidebar only shows
    // links to pages that actually exist — clicking a nav item that
    // points at a path the brief didn't request used to land on a 404.
    const composedPaths = new Set(composition.pages.map((p) => p.path));
    await write("components/AppShell.tsx", appShellComponent());
    await write(
      "components/AppSidebar.tsx",
      appSidebarComponent(product, customer, composedPaths),
    );
    await write("components/AppNavbar.tsx", appNavbarComponent(product, customer));
    await write("components/PageHeader.tsx", pageHeaderComponent());
  }

  for (const page of composition.pages) {
    const segment = pagePathToSegment(page.path);
    await write(`app${segment}/page.tsx`, pageFile(page.path, hasChrome));
  }

  await write("app/api/composoft/action/route.ts", actionRouteFile());
  await write("app/api/composoft/resolve/route.ts", resolveRouteFile());

  return { files: written };
}

type ShadcnSnapshot = {
  /** Vendored files: every entry's `dest` is where it lands in the generated app. */
  files: Array<{ dest: string; content: string }>;
  /** Merged tailwind theme.extend (base + per-component contributions). */
  tailwindExtend: Record<string, unknown>;
  /** CSS vars for `:root` (light) and `.dark` from the snapshot. */
  cssVarsCss: string;
  /** Names of npm dependencies the snapshot needs. */
  npmDependencies: string[];
};

async function loadShadcnSnapshot(): Promise<ShadcnSnapshot> {
  const root = await findShadcnTemplate();
  const files: Array<{ dest: string; content: string }> = [];

  // ui/*.tsx → components/ui/*.tsx (the shadcn convention adopters expect).
  const uiDir = join(root, "ui");
  for (const entry of await readdir(uiDir)) {
    files.push({
      dest: posixify(join("components", "ui", entry)),
      content: await readFile(join(uiDir, entry), "utf8"),
    });
  }

  // hooks/*.tsx → hooks/*.tsx (use-mobile and any future hooks shadcn ships).
  const hooksDir = join(root, "hooks");
  try {
    for (const entry of await readdir(hooksDir)) {
      files.push({
        dest: posixify(join("hooks", entry)),
        content: await readFile(join(hooksDir, entry), "utf8"),
      });
    }
  } catch {
    // Snapshot may not have hooks/ if no synced item contributes one.
  }

  // lib/utils.ts → lib/utils.ts (the cn() helper every component imports).
  files.push({
    dest: "lib/utils.ts",
    content: await readFile(join(root, "lib", "utils.ts"), "utf8"),
  });

  const tailwindExtend = JSON.parse(
    await readFile(join(root, "tailwind-extend.json"), "utf8"),
  ) as Record<string, unknown>;
  const cssVarsCss = await readFile(join(root, "globals.css"), "utf8");
  const deps = JSON.parse(
    await readFile(join(root, "dependencies.json"), "utf8"),
  ) as { dependencies: string[] };

  return {
    files,
    tailwindExtend,
    cssVarsCss,
    npmDependencies: deps.dependencies,
  };
}

function posixify(p: string): string {
  // Always emit forward slashes so the generated package.json / tailwind
  // config stays portable across Windows checkouts.
  return p.split("\\").join("/");
}

/**
 * Read the composer's own package.json at runtime so the generated app pins
 * @composoft/* deps to the running composer's version. Walks up from this
 * compiled file (dist/generate.js) to find package.json.
 */
async function readComposerVersion(): Promise<string> {
  const here = dirname(fileURLToPath(import.meta.url));
  let dir = here;
  for (;;) {
    const candidate = join(dir, "package.json");
    try {
      const raw = await readFile(candidate, "utf8");
      const pkg = JSON.parse(raw) as { name?: string; version?: string };
      if (pkg.name === "@composoft/composer" && typeof pkg.version === "string") {
        return pkg.version;
      }
    } catch {
      // keep walking
    }
    const parent = dirname(dir);
    if (parent === dir) {
      throw new Error("could not locate @composoft/composer package.json to read version");
    }
    dir = parent;
  }
}

function pagePathToSegment(path: string): string {
  if (path === "/") return "";
  return path.startsWith("/") ? path : `/${path}`;
}

/**
 * Pin every shadcn-required npm package here. Centralizing means a single
 * place to bump versions, and the generated package.json gets the same
 * range across every adopter. Adopters who want newer versions can edit
 * post-generate.
 */
const SHADCN_DEP_VERSIONS: Record<string, string> = {
  "@hookform/resolvers": "^3.9.0",
  "@radix-ui/react-accordion": "^1.2.0",
  "@radix-ui/react-alert-dialog": "^1.1.1",
  "@radix-ui/react-aspect-ratio": "^1.1.0",
  "@radix-ui/react-avatar": "^1.1.0",
  "@radix-ui/react-checkbox": "^1.1.1",
  "@radix-ui/react-collapsible": "^1.1.0",
  "@radix-ui/react-context-menu": "^2.2.1",
  "@radix-ui/react-dialog": "^1.1.1",
  "@radix-ui/react-dropdown-menu": "^2.1.1",
  "@radix-ui/react-hover-card": "^1.1.1",
  "@radix-ui/react-label": "^2.1.0",
  "@radix-ui/react-menubar": "^1.1.1",
  "@radix-ui/react-navigation-menu": "^1.2.0",
  "@radix-ui/react-popover": "^1.1.1",
  "@radix-ui/react-progress": "^1.1.0",
  "@radix-ui/react-radio-group": "^1.2.0",
  "@radix-ui/react-scroll-area": "^1.1.0",
  "@radix-ui/react-select": "^2.1.1",
  "@radix-ui/react-separator": "^1.1.0",
  "@radix-ui/react-slider": "^1.2.0",
  "@radix-ui/react-slot": "^1.1.0",
  "@radix-ui/react-switch": "^1.1.0",
  "@radix-ui/react-tabs": "^1.1.0",
  "@radix-ui/react-toggle": "^1.1.0",
  "@radix-ui/react-toggle-group": "^1.1.0",
  "@radix-ui/react-tooltip": "^1.1.2",
  "class-variance-authority": "^0.7.0",
  clsx: "^2.1.1",
  cmdk: "^1.0.0",
  "date-fns": "^3.6.0",
  "embla-carousel-react": "^8.3.0",
  "input-otp": "^1.2.4",
  "lucide-react": "^0.462.0",
  "next-themes": "^0.3.0",
  "react-day-picker": "^9.4.0",
  "react-hook-form": "^7.53.0",
  "react-resizable-panels": "^2.1.4",
  recharts: "^2.12.7",
  sonner: "^1.5.0",
  "tailwind-merge": "^2.5.4",
  "tailwindcss-animate": "^1.0.7",
  "tw-animate-css": "^1.2.0",
  vaul: "^1.1.2",
  zod: "^3.23.8",
};

function projectPackageJson(
  name: string,
  registryPackageName: string,
  registryRelative: string,
  composerVersion: string,
  shadcn: ShadcnSnapshot | null,
): string {
  const dependencies: Record<string, string> = {
    [registryPackageName]: `file:${registryRelative}`,
    "@composoft/runtime": `^${composerVersion}`,
    next: "^15.0.0",
    react: "^19.0.0",
    "react-dom": "^19.0.0",
    tailwindcss: "^3.4.0",
    autoprefixer: "^10.4.0",
    postcss: "^8.4.0",
    zod: "^3.23.8",
  };
  if (shadcn !== null) {
    // Inject every shadcn-required dep at a known-good version. The list
    // is the union of: every npm dep declared by every synced shadcn
    // component, plus manual extras (tailwindcss-animate, recharts,
    // tw-animate-css). The shadcn snapshot is the source of truth for
    // names; SHADCN_DEP_VERSIONS holds the version pins.
    for (const dep of shadcn.npmDependencies) {
      const version = SHADCN_DEP_VERSIONS[dep];
      if (!version) {
        throw new Error(
          `shadcn snapshot needs a version pin for "${dep}" — add it to SHADCN_DEP_VERSIONS in generate.ts`,
        );
      }
      dependencies[dep] = version;
    }
  }
  return (
    JSON.stringify(
      {
        name,
        version: "0.0.1",
        private: true,
        type: "module",
        scripts: {
          dev: "next dev",
          build: "next build",
          start: "next start",
        },
        dependencies,
        devDependencies: {
          "@types/node": "^20.0.0",
          "@types/react": "^19.0.0",
          "@types/react-dom": "^19.0.0",
          typescript: "^5.5.0",
        },
      },
      null,
      2,
    ) + "\n"
  );
}

function projectTsConfig(): string {
  return (
    JSON.stringify(
      {
        compilerOptions: {
          target: "ES2022",
          lib: ["dom", "dom.iterable", "esnext"],
          allowJs: false,
          skipLibCheck: true,
          strict: true,
          noEmit: true,
          esModuleInterop: true,
          module: "esnext",
          moduleResolution: "bundler",
          resolveJsonModule: true,
          isolatedModules: true,
          jsx: "preserve",
          incremental: true,
          plugins: [{ name: "next" }],
          paths: { "@/*": ["./*"] },
        },
        include: ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
        exclude: ["node_modules"],
      },
      null,
      2,
    ) + "\n"
  );
}

function nextConfig(): string {
  return `/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // The composoft registry packages live in the workspace; transpile them.
    externalDir: true,
  },
  transpilePackages: ["@composoft/runtime", "@composoft/spec"],
};
export default nextConfig;
`;
}

function tailwindConfig(registryRelative: string, shadcn: ShadcnSnapshot | null): string {
  // Block components live in the registry package; Tailwind needs to see
  // their .tsx so utility classes in className attributes survive the
  // bundle. The relative path is computed from the resolved registry
  // package directory so this works whether the registry is a sibling
  // workspace package, a local path dep, or installed from the registry.
  if (shadcn === null) {
    return `import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
    "${registryRelative}/src/**/*.{ts,tsx}",
  ],
  theme: { extend: {} },
  plugins: [],
};
export default config;
`;
  }
  // shadcn path: emit darkMode: class, theme.extend pulled from the
  // snapshot, and the animate plugin shadcn components depend on. The
  // snapshot's theme extensions cover both the base init mappings
  // (background/foreground/card/...) and per-component additions
  // (sidebar.*, accordion keyframes, etc).
  const extendLiteral = JSON.stringify(shadcn.tailwindExtend, null, 4)
    .split("\n")
    .map((line, i) => (i === 0 ? line : "  " + line))
    .join("\n");
  return `import type { Config } from "tailwindcss";
import animate from "tailwindcss-animate";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
    "./hooks/**/*.{ts,tsx}",
    "${registryRelative}/src/**/*.{ts,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: { "2xl": "1400px" },
    },
    extend: ${extendLiteral},
  },
  plugins: [animate],
};
export default config;
`;
}

function postcssConfig(): string {
  return `export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
`;
}

function gitignore(): string {
  return `node_modules
.next
dist
.env*.local
.env
.DS_Store
`;
}

/**
 * Hardcoded for now — every shipped registry expects DATABASE_URL plus the
 * SSL knob from `@composoft/registry-example-postgres`. Future versions
 * should let registries declare their required env vars via a `requiredEnv`
 * field on the Registry export, and the composer would map that into
 * `.env.example` automatically.
 */
function envExampleFile(): string {
  return `# Required: connection string for the registry's Postgres database
DATABASE_URL=postgres://user:pass@host:port/dbname

# Optional: SSL handling for hosted Postgres providers.
#   require | true | 1   — force SSL, accept self-signed certs
#   disable | false | 0  — force SSL off
#   auto (default)       — auto-detect by hostname (.supabase.co/.com,
#                          .neon.tech, .render.com); on for hosted, off
#                          for everything else
COMPOSOFT_PG_SSL=auto

# Auth (testing).
# The sample registry's authenticate hook trusts an X-Composoft-User header.
# Send it from curl: curl -H 'X-Composoft-User: alice' …
# The runtime's fetch wrapper sends X-Composoft-User: demo-user for browser
# requests by default. Real auth wires authenticate via Clerk / NextAuth /
# your auth library, reading session cookies or Authorization tokens.
`;
}

function generatedReadme(appName: string, registryPackageName: string): string {
  return `# ${appName}

Generated by \`@composoft/composer\` against \`${registryPackageName}\`.

## Setup

\`\`\`bash
cp .env.example .env
# fill in DATABASE_URL with a real connection string

pnpm install
pnpm dev
\`\`\`

The app needs the registry's database to be reachable. Hosted providers (Supabase, Neon, Render) work without extra SSL flags — see \`COMPOSOFT_PG_SSL\` in \`.env.example\`.

## What's here

- \`app/\` — one route per page in the composition. Each page renders \`<ComposoftRuntime>\` server-side.
- \`app/api/composoft/action/route.ts\` — the action endpoint the runtime's client host POSTs to.
- \`lib/composition.ts\` — the validated Composition the composer emitted.
- \`lib/context.ts\` — the Zod context schema and \`buildContext()\` mapper for route params.
- \`lib/registry.ts\` — re-exports the registry from \`${registryPackageName}\`.

## Editing

This is real code. Edit anything you want; commit it. The composer is one-shot, not a continuous service. Re-run the composer to regenerate from a new brief; the diff is yours to merge.

## Reference

- [composoft spec](https://github.com/githnm/composoft) — adapter / workflow / block primitives.
- [${registryPackageName}] — the source of every block, adapter, workflow id this app uses.
`;
}

function appLayout(appName: string, product?: ProductInfo, customer?: string): string {
  if (!product) {
    // Bare layout. No shadcn, no chrome — registries that omit `product`
    // get the same minimal output the composer emitted before chrome existed.
    return `import type { ReactNode } from "react";
import "./globals.css";

export const metadata = { title: ${JSON.stringify(appName)} };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">
        {children}
      </body>
    </html>
  );
}
`;
  }

  // Chrome path: server-rendered <html>/<body> wraps a client AppShell that
  // mounts SidebarProvider + Sidebar + Navbar from shadcn. <Toaster /> from
  // sonner is mounted at the body level so any block can fire a toast via
  // `toast(...)` from "sonner" without wiring a provider.
  const browserTitle = customer ? `${customer} · ${product.name}` : product.name;
  return `import type { ReactNode } from "react";
import "./globals.css";
import { AppShell } from "@/components/AppShell";
import { Toaster } from "@/components/ui/sonner";

export const metadata = { title: ${JSON.stringify(browserTitle)} };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background text-foreground antialiased">
        <AppShell>{children}</AppShell>
        <Toaster />
      </body>
    </html>
  );
}
`;
}

function appShellComponent(): string {
  // Thin client wrapper that mounts shadcn's SidebarProvider. All chrome
  // hangs off this — the sidebar, the top bar (rendered inside the
  // SidebarInset so it sits to the right of the collapsible sidebar), and
  // the page content padding.
  return `"use client";

import type { ReactNode } from "react";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { AppNavbar } from "@/components/AppNavbar";

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <AppNavbar />
        <main className="flex-1 p-8">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
`;
}

function appSidebarComponent(
  product: ProductInfo,
  customer: string | undefined,
  /**
   * The set of paths the composition actually emits as Next.js routes.
   * Nav items pointing elsewhere are dropped at generate time so the
   * sidebar never advertises a page that doesn't exist. If a registry
   * declares e.g. `[Overview, Inventory, Procurement, Vendors]` but the
   * brief only asked for the home page, only the matching nav items
   * survive into the generated app's chrome.
   */
  composedPaths: ReadonlySet<string>,
): string {
  // Uses shadcn's Sidebar compound (SidebarProvider lives in AppShell). Nav
  // items resolve their lucide icons by name at render time so registries
  // can declare arbitrary names without an icon registry. Unknown names
  // render the Circle fallback rather than crashing.
  const declared = product.navigation ?? [];
  const items = declared.filter((i) => composedPaths.has(i.path));
  const itemsJson = JSON.stringify(
    items.map((i) => ({ label: i.label, path: i.path, icon: i.icon ?? "Circle" })),
    null,
    2,
  );
  const productName = JSON.stringify(product.name);
  const customerLabel = customer ? JSON.stringify(customer) : "null";
  return `"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import * as Icons from "lucide-react";
import { Sparkles } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar";

const NAV_ITEMS = ${itemsJson} as const;
const PRODUCT_NAME = ${productName};
const CUSTOMER_LABEL: string | null = ${customerLabel};

function NavIcon({ name }: { name: string }) {
  const C = (Icons as Record<string, unknown>)[name] ?? Icons.Circle;
  const Resolved = C as typeof Icons.Circle;
  return <Resolved className="size-4" />;
}

export function AppSidebar() {
  const pathname = usePathname();
  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-1.5">
          <div className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Sparkles className="size-4" />
          </div>
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-sm font-semibold leading-tight">{PRODUCT_NAME}</span>
            {CUSTOMER_LABEL ? (
              <span className="truncate text-xs text-muted-foreground leading-tight">{CUSTOMER_LABEL}</span>
            ) : null}
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Workspace</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV_ITEMS.map((item) => (
                <SidebarMenuItem key={item.path}>
                  <SidebarMenuButton asChild isActive={pathname === item.path}>
                    <Link href={item.path}>
                      <NavIcon name={item.icon} />
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarSeparator />
        <SidebarGroup>
          <SidebarGroupLabel>Recent</SidebarGroupLabel>
          <SidebarGroupContent>
            {/* Intentionally empty for now. The section header reserves the
                space so future dynamic links land somewhere that already
                exists in the chrome. */}
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
`;
}

function appNavbarComponent(product: ProductInfo, customer?: string): string {
  // Top bar inside SidebarInset. Left: sidebar trigger + a Badge showing the
  // product name (lightweight, doesn't compete with the sidebar header).
  // Right: avatar + chevron, wrapped in a DropdownMenu so the placeholder
  // menu items (Profile / Settings / Sign out) are real shadcn primitives
  // adopters can wire to actual auth.
  const displayName = customer ?? product.name;
  const initial = displayName.charAt(0).toUpperCase();
  const productName = JSON.stringify(product.name);
  const displayLiteral = JSON.stringify(displayName);
  const initialLiteral = JSON.stringify(initial);
  return `"use client";

import { ChevronDown, LogOut, Settings, User } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";

export function AppNavbar() {
  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border bg-background px-4">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 h-4" />
      <Badge variant="secondary" className="font-medium">
        {${productName}}
      </Badge>
      <div className="ml-auto flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-2 rounded-md px-1 py-1 outline-none transition-colors hover:bg-accent focus-visible:ring-1 focus-visible:ring-ring">
            <Avatar className="size-8">
              <AvatarFallback className="bg-primary text-primary-foreground text-xs font-medium">
                {${initialLiteral}}
              </AvatarFallback>
            </Avatar>
            <ChevronDown className="size-4 text-muted-foreground" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>{${displayLiteral}}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <User className="mr-2 size-4" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Settings className="mr-2 size-4" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <LogOut className="mr-2 size-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
`;
}

function pageHeaderComponent(): string {
  // No card wrapper — page header sits directly above the runtime regions.
  // Serif title hits the Linear/Attio aesthetic the user asked for; subtitle
  // uses muted-foreground so it inherits any theme tweaks.
  return `import type { ReactElement } from "react";

export function PageHeader({
  title,
  subtitle,
}: {
  title?: string;
  subtitle?: string;
}): ReactElement | null {
  if (!title && !subtitle) return null;
  return (
    <div className="mb-8">
      {title ? (
        <h1
          className="text-2xl font-semibold text-foreground"
          style={{ fontFamily: "ui-serif, Georgia, Cambria, 'Times New Roman', Times, serif" }}
        >
          {title}
        </h1>
      ) : null}
      {subtitle ? (
        <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
      ) : null}
    </div>
  );
}
`;
}

function globalsCss(product?: ProductInfo, shadcn?: ShadcnSnapshot | null): string {
  if (!product || !shadcn) {
    return `@tailwind base;
@tailwind components;
@tailwind utilities;
`;
  }
  // shadcn path: emit the snapshot's globals.css verbatim (base CSS vars
  // + per-component contributions) and append a registry-specific block
  // that overrides --primary with the product accent and styles the
  // runtime's region children as Card-styled containers via shadcn tokens.
  const accentHsl = product.accentColor ? hexToHslComponents(product.accentColor) : null;
  const accentOverride = accentHsl
    ? `\n@layer base {\n  :root {\n    --primary: ${accentHsl};\n  }\n}\n`
    : "";
  const regionCardStyles = `
@layer components {
  /* Card treatment for every block instance the runtime renders. Main
     blocks are roomier; sidebar blocks are more compact. Both use
     shadcn Card tokens so they pick up the active theme. */
  .composoft-page {
    display: block;
  }
  .composoft-page:has(.composoft-region-sidebar) {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 320px;
    gap: 1.5rem;
    align-items: start;
  }
  .composoft-region {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }
  .composoft-region-main {
    gap: 1.5rem;
  }
  .composoft-region-sidebar {
    gap: 1rem;
  }
  .composoft-region > * {
    background: hsl(var(--card));
    color: hsl(var(--card-foreground));
    border: 1px solid hsl(var(--border));
    border-radius: var(--radius);
    box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.04);
  }
  .composoft-region-main > * {
    padding: 1.5rem;
  }
  .composoft-region-sidebar > * {
    padding: 1.25rem;
  }
}
`;
  return shadcn.cssVarsCss + accentOverride + regionCardStyles;
}

/**
 * Convert "#rrggbb" or "#rgb" to shadcn-style "h s% l%" HSL components
 * (no commas, no `hsl()` wrapper — that's how shadcn writes its CSS vars).
 * Used to override --primary with the registry's accent color.
 */
function hexToHslComponents(hex: string): string {
  const m = hex.replace("#", "").trim();
  const v = m.length === 3 ? m.split("").map((c) => c + c).join("") : m;
  if (!/^[0-9a-fA-F]{6}$/.test(v)) {
    // Bad hex: fall back to default and warn — better than throwing mid-generate.
    console.error(`[composoft] product.accentColor "${hex}" is not a valid hex color; using shadcn default for --primary`);
    return "240 5.9% 10%";
  }
  const r = parseInt(v.slice(0, 2), 16) / 255;
  const g = parseInt(v.slice(2, 4), 16) / 255;
  const b = parseInt(v.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h /= 6;
  }
  return `${(h * 360).toFixed(2)} ${(s * 100).toFixed(1)}% ${(l * 100).toFixed(1)}%`;
}

function registryRedirect(registryPackageName: string): string {
  return `export { registry } from ${JSON.stringify(registryPackageName)};
`;
}

function compositionTs(composition: Composition): string {
  // Composition is stored as a TS file that imports from runtime for the
  // type. The actual data is JSON-serializable (Zod context schema lives
  // separately in lib/context.ts).
  const json = JSON.stringify(composition, null, 2);
  return `import type { Composition } from "@composoft/runtime";

export const composition: Composition = ${json} as const;
`;
}

function actionRouteFile(): string {
  return `import { NextResponse } from "next/server";
import { z } from "zod";
import {
  authenticateRequest,
  authorizeRequest,
  bindActions,
  mergeIdentityIntoContext,
} from "@composoft/runtime";
import { registry } from "@/lib/registry";
import { composition } from "@/lib/composition";
import { contextSchema } from "@/lib/context";

const requestSchema = z.object({
  blockInstanceId: z.string().min(1),
  actionName: z.string().min(1),
  input: z.unknown(),
  context: z.unknown(),
  pageState: z.record(z.string(), z.unknown()).optional(),
});

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "request body must be JSON" }, { status: 400 });
  }

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid request shape", detail: parsed.error.issues },
      { status: 400 },
    );
  }
  const { blockInstanceId, actionName, input, context, pageState } = parsed.data;

  // Authenticate. Missing hook → warn-once + anonymous identity. Returns
  // 401 if registry.authenticate returns null, 500 if it throws.
  const auth = await authenticateRequest(registry, req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  // Find the block instance across pages — instanceIds are globally unique
  // (validateComposition enforces this).
  let blockId: string | undefined;
  let instanceConfig: unknown;
  for (const page of composition.pages) {
    const inst = page.blocks.find((b) => b.instanceId === blockInstanceId);
    if (inst) {
      blockId = inst.id;
      instanceConfig = inst.config;
      break;
    }
  }
  if (!blockId) {
    return NextResponse.json(
      { error: \`unknown blockInstanceId: \${blockInstanceId}\` },
      { status: 404 },
    );
  }

  const block = registry.blocks[blockId];
  if (!block) {
    return NextResponse.json({ error: \`registry has no block "\${blockId}"\` }, { status: 500 });
  }

  const actionRef = block.actions[actionName];
  if (!actionRef) {
    return NextResponse.json(
      { error: \`block "\${blockId}" has no action "\${actionName}"\` },
      { status: 404 },
    );
  }

  // Authorize — receives the workflow id and caller-supplied input.
  // Permission gate. Tenancy filtering belongs in the workflow/adapter SQL
  // via context.user.id, not here.
  const authz = await authorizeRequest(registry, auth.identity, {
    kind: "action",
    workflowId: actionRef.workflow,
    input: input ?? {},
    blockInstanceId,
  });
  if (!authz.ok) {
    return NextResponse.json({ error: authz.error }, { status: authz.status });
  }

  // Validate the caller's context against the page's contextSchema, splice
  // the authenticated identity into context.user, then run enrichContext.
  const validatedContext = contextSchema.safeParse(context);
  if (!validatedContext.success) {
    return NextResponse.json(
      { error: "invalid context", detail: validatedContext.error.issues },
      { status: 400 },
    );
  }
  const withIdentity = mergeIdentityIntoContext(validatedContext.data, auth.identity);
  const enrichedContext = registry.enrichContext
    ? await registry.enrichContext(withIdentity, registry)
    : withIdentity;

  const validatedConfig = block.config.parse(instanceConfig);

  const actions = bindActions(block, registry, enrichedContext, validatedConfig, pageState ?? {});
  const action = actions[actionName];
  if (!action) {
    return NextResponse.json(
      { error: \`block "\${blockId}" has no action "\${actionName}"\` },
      { status: 404 },
    );
  }

  try {
    const result = await action(input);
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
`;
}

function resolveRouteFile(): string {
  return `import { NextResponse } from "next/server";
import { z } from "zod";
import {
  authenticateRequest,
  authorizeRequest,
  mergeIdentityIntoContext,
  resolveOneSlot,
} from "@composoft/runtime";
import { registry } from "@/lib/registry";
import { composition } from "@/lib/composition";
import { contextSchema } from "@/lib/context";

/**
 * Re-resolve a single data slot for a block instance. Called by
 * <ComposoftBlockHost> on the client whenever a from-page-state path the
 * slot reads changes value. The handler validates the requested slot
 * exists on the named instance, runs the registry's enrichContext, then
 * reuses the runtime's resolveOneSlot.
 *
 * Security: the client cannot construct arbitrary adapter calls. Only
 * (instanceId, slotName) pairs that exist in the composition resolve.
 */

const requestSchema = z.object({
  blockInstanceId: z.string().min(1),
  slotName: z.string().min(1),
  context: z.unknown(),
  pageState: z.record(z.string(), z.unknown()).optional(),
});

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "request body must be JSON" }, { status: 400 });
  }

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid request shape", detail: parsed.error.issues },
      { status: 400 },
    );
  }
  const { blockInstanceId, slotName, context, pageState } = parsed.data;

  // Authenticate first; same gate shape as the action route.
  const auth = await authenticateRequest(registry, req);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let blockId: string | undefined;
  let instanceConfig: unknown;
  for (const page of composition.pages) {
    const inst = page.blocks.find((b) => b.instanceId === blockInstanceId);
    if (inst) {
      blockId = inst.id;
      instanceConfig = inst.config;
      break;
    }
  }
  if (!blockId) {
    return NextResponse.json(
      { error: \`unknown blockInstanceId: \${blockInstanceId}\` },
      { status: 404 },
    );
  }

  const block = registry.blocks[blockId];
  if (!block) {
    return NextResponse.json({ error: \`registry has no block "\${blockId}"\` }, { status: 500 });
  }

  const slot = block.data[slotName];
  if (!slot) {
    return NextResponse.json(
      { error: \`block "\${blockId}" has no slot "\${slotName}"\` },
      { status: 404 },
    );
  }

  // Authorize — adapter id and the page state the client controls are the
  // permission-relevant inputs. Server-resolved params come later.
  const authz = await authorizeRequest(registry, auth.identity, {
    kind: "resolve",
    adapterId: slot.adapter,
    params: pageState ?? {},
    blockInstanceId,
    slotName,
  });
  if (!authz.ok) {
    return NextResponse.json({ error: authz.error }, { status: authz.status });
  }

  const validatedContext = contextSchema.safeParse(context);
  if (!validatedContext.success) {
    return NextResponse.json(
      { error: "invalid context", detail: validatedContext.error.issues },
      { status: 400 },
    );
  }
  const withIdentity = mergeIdentityIntoContext(validatedContext.data, auth.identity);
  const enrichedContext = registry.enrichContext
    ? await registry.enrichContext(withIdentity, registry)
    : withIdentity;

  const validatedConfig = block.config.parse(instanceConfig);

  try {
    const data = await resolveOneSlot(
      block,
      slotName,
      registry,
      enrichedContext,
      validatedConfig,
      pageState ?? {},
    );
    return NextResponse.json({ data });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
`;
}

function pageFile(pagePath: string, hasChrome: boolean): string {
  const pagePathLiteral = JSON.stringify(pagePath);
  if (!hasChrome) {
    return `import { ComposoftRuntime } from "@composoft/runtime";
import { registry } from "@/lib/registry";
import { composition } from "@/lib/composition";
import { buildContext } from "@/lib/context";

// Composoft defaults to dynamic rendering so adapters always see fresh data.
// Edit this for static or ISR semantics if your adapters are cache-friendly.
export const dynamic = "force-dynamic";

type Params = Record<string, string | string[] | undefined>;

export default async function Page({ params }: { params: Promise<Params> }) {
  const resolvedParams = await params;
  const context = buildContext(resolvedParams);
  return (
    <ComposoftRuntime
      registry={registry}
      composition={composition}
      context={context}
      pagePath=${pagePathLiteral}
    />
  );
}
`;
  }
  // Chrome path: page header from composition.pages[i].title/subtitle, then
  // the runtime. Pulled at render time so editing lib/composition.ts updates
  // the heading without regenerating page files.
  return `import { ComposoftRuntime } from "@composoft/runtime";
import { registry } from "@/lib/registry";
import { composition } from "@/lib/composition";
import { buildContext } from "@/lib/context";
import { PageHeader } from "@/components/PageHeader";

export const dynamic = "force-dynamic";

type Params = Record<string, string | string[] | undefined>;

const PAGE_PATH = ${pagePathLiteral};

export default async function Page({ params }: { params: Promise<Params> }) {
  const resolvedParams = await params;
  const context = buildContext(resolvedParams);
  const page = composition.pages.find((p) => p.path === PAGE_PATH);
  return (
    <>
      <PageHeader title={page?.title} subtitle={page?.subtitle} />
      <ComposoftRuntime
        registry={registry}
        composition={composition}
        context={context}
        pagePath={PAGE_PATH}
      />
    </>
  );
}
`;
}

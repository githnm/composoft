// Snapshots a curated list of shadcn-ui (new-york style) components into
// packages/composer/template/shadcn/. Run manually when shadcn updates:
//
//   pnpm --filter @composoft/composer shadcn:sync
//
// What it does:
//   1. Fetches https://ui.shadcn.com/r/styles/new-york/<item>.json for every
//      item in COMPONENTS plus "utils".
//   2. Recurses through each item's registryDependencies (deduped by name).
//      Hooks like "use-mobile" come along for the ride.
//   3. Writes every file in every response to template/shadcn/<file.path>.
//   4. Merges every item's cssVars + tailwind.config.theme.extend +
//      npm dependencies into three sidecar files the composer reads at
//      generate time:
//        - template/shadcn/globals.css
//        - template/shadcn/tailwind-extend.json
//        - template/shadcn/dependencies.json
//
// The generated app gets a copy of everything under template/shadcn/ plus
// a tailwind.config.ts that merges in tailwind-extend.json and a
// package.json that includes dependencies.json.

import { mkdir, writeFile, rm } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { get } from "node:https";

const STYLE = "new-york";
const BASE = `https://ui.shadcn.com/r/styles/${STYLE}`;
const HERE = dirname(fileURLToPath(import.meta.url));
const TEMPLATE = resolve(HERE, "..", "template", "shadcn");

const COMPONENTS = [
  "accordion", "alert", "alert-dialog", "aspect-ratio", "avatar", "badge",
  "breadcrumb", "button", "calendar", "card", "carousel", "checkbox",
  "collapsible", "command", "context-menu", "dialog", "drawer",
  "dropdown-menu", "form", "hover-card", "input", "input-otp", "label",
  "menubar", "navigation-menu", "pagination", "popover", "progress",
  "radio-group", "resizable", "scroll-area", "select", "separator", "sheet",
  "sidebar", "skeleton", "slider", "sonner", "switch", "table", "tabs",
  "textarea", "toggle", "toggle-group", "tooltip",
  // Pulled explicitly so lib/utils.ts is always present even if an item
  // doesn't list it as a registryDependency.
  "utils",
];

// shadcn's core CSS variables for the new-york style (light theme). The
// registry only ships per-component vars (e.g. sidebar-*); the base set is
// written by the shadcn CLI's `init` flow, which we don't run. Hardcoding
// here keeps the snapshot self-contained.
const NEW_YORK_LIGHT_BASE = {
  "background": "0 0% 100%",
  "foreground": "240 10% 3.9%",
  "card": "0 0% 100%",
  "card-foreground": "240 10% 3.9%",
  "popover": "0 0% 100%",
  "popover-foreground": "240 10% 3.9%",
  "primary": "240 5.9% 10%",
  "primary-foreground": "0 0% 98%",
  "secondary": "240 4.8% 95.9%",
  "secondary-foreground": "240 5.9% 10%",
  "muted": "240 4.8% 95.9%",
  "muted-foreground": "240 3.8% 46.1%",
  "accent": "240 4.8% 95.9%",
  "accent-foreground": "240 5.9% 10%",
  "destructive": "0 84.2% 60.2%",
  "destructive-foreground": "0 0% 98%",
  "border": "240 5.9% 90%",
  "input": "240 5.9% 90%",
  "ring": "240 5.9% 10%",
  "chart-1": "12 76% 61%",
  "chart-2": "173 58% 39%",
  "chart-3": "197 37% 24%",
  "chart-4": "43 74% 66%",
  "chart-5": "27 87% 67%",
  "radius": "0.5rem",
};

// Color mappings the shadcn CLI's `init` writes into tailwind.config.ts so
// classes like `bg-primary`, `text-foreground`, `border-border`, etc. point
// at the CSS variables. The registry only contributes per-component
// extensions (e.g. sidebar.*); we seed the base here.
const NEW_YORK_TAILWIND_BASE = {
  borderRadius: {
    lg: "var(--radius)",
    md: "calc(var(--radius) - 2px)",
    sm: "calc(var(--radius) - 4px)",
  },
  colors: {
    border: "hsl(var(--border))",
    input: "hsl(var(--input))",
    ring: "hsl(var(--ring))",
    background: "hsl(var(--background))",
    foreground: "hsl(var(--foreground))",
    primary: {
      DEFAULT: "hsl(var(--primary))",
      foreground: "hsl(var(--primary-foreground))",
    },
    secondary: {
      DEFAULT: "hsl(var(--secondary))",
      foreground: "hsl(var(--secondary-foreground))",
    },
    destructive: {
      DEFAULT: "hsl(var(--destructive))",
      foreground: "hsl(var(--destructive-foreground))",
    },
    muted: {
      DEFAULT: "hsl(var(--muted))",
      foreground: "hsl(var(--muted-foreground))",
    },
    accent: {
      DEFAULT: "hsl(var(--accent))",
      foreground: "hsl(var(--accent-foreground))",
    },
    popover: {
      DEFAULT: "hsl(var(--popover))",
      foreground: "hsl(var(--popover-foreground))",
    },
    card: {
      DEFAULT: "hsl(var(--card))",
      foreground: "hsl(var(--card-foreground))",
    },
    chart: {
      "1": "hsl(var(--chart-1))",
      "2": "hsl(var(--chart-2))",
      "3": "hsl(var(--chart-3))",
      "4": "hsl(var(--chart-4))",
      "5": "hsl(var(--chart-5))",
    },
  },
};

// Manual additions to the dep list. shadcn's tailwind.config.ts uses
// `tailwindcss-animate` as a plugin (not a per-component dep), and the user
// asked for `tw-animate-css` and `recharts` to be present so chart blocks
// and animation classes work without extra setup.
const EXTRA_DEPS = [
  "tailwindcss-animate",
  "tw-animate-css",
  "recharts",
];

function fetchText(url, redirects = 0) {
  return new Promise((resolveP, rejectP) => {
    get(url, { headers: { "User-Agent": "composoft-sync/0.1" } }, (res) => {
      if ([301, 302, 307, 308].includes(res.statusCode) && res.headers.location && redirects < 5) {
        return fetchText(res.headers.location, redirects + 1).then(resolveP, rejectP);
      }
      if (res.statusCode !== 200) {
        return rejectP(new Error(`HTTP ${res.statusCode} for ${url}`));
      }
      let body = "";
      res.setEncoding("utf8");
      res.on("data", (d) => (body += d));
      res.on("end", () => resolveP(body));
    }).on("error", rejectP);
  });
}

async function fetchItem(name) {
  return JSON.parse(await fetchText(`${BASE}/${name}.json`));
}

async function writeRel(rel, content) {
  const full = join(TEMPLATE, rel);
  await mkdir(dirname(full), { recursive: true });
  await writeFile(full, content, "utf8");
}

const visited = new Set();
const merged = {
  cssVarsLight: {},
  cssVarsDark: {},
  tailwindExtend: {},
  npmDeps: new Set(),
};

function deepMerge(target, source) {
  for (const [k, v] of Object.entries(source)) {
    if (
      v &&
      typeof v === "object" &&
      !Array.isArray(v) &&
      target[k] &&
      typeof target[k] === "object" &&
      !Array.isArray(target[k])
    ) {
      deepMerge(target[k], v);
    } else {
      target[k] = v;
    }
  }
}

/**
 * Rewrite shadcn's registry-internal import paths to the form the shadcn
 * CLI installs on disk. Raw registry items reference each other via
 * `@/registry/new-york/...` (the source repo layout); installed projects
 * see them at `@/components/ui/...`, `@/hooks/...`, `@/lib/...`. The CLI
 * does this rewrite at install time; we do it at sync time.
 */
function rewriteRegistryImports(content) {
  return content
    .replace(/@\/registry\/new-york\/ui\//g, "@/components/ui/")
    .replace(/@\/registry\/new-york\/hooks\//g, "@/hooks/")
    .replace(/@\/registry\/new-york\/lib\//g, "@/lib/");
}

async function processItem(name) {
  if (visited.has(name)) return;
  visited.add(name);
  const item = await fetchItem(name);
  console.log(`[sync] ${name}: ${(item.files ?? []).length} file(s)`);
  for (const file of item.files ?? []) {
    await writeRel(file.path, rewriteRegistryImports(file.content));
  }
  if (item.cssVars?.light) Object.assign(merged.cssVarsLight, item.cssVars.light);
  if (item.cssVars?.dark) Object.assign(merged.cssVarsDark, item.cssVars.dark);
  if (item.tailwind?.config?.theme?.extend) {
    deepMerge(merged.tailwindExtend, item.tailwind.config.theme.extend);
  }
  for (const d of item.dependencies ?? []) merged.npmDeps.add(d);
  for (const dep of item.registryDependencies ?? []) {
    if (!dep.startsWith("http")) await processItem(dep);
  }
}

function buildGlobalsCss() {
  // Reproduces the shape the shadcn CLI writes for new-york installs:
  // base CSS variables on :root + per-component additions, dark variants
  // on .dark. We seed the base set ourselves (the registry only ships
  // per-component variables, not the init-time base).
  const light = { ...NEW_YORK_LIGHT_BASE, ...merged.cssVarsLight };
  const dark = { ...merged.cssVarsDark };
  const lines = [
    "@tailwind base;",
    "@tailwind components;",
    "@tailwind utilities;",
    "",
    "@layer base {",
    "  :root {",
    ...Object.entries(light).map(([k, v]) => `    --${k}: ${v};`),
    "  }",
    "",
    "  .dark {",
    ...Object.entries(dark).map(([k, v]) => `    --${k}: ${v};`),
    "  }",
    "}",
    "",
    "@layer base {",
    "  * {",
    "    @apply border-border;",
    "  }",
    "  body {",
    "    @apply bg-background text-foreground;",
    "  }",
    "}",
    "",
  ];
  return lines.join("\n");
}

function stripVersionTag(name) {
  // The registry sometimes returns names with @latest or @beta suffixes.
  // We want bare names so the generator can pin major versions itself.
  const at = name.lastIndexOf("@");
  if (at <= 0) return name;
  // Keep the leading @ for scoped packages like @radix-ui/react-slot.
  if (at === 0) return name;
  return name.slice(0, at);
}

async function main() {
  // Drop everything we own under template/shadcn/ (sidecars + the snapshot).
  // We don't touch other files; this script's writes are exclusive.
  await rm(join(TEMPLATE, "components"), { recursive: true, force: true });
  await rm(join(TEMPLATE, "lib"), { recursive: true, force: true });
  await rm(join(TEMPLATE, "hooks"), { recursive: true, force: true });

  for (const name of COMPONENTS) {
    await processItem(name);
  }

  // Merge the per-component tailwind extensions on top of the base
  // shadcn-init color/radius mappings so the generated tailwind.config.ts
  // has everything `bg-primary`, `border-border`, sidebar.*, etc. need.
  deepMerge(merged.tailwindExtend, NEW_YORK_TAILWIND_BASE);
  // Normalize and add the manual extras the registry doesn't surface.
  const finalDeps = new Set(
    [...merged.npmDeps].map(stripVersionTag).concat(EXTRA_DEPS),
  );

  await writeRel("globals.css", buildGlobalsCss());
  await writeRel(
    "tailwind-extend.json",
    JSON.stringify(merged.tailwindExtend, null, 2) + "\n",
  );
  await writeRel(
    "dependencies.json",
    JSON.stringify({ dependencies: [...finalDeps].sort() }, null, 2) + "\n",
  );

  console.log(
    `[sync] OK — ${visited.size} items synced, ` +
      `${Object.keys({ ...NEW_YORK_LIGHT_BASE, ...merged.cssVarsLight }).length} CSS vars (light), ` +
      `${finalDeps.size} npm dependencies.`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

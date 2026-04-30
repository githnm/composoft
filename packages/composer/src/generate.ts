import { readFile, mkdir, writeFile } from "node:fs/promises";
import { dirname, join, relative as pathRelative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { Composition } from "@composoft/runtime";

type GenerateInput = {
  outDir: string;
  /** Bare package name from the registry's package.json (e.g. "@acme/registry"). */
  registryPackageName: string;
  /** Absolute, real (symlink-resolved) path to the registry package directory. */
  registryDir: string;
  composition: Composition;
  contextSchemaTs: string;
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
  const { outDir, registryPackageName, registryDir, composition, contextSchemaTs } = input;
  const root = resolve(outDir);
  const registryRelative = posixify(pathRelative(root, registryDir));
  const composerVersion = await readComposerVersion();
  const written: string[] = [];

  async function write(relative: string, content: string) {
    const path = join(root, relative);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, content, "utf8");
    written.push(relative);
  }

  await write(
    "package.json",
    projectPackageJson(composition.name, registryPackageName, registryRelative, composerVersion),
  );
  await write("tsconfig.json", projectTsConfig());
  await write("next.config.mjs", nextConfig());
  await write("tailwind.config.ts", tailwindConfig(registryRelative));
  await write("postcss.config.mjs", postcssConfig());
  await write(".gitignore", gitignore());
  await write(".env.example", envExampleFile());
  await write("README.md", generatedReadme(composition.name, registryPackageName));
  await write("app/layout.tsx", appLayout(composition.name));
  await write("app/globals.css", globalsCss());
  await write("lib/registry.ts", registryRedirect(registryPackageName));
  await write("lib/context.ts", contextSchemaTs);
  await write("lib/composition.ts", compositionTs(composition));

  for (const page of composition.pages) {
    const segment = pagePathToSegment(page.path);
    await write(`app${segment}/page.tsx`, pageFile(page.path));
  }

  await write("app/api/composoft/action/route.ts", actionRouteFile());
  await write("app/api/composoft/resolve/route.ts", resolveRouteFile());

  return { files: written };
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

function projectPackageJson(
  name: string,
  registryPackageName: string,
  registryRelative: string,
  composerVersion: string,
): string {
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
        dependencies: {
          [registryPackageName]: `file:${registryRelative}`,
          "@composoft/runtime": `^${composerVersion}`,
          next: "^15.0.0",
          react: "^19.0.0",
          "react-dom": "^19.0.0",
          tailwindcss: "^3.4.0",
          autoprefixer: "^10.4.0",
          postcss: "^8.4.0",
          zod: "^3.23.8",
        },
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

function tailwindConfig(registryRelative: string): string {
  // Block components live in the registry package; Tailwind needs to see
  // their .tsx so utility classes in className attributes survive the
  // bundle. The relative path is computed from the resolved registry
  // package directory so this works whether the registry is a sibling
  // workspace package, a local path dep, or installed from the registry.
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

function appLayout(appName: string): string {
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

function globalsCss(): string {
  return `@tailwind base;
@tailwind components;
@tailwind utilities;
`;
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

function pageFile(pagePath: string): string {
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
      pagePath=${JSON.stringify(pagePath)}
    />
  );
}
`;
}

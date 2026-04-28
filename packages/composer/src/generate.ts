import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import type { Composition } from "@composoft/runtime";

type GenerateInput = {
  outDir: string;
  registryPackage: string;
  composition: Composition;
  contextSchemaTs: string;
};

/**
 * Generate a Next.js 14 App Router project that renders the given
 * composition. Intentionally minimal: no auth, no middleware, no API routes,
 * no error boundaries beyond Next's defaults. The shape an FDE forks from.
 */
export async function generateNextApp(input: GenerateInput): Promise<{ files: string[] }> {
  const { outDir, registryPackage, composition, contextSchemaTs } = input;
  const root = resolve(outDir);
  const written: string[] = [];

  async function write(relative: string, content: string) {
    const path = join(root, relative);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, content, "utf8");
    written.push(relative);
  }

  await write("package.json", projectPackageJson(composition.name, registryPackage));
  await write("tsconfig.json", projectTsConfig());
  await write("next.config.mjs", nextConfig());
  await write("tailwind.config.ts", tailwindConfig());
  await write("postcss.config.mjs", postcssConfig());
  await write(".gitignore", gitignore());
  await write("app/layout.tsx", appLayout(composition.name));
  await write("app/globals.css", globalsCss());
  await write("lib/registry.ts", registryRedirect(registryPackage));
  await write("lib/context.ts", contextSchemaTs);
  await write("lib/composition.ts", compositionTs(composition));

  for (const page of composition.pages) {
    const segment = pagePathToSegment(page.path);
    await write(`app${segment}/page.tsx`, pageFile(page.path));
  }

  await write("app/api/composoft/action/route.ts", actionRouteFile());

  return { files: written };
}

function pagePathToSegment(path: string): string {
  if (path === "/") return "";
  return path.startsWith("/") ? path : `/${path}`;
}

function projectPackageJson(name: string, registryPackage: string): string {
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
          [registryPackage]: "workspace:*",
          "@composoft/runtime": "workspace:*",
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

function tailwindConfig(): string {
  return `import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
    "../../packages/registry-acme/dist/**/*.{js,jsx}",
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
.DS_Store
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

function registryRedirect(registryPackage: string): string {
  return `export { registry } from ${JSON.stringify(registryPackage)};
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
import { bindActions } from "@composoft/runtime";
import { registry } from "@/lib/registry";
import { composition } from "@/lib/composition";
import { contextSchema } from "@/lib/context";

const requestSchema = z.object({
  blockInstanceId: z.string().min(1),
  actionName: z.string().min(1),
  input: z.unknown(),
  context: z.unknown(),
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
  const { blockInstanceId, actionName, input, context } = parsed.data;

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

  // Validate the caller's context against the page's contextSchema, then
  // run the registry's enrichment (same path the page render uses).
  const validatedContext = contextSchema.safeParse(context);
  if (!validatedContext.success) {
    return NextResponse.json(
      { error: "invalid context", detail: validatedContext.error.issues },
      { status: 400 },
    );
  }
  const enrichedContext = registry.enrichContext
    ? await registry.enrichContext(validatedContext.data, registry)
    : validatedContext.data;

  const validatedConfig = block.config.parse(instanceConfig);

  const actions = bindActions(block, registry, enrichedContext, validatedConfig);
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

import { readFile, realpath, stat } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, isAbsolute, resolve as pathResolve } from "node:path";
import { pathToFileURL } from "node:url";

/**
 * Result of resolving a `--registry` argument. The CLI accepts:
 *   - a relative path to a directory:           ./my-registry
 *   - a relative path to a built JS entry:      ./my-registry/dist/index.js
 *   - an absolute path of either flavor:        /Users/h/my-registry
 *   - a bare module name node can resolve:      @composoft/registry-example-postgres, my-registry
 *
 * In every case we end up with: the imported module (so we can read
 * `registry`), the package's directory (so we can compute relative paths
 * for the generated app's package.json / tailwind glob), and the package
 * name (so the generated app's `lib/registry.ts` re-exports by name).
 */
export type ResolvedRegistry = {
  module: { registry?: unknown };
  /** Absolute, real (symlink-resolved) path to the package directory. */
  packageDir: string;
  packageName: string;
};

export async function resolveRegistry(
  input: string,
  cwd: string = process.cwd(),
): Promise<ResolvedRegistry> {
  const looksLikePath =
    input.startsWith("./") ||
    input.startsWith("../") ||
    input.startsWith("file:") ||
    isAbsolute(input);

  if (looksLikePath) {
    return resolveByPath(input, cwd);
  }
  return resolveByModuleName(input, cwd);
}

async function resolveByPath(input: string, cwd: string): Promise<ResolvedRegistry> {
  const cleaned = input.startsWith("file:") ? input.slice(5) : input;
  const abs = pathResolve(cwd, cleaned);
  let stats;
  try {
    stats = await stat(abs);
  } catch {
    throw new Error(`registry path does not exist: ${abs}`);
  }

  if (stats.isDirectory()) {
    const pkgPath = pathResolve(abs, "package.json");
    const pkg = await readPackageJson(pkgPath);
    const entry = resolveMainEntry(pkg);
    if (!entry) {
      throw new Error(
        `registry at ${abs} has no resolvable entry — its package.json needs "main" or "exports".`,
      );
    }
    const entryAbs = pathResolve(abs, entry);
    await assertEntryBuilt(entryAbs);
    const module = (await import(pathToFileURL(entryAbs).href)) as { registry?: unknown };
    return {
      module,
      packageDir: await realpath(abs),
      packageName: extractPackageName(pkg),
    };
  }

  // Single-file path: import directly, walk up for package.json.
  const module = (await import(pathToFileURL(abs).href)) as { registry?: unknown };
  const packageDir = await findPackageRoot(abs);
  const pkg = await readPackageJson(pathResolve(packageDir, "package.json"));
  return {
    module,
    packageDir: await realpath(packageDir),
    packageName: extractPackageName(pkg),
  };
}

async function resolveByModuleName(
  name: string,
  cwd: string,
): Promise<ResolvedRegistry> {
  // Resolve the package's package.json — every package must expose
  // ./package.json, and this works for ESM-only packages whose `exports`
  // map omits the CommonJS `require` condition (which would otherwise
  // make a plain `require.resolve(name)` fail).
  const require = createRequire(pathToFileURL(pathResolve(cwd, "noop.js")).href);
  let pkgPath: string;
  try {
    pkgPath = require.resolve(`${name}/package.json`);
  } catch {
    throw new Error(
      `could not resolve registry "${name}". Pass a path (./my-registry) or install the package.`,
    );
  }
  const pkg = await readPackageJson(pkgPath);
  const entry = resolveMainEntry(pkg);
  if (!entry) {
    throw new Error(
      `registry package "${name}" has no resolvable entry — its package.json needs "main" or "exports".`,
    );
  }
  const packageDir = dirname(pkgPath);
  const entryAbs = pathResolve(packageDir, entry);
  await assertEntryBuilt(entryAbs);
  const module = (await import(pathToFileURL(entryAbs).href)) as { registry?: unknown };
  return {
    module,
    packageDir: await realpath(packageDir),
    packageName: extractPackageName(pkg),
  };
}

async function readPackageJson(path: string): Promise<Record<string, unknown>> {
  try {
    const raw = await readFile(path, "utf8");
    return JSON.parse(raw) as Record<string, unknown>;
  } catch (e) {
    throw new Error(`could not read package.json at ${path}: ${(e as Error).message}`);
  }
}

function extractPackageName(pkg: Record<string, unknown>): string {
  if (typeof pkg.name !== "string" || pkg.name.length === 0) {
    throw new Error("registry's package.json is missing a `name` field");
  }
  return pkg.name;
}

function resolveMainEntry(pkg: Record<string, unknown>): string | null {
  if (typeof pkg.main === "string") return pkg.main;
  const exp = pkg.exports;
  if (typeof exp === "string") return exp;
  if (exp && typeof exp === "object") {
    const root = (exp as Record<string, unknown>)["."];
    if (typeof root === "string") return root;
    if (root && typeof root === "object") {
      const r = root as Record<string, unknown>;
      if (typeof r.import === "string") return r.import;
      if (typeof r.default === "string") return r.default;
    }
  }
  if (typeof pkg.module === "string") return pkg.module;
  return null;
}

async function findPackageRoot(filePath: string): Promise<string> {
  let dir = dirname(filePath);
  for (;;) {
    try {
      await stat(pathResolve(dir, "package.json"));
      return dir;
    } catch {
      // keep walking
    }
    const parent = dirname(dir);
    if (parent === dir) {
      throw new Error(`no package.json found above ${filePath}`);
    }
    dir = parent;
  }
}

async function assertEntryBuilt(path: string): Promise<void> {
  try {
    await stat(path);
  } catch {
    throw new Error(
      `registry main entry not found at ${path}. Did you run \`pnpm build\` in the registry?`,
    );
  }
}

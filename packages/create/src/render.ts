import { mkdir, readFile, readdir, writeFile, stat } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";

/**
 * Variables exposed to template files (`*.template` and the legacy `*.tmpl`
 * suffix). Keep this set small; templates that need data should put it in
 * template files where substitution is explicit.
 *
 * The three the user-facing spec promises (`packageName`, `registryName`,
 * `registryVersion`) are the canonical set going forward; the others are
 * kept for the existing TODO template's READMEs.
 */
export type TemplateContext = {
  /** npm package name as the user typed it (e.g. "my-support"). */
  packageName: string;
  /** Lowercase id used in the Registry.name field (e.g. "my-support"). */
  registryName: string;
  /** Initial Registry.version. Always "0.0.1" today. */
  registryVersion: string;
  /** packageName with @-scope and slashes stripped — safe for filesystem use. */
  packageNameSafe: string;
  /** Last segment of the target directory. */
  dirName: string;
  /** Free-form domain string used in seed-data comments, READMEs. */
  domain: string;
  /** Current calendar year. */
  year: number;
};

/**
 * File extensions that indicate variable substitution should run on the
 * file's content. Anything else is copied byte-for-byte.
 *
 * `.template` is the canonical going-forward suffix per the create spec.
 * `.tmpl` is preserved for back-compat with templates already on disk.
 */
const TEMPLATE_SUFFIXES = [".template", ".tmpl"] as const;

function templateOutputName(name: string): { outputName: string; isTemplate: boolean } {
  for (const suffix of TEMPLATE_SUFFIXES) {
    if (name.endsWith(suffix)) {
      return { outputName: name.slice(0, -suffix.length), isTemplate: true };
    }
  }
  return { outputName: name, isTemplate: false };
}

/**
 * Render a single file (or copy verbatim if its name doesn't carry a
 * template suffix). Substitution rule is dumb: regex `{{key}}` — the keys
 * that resolve are the keys of TemplateContext.
 */
export async function renderFile(
  sourcePath: string,
  destPath: string,
  context: TemplateContext,
): Promise<void> {
  await mkdir(dirname(destPath), { recursive: true });
  const sourceBase = sourcePath.split("/").pop() ?? sourcePath;
  const { isTemplate } = templateOutputName(sourceBase);
  if (isTemplate) {
    const raw = await readFile(sourcePath, "utf8");
    const rendered = substitute(raw, context);
    const finalDest = trimTemplateSuffix(destPath);
    await writeFile(finalDest, rendered, "utf8");
  } else {
    // Binary-safe path: read as Buffer, write as Buffer. Avoids corrupting
    // images / fonts / anything non-utf8 a future template might ship.
    const raw = await readFile(sourcePath);
    await writeFile(destPath, raw);
  }
}

function trimTemplateSuffix(path: string): string {
  for (const suffix of TEMPLATE_SUFFIXES) {
    if (path.endsWith(suffix)) return path.slice(0, -suffix.length);
  }
  return path;
}

function substitute(text: string, context: TemplateContext): string {
  return text.replace(/\{\{(\w+)\}\}/g, (match, key: string) => {
    if (key in context) {
      const value = context[key as keyof TemplateContext];
      return String(value);
    }
    return match;
  });
}

/**
 * Walk a template directory recursively, rendering every file into `destDir`
 * with the same relative layout. Strips template suffixes on the way out.
 *
 * `manifest.json` (if present at the template root) is the catalog metadata
 * the CLI reads to populate the interactive picker — it's not an output
 * artifact, so we skip it.
 */
export async function renderTemplate(
  templateDir: string,
  destDir: string,
  context: TemplateContext,
): Promise<string[]> {
  const written: string[] = [];
  await mkdir(destDir, { recursive: true });
  await walk(templateDir, templateDir, destDir, context, written);
  return written;
}

async function walk(
  rootDir: string,
  currentDir: string,
  destDir: string,
  context: TemplateContext,
  written: string[],
): Promise<void> {
  const entries = await readdir(currentDir);
  for (const name of entries) {
    const sourcePath = join(currentDir, name);
    const stats = await stat(sourcePath);
    if (stats.isDirectory()) {
      await walk(rootDir, sourcePath, destDir, context, written);
    } else {
      const rel = relative(rootDir, sourcePath);
      // Skip the manifest — it's metadata for the CLI picker, not output.
      if (rel === "manifest.json") continue;
      const destPath = resolve(destDir, rel);
      await renderFile(sourcePath, destPath, context);
      const writtenRel = trimTemplateSuffix(rel);
      written.push(writtenRel);
    }
  }
}

import { mkdir, readFile, readdir, writeFile, stat } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";

/**
 * Variables exposed to `.tmpl` files. Keep this set small; templates that
 * need data should put it in `.tmpl` files where substitution is explicit.
 */
export type TemplateContext = {
  packageName: string;
  packageNameSafe: string;
  dirName: string;
  domain: string;
  year: number;
};

/**
 * Render a template file (or copy verbatim if it doesn't end in `.tmpl`).
 * Substitution is regex `{{key}}` — keep this dumb on purpose; if the rules
 * grow, switch to a real template lib at that point.
 */
export async function renderFile(
  sourcePath: string,
  destPath: string,
  context: TemplateContext,
): Promise<void> {
  await mkdir(dirname(destPath), { recursive: true });
  if (sourcePath.endsWith(".tmpl")) {
    const raw = await readFile(sourcePath, "utf8");
    const rendered = substitute(raw, context);
    const finalDest = destPath.replace(/\.tmpl$/, "");
    await writeFile(finalDest, rendered, "utf8");
  } else {
    const raw = await readFile(sourcePath);
    await writeFile(destPath, raw);
  }
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
 * with the same relative layout. Strips `.tmpl` extensions on the way out.
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
      const destPath = resolve(destDir, rel);
      await renderFile(sourcePath, destPath, context);
      written.push(rel.replace(/\.tmpl$/, ""));
    }
  }
}

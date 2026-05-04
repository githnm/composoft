// Catalog test for the create package's templates. Runs in two layers:
//
//   1. Static checks: every template under template/ has a manifest.json
//      whose counts match the on-disk file counts (adapters/workflows/blocks).
//   2. Render check: scaffold each template into a tmpdir with the public
//      renderTemplate() API and confirm no `{{key}}` placeholders survive.
//
// Manifest validation against @composoft/spec runs as part of each
// scaffolded registry's own `pnpm test` and is not duplicated here.
//
// Run via `pnpm --filter @composoft/create test` (after `pnpm build`).

import { mkdtemp, readFile, readdir, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { renderTemplate, type TemplateContext } from "./render.js";
import { TEMPLATE_IDS, type TemplateId } from "./templates.js";

const here = fileURLToPath(import.meta.url);
// dist/_test.js → ../template
const templatesRoot = resolve(here, "..", "..", "template");

const failures: string[] = [];

function record(scope: string, fn: () => void | Promise<void>) {
  return Promise.resolve()
    .then(fn)
    .catch((e: unknown) => {
      failures.push(`${scope}: ${e instanceof Error ? e.message : String(e)}`);
    });
}

async function countBlockManifests(blocksDir: string): Promise<number> {
  let entries: string[];
  try {
    entries = await readdir(blocksDir);
  } catch {
    return 0;
  }
  // Block manifests are `<name>.ts` (no `-types.ts`, no `.component.tsx`).
  const stems = new Set<string>();
  for (const e of entries) {
    if (e.endsWith("-types.ts")) continue;
    if (e.endsWith(".component.tsx")) continue;
    if (!e.endsWith(".ts")) continue;
    stems.add(e.slice(0, -".ts".length));
  }
  return stems.size;
}

async function countTsFiles(dir: string): Promise<number> {
  try {
    const entries = await readdir(dir);
    return entries.filter((e) => e.endsWith(".ts") && !e.startsWith("_")).length;
  } catch {
    return 0;
  }
}

async function checkManifestCounts(id: TemplateId): Promise<void> {
  const root = join(templatesRoot, id);
  const manifestPath = join(root, "manifest.json");
  const raw = await readFile(manifestPath, "utf8");
  const manifest = JSON.parse(raw) as {
    name: string;
    description: string;
    domain: string;
    counts: { adapters: number; workflows: number; blocks: number };
  };
  if (!manifest.name || !manifest.description || !manifest.counts) {
    throw new Error(`${id}: manifest missing required fields`);
  }
  const adapters = await countTsFiles(join(root, "src", "adapters"));
  const workflows = await countTsFiles(join(root, "src", "workflows"));
  const blocks = await countBlockManifests(join(root, "src", "blocks"));
  if (adapters !== manifest.counts.adapters) {
    throw new Error(
      `${id}: manifest claims ${manifest.counts.adapters} adapters but src/adapters has ${adapters} .ts files`,
    );
  }
  if (workflows !== manifest.counts.workflows) {
    throw new Error(
      `${id}: manifest claims ${manifest.counts.workflows} workflows but src/workflows has ${workflows} .ts files`,
    );
  }
  if (blocks !== manifest.counts.blocks) {
    throw new Error(
      `${id}: manifest claims ${manifest.counts.blocks} blocks but src/blocks has ${blocks} block manifest files`,
    );
  }
}

async function walkAll(dir: string, out: string[]): Promise<void> {
  const entries = await readdir(dir);
  for (const e of entries) {
    const full = join(dir, e);
    const s = await stat(full);
    if (s.isDirectory()) await walkAll(full, out);
    else out.push(full);
  }
}

async function checkRender(id: TemplateId): Promise<void> {
  const tmp = await mkdtemp(join(tmpdir(), `composoft-create-${id}-`));
  try {
    const context: TemplateContext = {
      packageName: `test-${id}`,
      registryName: `test-${id}`,
      registryVersion: "0.0.1",
      packageNameSafe: `test-${id}`,
      dirName: `test-${id}`,
      domain: id,
      year: new Date().getFullYear(),
    };
    await renderTemplate(join(templatesRoot, id), tmp, context);
    // No file may contain a leftover `{{ key }}` — that means a placeholder
    // wasn't substituted because the file's name lacked a `.template` suffix.
    const all: string[] = [];
    await walkAll(tmp, all);
    const placeholderRe = /\{\{[a-zA-Z]+\}\}/;
    const offenders: string[] = [];
    for (const f of all) {
      const text = await readFile(f, "utf8").catch(() => "");
      if (placeholderRe.test(text)) {
        offenders.push(f.slice(tmp.length + 1));
      }
    }
    if (offenders.length > 0) {
      throw new Error(
        `${id}: rendered output still contains {{...}} placeholders in: ${offenders.join(", ")}`,
      );
    }
    // The rendered output must NOT contain any *.template or *.tmpl files.
    const stillTemplates = all.filter(
      (f) => f.endsWith(".template") || f.endsWith(".tmpl"),
    );
    if (stillTemplates.length > 0) {
      throw new Error(
        `${id}: rendered output still has template-suffix files: ${stillTemplates.map((f) => f.slice(tmp.length + 1)).join(", ")}`,
      );
    }
    // The rendered output must NOT include manifest.json (it's metadata, not output).
    if (all.some((f) => f === join(tmp, "manifest.json"))) {
      throw new Error(`${id}: rendered output included manifest.json`);
    }
  } finally {
    await rm(tmp, { recursive: true, force: true });
  }
}

for (const id of TEMPLATE_IDS) {
  await record(`manifest counts: ${id}`, () => checkManifestCounts(id));
  await record(`render: ${id}`, () => checkRender(id));
}

if (failures.length > 0) {
  console.error(`FAIL — ${failures.length} issue${failures.length === 1 ? "" : "s"}:`);
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}

console.log(
  `OK — ${TEMPLATE_IDS.length} templates verified: ${TEMPLATE_IDS.join(", ")}.\n` +
    "  manifest counts match on-disk file counts; renders produce no leftover placeholders or template-suffix files.",
);

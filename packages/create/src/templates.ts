import { readFile, readdir, stat } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Metadata sidecar each template ships at its root. Surfaces the human-
 * readable name + tagline to the interactive picker, plus counts so the
 * CLI can echo them back to the user after scaffold completes ("8 adapters,
 * 5 workflows, 6 blocks").
 */
export type TemplateManifest = {
  /** Display name shown in the picker. */
  readonly name: string;
  /** Short one-line description shown next to the name. */
  readonly description: string;
  /** Domain noun used in generated README seed-data comments. */
  readonly domain: string;
  readonly counts: {
    readonly adapters: number;
    readonly workflows: number;
    readonly blocks: number;
  };
};

export type TemplateInfo = TemplateManifest & {
  /** Identifier used as the --template value (matches the directory name). */
  readonly id: TemplateId;
  /** Absolute path to the template's source directory. */
  readonly path: string;
};

/**
 * All template ids known to the CLI. Order matters: the picker shows them
 * in this order, and the first entry is the default. `todo` stays first so
 * adopters who Enter past the prompt get the minimal scaffold (and so the
 * `--yes` no-args path is unchanged from earlier alphas).
 */
export const TEMPLATE_IDS = ["todo", "support", "booking", "operations"] as const;

export type TemplateId = (typeof TEMPLATE_IDS)[number];

export function isTemplateId(value: string): value is TemplateId {
  return (TEMPLATE_IDS as readonly string[]).includes(value);
}

/**
 * Resolve `packages/create/template/` from the running CLI module. This
 * matches the existing layout: `dist/cli.js` is one level below the
 * package root, and `template/` sits next to `dist/`.
 */
export function templatesRoot(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  return resolve(here, "..", "template");
}

async function readManifest(path: string): Promise<TemplateManifest> {
  const raw = await readFile(path, "utf8");
  const parsed = JSON.parse(raw) as TemplateManifest;
  // Cheap shape check — bad manifests would be a pre-publish bug, but
  // surfacing a clear error here beats a cryptic crash later.
  if (!parsed.name || !parsed.description || !parsed.counts) {
    throw new Error(`template manifest at ${path} is missing required fields`);
  }
  return parsed;
}

/**
 * Load every template under `template/` that has a manifest.json. The CLI
 * uses this to populate the picker and to validate `--template <name>`.
 */
export async function loadTemplates(): Promise<TemplateInfo[]> {
  const root = templatesRoot();
  const entries = await readdir(root);
  const out: TemplateInfo[] = [];
  for (const id of TEMPLATE_IDS) {
    if (!entries.includes(id)) continue;
    const path = resolve(root, id);
    const s = await stat(path);
    if (!s.isDirectory()) continue;
    const manifest = await readManifest(resolve(path, "manifest.json"));
    out.push({ id, path, ...manifest });
  }
  return out;
}

export async function loadTemplate(id: TemplateId): Promise<TemplateInfo> {
  const root = templatesRoot();
  const path = resolve(root, id);
  const manifest = await readManifest(resolve(path, "manifest.json"));
  return { id, path, ...manifest };
}

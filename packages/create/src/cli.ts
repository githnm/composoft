#!/usr/bin/env node
import { readdir, stat } from "node:fs/promises";
import { basename, resolve, relative } from "node:path";
import { spawn } from "node:child_process";
import * as p from "@clack/prompts";
import { renderTemplate, type TemplateContext } from "./render.js";
import { isValidPackageName, runPrompts, type Defaults } from "./prompts.js";
import {
  isTemplateId,
  loadTemplate,
  loadTemplates,
  TEMPLATE_IDS,
  type TemplateId,
  type TemplateInfo,
} from "./templates.js";

type Args = {
  targetDir?: string;
  templateId?: string;
  yes: boolean;
  skipInstall: boolean;
  help: boolean;
};

function parseArgs(argv: string[]): Args {
  const args: Args = { yes: false, skipInstall: false, help: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === undefined) continue;
    if (arg === "--yes" || arg === "-y") args.yes = true;
    else if (arg === "--no-install") args.skipInstall = true;
    else if (arg === "--help" || arg === "-h") args.help = true;
    else if (arg === "--template") {
      const next = argv[i + 1];
      if (next === undefined) {
        console.error("--template requires a value (one of: " + TEMPLATE_IDS.join(", ") + ")");
        process.exit(2);
      }
      args.templateId = next;
      i++;
    } else if (arg.startsWith("--template=")) {
      args.templateId = arg.slice("--template=".length);
    } else if (!arg.startsWith("-")) {
      args.targetDir = arg;
    }
  }
  return args;
}

function printUsage(): void {
  console.log(
    [
      "Usage: npx @composoft/create <directory> [options]",
      "",
      "Scaffold a new composoft registry from a working template.",
      "",
      "  <directory>           where to create the registry. Will be created if missing.",
      "  --template <name>     pick a template (skips the interactive picker)",
      "                        names: " + TEMPLATE_IDS.join(", "),
      "  --yes, -y             accept all defaults; skip interactive prompts",
      "                        (combined with no --template, defaults to `todo`)",
      "  --no-install          skip the post-scaffold dependency install",
      "  --help, -h            show this help",
      "",
      "Templates",
      "  todo         Minimal baseline. One adapter, one workflow, one block.",
      "  support      Modern B2B support inbox with multi-channel tickets and account context.",
      "  booking      Calendly-shaped scheduling with event types, hosts, and bookings.",
      "  operations   Inventory + procurement: products, stock levels, purchase orders.",
      "",
      "Examples",
      "  npx @composoft/create my-registry",
      "  npx @composoft/create my-support --template support",
      "  npx @composoft/create my-booking --template booking --yes",
    ].join("\n"),
  );
}

async function isDirEmpty(dir: string): Promise<boolean> {
  try {
    const entries = await readdir(dir);
    return entries.length === 0;
  } catch {
    return true; // doesn't exist yet — fine
  }
}

async function dirExists(dir: string): Promise<boolean> {
  try {
    const s = await stat(dir);
    return s.isDirectory();
  } catch {
    return false;
  }
}

function defaultPackageName(dir: string): string {
  const name = basename(dir).toLowerCase().replace(/[^a-z0-9-]/g, "-");
  return isValidPackageName(name) ? name : "my-registry";
}

async function runInstall(dir: string): Promise<{ ok: boolean; cmd: string; error?: string }> {
  for (const cmd of ["pnpm", "npm"] as const) {
    try {
      await new Promise<void>((resolveExec, rejectExec) => {
        const child = spawn(cmd, ["install"], { cwd: dir, stdio: "inherit" });
        child.on("error", rejectExec);
        child.on("exit", (code) =>
          code === 0 ? resolveExec() : rejectExec(new Error(`${cmd} install exited ${code}`)),
        );
      });
      return { ok: true, cmd };
    } catch (e) {
      // try next
      if (cmd === "npm") {
        return { ok: false, cmd, error: (e as Error).message };
      }
    }
  }
  return { ok: false, cmd: "npm", error: "no installer found" };
}

async function resolveTemplateChoice(
  args: Args,
  catalog: TemplateInfo[],
): Promise<TemplateId | "interactive"> {
  if (args.templateId !== undefined) {
    if (!isTemplateId(args.templateId)) {
      console.error(
        `Unknown template "${args.templateId}". Available: ${TEMPLATE_IDS.join(", ")}.`,
      );
      process.exit(2);
    }
    return args.templateId;
  }
  if (args.yes) {
    // Backward compat: --yes without --template falls back to the minimal
    // todo baseline so existing scripted callers don't suddenly get a
    // different scaffold.
    return "todo";
  }
  // Else the interactive runPrompts() picker handles selection.
  return "interactive";
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printUsage();
    return;
  }

  const catalog = await loadTemplates();
  if (catalog.length === 0) {
    console.error("No templates found under packages/create/template/. The package is broken.");
    process.exit(1);
  }

  let targetDir = args.targetDir;

  if (!targetDir && !args.yes) {
    p.intro("composoft: scaffold a new registry");
    const where = await p.text({
      message: "Target directory",
      placeholder: "./my-registry",
      validate: (v) => (v ? undefined : "Required"),
    });
    if (p.isCancel(where)) {
      p.cancel("Cancelled.");
      process.exitCode = 1;
      return;
    }
    targetDir = String(where);
  }

  if (!targetDir) {
    console.error("Target directory is required. Run with --help for usage.");
    process.exitCode = 2;
    return;
  }

  const absoluteDir = resolve(process.cwd(), targetDir);

  if ((await dirExists(absoluteDir)) && !(await isDirEmpty(absoluteDir))) {
    console.error(`Target directory is not empty: ${absoluteDir}`);
    process.exitCode = 1;
    return;
  }

  const presetTemplate = await resolveTemplateChoice(args, catalog);

  const defaults: Defaults = {
    packageName: defaultPackageName(absoluteDir),
    domain: "todo list",
    templateId: presetTemplate === "interactive" ? "todo" : presetTemplate,
    installDeps: !args.skipInstall,
  };

  const answers =
    args.yes || presetTemplate !== "interactive"
      ? {
          packageName: defaults.packageName,
          domain:
            catalog.find((t) => t.id === defaults.templateId)?.domain ?? defaults.domain,
          templateId: defaults.templateId,
          installDeps: !args.skipInstall,
        }
      : await runPrompts(defaults, catalog);

  const template = await loadTemplate(answers.templateId);

  const context: TemplateContext = {
    packageName: answers.packageName,
    registryName: answers.packageName.replace(/^@[^/]+\//, "").toLowerCase(),
    registryVersion: "0.0.1",
    packageNameSafe: answers.packageName.replace(/^@/, "").replace(/\//g, "-"),
    dirName: basename(absoluteDir),
    domain: answers.domain,
    year: new Date().getFullYear(),
  };

  const written = await renderTemplate(template.path, absoluteDir, context);

  if (!args.yes && presetTemplate === "interactive") {
    p.note(
      `${written.length} files written to ${absoluteDir}`,
      "scaffold complete",
    );
  } else {
    console.log(`Wrote ${written.length} files to ${absoluteDir}`);
  }

  if (answers.installDeps) {
    const installResult = await runInstall(absoluteDir);
    if (!installResult.ok) {
      console.error(
        `Install failed (${installResult.cmd}): ${installResult.error ?? "unknown error"}`,
      );
      console.error(`Skipping install. Run \`${installResult.cmd} install\` in ${absoluteDir} manually.`);
    }
  }

  // Next steps. Counts come from the chosen template's manifest so the
  // banner is honest about what just got written.
  const { adapters, workflows, blocks } = template.counts;
  const relPath = relative(process.cwd(), absoluteDir) || ".";
  const lines = [
    "",
    `Created your registry at ${absoluteDir}`,
    `Template: ${template.name} — ${template.description}`,
    `Counts: ${adapters} adapter${adapters === 1 ? "" : "s"}, ${workflows} workflow${workflows === 1 ? "" : "s"}, ${blocks} block${blocks === 1 ? "" : "s"}`,
    "",
    "Next steps:",
    "",
    `  cd ${relPath}`,
    answers.installDeps ? null : "  pnpm install",
    "  pnpm test          # validates the manifests",
    "",
    "  # then edit src/blocks/, src/adapters/, src/workflows/ to fit your domain",
    "",
    "Once you have your registry, point the composoft composer at it:",
    "",
    `  npx @composoft/composer compose --brief brief.md --registry ${answers.packageName} --out ../app`,
    "",
    "Or compose against it: see README.md for a sample brief tailored to this template.",
    "",
  ].filter((l): l is string => l !== null);

  console.log(lines.join("\n"));
}

main().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : String(e));
  process.exitCode = 1;
});

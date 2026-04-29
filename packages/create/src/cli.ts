#!/usr/bin/env node
import { readdir, stat } from "node:fs/promises";
import { dirname, basename, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import * as p from "@clack/prompts";
import { renderTemplate, type TemplateContext } from "./render.js";
import { isValidPackageName, runPrompts, type Defaults } from "./prompts.js";

type Args = {
  targetDir?: string;
  yes: boolean;
  skipInstall: boolean;
  help: boolean;
};

function parseArgs(argv: string[]): Args {
  const args: Args = { yes: false, skipInstall: false, help: false };
  for (const arg of argv) {
    if (arg === "--yes" || arg === "-y") args.yes = true;
    else if (arg === "--no-install") args.skipInstall = true;
    else if (arg === "--help" || arg === "-h") args.help = true;
    else if (!arg.startsWith("-")) args.targetDir = arg;
  }
  return args;
}

function printUsage(): void {
  console.log(
    [
      "Usage: npx @composoft/create <directory> [--yes] [--no-install]",
      "",
      "Scaffold a new composoft registry from a template.",
      "",
      "  <directory>     where to create the registry. Will be created if missing.",
      "  --yes, -y       accept all defaults; skip interactive prompts",
      "  --no-install    skip the post-scaffold dependency install",
      "  --help, -h      show this help",
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

function templateDir(): string {
  // dist/cli.js → ../template
  const here = dirname(fileURLToPath(import.meta.url));
  return resolve(here, "..", "template");
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

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printUsage();
    return;
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

  const defaults: Defaults = {
    packageName: defaultPackageName(absoluteDir),
    domain: "todo list",
    installDeps: !args.skipInstall,
  };

  const answers = args.yes
    ? { ...defaults, installDeps: !args.skipInstall }
    : await runPrompts(defaults);

  const context: TemplateContext = {
    packageName: answers.packageName,
    packageNameSafe: answers.packageName.replace(/^@/, "").replace(/\//g, "-"),
    dirName: basename(absoluteDir),
    domain: answers.domain,
    year: new Date().getFullYear(),
  };

  const tplDir = templateDir();
  const written = await renderTemplate(tplDir, absoluteDir, context);

  if (!args.yes) {
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

  // Next steps
  const lines = [
    "",
    `Created your registry at ${absoluteDir}`,
    "",
    "Next steps:",
    "",
    `  cd ${targetDir}`,
    answers.installDeps ? null : "  pnpm install",
    "  pnpm test          # validates the manifests",
    "",
    "  # then edit src/blocks/, src/adapters/, src/workflows/ to fit your domain",
    "",
    "Once you have your registry, point the composoft composer at it:",
    "",
    `  npx @composoft/composer compose --brief brief.md --registry ${answers.packageName} --out ../app`,
    "",
  ].filter((l): l is string => l !== null);

  console.log(lines.join("\n"));
}

main().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : String(e));
  process.exitCode = 1;
});

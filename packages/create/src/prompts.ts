import * as p from "@clack/prompts";

export type Answers = {
  packageName: string;
  domain: string;
  installDeps: boolean;
};

export type Defaults = {
  packageName: string;
  domain: string;
  installDeps: boolean;
};

const NPM_NAME_RE = /^(?:@[a-z0-9][\w-.]*\/)?[a-z0-9][\w-.]*$/;

export function isValidPackageName(value: string): boolean {
  return NPM_NAME_RE.test(value) && value.length <= 214;
}

/**
 * Run interactive prompts. Returns the answers, or exits the process if the
 * user cancels (Ctrl-C). Defaults are pre-filled so the user can mash Enter.
 */
export async function runPrompts(defaults: Defaults): Promise<Answers> {
  p.intro("composoft: scaffold a new registry");

  const packageName = await p.text({
    message: "Package name",
    placeholder: defaults.packageName,
    initialValue: defaults.packageName,
    validate: (value) => {
      if (!value) return "Required";
      if (!isValidPackageName(value)) return "Must look like an npm package name";
      return undefined;
    },
  });
  if (p.isCancel(packageName)) {
    p.cancel("Cancelled.");
    process.exit(1);
  }

  const domain = await p.text({
    message: "Domain (used in README and seed data comments)",
    placeholder: defaults.domain,
    initialValue: defaults.domain,
  });
  if (p.isCancel(domain)) {
    p.cancel("Cancelled.");
    process.exit(1);
  }

  const installDeps = await p.confirm({
    message: "Install dependencies?",
    initialValue: defaults.installDeps,
  });
  if (p.isCancel(installDeps)) {
    p.cancel("Cancelled.");
    process.exit(1);
  }

  return {
    packageName: String(packageName),
    domain: String(domain),
    installDeps: Boolean(installDeps),
  };
}

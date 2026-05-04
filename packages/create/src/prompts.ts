import * as p from "@clack/prompts";
import type { TemplateId, TemplateInfo } from "./templates.js";

export type Answers = {
  packageName: string;
  domain: string;
  templateId: TemplateId;
  installDeps: boolean;
};

export type Defaults = {
  packageName: string;
  domain: string;
  templateId: TemplateId;
  installDeps: boolean;
};

const NPM_NAME_RE = /^(?:@[a-z0-9][\w-.]*\/)?[a-z0-9][\w-.]*$/;

export function isValidPackageName(value: string): boolean {
  return NPM_NAME_RE.test(value) && value.length <= 214;
}

/**
 * Run interactive prompts. Returns the answers, or exits the process if the
 * user cancels (Ctrl-C). Defaults are pre-filled so the user can mash Enter.
 *
 * Template selection comes first so the answers downstream (domain default
 * in particular) can be primed off the chosen template's metadata.
 */
export async function runPrompts(
  defaults: Defaults,
  templates: TemplateInfo[],
): Promise<Answers> {
  p.intro("composoft: scaffold a new registry");

  // @clack/prompts infers a strict literal union for `value` from the options;
  // we widen to `string` here and validate against the catalog right after.
  const templateId = await p.select({
    message: "Which template?",
    initialValue: defaults.templateId as string,
    options: templates.map((t) => ({
      value: t.id as string,
      label: t.name,
      hint: t.description,
    })),
  });
  if (p.isCancel(templateId)) {
    p.cancel("Cancelled.");
    process.exit(1);
  }
  const chosenTemplate = templates.find((t) => t.id === String(templateId));
  if (!chosenTemplate) {
    p.cancel(`Unknown template: ${String(templateId)}`);
    process.exit(1);
  }

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

  // Default the domain string off the chosen template's manifest so adopters
  // who blow through the prompts get something matched to what they picked.
  const domain = await p.text({
    message: "Domain (used in README and seed data comments)",
    placeholder: chosenTemplate.domain,
    initialValue: chosenTemplate.domain,
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
    templateId: chosenTemplate.id,
    installDeps: Boolean(installDeps),
  };
}

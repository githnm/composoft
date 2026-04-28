import type { Composition } from "@composoft/runtime";
import type { Registry } from "@composoft/spec";

export type CompositionIssue =
  | { kind: "unknown-block"; page: string; instanceId: string; blockId: string }
  | {
      kind: "config-invalid";
      page: string;
      instanceId: string;
      blockId: string;
      detail: string;
    }
  | {
      kind: "context-path-missing";
      page: string;
      instanceId: string;
      blockId: string;
      where: string;
      path: string;
    };

/**
 * Cross-validate a composition against the registry it targets:
 *   - Every block id resolves.
 *   - Every block instance's config validates against the block's config schema.
 *
 * Context-path checks are split out into `validateContextPaths` because they
 * also need the contextSchemaJson Claude returned.
 */
export function validateCompositionAgainstRegistry(
  composition: Composition,
  registry: Registry,
): CompositionIssue[] {
  const issues: CompositionIssue[] = [];
  for (const page of composition.pages) {
    for (const instance of page.blocks) {
      const block = registry.blocks[instance.id];
      if (!block) {
        issues.push({
          kind: "unknown-block",
          page: page.path,
          instanceId: instance.instanceId,
          blockId: instance.id,
        });
        continue;
      }

      const parsed = block.config.safeParse(instance.config);
      if (!parsed.success) {
        issues.push({
          kind: "config-invalid",
          page: page.path,
          instanceId: instance.instanceId,
          blockId: instance.id,
          detail: parsed.error.issues
            .map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`)
            .join("; "),
        });
      }
    }
  }
  return issues;
}

/**
 * Walk a permissive subset of JSON Schema to check whether a dot-path
 * resolves. We follow `properties` only — no `$ref`, `allOf`, `oneOf`, etc.
 * If the model emits a schema using those features, we fail closed: the
 * path is treated as missing and the CLI surfaces it. That's the right
 * default for v1 — better a false negative the user can debug than a false
 * positive that breaks at runtime.
 */
function pathExistsInJsonSchema(schema: unknown, path: string): boolean {
  const parts = path.split(".").filter((p) => p.length > 0);
  if (parts.length === 0) return false;
  let node: unknown = schema;
  for (const part of parts) {
    if (!node || typeof node !== "object") return false;
    const props = (node as { properties?: unknown }).properties;
    if (!props || typeof props !== "object") return false;
    if (!(part in (props as Record<string, unknown>))) return false;
    node = (props as Record<string, unknown>)[part];
  }
  return true;
}

/**
 * For each `from-context` path used by the composition's block manifests,
 * verify it resolves either in the JSON Schema Claude emitted (paths the
 * composer-emitted `buildContext` produces) OR in the registry's
 * `enrichmentDeclares` list (paths the registry's `enrichContext` hook
 * guarantees to populate at runtime). This is the v1 of the
 * "context paths are not type-checked" caveat in the spec README.
 */
export function validateContextPaths(
  composition: Composition,
  registry: Registry,
  contextSchemaJson: unknown,
): CompositionIssue[] {
  const enriched = new Set(registry.enrichmentDeclares ?? []);
  const known = (path: string): boolean =>
    enriched.has(path) || pathExistsInJsonSchema(contextSchemaJson, path);

  const issues: CompositionIssue[] = [];
  for (const page of composition.pages) {
    for (const instance of page.blocks) {
      const block = registry.blocks[instance.id];
      if (!block) continue;

      for (const [slotName, slot] of Object.entries(block.data)) {
        for (const [paramName, source] of Object.entries(slot.params)) {
          if (source.kind !== "from-context") continue;
          if (!known(source.path)) {
            issues.push({
              kind: "context-path-missing",
              page: page.path,
              instanceId: instance.instanceId,
              blockId: instance.id,
              where: `data.${slotName}.${paramName}`,
              path: source.path,
            });
          }
        }
      }

      for (const [actionName, action] of Object.entries(block.actions)) {
        if (!action.params) continue;
        for (const [paramName, source] of Object.entries(action.params)) {
          if (source.kind !== "from-context") continue;
          if (!known(source.path)) {
            issues.push({
              kind: "context-path-missing",
              page: page.path,
              instanceId: instance.instanceId,
              blockId: instance.id,
              where: `actions.${actionName}.${paramName}`,
              path: source.path,
            });
          }
        }
      }
    }
  }
  return issues;
}

export function formatIssue(issue: CompositionIssue): string {
  switch (issue.kind) {
    case "unknown-block":
      return `page ${issue.page}: instance "${issue.instanceId}" references unknown block "${issue.blockId}"`;
    case "config-invalid":
      return `page ${issue.page}: instance "${issue.instanceId}" (${issue.blockId}) has invalid config — ${issue.detail}`;
    case "context-path-missing":
      return `page ${issue.page}: instance "${issue.instanceId}" (${issue.blockId}) needs from-context path "${issue.path}" at ${issue.where}, but the path is not present in contextSchemaJson`;
  }
}

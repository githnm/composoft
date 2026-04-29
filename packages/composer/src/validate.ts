import type { Composition } from "@composoft/runtime";
import type { ReferenceData, Registry } from "@composoft/spec";

export type CompositionWarning = {
  kind: "page-state-no-writer";
  page: string;
  instanceId: string;
  blockId: string;
  where: string;
  path: string;
};

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

/**
 * Warn (not fail) when a `from-page-state` path on a block has no writer
 * declared by any block on the same page. The path may still get populated
 * by `composition.initialState`, so this is informational. Caller prints
 * to stderr; CLI does not exit non-zero on warnings.
 */
export function findPageStateWriterGaps(
  composition: Composition,
  registry: Registry,
): CompositionWarning[] {
  const warnings: CompositionWarning[] = [];

  for (const page of composition.pages) {
    // Collect every page-state path written on this page.
    const written = new Set<string>();
    for (const inst of page.blocks) {
      const block = registry.blocks[inst.id];
      if (!block) continue;
      for (const w of Object.values(block.writes ?? {})) {
        if (w.kind === "page-state") written.add(w.path);
      }
    }

    // Collect paths seeded by initialState (read recursively as dot paths).
    const seeded = collectInitialStatePaths(page.initialState ?? {});

    // For every read on this page, verify there's a writer or initial seed.
    for (const inst of page.blocks) {
      const block = registry.blocks[inst.id];
      if (!block) continue;

      const checkSource = (where: string) =>
        (source: { kind: string; path?: string }) => {
          if (source.kind !== "from-page-state" || !source.path) return;
          if (!written.has(source.path) && !seeded.has(source.path)) {
            warnings.push({
              kind: "page-state-no-writer",
              page: page.path,
              instanceId: inst.instanceId,
              blockId: inst.id,
              where,
              path: source.path,
            });
          }
        };

      for (const [slotName, slot] of Object.entries(block.data)) {
        for (const source of Object.values(slot.params)) {
          checkSource(`data.${slotName}`)(source);
        }
      }
      for (const [actionName, action] of Object.entries(block.actions)) {
        if (!action.params) continue;
        for (const source of Object.values(action.params)) {
          checkSource(`actions.${actionName}`)(source);
        }
      }
    }
  }
  return warnings;
}

function collectInitialStatePaths(state: Record<string, unknown>, prefix = ""): Set<string> {
  const out = new Set<string>();
  for (const [key, value] of Object.entries(state)) {
    const path = prefix ? `${prefix}.${key}` : key;
    out.add(path);
    if (value !== null && typeof value === "object" && !Array.isArray(value)) {
      for (const sub of collectInitialStatePaths(value as Record<string, unknown>, path)) {
        out.add(sub);
      }
    }
  }
  return out;
}

/**
 * Heuristic: scan each block instance's config for string values at field
 * names that end in `Id`. If the value isn't found anywhere in
 * `referenceData`, emit a warning with the closest match (Levenshtein on
 * lowercased ids) so the user can spot-check.
 *
 * Field-name pattern catches the high-value case (`warehouseId`, `vendorId`,
 * `customerId`, etc.) without flooding warnings on every string config
 * field. Skip enum values for now — they're already constrained by Zod
 * enum schemas at config-validation time.
 */
export type ReferenceWarning = {
  page: string;
  instanceId: string;
  blockId: string;
  fieldPath: string;
  value: string;
  closest: { scope: string; id: string; label: string; distance: number } | null;
};

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  let prev = new Array<number>(b.length + 1);
  let curr = new Array<number>(b.length + 1);
  for (let j = 0; j <= b.length; j++) prev[j] = j;
  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1;
      curr[j] = Math.min(
        (curr[j - 1] ?? 0) + 1,
        (prev[j] ?? 0) + 1,
        (prev[j - 1] ?? 0) + cost,
      );
    }
    [prev, curr] = [curr, prev];
  }
  return prev[b.length] ?? a.length;
}

function collectIdFields(
  obj: unknown,
  prefix: string,
): Array<{ path: string; value: string }> {
  const out: Array<{ path: string; value: string }> = [];
  if (obj === null || obj === undefined || typeof obj !== "object") return out;
  if (Array.isArray(obj)) {
    obj.forEach((item, i) => out.push(...collectIdFields(item, `${prefix}[${i}]`)));
    return out;
  }
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === "string" && /Id$/.test(key) && value.length > 0) {
      out.push({ path, value });
    } else if (typeof value === "object" && value !== null) {
      out.push(...collectIdFields(value, path));
    }
  }
  return out;
}

export function validateReferenceIds(
  composition: Composition,
  refData: ReferenceData | undefined,
): ReferenceWarning[] {
  if (!refData) return [];

  const knownIds = new Set<string>();
  for (const items of Object.values(refData)) {
    for (const it of items) knownIds.add(it.id);
  }

  const warnings: ReferenceWarning[] = [];
  for (const page of composition.pages) {
    for (const inst of page.blocks) {
      const fields = collectIdFields(inst.config, "config");
      for (const { path, value } of fields) {
        if (knownIds.has(value)) continue;

        let closest: ReferenceWarning["closest"] = null;
        for (const [scope, items] of Object.entries(refData)) {
          for (const it of items) {
            const d = levenshtein(value.toLowerCase(), it.id.toLowerCase());
            if (closest === null || d < closest.distance) {
              closest = { scope, id: it.id, label: it.label, distance: d };
            }
          }
        }

        warnings.push({
          page: page.path,
          instanceId: inst.instanceId,
          blockId: inst.id,
          fieldPath: path,
          value,
          closest,
        });
      }
    }
  }
  return warnings;
}

export function formatReferenceWarning(w: ReferenceWarning): string {
  const closest = w.closest
    ? ` (closest match: \`${w.closest.id}\` — ${w.closest.label}, edit distance ${w.closest.distance})`
    : "";
  return `page ${w.page}: instance "${w.instanceId}" (${w.blockId}) ${w.fieldPath}="${w.value}" does not match any reference id${closest}`;
}

export function formatWarning(w: CompositionWarning): string {
  return `page ${w.page}: instance "${w.instanceId}" (${w.blockId}) reads from-page-state path "${w.path}" at ${w.where}, but nothing writes to it on this page (no writer block, no initialState seed)`;
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

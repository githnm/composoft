import { z } from "zod";
import { DOTTED_ID_REGEX, SEMVER_REGEX } from "@composoft/spec";

/**
 * A Composition is a serializable declaration of what blocks render on what
 * page, with their config values. Emitted by the composer; consumed by the
 * runtime.
 *
 * `contextSchema` is optional and lives on the in-memory type but is *not*
 * part of the JSON form Claude returns — the composer writes it as a
 * separate TS file in the generated app and imports it back into the
 * Composition object at build time.
 */
export type Composition = {
  readonly name: string;
  readonly version: string;
  readonly pages: ReadonlyArray<CompositionPage>;
  readonly contextSchema?: z.ZodType;
};

export type CompositionPage = {
  readonly path: string;
  /**
   * Optional initial state for this page's shared client-side state. Must be
   * JSON-serializable. Used for the first server render; client takes over
   * after hydration. Any block that reads `from-page-state` paths without an
   * initialState seed will see `undefined` on first render and the runtime
   * will skip those slots (data slot returns null).
   */
  readonly initialState?: Record<string, unknown>;
  readonly blocks: ReadonlyArray<BlockInstance>;
};

export type BlockInstance = {
  readonly id: string;
  readonly instanceId: string;
  readonly config: unknown;
  readonly layout?: { readonly region?: string };
};

// `.strict()` rejects unknown keys. Catches model hallucinations like
// `blockId` or surprise `title` fields rather than dropping them silently.
const blockInstanceSchema = z
  .object({
    id: z.string().regex(DOTTED_ID_REGEX, "block id must be dot-namespaced"),
    instanceId: z.string().min(1, "instanceId is required"),
    config: z.unknown(),
    layout: z
      .object({
        region: z.string().optional(),
      })
      .strict()
      .optional(),
  })
  .strict();

const pageSchema = z
  .object({
    path: z
      .string()
      .min(1)
      .regex(/^\//, "page path must start with '/'"),
    initialState: z.record(z.string(), z.unknown()).optional(),
    blocks: z.array(blockInstanceSchema).min(1, "page must have at least one block"),
  })
  .strict();

/**
 * Schema for the JSON form of a Composition (the shape Claude returns and
 * the composer parses). The in-memory `Composition` type adds an optional
 * `contextSchema` Zod schema that this validator does not check — Zod
 * schemas are not JSON-serializable.
 */
export const compositionJsonSchema = z.object({
  name: z.string().min(1),
  version: z.string().regex(SEMVER_REGEX, "version must be semver"),
  pages: z.array(pageSchema).min(1, "composition must have at least one page"),
});

export function validateComposition(value: unknown): Composition {
  if (typeof value !== "object" || value === null) {
    throw new TypeError("composition must be an object");
  }
  const parsed = compositionJsonSchema.parse(value);

  // initialState (if present) must round-trip JSON to confirm serializability.
  // The composer emits compositions as TS literals that get imported by the
  // runtime, but page state crosses the RSC boundary as a prop and gets
  // serialized for hydration — non-JSON values (functions, symbols, etc.)
  // would silently break.
  for (const page of parsed.pages) {
    if (!page.initialState) continue;
    try {
      const round = JSON.parse(JSON.stringify(page.initialState));
      if (JSON.stringify(round) !== JSON.stringify(page.initialState)) {
        throw new Error("round-trip mismatch");
      }
    } catch (e) {
      throw new Error(
        `composition page ${page.path}: initialState must be JSON-serializable (${(e as Error).message})`,
      );
    }
  }

  // instanceIds are globally unique across the composition. The action
  // route handler looks blocks up by instanceId alone, so cross-page
  // collisions would be ambiguous.
  const seen = new Map<string, string>();
  for (const page of parsed.pages) {
    for (const block of page.blocks) {
      const previous = seen.get(block.instanceId);
      if (previous !== undefined) {
        const where =
          previous === page.path ? `twice on ${page.path}` : `on ${previous} and ${page.path}`;
        throw new Error(
          `composition: duplicate instanceId "${block.instanceId}" — appears ${where}. instanceIds must be globally unique.`,
        );
      }
      seen.set(block.instanceId, page.path);
    }
  }

  // Pass through; the input shape already matches Composition (without contextSchema).
  return parsed as Composition;
}

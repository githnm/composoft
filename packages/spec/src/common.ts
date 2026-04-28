import { z } from "zod";

/**
 * Identifiers for adapters, workflows, and blocks must be dot-namespaced
 * lowercase tokens, e.g. "tickets.list" or "support.ticket-list". Two-segment
 * minimum keeps the registry browsable: namespace.name.
 */
export const DOTTED_ID_REGEX = /^[a-z][a-z0-9-]*(?:\.[a-z][a-z0-9-]*)+$/;

/** Permissive semver: MAJOR.MINOR.PATCH with optional prerelease/build. */
export const SEMVER_REGEX =
  /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;

/**
 * The metadata fields every manifest (adapter, workflow, block) shares.
 * Validated at registry-build time; never inspects implementations.
 */
export const manifestMetadataSchema = z.object({
  id: z
    .string()
    .regex(DOTTED_ID_REGEX, "id must be dot-namespaced lowercase, e.g. 'tickets.list'"),
  version: z.string().regex(SEMVER_REGEX, "version must be semver, e.g. '0.1.0'"),
  description: z.string().min(1, "description is required"),
});

export type ManifestMetadata = z.infer<typeof manifestMetadataSchema>;

/**
 * Structural duck-type check for a Zod schema. We avoid `instanceof z.ZodType`
 * because consumers may have a different zod copy in their node_modules and
 * the prototype chain would not match.
 */
export function isZodSchema(value: unknown): value is z.ZodType {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as { parse?: unknown }).parse === "function" &&
    typeof (value as { safeParse?: unknown }).safeParse === "function"
  );
}

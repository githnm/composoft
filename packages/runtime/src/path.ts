/**
 * Errors thrown by the path resolver. Subclassed so callers (resolveDataSlots,
 * bindActions) can wrap with the slot/action they came from without losing
 * the original cause.
 */
export class PathResolutionError extends Error {
  override readonly name = "PathResolutionError";
  constructor(message: string) {
    super(message);
  }
}

/**
 * Read a dot-delimited path from an object. Used to resolve `from-config` and
 * `from-context` ParamSources at the runtime boundary. Rejects missing keys
 * with a clear error rather than returning undefined — adapter input
 * validation should not be the first place a typo surfaces.
 */
export function readPath(obj: unknown, path: string): unknown {
  const parts = path.split(".").filter((p) => p.length > 0);
  if (parts.length === 0) {
    throw new PathResolutionError(`empty path`);
  }
  let current: unknown = obj;
  for (const part of parts) {
    if (current === null || current === undefined) {
      throw new PathResolutionError(
        `path "${path}": cannot read "${part}" from ${current === null ? "null" : "undefined"}`,
      );
    }
    if (typeof current !== "object") {
      throw new PathResolutionError(
        `path "${path}": cannot read "${part}" from ${typeof current}`,
      );
    }
    const record = current as Record<string, unknown>;
    if (!(part in record)) {
      throw new PathResolutionError(`path "${path}": "${part}" missing`);
    }
    current = record[part];
  }
  return current;
}

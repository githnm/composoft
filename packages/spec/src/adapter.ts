import { z } from "zod";
import { isZodSchema, manifestMetadataSchema } from "./common.js";

/**
 * An Adapter is a typed query against a data source.
 *
 * `params` and `output` are Zod schemas that double as runtime guards and
 * the source of truth for `TParams` / `TOutput`. `run` is the implementation,
 * called by the runtime when a Block requests this slot. Validation never
 * invokes `run`.
 */
export type Adapter<TParams = unknown, TOutput = unknown> = {
  readonly id: string;
  readonly version: string;
  readonly description: string;
  readonly params: z.ZodType<TParams>;
  readonly output: z.ZodType<TOutput>;
  readonly run: (params: TParams) => Promise<TOutput>;
};

export type AdapterConfig<TParams, TOutput> = Adapter<TParams, TOutput>;

/**
 * Erased Adapter type for storage at registry-keyed-by-id sites. See the
 * "Type erasure for storage" section in the package README. Use `Adapter`
 * (with narrow generics) at construction and consumption sites; use
 * `AnyAdapter` only when storing in a `Record<string, ...>`.
 */
export type AnyAdapter = Adapter<any, any>;

/**
 * Extract an Adapter's output type. Use to derive a Block's `data` slot type
 * from the imported adapter, instead of redeclaring it on the component.
 */
export type AdapterOutput<T> = T extends Adapter<infer _P, infer O> ? O : never;

/** Extract an Adapter's params type. */
export type AdapterParams<T> = T extends Adapter<infer P, infer _O> ? P : never;

/**
 * Identity at runtime. The generic parameters are *the schema types*
 * (`P extends ZodTypeAny`, etc.) rather than `TParams`/`TOutput` directly:
 * inferring `TParams` from a `z.ZodType<TParams>` parameter widens to
 * `unknown` in practice, while inferring the schema type and then `z.infer`-ing
 * it preserves the literal object shape. See block.ts for the same pattern.
 */
export function defineAdapter<
  P extends z.ZodTypeAny,
  O extends z.ZodTypeAny,
>(config: {
  id: string;
  version: string;
  description: string;
  params: P;
  output: O;
  run: (params: z.infer<P>) => Promise<z.infer<O>>;
}): Adapter<z.infer<P>, z.infer<O>> {
  return config as Adapter<z.infer<P>, z.infer<O>>;
}

/**
 * Validate adapter metadata + the structural presence of schemas and `run`.
 * Throws on invalid input. Returns the same object, narrowed to `Adapter`.
 */
export function validateAdapter(adapter: unknown): Adapter {
  if (typeof adapter !== "object" || adapter === null) {
    throw new TypeError("adapter must be an object");
  }
  manifestMetadataSchema.parse(adapter);
  const a = adapter as Record<string, unknown>;
  if (!isZodSchema(a.params)) {
    throw new TypeError(`adapter ${String(a.id)}: params must be a Zod schema`);
  }
  if (!isZodSchema(a.output)) {
    throw new TypeError(`adapter ${String(a.id)}: output must be a Zod schema`);
  }
  if (typeof a.run !== "function") {
    throw new TypeError(`adapter ${String(a.id)}: run must be a function`);
  }
  return adapter as Adapter;
}

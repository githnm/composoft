/**
 * Registry types live in `@composoft/spec` so registry libraries don't need
 * to depend on `@composoft/runtime` just to type their export. This module
 * re-exports them for runtime-internal imports.
 */
export type { AnyAdapter, AnyBlock, AnyWorkflow, EnrichContextFn, Registry } from "@composoft/spec";

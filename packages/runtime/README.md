# @composoft/runtime

Resolves data slots, binds actions, and renders compositions for blocks defined under `@composoft/spec`.

## What it does

Given a registry and a Composition, the runtime knows how to render any page on any request:

- For the page being requested, look up each block manifest in the registry.
- Validate the per-instance config against the block's config schema.
- Resolve every data slot by calling `adapter.run` with params built from `static`, `from-config`, or `from-context` ParamSources, then validate the output against the adapter's output schema.
- Render each block component grouped by `layout.region`, with the action set wired to a POST endpoint that the embedding app provides.

## Composition shape

The Composition is the output of the composer; the runtime is its only consumer.

```ts
type Composition = {
  name: string;
  version: string;
  pages: ReadonlyArray<{
    path: string;          // e.g. "/tickets/[ticketId]"
    blocks: ReadonlyArray<{
      id: string;          // a block id from the registry
      instanceId: string;  // globally unique across the composition
      config: unknown;     // validated against block.config at render
      layout?: { region?: string };
    }>;
  }>;
  contextSchema?: z.ZodType;
};
```

`validateComposition(value)` runs the Zod check, the global instanceId-uniqueness check, and returns the typed Composition.

## Server / client split

Two components do the work:

- **`<ComposoftRuntime>`** — async server component. Reads the composition, looks up manifests, calls `enrichContext` if the registry exports one, runs `resolveDataSlots` per block, and emits one `<ComposoftBlockHost>` per block instance.
- **`<ComposoftBlockHost>`** — `"use client"` component. Receives the block component as a client reference, the resolved data, the validated config, the runtime context, the block's instance id, and the list of action names. Builds an actions object on the client by wrapping each name in a `fetch` to the action endpoint.

This split exists because the manifest schemas are server values that the server needs to dot into (`block.config.parse(...)`), while the React components need `"use client"` for hooks. Mixing them in one file violates the RSC boundary; see the spec README's "Authoring rule: split component and manifest".

## Action route handler convention

The runtime expects a POST endpoint at `/api/composoft/action` (configurable via the `actionEndpoint` prop on `<ComposoftBlockHost>`). The composer generates a default handler that:

1. Parses `{ blockInstanceId, actionName, input, context }` from the request body.
2. Looks up the block instance across the composition's pages — instanceIds are globally unique, enforced at composition-validation time.
3. Validates the supplied context against the page's `contextSchema`, then runs the registry's `enrichContext`.
4. Calls `bindActions(block, registry, enrichedContext, validatedConfig)` and invokes the named action with the caller's input.
5. Returns the workflow output as JSON, or a non-2xx error with a message.

The handler is a normal Next.js route — auth, rate limiting, audit middleware all go in front of it the way you'd put them in front of any POST.

## Direct API

For embedding the runtime outside a generated app, the package exports the building blocks too:

```ts
import {
  ComposoftRuntime,
  ComposoftBlockHost,
  bindActions,
  resolveDataSlots,
  validateComposition,
  readPath,
} from "@composoft/runtime";
```

`bindActions(block, registry, ctx, config)` returns a `Record<string, (input?) => Promise<unknown>>`; merges manifest-prefilled params (`static`, `from-config`, `from-context`) with caller-supplied input, validates against the workflow input schema, runs, validates output. The route handler reuses this; you can too.

## Package boundary

`@composoft/runtime` depends on `@composoft/spec` only. Registry packages depend on `@composoft/spec` and import the `Registry` type from there; they do not depend on the runtime.

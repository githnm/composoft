# @composoft/runtime

Server runtime for [composoft](https://github.com/githnm/composoft) compositions: resolves data slots, binds actions, hosts shared page state, gates auth. React Server Components with a `"use client"` host for interaction.

> Status: alpha. APIs may change before 0.1.0 final.

## Install

```bash
pnpm add @composoft/runtime@alpha @composoft/spec@alpha
```

## Quick look

```tsx
import { ComposoftRuntime } from "@composoft/runtime";
import { registry } from "@/lib/registry";
import { composition } from "@/lib/composition";
import { buildContext } from "@/lib/context";

export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ ticketId: string }> }) {
  const ctx = buildContext(await params);
  return (
    <ComposoftRuntime
      registry={registry}
      composition={composition}
      context={ctx}
      pagePath="/tickets/[ticketId]"
    />
  );
}
```

The runtime resolves data slots on the server, hands the validated outputs to a client host (`<ComposoftBlockHost>`) which renders the block component and POSTs to action / resolve endpoints when the user interacts.

## What this package gives you

- `<ComposoftRuntime>` — async server component that orchestrates a page.
- `<ComposoftBlockHost>` — `"use client"` renderer with action binding and page-state subscriptions.
- `<ComposoftPageStateProvider>` + `usePageState` / `usePageStateWriter` — shared page state.
- `resolveDataSlots`, `resolveOneSlot`, `bindActions` — direct primitives for the action and resolve route handlers the [composer](https://www.npmjs.com/package/@composoft/composer) generates.
- Auth helpers: `authenticateRequest`, `authorizeRequest`, `mergeIdentityIntoContext`.
- `Composition` type + `validateComposition`.

For the architecture deep-dive (server/client split, RSC boundary rules, page-state rationale) see the [top-level README](https://github.com/githnm/composoft#readme).

## Versioning

`0.1.0-alpha.x` matches the spec's alpha series.

## License

MIT. See [LICENSE](https://github.com/githnm/composoft/blob/main/LICENSE).

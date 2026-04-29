import type { ComponentType, ReactElement } from "react";
import type { BlockProps } from "@composoft/spec";
import type { Composition } from "./composition.js";
import type { AnyBlock, Registry } from "./registry.js";
import { resolveDataSlots } from "./resolve.js";
import { ComposoftBlockHost } from "./block-host.js";
import { ComposoftPageStateProvider } from "./page-state-provider.js";

type Props = {
  registry: Registry;
  composition: Composition;
  context: unknown;
  pagePath: string;
};

/**
 * Server component. Resolves each block instance's data on the server using
 * the page's `initialState` as the seed for any `from-page-state` paths,
 * then delegates render and re-resolution to a client provider + host:
 *
 *   <ComposoftRuntime>                       (server, this fn)
 *     <ComposoftPageStateProvider>           (client, holds shared state)
 *       <ComposoftBlockHost ... />           (client, per block instance)
 *
 * The runtime intentionally does not build action closures here — closures
 * across the RSC boundary fight with the dynamic shape of action
 * manifests. Instead the host posts to route handlers the composer
 * generates at `/api/composoft/action` and `/api/composoft/resolve`.
 */
export async function ComposoftRuntime({
  registry,
  composition,
  context,
  pagePath,
}: Props): Promise<ReactElement> {
  const page = composition.pages.find((p) => p.path === pagePath);
  if (!page) {
    throw new Error(`composition has no page for path "${pagePath}"`);
  }

  const effectiveContext = registry.enrichContext
    ? await registry.enrichContext(context, registry)
    : context;

  const initialState = page.initialState ?? {};

  type Resolved = {
    instanceId: string;
    region: string;
    block: AnyBlock;
    data: Record<string, unknown>;
    config: unknown;
    actionNames: string[];
  };

  const resolved: Resolved[] = [];
  for (const instance of page.blocks) {
    const block = registry.blocks[instance.id];
    if (!block) {
      throw new Error(
        `composition page ${page.path}: block "${instance.id}" not in registry`,
      );
    }

    const validatedConfig = block.config.parse(instance.config);
    const data = await resolveDataSlots(
      block,
      registry,
      effectiveContext,
      validatedConfig,
      initialState,
    );

    resolved.push({
      instanceId: instance.instanceId,
      region: instance.layout?.region ?? "main",
      block,
      data,
      config: validatedConfig,
      actionNames: Object.keys(block.actions),
    });
  }

  const regions: Array<{ region: string; items: Resolved[] }> = [];
  for (const r of resolved) {
    let bucket = regions.find((b) => b.region === r.region);
    if (!bucket) {
      bucket = { region: r.region, items: [] };
      regions.push(bucket);
    }
    bucket.items.push(r);
  }

  return (
    <ComposoftPageStateProvider initialState={initialState}>
      <div className="composoft-page" data-page={pagePath}>
        {regions.map(({ region, items }) => (
          <div
            key={region}
            className={`composoft-region composoft-region-${region}`}
            data-region={region}
          >
            {items.map(({ instanceId, block, data, config, actionNames }) => {
              const Component = block.component as ComponentType<
                BlockProps<
                  unknown,
                  Record<string, unknown>,
                  Record<string, (input?: unknown) => Promise<unknown>>,
                  Record<string, (value: any) => void>
                >
              >;
              return (
                <ComposoftBlockHost
                  key={instanceId}
                  Component={Component}
                  data={data}
                  config={config}
                  context={effectiveContext}
                  blockInstanceId={instanceId}
                  actionNames={actionNames}
                  dataSlots={block.data as Record<string, { adapter: string; params: Record<string, { kind: "static" | "from-config" | "from-context" | "from-page-state"; path?: string; value?: unknown }> }>}
                  writesManifest={block.writes as Record<string, { kind: "page-state"; path: string }> | undefined}
                />
              );
            })}
          </div>
        ))}
      </div>
    </ComposoftPageStateProvider>
  );
}

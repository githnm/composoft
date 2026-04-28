import type { ComponentType, ReactElement } from "react";
import type { BlockProps } from "@composoft/spec";
import type { Composition } from "./composition.js";
import type { AnyBlock, Registry } from "./registry.js";
import { resolveDataSlots } from "./resolve.js";
import { ComposoftBlockHost } from "./block-host.js";

type Props = {
  registry: Registry;
  composition: Composition;
  context: unknown;
  pagePath: string;
};

/**
 * Server component. Resolves each block instance's data on the server, then
 * delegates render and action wiring to a client host (`<ComposoftBlockHost>`).
 *
 * The runtime intentionally does not build action closures here — passing
 * server-built closures across the RSC boundary requires Server Actions per
 * call, and that fights with the dynamic shape of action manifests. Instead
 * the host posts to a route handler the composer generates at
 * `/api/composoft/action`; that handler reuses `bindActions` server-side.
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
    const data = await resolveDataSlots(block, registry, effectiveContext, validatedConfig);

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
    <div className="composoft-page" data-page={pagePath}>
      {regions.map(({ region, items }) => (
        <div
          key={region}
          className={`composoft-region composoft-region-${region}`}
          data-region={region}
        >
          {items.map(({ instanceId, block, data, config, actionNames }) => {
            const Component = block.component as ComponentType<
              BlockProps<unknown, Record<string, unknown>, Record<string, (input?: unknown) => Promise<unknown>>>
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
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}

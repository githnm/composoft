"use client";

import { useMemo } from "react";
import type { ComponentType } from "react";
import type { BlockProps } from "@composoft/spec";

type Props = {
  /**
   * The block's React component, imported as a client reference. The server
   * runtime does not call it; this host renders it.
   */
  Component: ComponentType<BlockProps<unknown, Record<string, unknown>, Record<string, (input?: unknown) => Promise<unknown>>>>;
  /** Resolved data — the runtime ran the adapters and passed validated outputs. */
  data: Record<string, unknown>;
  /** The validated config for this block instance. */
  config: unknown;
  /** The enriched runtime context for the current request. */
  context: unknown;
  /** Globally-unique instance id, used by the action endpoint to look up the block. */
  blockInstanceId: string;
  /**
   * Names of actions the block declares. The host wraps each in a fetch to
   * the composer-generated action endpoint; the server resolves prefilled
   * params, validates against the workflow input, and runs.
   */
  actionNames: readonly string[];
  /**
   * URL of the action endpoint. Defaults to "/api/composoft/action"; the
   * composer generates a route handler at this path.
   */
  actionEndpoint?: string;
};

/**
 * Client wrapper that builds the actions object on the client side. We
 * cannot pass server-built closures across the RSC boundary, and we don't
 * want to rebuild Server Actions for every dynamic action — the wire fetch
 * is simpler and keeps the runtime registry-agnostic.
 */
export function ComposoftBlockHost({
  Component,
  data,
  config,
  context,
  blockInstanceId,
  actionNames,
  actionEndpoint = "/api/composoft/action",
}: Props) {
  const actions = useMemo(() => {
    const built: Record<string, (input?: unknown) => Promise<unknown>> = {};
    for (const name of actionNames) {
      built[name] = async (input?: unknown) => {
        const res = await fetch(actionEndpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            blockInstanceId,
            actionName: name,
            input: input ?? {},
            context,
          }),
        });
        if (!res.ok) {
          let detail = `${res.status} ${res.statusText}`;
          try {
            const body = await res.json();
            if (typeof body?.error === "string") detail = body.error;
          } catch {}
          throw new Error(`composoft action ${name} failed: ${detail}`);
        }
        return res.json();
      };
    }
    return built;
  }, [actionNames, blockInstanceId, context, actionEndpoint]);

  return <Component data={data} actions={actions} config={config} />;
}

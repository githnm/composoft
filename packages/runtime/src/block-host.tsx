"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ComponentType } from "react";
import type { BlockProps } from "@composoft/spec";
import {
  usePageStateSnapshot,
  usePageStateWriter,
} from "./page-state-provider.js";

type DataSlotsManifest = Record<
  string,
  {
    adapter: string;
    params: Record<
      string,
      { kind: "static" | "from-config" | "from-context" | "from-page-state"; path?: string; value?: unknown }
    >;
  }
>;

type WritesManifest = Record<string, { kind: "page-state"; path: string }>;

type Props = {
  Component: ComponentType<
    BlockProps<
      unknown,
      Record<string, unknown>,
      Record<string, (input?: unknown) => Promise<unknown>>,
      Record<string, (value: any) => void>
    >
  >;
  /** Resolved data — server pre-fetched on initial render. */
  data: Record<string, unknown>;
  config: unknown;
  context: unknown;
  blockInstanceId: string;
  actionNames: readonly string[];
  /**
   * Slot manifest entries with from-page-state params. The host watches
   * page-state paths these reference and re-resolves the slot when they
   * change. Slots without from-page-state never re-resolve client-side.
   */
  dataSlots: DataSlotsManifest;
  /** Writes declarations from the block manifest, if any. */
  writesManifest?: WritesManifest;
  /** URL of the action endpoint. Defaults to `/api/composoft/action`. */
  actionEndpoint?: string;
  /** URL of the resolve endpoint. Defaults to `/api/composoft/resolve`. */
  resolveEndpoint?: string;
};

type WriteSetters = Record<string, (value: any) => void>;

/**
 * Page-state-aware block host. Builds:
 *   - actions: each one POSTs to the action endpoint with the current
 *     `pageState` so server-side prefills (`from-page-state`) resolve.
 *   - writes: each declared write becomes a setter that updates page state
 *     at its path.
 *   - re-resolution effect: watches page-state paths used by this block's
 *     data slots and re-fetches via the resolve endpoint when they change.
 *
 * v1: no debounce, no batching, one in-flight request per slot. Documented
 * deferments — fine for the demo's row-click UX.
 */
export function ComposoftBlockHost({
  Component,
  data: initialData,
  config,
  context,
  blockInstanceId,
  actionNames,
  dataSlots,
  writesManifest,
  actionEndpoint = "/api/composoft/action",
  resolveEndpoint = "/api/composoft/resolve",
}: Props) {
  const [data, setData] = useState<Record<string, unknown>>(initialData);
  const { state: pageState, version } = usePageStateSnapshot();

  // Per-slot in-flight tracker. Used to avoid stomping concurrent fetches.
  // Map slot name → AbortController of the in-flight request.
  const inFlightRef = useRef<Map<string, AbortController>>(new Map());

  // Identify slots that read from page state and the paths they care about.
  const pageStateSlots = useMemo(() => {
    const out: Array<{ slotName: string; paths: string[] }> = [];
    for (const [slotName, slot] of Object.entries(dataSlots)) {
      const paths: string[] = [];
      for (const source of Object.values(slot.params)) {
        if (source.kind === "from-page-state" && typeof source.path === "string") {
          paths.push(source.path);
        }
      }
      if (paths.length > 0) out.push({ slotName, paths });
    }
    return out;
  }, [dataSlots]);

  // Build action setters once per (instance, endpoint, context) tuple.
  // Page state is read fresh inside the closure so each call sends current
  // state — the version bump triggers re-renders that rebuild the closure.
  const actions = useMemo(() => {
    const built: Record<string, (input?: unknown) => Promise<unknown>> = {};
    for (const name of actionNames) {
      built[name] = async (input?: unknown) => {
        const res = await fetch(actionEndpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            // Demo auth header for the placeholder registry. Production
            // embedders replace this fetch with one that pulls a JWT or
            // session cookie. Cookies travel automatically; this header is
            // for the sample registry's `X-Composoft-User`-trust scheme.
            "X-Composoft-User": "demo-user",
          },
          body: JSON.stringify({
            blockInstanceId,
            actionName: name,
            input: input ?? {},
            context,
            pageState,
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
  }, [actionNames, blockInstanceId, context, actionEndpoint, pageState]);

  // Build write setters from the manifest.
  const writes: WriteSetters = useMemo(() => {
    const out: WriteSetters = {};
    if (!writesManifest) return out;
    for (const [name, decl] of Object.entries(writesManifest)) {
      if (decl.kind === "page-state") {
        // We can't call the hook conditionally; build a setter inline that
        // writes via a stable hook-built setter per path. Hooks rules: we
        // need one usePageStateWriter per path declared on the manifest,
        // but the manifest is a stable input on initial render and never
        // changes for this instance. So we collect paths once and use a
        // memoized hook elsewhere. Hack: build a closure that calls into
        // the snapshot's setter (less idiomatic but rules-of-hooks safe).
        out[name] = (value: unknown) => {
          // Re-uses the snapshot's setter. Imported via a separate hook
          // below to keep this code path compatible with React's rules.
          stableSetters.current[name]?.(value);
        };
      }
    }
    return out;
  }, [writesManifest]);

  // Stable setters keyed by write name, populated via hooks at top level.
  // We can't call usePageStateWriter inside a loop's body without violating
  // rules-of-hooks, so we build them at the host level for each known
  // manifest entry. Since writesManifest is stable for the life of the
  // instance (manifest is immutable), this is fine.
  const stableSetters = useRef<WriteSetters>({});
  PageStateWritersBinding({
    writesManifest,
    onSetters: (s) => {
      stableSetters.current = s;
    },
  });

  // Re-resolve effect: when page-state version bumps, re-fetch each slot
  // that reads from page state. Uses AbortController to cancel stale calls
  // when state changes again before the fetch resolves.
  useEffect(() => {
    if (pageStateSlots.length === 0) return;

    for (const { slotName } of pageStateSlots) {
      // Cancel any in-flight request for this slot; the new state value
      // supersedes it.
      const prev = inFlightRef.current.get(slotName);
      if (prev) prev.abort();

      const controller = new AbortController();
      inFlightRef.current.set(slotName, controller);

      void (async () => {
        try {
          const res = await fetch(resolveEndpoint, {
            method: "POST",
            headers: {
            "Content-Type": "application/json",
            // Demo auth header for the placeholder registry. Production
            // embedders replace this fetch with one that pulls a JWT or
            // session cookie. Cookies travel automatically; this header is
            // for the sample registry's `X-Composoft-User`-trust scheme.
            "X-Composoft-User": "demo-user",
          },
            body: JSON.stringify({
              blockInstanceId,
              slotName,
              context,
              pageState,
            }),
            signal: controller.signal,
          });
          if (controller.signal.aborted) return;
          if (!res.ok) {
            let detail = `${res.status} ${res.statusText}`;
            try {
              const body = await res.json();
              if (typeof body?.error === "string") detail = body.error;
            } catch {}
            console.error(`composoft resolve ${slotName} failed: ${detail}`);
            return;
          }
          const body = (await res.json()) as { data: unknown };
          if (controller.signal.aborted) return;
          setData((prev) => ({ ...prev, [slotName]: body.data }));
        } catch (e) {
          if (controller.signal.aborted) return;
          console.error(`composoft resolve ${slotName} threw:`, e);
        } finally {
          if (inFlightRef.current.get(slotName) === controller) {
            inFlightRef.current.delete(slotName);
          }
        }
      })();
    }

    // Capture the ref for cleanup — eslint react-hooks/exhaustive-deps would
    // warn on the bare ref in cleanup; copy here for safety.
    const inFlight = inFlightRef.current;
    return () => {
      // Note: we intentionally do NOT abort on unmount of the effect alone,
      // since the same effect fires on every version change. Aborts happen
      // at the start of the next run when a new request is queued for the
      // same slot.
      void inFlight;
    };
  }, [version, pageStateSlots, blockInstanceId, context, pageState, resolveEndpoint]);

  return <Component data={data} actions={actions} config={config} writes={writes} />;
}

/**
 * Calls `usePageStateWriter` once per declared write name and reports the
 * collected setters back to the host via a callback. Lives as a sub-component
 * so the host's render order doesn't violate rules-of-hooks. The callback
 * fires synchronously during render; the host stashes setters in a ref.
 */
function PageStateWritersBinding({
  writesManifest,
  onSetters,
}: {
  writesManifest: WritesManifest | undefined;
  onSetters: (s: WriteSetters) => void;
}) {
  // Stable order of write names; hooks below are called in this order.
  const names = Object.keys(writesManifest ?? {}).sort();
  const setters: WriteSetters = {};
  for (const name of names) {
    const decl = writesManifest![name]!;
    // Each iteration is a stable hook call site for the lifetime of this
    // host (writesManifest is immutable per instance).
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const setter = usePageStateWriter<unknown>(decl.path);
    setters[name] = setter;
  }
  onSetters(setters);
  return null;
}

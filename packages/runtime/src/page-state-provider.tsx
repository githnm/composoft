"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

/**
 * Page-state primitives shared across blocks on a page. Exposed via a React
 * context. The provider is a `"use client"` boundary — server components
 * (like `<ComposoftRuntime>`) render it as JSX with an `initialState` prop;
 * after hydration the client owns the state.
 *
 * Reads happen via `usePageState()`; writes via `usePageStateWriter(path)`.
 * Both subscribe to context, so consumer components re-render on changes
 * to paths they touch.
 *
 * The state shape is `Record<string, unknown>` — paths are dot-delimited
 * strings (`"selection.itemId"`). v1 is intentionally untyped; a future
 * version may publish a typed page-state schema, same shape as the planned
 * typed-context contract.
 */
type PageState = Record<string, unknown>;

type PageStateContextValue = {
  state: PageState;
  setPath: (path: string, value: unknown) => void;
  /**
   * Monotonically incrementing version. Bumped on every write. Consumers
   * watch this in addition to the path values they read so they can detect
   * any change without deep equality on the whole state object.
   */
  version: number;
};

const PageStateContext = createContext<PageStateContextValue | null>(null);

type ProviderProps = {
  initialState?: PageState;
  children: ReactNode;
};

export function ComposoftPageStateProvider({
  initialState,
  children,
}: ProviderProps) {
  const [state, setState] = useState<PageState>(() => ({ ...(initialState ?? {}) }));
  const [version, setVersion] = useState(0);

  const setPath = useCallback((path: string, value: unknown) => {
    const parts = path.split(".").filter((p) => p.length > 0);
    if (parts.length === 0) return;
    setState((prev) => writePath(prev, parts, value));
    setVersion((v) => v + 1);
  }, []);

  const value = useMemo<PageStateContextValue>(
    () => ({ state, setPath, version }),
    [state, setPath, version],
  );

  return <PageStateContext.Provider value={value}>{children}</PageStateContext.Provider>;
}

/**
 * Read a dot-path from page state. Returns the current value (possibly
 * undefined). Subscribes the calling component to all page-state changes —
 * unconditional re-render on any write. Fine for v1; if a single page has
 * many blocks reading state and writes are noisy, swap for a path-aware
 * subscription mechanism (e.g. zustand, valtio).
 */
export function usePageState(path: string): unknown {
  const ctx = useContext(PageStateContext);
  if (!ctx) {
    throw new Error(
      "usePageState called outside <ComposoftPageStateProvider>. The runtime should always render the provider; this likely means a block component is being rendered outside the composoft tree.",
    );
  }
  // Intentionally re-reads on every render — version bump in context value
  // forces this hook's host to re-render on any state change.
  return readPath(ctx.state, path);
}

/**
 * Read the entire page-state object. Used by the BlockHost to send current
 * state with action POSTs and resolve POSTs. Avoid in user components —
 * prefer `usePageState(path)` so re-renders are scoped to what you read.
 */
export function usePageStateSnapshot(): { state: PageState; version: number } {
  const ctx = useContext(PageStateContext);
  if (!ctx) {
    throw new Error("usePageStateSnapshot called outside <ComposoftPageStateProvider>.");
  }
  return { state: ctx.state, version: ctx.version };
}

/**
 * Returns a setter that writes to a path. The component can declare its
 * `writes` prop type as `Record<string, PageStateWriter<T>>` — the spec
 * surfaces this. Manual TValue today; future typed page state will infer.
 */
export function usePageStateWriter<TValue>(path: string): (value: TValue) => void {
  const ctx = useContext(PageStateContext);
  if (!ctx) {
    throw new Error("usePageStateWriter called outside <ComposoftPageStateProvider>.");
  }
  return useCallback(
    (value: TValue) => ctx.setPath(path, value),
    [ctx, path],
  );
}

// ---------------------------------------------------------------------------
// path helpers — duplicated from path.ts so this client module is independent
// of the server-side resolver. Tiny enough that the duplication is fine.

function readPath(obj: PageState, path: string): unknown {
  const parts = path.split(".").filter((p) => p.length > 0);
  let current: unknown = obj;
  for (const part of parts) {
    if (current === null || current === undefined || typeof current !== "object") {
      return undefined;
    }
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

function writePath(obj: PageState, parts: string[], value: unknown): PageState {
  if (parts.length === 0) return obj;
  const [head, ...rest] = parts;
  if (head === undefined) return obj;
  const next: PageState = { ...obj };
  if (rest.length === 0) {
    next[head] = value;
    return next;
  }
  const child =
    typeof obj[head] === "object" && obj[head] !== null && !Array.isArray(obj[head])
      ? (obj[head] as PageState)
      : {};
  next[head] = writePath(child, rest, value);
  return next;
}

"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { ApiError } from "./api";

export interface Resource<T> {
  readonly data: T | null;
  readonly error: ApiError | null;
  readonly loading: boolean;
  readonly refresh: () => Promise<void>;
}

/**
 * Lee un recurso del servidor y lo vuelve a leer cada `intervalMs` mientras la pestaña está visible, y al volver a
 * ella. El estado verdadero vive en el servidor: la interfaz solo lo refleja.
 */
export function useResource<T>(load: (signal: AbortSignal) => Promise<T>, deps: readonly unknown[], intervalMs = 8000): Resource<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [loading, setLoading] = useState(true);
  const loadRef = useRef(load);
  useLayoutEffect(() => {
    loadRef.current = load;
  });
  const controller = useRef<AbortController | null>(null);

  const refresh = useCallback(async () => {
    controller.current?.abort();
    const current = new AbortController();
    controller.current = current;
    try {
      const next = await loadRef.current(current.signal);
      if (current.signal.aborted) return;
      setData(next);
      setError(null);
    } catch (e) {
      if (current.signal.aborted) return;
      if (e instanceof ApiError) setError(e);
      else if (!(e instanceof DOMException && e.name === "AbortError")) setError(new ApiError(0, { code: "UNKNOWN", message: "Something went wrong. Try again." }));
    } finally {
      if (!current.signal.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const tick = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    const timer = intervalMs > 0 ? window.setInterval(tick, intervalMs) : null;
    document.addEventListener("visibilitychange", tick);
    return () => {
      if (timer) window.clearInterval(timer);
      document.removeEventListener("visibilitychange", tick);
      controller.current?.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refresh, intervalMs, ...deps]);

  return { data, error, loading, refresh };
}

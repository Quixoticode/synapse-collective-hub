import { useCallback, useState } from "react";

/**
 * Tracks pending server sync operations. Any component can wrap a call
 * with `run(promise)` to show a spinner while the request is in-flight.
 * Errors are logged to console AND surfaced in the UI.
 */
export function useSync() {
  const [pending, setPending] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async <T,>(p: Promise<T> | (() => Promise<T>)): Promise<T | null> => {
    setPending((n) => n + 1);
    setError(null);
    try {
      const res = await (typeof p === "function" ? p() : p);
      return res;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Fehler beim Server-Abgleich.";
      console.error("[useSync] Server error:", e);
      setError(msg);
      return null;
    } finally {
      setPending((n) => Math.max(0, n - 1));
    }
  }, []);

  const clearError = useCallback(() => setError(null), []);

  return { run, syncing: pending > 0, pending, error, setError, clearError };
}

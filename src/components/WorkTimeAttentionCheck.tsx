import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Zap } from "lucide-react";
import { wtSessionActive, wtSessionPing, wtSessionStop, wtSessionInvalidate } from "@/lib/worktime.functions";
import { getCredentials } from "@/lib/syn-session";

// Polls active session, sends pings, and prompts random attention checks.
// FIX (2026.07.08): The prompt timer must not run while the app is hidden -
// otherwise the shift is invalidated silently while the user isn't looking.
// The timer is now paused on visibilitychange and only starts after focus + interaction.
export function WorkTimeAttentionCheck() {
  const activeFn = useServerFn(wtSessionActive);
  const pingFn = useServerFn(wtSessionPing);
  const stopFn = useServerFn(wtSessionStop);
  const invalidateFn = useServerFn(wtSessionInvalidate);

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [prompt, setPrompt] = useState(false);
  const [countdown, setCountdown] = useState(10);
  const nextCheckRef = useRef<number | null>(null);
  const resumeGraceRef = useRef<number>(0);

  // Load current active session every 30s.
  useEffect(() => {
    let cancelled = false;
    async function poll() {
      const c = getCredentials(); if (!c) return;
      try {
        const r = await activeFn({ data: c }) as { id: string } | null;
        if (!cancelled) setSessionId(r?.id ?? null);
      } catch { /* ignore */ }
    }
    void poll();
    const id = window.setInterval(poll, 30_000);
    return () => { cancelled = true; window.clearInterval(id); };
  }, [activeFn]);

  // Ping every 60s while visible.
  useEffect(() => {
    if (!sessionId) return;
    const id = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      const c = getCredentials(); if (!c) return;
      void pingFn({ data: { ...c, id: sessionId } }).catch(() => {});
    }, 60_000);
    return () => window.clearInterval(id);
  }, [sessionId, pingFn]);

  // Track visibility for grace-period handling. Do NOT invalidate on hide -
  // that's what caused sessions to die "for no reason" on tab-switch.
  useEffect(() => {
    if (!sessionId) return;
    const onVis = () => {
      if (document.visibilityState === "visible") {
        // Grace period 3s after resume - during this time an active prompt won't time out.
        resumeGraceRef.current = Date.now() + 3_000;
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [sessionId]);

  // Schedule next random attention check. Only when visible - if the app is
  // hidden when the timer fires, we defer showing the prompt until visible again.
  useEffect(() => {
    if (!sessionId) { nextCheckRef.current = null; return; }
    function schedule() {
      const delay = (5 + Math.random() * 5) * 60_000; // 5-10 min
      nextCheckRef.current = window.setTimeout(() => {
        if (document.visibilityState !== "visible") {
          // Wait for the app to become visible again, then prompt.
          const wait = () => {
            if (document.visibilityState === "visible") {
              document.removeEventListener("visibilitychange", wait);
              setPrompt(true); setCountdown(10);
            }
          };
          document.addEventListener("visibilitychange", wait);
        } else {
          setPrompt(true); setCountdown(10);
        }
      }, delay);
    }
    schedule();
    return () => { if (nextCheckRef.current) window.clearTimeout(nextCheckRef.current); };
  }, [sessionId, prompt]);

  // Countdown when prompt is up. Pauses while hidden, respects resume grace.
  useEffect(() => {
    if (!prompt) return;
    const id = window.setInterval(() => {
      // Pause if hidden or within resume grace window.
      if (document.visibilityState !== "visible") return;
      if (Date.now() < resumeGraceRef.current) return;

      setCountdown((c) => {
        if (c <= 1) {
          window.clearInterval(id);
          const cr = getCredentials();
          if (cr && sessionId) {
            void invalidateFn({ data: { ...cr, id: sessionId, reason: "timeout" } }).catch(() => {});
            void stopFn({ data: { ...cr, id: sessionId } }).catch(() => {});
          }
          setPrompt(false);
          setSessionId(null);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [prompt, sessionId, invalidateFn, stopFn]);

  function confirm() {
    const c = getCredentials();
    if (c && sessionId) void pingFn({ data: { ...c, id: sessionId } }).catch(() => {});
    setPrompt(false);
  }

  if (!prompt) return null;
  return (
    <div className="fixed inset-0 z-[100] grid place-items-center p-6 wt-attn-overlay">
      <div className="syn-card max-w-sm w-full p-6 text-center wt-attn-flash">
        <Zap className="h-10 w-10 mx-auto mb-3" style={{ color: "var(--neural-mint)" }} />
        <h3 className="text-lg font-bold mb-1">Arbeitsnachweis</h3>
        <p className="text-xs text-muted-foreground mb-4">
          Bitte in {countdown} s bestätigen, sonst wird der Timer ungültig.
        </p>
        <button onClick={confirm} className="syn-btn w-full">Ich bin da ({countdown}s)</button>
      </div>
      <style>{`
        .wt-attn-overlay { background: rgba(0,0,0,0.75); backdrop-filter: blur(8px); animation: wt-flash 0.6s ease-out; }
        .wt-attn-flash { animation: wt-pulse 1s ease-in-out infinite; }
        @keyframes wt-flash { 0% { background: rgba(255,255,255,0.4); } 100% { background: rgba(0,0,0,0.75); } }
        @keyframes wt-pulse { 0%,100% { box-shadow: 0 0 0 0 rgba(52,211,153,0.6); } 50% { box-shadow: 0 0 40px 8px rgba(52,211,153,0.4); } }
      `}</style>
    </div>
  );
}

import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Sparkles, X } from "lucide-react";
import { versionsLatestPublished } from "@/lib/versions.functions";
import { getCredentials } from "@/lib/syn-session";
import { APP_VERSION, APP_VERSION_KEY } from "@/lib/app-version";

type Latest = {
  version: string; title: string; notes_md: string;
  bugfix_ids: string[]; feature_ids: string[]; published_at: string | null;
} | null;

/**
 * In-app Update screen. Shows release notes the first time a logged-in user
 * sees a new APP_VERSION. A short "Module werden synchronisiert" animation
 * plays before the content appears.
 */
export function UpdateScreen() {
  const [latest, setLatest] = useState<Latest>(null);
  const [open, setOpen] = useState(false);
  const [syncing, setSyncing] = useState(true);
  const fetchLatest = useServerFn(versionsLatestPublished);

  useEffect(() => {
    const last = typeof window !== "undefined" ? localStorage.getItem(APP_VERSION_KEY) : APP_VERSION;
    if (last === APP_VERSION) return;
    const c = getCredentials(); if (!c) return;
    void (async () => {
      try {
        const data = (await fetchLatest({ data: c })) as Latest;
        setLatest(data);
        setOpen(true);
        setTimeout(() => setSyncing(false), 1800);
      } catch { /* ignore */ }
    })();
  }, [fetchLatest]);

  function dismiss() {
    localStorage.setItem(APP_VERSION_KEY, APP_VERSION);
    setOpen(false);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[90] grid place-items-center bg-black/70 backdrop-blur-md p-4 animate-in fade-in duration-300">
      <div className="syn-card syn-gradient-border w-full max-w-lg p-6 relative overflow-hidden">
        <button onClick={dismiss} className="absolute top-3 right-3 syn-btn-ghost p-2"><X className="h-4 w-4" /></button>
        {syncing ? (
          <div className="py-10 grid place-items-center text-center gap-4">
            <div className="syn-update-pulse" />
            <div className="text-sm text-muted-foreground mono">Module werden synchronisiert…</div>
            <div className="text-[11px] mono text-cyan-300/70">v{APP_VERSION}</div>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="h-4 w-4" style={{ color: "var(--neural-mint)" }} />
              <div className="text-[10px] mono uppercase tracking-widest text-cyan-300">Update verfügbar</div>
            </div>
            <h2 className="text-2xl font-bold syn-gradient-text">{latest?.title ?? "xSyna Central aktualisiert"}</h2>
            <div className="text-[11px] mono text-muted-foreground mb-3">
              v{latest?.version ?? APP_VERSION}
              {latest?.published_at && ` · ${new Date(latest.published_at).toLocaleDateString()}`}
            </div>
            <div className="syn-card p-4 mb-3 max-h-72 overflow-y-auto whitespace-pre-wrap text-sm leading-relaxed font-sans">
              {latest?.notes_md || "Frische Verbesserungen, kleinere Korrekturen und neue Module sind verfügbar."}
            </div>
            {(latest?.bugfix_ids?.length ?? 0) > 0 && (
              <div className="mb-3">
                <div className="text-[10px] mono uppercase text-muted-foreground mb-1">Behobene Fehler</div>
                <div className="flex flex-wrap gap-1.5">
                  {latest!.bugfix_ids.map((id) => <span key={id} className="syn-chip">{id}</span>)}
                </div>
              </div>
            )}
            {(latest?.feature_ids?.length ?? 0) > 0 && (
              <div className="mb-3">
                <div className="text-[10px] mono uppercase text-muted-foreground mb-1">Neue Funktionen</div>
                <div className="flex flex-wrap gap-1.5">
                  {latest!.feature_ids.map((id) => <span key={id} className="syn-chip">{id}</span>)}
                </div>
              </div>
            )}
            <button onClick={dismiss} className="syn-btn w-full mt-2">Verstanden</button>
          </>
        )}
      </div>
    </div>
  );
}

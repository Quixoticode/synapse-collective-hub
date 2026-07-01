import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Palette, Sparkles } from "lucide-react";
import { designGet, designSet } from "@/lib/design.functions";
import { getCredentials } from "@/lib/syn-session";
import { writeDesignPrefs, readDesignPrefs } from "@/components/NeuromorphicBackground";

export const Route = createFileRoute("/_authenticated/settings/design")({
  ssr: false,
  component: DesignSettingsPage,
});

type Prefs = { bg: "neuromorphic" | "static" | "off"; intensity: number; accent: "synapse" | "mint" | "magenta" | "violet" };

function DesignSettingsPage() {
  const getFn = useServerFn(designGet);
  const setFn = useServerFn(designSet);
  const [p, setP] = useState<Prefs>({ bg: "neuromorphic", intensity: 60, accent: "synapse" });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    setP(readDesignPrefs());
    const c = getCredentials();
    if (c) void getFn({ data: c }).then((r) => { setP(r as Prefs); writeDesignPrefs(r as Prefs); }).catch(() => {});
  }, [getFn]);

  function apply(next: Prefs) { setP(next); writeDesignPrefs(next); }

  async function save() {
    const c = getCredentials(); if (!c) return;
    setBusy(true); setMsg(null);
    try {
      const saved = await setFn({ data: { ...c, ...p } });
      writeDesignPrefs(saved as Prefs);
      setMsg("Gespeichert.");
    } catch (e) { setMsg(e instanceof Error ? e.message : "Fehler."); }
    finally { setBusy(false); }
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-2xl mx-auto pb-28 md:pb-8">
      <header className="mb-5">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
          <Palette className="h-6 w-6" /> Design <span className="syn-chip text-[10px]">BETA</span>
        </h1>
        <p className="text-xs text-muted-foreground mt-1">Neuromorphic-Liquid-Hintergrund & Akzentfarbe.</p>
      </header>

      <section className="syn-card p-5 space-y-5">
        <div>
          <label className="text-xs mono uppercase text-muted-foreground">Hintergrund</label>
          <div className="grid grid-cols-3 gap-2 mt-2">
            {(["neuromorphic","static","off"] as const).map((bg) => (
              <button key={bg} onClick={() => apply({ ...p, bg })}
                className={`p-3 rounded-2xl text-xs ${p.bg === bg ? "syn-tab-active font-semibold" : "syn-btn-ghost"}`}>
                {bg === "neuromorphic" ? "Neuromorphic" : bg === "static" ? "Statisch" : "Aus"}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs mono uppercase text-muted-foreground">Intensität: {p.intensity}%</label>
          <input type="range" min={0} max={100} value={p.intensity} onChange={(e) => apply({ ...p, intensity: Number(e.target.value) })} className="w-full mt-2" />
        </div>

        <div>
          <label className="text-xs mono uppercase text-muted-foreground">Akzent</label>
          <div className="grid grid-cols-4 gap-2 mt-2">
            {(["synapse","mint","magenta","violet"] as const).map((a) => (
              <button key={a} onClick={() => apply({ ...p, accent: a })}
                className={`p-3 rounded-2xl text-xs capitalize ${p.accent === a ? "syn-tab-active font-semibold" : "syn-btn-ghost"}`}>
                {a}
              </button>
            ))}
          </div>
        </div>

        <button onClick={() => void save()} disabled={busy} className="syn-btn w-full">
          <Sparkles className="h-4 w-4" /> {busy ? "Speichere…" : "Speichern"}
        </button>
        {msg && <div className="text-xs text-center text-muted-foreground">{msg}</div>}
      </section>
    </div>
  );
}

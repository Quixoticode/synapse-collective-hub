import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Palette, Sparkles } from "lucide-react";
import { designGet, designSet } from "@/lib/design.functions";
import { getCredentials } from "@/lib/syn-session";
import { writeDesignPrefs, readDesignPrefs, type DesignPrefs } from "@/components/NeuromorphicBackground";

export const Route = createFileRoute("/_authenticated/settings/design")({
  ssr: false,
  component: DesignSettingsPage,
});

function DesignSettingsPage() {
  const getFn = useServerFn(designGet);
  const setFn = useServerFn(designSet);
  const [p, setP] = useState<DesignPrefs>(readDesignPrefs());
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    setP(readDesignPrefs());
    const c = getCredentials();
    if (c) void getFn({ data: c }).then((r) => { setP(r as DesignPrefs); writeDesignPrefs(r as DesignPrefs); }).catch(() => {});
  }, [getFn]);

  function apply(next: DesignPrefs) { setP(next); writeDesignPrefs(next); }

  async function save() {
    const c = getCredentials(); if (!c) return;
    setBusy(true); setMsg(null);
    try {
      const saved = await setFn({ data: { ...c, ...p } });
      writeDesignPrefs(saved as DesignPrefs);
      setMsg("Gespeichert.");
    } catch (e) { setMsg(e instanceof Error ? e.message : "Fehler."); }
    finally { setBusy(false); }
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-2xl mx-auto pb-28 md:pb-8">
      <header className="mb-5">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
          <Palette className="h-6 w-6" /> Design
        </h1>
        <p className="text-xs text-muted-foreground mt-1">Ruhig, angepasst, deins.</p>
      </header>

      <section className="syn-card p-5 space-y-5">
        <Group label="Hintergrund">
          {(["calm","neuromorphic","static","off"] as const).map((bg) => (
            <Chip key={bg} active={p.bg === bg} onClick={() => apply({ ...p, bg })}>
              {bg === "calm" ? "Ruhig" : bg === "neuromorphic" ? "Voll" : bg === "static" ? "Statisch" : "Aus"}
            </Chip>
          ))}
        </Group>

        <div>
          <label className="text-xs mono uppercase text-muted-foreground">Intensität: {p.intensity}%</label>
          <input type="range" min={0} max={100} value={p.intensity} onChange={(e) => apply({ ...p, intensity: Number(e.target.value) })} className="w-full mt-2" />
        </div>

        <Group label="Akzent">
          {(["synapse","mint","magenta","violet"] as const).map((a) => (
            <Chip key={a} active={p.accent === a} onClick={() => apply({ ...p, accent: a })}>
              <span className="capitalize">{a}</span>
            </Chip>
          ))}
        </Group>

        <Group label="Skalierung">
          {(["compact","normal","large"] as const).map((s) => (
            <Chip key={s} active={p.scale === s} onClick={() => apply({ ...p, scale: s })}>
              {s === "compact" ? "Kompakt" : s === "large" ? "Groß" : "Standard"}
            </Chip>
          ))}
        </Group>

        <Group label="Dichte">
          {(["airy","normal","dense"] as const).map((d) => (
            <Chip key={d} active={p.density === d} onClick={() => apply({ ...p, density: d })}>
              {d === "airy" ? "Luftig" : d === "dense" ? "Dicht" : "Standard"}
            </Chip>
          ))}
        </Group>

        <Group label="Animationen">
          {(["off","subtle","full"] as const).map((a) => (
            <Chip key={a} active={p.animation === a} onClick={() => apply({ ...p, animation: a })}>
              {a === "off" ? "Aus" : a === "subtle" ? "Dezent" : "Voll"}
            </Chip>
          ))}
        </Group>

        <button onClick={() => void save()} disabled={busy} className="syn-btn w-full">
          <Sparkles className="h-4 w-4" /> {busy ? "Speichere…" : "Auf allen Geräten speichern"}
        </button>
        {msg && <div className="text-xs text-center text-muted-foreground">{msg}</div>}
      </section>
    </div>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs mono uppercase text-muted-foreground">{label}</label>
      <div className="flex flex-wrap gap-2 mt-2">{children}</div>
    </div>
  );
}
function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className={`px-3 py-2 rounded-2xl text-xs ${active ? "syn-tab-active font-semibold" : "syn-btn-ghost"}`}>
      {children}
    </button>
  );
}

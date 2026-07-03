import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Settings as SettingsIcon, Palette, Sun, Moon, Trash2, LogOut, Smartphone, MessageCircle, Phone, ArrowLeft, Zap, FileSignature } from "lucide-react";
import { getSession, clearSession, getCredentials } from "@/lib/syn-session";
import { quickLoginIssue } from "@/lib/quick-login.functions";

export const Route = createFileRoute("/_authenticated/settings/")({
  ssr: false,
  component: SettingsIndex,
});

const THEME_KEY = "xsyna.theme.v1";
const FP_KEY = "xsyna.deviceFp.v1";

function readTheme(): "dark" | "light" {
  if (typeof window === "undefined") return "dark";
  const v = localStorage.getItem(THEME_KEY);
  return v === "light" ? "light" : "dark";
}
function applyTheme(t: "dark" | "light") {
  document.documentElement.classList.toggle("light", t === "light");
  document.documentElement.classList.toggle("dark", t === "dark");
  localStorage.setItem(THEME_KEY, t);
}

function SettingsIndex() {
  const navigate = useNavigate();
  const quickIssueFn = useServerFn(quickLoginIssue);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [storageKeys, setStorageKeys] = useState<{ key: string; size: number }[]>([]);
  const [quick, setQuick] = useState<{ code: string; expires_at: string } | null>(null);
  const session = typeof window !== "undefined" ? getSession() : null;
  const fp = typeof window !== "undefined" ? localStorage.getItem(FP_KEY) : null;

  useEffect(() => {
    const t = readTheme(); setTheme(t); applyTheme(t);
    const keys: { key: string; size: number }[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i); if (!k) continue;
      keys.push({ key: k, size: (localStorage.getItem(k) || "").length });
    }
    setStorageKeys(keys.sort((a, b) => b.size - a.size));
  }, []);

  function toggleTheme() { const next = theme === "dark" ? "light" : "dark"; setTheme(next); applyTheme(next); }

  function resetLocal() {
    if (!confirm("Alle lokal gespeicherten xSyna-Daten löschen und abmelden?")) return;
    try { localStorage.clear(); sessionStorage.clear(); } catch { /* ignore */ }
    clearSession();
    navigate({ to: "/auth" });
  }

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto pb-28 md:pb-8 space-y-4">
      <header className="flex items-center gap-3">
        <SettingsIcon className="h-6 w-6" />
        <h1 className="text-xl sm:text-2xl font-bold flex-1">Einstellungen</h1>
        <Link to="/apps" className="syn-btn-ghost text-xs"><ArrowLeft className="h-3.5 w-3.5" /> Apps</Link>
      </header>

      <section className="syn-card p-4 space-y-3">
        <div className="flex items-center gap-2 font-semibold text-sm"><Palette className="h-4 w-4" /> Design</div>
        <p className="text-xs text-muted-foreground">Erscheinungsbild, Hintergrund-Animation & Akzente.</p>
        <div className="flex gap-2 flex-wrap">
          <Link to="/settings/design" className="syn-btn"><Palette className="h-4 w-4" /> Design-Einstellungen</Link>
          <button onClick={toggleTheme} className="syn-btn-ghost">
            {theme === "dark" ? <><Sun className="h-4 w-4" /> Light-Mode</> : <><Moon className="h-4 w-4" /> Dark-Mode</>}
          </button>
        </div>
      </section>

      <section className="syn-card p-4 space-y-2">
        <div className="flex items-center gap-2 font-semibold text-sm"><Smartphone className="h-4 w-4" /> Aktuelle Sitzung & Gerät</div>
        <div className="text-xs grid grid-cols-2 gap-2 mt-2">
          <Info label="SLID" value={session?.slid || "—"} />
          <Info label="HL" value={String(session?.hl ?? "—")} />
          <Info label="Abteilung" value={session?.department || "—"} />
          <Info label="Position" value={session?.position || "—"} />
          <Info label="Gerät (FP)" value={fp ? fp.slice(0, 12) + "…" : "—"} />
          <Info label="User-Agent" value={typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 40) + "…" : "—"} />
        </div>
        <details className="mt-3">
          <summary className="text-xs cursor-pointer text-muted-foreground">Lokal gespeicherte Daten ({storageKeys.length})</summary>
          <div className="mt-2 space-y-1 max-h-40 overflow-y-auto text-[11px] mono">
            {storageKeys.map((k) => (
              <div key={k.key} className="flex gap-2"><span className="flex-1 truncate">{k.key}</span><span className="text-muted-foreground">{k.size}b</span></div>
            ))}
          </div>
        </details>
      </section>

      <section className="syn-card p-4 space-y-2">
        <div className="flex items-center gap-2 font-semibold text-sm text-rose-300"><Trash2 className="h-4 w-4" /> Reset</div>
        <p className="text-xs text-muted-foreground">Löscht alle lokal gespeicherten xSyna-Daten (Session, Design-Prefs, Cache) und meldet dich ab.</p>
        <div className="flex gap-2 flex-wrap">
          <button onClick={resetLocal} className="syn-btn" style={{ background: "rgba(244,63,94,0.15)", borderColor: "rgba(244,63,94,0.4)" }}>
            <Trash2 className="h-4 w-4" /> Alles löschen & abmelden
          </button>
          <button onClick={() => { clearSession(); navigate({ to: "/auth" }); }} className="syn-btn-ghost"><LogOut className="h-4 w-4" /> Nur abmelden</button>
        </div>
      </section>

      <section className="syn-card p-4 space-y-2">
        <div className="flex items-center gap-2 font-semibold text-sm"><Phone className="h-4 w-4" /> Support-Kontakt</div>
        <div className="flex flex-wrap gap-2 text-sm">
          <a href="tel:+491773374439" className="syn-btn-ghost"><Phone className="h-4 w-4" /> +49 177 3374439</a>
          <a href="https://wa.me/491773374439" target="_blank" rel="noreferrer" className="syn-btn-ghost" style={{ borderColor: "rgba(37,211,102,0.5)" }}>
            <MessageCircle className="h-4 w-4" style={{ color: "#25d366" }} /> WhatsApp
          </a>
        </div>
        <p className="text-[11px] text-muted-foreground">Telefonzentrale — WhatsApp verfügbar.</p>
      </section>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-2 rounded-lg bg-white/5 min-w-0">
      <div className="text-[10px] mono uppercase text-muted-foreground">{label}</div>
      <div className="mono truncate">{value}</div>
    </div>
  );
}

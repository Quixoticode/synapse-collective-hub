import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Sparkles, KeyRound, ShieldCheck, QrCode, Camera, Image as ImageIcon, X, BadgeCheck, ArrowLeft, LogIn } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { synLoginByPik, synVerifyByPik } from "@/lib/syn.functions";
import { setSession, getSession } from "@/lib/syn-session";
import { SynIDCard, type SynIDCardData } from "@/components/SynIDCard";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "SynID Verbinden – xSyna Central" },
      { name: "description", content: "Sichere SynID-Anmeldung zum xSyna-Kollektiv." },
    ],
  }),
  component: AuthPage,
});

type Mode = "input" | "scan" | "photo";
type Stage = "login" | "verify";

function extractPik(text: string): string | null {
  if (!text) return null;
  const trimmed = text.trim();
  const hex = trimmed.match(/\b[a-f0-9]{16,}\b/i);
  if (hex) return hex[0].toLowerCase();
  try {
    const u = new URL(trimmed);
    const p = u.searchParams.get("pik");
    if (p) return p.trim();
  } catch { /* not a URL */ }
  try {
    const j = JSON.parse(trimmed);
    if (j && typeof j.pik === "string") return j.pik.trim();
  } catch { /* not JSON */ }
  return trimmed.length >= 16 ? trimmed : null;
}

function AuthPage() {
  const navigate = useNavigate();
  const login = useServerFn(synLoginByPik);
  const verify = useServerFn(synVerifyByPik);
  const [stage, setStage] = useState<Stage>("login");
  const [mode, setMode] = useState<Mode>("input");
  const [pik, setPik] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verified, setVerified] = useState<SynIDCardData | null>(null);
  const [verifyState, setVerifyState] = useState<"idle" | "ok" | "fail">("idle");

  useEffect(() => {
    if (getSession()) navigate({ to: "/apps" });
  }, [navigate]);

  // SSO via URL ?pik=...
  useEffect(() => {
    const url = new URL(window.location.href);
    const p = url.searchParams.get("pik");
    if (p) void handle(p);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handle(rawPik: string) {
    const candidate = extractPik(rawPik);
    if (!candidate) { setError("Kein gültiger PIK erkannt."); return; }
    setLoading(true); setError(null); setVerifyState("idle");
    try {
      if (stage === "login") {
        const me = await login({ data: { pik: candidate } });
        setSession(me);
        navigate({ to: "/apps" });
      } else {
        const res = await verify({ data: { pik: candidate } });
        if (res.valid) { setVerified(res.card as SynIDCardData); setVerifyState("ok"); }
        else { setVerified(null); setVerifyState("fail"); setError("SynID nicht gültig."); }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Vorgang fehlgeschlagen.");
    } finally {
      setLoading(false);
    }
  }

  const accent = stage === "verify" ? "var(--neural-mint)" : "var(--synapse)";

  return (
    <div className="min-h-[100dvh] flex items-center justify-center px-4 py-6 sm:py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-5 sm:mb-7">
          <div className="inline-flex items-center gap-2 syn-chip mb-3">
            <Sparkles className="h-3 w-3" /> xSyna Kollektiv
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
            <span className="syn-gradient-text">xSyna Central</span>
          </h1>
          <p className="mt-2 text-xs sm:text-sm text-muted-foreground">
            Login &amp; SynID-Verifikation über das SynID-Modul.
          </p>
        </div>

        {/* Stage switch */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          <button
            onClick={() => { setStage("login"); setVerified(null); setVerifyState("idle"); setError(null); }}
            className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-2xl text-xs sm:text-sm transition-all ${stage === "login" ? "syn-tab-active font-semibold" : "syn-btn-ghost"}`}
          >
            <LogIn className="h-4 w-4" /> Anmelden
          </button>
          <button
            onClick={() => { setStage("verify"); setError(null); }}
            className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-2xl text-xs sm:text-sm transition-all ${stage === "verify" ? "syn-tab-active font-semibold" : "syn-btn-ghost"}`}
          >
            <BadgeCheck className="h-4 w-4" /> SynID verifizieren
          </button>
        </div>

        {/* Verify result card */}
        {stage === "verify" && verified && (
          <div className="mb-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <SynIDCard data={verified} compact />
            <div className="mt-2 flex items-center justify-center gap-1.5 text-xs" style={{ color: "var(--neural-mint)" }}>
              <ShieldCheck className="h-3.5 w-3.5" /> Gültige SynID
            </div>
          </div>
        )}

        <div className="syn-card p-4 sm:p-6 space-y-4 syn-gradient-border" style={{ borderColor: accent }}>
          <div className="grid grid-cols-3 gap-2">
            <ModeBtn active={mode === "input"} onClick={() => setMode("input")} icon={<KeyRound className="h-4 w-4" />} label="Eingabe" />
            <ModeBtn active={mode === "scan"} onClick={() => setMode("scan")} icon={<QrCode className="h-4 w-4" />} label="QR Scan" />
            <ModeBtn active={mode === "photo"} onClick={() => setMode("photo")} icon={<ImageIcon className="h-4 w-4" />} label="Galerie" />
          </div>

          {mode === "input" && (
            <form onSubmit={(e) => { e.preventDefault(); void handle(pik); }} className="space-y-3">
              <label className="text-xs text-muted-foreground mono uppercase tracking-wider">PIK</label>
              <input
                value={pik}
                onChange={(e) => setPik(e.target.value)}
                type="password"
                placeholder="64-stelliger Hex-Key"
                className="syn-input"
                autoComplete="current-password"
                inputMode="text"
              />
              <button type="submit" disabled={loading || pik.length < 16} className="syn-btn w-full">
                {stage === "login" ? <KeyRound className="h-4 w-4" /> : <BadgeCheck className="h-4 w-4" />}
                {loading ? "Verarbeite…" : stage === "login" ? "Authentifizieren" : "Verifizieren"}
              </button>
            </form>
          )}

          {mode === "scan" && <QrScanner onResult={(t) => handle(t)} disabled={loading} />}
          {mode === "photo" && <PhotoScanner onResult={(t) => handle(t)} disabled={loading} />}

          {error && (
            <div className="text-xs text-destructive mono p-2 rounded-lg bg-destructive/10 border border-destructive/30">
              {error}
            </div>
          )}
          {stage === "verify" && verifyState === "fail" && !error && (
            <div className="text-xs mono p-2 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive">
              SynID ungültig.
            </div>
          )}

          <div className="flex items-start gap-2 text-[11px] text-muted-foreground">
            <ShieldCheck className="h-3 w-3 mt-0.5 shrink-0" style={{ color: "var(--neural-mint)" }} />
            <span>
              {stage === "login"
                ? "PIK wird verschlüsselt übertragen und nur serverseitig geprüft."
                : "Verifikation liefert nur die öffentlichen SynID-Karteninfos – keine Sitzung."}
            </span>
          </div>
        </div>

        <div className="mt-4 text-center">
          <Link to="/" className="syn-btn-ghost text-xs inline-flex items-center gap-1">
            <ArrowLeft className="h-3 w-3" /> Zurück
          </Link>
        </div>
      </div>
    </div>
  );
}

function ModeBtn({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button type="button" onClick={onClick}
      className={`flex flex-col items-center gap-1 px-2 py-2.5 rounded-2xl text-[11px] transition-all ${active ? "syn-tab-active font-semibold" : "syn-btn-ghost"}`}>
      {icon}{label}
    </button>
  );
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  interface Window { BarcodeDetector?: any }
}

function QrScanner({ onResult, disabled }: { onResult: (text: string) => void; disabled?: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [running, setRunning] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const stopRef = useRef<() => void>(() => {});

  useEffect(() => () => stopRef.current(), []);

  async function start() {
    setErr(null);
    if (!("BarcodeDetector" in window)) {
      setErr("Dieser Browser unterstützt keinen QR-Scanner. Nutze 'Galerie' oder 'Eingabe'.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      const video = videoRef.current!;
      video.srcObject = stream;
      await video.play();
      setRunning(true);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const detector = new (window as any).BarcodeDetector({ formats: ["qr_code"] });
      let stopped = false;
      const tick = async () => {
        if (stopped) return;
        try {
          const codes = await detector.detect(video);
          if (codes && codes[0]?.rawValue) { stop(); onResult(codes[0].rawValue); return; }
        } catch { /* ignore */ }
        requestAnimationFrame(tick);
      };
      const stop = () => { stopped = true; stream.getTracks().forEach((t) => t.stop()); setRunning(false); };
      stopRef.current = stop;
      requestAnimationFrame(tick);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Kamera nicht verfügbar.");
    }
  }

  return (
    <div className="space-y-3">
      <div className="relative aspect-square w-full overflow-hidden rounded-2xl border border-border bg-black/40">
        <video ref={videoRef} className="h-full w-full object-cover" muted playsInline />
        {!running && (
          <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-xs">
            Kamera bereit
          </div>
        )}
        {running && (
          <button onClick={() => stopRef.current()} className="absolute top-2 right-2 syn-btn-ghost !p-1.5">
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      {!running ? (
        <button onClick={start} disabled={disabled} className="syn-btn w-full">
          <Camera className="h-4 w-4" /> Kamera starten
        </button>
      ) : (
        <p className="text-[11px] text-center text-muted-foreground">Richte den QR-Code auf die Kamera…</p>
      )}
      {err && <p className="text-xs text-destructive mono">{err}</p>}
    </div>
  );
}

function PhotoScanner({ onResult, disabled }: { onResult: (text: string) => void; disabled?: boolean }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onPick(file: File) {
    setErr(null); setBusy(true);
    try {
      if (!("BarcodeDetector" in window)) {
        throw new Error("Dieser Browser kann QR-Bilder nicht decodieren. Nutze 'Eingabe'.");
      }
      const bitmap = await createImageBitmap(file);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const detector = new (window as any).BarcodeDetector({ formats: ["qr_code"] });
      const codes = await detector.detect(bitmap);
      if (!codes || !codes[0]?.rawValue) throw new Error("Kein QR-Code im Bild erkannt.");
      onResult(codes[0].rawValue);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Bild konnte nicht gelesen werden.");
    } finally { setBusy(false); }
  }

  return (
    <div className="space-y-3">
      {/* No `capture` attribute -> opens the photo library on mobile, file picker on desktop */}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) void onPick(f); }}
      />
      <button onClick={() => fileRef.current?.click()} disabled={disabled || busy} className="syn-btn w-full">
        <ImageIcon className="h-4 w-4" /> {busy ? "Lese Bild…" : "Bild aus Galerie wählen"}
      </button>
      <p className="text-[11px] text-center text-muted-foreground">Wähle ein QR-Code-Foto aus deiner Galerie.</p>
      {err && <p className="text-xs text-destructive mono">{err}</p>}
    </div>
  );
}

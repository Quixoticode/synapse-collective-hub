import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Sparkles, KeyRound, ExternalLink, ShieldCheck } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { synLogin } from "@/lib/syn.functions";
import { setSession, getSession } from "@/lib/syn-session";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "SynID Verbinden – SynCRM" },
      { name: "description", content: "Sichere SynID-Anmeldung zum xSyna-Kollektiv." },
    ],
  }),
  component: AuthPage,
});

const SYNID_URL = "https://synid.xsyna.de";

function AuthPage() {
  const navigate = useNavigate();
  const login = useServerFn(synLogin);
  const [slid, setSlid] = useState("");
  const [pik, setPik] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Already logged in? bounce to dashboard
  useEffect(() => {
    if (getSession()) navigate({ to: "/contacts" });
  }, [navigate]);

  // SSO: token in URL hash/query e.g. ?slid=...&pik=...
  useEffect(() => {
    const url = new URL(window.location.href);
    const ssoSlid = url.searchParams.get("slid");
    const ssoPik = url.searchParams.get("pik");
    if (ssoSlid && ssoPik) {
      setSlid(ssoSlid);
      setPik(ssoPik);
      void doLogin(ssoSlid, ssoPik);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function doLogin(s: string, p: string) {
    setLoading(true);
    setError(null);
    try {
      const me = await login({ data: { slid: s.trim(), pik: p.trim() } });
      setSession(me);
      navigate({ to: "/contacts" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Anmeldung fehlgeschlagen.");
    } finally {
      setLoading(false);
    }
  }

  function ssoRedirect() {
    const returnTo = encodeURIComponent(window.location.origin);
    window.location.href = `${SYNID_URL}/auth?return=${returnTo}`;
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 syn-chip mb-4">
            <Sparkles className="h-3 w-3" /> xSyna Kollektiv
          </div>
          <h1 className="text-4xl font-bold tracking-tight">
            <span className="syn-gradient-text">SynCRM</span>
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Verbinde deine SynID, um auf das Kollektiv zuzugreifen.
          </p>
        </div>

        <div className="syn-card p-6 space-y-5 syn-gradient-border">
          <button onClick={ssoRedirect} className="syn-btn w-full">
            <ExternalLink className="h-4 w-4" /> Connect via SynID
          </button>

          <div className="flex items-center gap-3 text-[11px] text-muted-foreground uppercase tracking-widest">
            <div className="h-px flex-1 bg-border" />
            oder lokal anmelden
            <div className="h-px flex-1 bg-border" />
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              void doLogin(slid, pik);
            }}
            className="space-y-3"
          >
            <div>
              <label className="text-xs text-muted-foreground mono uppercase tracking-wider">SLID</label>
              <input
                value={slid}
                onChange={(e) => setSlid(e.target.value)}
                placeholder="20090626"
                className="syn-input mt-1"
                autoComplete="username"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mono uppercase tracking-wider">PIK</label>
              <input
                value={pik}
                onChange={(e) => setPik(e.target.value)}
                type="password"
                placeholder="••••••••••••••••"
                className="syn-input mt-1"
                autoComplete="current-password"
              />
            </div>

            {error && (
              <div className="text-xs text-destructive mono p-2 rounded-lg bg-destructive/10 border border-destructive/30">
                {error}
              </div>
            )}

            <button type="submit" disabled={loading || !slid || !pik} className="syn-btn w-full">
              <KeyRound className="h-4 w-4" />
              {loading ? "Verbinde…" : "Authentifizieren"}
            </button>
          </form>

          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <ShieldCheck className="h-3 w-3" style={{ color: "var(--neural-mint)" }} />
            PIK wird hashiert auf dem Server geprüft. Keine Klartext-Übermittlung an Dritte.
          </div>
        </div>
      </div>
    </div>
  );
}

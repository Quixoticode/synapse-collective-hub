import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { LogOut, Sparkles, MoreHorizontal, X } from "lucide-react";
import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { getSession, clearSession, getCredentials, type SynSession } from "@/lib/syn-session";
import { visibleTabs } from "@/lib/tabs-registry";
import { tabPermsForMe, tabPrefsForMe } from "@/lib/permissions.functions";
import { banStatus } from "@/lib/security.functions";
import { listMyDevices } from "@/lib/devices.functions";
import { StartupAnimation } from "@/components/StartupAnimation";
import { UpdateScreen } from "@/components/UpdateScreen";
import { BanScreen } from "@/components/BanScreen";
import { WorkTimeAttentionCheck } from "@/components/WorkTimeAttentionCheck";
import { STARTUP_PLAYED_KEY } from "@/lib/app-version";

const FP_KEY = "xsyna.deviceFp.v1";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: () => {
    if (typeof window === "undefined") return;
    const raw = localStorage.getItem("syn.session.v1");
    if (!raw) throw redirect({ to: "/auth" });
  },
  component: AuthedLayout,
});

function AuthedLayout() {
  const [session, setSessionState] = useState<SynSession | null>(null);
  const [perms, setPerms] = useState<Record<string, boolean>>({});
  const [prefs, setPrefs] = useState<Record<string, { visible: boolean; sort_order?: number }>>({});
  const [showStartup, setShowStartup] = useState(false);
  const [mobileMore, setMobileMore] = useState(false);
  const [ban, setBan] = useState<{ message: string; expires_at: string | null } | null>(null);
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const fetchPerms = useServerFn(tabPermsForMe);
  const fetchPrefs = useServerFn(tabPrefsForMe);
  const checkBan = useServerFn(banStatus);

  useEffect(() => {
    const sync = () => setSessionState(getSession());
    sync();
    window.addEventListener("syn-session-change", sync);
    window.addEventListener("storage", sync);
    if (typeof window !== "undefined" && !sessionStorage.getItem(STARTUP_PLAYED_KEY)) {
      setShowStartup(true);
    }
    return () => {
      window.removeEventListener("syn-session-change", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const fetchDevices = useServerFn(listMyDevices);

  useEffect(() => {
    if (!session) return;
    const c = getCredentials(); if (!c) return;
    void (async () => {
      try {
        // Ban check first — blocks the whole UI
        const b = await checkBan({ data: { slid: session.slid } }) as { banned: boolean; message?: string; expires_at?: string | null };
        if (b.banned) { setBan({ message: b.message || "Zugriff gesperrt.", expires_at: b.expires_at ?? null }); return; }
        setBan(null);
        const [p, q] = await Promise.all([
          fetchPerms({ data: c }) as Promise<{ tab_key: string; allowed: boolean }[]>,
          fetchPrefs({ data: c }) as Promise<{ tab_key: string; visible: boolean; sort_order: number }[]>,
        ]);
        setPerms(Object.fromEntries(p.map((x) => [x.tab_key, x.allowed])));
        setPrefs(Object.fromEntries(q.map((x) => [x.tab_key, { visible: x.visible, sort_order: x.sort_order }])));
      } catch { /* tolerate */ }
    })();
  }, [session?.slid, fetchPerms, fetchPrefs, checkBan]);

  // Device-revoke poller: if my trusted fingerprint was removed by an admin, force logout.
  useEffect(() => {
    if (!session) return;
    const fp = typeof window !== "undefined" ? localStorage.getItem(FP_KEY) : null;
    if (!fp) return;
    let firstCheckSeen = false;
    let cancelled = false;
    async function check() {
      const c = getCredentials(); if (!c) return;
      try {
        const devs = await fetchDevices({ data: c }) as { device_fingerprint: string }[];
        const mine = devs.some((d) => d.device_fingerprint === fp);
        if (mine) { firstCheckSeen = true; return; }
        if (firstCheckSeen && !cancelled) {
          clearSession();
          navigate({ to: "/auth" });
        }
      } catch { /* ignore */ }
    }
    void check();
    const id = window.setInterval(() => void check(), 60_000);
    return () => { cancelled = true; window.clearInterval(id); };
  }, [session?.slid, fetchDevices, navigate]);

  if (!session) return null;
  function handleLogout() { clearSession(); navigate({ to: "/auth" }); }
  if (ban) return <BanScreen message={ban.message} expiresAt={ban.expires_at} onLogout={handleLogout} />;

  const ctx = { hl: session.hl, isSuperuser: session.isSuperuser };
  const tabs = visibleTabs(ctx, { permissions: perms, prefs });
  const bottomPrimary = tabs.slice(0, 5);

  return (
    <>
      {showStartup && (
        <StartupAnimation onDone={() => {
          sessionStorage.setItem(STARTUP_PLAYED_KEY, "1");
          setShowStartup(false);
        }} />
      )}
      <UpdateScreen />

      <div className="min-h-[100dvh] flex">
        {/* Desktop sidebar */}
        <aside className="hidden md:flex w-64 shrink-0 flex-col border-r border-border bg-card/40 backdrop-blur-sm sticky top-0 h-screen">
          <div className="px-5 py-6 border-b border-border">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-xl syn-gradient-border" style={{ background: "var(--gradient-neural-soft)" }} />
              <div>
                <div className="text-sm font-semibold tracking-wide">xSyna Central</div>
                <div className="text-[10px] mono text-muted-foreground">SynID · Kollektiv</div>
              </div>
            </div>
          </div>
          <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
            {tabs.map((t) => {
              const active = pathname === t.to || pathname.startsWith(t.to + "/");
              const Icon = t.icon;
              return (
                <Link key={t.key} to={t.to}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-2xl text-sm transition-all ${active ? "syn-tab-active font-semibold" : "text-muted-foreground hover:text-foreground hover:bg-accent"}`}>
                  <Icon className="h-4 w-4" /> {t.label}
                </Link>
              );
            })}
          </nav>
          <div className="p-3 border-t border-border">
            <div className="syn-card p-3">
              <div className="text-xs text-muted-foreground mono">SLID</div>
              <div className="text-sm font-semibold mono">{session.slid}</div>
              <div className="mt-2 flex items-center justify-between">
                <span className="syn-chip">HL {session.hl}</span>
                <span className="text-xs text-muted-foreground truncate ml-2">{session.name}</span>
              </div>
              <button onClick={handleLogout} className="syn-btn-ghost w-full mt-3 text-xs">
                <LogOut className="h-3.5 w-3.5" /> Trennen
              </button>
            </div>
          </div>
        </aside>

        <main className="flex-1 min-w-0 flex flex-col">
          {/* mobile top bar */}
          <div className="md:hidden sticky top-0 z-30 flex items-center justify-between px-4 py-3 border-b border-border bg-card/80 backdrop-blur">
            <Link to="/apps" className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" style={{ color: "var(--synapse)" }} />
              <span className="font-semibold">xSyna Central</span>
            </Link>
            <button onClick={handleLogout} className="syn-btn-ghost text-xs"><LogOut className="h-3.5 w-3.5" /></button>
          </div>

          <div className="flex-1 min-w-0 pb-20 md:pb-0">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Fixed mobile bottom nav (always at viewport bottom) */}
      <nav className="md:hidden fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur"
           style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 0.3rem)" }}>
        <div className="grid grid-cols-6 gap-0.5 px-1 pt-2">
          {bottomPrimary.map((t) => {
            const active = pathname === t.to || pathname.startsWith(t.to + "/");
            const Icon = t.icon;
            return (
              <Link key={t.key} to={t.to}
                className={`flex flex-col items-center gap-0.5 px-1 py-1 rounded-xl text-[10px] ${active ? "syn-tab-active font-semibold" : "text-muted-foreground"}`}>
                <Icon className="h-4 w-4" /><span className="truncate max-w-full">{t.label}</span>
              </Link>
            );
          })}
          <button onClick={() => setMobileMore(true)}
            className="flex flex-col items-center gap-0.5 px-1 py-1 rounded-xl text-[10px] text-muted-foreground">
            <MoreHorizontal className="h-4 w-4" /><span>Mehr</span>
          </button>
        </div>
      </nav>

      {mobileMore && (
        <div className="md:hidden fixed inset-0 z-50 bg-black/70 backdrop-blur-sm" onClick={() => setMobileMore(false)}>
          <div className="absolute inset-x-0 bottom-0 syn-card rounded-t-3xl rounded-b-none p-4 animate-in slide-in-from-bottom duration-200" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-semibold">Alle Tabs</div>
              <button onClick={() => setMobileMore(false)} className="syn-btn-ghost"><X className="h-4 w-4" /></button>
            </div>
            <div className="grid grid-cols-4 gap-2 max-h-[60vh] overflow-y-auto pb-[env(safe-area-inset-bottom)]">
              {tabs.map((t) => {
                const Icon = t.icon;
                return (
                  <Link key={t.key} to={t.to} onClick={() => setMobileMore(false)}
                    className="flex flex-col items-center gap-1 p-3 rounded-2xl border border-border hover:border-cyan-400/30">
                    <Icon className="h-5 w-5" /><span className="text-[10px] text-center truncate max-w-full">{t.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

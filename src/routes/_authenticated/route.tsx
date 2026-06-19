import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { LogOut, Users, Contact, Sparkles, MessageSquare, KeyRound, Mail, FileText, BookOpen, Plug, LayoutGrid } from "lucide-react";
import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { getSession, clearSession, type SynSession } from "@/lib/syn-session";

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
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    const sync = () => setSessionState(getSession());
    sync();
    window.addEventListener("syn-session-change", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("syn-session-change", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  if (!session) return null;
  const isHl5 = session.hl >= 5;

  const tabs = [
    { to: "/apps", label: "Apps", icon: LayoutGrid, show: true },
    { to: "/contacts", label: "Kontakte", icon: Contact, show: true },
    { to: "/chat", label: "Chat", icon: MessageSquare, show: true },
    { to: "/mail", label: "SynMail", icon: Mail, show: true },
    { to: "/vault", label: "Tresor", icon: KeyRound, show: true },
    { to: "/workspace", label: "Workspace", icon: FileText, show: true },
    { to: "/basics", label: "Basics", icon: BookOpen, show: true },
    { to: "/collective", label: "Kollektiv", icon: Users, show: isHl5 || !!session.isSuperuser },
    { to: "/settings/integrations", label: "Integrations", icon: Plug, show: !!session.isSuperuser },
  ];

  function handleLogout() {
    clearSession();
    navigate({ to: "/auth" });
  }

  return (
    <div className="min-h-[100dvh] flex">
      {/* Sidebar - desktop only */}
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
          {tabs.filter((t) => t.show).map((t) => {
            const active = pathname.startsWith(t.to);
            const Icon = t.icon;
            return (
              <Link key={t.to} to={t.to}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-2xl text-sm transition-all ${active ? "syn-tab-active font-semibold" : "text-muted-foreground hover:text-foreground hover:bg-accent"}`}>
                <Icon className="h-4 w-4" /> {t.label}
              </Link>
            );
          })}
          {!isHl5 && (
            <div className="mt-4 px-3 py-2 rounded-xl border border-border/60 text-[11px] text-muted-foreground">
              Kollektiv-Verwaltung erfordert HL ≥ 5.
            </div>
          )}
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

        <div className="flex-1 min-w-0">
          <Outlet />
        </div>

        {/* Mobile bottom nav */}
        <nav className="md:hidden sticky bottom-0 z-30 flex gap-1 px-2 py-2 border-t border-border bg-card/90 backdrop-blur overflow-x-auto"
             style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 0.5rem)" }}>
          {tabs.filter((t) => t.show).map((t) => {
            const active = pathname.startsWith(t.to);
            const Icon = t.icon;
            return (
              <Link key={t.to} to={t.to}
                className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl text-[10px] whitespace-nowrap shrink-0 ${active ? "syn-tab-active font-semibold" : "text-muted-foreground"}`}>
                <Icon className="h-4 w-4" />{t.label}
              </Link>
            );
          })}
        </nav>
      </main>
    </div>
  );
}

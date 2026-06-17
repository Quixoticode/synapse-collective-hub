import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { LogOut, Users, Contact, Sparkles, MessageSquare, KeyRound, Mail, FileText, BookOpen } from "lucide-react";
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
    { to: "/contacts", label: "Kontakte", icon: Contact, show: true },
    { to: "/chat", label: "Chat", icon: MessageSquare, show: true },
    { to: "/mail", label: "SynMail", icon: Mail, show: true },
    { to: "/vault", label: "Tresor", icon: KeyRound, show: true },
    { to: "/workspace", label: "Workspace", icon: FileText, show: true },
    { to: "/basics", label: "xSyna Basics", icon: BookOpen, show: true },
    { to: "/collective", label: "Kollektiv", icon: Users, show: isHl5 || !!session.isSuperuser },
  ];

  function handleLogout() {
    clearSession();
    navigate({ to: "/auth" });
  }

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="hidden md:flex w-64 shrink-0 flex-col border-r border-border bg-card/40 backdrop-blur-sm">
        <div className="px-5 py-6 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl syn-gradient-border" style={{ background: "var(--gradient-neural-soft)" }} />
            <div>
              <div className="text-sm font-semibold tracking-wide">SynCRM</div>
              <div className="text-[10px] mono text-muted-foreground">xSyna · Kollektiv</div>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {tabs.filter((t) => t.show).map((t) => {
            const active = pathname.startsWith(t.to);
            const Icon = t.icon;
            return (
              <Link
                key={t.to}
                to={t.to}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-2xl text-sm transition-all ${
                  active ? "syn-tab-active font-semibold" : "text-muted-foreground hover:text-foreground hover:bg-accent"
                }`}
              >
                <Icon className="h-4 w-4" />
                {t.label}
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
              <span className="text-xs text-muted-foreground">{session.name}</span>
            </div>
            <button onClick={handleLogout} className="syn-btn-ghost w-full mt-3 text-xs">
              <LogOut className="h-3.5 w-3.5" /> Trennen
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 min-w-0">
        {/* mobile top bar */}
        <div className="md:hidden flex items-center justify-between px-4 py-3 border-b border-border bg-card/40 backdrop-blur">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" style={{ color: "var(--synapse)" }} />
            <span className="font-semibold">SynCRM</span>
          </div>
          <button onClick={handleLogout} className="syn-btn-ghost text-xs"><LogOut className="h-3.5 w-3.5" /></button>
        </div>
        <div className="md:hidden flex gap-2 p-3 border-b border-border overflow-x-auto">
          {tabs.filter((t) => t.show).map((t) => {
            const active = pathname.startsWith(t.to);
            const Icon = t.icon;
            return (
              <Link key={t.to} to={t.to}
                className={`flex items-center gap-2 px-3 py-2 rounded-2xl text-sm whitespace-nowrap ${active ? "syn-tab-active font-semibold" : "syn-btn-ghost"}`}>
                <Icon className="h-4 w-4" /> {t.label}
              </Link>
            );
          })}
        </div>

        <Outlet />
      </main>
    </div>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Contact, MessageSquare, Mail, KeyRound, FileText, BookOpen, Users, Plug, Calendar,
} from "lucide-react";
import { getSession, type SynSession } from "@/lib/syn-session";
import { SynIDCard } from "@/components/SynIDCard";

export const Route = createFileRoute("/_authenticated/apps")({
  component: AppsLauncher,
});

type Tile = {
  to: string;
  label: string;
  desc: string;
  icon: React.ComponentType<{ className?: string }>;
  show: boolean;
  soon?: boolean;
  accent: string;
};

function AppsLauncher() {
  const [session, setSession] = useState<SynSession | null>(null);
  useEffect(() => { setSession(getSession()); }, []);
  if (!session) return null;

  const isHl5 = session.hl >= 5;
  const su = !!session.isSuperuser;

  const tiles: Tile[] = [
    { to: "/contacts", label: "SynCRM", desc: "Kunden & Leads", icon: Contact, show: true, accent: "from-cyan-500/30 to-blue-500/20" },
    { to: "/chat", label: "SynChat", desc: "Team-Messaging", icon: MessageSquare, show: true, accent: "from-emerald-500/30 to-cyan-500/20" },
    { to: "/mail", label: "SynMail", desc: "E-Mail-Konten", icon: Mail, show: true, accent: "from-violet-500/30 to-cyan-500/20" },
    { to: "/workspace", label: "xSyna Workspace", desc: "Dokumente", icon: FileText, show: true, accent: "from-fuchsia-500/30 to-violet-500/20" },
    { to: "/vault", label: "SynVault", desc: "Passwort-Tresor", icon: KeyRound, show: true, accent: "from-amber-500/30 to-rose-500/20" },
    { to: "/basics", label: "xSyna Basics", desc: "Regeln & AGB", icon: BookOpen, show: true, accent: "from-blue-500/30 to-emerald-500/20" },
    { to: "/apps", label: "SynCal", desc: "Team-Kalender (bald)", icon: Calendar, show: true, soon: true, accent: "from-rose-500/30 to-fuchsia-500/20" },
    { to: "/collective", label: "Kollektiv", desc: "Mitglieder verwalten", icon: Users, show: isHl5 || su, accent: "from-cyan-500/30 to-emerald-500/20" },
    { to: "/settings/integrations", label: "Integrations", desc: "SynID Gateway", icon: Plug, show: su, accent: "from-violet-500/30 to-cyan-500/20" },
  ];

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-5xl mx-auto pb-24 md:pb-8">
      <div className="mb-5 sm:mb-6">
        <SynIDCard data={session} />
      </div>

      <h1 className="text-xl sm:text-2xl font-bold tracking-tight mb-1">Deine Apps</h1>
      <p className="text-xs sm:text-sm text-muted-foreground mb-5">Wähle eine Anwendung aus dem xSyna-Kollektiv.</p>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
        {tiles.filter(t => t.show).map((t, i) => {
          const Icon = t.icon;
          const content = (
            <div
              className={`syn-app-tile group relative overflow-hidden rounded-3xl border border-white/10 bg-card/70 backdrop-blur-sm p-4 sm:p-5 transition-all hover:-translate-y-1 hover:border-white/25 ${t.soon ? "opacity-60" : ""}`}
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <div className={`absolute inset-0 -z-0 bg-gradient-to-br ${t.accent} opacity-40 group-hover:opacity-70 transition-opacity`} />
              <div className="relative z-10 flex flex-col gap-3 min-h-[110px]">
                <div className="h-11 w-11 rounded-2xl bg-black/40 border border-white/10 grid place-items-center">
                  <Icon className="h-5 w-5 text-white" />
                </div>
                <div className="mt-auto">
                  <div className="font-semibold text-sm sm:text-base">{t.label}</div>
                  <div className="text-[11px] text-muted-foreground">{t.desc}</div>
                </div>
              </div>
            </div>
          );
          return t.soon ? (
            <div key={t.label}>{content}</div>
          ) : (
            <Link key={t.label} to={t.to}>{content}</Link>
          );
        })}
      </div>
    </div>
  );
}

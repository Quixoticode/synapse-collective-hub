// Central registry of every tab/app in xSyna Central.
import {
  LayoutGrid, Contact, MessageSquare, KeyRound, FileText, BookOpen,
  Users, Plug, Calendar, LifeBuoy, Wallet, Newspaper, ShieldCheck, Settings,
  CheckSquare, Bell, Palette, ShieldAlert, UserPlus, UsersRound, FileSignature, type LucideIcon,
} from "lucide-react";

export type TabKey =
  | "apps" | "contacts" | "chat" | "vault" | "workspace" | "basics"
  | "calendar" | "support" | "finances" | "news" | "collective" | "tasks"
  | "security" | "notify" | "apply" | "teams"
  | "permissions" | "settings" | "settings.tabs" | "settings.integrations" | "settings.design" | "settings.pdf";

export type TabDef = {
  key: TabKey;
  to: string;
  label: string;
  desc: string;
  icon: LucideIcon;
  accent: string;
  requires?: { hl?: number; superuser?: boolean };
  category: "core" | "admin" | "settings";
  beta?: boolean;
};

export const TABS: TabDef[] = [
  { key: "apps",       to: "/apps",       label: "Apps",       desc: "Übersicht",         icon: LayoutGrid,   accent: "from-cyan-500/30 to-violet-500/20", category: "core" },
  { key: "contacts",   to: "/contacts",   label: "Kontakte",   desc: "Kunden & Leads",    icon: Contact,      accent: "from-cyan-500/30 to-blue-500/20",   category: "core" },
  { key: "chat",       to: "/chat",       label: "Chat",       desc: "Team-Messaging",    icon: MessageSquare,accent: "from-emerald-500/30 to-cyan-500/20",category: "core" },
  { key: "vault",      to: "/vault",      label: "Tresor",     desc: "Passwort-Tresor",   icon: KeyRound,     accent: "from-amber-500/30 to-rose-500/20",  category: "core" },
  { key: "workspace",  to: "/workspace",  label: "Workspace",  desc: "Dokumente",         icon: FileText,     accent: "from-fuchsia-500/30 to-violet-500/20",category: "core" },
  { key: "basics",     to: "/basics",     label: "Basics",     desc: "Regeln & AGB",      icon: BookOpen,     accent: "from-blue-500/30 to-emerald-500/20",category: "core" },
  { key: "calendar",   to: "/calendar",   label: "SynCal",     desc: "Team-Kalender",     icon: Calendar,     accent: "from-rose-500/30 to-fuchsia-500/20",category: "core" },
  { key: "support",    to: "/support",    label: "Support",    desc: "Tickets & Hilfe",   icon: LifeBuoy,     accent: "from-emerald-500/30 to-blue-500/20",category: "core" },
  { key: "tasks",      to: "/tasks",      label: "Tasks",      desc: "Aufgaben",          icon: CheckSquare,  accent: "from-cyan-500/30 to-emerald-500/20",category: "core" },
  { key: "notify",     to: "/notify",     label: "Notify",     desc: "Benachrichtigungen",icon: Bell,         accent: "from-amber-500/30 to-violet-500/20",category: "core" },
  { key: "apply",      to: "/apply",      label: "Applyance",  desc: "Bewerbungen & Stellen", icon: UserPlus, accent: "from-emerald-500/30 to-violet-500/20", category: "core" },
  { key: "teams",      to: "/teams",      label: "Teams",      desc: "Gruppen & Zuordnung",  icon: UsersRound, accent: "from-cyan-500/30 to-fuchsia-500/20", category: "core" },
  { key: "finances",   to: "/finances",   label: "Finanzen",   desc: "Konten & Buchungen",icon: Wallet,       accent: "from-amber-500/30 to-emerald-500/20",category: "admin", requires: { hl: 4 } },
  { key: "news",       to: "/news",       label: "News",       desc: "Updates & Roadmap", icon: Newspaper,    accent: "from-violet-500/30 to-fuchsia-500/20",category: "core" },
  { key: "collective", to: "/collective", label: "Kollektiv",  desc: "Mitglieder",        icon: Users,        accent: "from-cyan-500/30 to-emerald-500/20",category: "admin", requires: { hl: 5 } },
  { key: "security",   to: "/security",   label: "Security",   desc: "Logins & Bans",     icon: ShieldAlert,  accent: "from-rose-500/30 to-amber-500/20",  category: "admin", requires: { hl: 4 } },
  { key: "permissions",to: "/permissions",label: "Berechtigungen", desc: "Tab-Rechte",    icon: ShieldCheck,  accent: "from-fuchsia-500/30 to-blue-500/20",category: "admin", requires: { hl: 5 } },
  { key: "settings",              to: "/settings",              label: "Einstellungen",    desc: "Session · Design · Reset", icon: Settings, accent: "from-blue-500/30 to-violet-500/20", category: "settings" },
  { key: "settings.tabs",         to: "/settings/tabs",         label: "Tab-Sichtbarkeit", desc: "Meine Tabs",   icon: Settings, accent: "from-blue-500/30 to-violet-500/20", category: "settings" },
  { key: "settings.design",       to: "/settings/design",       label: "Design",           desc: "Neuromorphic", icon: Palette,  accent: "from-fuchsia-500/30 to-cyan-500/20", category: "settings" },
  { key: "settings.pdf",          to: "/settings/pdf",          label: "PDF-Vorlagen",     desc: "Druckvorlagen",icon: FileSignature, accent: "from-amber-500/30 to-cyan-500/20", category: "settings", requires: { hl: 5 } },
  { key: "settings.integrations", to: "/settings/integrations", label: "Integrations",     desc: "SynID Gateway",icon: Plug,     accent: "from-violet-500/30 to-cyan-500/20", category: "settings", requires: { superuser: true } },
];

export type TabsCtx = { hl: number; isSuperuser?: boolean };
export type TabRule = { permissions?: Record<string, boolean>; prefs?: Record<string, { visible: boolean; sort_order?: number }> };

export function visibleTabs(ctx: TabsCtx, rule: TabRule = {}) {
  return TABS.filter((t) => {
    if (t.requires?.superuser && !ctx.isSuperuser) return false;
    if (t.requires?.hl && ctx.hl < t.requires.hl && !ctx.isSuperuser) return false;
    if (rule.permissions && rule.permissions[t.key] === false) return false;
    if (rule.prefs && rule.prefs[t.key] && rule.prefs[t.key].visible === false) return false;
    return true;
  }).sort((a, b) => (rule.prefs?.[a.key]?.sort_order ?? 0) - (rule.prefs?.[b.key]?.sort_order ?? 0));
}

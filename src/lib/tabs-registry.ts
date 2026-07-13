// Central registry of every module/tab in xSyna Central.
// Visibility is driven purely by per-feature permissions (see features.ts) —
// there is no HL hierarchy anymore. The superuser sees everything.
import {
  Home, Clock, CheckSquare, Calendar, Contact, MessageSquare, KeyRound,
  FileText, BookOpen, Newspaper, BookText, UserPlus, UsersRound, ShieldAlert,
  Wallet, CircleUser, Settings, type LucideIcon,
} from "lucide-react";
import type { Feature } from "./features";

// Kept as a permissive alias for older imports.
export type TabKey = string;

export type TabCategory = "core" | "admin" | "personal";

export type TabDef = {
  key: string;
  to: string;
  label: string;
  desc: string;
  icon: LucideIcon;
  feature: Feature; // permission key required to see this module
  category: TabCategory;
  order: number;
};

export const TABS: TabDef[] = [
  { key: "home",      to: "/home",       label: "Startseite", desc: "Übersicht heute",        icon: Home,          feature: "home",     category: "core",     order: 10 },
  { key: "worktime",  to: "/worktime",   label: "WorkTime",   desc: "Arbeitszeit",            icon: Clock,         feature: "worktime", category: "core",     order: 20 },
  { key: "tasks",     to: "/tasks",      label: "Tasks",      desc: "Projekte & Aufgaben",    icon: CheckSquare,   feature: "tasks",    category: "core",     order: 30 },
  { key: "calendar",  to: "/calendar",   label: "Kalender",   desc: "Termine",                icon: Calendar,      feature: "calendar", category: "core",     order: 40 },
  { key: "contacts",  to: "/contacts",   label: "Kontakte",   desc: "CRM · Kunden & Leads",   icon: Contact,       feature: "contacts", category: "core",     order: 50 },
  { key: "chat",      to: "/chat",       label: "Chat",       desc: "Nachrichten & Support",  icon: MessageSquare, feature: "chat",     category: "core",     order: 60 },
  { key: "vault",     to: "/vault",      label: "Tresor",     desc: "Passwort-Tresor",        icon: KeyRound,      feature: "vault",    category: "core",     order: 70 },
  { key: "workspace", to: "/workspace",  label: "Workspace",  desc: "Dokumente",              icon: FileText,      feature: "workspace",category: "core",     order: 80 },
  { key: "basics",    to: "/basics",     label: "Basics",     desc: "AGB · Lizenzen · Guides",icon: BookOpen,      feature: "basics",   category: "core",     order: 90 },
  { key: "news",      to: "/news",       label: "News",       desc: "Roadmap & Updates",      icon: Newspaper,     feature: "news",     category: "core",     order: 100 },
  { key: "docs",      to: "/docs",       label: "Docs",       desc: "Dokumentation",          icon: BookText,      feature: "docs",     category: "core",     order: 110 },
  { key: "apply",     to: "/applyance",  label: "Applyance",  desc: "Bewerbungen & Stellen",  icon: UserPlus,      feature: "apply",    category: "admin",    order: 120 },
  { key: "teams",     to: "/teams",      label: "Teams",      desc: "Accounts & Rechte",      icon: UsersRound,    feature: "teams",    category: "admin",    order: 130 },
  { key: "security",  to: "/security",   label: "Security",   desc: "Logins & Geräte",        icon: ShieldAlert,   feature: "security", category: "admin",    order: 140 },
  { key: "payments",  to: "/finances",   label: "Payments",   desc: "Budget & Buchungen",     icon: Wallet,        feature: "payments", category: "admin",    order: 150 },
  { key: "account",   to: "/account",    label: "Mein Account", desc: "Profil & Passkeys",    icon: CircleUser,    feature: "account",  category: "personal", order: 160 },
  { key: "settings",  to: "/settings",   label: "Einstellungen", desc: "Design · Admin",      icon: Settings,      feature: "settings", category: "personal", order: 170 },
];

// Given the set of features the current account is allowed to use (already
// superuser-resolved server-side) and the account's own visibility prefs,
// return the ordered list of tabs to show.
export function visibleTabs(
  allowed: Set<string>,
  prefs: Record<string, { visible: boolean; sort_order?: number }> = {},
): TabDef[] {
  return TABS
    .filter((t) => allowed.has(t.feature))
    .filter((t) => prefs[t.key]?.visible !== false)
    .sort((a, b) => (prefs[a.key]?.sort_order ?? a.order) - (prefs[b.key]?.sort_order ?? b.order));
}

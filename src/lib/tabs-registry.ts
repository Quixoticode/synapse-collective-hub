import {
  Home, Clock, CheckSquare, Calendar, Contact, MessageSquare, KeyRound,
  FileText, BookOpen, Newspaper, BookText, UserPlus, UsersRound, ShieldAlert,
  Wallet, CircleUser, Settings, ClipboardList, ShieldCheck, type LucideIcon,
} from "lucide-react";
import type { Feature, ModuleFeature } from "./features";

export interface TabDef {
  key: string;
  to: string;
  label: string;
  desc: string;
  icon: LucideIcon;
  feature: Feature;
  category: "core" | "admin" | "personal";
  order: number;
}

export const TABS: TabDef[] = [
  { key: "home",      to: "/",           label: "Start",      desc: "Dashboard & Quick-Login",icon: Home,         feature: "home",     category: "core",     order: 10 },
  { key: "worktime",  to: "/worktime",   label: "WorkTime",   desc: "Zeiterfassung",         icon: Clock,        feature: "worktime", category: "core",     order: 20 },
  { key: "tasks",     to: "/tasks",      label: "Tasks",      desc: "Aufgaben-Tracking",     icon: CheckSquare,  feature: "tasks",    category: "core",     order: 30 },
  { key: "calendar",  to: "/calendar",   label: "Calendar",   desc: "Termine & Events",      icon: Calendar,     feature: "calendar", category: "core",     order: 40 },
  { key: "contacts",  to: "/contacts",   label: "Contacts",   desc: "Kontaktliste",          icon: Contact,      feature: "contacts", category: "core",     order: 50 },
  { key: "chat",      to: "/chat",       label: "Chat",       desc: "Notizen & Chat",        icon: MessageSquare,feature: "chat",     category: "core",     order: 60 },
  { key: "vault",     to: "/vault",      label: "Vault",      desc: "Passwörter & OTPs",     icon: KeyRound,     feature: "vault",    category: "core",     order: 70 },
  { key: "workspace", to: "/workspace",  label: "Workspace",  desc: "Docs & Dateien",        icon: FileText,     feature: "workspace",category: "core",     order: 80 },
  { key: "basics",    to: "/basics",     label: "Basics",     desc: "Grundlagen / Wiki",     icon: BookOpen,     feature: "basics",   category: "core",     order: 90 },
  { key: "news",      to: "/news",       label: "News",       desc: "Neuigkeiten",           icon: Newspaper,    feature: "news",     category: "core",     order: 100 },
  { key: "docs",      to: "/docs",       label: "Docs",       desc: "Dokumente",             icon: BookText,     feature: "docs",     category: "core",     order: 110 },
  { key: "apply",     to: "/apply",      label: "Apply",      desc: "Bewerbungen",           icon: UserPlus,     feature: "apply",    category: "admin",    order: 120 },
  { key: "teams",     to: "/teams",      label: "Teams",      desc: "Teams & Ränge",         icon: UsersRound,   feature: "teams",    category: "admin",    order: 130 },
  { key: "security",  to: "/security",   label: "Security",   desc: "Sicherheit & Logs",     icon: ShieldAlert,  feature: "security", category: "admin",    order: 140 },
  { key: "payments",  to: "/finances",   label: "Payments",   desc: "Budget & Buchungen",     icon: Wallet,        feature: "payments", category: "admin",    order: 150 },
  { key: "auftrag",   to: "/auftrag",    label: "Aufträge",   desc: "Kundenaufträge & Todos", icon: ClipboardList, feature: "auftrag",  category: "core",     order: 155 },
  { key: "admin",     to: "/admin",      label: "Admin",      desc: "System & Berechtigungen",icon: ShieldCheck,   feature: "admin",    category: "admin",    order: 158 },
  { key: "account",   to: "/account",    label: "Mein Account", desc: "Profil & Passkeys",    icon: CircleUser,    feature: "account",  category: "personal", order: 160 },
  { key: "settings",  to: "/settings",   label: "Einstellungen", desc: "Design · Admin",      icon: Settings,      feature: "settings", category: "personal", order: 170 },
];

export function tabsForFeatures(features: Feature[]): TabDef[] {
  return TABS.filter((t) => features.includes(t.feature as Feature)).sort(
    (a, b) => a.order - b.order,
  );
}

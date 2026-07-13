// Central feature / permission registry.
//
// Every module and every sensitive action maps to a permission key. The
// superuser (only Jake) bypasses ALL checks. A non-superuser account starts
// from DEFAULT_ALLOWED and then receives explicit grants (allowed=true) or
// revokes (allowed=false) stored in the `user_tab_permissions` table.
//
// This replaces the old HL (hierarchy level) system: access is now granted
// per-feature, never by a numeric rank.

// Module-level keys — control whether a module is visible/usable at all.
export const MODULE_FEATURES = [
  "home",
  "worktime",
  "tasks",
  "calendar",
  "contacts",
  "chat",
  "vault",
  "workspace",
  "basics",
  "news",
  "docs",
  "apply",
  "teams",
  "security",
  "payments",
  "account",
  "settings",
] as const;
export type ModuleFeature = (typeof MODULE_FEATURES)[number];

// Action-level keys — finer-grained rights inside a module.
export const ACTION_FEATURES = [
  "worktime.manage", // edit / invalidate / hide other people's times
  "contacts.manage",
  "calendar.manage",
  "tasks.manage",
  "teams.manage", // upgrade accounts, departments, positions
  "teams.permissions", // grant per-account permissions
  "security.all", // view / manage other accounts' security data
  "settings.admin", // admin settings submenu
  "maintenance.manage", // maintenance mode + temporary bans
  "news.manage",
  "docs.manage",
  "basics.manage",
  "payments.manage",
  "apply.manage",
  "vault.shared",
  "sso.admin",
] as const;
export type ActionFeature = (typeof ACTION_FEATURES)[number];

export type Feature = ModuleFeature | ActionFeature;

export const ALL_FEATURES: Feature[] = [...MODULE_FEATURES, ...ACTION_FEATURES];

// Granted to every authenticated account (including a plain `kunde`) without
// needing an explicit grant. Everything else is deny-by-default.
export const DEFAULT_ALLOWED: Feature[] = [
  "home",
  "account",
  "settings",
  "chat", // customers only see their own support conversation
  "news",
  "docs",
  "basics",
];

export function isFeature(x: string): x is Feature {
  return (ALL_FEATURES as string[]).includes(x);
}

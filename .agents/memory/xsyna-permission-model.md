---
name: xSyna Central permission model
description: How access control works after the HL-hierarchy removal — per-feature grants, single superuser, defaults, and what still needs migrating.
---

xSyna Central's old access model ranked every account by a numeric `hl`
(hierarchy level) field on `employees`, and most gates were `hl >= N` checks.
The **new architecture** (built as the foundation task) is a deny-by-default,
per-feature permission model:

- `src/lib/features.ts` defines the full feature catalogue: one key per
  module (`home`, `worktime`, `teams`, ...) plus finer action keys
  (`teams.permissions`, `settings.admin`, `maintenance.manage`, ...).
- `DEFAULT_ALLOWED` is what every authenticated account gets with zero
  grants (home, account, settings, chat, news, docs, basics).
- Explicit grants/revokes live in `user_tab_permissions` (`slid`, `tab_key`,
  `allowed`).
- `getEffectivePermissions(actor)` / `requirePermission(actor, key)` in
  `src/lib/syn-auth.server.ts` resolve/enforce this. Exactly **one**
  superuser account bypasses every check — must never become two accounts
  again (a past superuser bug was caused by a duplicate account holding the
  role while the passkey-active account didn't).
- `requireHl` was deleted from `syn-auth.server.ts`.

**Not yet migrated (tracked as follow-up, one per dependent module task):**
most individual module server-functions still gate on `me.hl < N` /
`session.hl >= N` directly instead of calling `requirePermission`:
`worktime.functions.ts`, `teams.functions.ts`, `versions.functions.ts`,
`quick-login.functions.ts`, `pdf-templates.functions.ts`,
`notify.functions.ts`, `finances.functions.ts`, `docs.functions.ts`,
`basics.functions.ts`, `apply.functions.ts`, and the matching route files
(`worktime.tsx`, `teams.tsx`, `support.tsx`, `notify.tsx`, `news.tsx`,
`docs-admin.tsx`, `contacts.tsx`, `collective.tsx`, `basics.tsx`). The
`apply_positions.hl_max` column is a job-requirement field, not user access
control — it's a product decision (rename/keep) for whoever rebuilds
Applyance, not a security migration.

**Why:** rebuilding every module's permission checks at once (in the
foundation pass) risked breaking working features across the whole app
without per-module review; migrating hl-checks to `requirePermission` calls
is scoped into each module's own rebuild task instead.

**How to apply:** when rebuilding any module listed above, replace its
`hl`-based checks with `requirePermission(me, "<module>.<action>")` (add the
action key to `features.ts` first if it doesn't exist yet), and remove the
`session.hl >=` UI conditionals in favor of reading the account's resolved
feature set (e.g. via `myPermissions`).

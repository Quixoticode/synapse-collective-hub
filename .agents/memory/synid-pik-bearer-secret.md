---
name: xSyna SynID PIK-as-bearer-secret
description: Why employees.pik must never be silently rotated without checking downstream effects (vault encryption, multi-device sessions).
---

In xSyna Central (SynCRM), nearly every server function authorizes via `verifyActor(slid, pik)` — `pik` is
checked directly against the `employees.pik` column on almost every request, not via a short-lived token.
Practically every feature module (worktime, chat, vault, mail, docs, finances, permissions, teams, tasks,
calendar, versions, support, quick-login, devices) is wired this way.

Two consequences that are easy to miss:

1. **`pik` doubles as an encryption passphrase.** `vaultEncrypt`/`vaultDecrypt` in `syn-session.ts` derive an
   AES key via PBKDF2 straight from the current session's `pik`. If `pik` is ever rotated, any vault entries
   encrypted under the old `pik` become permanently undecryptable. `webauthn.server.ts`'s `finishRegistration`
   already does this rotation once (deliberately, to invalidate PIK login after a passkey is added) — that is
   a known, accepted trade-off, but do not add more rotation paths (e.g. rotating `pik` on every passkey
   *login*) without re-checking this.
2. **`pik` is effectively a shared per-account bearer secret already**, not something re-typed on every
   login — `loginByTrustedDevice` already fetches and hands back the current `emp.pik` value to any trusted
   device by fingerprint, with no rotation. This means it's safe to also return the current `pik` from
   passkey-authentication endpoints (mirroring the trusted-device pattern) to bridge passkey login into the
   legacy `SynSession` (`slid,pik,name,hl,...` shape from `syn-session.ts`) that the rest of the app's
   `beforeLoad` guard and every feature module expect — this is how passkey-only accounts get full app access
   without a large-scale refactor of every `actor(slid, pik)` call site.

**How to apply:** before changing anything related to `employees.pik`, PIK login, or passkey auth, check
whether the change rotates `pik` for an account that might already hold vault-encrypted data, and whether it
preserves compatibility with the trusted-device and legacy-session bridging patterns described above.

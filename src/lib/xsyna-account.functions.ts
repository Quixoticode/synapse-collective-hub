// xSyna Account — Passkey-basierte Server-Functions.
// Keep top-level imports client-safe; server-only work happens inside .handler().
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

async function wa() { return import("./webauthn.server"); }
async function admin() { const m = await import("@/integrations/supabase/client.server"); return m.supabaseAdmin; }
async function actor(slid: string, pik: string) { const m = await import("./syn-auth.server"); return m.verifyActor(slid, pik); }

function originFromInput(o?: string | null): string {
  return (o && /^https?:\/\//i.test(o)) ? o : "https://pass.xsyna.de";
}

function randomHex(bytes: number) {
  return Array.from(crypto.getRandomValues(new Uint8Array(bytes)), (b) => b.toString(16).padStart(2, "0")).join("");
}

// -------- Passkey registration (requires either PIK or an existing xSyna token) --------

const regBeginInput = z.object({
  slid: z.string().min(1),
  pik: z.string().min(8).optional(),
  token: z.string().optional(),
  origin: z.string().optional(),
});

export const xaBeginRegistration = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => regBeginInput.parse(d))
  .handler(async ({ data }) => {
    let slid = data.slid;
    if (data.token) {
      const { verifySessionToken } = await wa();
      const { slid: s } = await verifySessionToken(data.token);
      slid = s;
    } else if (data.pik) {
      const me = await actor(slid, data.pik);
      slid = me.slid;
    } else {
      throw new Error("PIK oder Session-Token erforderlich.");
    }
    const sb = await admin();
    const { data: emp } = await sb.from("employees").select("name").eq("slid", slid).maybeSingle();
    const { beginRegistration } = await wa();
    return beginRegistration(slid, originFromInput(data.origin), emp?.name ?? slid);
  });

const regFinishInput = z.object({
  slid: z.string().min(1),
  pik: z.string().min(8).optional(),
  token: z.string().optional(),
  device_label: z.string().max(80).optional(),
  origin: z.string().optional(),
  response: z.unknown(),
});

export const xaFinishRegistration = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => regFinishInput.parse(d))
  .handler(async ({ data }) => {
    let slid = data.slid;
    if (data.token) {
      const { verifySessionToken } = await wa();
      slid = (await verifySessionToken(data.token)).slid;
    } else if (data.pik) {
      slid = (await actor(slid, data.pik)).slid;
    } else {
      throw new Error("PIK oder Session-Token erforderlich.");
    }
    const { finishRegistration, mintSessionToken } = await wa();
    await finishRegistration(slid, data.response as never, data.device_label || "Neues Gerät", originFromInput(data.origin));
    const session = await mintSessionToken(slid);
    return session;
  });

// -------- Passkey authentication (login) --------

export const xaBeginAuth = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ slid: z.string().optional().nullable(), origin: z.string().optional() }).parse(d))
  .handler(async ({ data }) => {
    const { beginAuthentication } = await wa();
    return beginAuthentication(data.slid ?? null, originFromInput(data.origin));
  });

// Builds the full legacy-compatible session (same shape as SynID/PIK login)
// plus the xSyna passkey token/profile, from a verified SLID. Reused by
// passkey-authentication, and by fresh signups right after registration.
async function buildFullSession(slid: string) {
  const { mintSessionToken } = await wa();
  const session = await mintSessionToken(slid);
  const sb = await admin();
  const { data: emp } = await sb.from("employees").select("slid,name,hl,pik,regid,cip,department,position,kind").eq("slid", slid).maybeSingle();
  const { data: prof } = await sb.from("xsyna_accounts" as never).select("first_name,last_name,email,avatar_url").eq("slid", slid).maybeSingle() as { data: { first_name?: string; last_name?: string; email?: string; avatar_url?: string } | null };
  const { data: su } = await sb.rpc("has_role", { _slid: slid, _role: "superuser" });
  return {
    ...session,
    slid, name: emp?.name ?? slid, hl: emp?.hl ?? 0, pik: emp?.pik ?? "", regid: emp?.regid ?? "", cip: emp?.cip ?? "",
    department: emp?.department ?? null, position: emp?.position ?? null, kind: emp?.kind ?? null,
    isSuperuser: !!su,
    profile: prof ? { first_name: prof.first_name ?? null, last_name: prof.last_name ?? null, email: prof.email ?? null, avatar_url: prof.avatar_url ?? null } : undefined,
  };
}

export const xaFinishAuth = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ response: z.unknown(), origin: z.string().optional() }).parse(d))
  .handler(async ({ data }) => {
    const { finishAuthentication } = await wa();
    const { slid } = await finishAuthentication(data.response as never, originFromInput(data.origin));
    return buildFullSession(slid);
  });

// After a token-authenticated action (e.g. finishing a fresh passkey
// registration), fetch the same full legacy-compatible session shape so the
// client can call setSession() and get full app access immediately.
export const xaSessionForToken = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ token: z.string() }).parse(d))
  .handler(async ({ data }) => {
    const { verifySessionToken } = await wa();
    const { slid } = await verifySessionToken(data.token);
    return buildFullSession(slid);
  });

// -------- Account profile + credentials mgmt (token-authenticated) --------

async function requireToken(token: string) {
  const { verifySessionToken } = await wa();
  return verifySessionToken(token);
}

export const xaMe = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ token: z.string() }).parse(d))
  .handler(async ({ data }) => {
    const { slid } = await requireToken(data.token);
    const sb = await admin();
    const { data: emp } = await sb.from("employees").select("slid,name,hl,kind,department,position,email").eq("slid", slid).maybeSingle();
    const { data: prof } = await sb.from("xsyna_accounts" as never).select("*").eq("slid", slid).maybeSingle() as { data: Record<string, unknown> | null };
    // Fetch roles from employee_roles table
    const { data: roles } = await sb.from("employee_roles").select("role").eq("slid", slid);
    return { slid, employee: emp, profile: (prof ?? null) as unknown as Record<string, string | number | boolean | null> | null, roles: (roles ?? []).map((r: { role: string }) => r.role) };
  });

export const xaUpdateProfile = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({
    token: z.string(),
    first_name: z.string().max(60).nullable().optional(),
    last_name: z.string().max(60).nullable().optional(),
    email: z.string().email().nullable().optional(),
    birthdate: z.string().nullable().optional(),
    company: z.string().max(120).nullable().optional(),
    avatar_url: z.string().url().nullable().optional(),
    contact_json: z.record(z.string(), z.unknown()).optional(),
  }).parse(d))
  .handler(async ({ data }) => {
    const { slid } = await requireToken(data.token);
    const sb = await admin();
    const patch: Record<string, unknown> = {};
    (["first_name","last_name","email","birthdate","company","avatar_url","contact_json"] as const).forEach((k) => {
      if (data[k] !== undefined) patch[k] = data[k];
    });
    await sb.from("xsyna_accounts" as never).update(patch as never).eq("slid", slid);
    return { ok: true };
  });

export const xaListCredentials = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ token: z.string() }).parse(d))
  .handler(async ({ data }) => {
    const { slid } = await requireToken(data.token);
    const sb = await admin();
    const { data: rows } = await sb.from("webauthn_credentials" as never)
      .select("id,device_label,transports,created_at,last_used_at,backup_state")
      .eq("slid", slid)
      .order("created_at", { ascending: false }) as { data: Array<{ id: string; device_label: string; transports: string[]; created_at: string; last_used_at: string | null; backup_state: boolean }> | null };
    return rows ?? [];
  });

export const xaDeleteCredential = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ token: z.string(), id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { slid } = await requireToken(data.token);
    const sb = await admin();
    await sb.from("webauthn_credentials" as never).delete().eq("id", data.id).eq("slid", slid);
    return { ok: true };
  });

// -------- Cross-device pairing (8-digit code) --------

export const xaBeginPairing = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ slid: z.string(), pik: z.string().min(8).optional(), token: z.string().optional() }).parse(d))
  .handler(async ({ data }) => {
    let slid = data.slid;
    if (data.token) slid = (await requireToken(data.token)).slid;
    else if (data.pik) slid = (await actor(slid, data.pik)).slid;
    else throw new Error("PIK oder Token erforderlich.");
    const rand = crypto.getRandomValues(new Uint32Array(1))[0] % 100000000;
    const code = rand.toString().padStart(8, "0");
    const sb = await admin();
    await sb.from("xsyna_pairings" as never).insert({
      pairing_code: code, slid, status: "pending",
      expires_at: new Date(Date.now() + 10 * 60_000).toISOString(),
    } as never);
    return { code, expires_at: new Date(Date.now() + 10 * 60_000).toISOString() };
  });

export const xaConsumePairing = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ code: z.string().regex(/^\d{8}$/) }).parse(d))
  .handler(async ({ data }) => {
    const sb = await admin();
    const { data: row } = await sb.from("xsyna_pairings" as never)
      .select("*").eq("pairing_code", data.code).maybeSingle() as { data: { id: string; slid: string; status: string; expires_at: string } | null };
    if (!row) throw new Error("Kopplungscode unbekannt.");
    if (row.status !== "pending") throw new Error("Code bereits verwendet.");
    if (new Date(row.expires_at) < new Date()) throw new Error("Code abgelaufen.");
    await sb.from("xsyna_pairings" as never).update({ status: "consumed" } as never).eq("id", row.id);
    return { slid: row.slid };
  });

// -------- Admin module — account management (superuser only) --------

async function requireSuperuserByToken(token: string) {
  const { verifySessionToken } = await wa();
  const { slid } = await verifySessionToken(token);
  const sb = await admin();
  const { data: r } = await sb.from("employee_roles").select("role").eq("slid", slid).eq("role", "superuser").maybeSingle();
  if (!r) throw new Error("Superuser-Rechte erforderlich.");
  return slid;
}

export const xaAdminListAccounts = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ token: z.string() }).parse(d))
  .handler(async ({ data }) => {
    await requireSuperuserByToken(data.token);
    const sb = await admin();
    const { data: employees } = await sb.from("employees").select("slid,name,email,hl,kind,department,position,created_at").order("created_at", { ascending: false });
    const { data: allRoles } = await sb.from("employee_roles").select("slid,role");
    const { data: allProfiles } = await sb.from("xsyna_accounts" as never).select("slid,first_name,last_name,email,passkey_migrated");
    const rolesBySlid: Record<string, string[]> = {};
    (allRoles ?? []).forEach((r: { slid: string; role: string }) => {
      if (!rolesBySlid[r.slid]) rolesBySlid[r.slid] = [];
      rolesBySlid[r.slid].push(r.role);
    });
    const profBySlid: Record<string, { first_name?: string; last_name?: string; email?: string; passkey_migrated?: boolean }> = {};
    (allProfiles ?? []).forEach((p: { slid: string; first_name?: string; last_name?: string; email?: string; passkey_migrated?: boolean }) => {
      profBySlid[p.slid] = p;
    });
    return (employees ?? []).map((e: { slid: string; name: string; email: string | null; hl: number; kind: string; department: string | null; position: string | null; created_at: string }) => ({
      ...e,
      roles: rolesBySlid[e.slid] ?? [],
      profile: profBySlid[e.slid] ?? null,
    }));
  });

export const xaAdminCreateAccount = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({
    token: z.string(),
    name: z.string().min(1),
    email: z.string().email().optional().or(z.literal("")),
    kind: z.enum(["kunde", "partner", "mitarbeiter"]),
    hl: z.number().int().min(1).max(7).optional(),
    department: z.string().optional(),
    position: z.string().optional(),
  }).parse(d))
  .handler(async ({ data }) => {
    await requireSuperuserByToken(data.token);
    const sb = await admin();
    // Generate SLID
    let slid = "";
    for (let i = 0; i < 20; i++) {
      const candidate = "K" + Array.from({ length: 8 }, () => Math.floor(Math.random() * 10)).join("");
      const { data: exists } = await sb.from("employees").select("slid").eq("slid", candidate).maybeSingle();
      if (!exists) { slid = candidate; break; }
    }
    if (!slid) throw new Error("Konnte keine eindeutige SynID erzeugen.");

    const { error: empErr } = await sb.from("employees").insert({
      slid, name: data.name, hl: data.hl ?? 1, kind: data.kind,
      regid: "ADMIN-CREATED", pik: randomHex(32), cip: randomHex(8),
      email: data.email || null, department: data.department || null, position: data.position || null,
    });
    if (empErr) throw new Error(empErr.message);

    const { error: roleErr } = await sb.from("employee_roles").insert({ slid, role: data.kind });
    if (roleErr) throw new Error(roleErr.message);

    return { slid, name: data.name, pik: "(nur Passkey — kein PIK)" };
  });

export const xaAdminUpdateRoles = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({
    token: z.string(),
    target_slid: z.string().min(1),
    roles: z.array(z.enum(["superuser", "admin", "mitarbeiter", "partner", "kunde"])),
  }).parse(d))
  .handler(async ({ data }) => {
    await requireSuperuserByToken(data.token);
    const sb = await admin();
    // Delete all existing roles for target
    await sb.from("employee_roles").delete().eq("slid", data.target_slid);
    // Insert new role set
    const inserts = data.roles.map((role) => ({ slid: data.target_slid, role }));
    const { error } = await sb.from("employee_roles").insert(inserts);
    if (error) throw new Error(error.message);
    // Update kind to match highest tier role
    const tierPriority = ["superuser", "admin", "mitarbeiter", "partner", "kunde"];
    const highestTier = tierPriority.find((t) => data.roles.includes(t as any));
    if (highestTier) {
      const kindMap: Record<string, string> = { superuser: "mitarbeiter", admin: "mitarbeiter", mitarbeiter: "mitarbeiter", partner: "partner", kunde: "kunde" };
      await sb.from("employees").update({ kind: kindMap[highestTier] }).eq("slid", data.target_slid);
    }
    return { ok: true };
  });

export const xaAdminDeleteAccount = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({
    token: z.string(),
    target_slid: z.string().min(1),
  }).parse(d))
  .handler(async ({ data }) => {
    await requireSuperuserByToken(data.token);
    // Prevent deleting own account
    const { verifySessionToken } = await wa();
    const { slid: callerSlid } = await verifySessionToken(data.token);
    if (data.target_slid === callerSlid) throw new Error("Du kannst nicht deinen eigenen Account löschen.");
    const sb = await admin();
    await sb.from("webauthn_credentials").delete().eq("slid", data.target_slid);
    await sb.from("xsyna_accounts" as never).delete().eq("slid", data.target_slid);
    await sb.from("employee_roles").delete().eq("slid", data.target_slid);
    await sb.from("employees").delete().eq("slid", data.target_slid);
    return { ok: true };
  });

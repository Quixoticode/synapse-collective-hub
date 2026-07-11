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
    const { data: emp } = await sb.from("employees").select("slid,name,hl,kind,department,position").eq("slid", slid).maybeSingle();
    const { data: prof } = await sb.from("xsyna_accounts" as never).select("*").eq("slid", slid).maybeSingle() as { data: Record<string, unknown> | null };
    return { slid, employee: emp, profile: (prof ?? null) as unknown as Record<string, string | number | boolean | null> | null };
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
// Device A (already authenticated / has PIK) issues a pairing code.
// Device B opens /account/pair and enters the code + creates a passkey.

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
    // Return slid so the second device can start a passkey registration for that slid.
    // Also mark consumed to prevent replay.
    await sb.from("xsyna_pairings" as never).update({ status: "consumed" } as never).eq("id", row.id);
    return { slid: row.slid };
  });

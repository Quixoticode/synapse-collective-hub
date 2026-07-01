import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}
const creds = z.object({ slid: z.string(), pik: z.string() });

// Register a device as trusted after a successful PIK login.
export const registerTrustedDevice = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => creds.extend({
    device_fingerprint: z.string().min(4),
    device_model: z.string().optional(),
    os: z.string().optional(),
    user_agent: z.string().optional(),
    days: z.number().int().min(1).max(365).default(90),
  }).parse(d))
  .handler(async ({ data }) => {
    const a = await admin();
    const { data: emp } = await a.from("employees").select("slid").eq("slid", data.slid).eq("pik", data.pik).maybeSingle();
    if (!emp) throw new Error("Ungültige SynID.");
    const expires = new Date(Date.now() + data.days * 86400_000).toISOString();
    await a.from("user_sessions").upsert({
      slid: emp.slid,
      device_fingerprint: data.device_fingerprint,
      device_model: data.device_model || null,
      os: data.os || null,
      user_agent: data.user_agent || null,
      trusted: true,
      last_seen_at: new Date().toISOString(),
      expires_at: expires,
    }, { onConflict: "slid,device_fingerprint" });
    return { ok: true, expires_at: expires };
  });

// Trusted-device auto-login: given slid + fingerprint, return session-shape info
// without requiring PIK. Only works when a trusted, non-expired session row exists.
export const loginByTrustedDevice = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({
    slid: z.string(), device_fingerprint: z.string().min(4),
  }).parse(d))
  .handler(async ({ data }) => {
    const a = await admin();
    const { data: s } = await a.from("user_sessions")
      .select("expires_at,trusted")
      .eq("slid", data.slid)
      .eq("device_fingerprint", data.device_fingerprint)
      .eq("trusted", true)
      .maybeSingle();
    if (!s || !s.trusted) throw new Error("Gerät nicht vertrauenswürdig.");
    if (s.expires_at && new Date(s.expires_at) < new Date()) throw new Error("Vertrauens-Ablauf.");
    const { data: emp } = await a.from("employees").select("*").eq("slid", data.slid).maybeSingle();
    if (!emp) throw new Error("Unbekannter Mitarbeiter.");
    const { data: su } = await a.rpc("has_role", { _slid: emp.slid, _role: "superuser" });
    await a.from("user_sessions").update({ last_seen_at: new Date().toISOString() })
      .eq("slid", data.slid).eq("device_fingerprint", data.device_fingerprint);
    return {
      slid: emp.slid, pik: emp.pik, name: emp.name, hl: emp.hl,
      regid: emp.regid, cip: emp.cip,
      department: emp.department ?? null, position: emp.position ?? null,
      kind: emp.kind ?? null, isSuperuser: !!su,
    };
  });

export const listMyDevices = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => creds.parse(d))
  .handler(async ({ data }) => {
    const a = await admin();
    const { data: emp } = await a.from("employees").select("slid").eq("slid", data.slid).eq("pik", data.pik).maybeSingle();
    if (!emp) throw new Error("Ungültige SynID.");
    const { data: rows } = await a.from("user_sessions").select("*").eq("slid", emp.slid).order("last_seen_at", { ascending: false });
    return rows ?? [];
  });

export const revokeMyDevice = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => creds.extend({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const a = await admin();
    const { data: emp } = await a.from("employees").select("slid").eq("slid", data.slid).eq("pik", data.pik).maybeSingle();
    if (!emp) throw new Error("Ungültige SynID.");
    await a.from("user_sessions").delete().eq("id", data.id).eq("slid", emp.slid);
    return { ok: true };
  });

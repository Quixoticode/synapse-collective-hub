import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}
async function verify(slid: string, pik: string, minHl = 4) {
  const a = await admin();
  const { data, error } = await a.from("employees").select("slid,hl").eq("slid", slid).eq("pik", pik).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Ungültige SynID.");
  if (data.hl < minHl) throw new Error(`HL ${minHl}+ erforderlich.`);
  return data;
}
const creds = z.object({ slid: z.string(), pik: z.string() });

// Public: check if a slid is currently banned (no auth needed; safe read-only)
export const banStatus = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ slid: z.string() }).parse(d))
  .handler(async ({ data }) => {
    const a = await admin();
    const { data: b } = await a.from("user_bans").select("message,expires_at,created_at").eq("slid", data.slid).eq("active", true).order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (!b) return { banned: false as const };
    if (b.expires_at && new Date(b.expires_at) < new Date()) {
      await a.from("user_bans").update({ active: false }).eq("slid", data.slid);
      return { banned: false as const };
    }
    return { banned: true as const, message: b.message, expires_at: b.expires_at };
  });

export const securityOverview = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => creds.parse(d))
  .handler(async ({ data }) => {
    await verify(data.slid, data.pik, 4);
    const a = await admin();
    const [{ data: emps }, { data: last }, { data: sess }, { data: bans }] = await Promise.all([
      a.from("employees").select("slid,name,hl,kind"),
      a.from("login_events").select("slid,created_at,ok,device_model,os,ip").order("created_at", { ascending: false }).limit(500),
      a.from("user_sessions").select("*").order("last_seen_at", { ascending: false }),
      a.from("user_bans").select("*").eq("active", true),
    ]);
    return { employees: emps ?? [], events: last ?? [], sessions: sess ?? [], bans: bans ?? [] };
  });

export const banUser = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => creds.extend({ target: z.string(), message: z.string().min(1).max(500), hours: z.number().int().min(1).max(24*30) }).parse(d))
  .handler(async ({ data }) => {
    const me = await verify(data.slid, data.pik, 4);
    if (data.target === me.slid) throw new Error("Selbst-Bann nicht möglich.");
    const a = await admin();
    const expires = new Date(Date.now() + data.hours * 3600_000).toISOString();
    await a.from("user_bans").update({ active: false }).eq("slid", data.target).eq("active", true);
    const { data: b, error } = await a.from("user_bans").insert({ slid: data.target, message: data.message, banned_by: me.slid, expires_at: expires, active: true }).select().single();
    if (error) throw new Error(error.message);
    return b;
  });

export const unbanUser = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => creds.extend({ target: z.string() }).parse(d))
  .handler(async ({ data }) => {
    await verify(data.slid, data.pik, 4);
    const a = await admin();
    const { error } = await a.from("user_bans").update({ active: false }).eq("slid", data.target).eq("active", true);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const revokeSession = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => creds.extend({ session_id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    await verify(data.slid, data.pik, 4);
    const a = await admin();
    const { error } = await a.from("user_sessions").delete().eq("id", data.session_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// Called from the auth layer to log events
export const logLoginEvent = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({
    slid: z.string(), ok: z.boolean(), method: z.string().optional(),
    device_model: z.string().optional(), os: z.string().optional(),
    user_agent: z.string().optional(),
  }).parse(d))
  .handler(async ({ data }) => {
    const a = await admin();
    await a.from("login_events").insert({
      slid: data.slid, ok: data.ok, method: data.method || "pik",
      device_model: data.device_model || null, os: data.os || null,
      user_agent: data.user_agent || null,
    });
    return { ok: true };
  });

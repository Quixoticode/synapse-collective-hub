import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

async function admin() { const m = await import("@/integrations/supabase/client.server"); return m.supabaseAdmin; }
async function auth() { return import("./syn-auth.server"); }
async function actor(slid: string, pik: string) { const m = await auth(); return m.verifyActor(slid, pik); }

const creds = z.object({ slid: z.string().min(1), pik: z.string().min(8) });
const PING_TIMEOUT_MIN = 3;

async function cleanupStale(sb: Awaited<ReturnType<typeof admin>>) {
  const cutoff = new Date(Date.now() - PING_TIMEOUT_MIN * 60_000).toISOString();
  await sb.from("work_sessions")
    .update({ status: "invalidated", invalidated_reason: "ping_timeout", ended_at: cutoff })
    .eq("status", "active")
    .lt("last_ping_at", cutoff);
}

// ---- Shifts (planned by leadership) ----
export const wtShiftsList = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => creds.extend({
    from: z.string(), to: z.string(),
    slid_filter: z.string().optional().nullable(),
  }).parse(d))
  .handler(async ({ data }) => {
    const me = await actor(data.slid, data.pik);
    const sb = await admin();
    let q = sb.from("work_shifts").select("*").gte("starts_at", data.from).lte("starts_at", data.to).order("starts_at");
    if (data.slid_filter) q = q.eq("slid", data.slid_filter);
    else if (!(await (await auth()).hasPermission(me, "worktime.manage"))) q = q.eq("slid", me.slid);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const wtShiftUpsert = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => creds.extend({
    id: z.string().uuid().optional(),
    target_slid: z.string().min(1),
    starts_at: z.string(),
    ends_at: z.string(),
    note: z.string().optional().nullable(),
  }).parse(d))
  .handler(async ({ data }) => {
    const me = await actor(data.slid, data.pik);
    await (await auth()).requirePermission(me, "worktime.manage");
    const sb = await admin();
    const payload = {
      slid: data.target_slid, starts_at: data.starts_at, ends_at: data.ends_at,
      note: data.note || null, created_by: me.slid,
    };
    if (data.id) {
      const { data: u, error } = await sb.from("work_shifts").update(payload).eq("id", data.id).select().single();
      if (error) throw new Error(error.message); return u;
    }
    const { data: ins, error } = await sb.from("work_shifts").insert(payload).select().single();
    if (error) throw new Error(error.message); return ins;
  });

export const wtShiftDelete = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => creds.extend({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const me = await actor(data.slid, data.pik);
    await (await auth()).requirePermission(me, "worktime.manage");
    const sb = await admin();
    const { error } = await sb.from("work_shifts").delete().eq("id", data.id);
    if (error) throw new Error(error.message); return { ok: true };
  });

// ---- Admin session CRUD (HL 5+) ----
export const wtSessionUpsert = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => creds.extend({
    id: z.string().uuid().optional(),
    target_slid: z.string().min(1),
    started_at: z.string(),
    ended_at: z.string().nullable().optional(),
    status: z.enum(["active","completed","invalidated"]).default("completed"),
    invalidated_reason: z.string().nullable().optional(),
    shift_id: z.string().uuid().nullable().optional(),
  }).parse(d))
  .handler(async ({ data }) => {
    const me = await actor(data.slid, data.pik);
    await (await auth()).requirePermission(me, "worktime.manage");
    const sb = await admin();
    const payload = {
      slid: data.target_slid, started_at: data.started_at,
      ended_at: data.ended_at ?? null, status: data.status,
      invalidated_reason: data.invalidated_reason ?? null,
      shift_id: data.shift_id ?? null,
      last_ping_at: new Date().toISOString(),
    };
    if (data.id) {
      const { data: u, error } = await sb.from("work_sessions").update(payload).eq("id", data.id).select().single();
      if (error) throw new Error(error.message); return u;
    }
    const { data: ins, error } = await sb.from("work_sessions").insert(payload).select().single();
    if (error) throw new Error(error.message); return ins;
  });

export const wtSessionAdminDelete = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => creds.extend({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const me = await actor(data.slid, data.pik);
    await (await auth()).requirePermission(me, "worktime.manage");
    const sb = await admin();
    const { error } = await sb.from("work_sessions").delete().eq("id", data.id);
    if (error) throw new Error(error.message); return { ok: true };
  });

// ---- Sessions (actual work time) ----
export const wtSessionsList = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => creds.extend({
    from: z.string(), to: z.string(),
    slid_filter: z.string().optional().nullable(),
  }).parse(d))
  .handler(async ({ data }) => {
    const me = await actor(data.slid, data.pik);
    const sb = await admin();
    await cleanupStale(sb);
    let q = sb.from("work_sessions").select("*").gte("started_at", data.from).lte("started_at", data.to).order("started_at");
    if (data.slid_filter) q = q.eq("slid", data.slid_filter);
    else if (!(await (await auth()).hasPermission(me, "worktime.manage"))) q = q.eq("slid", me.slid);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const wtSessionActive = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => creds.parse(d))
  .handler(async ({ data }) => {
    const me = await actor(data.slid, data.pik);
    const sb = await admin();
    await cleanupStale(sb);
    const { data: row } = await sb.from("work_sessions")
      .select("*").eq("slid", me.slid).eq("status", "active")
      .order("started_at", { ascending: false }).limit(1).maybeSingle();
    return row;
  });

export const wtSessionStart = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => creds.extend({ shift_id: z.string().uuid().optional().nullable() }).parse(d))
  .handler(async ({ data }) => {
    const me = await actor(data.slid, data.pik);
    const sb = await admin();
    await cleanupStale(sb);
    // close any lingering active session for this slid first
    await sb.from("work_sessions").update({ status: "invalidated", invalidated_reason: "restart", ended_at: new Date().toISOString() })
      .eq("slid", me.slid).eq("status", "active");
    const { data: ins, error } = await sb.from("work_sessions").insert({
      slid: me.slid, shift_id: data.shift_id || null,
      started_at: new Date().toISOString(), last_ping_at: new Date().toISOString(),
      status: "active",
    }).select().single();
    if (error) throw new Error(error.message); return ins;
  });

export const wtSessionPing = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => creds.extend({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const me = await actor(data.slid, data.pik);
    const sb = await admin();
    const { data: row } = await sb.from("work_sessions").select("slid,status").eq("id", data.id).maybeSingle();
    if (!row) throw new Error("Session nicht gefunden.");
    if (row.slid !== me.slid) throw new Error("Nicht deine Session.");
    if (row.status !== "active") return { ok: false, status: row.status };
    await sb.from("work_sessions").update({ last_ping_at: new Date().toISOString() }).eq("id", data.id);
    return { ok: true };
  });

export const wtSessionStop = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => creds.extend({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const me = await actor(data.slid, data.pik);
    const sb = await admin();
    const { data: row } = await sb.from("work_sessions").select("slid,status").eq("id", data.id).maybeSingle();
    if (!row) throw new Error("Session nicht gefunden.");
    if (row.slid !== me.slid) throw new Error("Nicht deine Session.");
    if (row.status !== "active") return { ok: true };
    await sb.from("work_sessions").update({ status: "completed", ended_at: new Date().toISOString() }).eq("id", data.id);
    return { ok: true };
  });

export const wtSessionInvalidate = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => creds.extend({ id: z.string().uuid(), reason: z.string().max(60) }).parse(d))
  .handler(async ({ data }) => {
    const me = await actor(data.slid, data.pik);
    const sb = await admin();
    const { data: row } = await sb.from("work_sessions").select("slid,status").eq("id", data.id).maybeSingle();
    if (!row || row.slid !== me.slid || row.status !== "active") return { ok: true };
    await sb.from("work_sessions").update({
      status: "invalidated", invalidated_reason: data.reason, ended_at: new Date().toISOString(),
    }).eq("id", data.id);
    return { ok: true };
  });

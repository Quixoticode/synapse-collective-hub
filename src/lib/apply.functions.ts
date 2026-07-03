import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

async function admin() { const m = await import("@/integrations/supabase/client.server"); return m.supabaseAdmin; }
async function actor(slid: string, pik: string) { const m = await import("./syn-auth.server"); return m.verifyActor(slid, pik); }

const creds = z.object({ slid: z.string().min(1), pik: z.string().min(8) });

// ---- Public: list open positions ----
export const applyPositionsPublic = createServerFn({ method: "POST" })
  .handler(async () => {
    const sb = await admin();
    const { data, error } = await sb.from("apply_positions").select("*").eq("open", true).order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

// ---- Public: submit anonymous application ----
export const applySubmitAnon = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({
    position_id: z.string().uuid().optional().nullable(),
    applicant_name: z.string().min(1),
    contact: z.string().optional().nullable(),
    wish: z.string().optional().nullable(),
    note: z.string().optional().nullable(),
  }).parse(d))
  .handler(async ({ data }) => {
    const sb = await admin();
    const { error } = await sb.from("apply_applications").insert({
      position_id: data.position_id || null,
      applicant_name: data.applicant_name,
      contact: data.contact || null,
      wish: data.wish || null,
      note: data.note || null,
      source: "anon",
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---- Auth: list all positions (open + closed) ----
export const applyPositionsAll = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => creds.parse(d))
  .handler(async ({ data }) => {
    await actor(data.slid, data.pik);
    const sb = await admin();
    const { data: rows, error } = await sb.from("apply_positions").select("*").order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

// ---- Auth (Leitung HL>=5 or service): upsert position ----
export const applyPositionUpsert = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => creds.extend({
    id: z.string().uuid().optional(),
    department: z.string().min(1),
    team: z.string().optional().nullable(),
    position: z.string().min(1),
    hl_max: z.number().int().min(1).max(9).default(3),
    description: z.string().optional().nullable(),
    open: z.boolean().default(true),
  }).parse(d))
  .handler(async ({ data }) => {
    const me = await actor(data.slid, data.pik);
    if (!me.isSuperuser && me.hl < 5 && me.kind !== "service") throw new Error("Nur Leitung (HL 5+ / Service).");
    const sb = await admin();
    const payload = {
      department: data.department, team: data.team || null, position: data.position,
      hl_max: data.hl_max, description: data.description || null, open: data.open, created_by: me.slid,
    };
    if (data.id) {
      const { data: u, error } = await sb.from("apply_positions").update(payload).eq("id", data.id).select().single();
      if (error) throw new Error(error.message); return u;
    }
    const { data: ins, error } = await sb.from("apply_positions").insert(payload).select().single();
    if (error) throw new Error(error.message); return ins;
  });

export const applyPositionDelete = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => creds.extend({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const me = await actor(data.slid, data.pik);
    if (!me.isSuperuser && me.hl < 5 && me.kind !== "service") throw new Error("Nur Leitung.");
    const sb = await admin();
    const { error } = await sb.from("apply_positions").delete().eq("id", data.id);
    if (error) throw new Error(error.message); return { ok: true };
  });

// ---- Auth: list applications ----
export const applyApplicationsList = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => creds.parse(d))
  .handler(async ({ data }) => {
    await actor(data.slid, data.pik);
    const sb = await admin();
    const { data: rows, error } = await sb.from("apply_applications").select("*").order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

// ---- Auth (employees): hire — creates an employees row for a position with hl < own hl ----
export const applyHire = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => creds.extend({
    application_id: z.string().uuid().optional(),
    name: z.string().min(1),
    email: z.string().email().optional().or(z.literal("")).nullable(),
    department: z.string().min(1),
    position: z.string().min(1),
    hl: z.number().int().min(1),
    kind: z.string().default("member"),
  }).parse(d))
  .handler(async ({ data }) => {
    const me = await actor(data.slid, data.pik);
    if (!me.isSuperuser && data.hl >= me.hl) throw new Error("HL muss niedriger als deins sein.");
    const sb = await admin();
    // Generate synthetic slid/regid/cip/pik (real assignment can be edited later)
    const rand = () => Math.random().toString(16).slice(2).padEnd(8, "0").slice(0, 8);
    const slid = "S" + Math.floor(1000 + Math.random() * 8999).toString();
    const pik = Array.from(crypto.getRandomValues(new Uint8Array(32))).map((b) => b.toString(16).padStart(2, "0")).join("");
    const regid = "R" + rand().toUpperCase();
    const cip = Math.floor(100000 + Math.random() * 899999).toString();
    const { data: emp, error } = await sb.from("employees").insert({
      slid, pik, regid, cip, name: data.name, email: data.email || null,
      department: data.department, position: data.position, hl: data.hl, kind: data.kind,
    }).select().single();
    if (error) throw new Error(error.message);
    if (data.application_id) {
      await sb.from("apply_applications").update({ status: "hired" }).eq("id", data.application_id);
    }
    return { employee: emp, credentials: { slid, pik, regid, cip } };
  });

// ---- Auth: set application status (accept / reject / reopen) ----
export const applyApplicationSetStatus = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => creds.extend({
    id: z.string().uuid(),
    status: z.enum(["pending","accepted","rejected"]),
  }).parse(d))
  .handler(async ({ data }) => {
    const me = await actor(data.slid, data.pik);
    if (!me.isSuperuser && me.hl < 5 && me.kind !== "service") throw new Error("Nur Leitung darf Bewerbungen entscheiden.");
    const sb = await admin();
    const { error } = await sb.from("apply_applications").update({ status: data.status }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

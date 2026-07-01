import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// --- helpers (server-only) -------------------------------------------------

async function getAdmin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

async function verify(slid: string, pik: string) {
  const admin = await getAdmin();
  const { data, error } = await admin
    .from("employees")
    .select("*")
    .eq("slid", slid)
    .eq("pik", pik)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Ungültige SynID-Anmeldedaten.");
  return data;
}

const creds = z.object({ slid: z.string().min(1), pik: z.string().min(8) });

// --- AUTH ------------------------------------------------------------------

async function buildSession(me: {
  slid: string; pik: string; name: string; hl: number; regid: string; cip: string;
  department?: string | null; position?: string | null; kind?: string;
}) {
  const admin = await getAdmin();
  const { data: su } = await admin.rpc("has_role", { _slid: me.slid, _role: "superuser" });
  return {
    slid: me.slid,
    pik: me.pik,
    name: me.name,
    hl: me.hl,
    regid: me.regid,
    cip: me.cip,
    department: me.department ?? null,
    position: me.position ?? null,
    kind: me.kind ?? null,
    isSuperuser: !!su,
  };
}

export const synLogin = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => creds.parse(d))
  .handler(async ({ data }) => buildSession(await verify(data.slid, data.pik)));

// PIK-only login: PIK is a long (64-char hex) hash, unique per user.
export const synLoginByPik = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ pik: z.string().min(16) }).parse(d))
  .handler(async ({ data }) => {
    const admin = await getAdmin();
    const { data: rows, error } = await admin
      .from("employees")
      .select("*")
      .eq("pik", data.pik)
      .limit(2);
    if (error) throw new Error(error.message);
    if (!rows || rows.length === 0) throw new Error("PIK nicht erkannt.");
    if (rows.length > 1) throw new Error("Mehrdeutige PIK – bitte SLID zusätzlich angeben.");
    return buildSession(rows[0]);
  });

// Public verify: returns ONLY public-card fields, never grants a session.
// Used by the "SynID verifizieren" button on /auth.
export const synVerifyByPik = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ pik: z.string().min(16) }).parse(d))
  .handler(async ({ data }) => {
    const admin = await getAdmin();
    const { data: rows, error } = await admin
      .from("employees")
      .select("slid,name,hl,kind,regid,kwn,kwn_active,department,position")
      .eq("pik", data.pik)
      .limit(2);
    if (error) throw new Error(error.message);
    if (!rows || rows.length === 0) return { valid: false as const, reason: "unknown" as const };
    if (rows.length > 1) return { valid: false as const, reason: "ambiguous" as const };
    return { valid: true as const, card: rows[0] };
  });

// --- CRM -------------------------------------------------------------------

export const crmList = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => creds.parse(d))
  .handler(async ({ data }) => {
    const me = await verify(data.slid, data.pik);
    const admin = await getAdmin();
    // HL >= 5 sees all CRM data; below sees only own
    const q = admin.from("crm_data").select("*").order("created_at", { ascending: false });
    const { data: rows, error } = me.hl >= 5 ? await q : await q.eq("owner_slid", me.slid);
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

const crmUpsertSchema = creds.extend({
  id: z.string().uuid().optional(),
  name: z.string().min(1),
  company: z.string().optional().nullable(),
  email: z.string().email().optional().or(z.literal("")).nullable(),
  phone: z.string().optional().nullable(),
  status: z.enum(["lead", "active", "won", "lost"]).default("lead"),
  tags: z.array(z.string()).default([]),
  notes: z.string().optional().nullable(),
});

export const crmUpsert = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => crmUpsertSchema.parse(d))
  .handler(async ({ data }) => {
    const me = await verify(data.slid, data.pik);
    const admin = await getAdmin();
    const payload = {
      name: data.name,
      company: data.company || null,
      email: data.email || null,
      phone: data.phone || null,
      status: data.status,
      tags: data.tags,
      notes: data.notes || null,
      owner_slid: me.slid,
    };
    if (data.id) {
      // ensure owner or HL>=5
      const { data: row } = await admin.from("crm_data").select("owner_slid").eq("id", data.id).maybeSingle();
      if (!row) throw new Error("Kontakt nicht gefunden.");
      if (row.owner_slid !== me.slid && me.hl < 5) throw new Error("Keine Berechtigung.");
      const { data: updated, error } = await admin
        .from("crm_data")
        .update(payload)
        .eq("id", data.id)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return updated;
    }
    const { data: inserted, error } = await admin.from("crm_data").insert(payload).select().single();
    if (error) throw new Error(error.message);
    return inserted;
  });

export const crmDelete = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => creds.extend({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const me = await verify(data.slid, data.pik);
    const admin = await getAdmin();
    const { data: row } = await admin.from("crm_data").select("owner_slid").eq("id", data.id).maybeSingle();
    if (!row) throw new Error("Kontakt nicht gefunden.");
    if (row.owner_slid !== me.slid && me.hl < 5) throw new Error("Keine Berechtigung.");
    const { error } = await admin.from("crm_data").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// --- EMPLOYEES (HL >= 5 only) ---------------------------------------------

function requireHl5(hl: number) {
  if (hl < 5) throw new Error("Hierarchie-Level 5+ erforderlich.");
}

export const employeesList = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => creds.parse(d))
  .handler(async ({ data }) => {
    const me = await verify(data.slid, data.pik);
    requireHl5(me.hl);
    const admin = await getAdmin();
    const { data: rows, error } = await admin
      .from("employees")
      .select("slid,hl,regid,name,kind,kwn,kwn_active,email,notes,department,position,created_at,updated_at")
      .order("hl", { ascending: false });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

const empPayload = z.object({
  caller_slid: z.string(),
  caller_pik: z.string(),
  target_slid: z.string().min(4),
  original_slid: z.string().optional(),
  name: z.string().min(1),
  hl: z.number().int().min(1).max(7),
  kind: z.enum(["mitarbeiter", "partner", "kunde"]).default("mitarbeiter"),
  regid: z.string().min(1),
  // PIK and CIP are optional on EDIT (empty = keep unchanged); required on create.
  pik: z.string().optional().default(""),
  cip: z.string().optional().default(""),
  kwn: z.string().optional().nullable(),
  kwn_active: z.boolean().default(false),
  email: z.string().email().optional().or(z.literal("")).nullable(),
  notes: z.string().optional().nullable(),
  department: z.string().optional().nullable(),
  position: z.string().optional().nullable(),
});

export const employeeSave = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => empPayload.parse(d))
  .handler(async ({ data }) => {
    const me = await verify(data.caller_slid, data.caller_pik);
    requireHl5(me.hl);
    const admin = await getAdmin();
    const isEdit = !!data.original_slid;

    if (!isEdit) {
      // Create: PIK & CIP are mandatory
      if (!data.pik || data.pik.length < 8) throw new Error("PIK (min. 8 Zeichen) erforderlich.");
      if (!data.cip) throw new Error("CIP erforderlich.");
    }

    // Base row without pik/cip
    type EmpRow = {
      slid: string; name: string; hl: number; regid: string; kind: string;
      kwn: string | null; kwn_active: boolean; email: string | null; notes: string | null;
      department: string | null; position: string | null; pik?: string; cip?: string;
    };
    const row: EmpRow = {
      slid: data.target_slid,
      name: data.name,
      hl: data.hl,
      regid: data.regid,
      kind: data.kind,
      kwn: data.kwn || null,
      kwn_active: data.kwn_active,
      email: data.email || null,
      notes: data.notes || null,
      department: data.department || null,
      position: data.position || null,
    };
    if (data.pik) row.pik = data.pik;
    if (data.cip) row.cip = data.cip;

    if (isEdit && data.original_slid && data.original_slid !== data.target_slid) {
      const { data: existing } = await admin.from("employees").select("pik,cip").eq("slid", data.original_slid).maybeSingle();
      if (existing) {
        if (!row.pik) row.pik = existing.pik;
        if (!row.cip) row.cip = existing.cip;
      }
      const { error: delErr } = await admin.from("employees").delete().eq("slid", data.original_slid);
      if (delErr) throw new Error(delErr.message);
      const insertRow = { ...row, pik: row.pik!, cip: row.cip! };
      const { data: saved, error } = await admin.from("employees").insert(insertRow).select().single();
      if (error) throw new Error(error.message);
      return saved;
    }

    if (isEdit) {
      const { data: saved, error } = await admin.from("employees").update(row).eq("slid", data.target_slid).select().single();
      if (error) throw new Error(error.message);
      return saved;
    }

    const insertRow = { ...row, pik: row.pik!, cip: row.cip! };
    const { data: saved, error } = await admin.from("employees").insert(insertRow).select().single();
    if (error) throw new Error(error.message);
    return saved;
  });

const empDelPayload = z.object({
  caller_slid: z.string(),
  caller_pik: z.string(),
  target_slid: z.string(),
});

export const employeeDelete = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => empDelPayload.parse(d))
  .handler(async ({ data }) => {
    const me = await verify(data.caller_slid, data.caller_pik);
    requireHl5(me.hl);
    if (data.target_slid === me.slid) throw new Error("Eigener Zugang kann nicht gelöscht werden.");
    const admin = await getAdmin();
    const { error } = await admin.from("employees").delete().eq("slid", data.target_slid);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const creds = z.object({
  slid: z.string().min(1),
  pik: z.string().min(8),
});

async function admin() {
  const m = await import("@/integrations/supabase/client.server");
  return m.supabaseAdmin;
}

async function actor(slid: string, pik: string) {
  const m = await import("./syn-auth.server");
  return m.verifyActor(slid, pik);
}

function generateToken(): string {
  const arr = new Uint8Array(4);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => b.toString(16).padStart(2, "0")).join("");
}

const createSchema = z.object({
  title: z.string().min(1),
  description: z.string().default(""),
  customer_name: z.string().min(1),
  customer_email: z.string().email().optional().or(z.literal("")),
  customer_phone: z.string().optional(),
  priority: z.enum(["low", "normal", "high", "urgent"]).default("normal"),
});

const updateSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["pending", "in_progress", "completed", "cancelled"]).optional(),
  priority: z.enum(["low", "normal", "high", "urgent"]).optional(),
  assigned_slid: z.string().optional(),
  notes: z.string().optional(),
});

const tokenSchema = z.object({
  token: z.string().min(1),
});

const noteSchema = z.object({
  id: z.string().uuid(),
  note: z.string().min(1),
});

/* ═══════════════════════════════════════════
   auftragList
   ═══════════════════════════════════════════ */
export const auftragList = createServerFn({ method: "POST" })
  .validator((d: unknown) => creds.parse(d))
  .handler(async ({ data }) => {
    const supa = await admin();
    const me = await actor(data.slid, data.pik);

    let q = supa.from("auftraege").select("*").order("created_at", { ascending: false });

    if (!me.isSuperuser) {
      q = q.or(`creator_slid.eq.${data.slid},assigned_slid.eq.${data.slid}`);
    }

    const { data: rows, error } = await q;
    if (error) throw error;
    return rows || [];
  });

/* ═══════════════════════════════════════════
   auftragCreate
   ═══════════════════════════════════════════ */
export const auftragCreate = createServerFn({ method: "POST" })
  .validator((d: unknown) => creds.merge(createSchema).parse(d))
  .handler(async ({ data }) => {
    const supa = await admin();
    await actor(data.slid, data.pik);

    const shareToken = generateToken();

    const { data: row, error } = await supa.from("auftraege").insert({
      title: data.title,
      description: data.description,
      customer_name: data.customer_name,
      customer_email: data.customer_email || null,
      customer_phone: data.customer_phone || null,
      priority: data.priority,
      creator_slid: data.slid,
      share_token: shareToken,
    }).select().single();

    if (error) throw error;
    return row;
  });

/* ═══════════════════════════════════════════
   auftragUpdate
   ═══════════════════════════════════════════ */
export const auftragUpdate = createServerFn({ method: "POST" })
  .validator((d: unknown) => creds.merge(updateSchema).parse(d))
  .handler(async ({ data }) => {
    const supa = await admin();
    const me = await actor(data.slid, data.pik);

    const update: Record<string, any> = {};
    if (data.status !== undefined) update.status = data.status;
    if (data.priority !== undefined) update.priority = data.priority;
    if (data.assigned_slid !== undefined) update.assigned_slid = data.assigned_slid;
    if (data.notes !== undefined) update.notes = data.notes;

    let q = supa.from("auftraege").update(update).eq("id", data.id);
    if (!me.isSuperuser) {
      q = q.or(`creator_slid.eq.${data.slid},assigned_slid.eq.${data.slid}`);
    }

    const { error } = await q;
    if (error) throw error;
    return { ok: true };
  });

/* ═══════════════════════════════════════════
   auftragDelete
   ═══════════════════════════════════════════ */
export const auftragDelete = createServerFn({ method: "POST" })
  .validator((d: unknown) =>
    creds.extend({ id: z.string().uuid() }).parse(d)
  )
  .handler(async ({ data }) => {
    const supa = await admin();
    const me = await actor(data.slid, data.pik);

    let q = supa.from("auftraege").delete().eq("id", data.id);
    if (!me.isSuperuser) {
      q = q.eq("creator_slid", data.slid);
    }

    const { error } = await q;
    if (error) throw error;
    return { ok: true };
  });

/* ═══════════════════════════════════════════
   auftragByToken (PUBLIC - no auth)
   ═══════════════════════════════════════════ */
export const auftragByToken = createServerFn({ method: "POST" })
  .validator((d: unknown) => tokenSchema.parse(d))
  .handler(async ({ data }) => {
    const supa = await admin();

    const { data: row, error } = await supa
      .from("auftraege")
      .select("*")
      .eq("share_token", data.token)
      .single();

    if (error || !row) throw new Error("Auftrag nicht gefunden.");
    return row;
  });

/* ═══════════════════════════════════════════
   auftragAddNote
   ═══════════════════════════════════════════ */
export const auftragAddNote = createServerFn({ method: "POST" })
  .validator((d: unknown) => creds.merge(noteSchema).parse(d))
  .handler(async ({ data }) => {
    const supa = await admin();
    await actor(data.slid, data.pik);

    const { data: existing } = await supa.from("auftraege").select("notes").eq("id", data.id).single();
    const currentNotes = existing?.notes || "";
    const newNotes = currentNotes + "\n[" + new Date().toLocaleString("de-DE") + "] " + data.note;

    const { error } = await supa.from("auftraege").update({ notes: newNotes.trim() }).eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const creds = z.object({ slid: z.string().min(1), pik: z.string().min(8) });

async function admin() {
  const m = await import("@/integrations/supabase/client.server");
  return m.supabaseAdmin;
}
async function actor(slid: string, pik: string) {
  const m = await import("./syn-auth.server");
  return m.verifyActor(slid, pik);
}

export const vaultList = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => creds.parse(d))
  .handler(async ({ data }) => {
    const me = await actor(data.slid, data.pik);
    const sb = await admin();
    const q = sb
      .from("vault_entries")
      .select("id,owner_slid,label,url,username,secret_enc,secret_iv,notes,created_at,updated_at")
      .order("updated_at", { ascending: false });
    const { data: rows, error } = me.isSuperuser ? await q : await q.eq("owner_slid", me.slid);
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

const upsertSchema = z.object({
  slid: z.string(),
  pik: z.string(),
  id: z.string().uuid().optional(),
  label: z.string().min(1),
  url: z.string().optional().nullable(),
  username: z.string().optional().nullable(),
  secret_enc: z.string().min(1),
  secret_iv: z.string().min(1),
  notes: z.string().optional().nullable(),
});

export const vaultUpsert = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => upsertSchema.parse(d))
  .handler(async ({ data }) => {
    const me = await actor(data.slid, data.pik);
    const sb = await admin();
    const payload = {
      label: data.label,
      url: data.url || null,
      username: data.username || null,
      secret_enc: data.secret_enc,
      secret_iv: data.secret_iv,
      notes: data.notes || null,
      owner_slid: me.slid,
    };
    if (data.id) {
      const { data: row } = await sb.from("vault_entries").select("owner_slid").eq("id", data.id).maybeSingle();
      if (!row) throw new Error("Eintrag nicht gefunden.");
      if (row.owner_slid !== me.slid && !me.isSuperuser) throw new Error("Keine Berechtigung.");
      const { data: updated, error } = await sb.from("vault_entries").update(payload).eq("id", data.id).select().single();
      if (error) throw new Error(error.message);
      return updated;
    }
    const { data: ins, error } = await sb.from("vault_entries").insert(payload).select().single();
    if (error) throw new Error(error.message);
    return ins;
  });

export const vaultDelete = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => creds.extend({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const me = await actor(data.slid, data.pik);
    const sb = await admin();
    const { data: row } = await sb.from("vault_entries").select("owner_slid").eq("id", data.id).maybeSingle();
    if (!row) throw new Error("Eintrag nicht gefunden.");
    if (row.owner_slid !== me.slid && !me.isSuperuser) throw new Error("Keine Berechtigung.");
    const { error } = await sb.from("vault_entries").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

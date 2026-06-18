import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const creds = z.object({ slid: z.string().min(1), pik: z.string().min(8) });

async function getAdmin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

async function requireSuper(slid: string, pik: string) {
  const admin = await getAdmin();
  const { data: emp, error } = await admin
    .from("employees")
    .select("slid,pik")
    .eq("slid", slid)
    .eq("pik", pik)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!emp) throw new Error("Ungültige Anmeldedaten.");
  const { data: ok } = await admin.rpc("has_role", { _slid: slid, _role: "superuser" });
  if (!ok) throw new Error("Superuser-Rechte erforderlich.");
}

export const externalList = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => creds.parse(d))
  .handler(async ({ data }) => {
    await requireSuper(data.slid, data.pik);
    const admin = await getAdmin();
    const { data: rows, error } = await admin
      .from("syn_external_configs")
      .select("key,label,supabase_url,anon_key,service_key,notes,updated_by,updated_at")
      .order("key");
    if (error) throw new Error(error.message);
    return (rows ?? []).map((r) => ({
      ...r,
      service_key_set: !!r.service_key,
      service_key: undefined,
    }));
  });

const upsertSchema = creds.extend({
  key: z.string().min(1),
  label: z.string().min(1),
  supabase_url: z.string().url(),
  anon_key: z.string().min(20),
  service_key: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const externalUpsert = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => upsertSchema.parse(d))
  .handler(async ({ data }) => {
    await requireSuper(data.slid, data.pik);
    const admin = await getAdmin();
    const row: Record<string, unknown> = {
      key: data.key,
      label: data.label,
      supabase_url: data.supabase_url,
      anon_key: data.anon_key,
      notes: data.notes || null,
      updated_by: data.slid,
    };
    // Only overwrite service_key when explicitly provided (non-empty string)
    if (typeof data.service_key === "string" && data.service_key.length > 0) {
      row.service_key = data.service_key;
    }
    const { error } = await admin.from("syn_external_configs").upsert(row, { onConflict: "key" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const externalDelete = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => creds.extend({ key: z.string().min(1) }).parse(d))
  .handler(async ({ data }) => {
    await requireSuper(data.slid, data.pik);
    const admin = await getAdmin();
    const { error } = await admin.from("syn_external_configs").delete().eq("key", data.key);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

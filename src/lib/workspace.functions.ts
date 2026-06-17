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

export const wsList = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => creds.parse(d))
  .handler(async ({ data }) => {
    const me = await actor(data.slid, data.pik);
    const sb = await admin();
    const { data: rows, error } = await sb
      .from("workspace_docs")
      .select("*")
      .order("updated_at", { ascending: false });
    if (error) throw new Error(error.message);
    // visibility filter
    return (rows ?? []).filter((r) => {
      if (me.isSuperuser) return true;
      if (r.visibility === "all" || r.visibility === "team") return true;
      return r.owner_slid === me.slid;
    });
  });

const upsert = z.object({
  slid: z.string(),
  pik: z.string(),
  id: z.string().uuid().optional(),
  title: z.string().min(1),
  content_md: z.string().default(""),
  tags: z.array(z.string()).default([]),
  visibility: z.enum(["private", "team", "all"]).default("team"),
});

export const wsUpsert = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => upsert.parse(d))
  .handler(async ({ data }) => {
    const me = await actor(data.slid, data.pik);
    const sb = await admin();
    const payload = {
      title: data.title,
      content_md: data.content_md,
      tags: data.tags,
      visibility: data.visibility,
      owner_slid: me.slid,
    };
    if (data.id) {
      const { data: row } = await sb.from("workspace_docs").select("owner_slid").eq("id", data.id).maybeSingle();
      if (!row) throw new Error("Dokument nicht gefunden.");
      if (row.owner_slid !== me.slid && !me.isSuperuser) throw new Error("Keine Berechtigung.");
      const { data: u, error } = await sb.from("workspace_docs").update(payload).eq("id", data.id).select().single();
      if (error) throw new Error(error.message);
      return u;
    }
    const { data: ins, error } = await sb.from("workspace_docs").insert(payload).select().single();
    if (error) throw new Error(error.message);
    return ins;
  });

export const wsDelete = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => creds.extend({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const me = await actor(data.slid, data.pik);
    const sb = await admin();
    const { data: row } = await sb.from("workspace_docs").select("owner_slid").eq("id", data.id).maybeSingle();
    if (!row) throw new Error("Dokument nicht gefunden.");
    if (row.owner_slid !== me.slid && !me.isSuperuser) throw new Error("Keine Berechtigung.");
    const { error } = await sb.from("workspace_docs").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

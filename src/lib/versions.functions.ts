import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const creds = z.object({ slid: z.string().min(1), pik: z.string().min(8) });
async function admin() { const m = await import("@/integrations/supabase/client.server"); return m.supabaseAdmin; }
async function auth() { return import("./syn-auth.server"); }
async function actor(slid: string, pik: string) { const m = await auth(); return m.verifyActor(slid, pik); }

// ---- Public: list published versions filtered by visibility ----
// - unauthenticated caller: only visibility='public'
// - authenticated caller: 'public' + 'authenticated' (+ 'insider' when news.manage or superuser)
export const versionsListPublic = createServerFn({ method: "GET" })
  .handler(async () => {
    const sb = await admin();
    const { data, error } = await sb.from("app_versions")
      .select("id,version,title,notes_md,kind,visibility,published_at,feature_ids,bugfix_ids")
      .eq("published", true).eq("visibility", "public")
      .order("published_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const versionsList = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => creds.parse(d))
  .handler(async ({ data }) => {
    const me = await actor(data.slid, data.pik);
    const sb = await admin();
    const { data: rows, error } = await sb.from("app_versions").select("*").order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    // Hide insider entries unless the account has news.manage (or is superuser)
    const canInsider = await (await auth()).hasPermission(me, "news.manage");
    return (rows ?? []).filter((r) => r.visibility !== "insider" || canInsider);
  });

export const versionsLatestPublished = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => creds.parse(d))
  .handler(async ({ data }) => {
    await actor(data.slid, data.pik);
    const sb = await admin();
    const { data: rows } = await sb.from("app_versions").select("*").eq("published", true).order("published_at", { ascending: false }).limit(1);
    return rows?.[0] ?? null;
  });

const upsert = creds.extend({
  id: z.string().uuid().optional(),
  version: z.string().min(1),
  title: z.string().min(1),
  notes_md: z.string().default(""),
  kind: z.enum(["release", "leak", "insider"]).default("release"),
  visibility: z.enum(["public", "authenticated", "insider"]).default("authenticated"),
  bugfix_ids: z.array(z.string()).default([]),
  feature_ids: z.array(z.string()).default([]),
  published: z.boolean().default(false),
});

export const versionsUpsert = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => upsert.parse(d))
  .handler(async ({ data }) => {
    const me = await actor(data.slid, data.pik);
    await (await auth()).requirePermission(me, "news.manage");
    const sb = await admin();
    const payload = {
      version: data.version, title: data.title, notes_md: data.notes_md,
      kind: data.kind, visibility: data.visibility,
      bugfix_ids: data.bugfix_ids, feature_ids: data.feature_ids,
      published: data.published,
      published_at: data.published ? new Date().toISOString() : null,
      created_by: me.slid,
    };
    if (data.id) {
      const { data: u, error } = await sb.from("app_versions").update(payload).eq("id", data.id).select().single();
      if (error) throw new Error(error.message); return u;
    }
    const { data: ins, error } = await sb.from("app_versions").insert(payload).select().single();
    if (error) throw new Error(error.message); return ins;
  });

export const versionsDelete = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => creds.extend({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const me = await actor(data.slid, data.pik);
    if (!me.isSuperuser) throw new Error("Nur Superuser.");
    const sb = await admin();
    const { error } = await sb.from("app_versions").delete().eq("id", data.id);
    if (error) throw new Error(error.message); return { ok: true };
  });

// --- ROADMAP ---
export const roadmapList = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => creds.parse(d))
  .handler(async ({ data }) => {
    await actor(data.slid, data.pik);
    const sb = await admin();
    const { data: rows, error } = await sb.from("roadmap_items").select("*").order("sort_order").order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

const rmUpsert = creds.extend({
  id: z.string().uuid().optional(),
  title: z.string().min(1),
  description: z.string().default(""),
  status: z.enum(["planned","in_progress","done","cancelled"]).default("planned"),
  target_quarter: z.string().optional().nullable(),
  sort_order: z.number().int().default(0),
});

export const roadmapUpsert = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => rmUpsert.parse(d))
  .handler(async ({ data }) => {
    const me = await actor(data.slid, data.pik);
    await (await auth()).requirePermission(me, "news.manage");
    const sb = await admin();
    const payload = {
      title: data.title, description: data.description, status: data.status,
      target_quarter: data.target_quarter || null, sort_order: data.sort_order, created_by: me.slid,
    };
    if (data.id) {
      const { data: u, error } = await sb.from("roadmap_items").update(payload).eq("id", data.id).select().single();
      if (error) throw new Error(error.message); return u;
    }
    const { data: ins, error } = await sb.from("roadmap_items").insert(payload).select().single();
    if (error) throw new Error(error.message); return ins;
  });

export const roadmapDelete = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => creds.extend({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const me = await actor(data.slid, data.pik);
    await (await auth()).requirePermission(me, "news.manage");
    const sb = await admin();
    const { error } = await sb.from("roadmap_items").delete().eq("id", data.id);
    if (error) throw new Error(error.message); return { ok: true };
  });

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

async function admin() { const m = await import("@/integrations/supabase/client.server"); return m.supabaseAdmin; }
async function auth() { return import("./syn-auth.server"); }
async function actor(slid: string, pik: string) { const m = await auth(); return m.verifyActor(slid, pik); }

const creds = z.object({ slid: z.string().min(1), pik: z.string().min(8) });

// ---- Public: list published docs (anyone can call) ----
export const docsListPublic = createServerFn({ method: "GET" })
  .handler(async () => {
    const sb = await admin();
    const { data, error } = await sb
      .from("public_docs")
      .select("id,slug,title,summary,category,cover_url,sort_order,updated_at")
      .eq("published", true)
      .order("sort_order")
      .order("updated_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

// ---- Public: single doc by slug ----
export const docsGetPublic = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ slug: z.string().min(1) }).parse(d))
  .handler(async ({ data }) => {
    const sb = await admin();
    const { data: row, error } = await sb
      .from("public_docs")
      .select("*")
      .eq("slug", data.slug)
      .eq("published", true)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return row;
  });

// ---- Auth (HL 5+): list ALL docs including drafts ----
export const docsListAll = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => creds.parse(d))
  .handler(async ({ data }) => {
    const me = await actor(data.slid, data.pik);
    await (await auth()).requirePermission(me, "docs.manage");
    const sb = await admin();
    const { data: rows, error } = await sb.from("public_docs").select("*").order("sort_order").order("updated_at", { ascending: false });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

const upsertSchema = creds.extend({
  id: z.string().uuid().optional(),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/i, "Nur Buchstaben, Zahlen, Bindestrich."),
  title: z.string().min(1),
  summary: z.string().default(""),
  category: z.enum(["feature", "customer", "employee", "partnership", "other"]).default("feature"),
  body_md: z.string().default(""),
  cover_url: z.string().optional().nullable(),
  sort_order: z.number().int().default(0),
  published: z.boolean().default(false),
});

export const docsUpsert = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => upsertSchema.parse(d))
  .handler(async ({ data }) => {
    const me = await actor(data.slid, data.pik);
    await (await auth()).requirePermission(me, "docs.manage");
    const sb = await admin();
    const payload = {
      slug: data.slug, title: data.title, summary: data.summary,
      category: data.category, body_md: data.body_md,
      cover_url: data.cover_url || null, sort_order: data.sort_order,
      published: data.published, created_by: me.slid,
    };
    if (data.id) {
      const { data: u, error } = await sb.from("public_docs").update(payload).eq("id", data.id).select().single();
      if (error) throw new Error(error.message); return u;
    }
    const { data: ins, error } = await sb.from("public_docs").insert(payload).select().single();
    if (error) throw new Error(error.message); return ins;
  });

export const docsDelete = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => creds.extend({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const me = await actor(data.slid, data.pik);
    await (await auth()).requirePermission(me, "docs.manage");
    const sb = await admin();
    const { error } = await sb.from("public_docs").delete().eq("id", data.id);
    if (error) throw new Error(error.message); return { ok: true };
  });

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const creds = z.object({ slid: z.string().min(1), pik: z.string().min(8) });

async function admin() {
  const m = await import("@/integrations/supabase/client.server");
  return m.supabaseAdmin;
}
async function auth() { return import("./syn-auth.server"); }
async function actor(slid: string, pik: string) {
  const m = await auth();
  return m.verifyActor(slid, pik);
}

export const basicsList = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => creds.parse(d))
  .handler(async ({ data }) => {
    await actor(data.slid, data.pik);
    const sb = await admin();
    const { data: rows, error } = await sb
      .from("basics_docs")
      .select("*")
      .order("pinned", { ascending: false })
      .order("updated_at", { ascending: false });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

const upsert = z.object({
  slid: z.string(),
  pik: z.string(),
  id: z.string().uuid().optional(),
  slug: z.string().min(1),
  title: z.string().min(1),
  kind: z.enum(["rule", "agb", "contract", "info"]),
  body_md: z.string().default(""),
  file_url: z.string().optional().nullable(),
  pinned: z.boolean().default(false),
});

export const basicsUpsert = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => upsert.parse(d))
  .handler(async ({ data }) => {
    const me = await actor(data.slid, data.pik);
    await (await auth()).requirePermission(me, "basics.manage");
    const sb = await admin();
    const payload = {
      slug: data.slug,
      title: data.title,
      kind: data.kind,
      body_md: data.body_md,
      file_url: data.file_url || null,
      pinned: data.pinned,
      updated_by: me.slid,
    };
    if (data.id) {
      const { data: u, error } = await sb.from("basics_docs").update(payload).eq("id", data.id).select().single();
      if (error) throw new Error(error.message);
      return u;
    }
    const { data: ins, error } = await sb.from("basics_docs").insert(payload).select().single();
    if (error) throw new Error(error.message);
    return ins;
  });

export const basicsDelete = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => creds.extend({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const me = await actor(data.slid, data.pik);
    await (await auth()).requirePermission(me, "basics.manage");
    const sb = await admin();
    const { error } = await sb.from("basics_docs").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

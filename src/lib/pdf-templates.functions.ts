import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

async function admin() { const m = await import("@/integrations/supabase/client.server"); return m.supabaseAdmin; }
async function actor(slid: string, pik: string) { const m = await import("./syn-auth.server"); return m.verifyActor(slid, pik); }

const creds = z.object({ slid: z.string().min(1), pik: z.string().min(8) });

export const pdfTemplatesList = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => creds.parse(d))
  .handler(async ({ data }) => {
    await actor(data.slid, data.pik);
    const sb = await admin();
    const { data: rows, error } = await sb.from("pdf_templates").select("*").order("kind").order("name");
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const pdfTemplateUpsert = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => creds.extend({
    id: z.string().uuid().optional(),
    name: z.string().min(1),
    kind: z.enum(["contract","invoice","offer","confirmation","generic"]),
    html: z.string().min(1),
    css: z.string().optional().nullable(),
    is_default: z.boolean().default(false),
  }).parse(d))
  .handler(async ({ data }) => {
    const me = await actor(data.slid, data.pik);
    if (!me.isSuperuser && me.hl < 5) throw new Error("Nur Leitung (HL 5+).");
    const sb = await admin();
    const payload = {
      name: data.name, kind: data.kind, html: data.html,
      css: data.css || null, is_default: data.is_default, created_by: me.slid,
    };
    if (data.is_default) {
      await sb.from("pdf_templates").update({ is_default: false }).eq("kind", data.kind);
    }
    if (data.id) {
      const { data: u, error } = await sb.from("pdf_templates").update(payload).eq("id", data.id).select().single();
      if (error) throw new Error(error.message); return u;
    }
    const { data: ins, error } = await sb.from("pdf_templates").insert(payload).select().single();
    if (error) throw new Error(error.message); return ins;
  });

export const pdfTemplateDelete = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => creds.extend({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const me = await actor(data.slid, data.pik);
    if (!me.isSuperuser && me.hl < 5) throw new Error("Nur HL 5+.");
    const sb = await admin();
    const { error } = await sb.from("pdf_templates").delete().eq("id", data.id);
    if (error) throw new Error(error.message); return { ok: true };
  });

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}
async function auth() { return import("./syn-auth.server"); }
async function verify(slid: string, pik: string) {
  const { verifyActor } = await auth();
  return verifyActor(slid, pik);
}
const creds = z.object({ slid: z.string(), pik: z.string() });

export const tasksList = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => creds.parse(d))
  .handler(async ({ data }) => {
    const me = await verify(data.slid, data.pik);
    const a = await admin();
    const { data: rows, error } = await a.from("tasks").select("*").or(`assignee_slid.eq.${me.slid},creator_slid.eq.${me.slid}`).order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

const upsert = creds.extend({
  id: z.string().uuid().optional(),
  title: z.string().min(1).max(200),
  description: z.string().max(4000).optional().nullable(),
  assignee_slid: z.string().min(1),
  priority: z.enum(["low","normal","high","urgent"]).default("normal"),
  status: z.enum(["open","in_progress","done"]).default("open"),
  due_at: z.string().nullable().optional(),
});

export const tasksUpsert = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => upsert.parse(d))
  .handler(async ({ data }) => {
    const me = await verify(data.slid, data.pik);
    const a = await admin();
    const row = {
      title: data.title,
      description: data.description || null,
      assignee_slid: data.assignee_slid,
      creator_slid: me.slid,
      priority: data.priority,
      status: data.status,
      due_at: data.due_at || null,
    };
    if (data.id) {
      const { data: existing } = await a.from("tasks").select("creator_slid,assignee_slid").eq("id", data.id).maybeSingle();
      if (!existing) throw new Error("Task nicht gefunden.");
      if (existing.creator_slid !== me.slid && existing.assignee_slid !== me.slid) await (await auth()).requirePermission(me, "tasks.manage");
      const { data: u, error } = await a.from("tasks").update(row).eq("id", data.id).select().single();
      if (error) throw new Error(error.message);
      // notify assignee if changed
      if (existing.assignee_slid !== data.assignee_slid) {
        await a.from("notifications").insert({ recipient_slid: data.assignee_slid, title: "Neue Aufgabe", body: data.title, url: "/tasks", source: "task", sender_slid: me.slid });
      }
      return u;
    }
    const { data: ins, error } = await a.from("tasks").insert(row).select().single();
    if (error) throw new Error(error.message);
    await a.from("notifications").insert({ recipient_slid: data.assignee_slid, title: "Neue Aufgabe", body: data.title, url: "/tasks", source: "task", sender_slid: me.slid });
    return ins;
  });

export const tasksDelete = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => creds.extend({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const me = await verify(data.slid, data.pik);
    const a = await admin();
    const { data: t } = await a.from("tasks").select("creator_slid").eq("id", data.id).maybeSingle();
    if (!t) return { ok: true };
    if (t.creator_slid !== me.slid) await (await auth()).requirePermission(me, "tasks.manage");
    const { error } = await a.from("tasks").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const tasksPeople = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => creds.parse(d))
  .handler(async ({ data }) => {
    await verify(data.slid, data.pik);
    const a = await admin();
    const { data: rows, error } = await a.from("employees").select("slid,name,hl,kind").order("hl", { ascending: false });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

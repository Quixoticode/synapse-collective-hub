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

export const chatThreadsList = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => creds.parse(d))
  .handler(async ({ data }) => {
    const me = await actor(data.slid, data.pik);
    const sb = await admin();
    // threads where I'm a member
    const { data: memberships, error: mErr } = await sb
      .from("chat_members")
      .select("thread_id")
      .eq("slid", me.slid);
    if (mErr) throw new Error(mErr.message);
    const ids = (memberships ?? []).map((m) => m.thread_id);
    if (ids.length === 0) return [];
    const { data: threads, error } = await sb
      .from("chat_threads")
      .select("id,title,is_group,created_by,updated_at,created_at")
      .in("id", ids)
      .order("updated_at", { ascending: false });
    if (error) throw new Error(error.message);

    // collect members for each thread
    const { data: mem } = await sb
      .from("chat_members")
      .select("thread_id,slid")
      .in("thread_id", ids);
    const byThread = new Map<string, string[]>();
    for (const r of mem ?? []) {
      const arr = byThread.get(r.thread_id) ?? [];
      arr.push(r.slid);
      byThread.set(r.thread_id, arr);
    }
    return (threads ?? []).map((t) => ({ ...t, members: byThread.get(t.id) ?? [] }));
  });

export const chatThreadCreate = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    creds.extend({
      title: z.string().optional().nullable(),
      member_slids: z.array(z.string()).min(1),
      is_group: z.boolean().default(false),
    }).parse(d),
  )
  .handler(async ({ data }) => {
    const me = await actor(data.slid, data.pik);
    const sb = await admin();
    const allMembers = Array.from(new Set([me.slid, ...data.member_slids]));
    const { data: th, error } = await sb
      .from("chat_threads")
      .insert({
        title: data.title || null,
        is_group: data.is_group || allMembers.length > 2,
        created_by: me.slid,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    const { error: mErr } = await sb
      .from("chat_members")
      .insert(allMembers.map((s) => ({ thread_id: th.id, slid: s })));
    if (mErr) throw new Error(mErr.message);
    return th;
  });

export const chatMessages = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => creds.extend({ thread_id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const me = await actor(data.slid, data.pik);
    const sb = await admin();
    // membership check
    const { data: mem } = await sb
      .from("chat_members")
      .select("slid")
      .eq("thread_id", data.thread_id)
      .eq("slid", me.slid)
      .maybeSingle();
    if (!mem && !me.isSuperuser) throw new Error("Kein Zugriff auf diesen Thread.");
    const { data: msgs, error } = await sb
      .from("chat_messages")
      .select("id,thread_id,sender_slid,body,created_at")
      .eq("thread_id", data.thread_id)
      .order("created_at", { ascending: true })
      .limit(500);
    if (error) throw new Error(error.message);
    return msgs ?? [];
  });

export const chatSend = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    creds.extend({ thread_id: z.string().uuid(), body: z.string().min(1).max(4000) }).parse(d),
  )
  .handler(async ({ data }) => {
    const me = await actor(data.slid, data.pik);
    const sb = await admin();
    const { data: mem } = await sb
      .from("chat_members")
      .select("slid")
      .eq("thread_id", data.thread_id)
      .eq("slid", me.slid)
      .maybeSingle();
    if (!mem && !me.isSuperuser) throw new Error("Kein Zugriff auf diesen Thread.");
    const { data: msg, error } = await sb
      .from("chat_messages")
      .insert({ thread_id: data.thread_id, sender_slid: me.slid, body: data.body })
      .select()
      .single();
    if (error) throw new Error(error.message);
    await sb.from("chat_threads").update({ updated_at: new Date().toISOString() }).eq("id", data.thread_id);
    return msg;
  });

export const chatPeople = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => creds.parse(d))
  .handler(async ({ data }) => {
    const me = await actor(data.slid, data.pik);
    const sb = await admin();
    const { data: rows, error } = await sb
      .from("employees")
      .select("slid,name,kind,hl")
      .neq("slid", me.slid)
      .order("name");
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

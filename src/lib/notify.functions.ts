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

export const notifList = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => creds.parse(d))
  .handler(async ({ data }) => {
    const me = await verify(data.slid, data.pik);
    const a = await admin();
    const { data: rows, error } = await a.from("notifications").select("*").eq("recipient_slid", me.slid).order("created_at", { ascending: false }).limit(200);
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const notifMarkRead = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => creds.extend({ ids: z.array(z.string().uuid()) }).parse(d))
  .handler(async ({ data }) => {
    const me = await verify(data.slid, data.pik);
    const a = await admin();
    await a.from("notifications").update({ read_at: new Date().toISOString() }).in("id", data.ids).eq("recipient_slid", me.slid);
    return { ok: true };
  });

export const notifSend = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => creds.extend({
    recipients: z.array(z.string()).min(1),
    title: z.string().min(1).max(120),
    body: z.string().max(1000).optional(),
    url: z.string().max(500).optional(),
  }).parse(d))
  .handler(async ({ data }) => {
    const me = await verify(data.slid, data.pik);
    await (await auth()).requirePermission(me, "notify.manage");
    const a = await admin();
    const rows = data.recipients.map((r) => ({
      recipient_slid: r, title: data.title, body: data.body || null, url: data.url || null,
      source: "custom", sender_slid: me.slid,
    }));
    const { error } = await a.from("notifications").insert(rows);
    if (error) throw new Error(error.message);
    return { ok: true, count: rows.length };
  });

export const pushSubscribe = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => creds.extend({
    endpoint: z.string().url(),
    p256dh: z.string(), auth: z.string(),
    user_agent: z.string().optional(),
  }).parse(d))
  .handler(async ({ data }) => {
    const me = await verify(data.slid, data.pik);
    const a = await admin();
    await a.from("push_subscriptions").upsert({
      slid: me.slid, endpoint: data.endpoint, p256dh: data.p256dh, auth: data.auth,
      user_agent: data.user_agent || null,
    }, { onConflict: "endpoint" });
    return { ok: true };
  });

export const pushUnsubscribe = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => creds.extend({ endpoint: z.string() }).parse(d))
  .handler(async ({ data }) => {
    await verify(data.slid, data.pik);
    const a = await admin();
    await a.from("push_subscriptions").delete().eq("endpoint", data.endpoint);
    return { ok: true };
  });

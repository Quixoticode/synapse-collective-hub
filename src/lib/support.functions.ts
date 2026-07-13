import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const creds = z.object({ slid: z.string().min(1), pik: z.string().min(8) });
async function admin() { const m = await import("@/integrations/supabase/client.server"); return m.supabaseAdmin; }
async function auth() { return import("./syn-auth.server"); }
async function actor(slid: string, pik: string) { const m = await auth(); return m.verifyActor(slid, pik); }

async function isStaff(me: Awaited<ReturnType<typeof actor>>) {
  return me.isSuperuser || (await auth()).hasPermission(me, "support.manage");
}

export const supportTicketsList = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => creds.parse(d))
  .handler(async ({ data }) => {
    const me = await actor(data.slid, data.pik);
    const sb = await admin();
    const q = sb.from("support_tickets").select("*").order("updated_at", { ascending: false });
    const { data: rows, error } = (await isStaff(me)) ? await q : await q.eq("opener_slid", me.slid);
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

const createTicket = creds.extend({
  subject: z.string().min(2),
  body: z.string().min(2),
  priority: z.enum(["low","normal","high","urgent"]).default("normal"),
});
export const supportTicketCreate = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => createTicket.parse(d))
  .handler(async ({ data }) => {
    const me = await actor(data.slid, data.pik);
    const sb = await admin();
    const { data: t, error } = await sb.from("support_tickets").insert({
      opener_slid: me.slid, subject: data.subject, priority: data.priority,
    }).select().single();
    if (error) throw new Error(error.message);
    const { error: e2 } = await sb.from("support_messages").insert({
      ticket_id: t.id, author_slid: me.slid, author_role: "user", body: data.body,
    });
    if (e2) throw new Error(e2.message);
    return t;
  });

export const supportMessagesList = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => creds.extend({ ticket_id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const me = await actor(data.slid, data.pik);
    const sb = await admin();
    const { data: t } = await sb.from("support_tickets").select("opener_slid").eq("id", data.ticket_id).maybeSingle();
    if (!t) throw new Error("Ticket nicht gefunden.");
    if (t.opener_slid !== me.slid && !(await isStaff(me))) throw new Error("Keine Berechtigung.");
    const { data: rows, error } = await sb.from("support_messages").select("*").eq("ticket_id", data.ticket_id).order("created_at");
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const supportMessageSend = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => creds.extend({ ticket_id: z.string().uuid(), body: z.string().min(1) }).parse(d))
  .handler(async ({ data }) => {
    const me = await actor(data.slid, data.pik);
    const sb = await admin();
    const { data: t } = await sb.from("support_tickets").select("opener_slid").eq("id", data.ticket_id).maybeSingle();
    if (!t) throw new Error("Ticket nicht gefunden.");
    const staff = await isStaff(me);
    if (t.opener_slid !== me.slid && !staff) throw new Error("Keine Berechtigung.");
    const { data: msg, error } = await sb.from("support_messages").insert({
      ticket_id: data.ticket_id, author_slid: me.slid, author_role: staff ? "staff" : "user", body: data.body,
    }).select().single();
    if (error) throw new Error(error.message);
    await sb.from("support_tickets").update({ updated_at: new Date().toISOString(), status: staff ? "pending" : "open" }).eq("id", data.ticket_id);
    return msg;
  });

export const supportTicketSetStatus = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => creds.extend({
    ticket_id: z.string().uuid(),
    status: z.enum(["open","pending","resolved","closed"]),
  }).parse(d))
  .handler(async ({ data }) => {
    const me = await actor(data.slid, data.pik);
    if (!(await isStaff(me))) throw new Error("Nur Support-Team.");
    const sb = await admin();
    const { error } = await sb.from("support_tickets").update({ status: data.status }).eq("id", data.ticket_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

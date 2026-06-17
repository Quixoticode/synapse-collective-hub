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

export const mailAccounts = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => creds.parse(d))
  .handler(async ({ data }) => {
    const me = await actor(data.slid, data.pik);
    const sb = await admin();
    const q = sb.from("mail_accounts").select("*").order("created_at");
    const { data: rows, error } = me.isSuperuser ? await q : await q.eq("slid", me.slid);
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const mailAccountCreate = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    creds.extend({
      address: z.string().email(),
      display_name: z.string().optional().nullable(),
      target_slid: z.string().optional(),
    }).parse(d),
  )
  .handler(async ({ data }) => {
    const me = await actor(data.slid, data.pik);
    const sb = await admin();
    const target = data.target_slid && me.isSuperuser ? data.target_slid : me.slid;
    const { data: row, error } = await sb
      .from("mail_accounts")
      .insert({ slid: target, address: data.address.toLowerCase(), display_name: data.display_name || null })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const mailMessages = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    creds.extend({
      account_id: z.string().uuid(),
      folder: z.enum(["in", "out", "all"]).default("all"),
    }).parse(d),
  )
  .handler(async ({ data }) => {
    const me = await actor(data.slid, data.pik);
    const sb = await admin();
    const { data: acc } = await sb.from("mail_accounts").select("slid").eq("id", data.account_id).maybeSingle();
    if (!acc) throw new Error("Postfach nicht gefunden.");
    if (acc.slid !== me.slid && !me.isSuperuser) throw new Error("Keine Berechtigung.");
    let q = sb.from("mail_messages").select("*").eq("account_id", data.account_id).order("created_at", { ascending: false }).limit(200);
    if (data.folder !== "all") q = q.eq("direction", data.folder);
    const { data: msgs, error } = await q;
    if (error) throw new Error(error.message);
    return msgs ?? [];
  });

export const mailMarkRead = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => creds.extend({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const me = await actor(data.slid, data.pik);
    const sb = await admin();
    const { data: m } = await sb.from("mail_messages").select("account_id").eq("id", data.id).maybeSingle();
    if (!m) throw new Error("Nicht gefunden.");
    const { data: acc } = await sb.from("mail_accounts").select("slid").eq("id", m.account_id).maybeSingle();
    if (!acc || (acc.slid !== me.slid && !me.isSuperuser)) throw new Error("Keine Berechtigung.");
    await sb.from("mail_messages").update({ read_at: new Date().toISOString() }).eq("id", data.id);
    return { ok: true };
  });

export const mailSend = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    creds.extend({
      account_id: z.string().uuid(),
      to: z.array(z.string().email()).min(1),
      cc: z.array(z.string().email()).default([]),
      subject: z.string().max(300),
      body_text: z.string().optional().default(""),
      body_html: z.string().optional().default(""),
    }).parse(d),
  )
  .handler(async ({ data }) => {
    const me = await actor(data.slid, data.pik);
    const sb = await admin();
    const { data: acc } = await sb.from("mail_accounts").select("*").eq("id", data.account_id).maybeSingle();
    if (!acc) throw new Error("Postfach nicht gefunden.");
    if (acc.slid !== me.slid && !me.isSuperuser) throw new Error("Keine Berechtigung.");

    const lovableKey = process.env.LOVABLE_API_KEY;
    const brevoKey = process.env.BREVO_API_KEY;
    let providerId: string | null = null;
    let sentAt: string | null = null;

    if (lovableKey && brevoKey) {
      const res = await fetch("https://connector-gateway.lovable.dev/brevo/smtp/email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${lovableKey}`,
          "X-Connection-Api-Key": brevoKey,
        },
        body: JSON.stringify({
          sender: { name: acc.display_name || acc.address, email: acc.address },
          to: data.to.map((email) => ({ email })),
          cc: data.cc.length ? data.cc.map((email) => ({ email })) : undefined,
          subject: data.subject,
          htmlContent: data.body_html || `<pre>${data.body_text}</pre>`,
          textContent: data.body_text || undefined,
        }),
      });
      const txt = await res.text();
      if (!res.ok) throw new Error(`Brevo-Versand fehlgeschlagen (${res.status}): ${txt}`);
      try {
        const j = JSON.parse(txt);
        providerId = j.messageId ?? null;
      } catch {}
      sentAt = new Date().toISOString();
    }
    // Always log to DB, even if Brevo not configured (status = pending)
    const { data: row, error } = await sb
      .from("mail_messages")
      .insert({
        account_id: data.account_id,
        direction: "out",
        from_addr: acc.address,
        to_addrs: data.to,
        cc_addrs: data.cc,
        subject: data.subject,
        body_text: data.body_text,
        body_html: data.body_html,
        sent_at: sentAt,
        provider_id: providerId,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    if (!brevoKey || !lovableKey) {
      throw new Error("Mail gespeichert, aber Brevo-Connector noch nicht verknüpft.");
    }
    return row;
  });

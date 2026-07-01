import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}
async function sha256(text: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
function newCode() {
  return String(Math.floor(Math.random() * 1_000_000)).padStart(6, "0");
}

const PUBLIC_OPENER = "public-support";

export const supportAccountCreate = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({
    name: z.string().trim().min(2).max(80),
    subject: z.string().trim().min(3).max(160),
    body: z.string().trim().min(3).max(4000),
  }).parse(d))
  .handler(async ({ data }) => {
    const a = await admin();
    const code = newCode();
    const codeHash = await sha256(code + ":" + data.name.toLowerCase());
    const { data: ticket, error: tErr } = await a.from("support_tickets").insert({
      subject: data.subject, opener_slid: PUBLIC_OPENER, status: "open", priority: "normal",
    }).select().single();
    if (tErr) throw new Error(tErr.message);
    await a.from("support_messages").insert({ ticket_id: ticket.id, author_slid: PUBLIC_OPENER, author_role: "user", body: data.body });
    const { error: sErr } = await a.from("support_accounts").insert({
      name: data.name, code_hash: codeHash, ticket_id: ticket.id,
    });
    if (sErr) {
      const alt = `${data.name}-${Math.floor(Math.random() * 1000)}`;
      const altHash = await sha256(code + ":" + alt.toLowerCase());
      await a.from("support_accounts").insert({ name: alt, code_hash: altHash, ticket_id: ticket.id });
      return { name: alt, code, ticket_id: ticket.id };
    }
    return { name: data.name, code, ticket_id: ticket.id };
  });

export const supportAccountLogin = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({
    name: z.string().trim().min(2),
    code: z.string().regex(/^\d{6}$/),
  }).parse(d))
  .handler(async ({ data }) => {
    const a = await admin();
    const hash = await sha256(data.code + ":" + data.name.toLowerCase());
    const { data: acc } = await a.from("support_accounts").select("*").eq("name", data.name).eq("code_hash", hash).maybeSingle();
    if (!acc) throw new Error("Name oder Code falsch.");
    if (!acc.ticket_id) throw new Error("Kein Ticket verknüpft.");
    const { data: ticket } = await a.from("support_tickets").select("*").eq("id", acc.ticket_id).maybeSingle();
    const { data: messages } = await a.from("support_messages").select("*").eq("ticket_id", acc.ticket_id).order("created_at", { ascending: true });
    return { account: { name: acc.name, ticket_id: acc.ticket_id, closed_at: acc.closed_at }, ticket, messages: messages ?? [] };
  });

export const supportAccountPost = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({
    name: z.string(), code: z.string().regex(/^\d{6}$/), body: z.string().trim().min(1).max(4000),
  }).parse(d))
  .handler(async ({ data }) => {
    const a = await admin();
    const hash = await sha256(data.code + ":" + data.name.toLowerCase());
    const { data: acc } = await a.from("support_accounts").select("*").eq("name", data.name).eq("code_hash", hash).maybeSingle();
    if (!acc || !acc.ticket_id) throw new Error("Name oder Code falsch.");
    await a.from("support_messages").insert({ ticket_id: acc.ticket_id, author_slid: PUBLIC_OPENER, author_role: "user", body: data.body });
    return { ok: true };
  });

const creds = z.object({ slid: z.string(), pik: z.string() });
async function staff(slid: string, pik: string) {
  const a = await admin();
  const { data } = await a.from("employees").select("slid,hl").eq("slid", slid).eq("pik", pik).maybeSingle();
  if (!data) throw new Error("Ungültige SynID.");
  return data;
}

export const supportAccountList = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => creds.parse(d))
  .handler(async ({ data }) => {
    await staff(data.slid, data.pik);
    const a = await admin();
    const { data: rows } = await a.from("support_accounts").select("id,name,ticket_id,closed_at,created_at").order("created_at", { ascending: false });
    return rows ?? [];
  });

export const supportAccountDelete = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => creds.extend({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    await staff(data.slid, data.pik);
    const a = await admin();
    await a.from("support_accounts").delete().eq("id", data.id);
    return { ok: true };
  });

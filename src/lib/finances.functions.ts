import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const creds = z.object({ slid: z.string().min(1), pik: z.string().min(8) });
async function admin() { const m = await import("@/integrations/supabase/client.server"); return m.supabaseAdmin; }
async function actor(slid: string, pik: string) { const m = await import("./syn-auth.server"); return m.verifyActor(slid, pik); }

function requireFinance(me: { hl: number; isSuperuser: boolean }) {
  if (!me.isSuperuser && me.hl < 4) throw new Error("HL 4+ oder Superuser erforderlich.");
}

// ---- Accounts ----
export const finAccountsList = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => creds.parse(d))
  .handler(async ({ data }) => {
    const me = await actor(data.slid, data.pik); requireFinance(me);
    const sb = await admin();
    const { data: rows, error } = await sb.from("fin_accounts").select("*").order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

const accUpsert = creds.extend({
  id: z.string().uuid().optional(),
  name: z.string().min(1),
  iban: z.string().optional().nullable(),
  bic: z.string().optional().nullable(),
  currency: z.string().default("EUR"),
  opening_balance: z.number().default(0),
  notes: z.string().optional().nullable(),
  archived: z.boolean().default(false),
});

export const finAccountUpsert = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => accUpsert.parse(d))
  .handler(async ({ data }) => {
    const me = await actor(data.slid, data.pik); requireFinance(me);
    const sb = await admin();
    const payload = {
      name: data.name, iban: data.iban || null, bic: data.bic || null,
      currency: data.currency, opening_balance: data.opening_balance,
      notes: data.notes || null, archived: data.archived, created_by: me.slid,
    };
    if (data.id) {
      const { data: u, error } = await sb.from("fin_accounts").update(payload).eq("id", data.id).select().single();
      if (error) throw new Error(error.message); return u;
    }
    const { data: ins, error } = await sb.from("fin_accounts").insert(payload).select().single();
    if (error) throw new Error(error.message); return ins;
  });

export const finAccountDelete = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => creds.extend({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const me = await actor(data.slid, data.pik); requireFinance(me);
    const sb = await admin();
    const { error } = await sb.from("fin_accounts").delete().eq("id", data.id);
    if (error) throw new Error(error.message); return { ok: true };
  });

// ---- Transactions ----
export const finTxList = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => creds.extend({ account_id: z.string().uuid().optional() }).parse(d))
  .handler(async ({ data }) => {
    const me = await actor(data.slid, data.pik); requireFinance(me);
    const sb = await admin();
    let q = sb.from("fin_transactions").select("*").order("booking_date", { ascending: false }).limit(500);
    if (data.account_id) q = q.eq("account_id", data.account_id);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

const txUpsert = creds.extend({
  id: z.string().uuid().optional(),
  account_id: z.string().uuid(),
  direction: z.enum(["in","out"]),
  amount: z.number().nonnegative(),
  currency: z.string().default("EUR"),
  booking_date: z.string(), // YYYY-MM-DD
  purpose: z.string().default(""),
  description: z.string().optional().nullable(),
  counterparty: z.string().optional().nullable(),
  counterparty_iban: z.string().optional().nullable(),
  receipt_no: z.string().optional().nullable(),
  category: z.string().optional().nullable(),
  status: z.enum(["planned","booked","cancelled"]).default("booked"),
});

export const finTxUpsert = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => txUpsert.parse(d))
  .handler(async ({ data }) => {
    const me = await actor(data.slid, data.pik); requireFinance(me);
    const sb = await admin();
    const payload = {
      account_id: data.account_id, direction: data.direction, amount: data.amount,
      currency: data.currency, booking_date: data.booking_date, purpose: data.purpose,
      description: data.description || null, counterparty: data.counterparty || null,
      counterparty_iban: data.counterparty_iban || null, receipt_no: data.receipt_no || null,
      category: data.category || null, status: data.status, created_by: me.slid,
    };
    if (data.id) {
      const { data: u, error } = await sb.from("fin_transactions").update(payload).eq("id", data.id).select().single();
      if (error) throw new Error(error.message); return u;
    }
    const { data: ins, error } = await sb.from("fin_transactions").insert(payload).select().single();
    if (error) throw new Error(error.message); return ins;
  });

export const finTxDelete = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => creds.extend({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const me = await actor(data.slid, data.pik); requireFinance(me);
    const sb = await admin();
    const { error } = await sb.from("fin_transactions").delete().eq("id", data.id);
    if (error) throw new Error(error.message); return { ok: true };
  });

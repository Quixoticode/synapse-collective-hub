import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const creds = z.object({ slid: z.string().min(1), pik: z.string().min(8) });
async function admin() { const m = await import("@/integrations/supabase/client.server"); return m.supabaseAdmin; }
async function actor(slid: string, pik: string) { const m = await import("./syn-auth.server"); return m.verifyActor(slid, pik); }

// ---- Per-user admin-set permissions ----
export const tabPermsForMe = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => creds.parse(d))
  .handler(async ({ data }) => {
    const me = await actor(data.slid, data.pik);
    const sb = await admin();
    const { data: rows } = await sb.from("user_tab_permissions").select("tab_key,allowed").eq("slid", me.slid);
    return rows ?? [];
  });

export const tabPermsListAll = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => creds.parse(d))
  .handler(async ({ data }) => {
    const me = await actor(data.slid, data.pik);
    if (!me.isSuperuser && me.hl < 5) throw new Error("HL 5+ oder Superuser.");
    const sb = await admin();
    const [{ data: emps }, { data: perms }] = await Promise.all([
      sb.from("employees").select("slid,name,hl,kind,department,position").order("hl", { ascending: false }),
      sb.from("user_tab_permissions").select("*"),
    ]);
    return { employees: emps ?? [], permissions: perms ?? [] };
  });

export const tabPermSet = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => creds.extend({
    target_slid: z.string().min(1), tab_key: z.string().min(1), allowed: z.boolean(),
  }).parse(d))
  .handler(async ({ data }) => {
    const me = await actor(data.slid, data.pik);
    if (!me.isSuperuser && me.hl < 5) throw new Error("HL 5+ oder Superuser.");
    const sb = await admin();
    const { error } = await sb.from("user_tab_permissions").upsert({
      slid: data.target_slid, tab_key: data.tab_key, allowed: data.allowed, updated_by: me.slid,
      updated_at: new Date().toISOString(),
    }, { onConflict: "slid,tab_key" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---- Self prefs ----
export const tabPrefsForMe = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => creds.parse(d))
  .handler(async ({ data }) => {
    const me = await actor(data.slid, data.pik);
    const sb = await admin();
    const { data: rows } = await sb.from("user_tab_prefs").select("*").eq("slid", me.slid);
    return rows ?? [];
  });

export const tabPrefSet = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => creds.extend({
    tab_key: z.string().min(1), visible: z.boolean(), pinned: z.boolean().default(false), sort_order: z.number().int().default(0),
  }).parse(d))
  .handler(async ({ data }) => {
    const me = await actor(data.slid, data.pik);
    const sb = await admin();
    const { error } = await sb.from("user_tab_prefs").upsert({
      slid: me.slid, tab_key: data.tab_key, visible: data.visible, pinned: data.pinned, sort_order: data.sort_order,
      updated_at: new Date().toISOString(),
    }, { onConflict: "slid,tab_key" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

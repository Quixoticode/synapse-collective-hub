"use server";

import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";

function sb() {
  const env = (globalThis as any).__env__ || (globalThis as any).process?.env || {};
  return createClient(
    env.SUPABASE_URL!,
    env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

function ok(slid: string, pik: string) {
  return { slid, pik };
}

/* ─── helpers ─── */
async function requireAdmin(c: { slid: string; pik: string }) {
  const db = sb();
  const { data: me } = await db
    .from("syn_accounts")
    .select("kind,hl")
    .eq("slid", c.slid)
    .eq("pik", c.pik)
    .single();
  if (!me || me.kind !== "superuser") {
    throw new Error("Nur Superuser können den Wartungsmodus verwalten.");
  }
}

/* ─── get maintenance status for all modules ─── */
export const maintenanceStatus = createServerFn({ method: "POST" })
  .handler(async ({ data }: { data: { slid: string; pik: string } }) => {
    const db = sb();
    const { data: rows } = await db
      .from("maintenance_status")
      .select("module,enabled,message,updated_at")
      .order("module");
    return (rows || []).map((r: any) => ({
      module: r.module,
      enabled: r.enabled,
      message: r.message || "",
      updatedAt: r.updated_at,
    }));
  });

/* ─── get maintenance status for a single module (public) ─── */
export const maintenanceCheck = createServerFn({ method: "POST" })
  .handler(async ({ data }: { data: { module: string } }) => {
    const db = sb();
    const { data: row } = await db
      .from("maintenance_status")
      .select("enabled,message")
      .eq("module", data.module)
      .single();
    return {
      inMaintenance: row?.enabled || false,
      message: row?.message || "Dieses Modul befindet sich derzeit im Wartungsmodus.",
    };
  });

/* ─── set maintenance status for a module ─── */
export const maintenanceSet = createServerFn({ method: "POST" })
  .handler(async ({ data }: { data: { slid: string; pik: string; module: string; enabled: boolean; message?: string } }) => {
    await requireAdmin(ok(data.slid, data.pik));
    const db = sb();
    const { error } = await db
      .from("maintenance_status")
      .upsert({
        module: data.module,
        enabled: data.enabled,
        message: data.message || "",
        updated_at: new Date().toISOString(),
      }, { onConflict: "module" });
    if (error) throw new Error(error.message);
    return { success: true };
  });

/* ─── set global maintenance mode ─── */
export const maintenanceGlobal = createServerFn({ method: "POST" })
  .handler(async ({ data }: { data: { slid: string; pik: string; enabled: boolean; message?: string } }) => {
    await requireAdmin(ok(data.slid, data.pik));
    const db = sb();
    const { error } = await db
      .from("maintenance_status")
      .upsert({
        module: "__global__",
        enabled: data.enabled,
        message: data.message || "Die Plattform befindet sich im Wartungsmodus.",
        updated_at: new Date().toISOString(),
      }, { onConflict: "module" });
    if (error) throw new Error(error.message);
    return { success: true };
  });

/* ─── check global maintenance (public) ─── */
export const maintenanceGlobalCheck = createServerFn({ method: "POST" })
  .handler(async () => {
    const db = sb();
    const { data: row } = await db
      .from("maintenance_status")
      .select("enabled,message")
      .eq("module", "__global__")
      .single();
    return {
      inMaintenance: row?.enabled || false,
      message: row?.message || "Die Plattform befindet sich im Wartungsmodus.",
    };
  });

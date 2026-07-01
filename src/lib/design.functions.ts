import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}
const creds = z.object({ slid: z.string(), pik: z.string() });

export type DesignPrefs = {
  bg: "neuromorphic" | "static" | "off";
  intensity: number; // 0..100
  accent: "synapse" | "mint" | "magenta" | "violet";
};

const defaults: DesignPrefs = { bg: "neuromorphic", intensity: 60, accent: "synapse" };

export const designGet = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => creds.parse(d))
  .handler(async ({ data }) => {
    const a = await admin();
    const { data: e } = await a.from("employees").select("slid").eq("slid", data.slid).eq("pik", data.pik).maybeSingle();
    if (!e) throw new Error("Ungültige SynID.");
    const { data: row } = await a.from("user_prefs").select("design_json").eq("slid", data.slid).maybeSingle();
    return { ...defaults, ...(row?.design_json ?? {}) } as DesignPrefs;
  });

export const designSet = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => creds.extend({
    bg: z.enum(["neuromorphic","static","off"]),
    intensity: z.number().int().min(0).max(100),
    accent: z.enum(["synapse","mint","magenta","violet"]),
  }).parse(d))
  .handler(async ({ data }) => {
    const a = await admin();
    const { data: e } = await a.from("employees").select("slid").eq("slid", data.slid).eq("pik", data.pik).maybeSingle();
    if (!e) throw new Error("Ungültige SynID.");
    const prefs: DesignPrefs = { bg: data.bg, intensity: data.intensity, accent: data.accent };
    await a.from("user_prefs").upsert({ slid: data.slid, design_json: prefs }, { onConflict: "slid" });
    return prefs;
  });

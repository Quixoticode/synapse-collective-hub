import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}
const creds = z.object({ slid: z.string(), pik: z.string() });

export type DesignPrefs = {
  bg: "neuromorphic" | "calm" | "static" | "off";
  intensity: number;                              // 0..100
  accent: "synapse" | "mint" | "magenta" | "violet";
  scale: "compact" | "normal" | "large";
  density: "airy" | "normal" | "dense";
  animation: "off" | "subtle" | "full";
};

const defaults: DesignPrefs = {
  bg: "calm", intensity: 45, accent: "synapse",
  scale: "normal", density: "normal", animation: "subtle",
};

const prefsSchema = z.object({
  bg: z.enum(["neuromorphic","calm","static","off"]),
  intensity: z.number().int().min(0).max(100),
  accent: z.enum(["synapse","mint","magenta","violet"]),
  scale: z.enum(["compact","normal","large"]),
  density: z.enum(["airy","normal","dense"]),
  animation: z.enum(["off","subtle","full"]),
});

export const designGet = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => creds.parse(d))
  .handler(async ({ data }) => {
    const a = await admin();
    const { data: e } = await a.from("employees").select("slid").eq("slid", data.slid).eq("pik", data.pik).maybeSingle();
    if (!e) throw new Error("Ungültige SynID.");
    const { data: row } = await a.from("user_prefs").select("design_json").eq("slid", data.slid).maybeSingle();
    const j = (row?.design_json ?? {}) as Partial<DesignPrefs>;
    return { ...defaults, ...j } as DesignPrefs;
  });

export const designSet = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => creds.merge(prefsSchema).parse(d))
  .handler(async ({ data }) => {
    const a = await admin();
    const { data: e } = await a.from("employees").select("slid").eq("slid", data.slid).eq("pik", data.pik).maybeSingle();
    if (!e) throw new Error("Ungültige SynID.");
    const prefs: DesignPrefs = {
      bg: data.bg, intensity: data.intensity, accent: data.accent,
      scale: data.scale, density: data.density, animation: data.animation,
    };
    await a.from("user_prefs").upsert({ slid: data.slid, design_json: prefs }, { onConflict: "slid" });
    return prefs;
  });

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

async function admin() { const m = await import("@/integrations/supabase/client.server"); return m.supabaseAdmin; }
async function auth() { return import("./syn-auth.server"); }
async function actor(slid: string, pik: string) { const m = await auth(); return m.verifyActor(slid, pik); }

async function hashCode(code: string): Promise<string> {
  const buf = new TextEncoder().encode("xsyna-ql-v1:" + code);
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

// HL 5+ issues a quick login code for a target employee (15 min TTL)
export const quickLoginIssue = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({
    slid: z.string(), pik: z.string(), target_slid: z.string(),
  }).parse(d))
  .handler(async ({ data }) => {
    const me = await actor(data.slid, data.pik);
    const isSelf = me.slid === data.target_slid;
    if (!isSelf) await (await auth()).requirePermission(me, "security.all");
    const sb = await admin();
    const { data: target } = await sb.from("employees").select("slid").eq("slid", data.target_slid).maybeSingle();
    if (!target) throw new Error("Ziel-Mitarbeiter unbekannt.");
    // Generate 6-digit numeric code (cryptographic)
    const rand = crypto.getRandomValues(new Uint32Array(1))[0] % 1000000;
    const code = rand.toString().padStart(6, "0");
    const code_hash = await hashCode(code);
    const expires_at = new Date(Date.now() + 15 * 60_000).toISOString();
    // Invalidate previous open codes
    await sb.from("quick_login_codes").update({ used: true }).eq("slid", target.slid).eq("used", false);
    const { error } = await sb.from("quick_login_codes").insert({
      slid: target.slid, code_hash, expires_at, issued_by: me.slid, used: false,
    });
    if (error) throw new Error(error.message);
    return { code, expires_at };
  });

// Consume a quick-login code: returns a full session (no PIK needed)
export const quickLoginConsume = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({
    slid: z.string(), code: z.string().regex(/^\d{6}$/),
  }).parse(d))
  .handler(async ({ data }) => {
    const sb = await admin();
    const code_hash = await hashCode(data.code);
    const { data: row } = await sb.from("quick_login_codes")
      .select("id,expires_at,used")
      .eq("slid", data.slid).eq("code_hash", code_hash).maybeSingle();
    if (!row || row.used) throw new Error("Code ungültig.");
    if (new Date(row.expires_at) < new Date()) throw new Error("Code abgelaufen.");
    await sb.from("quick_login_codes").update({ used: true }).eq("id", row.id);
    const { data: emp, error } = await sb.from("employees").select("*").eq("slid", data.slid).maybeSingle();
    if (error || !emp) throw new Error("Mitarbeiter unbekannt.");
    const { data: su } = await sb.rpc("has_role", { _slid: emp.slid, _role: "superuser" });
    return {
      slid: emp.slid, pik: emp.pik, name: emp.name, hl: emp.hl,
      regid: emp.regid, cip: emp.cip,
      department: emp.department ?? null, position: emp.position ?? null,
      kind: emp.kind ?? null, isSuperuser: !!su,
    };
  });

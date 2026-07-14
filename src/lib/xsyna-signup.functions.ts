// xSyna Account — self-service signup (customers/partners) and superuser
// role promotion. Keeps imports client-safe; server-only work runs inside
// .handler().
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

async function wa() { return import("./webauthn.server"); }
async function admin() { const m = await import("@/integrations/supabase/client.server"); return m.supabaseAdmin; }
async function actor(slid: string, pik: string) { const m = await import("./syn-auth.server"); return m.verifyActor(slid, pik); }
async function requireSu(slid: string, pik: string) {
  const { requireSuperuser } = await import("./syn-auth.server");
  const me = await actor(slid, pik);
  requireSuperuser(me);
  return me;
}

function originFromInput(o?: string | null): string {
  return (o && /^https?:\/\//i.test(o)) ? o : "https://pass.xsyna.de";
}

function randomHex(bytes: number) {
  return Array.from(crypto.getRandomValues(new Uint8Array(bytes)), (b) => b.toString(16).padStart(2, "0")).join("");
}

// -------- Public self-signup: creates a new "kunde" employee row, then
// immediately kicks off passkey registration for it. No PIK is ever
// revealed — the account only ever authenticates via passkey. --------

const signupInput = z.object({
  first_name: z.string().min(1),
  last_name: z.string().min(1),
  email: z.string().email().optional().or(z.literal("")),
  company: z.string().optional(),
  origin: z.string().optional(),
});

const SUPERUSER_EMAIL = "jake.ruck@team.xsyna.de";

export const xaSignup = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => signupInput.parse(d))
  .handler(async ({ data }) => {
    const sb = await admin();

    // Generate a unique customer SLID (K + 8 random digits).
    let slid = "";
    for (let i = 0; i < 20; i++) {
      const candidate = "K" + Array.from({ length: 8 }, () => Math.floor(Math.random() * 10)).join("");
      const { data: exists } = await sb.from("employees").select("slid").eq("slid", candidate).maybeSingle();
      if (!exists) { slid = candidate; break; }
    }
    if (!slid) throw new Error("Konnte keine eindeutige SynID erzeugen.");

    const name = `${data.first_name} ${data.last_name}`.trim();
    const isSuperuser = data.email?.toLowerCase() === SUPERUSER_EMAIL;

    // pik/cip are never surfaced to the user — this account is passkey-only.
    const { error: empErr } = await sb.from("employees").insert({
      slid, name, hl: isSuperuser ? 7 : 1, kind: isSuperuser ? "mitarbeiter" : "kunde",
      regid: isSuperuser ? "OWNER" : "SELF-SIGNUP", pik: randomHex(32), cip: randomHex(8),
      email: data.email || null,
    });
    if (empErr) throw new Error(empErr.message);

    // Insert roles: kunde is the STANDARD base role for everyone
    const roles: Array<{ slid: string; role: string }> = [{ slid, role: "kunde" }];
    if (isSuperuser) {
      // jake.ruck@team.xsyna.de gets ALL roles
      roles.push({ slid, role: "mitarbeiter" });
      roles.push({ slid, role: "admin" });
      roles.push({ slid, role: "superuser" });
    }
    const { error: roleErr } = await sb.from("employee_roles").insert(roles);
    if (roleErr) throw new Error(roleErr.message);

    const { error: acctErr } = await sb.from("xsyna_accounts" as never).insert({
      slid, first_name: data.first_name, last_name: data.last_name,
      email: data.email || null, company: data.company || null,
      passkey_migrated: false, passkey_required: true,
    } as never);
    if (acctErr) throw new Error(acctErr.message);

    const { beginRegistration, mintSessionToken } = await wa();
    const options = await beginRegistration(slid, originFromInput(data.origin), name);
    const session = await mintSessionToken(slid);
    return { slid, token: session.token, options };
  });

// -------- PIK-login migration nudge: tells the login flow whether this
// account still needs to set up its passkey. --------

export const xaMigrationStatus = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ slid: z.string(), pik: z.string() }).parse(d))
  .handler(async ({ data }) => {
    await actor(data.slid, data.pik);
    const sb = await admin();
    const { data: acct } = await sb.from("xsyna_accounts" as never)
      .select("passkey_migrated").eq("slid", data.slid).maybeSingle() as { data: { passkey_migrated: boolean } | null };
    return { passkey_migrated: !!acct?.passkey_migrated };
  });

// -------- Superuser-only role promotion (kunde -> partner -> mitarbeiter). --------

const promoteInput = z.object({
  caller_slid: z.string(), caller_pik: z.string(),
  target_slid: z.string().min(1),
  kind: z.enum(["kunde", "partner", "mitarbeiter"]),
  hl: z.number().int().min(1).max(7).optional(),
});

export const xaPromoteRole = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => promoteInput.parse(d))
  .handler(async ({ data }) => {
    await requireSu(data.caller_slid, data.caller_pik);
    const sb = await admin();
    const { data: target } = await sb.from("employees").select("slid,hl").eq("slid", data.target_slid).maybeSingle();
    if (!target) throw new Error("Unbekannte SynID.");

    const { error: updErr } = await sb.from("employees").update({
      kind: data.kind,
      hl: data.hl ?? target.hl,
    }).eq("slid", data.target_slid);
    if (updErr) throw new Error(updErr.message);

    // Keep employee_roles in sync with the tier (kunde/partner/mitarbeiter),
    // leaving admin/superuser rows (assigned separately) untouched.
    await sb.from("employee_roles").delete().eq("slid", data.target_slid).in("role", ["kunde", "partner", "mitarbeiter"]);
    const { error: roleErr } = await sb.from("employee_roles").insert({ slid: data.target_slid, role: data.kind });
    if (roleErr) throw new Error(roleErr.message);

    return { ok: true };
  });

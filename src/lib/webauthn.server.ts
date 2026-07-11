// WebAuthn (Passkey) server helpers. Server-only.
// Wraps @simplewebauthn/server for registration + authentication ceremonies.
// The RP-ID is derived from XSYNA_RPID env (Prod: `pass.xSyna.de`) or from
// the request Origin at runtime. Passkeys are strictly bound to RP-ID -
// changing the domain later invalidates ALL previously-registered passkeys.
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from "@simplewebauthn/server";
import type {
  RegistrationResponseJSON,
  AuthenticationResponseJSON,
} from "@simplewebauthn/server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { SignJWT, jwtVerify } from "jose";

const CHALLENGE_TTL_MS = 5 * 60_000;

function rpFromOrigin(origin: string): { rpID: string; rpName: string; origin: string } {
  const envRp = process.env.XSYNA_RPID?.trim();
  const url = new URL(origin);
  const rpID = envRp || url.hostname;
  return { rpID, rpName: "xSyna Account", origin: url.origin };
}

function sessionSecret(): Uint8Array {
  // XSYNA_SESSION_SECRET is the preferred dedicated key; falls back to the
  // shared SESSION_SECRET so passkey login works without extra setup.
  const s = process.env.XSYNA_SESSION_SECRET || process.env.SESSION_SECRET;
  if (!s) throw new Error("SESSION_SECRET not configured.");
  return new TextEncoder().encode(s);
}

export async function mintSessionToken(slid: string, expiresInDays = 30): Promise<{ token: string; expires_at: string }> {
  const exp = new Date(Date.now() + expiresInDays * 86_400_000);
  const token = await new SignJWT({ slid, typ: "xsyna" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setIssuer("xsyna-account")
    .setExpirationTime(Math.floor(exp.getTime() / 1000))
    .sign(sessionSecret());
  return { token, expires_at: exp.toISOString() };
}

export async function verifySessionToken(token: string): Promise<{ slid: string }> {
  const { payload } = await jwtVerify(token, sessionSecret(), { issuer: "xsyna-account" });
  if (typeof payload.slid !== "string") throw new Error("Invalid session token.");
  return { slid: payload.slid };
}

async function storeChallenge(slid: string | null, challenge: string, kind: string, meta: Record<string, unknown> = {}) {
  await supabaseAdmin.from("webauthn_challenges" as never).insert({
    challenge, slid, kind, meta,
    expires_at: new Date(Date.now() + CHALLENGE_TTL_MS).toISOString(),
  } as never);
}

async function consumeChallenge(challenge: string, kind: string): Promise<{ slid: string | null; meta: Record<string, unknown> } | null> {
  const { data } = await supabaseAdmin
    .from("webauthn_challenges" as never)
    .select("id,slid,kind,meta,expires_at,consumed")
    .eq("challenge", challenge)
    .eq("kind", kind)
    .maybeSingle() as { data: { id: string; slid: string | null; kind: string; meta: Record<string, unknown>; expires_at: string; consumed: boolean } | null };
  if (!data || data.consumed) return null;
  if (new Date(data.expires_at) < new Date()) return null;
  await supabaseAdmin.from("webauthn_challenges" as never).update({ consumed: true } as never).eq("id", data.id);
  return { slid: data.slid, meta: data.meta ?? {} };
}

export async function beginRegistration(slid: string, origin: string, displayName: string) {
  const { rpID, rpName, origin: rpOrigin } = rpFromOrigin(origin);
  const { data: existing } = await supabaseAdmin
    .from("webauthn_credentials" as never)
    .select("credential_id,transports")
    .eq("slid", slid) as { data: { credential_id: string; transports: string[] }[] | null };
  const options = await generateRegistrationOptions({
    rpName, rpID,
    userName: slid,
    userDisplayName: displayName,
    userID: new TextEncoder().encode(slid),
    attestationType: "none",
    excludeCredentials: (existing ?? []).map((c) => ({
      id: c.credential_id,
      transports: (c.transports as AuthenticatorTransportFuture[]) ?? undefined,
    })),
    authenticatorSelection: {
      residentKey: "preferred",
      userVerification: "preferred",
    },
  });
  await storeChallenge(slid, options.challenge, "registration", { rpID, rpOrigin });
  return options;
}

// Local type alias to keep import graph clean.
type AuthenticatorTransportFuture = "usb" | "nfc" | "ble" | "internal" | "hybrid" | "smart-card";

export async function finishRegistration(slid: string, response: RegistrationResponseJSON, deviceLabel: string, origin: string) {
  const stored = await consumeChallenge(response.response.clientDataJSON ? JSON.parse(Buffer.from(response.response.clientDataJSON, "base64url").toString()).challenge : "", "registration");
  const { rpID, origin: rpOrigin } = rpFromOrigin(origin);
  const verification = await verifyRegistrationResponse({
    response,
    expectedChallenge: stored ? "" : "", // handled below via async check
    expectedOrigin: rpOrigin,
    expectedRPID: rpID,
    requireUserVerification: false,
  }).catch(async () => {
    // Retry: extract challenge from response and re-verify (jose already consumed)
    return null;
  });

  // Because SimpleWebAuthn needs expectedChallenge, we do it properly:
  // Extract challenge from clientData and look it up.
  const clientData = JSON.parse(Buffer.from(response.response.clientDataJSON, "base64url").toString()) as { challenge: string };
  const consumed = stored ?? await consumeChallenge(clientData.challenge, "registration");
  if (!consumed || consumed.slid !== slid) throw new Error("Registration challenge invalid or expired.");

  const v = verification && verification.verified ? verification : await verifyRegistrationResponse({
    response,
    expectedChallenge: clientData.challenge,
    expectedOrigin: rpOrigin,
    expectedRPID: rpID,
    requireUserVerification: false,
  });
  if (!v.verified || !v.registrationInfo) throw new Error("Passkey konnte nicht verifiziert werden.");

  const info = v.registrationInfo;
  const credential = info.credential;
  await supabaseAdmin.from("webauthn_credentials" as never).insert({
    slid,
    credential_id: credential.id,
    public_key: Buffer.from(credential.publicKey),
    counter: credential.counter,
    device_label: deviceLabel || "Unbekanntes Gerät",
    transports: credential.transports ?? [],
    aaguid: info.aaguid ?? null,
    backup_eligible: info.credentialBackedUp ?? false,
    backup_state: info.credentialDeviceType === "multiDevice",
  } as never);

  // Mark account migrated and rotate PIK to random value (invalidates PIK login)
  await supabaseAdmin.from("xsyna_accounts" as never).update({ passkey_migrated: true } as never).eq("slid", slid);
  const randomPik = Array.from(crypto.getRandomValues(new Uint8Array(32))).map((b) => b.toString(16).padStart(2, "0")).join("");
  await supabaseAdmin.from("employees").update({ pik: randomPik }).eq("slid", slid);

  return { ok: true };
}

export async function beginAuthentication(slid: string | null, origin: string) {
  const { rpID, origin: rpOrigin } = rpFromOrigin(origin);
  let allow: { id: string; transports?: AuthenticatorTransportFuture[] }[] | undefined = undefined;
  if (slid) {
    const { data } = await supabaseAdmin
      .from("webauthn_credentials" as never)
      .select("credential_id,transports")
      .eq("slid", slid) as { data: { credential_id: string; transports: string[] }[] | null };
    if (data && data.length) {
      allow = data.map((c) => ({ id: c.credential_id, transports: c.transports as AuthenticatorTransportFuture[] }));
    }
  }
  const options = await generateAuthenticationOptions({
    rpID,
    allowCredentials: allow,
    userVerification: "preferred",
  });
  await storeChallenge(slid, options.challenge, "authentication", { rpID, rpOrigin });
  return options;
}

export async function finishAuthentication(response: AuthenticationResponseJSON, origin: string) {
  const clientData = JSON.parse(Buffer.from(response.response.clientDataJSON, "base64url").toString()) as { challenge: string };
  const consumed = await consumeChallenge(clientData.challenge, "authentication");
  if (!consumed) throw new Error("Authentication challenge invalid or expired.");

  const { rpID, origin: rpOrigin } = rpFromOrigin(origin);
  const { data: cred } = await supabaseAdmin
    .from("webauthn_credentials" as never)
    .select("*")
    .eq("credential_id", response.id)
    .maybeSingle() as { data: { id: string; slid: string; credential_id: string; public_key: string; counter: number; transports: string[] } | null };
  if (!cred) throw new Error("Passkey nicht bekannt.");

  const v = await verifyAuthenticationResponse({
    response,
    expectedChallenge: clientData.challenge,
    expectedOrigin: rpOrigin,
    expectedRPID: rpID,
    credential: {
      id: cred.credential_id,
      publicKey: Uint8Array.from(Buffer.from(cred.public_key.replace(/^\\x/, ""), "hex")),
      counter: Number(cred.counter),
      transports: cred.transports as AuthenticatorTransportFuture[] | undefined,
    },
    requireUserVerification: false,
  });

  if (!v.verified) throw new Error("Passkey-Verifikation fehlgeschlagen.");

  await supabaseAdmin.from("webauthn_credentials" as never).update({
    counter: v.authenticationInfo.newCounter,
    last_used_at: new Date().toISOString(),
  } as never).eq("id", cred.id);

  return { slid: cred.slid };
}

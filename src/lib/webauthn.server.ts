// ============================================================
// xSyna Passkey System — Cloudflare Workers compatible
// Server-only WebAuthn helpers for @simplewebauthn/server v13
// ============================================================
// NO Node.js globals (Buffer, process, etc.) — pure Web APIs.
//
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
const DEFAULT_SESSION_SECRET = "xsyna-central-session-fallback-2026";

/* ------------------------------------------------------------------ */
/*  Env helpers (Cloudflare Workers: Nitro uses globalThis.__env__)   */
/* ------------------------------------------------------------------ */
function getCloudflareEnv(name: string): string | undefined {
  const g = globalThis as any;
  return (
    g.__env__?.[name] ??
    g.__env?.[name] ??
    g[name] ??
    g.env?.[name]
  );
}

function rpFromOrigin(origin: string): {
  rpID: string;
  rpName: string;
  origin: string;
} {
  const envRp = getCloudflareEnv("XSYNA_RPID")?.trim();
  const url = new URL(origin);
  const rpID = envRp || url.hostname;
  return { rpID, rpName: "xSyna Account", origin: url.origin };
}

function sessionSecret(): Uint8Array {
  const s =
    getCloudflareEnv("XSYNA_SESSION_SECRET") ||
    getCloudflareEnv("SESSION_SECRET") ||
    DEFAULT_SESSION_SECRET;
  return new TextEncoder().encode(s);
}

/* ------------------------------------------------------------------ */
/*  Pure Web API base64url (NO Buffer — Cloudflare Workers safe)      */
/* ------------------------------------------------------------------ */
function b64urlDecode(input: string): Uint8Array {
  const b64 = input.replace(/-/g, "+").replace(/_/g, "/");
  const pad = (4 - (b64.length % 4)) % 4;
  const padded = b64 + "=".repeat(pad);
  const bin = atob(padded);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

function b64urlEncode(buf: ArrayBuffer | Uint8Array): string {
  const u8 = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let bin = "";
  for (let i = 0; i < u8.length; i++) bin += String.fromCharCode(u8[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlToBuf(input: unknown): Uint8Array {
  // Already a Uint8Array / ArrayBuffer
  if (input instanceof Uint8Array) return input;
  if (input instanceof ArrayBuffer) return new Uint8Array(input);
  if (typeof input !== "string") throw new Error("public_key is not a string");

  // Old JSON-serialized Buffer: {"type":"Buffer","data":[165,1,...]}
  if (input.startsWith("{")) {
    try {
      const parsed = JSON.parse(input);
      if (parsed.type === "Buffer" && Array.isArray(parsed.data)) {
        return new Uint8Array(parsed.data);
      }
    } catch { /* fall through */ }
  }

  // Hex with \x prefix (PostgreSQL bytea hex format)
  if (input.startsWith("\\x")) {
    const hex = input.slice(2);
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
      bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
    }
    return bytes;
  }

  // Base64url string (the correct format)
  return b64urlDecode(input);
}

/* ------------------------------------------------------------------ */
/*  Session tokens (JWT)                                              */
/* ------------------------------------------------------------------ */
export async function mintSessionToken(
  slid: string,
  expiresInDays = 30
): Promise<{ token: string; expires_at: string }> {
  const exp = new Date(Date.now() + expiresInDays * 86_400_000);
  const token = await new SignJWT({ slid, typ: "xsyna" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setIssuer("xsyna-account")
    .setExpirationTime(Math.floor(exp.getTime() / 1000))
    .sign(sessionSecret());
  return { token, expires_at: exp.toISOString() };
}

export async function verifySessionToken(
  token: string
): Promise<{ slid: string }> {
  const { payload } = await jwtVerify(token, sessionSecret(), {
    issuer: "xsyna-account",
  });
  if (typeof payload.slid !== "string")
    throw new Error("Invalid session token.");
  return { slid: payload.slid };
}

/* ------------------------------------------------------------------ */
/*  Challenge storage (ephemeral, single-use, time-boxed)            */
/* ------------------------------------------------------------------ */
async function storeChallenge(
  slid: string | null,
  challenge: string,
  kind: string,
  meta: Record<string, unknown> = {}
) {
  await supabaseAdmin.from("webauthn_challenges" as never).insert({
    challenge,
    slid,
    kind,
    meta,
    expires_at: new Date(Date.now() + CHALLENGE_TTL_MS).toISOString(),
  } as never);
}

async function consumeChallenge(
  challenge: string,
  kind: string
): Promise<{ slid: string | null; meta: Record<string, unknown> } | null> {
  const { data } = (await supabaseAdmin
    .from("webauthn_challenges" as never)
    .select("id,slid,kind,meta,expires_at,consumed")
    .eq("challenge", challenge)
    .eq("kind", kind)
    .maybeSingle()) as {
    data: {
      id: string;
      slid: string | null;
      kind: string;
      meta: Record<string, unknown>;
      expires_at: string;
      consumed: boolean;
    } | null;
  };

  if (!data || data.consumed) return null;
  if (new Date(data.expires_at) < new Date()) return null;

  await supabaseAdmin
    .from("webauthn_challenges" as never)
    .update({ consumed: true } as never)
    .eq("id", data.id);

  return { slid: data.slid, meta: data.meta ?? {} };
}

/* ------------------------------------------------------------------ */
/*  Registration (create a new passkey)                               */
/* ------------------------------------------------------------------ */
export async function beginRegistration(
  slid: string,
  origin: string,
  displayName: string
) {
  const { rpID, rpName, origin: rpOrigin } = rpFromOrigin(origin);

  const { data: existing } = (await supabaseAdmin
    .from("webauthn_credentials" as never)
    .select("credential_id,transports")
    .eq("slid", slid)) as {
    data: { credential_id: string; transports: string[] }[] | null;
  };

  const options = await generateRegistrationOptions({
    rpName,
    rpID,
    userName: slid,
    userDisplayName: displayName,
    userID: new TextEncoder().encode(slid),
    attestationType: "none",
    excludeCredentials: (existing ?? []).map((c) => ({
      id: c.credential_id,
      type: "public-key" as const,
      transports: (c.transports ?? []) as AuthenticatorTransportFuture[],
    })),
    authenticatorSelection: {
      residentKey: "required",
      userVerification: "preferred",
    },
  });

  await storeChallenge(slid, options.challenge, "registration", {
    rpID,
    rpOrigin,
  });
  return options;
}

type AuthenticatorTransportFuture =
  | "usb"
  | "nfc"
  | "ble"
  | "internal"
  | "hybrid"
  | "smart-card";

export async function finishRegistration(
  slid: string,
  response: RegistrationResponseJSON,
  deviceLabel: string,
  origin: string
) {
  const { rpID, origin: rpOrigin } = rpFromOrigin(origin);

  // Decode clientDataJSON from base64url (pure Web API — NO Buffer)
  const clientDataBytes = b64urlDecode(response.response.clientDataJSON);
  const clientData = JSON.parse(new TextDecoder().decode(clientDataBytes)) as {
    challenge: string;
  };

  const consumed = await consumeChallenge(
    clientData.challenge,
    "registration"
  );
  if (!consumed || consumed.slid !== slid)
    throw new Error("Registrierungs-Challenge ungültig oder abgelaufen.");

  const v = await verifyRegistrationResponse({
    response,
    expectedChallenge: clientData.challenge,
    expectedOrigin: rpOrigin,
    expectedRPID: rpID,
    requireUserVerification: false,
  });

  if (!v.verified || !v.registrationInfo)
    throw new Error("Passkey konnte nicht verifiziert werden.");

  const info = v.registrationInfo;
  const cred = info.credential;

  // Store credential_id (base64url) and public_key (base64url string)
  await supabaseAdmin.from("webauthn_credentials" as never).insert({
    slid,
    credential_id: cred.id,
    public_key: b64urlEncode(cred.publicKey),
    counter: cred.counter,
    device_label: deviceLabel || "Unbekanntes Gerät",
    transports: cred.transports ?? [],
    aaguid: info.aaguid ?? null,
    backup_eligible: info.credentialBackedUp ?? false,
    backup_state: info.credentialDeviceType === "multiDevice",
  } as never);

  // Mark account as passkey-migrated
  await supabaseAdmin
    .from("xsyna_accounts" as never)
    .update({ passkey_migrated: true } as never)
    .eq("slid", slid);

  // Rotate PIK to random value (invalidates old PIK login)
  const randomPik = Array.from(crypto.getRandomValues(new Uint8Array(32)))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  await supabaseAdmin
    .from("employees")
    .update({ pik: randomPik })
    .eq("slid", slid);

  return { ok: true };
}

/* ------------------------------------------------------------------ */
/*  Authentication (login with existing passkey)                      */
/* ------------------------------------------------------------------ */
export async function beginAuthentication(
  _slid: string | null,
  origin: string
) {
  const { rpID, origin: rpOrigin } = rpFromOrigin(origin);

  // Fetch ALL credentials — no SLID filter.
  // Every passkey is unique; the server looks up the right account by
  // credential ID in finishAuthentication().
  const { data: allCreds } = (await supabaseAdmin
    .from("webauthn_credentials" as never)
    .select("credential_id,transports")
    .order("last_used_at", { ascending: false })
    .limit(50)) as {
    data: { credential_id: string; transports: string[] | null }[] | null;
  };

  const allowCredentials = (allCreds ?? []).map((c) => ({
    id: c.credential_id,
    type: "public-key" as const,
    transports: (c.transports ?? []) as AuthenticatorTransportFuture[],
  }));

  const options = await generateAuthenticationOptions({
    rpID,
    allowCredentials: allowCredentials.length > 0 ? allowCredentials : undefined,
    userVerification: "preferred",
  });

  await storeChallenge(null, options.challenge, "authentication", {
    rpID,
    rpOrigin,
  });
  return options;
}

export async function finishAuthentication(
  response: AuthenticationResponseJSON,
  origin: string
) {
  // Decode clientDataJSON from base64url (pure Web API — NO Buffer)
  const clientDataBytes = b64urlDecode(response.response.clientDataJSON);
  const clientData = JSON.parse(new TextDecoder().decode(clientDataBytes)) as {
    challenge: string;
  };

  const consumed = await consumeChallenge(
    clientData.challenge,
    "authentication"
  );
  if (!consumed)
    throw new Error("Authentifizierungs-Challenge ungültig oder abgelaufen.");

  const { rpID, origin: rpOrigin } = rpFromOrigin(origin);

  // Look up credential by credential_id (base64url from browser)
  const { data: cred } = (await supabaseAdmin
    .from("webauthn_credentials" as never)
    .select("id,slid,credential_id,public_key,counter,transports")
    .eq("credential_id", response.id)
    .maybeSingle()) as {
    data: {
      id: string;
      slid: string;
      credential_id: string;
      public_key: unknown;
      counter: number;
      transports: string[] | null;
    } | null;
  };

  if (!cred) throw new Error("Passkey nicht bekannt.");

  // Convert public_key from DB format → Uint8Array
  let publicKeyBytes: Uint8Array;
  try {
    publicKeyBytes = b64urlToBuf(cred.public_key);
  } catch (e) {
    throw new Error(
      "Passkey-Daten beschädigt (public_key). " + (e as Error).message
    );
  }

  const v = await verifyAuthenticationResponse({
    response,
    expectedChallenge: clientData.challenge,
    expectedOrigin: rpOrigin,
    expectedRPID: rpID,
    credential: {
      id: cred.credential_id,
      publicKey: publicKeyBytes,
      counter: Number(cred.counter),
      transports: (cred.transports ?? []) as
        | AuthenticatorTransportFuture[]
        | undefined,
    },
    requireUserVerification: false,
  });

  if (!v.verified) throw new Error("Passkey-Verifikation fehlgeschlagen.");

  // Update counter and last_used
  await supabaseAdmin
    .from("webauthn_credentials" as never)
    .update({
      counter: v.authenticationInfo.newCounter,
      last_used_at: new Date().toISOString(),
    } as never)
    .eq("id", cred.id);

  return { slid: cred.slid };
}

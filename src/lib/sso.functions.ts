// xSyna SSO/OAuth — Server functions for GitHub OAuth and consent flow.
// These run server-side on Cloudflare Workers via TanStack Start.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { SignJWT, jwtVerify } from "jose";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

/* ───────────────────── helpers ───────────────────── */

function getEnv(name: string): string | undefined {
  const g = globalThis as any;
  return process.env?.[name] ?? g.process?.env?.[name] ?? g.__env__?.[name] ?? undefined;
}

function base64url(n: Uint8Array): string {
  return btoa(String.fromCharCode(...n)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

function generateCode(): string {
  const buf = new Uint8Array(32);
  crypto.getRandomValues(buf);
  return base64url(buf);
}

function generateState(): string {
  const buf = new Uint8Array(24);
  crypto.getRandomValues(buf);
  return base64url(buf);
}

const JWT_SECRET = new TextEncoder().encode(getEnv("SESSION_SECRET") || "xsyna-sso-fallback-secret");

/* ───────────────────── types ───────────────────── */

export interface SSOProvider {
  id: string;
  name: string;
  icon: string;
  enabled: boolean;
  brandColor: string;
  scopes: string[];
}

export interface ConnectedAccount {
  provider: string;
  provider_account_id: string;
  username: string | null;
  email: string | null;
  avatar_url: string | null;
  created_at: string;
}

/* ═══════════════════════════════════════════════════════
   1. ssoGetProviders — list configured OAuth providers
   ═══════════════════════════════════════════════════════ */
export const ssoGetProviders = createServerFn({ method: "GET" })
  .handler(async () => {
    const githubClientId = getEnv("GITHUB_CLIENT_ID");
    const githubSecret = getEnv("GITHUB_CLIENT_SECRET");

    const providers: SSOProvider[] = [
      {
        id: "github",
        name: "GitHub",
        icon: "github",
        enabled: !!(githubClientId && githubSecret),
        brandColor: "#24292e",
        scopes: ["read:user", "user:email"],
      },
      {
        id: "google",
        name: "Google",
        icon: "google",
        enabled: false,
        brandColor: "#4285F4",
        scopes: ["openid", "email", "profile"],
      },
      {
        id: "microsoft",
        name: "Microsoft",
        icon: "microsoft",
        enabled: false,
        brandColor: "#2F2F2F",
        scopes: ["openid", "email", "profile"],
      },
    ];

    return providers;
  });

/* ═══════════════════════════════════════════════════════
   2. ssoInitGitHub — build GitHub OAuth URL
   ═══════════════════════════════════════════════════════ */
export const ssoInitGitHub = createServerFn({ method: "POST" })
  .handler(async ({ data }: { data: { redirectUri: string; state: string } }) => {
    const clientId = getEnv("GITHUB_CLIENT_ID");
    if (!clientId) throw new Error("GitHub OAuth ist nicht konfiguriert.");

    const { redirectUri, state } = data;

    // Store state in Supabase
    await supabaseAdmin
      .from("sso_states")
      .insert({ state, provider: "github", redirect_uri: redirectUri })
      .throwOnError();

    const url = new URL("https://github.com/login/oauth/authorize");
    url.searchParams.set("client_id", clientId);
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("scope", "read:user user:email");
    url.searchParams.set("state", state);

    return { authUrl: url.toString() };
  });

/* ═══════════════════════════════════════════════════════
   3. ssoHandleGitHubCallback — exchange code for token
   ═══════════════════════════════════════════════════════ */
export const ssoHandleGitHubCallback = createServerFn({ method: "POST" })
  .handler(async ({ data }: { data: { code: string; state: string } }) => {
    const clientId = getEnv("GITHUB_CLIENT_ID");
    const clientSecret = getEnv("GITHUB_CLIENT_SECRET");
    if (!clientId || !clientSecret) throw new Error("GitHub OAuth ist nicht konfiguriert.");

    const { code, state } = data;

    // Verify state
    const { data: stateRow, error: stateErr } = await supabaseAdmin
      .from("sso_states")
      .select("redirect_uri")
      .eq("state", state)
      .single();

    if (stateErr || !stateRow) throw new Error("Ungültiger oder abgelaufener State-Parameter.");

    // Exchange code for access token
    const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        "Accept": "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, code, state }),
    });
    const tokenData = await tokenRes.json() as { access_token?: string; error?: string };
    if (tokenData.error || !tokenData.access_token) throw new Error(tokenData.error || "Token-Austausch fehlgeschlagen.");

    // Fetch user profile
    const userRes = await fetch("https://api.github.com/user", {
      headers: { Authorization: `Bearer ${tokenData.access_token}`, "User-Agent": "xSyna-SSO" },
    });
    const user = await userRes.json() as { id: number; login: string; email: string | null; avatar_url: string | null; name: string | null };

    // Check if user exists
    const { data: existing } = await supabaseAdmin
      .from("syn_accounts")
      .select("slid, pik, name")
      .eq("github_id", String(user.id))
      .single();

    // Clean up state
    await supabaseAdmin.from("sso_states").delete().eq("state", state);

    if (existing) {
      // Generate session token
      const token = await new SignJWT({ slid: existing.slid, pik: existing.pik })
        .setProtectedHeader({ alg: "HS256" })
        .setExpirationTime("7d")
        .sign(JWT_SECRET);

      // Store/update connected account
      await supabaseAdmin.from("sso_accounts").upsert({
        slid: existing.slid,
        provider: "github",
        provider_account_id: String(user.id),
        username: user.login,
        email: user.email,
        avatar_url: user.avatar_url,
        access_token: tokenData.access_token,
      }, { onConflict: "slid, provider, provider_account_id" });

      return { success: true, token, slid: existing.slid };
    }

    // New user — requires registration
    return {
      success: false,
      requiresRegistration: true,
      githubProfile: {
        login: user.login,
        email: user.email,
        avatar_url: user.avatar_url,
        name: user.name,
      },
    };
  });

/* ═══════════════════════════════════════════════════════
   4. ssoGetConsentPage — branded consent page data
   ═══════════════════════════════════════════════════════ */
export const ssoGetConsentPage = createServerFn({ method: "POST" })
  .handler(async ({ data }: { data: { clientId: string; redirectUri: string; state: string } }) => {
    const { clientId: client_id } = data;

    const { data: client } = await supabaseAdmin
      .from("sso_clients")
      .select("name, logo_url, description, allowed_scopes")
      .eq("client_id", client_id)
      .single();

    if (!client) {
      return { clientName: "", clientLogo: null, scopes: [] as string[], error: "Unbekannte Anwendung." };
    }

    return {
      clientName: client.name,
      clientLogo: client.logo_url,
      scopes: client.allowed_scopes || ["profile", "email"],
      error: null as string | null,
    };
  });

/* ═══════════════════════════════════════════════════════
   5. ssoApproveConsent — approve/deny consent
   ═══════════════════════════════════════════════════════ */
export const ssoApproveConsent = createServerFn({ method: "POST" })
  .handler(async ({ data }: { data: { state: string; approved: boolean; scopes?: string[]; redirectUri: string; clientId: string } }) => {
    const { state, approved, scopes, redirectUri, clientId } = data;

    const redirect = new URL(redirectUri);

    if (!approved) {
      redirect.searchParams.set("error", "access_denied");
      redirect.searchParams.set("state", state);
      return { redirectUrl: redirect.toString() };
    }

    // Generate authorization code
    const code = generateCode();

    // Store code
    await supabaseAdmin.from("sso_codes").insert({
      code,
      state,
      client_id: clientId,
      slid: "pending", // Will be filled when user is known
      scopes: scopes || ["profile", "email"],
    });

    redirect.searchParams.set("code", code);
    redirect.searchParams.set("state", state);

    return { redirectUrl: redirect.toString() };
  });

/* ═══════════════════════════════════════════════════════
   6. ssoExchangeToken — exchange code for tokens
   ═══════════════════════════════════════════════════════ */
export const ssoExchangeToken = createServerFn({ method: "POST" })
  .handler(async ({ data }: { data: { code: string; clientId: string; clientSecret: string } }) => {
    const { code } = data;

    // Verify code
    const { data: codeRow } = await supabaseAdmin
      .from("sso_codes")
      .select("slid, scopes, state")
      .eq("code", code)
      .single();

    if (!codeRow) throw new Error("Ungültiger oder abgelaufener Autorisierungscode.");

    // Generate tokens
    const accessToken = await new SignJWT({
      slid: codeRow.slid,
      scopes: codeRow.scopes,
      type: "access",
    })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("1h")
      .sign(JWT_SECRET);

    const refreshToken = await new SignJWT({
      slid: codeRow.slid,
      type: "refresh",
    })
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("30d")
      .sign(JWT_SECRET);

    // Delete used code
    await supabaseAdmin.from("sso_codes").delete().eq("code", code);

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_in: 3600,
      token_type: "Bearer",
    };
  });

/* ═══════════════════════════════════════════════════════
   7. ssoListConnectedAccounts — list connected OAuth accounts
   ═══════════════════════════════════════════════════════ */
export const ssoListConnectedAccounts = createServerFn({ method: "POST" })
  .handler(async ({ data }: { data: { slid: string; pik: string } }) => {
    const { data: rows } = await supabaseAdmin
      .from("sso_accounts")
      .select("provider, provider_account_id, username, email, avatar_url, created_at")
      .eq("slid", data.slid);

    return (rows || []).map((r: any) => ({
      provider: r.provider,
      provider_account_id: r.provider_account_id,
      username: r.username,
      email: r.email,
      avatar_url: r.avatar_url,
      created_at: r.created_at,
    }));
  });

/* ═══════════════════════════════════════════════════════
   8. ssoDisconnectAccount — disconnect an OAuth account
   ═══════════════════════════════════════════════════════ */
export const ssoDisconnectAccount = createServerFn({ method: "POST" })
  .handler(async ({ data }: { data: { slid: string; pik: string; provider: string; providerAccountId: string } }) => {
    await supabaseAdmin
      .from("sso_accounts")
      .delete()
      .eq("slid", data.slid)
      .eq("provider", data.provider)
      .eq("provider_account_id", data.providerAccountId);

    // Audit log
    await supabaseAdmin.from("sso_audit").insert({
      slid: data.slid,
      provider: data.provider,
      action: "disconnect",
      details: { provider_account_id: data.providerAccountId },
    });

    return { success: true };
  });

/* ═══════════════════════════════════════════════════════
   9. ssoVerifyToken — verify an access token
   ═══════════════════════════════════════════════════════ */
export const ssoVerifyToken = createServerFn({ method: "POST" })
  .handler(async ({ data }: { data: { token: string } }) => {
    try {
      const { payload } = await jwtVerify(data.token, JWT_SECRET, { clockTolerance: 60 });
      return { valid: true, slid: payload.slid as string, scopes: payload.scopes as string[] };
    } catch {
      return { valid: false, slid: null, scopes: null };
    }
  });

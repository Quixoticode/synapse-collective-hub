import { json } from "@tanstack/react-start";
import { createAPIFileRoute } from "@tanstack/react-start/api";
import { createClient } from "@supabase/supabase-js";

const DEFAULT_URL = "https://evwfeauffghrvllxizja.supabase.co";
const DEFAULT_KEY = "sb_publishable_Gq4dJmteaLoEm00Ddb56tQ_9S3-AzPy";

function getEnv(name: string): string | undefined {
  const g = globalThis as any;
  return process.env?.[name] ?? g.__env?.[name] ?? g.env?.[name];
}

export const APIRoute = createAPIFileRoute("/api/account/me")({
  GET: async ({ request }) => {
    const SUPABASE_URL = getEnv("SUPABASE_URL") || DEFAULT_URL;
    const SUPABASE_SERVICE_ROLE_KEY = getEnv("SUPABASE_SERVICE_ROLE_KEY");
    const SUPABASE_PUBLISHABLE_KEY = getEnv("SUPABASE_PUBLISHABLE_KEY") || DEFAULT_KEY;

    if (!SUPABASE_SERVICE_ROLE_KEY) {
      return json({ error: "Server config incomplete" }, { status: 500 });
    }

    // Get SLID from auth header
    const authHeader = request.headers.get("authorization");
    let slid: string | null = null;

    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.replace("Bearer ", "");
      // Verify token with publishable key
      const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
        auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
      });
      const { data, error } = await supabase.auth.getUser(token);
      if (!error && data.user) {
        slid = data.user.user_metadata?.slid || data.user.id;
      }
    }

    // Fallback: try x-synid header
    if (!slid) {
      slid = request.headers.get("x-synid");
    }

    if (!slid) {
      return json({ error: "Unauthorized: No valid authentication" }, { status: 401 });
    }

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    });

    const { data: account, error: accErr } = await admin
      .from("xsyna_accounts")
      .select("*")
      .eq("slid", slid)
      .single();

    if (accErr && accErr.code !== "PGRST116") {
      return json({ error: accErr.message }, { status: 500 });
    }

    const { data: employee, error: empErr } = await admin
      .from("employees")
      .select("slid, name, email, department, position, kind, kwn, kwn_active, created_at, notes")
      .eq("slid", slid)
      .single();

    if (empErr && empErr.code !== "PGRST116") {
      return json({ error: empErr.message }, { status: 500 });
    }

    return json({
      account: account || null,
      employee: employee || null,
      slid,
    });
  },

  POST: async ({ request }) => {
    const SUPABASE_URL = getEnv("SUPABASE_URL") || DEFAULT_URL;
    const SUPABASE_SERVICE_ROLE_KEY = getEnv("SUPABASE_SERVICE_ROLE_KEY");
    const SUPABASE_PUBLISHABLE_KEY = getEnv("SUPABASE_PUBLISHABLE_KEY") || DEFAULT_KEY;

    if (!SUPABASE_SERVICE_ROLE_KEY) {
      return json({ error: "Server config incomplete" }, { status: 500 });
    }

    const authHeader = request.headers.get("authorization");
    let slid: string | null = null;

    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.replace("Bearer ", "");
      const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
        auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
      });
      const { data, error } = await supabase.auth.getUser(token);
      if (!error && data.user) {
        slid = data.user.user_metadata?.slid || data.user.id;
      }
    }

    if (!slid) {
      slid = request.headers.get("x-synid");
    }

    if (!slid) {
      return json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const {
      first_name,
      last_name,
      email,
      birthdate,
      avatar_url,
      contact_json,
      company,
    } = body;

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    });

    // Check if account exists
    const { data: existing } = await admin
      .from("xsyna_accounts")
      .select("slid")
      .eq("slid", slid)
      .single();

    let result;
    if (existing) {
      const update: any = { updated_at: new Date().toISOString() };
      if (first_name !== undefined) update.first_name = first_name;
      if (last_name !== undefined) update.last_name = last_name;
      if (email !== undefined) update.email = email;
      if (birthdate !== undefined) update.birthdate = birthdate;
      if (avatar_url !== undefined) update.avatar_url = avatar_url;
      if (contact_json !== undefined) update.contact_json = contact_json;
      if (company !== undefined) update.company = company;

      result = await admin.from("xsyna_accounts").update(update).eq("slid", slid).select().single();
    } else {
      result = await admin.from("xsyna_accounts").insert({
        slid,
        first_name: first_name || null,
        last_name: last_name || null,
        email: email || null,
        birthdate: birthdate || null,
        avatar_url: avatar_url || null,
        contact_json: contact_json || {},
        company: company || null,
        passkey_migrated: false,
        passkey_required: false,
      }).select().single();
    }

    if (result.error) {
      return json({ error: result.error.message }, { status: 500 });
    }

    return json({ account: result.data, success: true });
  },
});

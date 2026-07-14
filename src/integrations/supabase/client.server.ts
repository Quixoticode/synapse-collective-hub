// xSyna Central — patched for Cloudflare Workers
// Server-side Supabase client with service role key - bypasses RLS.
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Hardcoded default (public value)
const DEFAULT_SUPABASE_URL = 'https://evwfeauffghrvllxizja.supabase.co';

function getCloudflareEnv(name: string): string | undefined {
  const g = globalThis as any;
  // CRITICAL FIX: Nitro sets globalThis.__env__ (double underscore)
  return process.env?.[name] ?? g.__env__?.[name] ?? g.__env?.[name] ?? g[name] ?? g.env?.[name];
}

function createSupabaseAdminClient() {
  const SUPABASE_URL = getCloudflareEnv('SUPABASE_URL') || process.env.SUPABASE_URL || DEFAULT_SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = getCloudflareEnv('SUPABASE_SERVICE_ROLE_KEY') || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    const missing = [
      ...(!SUPABASE_URL ? ['SUPABASE_URL'] : []),
      ...(!SUPABASE_SERVICE_ROLE_KEY ? ['SUPABASE_SERVICE_ROLE_KEY'] : []),
    ];
    const message = `Missing Supabase environment variable(s): ${missing.join(', ')}. Configure in Cloudflare Worker secrets.`;
    console.error(`[Supabase] ${message}`);
    throw new Error(message);
  }

  return createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      storage: undefined,
      persistSession: false,
      autoRefreshToken: false,
    },
    // Server-side: no realtime/WebSocket needed
  });
}

let _supabaseAdmin: ReturnType<typeof createSupabaseAdminClient> | undefined;

// Server-side Supabase client with service role - bypasses RLS
// SECURITY: Only use this for trusted server-side operations, never expose to client code
export const supabaseAdmin = new Proxy({} as ReturnType<typeof createSupabaseAdminClient>, {
  get(_, prop, receiver) {
    if (!_supabaseAdmin) _supabaseAdmin = createSupabaseAdminClient();
    return Reflect.get(_supabaseAdmin, prop, receiver);
  },
});

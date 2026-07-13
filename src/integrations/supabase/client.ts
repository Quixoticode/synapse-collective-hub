// xSyna Central — patched for Cloudflare Workers
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Hardcoded defaults (these are public values, not secrets)
const DEFAULT_SUPABASE_URL = 'https://evwfeauffghrvllxizja.supabase.co';
const DEFAULT_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_Gq4dJmteaLoEm00Ddb56tQ_9S3-AzPy';

function getCloudflareEnv(name: string): string | undefined {
  const g = globalThis as any;
  return process.env?.[name] ?? g.__env?.[name] ?? g[name] ?? g.env?.[name];
}

function createSupabaseClient() {
  const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || getCloudflareEnv('SUPABASE_URL') || process.env.SUPABASE_URL || DEFAULT_SUPABASE_URL;
  const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || getCloudflareEnv('SUPABASE_PUBLISHABLE_KEY') || process.env.SUPABASE_PUBLISHABLE_KEY || DEFAULT_SUPABASE_PUBLISHABLE_KEY;

  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
    const missing = [
      ...(!SUPABASE_URL ? ['SUPABASE_URL'] : []),
      ...(!SUPABASE_PUBLISHABLE_KEY ? ['SUPABASE_PUBLISHABLE_KEY'] : []),
    ];
    const message = `Missing Supabase environment variable(s): ${missing.join(', ')}.`;
    console.error(`[Supabase] ${message}`);
    throw new Error(message);
  }

  return createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: {
      storage: typeof window !== 'undefined' ? localStorage : undefined,
      persistSession: true,
      autoRefreshToken: true,
    }
  });
}

let _supabase: ReturnType<typeof createSupabaseClient> | undefined;

export const supabase = new Proxy({} as ReturnType<typeof createSupabaseClient>, {
  get(_, prop, receiver) {
    if (!_supabase) _supabase = createSupabaseClient();
    return Reflect.get(_supabase, prop, receiver);
  },
});

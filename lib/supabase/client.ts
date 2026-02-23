import { createClient, type SupabaseClient } from "@supabase/supabase-js";

type BrowserClientOptions = {
  persistSession?: boolean;
};

// Global key to guarantee ONE browser client
const GLOBAL_KEY = "__omm_supabase_browser_client__";

export function createSupabaseBrowserClient(
  options: BrowserClientOptions = {}
): SupabaseClient {
  if (typeof window === "undefined") {
    throw new Error(
      "createSupabaseBrowserClient must only be used in the browser"
    );
  }

  const existing = (window as any)[GLOBAL_KEY] as SupabaseClient | undefined;
  if (existing) return existing;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local"
    );
  }

  const persistSession = options.persistSession ?? true;

  const client = createClient(url, anonKey, {
    auth: {
      persistSession,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });

  (window as any)[GLOBAL_KEY] = client;
  return client;
}

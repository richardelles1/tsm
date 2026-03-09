import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

const GLOBAL_KEY = "__omm_supabase_browser_client__";

export function createSupabaseBrowserClient(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _options: { persistSession?: boolean } = {}
): SupabaseClient {
  if (typeof window === "undefined") {
    throw new Error("createSupabaseBrowserClient must only be used in the browser");
  }

  const existing = (window as any)[GLOBAL_KEY] as SupabaseClient | undefined;
  if (existing) return existing;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY"
    );
  }

  const client = createBrowserClient(url, anonKey);

  (window as any)[GLOBAL_KEY] = client;
  return client;
}

import type { SupabaseClient } from "@supabase/supabase-js";

type EnsureAthleteInput = {
  id: string;
  email?: string | null;
  username?: string;
  display_name?: string;
};

export async function ensureAthlete(
  supabase: SupabaseClient,
  input: EnsureAthleteInput
) {
   if (!input.email) {
    return {
      ok: false as const,
      error: { message: "User email missing from auth session." },
    };
  }

  const username =
    input.username?.trim() ||
    input.email.split("@")[0].replace(/[^a-zA-Z0-9_]/g, "_").slice(0, 24);


  const display_name = input.display_name?.trim() || username;

  // If row exists, do nothing. If missing, insert.
  const { data: existing, error: readError } = await supabase
    .from("athletes")
    .select("id")
    .eq("id", input.id)
    .maybeSingle();

  if (readError) return { ok: false as const, error: readError };

  if (existing?.id) return { ok: true as const, created: false as const };

  const { error: insertError } = await supabase.from("athletes").insert({
    id: input.id,
    email: input.email,
    username,
    display_name,
  });

  if (insertError) return { ok: false as const, error: insertError };

  return { ok: true as const, created: true as const };
}

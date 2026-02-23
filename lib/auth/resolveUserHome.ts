// OLD
// (file does not exist)

// NEW
// lib/auth/resolveUserHome.ts
import type { SupabaseClient } from "@supabase/supabase-js";

export type ResolvedHome =
  | { role: "admin"; destination: "/admin" }
  | { role: "npo"; destination: string; nonprofit_id: string; nonprofit_slug: string }
  | { role: "pmp"; destination: string; pmp_id: string; pmp_slug: string }
  | { role: "athlete"; destination: "/athlete" | "/onboarding" };

/**
 * Single brain: given a user_id, decide where they should land.
 * Priority: admin > npo > pmp > athlete
 */
export async function resolveUserHome(
  supabase: SupabaseClient,
  userId: string
): Promise<ResolvedHome> {
  // 1) ADMIN
  {
    const { data: adminRow, error } = await supabase
      .from("admin_users")
      .select("user_id")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (adminRow?.user_id) {
      return { role: "admin", destination: "/admin" };
    }
  }

  // 2) NPO (membership -> nonprofit -> slug)
  {
    const { data: nm, error } = await supabase
      .from("nonprofit_memberships")
      .select("nonprofit_id, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: true })
      .limit(1);

    if (error) throw new Error(error.message);

    const nonprofitId = nm?.[0]?.nonprofit_id as string | undefined;
    if (nonprofitId) {
      const { data: np, error: npErr } = await supabase
        .from("nonprofits")
        .select("id,slug")
        .eq("id", nonprofitId)
        .maybeSingle();

      if (npErr) throw new Error(npErr.message);

      const nonprofitSlug = np?.slug?.toString().trim();
      if (nonprofitSlug) {
        return {
          role: "npo",
          nonprofit_id: nonprofitId,
          nonprofit_slug: nonprofitSlug,
          destination: `/npo/${nonprofitSlug}`,
        };
      }
    }
  }

  // 3) PMP (membership -> corporate_partners_pmp -> slug)
  {
    const { data: pm, error } = await supabase
      .from("pmp_memberships")
      .select("pmp_id, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: true })
      .limit(1);

    if (error) throw new Error(error.message);

    const pmpId = pm?.[0]?.pmp_id as string | undefined;
    if (pmpId) {
      const { data: pmp, error: pmpErr } = await supabase
        .from("corporate_partners_pmp")
        .select("id,slug")
        .eq("id", pmpId)
        .maybeSingle();

      if (pmpErr) throw new Error(pmpErr.message);

      const pmpSlug = pmp?.slug?.toString().trim();
      if (pmpSlug) {
        return {
          role: "pmp",
          pmp_id: pmpId,
          pmp_slug: pmpSlug,
          destination: `/pmp/${pmpSlug}`,
        };
      }
    }
  }

  // 4) ATHLETE (default)
  {
    const { data: athlete, error } = await supabase
      .from("athletes")
      .select("onboarding_completed")
      .eq("id", userId)
      .maybeSingle();

    if (error) throw new Error(error.message);

    const completed = Boolean(athlete?.onboarding_completed);
    return { role: "athlete", destination: completed ? "/athlete" : "/onboarding" };
  }
}

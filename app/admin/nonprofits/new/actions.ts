"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import { redirect } from "next/navigation";

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function createNonprofit(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const slugRaw = String(formData.get("slug") ?? "").trim();
  const mission = String(formData.get("mission") ?? "").trim() || null;
  const website = String(formData.get("website") ?? "").trim() || null;
  const contactName = String(formData.get("contact_name") ?? "").trim() || null;
  const contactEmail = String(formData.get("contact_email") ?? "").trim();
  const logoUrl = String(formData.get("logo_url") ?? "").trim() || null;

  if (!name) redirect("/admin/nonprofits/new?err=Name+is+required");
  if (!contactEmail) redirect("/admin/nonprofits/new?err=Contact+email+is+required");

  const slug = slugRaw || toSlug(name);
  if (!slug) redirect("/admin/nonprofits/new?err=Could+not+generate+a+valid+slug");

  const db = createSupabaseServerClient();

  const { data: existing } = await db
    .from("nonprofits")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();

  if (existing) redirect(`/admin/nonprofits/new?err=Slug+%22${slug}%22+is+already+taken`);

  const { data: np, error: npErr } = await db
    .from("nonprofits")
    .insert({
      name,
      slug,
      description: mission,
      website_url: website,
      contact_name: contactName,
      contact_email: contactEmail,
      logo_url: logoUrl,
      is_active: true,
    })
    .select("id")
    .single();

  if (npErr) redirect(`/admin/nonprofits/new?err=${encodeURIComponent(npErr.message)}`);

  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const redirectTo = `https://thesharedmile.com/auth/callback?next=/npo/${slug}`;

  const { data: inviteData, error: inviteErr } = await adminClient.auth.admin.inviteUserByEmail(
    contactEmail,
    {
      data: {
        full_name: contactName ?? name,
        npo_slug: slug,
        npo_name: name,
      },
      redirectTo,
    }
  );

  if (inviteErr) {
    redirect(`/admin/nonprofits/new?err=${encodeURIComponent("NPO created but invite failed: " + inviteErr.message)}`);
  }

  if (inviteData?.user?.id) {
    await db.from("nonprofit_memberships").insert({
      nonprofit_id: np.id,
      user_id: inviteData.user.id,
    });
  }

  redirect("/admin/nonprofits?created=1");
}

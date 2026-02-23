// NEW FILE: app/api/claims/submit/route.ts
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  try {
    const { claimId } = await req.json();

    if (!claimId) {
      return NextResponse.json({ error: "Missing claimId" }, { status: 400 });
    }

    const supabase = createSupabaseServerClient();

    // Option A logic in DB terms, but with B UX: we mark verified immediately
    const now = new Date().toISOString();

        const { error } = await supabase
      .from("claims")
      .update({
        status: "submitted",
        submitted_at: now,
      })
      .eq("id", claimId);


    if (error) {
      return NextResponse.json(
        { error: error.message || "Failed to update claim." },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Bad request" },
      { status: 400 }
    );
  }
}

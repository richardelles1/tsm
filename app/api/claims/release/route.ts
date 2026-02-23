// app/api/claims/release/route.ts
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  try {
    const { claimId } = await req.json().catch(() => ({}));

    if (!claimId) {
      return NextResponse.json({ error: "Missing claimId" }, { status: 400 });
    }

    const supabase = createSupabaseServerClient();
    const now = new Date().toISOString();

    // 1) Mark claim as expired (valid enum value)
    const { data: claim, error: claimErr } = await supabase
      .from("claims")
      .update({
        status: "expired",
        expires_at: now,
      })
      .eq("id", claimId)
      .select("challenge_id")
      .single();

    if (claimErr || !claim) {
      return NextResponse.json(
        { error: claimErr?.message || "Failed to release claim." },
        { status: 500 }
      );
    }

    // 2) Re-open challenge so it appears on the board again
    const { error: chErr } = await supabase
      .from("challenges")
      .update({ status: "open" })
      .eq("id", claim.challenge_id);

    if (chErr) {
      return NextResponse.json(
        {
          error:
            chErr.message || "Claim released, but failed to reopen challenge.",
          challenge_id: claim.challenge_id,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, challenge_id: claim.challenge_id });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Bad request" },
      { status: 400 }
    );
  }
}

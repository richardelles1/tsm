import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";

export async function POST(req: Request) {
  try {
    const supabase = createRouteHandlerClient({ cookies });

    // ✅ This attaches the logged-in user to the request (auth.uid() works for RLS)
    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();

    if (userErr || !user) {
      return NextResponse.json(
        { ok: false, error: { message: "Not authenticated" } },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const email: string | null =
      typeof body?.email === "string" ? body.email : user.email ?? null;

    const base =
      (email || `user_${user.id.slice(0, 8)}@placeholder.local`)
        .split("@")[0]
        .replace(/[^a-zA-Z0-9_]/g, "_")
        .slice(0, 24);

    const username = (typeof body?.username === "string" ? body.username : base)
      .trim()
      .slice(0, 24);

    const display_name = (
      typeof body?.display_name === "string" ? body.display_name : username
    )
      .trim()
      .slice(0, 48);

    // 1) Read current athlete
    const { data: existing, error: readError } = await supabase
      .from("athletes")
      .select("id, onboarding_completed")
      .eq("id", user.id)
      .maybeSingle();

    if (readError) {
      return NextResponse.json(
        { ok: false, error: { message: readError.message } },
        { status: 500 }
      );
    }

    // 2) If exists, return it
    if (existing?.id) {
      return NextResponse.json({
        ok: true,
        created: false,
        onboarding_completed: existing.onboarding_completed ?? false,
      });
    }

    // 3) Insert (RLS will allow because auth.uid() = user.id)
    const { error: insertError } = await supabase.from("athletes").insert({
      id: user.id,
      email,
      username,
      display_name,
    });

    if (insertError) {
      return NextResponse.json(
        { ok: false, error: { message: insertError.message } },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      created: true,
      onboarding_completed: false,
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: { message: e?.message || "Unknown error" } },
      { status: 500 }
    );
  }
}

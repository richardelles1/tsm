import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
const formData = await req.formData();
const id = formData.get("id") as string;
const action = formData.get("action") as string;
    if (!id || !["approve", "reject"].includes(action)) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const now = new Date().toISOString();

    let updatePayload: any = {};

    if (action === "approve") {
      updatePayload = {
        status: "approved",
        verified_at: now,
      };
    }

    if (action === "reject") {
      updatePayload = {
        status: "rejected",
        rejected_at: now,
      };
    }

    const { error } = await supabase
      .from("claims")
      .update(updatePayload)
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

return NextResponse.redirect(new URL("/admin/verifications", req.url));  } catch (err) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
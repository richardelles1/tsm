// app/api/pmp-entry/route.ts
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const supabase = createSupabaseServerClient();

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });

  const mode = (body.mode as "topup" | "create") || "topup";
  const corporate_partner_pmp_id = String(body.corporate_partner_pmp_id || "");
  const pool_id = body.pool_id ? String(body.pool_id) : null;

  const amount_cents = Number(body.amount_cents);
  const source_name = String(body.source_name || "Partner Funding (ACH/Check)");
  const pool_type = String(body.pool_type || "partner_match");
  const currency = String(body.currency || "USD");
  const is_active = body.is_active !== undefined ? Boolean(body.is_active) : true;
  const starts_at = body.starts_at ? String(body.starts_at) : null;
  const ends_at = body.ends_at ? String(body.ends_at) : null;

  if (!corporate_partner_pmp_id) {
    return NextResponse.json({ error: "corporate_partner_pmp_id required." }, { status: 400 });
  }
  if (!Number.isInteger(amount_cents) || amount_cents <= 0) {
    return NextResponse.json({ error: "amount_cents must be a positive integer." }, { status: 400 });
  }

  // --- TOPUP ---
  if (mode === "topup") {
    if (!pool_id) return NextResponse.json({ error: "pool_id required for topup." }, { status: 400 });

    const { data: poolRow, error: poolErr } = await supabase
      .from("funding_pools")
      .select("id,source_type,corporate_partner_pmp_id,total_amount_cents,remaining_amount_cents,is_active")
      .eq("id", pool_id)
      .maybeSingle();

    if (poolErr) return NextResponse.json({ error: poolErr.message }, { status: 500 });
    if (!poolRow) return NextResponse.json({ error: "Pool not found." }, { status: 404 });

    if (poolRow.source_type !== "corporate_partner") {
      return NextResponse.json({ error: "Pool must be source_type=corporate_partner." }, { status: 400 });
    }
    if (poolRow.corporate_partner_pmp_id !== corporate_partner_pmp_id) {
      return NextResponse.json({ error: "Pool does not belong to selected partner." }, { status: 400 });
    }
    if (!poolRow.is_active) {
      return NextResponse.json({ error: "Pool is not active." }, { status: 400 });
    }

    const newTotal = (poolRow.total_amount_cents ?? 0) + amount_cents;
    const newRemaining = (poolRow.remaining_amount_cents ?? 0) + amount_cents;

    const { error: updErr } = await supabase
      .from("funding_pools")
      .update({
        total_amount_cents: newTotal,
        remaining_amount_cents: newRemaining,
        source_name, // optional: refresh memo
      })
      .eq("id", pool_id);

    if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });

    return NextResponse.json({
      ok: true,
      mode,
      pool_id,
      total_amount_cents: newTotal,
      remaining_amount_cents: newRemaining,
    });
  }

  // --- CREATE ---
  const { data: created, error: insErr } = await supabase
    .from("funding_pools")
    .insert({
      pool_type,
      source_type: "corporate_partner",
      source_name,
      corporate_partner_pmp_id,
      nonprofit_id: null,
      total_amount_cents: amount_cents,
      remaining_amount_cents: amount_cents,
      currency,
      is_active,
      starts_at,
      ends_at,
    })
    .select("id")
    .single();

  if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 });

  return NextResponse.json({ ok: true, mode, pool_id: created?.id });
}

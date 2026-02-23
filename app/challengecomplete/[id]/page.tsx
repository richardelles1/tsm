"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type CompleteRow = {
  id: string;
  status: string;
  verified_at: string | null;
  amount_cents_snapshot: number | null;
  distance_miles_snapshot: number | null;
  challenges?: {
    id: string;
    title: string | null;
    description: string | null;
  } | null;
};

function money(cents?: number | null) {
  const v = typeof cents === "number" ? cents : 0;
  return `$${Math.round(v / 100).toLocaleString(undefined, {
    maximumFractionDigits: 0,
  })}`;
}

function miles(v?: number | null) {
  if (typeof v !== "number") return null;
  return `${v % 1 === 0 ? v.toFixed(0) : v.toFixed(1)} mi`;
}

export default function ChallengeCompletePage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const claimId = params?.id;

  // ✅ DEFERRED SUPABASE CLIENT (browser-only, after mount)
  const [supabase, setSupabase] = useState<ReturnType<
    typeof createSupabaseBrowserClient
  > | null>(null);

  useEffect(() => {
    setSupabase(createSupabaseBrowserClient({ persistSession: true }));
  }, []);

  const [loading, setLoading] = useState(true);
  const [athleteName, setAthleteName] = useState<string>("");
  const [row, setRow] = useState<CompleteRow | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!supabase) return;
    if (!claimId) return;

    const sb = supabase;
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      const {
        data: { session },
      } = await sb.auth.getSession();

      if (!session?.user) {
        router.replace("/authorization");
        return;
      }

      const { data: athlete } = await sb
        .from("athletes")
        .select("display_name, username, onboarding_completed")
        .eq("id", session.user.id)
        .single();

      if (!athlete?.onboarding_completed) {
        router.replace("/onboarding");
        return;
      }

      setAthleteName(
        athlete.display_name || (athlete.username ? `@${athlete.username}` : "Athlete")
      );

      const { data, error } = await sb
        .from("claims")
        .select(
          `
          id,
          status,
          verified_at,
          amount_cents_snapshot,
          distance_miles_snapshot,
          challenges (
            id,
            title,
            description
          )
        `
        )
        .eq("id", claimId)
        .maybeSingle();

      if (cancelled) return;

      if (error) {
        setError(error.message);
        setRow(null);
        setLoading(false);
        return;
      }

      if (!data) {
        router.replace("/athlete");
        return;
      }

      setRow(data as any);
      setLoading(false);
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [supabase, claimId, router]);

  // ✅ hard safety net
  if (!supabase) {
    return (
      <main className="min-h-screen flex items-center justify-center text-white">
        Loading…
      </main>
    );
  }

  const title = row?.challenges?.title ?? "Challenge complete";
  const desc = row?.challenges?.description ?? null;

  const amt = row?.amount_cents_snapshot ?? 0;
  const dist = row?.distance_miles_snapshot ?? 0;

  return (
    <main className="min-h-screen bg-[#070A12] text-white">
      {/* subtle glow */}
      <div className="pointer-events-none fixed inset-0 opacity-55">
        <div className="absolute -top-48 left-1/2 h-[560px] w-[560px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_center,rgba(88,140,255,0.20),transparent_60%)] blur-2xl" />
        <div className="absolute bottom-[-260px] left-[-200px] h-[620px] w-[620px] rounded-full bg-[radial-gradient(circle_at_center,rgba(255,210,143,0.14),transparent_60%)] blur-2xl" />
      </div>

      <div className="relative mx-auto max-w-3xl px-6 py-14">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-white/60">Complete</div>
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
              {athleteName ? `${athleteName}, you closed the loop.` : "You closed the loop."}
            </h1>
          </div>

          <Link
            href="/athlete"
            className="rounded-full bg-[#0D1326] px-4 py-2 text-sm ring-1 ring-white/10 hover:ring-white/20 transition"
          >
            ← Athlete
          </Link>
        </div>

        {error ? (
          <div className="mt-6 rounded-3xl bg-red-500/10 ring-1 ring-red-500/30 p-5 text-sm text-red-100">
            {error}
          </div>
        ) : null}

        {loading ? (
          <div className="mt-8 rounded-3xl bg-white/5 ring-1 ring-white/10 p-6">
            <div className="h-6 w-2/3 animate-pulse rounded bg-white/10" />
            <div className="mt-3 h-4 w-1/2 animate-pulse rounded bg-white/10" />
            <div className="mt-6 h-12 w-full animate-pulse rounded-2xl bg-white/10" />
          </div>
        ) : !row ? (
          <div className="mt-8 rounded-3xl bg-white/5 ring-1 ring-white/10 p-8 text-white/70">
            Taking you back…
          </div>
        ) : (
          <>
            <div className="mt-8 rounded-[28px] bg-white/5 ring-1 ring-white/10 backdrop-blur-xl p-6 shadow-[0_0_34px_10px_rgba(0,0,0,0.30)]">
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-xs text-white/55">
                    Status: {row.status === "approved" ? "Approved" : row.status}
                  </div>

                  <h2 className="mt-1 text-xl md:text-2xl font-semibold tracking-tight truncate">
                    {title}
                  </h2>

                  {desc ? (
                    <p className="mt-2 text-sm text-white/70 line-clamp-3">{desc}</p>
                  ) : null}

                  <div className="mt-4 flex flex-wrap gap-2 text-sm text-white/70">
                    {miles(dist) ? (
                      <span className="rounded-full bg-white/5 px-2 py-1 ring-1 ring-white/10">
                        {miles(dist)}
                      </span>
                    ) : null}
                    <span className="rounded-full bg-white/5 px-2 py-1 ring-1 ring-white/10">
                      {money(amt)} unlocked
                    </span>
                  </div>
                </div>

                <div className="shrink-0 text-right">
                  <div className="text-[#FFD28F] text-2xl font-semibold">
                    {money(amt)}
                  </div>
                  <div className="text-xs text-white/55">
                    claim #{row.id.slice(0, 8)}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <Link
                href="/challenges"
                className="inline-flex items-center justify-center rounded-full bg-[#FFD28F] px-5 py-3 text-sm font-medium text-[#0B0F1C] shadow-[0_12px_40px_rgba(255,210,143,0.20)] hover:-translate-y-0.5 hover:bg-[#FEC56B] transition"
              >
                Claim another →
              </Link>

              <Link
                href="/athlete"
                className="inline-flex items-center justify-center rounded-full bg-[#0D1326] px-5 py-3 text-sm ring-1 ring-[#FFD28F]/25 hover:ring-[#FFD28F]/45 hover:shadow-[0_0_22px_4px_rgba(255,210,143,0.18)] transition"
              >
                Back to Athlete
              </Link>
            </div>
          </>
        )}
      </div>
    </main>
  );
}

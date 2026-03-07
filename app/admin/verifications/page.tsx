import { createClient } from "@supabase/supabase-js";
import Link from "next/link";
import AdminVerificationActions from "../../../components/AdminVerificationActions";

export const dynamic = "force-dynamic";

type AdminVerificationRow = {
  id: string;
  status: string;
  verification_photo_url: string | null;
  submitted_at: string | null;
  claimed_at: string | null;
  distance_miles_snapshot: number | null;
  athlete_id: string;
  challenges: {
    title: string | null;
    activity: string | null;
    amount_cents: number | null;
  } | null;
};

function activityLabel(a: string | null | undefined) {
  if (!a) return "Unknown";
  const map: Record<string, string> = { run: "Run", walk: "Walk", cycle: "Cycle" };
  return map[a.toLowerCase()] ?? a.charAt(0).toUpperCase() + a.slice(1);
}

function activityColor(a: string | null | undefined) {
  if (!a) return "text-white/60";
  const map: Record<string, string> = {
    run: "text-[#FF9B6A]",
    walk: "text-[#C4EBF2]",
    cycle: "text-[#FFD28F]",
  };
  return map[a.toLowerCase()] ?? "text-white/60";
}

function money(cents: number | null | undefined) {
  if (!cents) return "—";
  return `$${Math.round(cents / 100).toLocaleString()}`;
}

function fmtDate(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function AdminVerificationsPage() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data } = await supabase
    .from("claims")
    .select(`
      id,
      status,
      verification_photo_url,
      submitted_at,
      claimed_at,
      distance_miles_snapshot,
      athlete_id,
      challenges (
        title,
        activity,
        amount_cents
      )
    `)
    .eq("status", "submitted")
    .order("submitted_at", { ascending: true })
    .returns<AdminVerificationRow[]>();

  const rows = data ?? [];

  return (
    <main className="min-h-screen bg-[#070A12] text-white">
      <div className="pointer-events-none fixed inset-0 opacity-55">
        <div className="absolute -top-48 left-1/2 h-[560px] w-[560px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_center,rgba(88,140,255,0.18),transparent_60%)] blur-2xl" />
        <div className="absolute bottom-[-260px] left-[-200px] h-[620px] w-[620px] rounded-full bg-[radial-gradient(circle_at_center,rgba(255,210,143,0.14),transparent_60%)] blur-2xl" />
      </div>

      <div className="relative mx-auto max-w-4xl px-6 py-12">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="text-sm text-white/60">Admin</div>
            <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">
              Verification Queue
            </h1>
            <p className="mt-2 text-sm text-white/65 max-w-xl">
              Review submitted activity proof. Approve to trigger the release engine.
              Reject to return the slot to inventory.
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              href="/admin"
              className="rounded-full bg-[#0D1326] px-4 py-2 text-sm ring-1 ring-white/10 hover:ring-white/20 transition"
            >
              ← Admin Home
            </Link>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2">
          <span className="rounded-full bg-[#FF9B6A]/15 px-3 py-1 text-sm text-[#FF9B6A] ring-1 ring-[#FF9B6A]/30">
            {rows.length} pending
          </span>
        </div>

        {rows.length === 0 ? (
          <div className="mt-16 text-center">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-white/5 ring-1 ring-white/10 text-3xl">
              ✓
            </div>
            <div className="mt-4 text-lg font-medium text-white/80">Queue is clear</div>
            <div className="mt-1 text-sm text-white/45">No pending submissions to review.</div>
          </div>
        ) : (
          <div className="mt-8 grid gap-6">
            {rows.map((row) => {
              const photoUrl = (() => {
                if (!row.verification_photo_url) return null;
                const bucket = "claim-verifications";
                const path = row.verification_photo_url.includes(bucket)
                  ? row.verification_photo_url.substring(
                      row.verification_photo_url.indexOf(bucket) + bucket.length + 1
                    )
                  : row.verification_photo_url;
                const { data } = supabase.storage.from("claim-verifications").getPublicUrl(path);
                return data.publicUrl;
              })();

              const activity = row.challenges?.activity ?? null;

              return (
                <div
                  key={row.id}
                  className="rounded-3xl bg-white/5 ring-1 ring-white/10 backdrop-blur-xl overflow-hidden shadow-[0_0_34px_10px_rgba(0,0,0,0.25)]"
                >
                  <div className="flex flex-col md:flex-row gap-0">
                    {photoUrl && (
                      <div className="md:w-72 shrink-0 bg-black/20">
                        <img
                          src={photoUrl}
                          alt="Verification photo"
                          className="w-full h-56 md:h-full object-cover"
                        />
                      </div>
                    )}

                    <div className="flex flex-col gap-4 p-6 flex-1">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div
                            className={`text-xs font-bold uppercase tracking-widest ${activityColor(activity)}`}
                          >
                            {activityLabel(activity)}
                          </div>
                          <div className="mt-1 text-lg font-semibold leading-snug">
                            {row.challenges?.title ?? "Untitled Challenge"}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-[#FFD28F] text-2xl font-semibold">
                            {money(row.challenges?.amount_cents)}
                          </div>
                          <div className="text-xs text-white/45">to unlock</div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                        <div className="rounded-xl bg-white/5 ring-1 ring-white/10 p-3">
                          <div className="text-xs text-white/45 mb-1">Distance</div>
                          <div className="font-medium">
                            {row.distance_miles_snapshot
                              ? `${row.distance_miles_snapshot} mi`
                              : "—"}
                          </div>
                        </div>
                        <div className="rounded-xl bg-white/5 ring-1 ring-white/10 p-3">
                          <div className="text-xs text-white/45 mb-1">Submitted</div>
                          <div className="font-medium text-xs">{fmtDate(row.submitted_at)}</div>
                        </div>
                        <div className="rounded-xl bg-white/5 ring-1 ring-white/10 p-3">
                          <div className="text-xs text-white/45 mb-1">Claimed</div>
                          <div className="font-medium text-xs">{fmtDate(row.claimed_at)}</div>
                        </div>
                      </div>

                      <div className="text-xs text-white/30 font-mono">
                        claim {row.id.slice(0, 12)}…
                      </div>

                      <div className="pt-2 border-t border-white/10">
                        <AdminVerificationActions id={row.id} />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}

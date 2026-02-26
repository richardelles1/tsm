import { createClient } from "@supabase/supabase-js";
import AdminVerificationActions from "../../../components/AdminVerificationActions";

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
    <div className="p-10 text-white">
      <h1 className="text-2xl font-semibold mb-8">Pending Verifications</h1>

      {rows.length === 0 && (
        <div className="text-white/60">No pending submissions.</div>
      )}

      <div className="grid gap-8">
        {rows.map((row) => (
          <div
            key={row.id}
            className="rounded-2xl bg-white/5 ring-1 ring-white/10 p-6 flex flex-col gap-4"
          >
            <div className="text-sm text-white/70 flex flex-col gap-1">
              <div>
                <span className="text-white/40">Challenge:</span>{" "}
                {row.challenges?.title ?? "Untitled"}
              </div>
<div>
  <span className="text-white/40">Unlock:</span>{" "}
  {row.challenges?.amount_cents
    ? `$${(row.challenges.amount_cents / 100).toFixed(0)}`
    : "—"}
</div>
              <div>
                <span className="text-white/40">Activity:</span>{" "}
                {row.challenges?.activity
  ? row.challenges.activity.charAt(0).toUpperCase() + row.challenges.activity.slice(1)
  : "Unknown"}
              </div>

              <div>
                <span className="text-white/40">Miles:</span>{" "}
{row.distance_miles_snapshot
  ? `${row.distance_miles_snapshot} mi`
  : "—"}              </div>

              <div>
                <span className="text-white/40">Claimed:</span>{" "}
                {row.claimed_at
                  ? new Date(row.claimed_at).toLocaleDateString()
                  : "—"}
              </div>
            </div>

          {row.verification_photo_url && (() => {
  const value = row.verification_photo_url

  const bucket = "claim-verifications"

const path = value.includes(bucket)
  ? value.substring(value.indexOf(bucket) + bucket.length + 1)
  : value

  const { data } = supabase
    .storage
    .from("claim-verifications")
    .getPublicUrl(path)

  return (
    <img
      src={data.publicUrl}
      alt="verification"
      className="rounded-xl ring-1 ring-white/10 max-h-96 object-contain"
    />
  )
})()}
            <div className="flex gap-4">
  <AdminVerificationActions id={row.id} />
</div>
          </div>
        ))}
      </div>
    </div>
  );
}
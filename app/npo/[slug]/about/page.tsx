// OLD
// (create or replace the entire contents of app/npo/[slug]/about/page.tsx)

// NEW
// app/npo/[slug]/about/page.tsx
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";

type Nonprofit = {
  id: string;
  name: string;
  slug: string;
  is_active: boolean | null;

  tagline: string | null;
  mission: string | null;
  description: string | null;
  impact_goal_1: string | null;
  impact_goal_2: string | null;
  impact_goal_3: string | null;

  website_url: string | null;
  logo_url: string | null;
  contact_name: string | null;
  contact_email: string | null;

  accepting_challenges: boolean | null;
  profile_locked: boolean | null;
};

export default async function NonprofitAboutPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const supabase = createSupabaseServerClient();

  const { slug: rawSlug } = await params;
  const slug = rawSlug?.toString()?.trim();
  if (!slug) notFound();

  const { data: nonprofit, error: npErr } = await supabase
    .from("nonprofits")
    .select(
      [
        "id",
        "name",
        "slug",
        "is_active",
        "tagline",
        "mission",
        "description",
        "impact_goal_1",
        "impact_goal_2",
        "impact_goal_3",
        "website_url",
        "logo_url",
        "contact_name",
        "contact_email",
        "accepting_challenges",
        "profile_locked",
      ].join(",")
    )
    .eq("slug", slug)
    .maybeSingle<Nonprofit>();

  if (npErr) throw new Error(npErr.message);
  if (!nonprofit) notFound();

  const goals = [nonprofit.impact_goal_1, nonprofit.impact_goal_2, nonprofit.impact_goal_3].filter(
    (g) => typeof g === "string" && g.trim().length > 0
  ) as string[];

  // --- STYLE (match your portal vibe) ---
  const pageWrap = "p-5 md:p-8 space-y-6 md:space-y-8 text-neutral-100";
  const card =
    "rounded-2xl border border-white/10 bg-white/5 p-4 md:p-5 shadow-[0_0_40px_8px_rgba(255,210,143,0.06)]";
  const muted = "text-sm text-neutral-300/80";
  const help = "text-xs text-neutral-300/70";
  const btn =
    "inline-flex items-center justify-center rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-neutral-100 hover:bg-white/10";
  const pill =
    "inline-flex items-center rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs text-neutral-200";

  const dot = nonprofit.is_active ? "bg-emerald-400" : "bg-neutral-500";

  return (
    <div className={pageWrap}>
      {/* Header */}
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className={`h-2.5 w-2.5 rounded-full ${dot}`} />
            <div>
              <h1 className="text-2xl font-semibold">About</h1>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <span className={pill}>{nonprofit.name}</span>
                {nonprofit.profile_locked ? <span className={pill}>Profile locked</span> : null}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <a href={`/npo/${slug}`} className={btn}>
              ← Home
            </a>
            {nonprofit.website_url ? (
              <a href={nonprofit.website_url} target="_blank" rel="noreferrer" className={btn}>
                Visit website
              </a>
            ) : null}
          </div>
        </div>

        {nonprofit.tagline ? <p className={muted}>{nonprofit.tagline}</p> : null}
      </div>

      {/* Top: identity + mission */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className={`${card} lg:col-span-2`}>
          <div className="text-sm font-medium">Mission</div>
          <p className="mt-3 text-base text-neutral-100/90">
            {nonprofit.mission?.trim()
              ? nonprofit.mission
              : "This foundation’s mission will appear here once set in Settings."}
          </p>

          <div className="mt-5">
            <div className="text-sm font-medium">What we do</div>
            <p className="mt-3 text-sm text-neutral-100/90 leading-relaxed">
              {nonprofit.description?.trim()
                ? nonprofit.description
                : "A short description will appear here once set in Settings."}
            </p>
          </div>
        </div>

        <div className={card}>
          <div className="text-sm font-medium">Contact</div>

          <div className="mt-4 flex items-center gap-3">
            {nonprofit.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={nonprofit.logo_url}
                alt={`${nonprofit.name} logo`}
                className="h-12 w-12 rounded-xl border border-white/10 bg-black/20 object-cover"
              />
            ) : (
              <div className="h-12 w-12 rounded-xl border border-white/10 bg-black/20" />
            )}

            <div className="min-w-0">
              <div className="text-sm font-medium truncate">{nonprofit.name}</div>
              <div className={help}>
                {nonprofit.accepting_challenges ? "Accepting new challenges" : "Not accepting new challenges"}
              </div>
            </div>
          </div>

          <div className="mt-4 space-y-2">
            <div className={help}>
              Contact name: <span className="text-neutral-100/90">{nonprofit.contact_name ?? "—"}</span>
            </div>
            <div className={help}>
              Contact email: <span className="text-neutral-100/90">{nonprofit.contact_email ?? "—"}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Impact goals */}
      <div className={card}>
        <div className="text-sm font-medium">Impact goals</div>
        <p className={help + " mt-2"}>These are used for outward impact reporting.</p>

        {goals.length === 0 ? (
          <div className="mt-4 text-sm text-neutral-100/80">No goals published yet.</div>
        ) : (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
            {goals.map((g) => (
              <div key={g} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <div className="text-sm text-neutral-100/90">{g}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* FAQ (read-only, calm) */}
      <div className={card}>
        <div className="text-sm font-medium">FAQ</div>
        <p className={help + " mt-2"}>Quick clarity on how the portal works.</p>

        <div className="mt-4 space-y-3">
          <details className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <summary className="cursor-pointer select-none text-sm font-medium">
              What does “unlocked” mean?
            </summary>
            <div className="mt-2 text-sm text-neutral-100/90">
              “Unlocked” reflects impact that has been released into the ledger. If it’s not in the ledger, it
              didn’t unlock.
            </div>
          </details>

          <details className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <summary className="cursor-pointer select-none text-sm font-medium">
              What does “owed” mean?
            </summary>
            <div className="mt-2 text-sm text-neutral-100/90">
              “Owed” reflects queued payables that are guaranteed to be paid out (payout rails are being built).
            </div>
          </details>

          <details className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <summary className="cursor-pointer select-none text-sm font-medium">
              How do I update what’s shown here?
            </summary>
            <div className="mt-2 text-sm text-neutral-100/90">
              Update your tagline, mission, description, and goals in <span className="font-mono">Settings</span>.
              This page stays read-only for clarity.
            </div>
          </details>
        </div>
      </div>
    </div>
  );
}

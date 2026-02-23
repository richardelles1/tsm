// OLD
// (replace the entire contents of app/npo/[slug]/settings/page.tsx)

// NEW
// app/npo/[slug]/settings/page.tsx
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";

type Nonprofit = {
  id: string;
  name: string;
  slug: string;
  is_active: boolean | null;

  description: string | null;
  tagline: string | null;
  mission: string | null;
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

export default async function NonprofitSettingsPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ saved?: string; error?: string }>;
}) {
  const supabase = createSupabaseServerClient();

  const { slug: rawSlug } = await params;
  const slug = rawSlug?.toString()?.trim();
  if (!slug) notFound();

  const sp = (await searchParams) ?? {};
  const saved = sp.saved === "1";
  const errored = sp.error === "1";

  const { data: nonprofit, error: npErr } = await supabase
    .from("nonprofits")
    .select(
      [
        "id",
        "name",
        "slug",
        "is_active",
        "description",
        "tagline",
        "mission",
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

  async function saveSettings(formData: FormData) {
    "use server";

    const supabase = createSupabaseServerClient();

    const clean = (v: FormDataEntryValue | null) => {
      const s = typeof v === "string" ? v.trim() : "";
      return s.length ? s : null;
    };

    const asBool = (name: string) => formData.get(name) === "on";

    const nonprofitId = String(formData.get("nonprofit_id") ?? "").trim();
    if (!nonprofitId) redirect(`/npo/${slug}/settings?error=1`);

    const payload = {
      // Published outward (powers /about and the portal vibe)
      description: clean(formData.get("description")),
      tagline: clean(formData.get("tagline")),
      mission: clean(formData.get("mission")),
      impact_goal_1: clean(formData.get("impact_goal_1")),
      impact_goal_2: clean(formData.get("impact_goal_2")),
      impact_goal_3: clean(formData.get("impact_goal_3")),

      // Branding + contact
      website_url: clean(formData.get("website_url")),
      logo_url: clean(formData.get("logo_url")),
      contact_name: clean(formData.get("contact_name")),
      contact_email: clean(formData.get("contact_email")),

      // Portal behavior
      accepting_challenges: asBool("accepting_challenges"),
      profile_locked: asBool("profile_locked"),
    };

    const { error } = await supabase.from("nonprofits").update(payload).eq("id", nonprofitId);

    if (error) redirect(`/npo/${slug}/settings?error=1`);
    redirect(`/npo/${slug}/settings?saved=1`);
  }

  // --- STYLE (match your portal vibe) ---
  const pageWrap = "p-5 md:p-8 space-y-6 md:space-y-8 text-neutral-100";
  const card =
    "rounded-2xl border border-white/10 bg-white/5 p-4 md:p-5 shadow-[0_0_40px_8px_rgba(255,210,143,0.06)]";
  const muted = "text-sm text-neutral-300/80";
  const help = "text-xs text-neutral-300/70";
  const label = "text-xs text-neutral-300/70";
  const input =
    "mt-2 w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-400/60 outline-none focus:border-white/20";
  const textarea =
    "mt-2 w-full min-h-[110px] resize-y rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-400/60 outline-none focus:border-white/20";
  const btn =
    "inline-flex items-center justify-center rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-neutral-100 hover:bg-white/10";
  const primaryBtn =
    "inline-flex items-center justify-center rounded-lg bg-white/10 px-4 py-2 text-sm font-semibold text-neutral-100 hover:bg-white/15 border border-white/15";
  const pill =
    "inline-flex items-center rounded-full border border-white/10 bg-black/20 px-3 py-1 text-xs text-neutral-200";

  const dot = nonprofit.is_active ? "bg-emerald-400" : "bg-neutral-500";

  const checkbox =
    "h-4 w-4 rounded border border-white/20 bg-black/30 text-neutral-100 accent-white/80";

  return (
    <div className={pageWrap}>
      {/* Header */}
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <span className={`h-2.5 w-2.5 rounded-full ${dot}`} />
              <h1 className="text-2xl font-semibold">Settings</h1>
              <span className={pill}>{nonprofit.name}</span>
            </div>
            <p className={muted}>Control what your foundation publishes on the portal.</p>
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

        {saved ? (
          <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3 text-sm">
            Saved. Your portal content is updated.
          </div>
        ) : null}

        {errored ? (
          <div className="rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm">
            Couldn’t save changes. Try again.
          </div>
        ) : null}
      </div>

      <form action={saveSettings} className="space-y-6">
        <input type="hidden" name="nonprofit_id" value={nonprofit.id} />

        {/* Published outward */}
        <div className={card}>
          <div className="text-sm font-medium">Published content</div>
          <p className={help + " mt-2"}>This powers your About page and public-facing portal text.</p>

          <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className={label}>Tagline</div>
              <input
                name="tagline"
                className={input}
                placeholder="Short public tagline"
                defaultValue={nonprofit.tagline ?? ""}
              />
            </div>

            <div>
              <div className={label}>Mission</div>
              <input
                name="mission"
                className={input}
                placeholder="One-sentence mission statement"
                defaultValue={nonprofit.mission ?? ""}
              />
            </div>

            <div className="md:col-span-2">
              <div className={label}>Description</div>
              <textarea
                name="description"
                className={textarea}
                placeholder="A short description of the foundation and what the funds support."
                defaultValue={nonprofit.description ?? ""}
              />
            </div>
          </div>

          <div className="mt-4">
            <div className={label}>Impact goals</div>
            <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
              <input
                name="impact_goal_1"
                className={input}
                placeholder="Impact goal #1"
                defaultValue={nonprofit.impact_goal_1 ?? ""}
              />
              <input
                name="impact_goal_2"
                className={input}
                placeholder="Impact goal #2"
                defaultValue={nonprofit.impact_goal_2 ?? ""}
              />
              <input
                name="impact_goal_3"
                className={input}
                placeholder="Impact goal #3"
                defaultValue={nonprofit.impact_goal_3 ?? ""}
              />
            </div>
          </div>
        </div>

        {/* Branding + contact */}
        <div className={card}>
          <div className="text-sm font-medium">Branding & contact</div>

          <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className={label}>Website URL</div>
              <input
                name="website_url"
                className={input}
                placeholder="https://..."
                defaultValue={nonprofit.website_url ?? ""}
              />
            </div>

            <div>
              <div className={label}>Logo URL</div>
              <input
                name="logo_url"
                className={input}
                placeholder="https://..."
                defaultValue={nonprofit.logo_url ?? ""}
              />
            </div>

            <div>
              <div className={label}>Contact name</div>
              <input
                name="contact_name"
                className={input}
                placeholder="Jane Doe"
                defaultValue={nonprofit.contact_name ?? ""}
              />
            </div>

            <div>
              <div className={label}>Contact email</div>
              <input
                name="contact_email"
                className={input}
                placeholder="name@foundation.org"
                defaultValue={nonprofit.contact_email ?? ""}
              />
            </div>
          </div>
        </div>

        {/* Portal behavior */}
        <div className={card}>
          <div className="text-sm font-medium">Portal behavior</div>
          <p className={help + " mt-2"}>These control how your portal behaves (not payouts).</p>

          <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="rounded-2xl border border-white/10 bg-black/20 p-4 flex items-start gap-3">
              <input
                type="checkbox"
                name="accepting_challenges"
                className={checkbox}
                defaultChecked={Boolean(nonprofit.accepting_challenges)}
              />
              <div>
                <div className="text-sm font-medium">Accepting new challenges</div>
                <div className={help}>If off, you won’t appear as available for new fundraising challenges.</div>
              </div>
            </label>

            <label className="rounded-2xl border border-white/10 bg-black/20 p-4 flex items-start gap-3">
              <input
                type="checkbox"
                name="profile_locked"
                className={checkbox}
                defaultChecked={Boolean(nonprofit.profile_locked)}
              />
              <div>
                <div className="text-sm font-medium">Lock profile</div>
                <div className={help}>If on, settings become effectively “frozen” for consistency.</div>
              </div>
            </label>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <button type="submit" className={primaryBtn}>
            Save changes
          </button>
          <a href={`/npo/${slug}`} className={btn}>
            Cancel
          </a>
        </div>
      </form>
    </div>
  );
}

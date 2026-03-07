"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function OnboardingPage() {
  const router = useRouter();

  const [supabase, setSupabase] = useState<ReturnType<typeof createSupabaseBrowserClient> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [location, setLocation] = useState("");
  const [ageBracket, setAgeBracket] = useState("");

  useEffect(() => {
    setSupabase(createSupabaseBrowserClient({ persistSession: true }));
  }, []);

  useEffect(() => {
    if (!supabase) return;
    enforceAuth();
  }, [supabase]);

  async function enforceAuth() {
    if (!supabase) return;
    const { data } = await supabase.auth.getSession();
    if (!data.session?.user) { router.replace("/authorization"); return; }

    const { data: athlete } = await supabase
      .from("athletes")
      .select("onboarding_completed")
      .eq("id", data.session.user.id)
      .maybeSingle();

    if (athlete?.onboarding_completed) router.replace("/athlete");
  }

  async function handleSubmit() {
    if (!supabase) return;
    if (!displayName.trim()) { setError("Display name is required."); return; }

    setLoading(true);
    setError(null);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.replace("/authorization"); return; }

    if (username.trim()) {
      const { data: existing } = await supabase
        .from("athletes")
        .select("id")
        .eq("username", username.trim())
        .neq("id", user.id)
        .maybeSingle();

      if (existing) { setError("Username already taken."); setLoading(false); return; }
    }

    const { error: upsertError } = await supabase.from("athletes").upsert(
      {
        id: user.id,
        email: user.email ?? null,
        display_name: displayName.trim(),
        username: username.trim() || null,
        location: location.trim() || null,
        age_bracket: ageBracket || null,
        onboarding_completed: true,
      },
      { onConflict: "id" }
    );

    if (upsertError) { setError(upsertError.message); setLoading(false); return; }
    router.push("/athlete");
  }

  if (!supabase) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[#070A12] text-white">
        <div className="h-1 w-24 rounded-full bg-white/10 animate-pulse" />
      </main>
    );
  }

  const inputCls = "w-full rounded-xl bg-black/30 ring-1 ring-white/10 focus:ring-white/30 px-4 py-3 text-sm outline-none placeholder:text-white/30 transition text-white";

  return (
    <main className="min-h-screen bg-[#070A12] text-white flex items-center justify-center px-4 overflow-hidden">
      <div className="pointer-events-none fixed inset-0 opacity-50">
        <div className="absolute -top-40 left-1/2 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_center,rgba(88,140,255,0.14),transparent_65%)] blur-3xl" />
        <div className="absolute bottom-[-300px] right-[-100px] h-[600px] w-[600px] rounded-full bg-[radial-gradient(circle_at_center,rgba(255,210,143,0.10),transparent_65%)] blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm">
        {/* Logo + header */}
        <div className="text-center mb-8">
          <img src="/tsm-logo.jpeg" alt="The Shared Mile" className="h-10 w-auto rounded mx-auto mb-3" />
          <h1 className="text-xl font-semibold">Set up your athlete profile</h1>
          <p className="mt-1 text-xs text-white/35">Just a few details — you can update these anytime.</p>
        </div>

        <div className="rounded-3xl bg-white/5 ring-1 ring-white/10 backdrop-blur-xl p-7 space-y-4">
          {error && (
            <div className="rounded-xl bg-red-500/10 ring-1 ring-red-500/25 px-4 py-3 text-sm text-red-200">
              {error}
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs text-white/40 font-medium uppercase tracking-wider">Display Name *</label>
            <input
              type="text"
              placeholder="How you'll appear on the board"
              className={inputCls}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs text-white/40 font-medium uppercase tracking-wider">Username</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/25 text-sm">@</span>
              <input
                type="text"
                placeholder="optional"
                className={`${inputCls} pl-8`}
                value={username}
                onChange={(e) => setUsername(e.target.value.replace(/\s/g, "").toLowerCase())}
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs text-white/40 font-medium uppercase tracking-wider">Location</label>
            <input
              type="text"
              placeholder="City, State (optional)"
              className={inputCls}
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs text-white/40 font-medium uppercase tracking-wider">Age Bracket</label>
            <select
              className={`${inputCls} appearance-none`}
              value={ageBracket}
              onChange={(e) => setAgeBracket(e.target.value)}
            >
              <option value="">Select (optional)</option>
              <option value="18-24">18–24</option>
              <option value="25-34">25–34</option>
              <option value="35-44">35–44</option>
              <option value="45-54">45–54</option>
              <option value="55+">55+</option>
            </select>
          </div>

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full rounded-full bg-[#FF9B6A] py-3.5 text-sm font-bold text-[#0B0F1C] shadow-[0_8px_24px_rgba(255,155,106,0.20)] hover:bg-[#FFB48E] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-2"
          >
            {loading ? "Saving…" : "Start Moving →"}
          </button>
        </div>
      </div>
    </main>
  );
}

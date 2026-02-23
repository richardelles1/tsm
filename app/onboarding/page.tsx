"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function OnboardingPage() {
  const router = useRouter();

  // ✅ Defer Supabase client until after mount (prevents server crash)
  const [supabase, setSupabase] = useState<
    ReturnType<typeof createSupabaseBrowserClient> | null
  >(null);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase]);

  async function enforceAuth() {
    if (!supabase) return;

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user) {
      router.replace("/authorization");
    }
  }

  async function handleSubmit() {
    if (!supabase) return;

    if (!displayName.trim()) {
      setError("Display name is required.");
      return;
    }

    setLoading(true);
    setError(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.replace("/authorization");
      return;
    }

    // If username provided, ensure uniqueness
    if (username.trim()) {
      const { data: existing } = await supabase
        .from("athletes")
        .select("id")
        .eq("username", username.trim())
        .neq("id", user.id)
        .maybeSingle();

      if (existing) {
        setError("Username already taken.");
        setLoading(false);
        return;
      }
    }

    // ✅ Guarantee: authenticated user becomes an athlete (create or update)
    const { error: upsertError } = await supabase
      .from("athletes")
      .upsert(
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

    if (upsertError) {
      setError(upsertError.message);
      setLoading(false);
      return;
    }

    router.push("/athlete");
  }

  // ✅ safety net while client initializes
  if (!supabase) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[#0b0f1c] text-white px-4">
        Loading…
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#0b0f1c] text-white px-4">
      <div className="w-full max-w-md rounded-2xl bg-white/5 border border-white/10 p-6 space-y-6">
        <h1 className="text-2xl font-semibold text-center">Let’s set you up</h1>

        {error && (
          <div className="rounded-lg bg-red-500/10 border border-red-500/30 p-3 text-sm text-red-300">
            {error}
          </div>
        )}

        <div className="space-y-3">
          <input
            type="text"
            placeholder="Display name"
            className="w-full rounded-lg bg-black/40 border border-white/10 px-4 py-3 outline-none"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
          />

          <input
            type="text"
            placeholder="Username (optional)"
            className="w-full rounded-lg bg-black/40 border border-white/10 px-4 py-3 outline-none"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />

          <input
            type="text"
            placeholder="Location (optional)"
            className="w-full rounded-lg bg-black/40 border border-white/10 px-4 py-3 outline-none"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />

          <select
            className="w-full rounded-lg bg-black/40 border border-white/10 px-4 py-3 outline-none"
            value={ageBracket}
            onChange={(e) => setAgeBracket(e.target.value)}
          >
            <option value="">Age bracket (optional)</option>
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
          className="w-full rounded-full bg-[#FFCC88] text-black font-medium py-3 hover:bg-[#FEC56B] transition"
        >
          {loading ? "Saving…" : "Continue"}
        </button>
      </div>
    </main>
  );
}

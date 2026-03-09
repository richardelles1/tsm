"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type Step = "welcome" | "profile" | "ready";

const STEPS: { icon: string; label: string; desc: string; color: string }[] = [
  { icon: "01", label: "Claim a challenge", desc: "Pick a distance goal that fits your pace", color: "#FF9B6A" },
  { icon: "02", label: "Complete it",        desc: "Run, walk, or ride and submit proof",       color: "#FFD28F" },
  { icon: "03", label: "Unlock funding",     desc: "Real dollars flow to a nonprofit",          color: "#C4EBF2" },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [supabase, setSupabase] = useState<ReturnType<typeof createSupabaseBrowserClient> | null>(null);
  const [step, setStep] = useState<Step>("welcome");
  const [visible, setVisible] = useState(true);

  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedName, setSavedName] = useState("");
  const redirectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setSupabase(createSupabaseBrowserClient({ persistSession: true }));
  }, []);

  useEffect(() => {
    if (!supabase) return;
    enforceAuth();
  }, [supabase]);

  useEffect(() => {
    return () => { if (redirectTimer.current) clearTimeout(redirectTimer.current); };
  }, []);

  async function enforceAuth() {
    if (!supabase) return;
    const { data } = await supabase.auth.getSession();
    if (!data.session?.user) { router.replace("/authorization"); return; }

    const user = data.session.user;

    const { data: athlete } = await supabase
      .from("athletes")
      .select("onboarding_completed")
      .eq("id", user.id)
      .maybeSingle();
    if (athlete?.onboarding_completed) { router.replace("/athlete"); return; }

    const googleName =
      user.user_metadata?.full_name ||
      user.user_metadata?.name ||
      "";
    if (googleName) setDisplayName(googleName);
  }

  function transition(next: Step) {
    setVisible(false);
    setTimeout(() => { setStep(next); setVisible(true); }, 200);
  }

  async function handleProfileSubmit() {
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
        onboarding_completed: true,
      },
      { onConflict: "id" }
    );

    if (upsertError) { setError(upsertError.message); setLoading(false); return; }

    setSavedName(displayName.trim());
    setLoading(false);
    transition("ready");

    redirectTimer.current = setTimeout(() => {
      router.push("/challenges");
    }, 3000);
  }

  const inputCls = "w-full rounded-xl bg-black/30 ring-1 ring-white/10 focus:ring-[#FFD28F]/40 focus:ring-2 px-4 py-3 text-sm outline-none placeholder:text-white/30 transition text-white";

  return (
    <main className="min-h-screen bg-[#070A12] text-white flex items-center justify-center px-4">
      <div
        className="relative w-full max-w-sm transition-opacity duration-200"
        style={{ opacity: visible ? 1 : 0 }}
      >

        {/* ── SCREEN 1: Welcome ── */}
        {step === "welcome" && (
          <div className="space-y-8">
            <div className="text-center space-y-2">
              <img src="/tsm-logo.jpeg" alt="The Shared Mile" className="h-10 w-auto rounded mx-auto mb-4" />
              <h1 className="text-2xl font-semibold tracking-tight">You're in.</h1>
              <p className="text-sm text-white/45">Movement unlocks capital. Here's how it works.</p>
            </div>

            <div className="space-y-3">
              {STEPS.map((s) => (
                <div
                  key={s.icon}
                  className="flex items-center gap-4 rounded-2xl bg-white/5 ring-1 ring-white/8 px-4 py-3.5"
                  style={{ borderTop: `2px solid ${s.color}20` }}
                >
                  <div
                    className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-xs font-black"
                    style={{ backgroundColor: `${s.color}18`, color: s.color }}
                  >
                    {s.icon}
                  </div>
                  <div>
                    <div className="text-sm font-semibold">{s.label}</div>
                    <div className="text-xs text-white/40 mt-0.5">{s.desc}</div>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => transition("profile")}
              className="w-full rounded-full bg-[#FF9B6A] py-3.5 text-sm font-bold text-[#0B0F1C] shadow-[0_8px_24px_rgba(255,155,106,0.20)] hover:bg-[#FFB48E] active:scale-[0.98] transition-all"
            >
              Set up my profile →
            </button>
          </div>
        )}

        {/* ── SCREEN 2: Profile ── */}
        {step === "profile" && (
          <div className="space-y-6">
            <div className="space-y-1">
              <div className="text-[10px] font-bold tracking-[0.22em] text-white/30 uppercase">Step 2 of 2</div>
              <h1 className="text-xl font-semibold tracking-tight">How should we know you?</h1>
              <p className="text-sm text-white/40">Just two things. You can change these anytime.</p>
            </div>

            <div className="rounded-3xl bg-white/5 ring-1 ring-white/10 backdrop-blur-xl p-6 space-y-4">
              {error && (
                <div className="rounded-xl bg-red-500/10 ring-1 ring-red-500/25 px-4 py-3 text-sm text-red-200">
                  {error}
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs text-white/40 font-medium uppercase tracking-wider">Your name on the board *</label>
                <input
                  type="text"
                  placeholder="e.g. Jordan M."
                  className={inputCls}
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  autoFocus
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-white/40 font-medium uppercase tracking-wider">Username <span className="normal-case font-normal">(optional)</span></label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/25 text-sm">@</span>
                  <input
                    type="text"
                    placeholder="yourhandle"
                    className={`${inputCls} pl-8`}
                    value={username}
                    onChange={(e) => setUsername(e.target.value.replace(/\s/g, "").toLowerCase())}
                  />
                </div>
              </div>

              <button
                onClick={handleProfileSubmit}
                disabled={loading}
                className="w-full rounded-full bg-[#FF9B6A] py-3.5 text-sm font-bold text-[#0B0F1C] shadow-[0_8px_24px_rgba(255,155,106,0.20)] hover:bg-[#FFB48E] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-1"
              >
                {loading ? "Saving…" : "Let's go →"}
              </button>
            </div>

            <button
              onClick={() => { setError(null); transition("welcome"); }}
              className="w-full text-xs text-white/30 hover:text-white/60 py-1 transition"
            >
              ← Back
            </button>
          </div>
        )}

        {/* ── SCREEN 3: Ready ── */}
        {step === "ready" && (
          <div className="text-center space-y-8">
            <div className="space-y-2">
              <img src="/tsm-logo.jpeg" alt="The Shared Mile" className="h-10 w-auto rounded mx-auto mb-4" />
              <div className="text-[10px] font-bold tracking-[0.22em] text-[#FF9B6A] uppercase">You're set</div>
              <h1 className="text-2xl font-semibold tracking-tight">
                Welcome, {savedName}.
              </h1>
              <p className="text-sm text-white/45">Your first challenge is waiting.</p>
            </div>

            <div className="rounded-3xl bg-white/5 ring-1 ring-white/10 p-6 space-y-3 text-left">
              {STEPS.map((s) => (
                <div key={s.icon} className="flex items-center gap-3">
                  <div
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: s.color }}
                  />
                  <span className="text-sm text-white/60">{s.label}</span>
                </div>
              ))}
            </div>

            <div className="space-y-3">
              <a
                href="/challenges"
                className="block w-full rounded-full bg-[#FF9B6A] py-3.5 text-sm font-bold text-[#0B0F1C] text-center shadow-[0_8px_24px_rgba(255,155,106,0.20)] hover:bg-[#FFB48E] active:scale-[0.98] transition-all"
              >
                Browse Challenges →
              </a>
              <p className="text-xs text-white/20">Taking you there in a moment…</p>
            </div>
          </div>
        )}

      </div>
    </main>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type AuthMode = "login" | "signup";
type AuthStatus = "idle" | "loading" | "check_email";

export default function AuthorizationPage() {
  const router = useRouter();

  const searchParams = useSearchParams();
  const linkExpired = searchParams.get("error") === "link_expired";

  const [supabase, setSupabase] = useState<ReturnType<typeof createSupabaseBrowserClient> | null>(null);
  const [mode, setMode] = useState<AuthMode>("login");
  const [status, setStatus] = useState<AuthStatus>("idle");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [resent, setResent] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);
  const [forgotLoading, setForgotLoading] = useState(false);

  useEffect(() => {
    setSupabase(createSupabaseBrowserClient({ persistSession: true }));
  }, []);

  useEffect(() => {
    if (!supabase) return;
    handleExistingSession();
  }, [supabase]);

  function withTimeout<T>(promise: Promise<T>, ms: number, label: string) {
    let id: any;
    const t = new Promise<T>((_, reject) => {
      id = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
    });
    return Promise.race([promise, t]).finally(() => clearTimeout(id));
  }

  async function handleExistingSession() {
    if (!supabase) return;
    try {
      setStatus("loading");
      const { data: { session } } = await withTimeout(supabase.auth.getSession(), 15000, "Session check");
      const user = session?.user;
      if (!user) { setStatus("idle"); return; }
      await resolveAndRedirect(user.id);
    } catch {
      router.replace("/athlete");
    }
  }

  async function resolveAndRedirect(userId: string) {
    if (!supabase) return;
    try {
      const { data: adminRow, error: adminErr } = await supabase.from("admin_users").select("user_id").eq("user_id", userId).maybeSingle();
      if (!adminErr && adminRow?.user_id) { router.replace("/admin"); return; }

      const { data: npoMembership, error: npoErr } = await supabase.from("nonprofit_memberships").select("nonprofit_id").eq("user_id", userId).limit(1).maybeSingle();
      if (!npoErr && npoMembership?.nonprofit_id) {
        const { data: nonprofit } = await supabase.from("nonprofits").select("slug").eq("id", npoMembership.nonprofit_id).maybeSingle();
        if (nonprofit?.slug) { router.replace(`/npo/${nonprofit.slug}`); return; }
        router.replace("/npo"); return;
      }

      const { data: pmpMembership, error: pmpErr } = await supabase.from("pmp_memberships").select("pmp_id").eq("user_id", userId).limit(1).maybeSingle();
      if (!pmpErr && pmpMembership?.pmp_id) { router.replace("/pmp"); return; }

      router.replace("/athlete");
    } catch {
      router.replace("/athlete");
    }
  }

  async function handleSubmit() {
    if (!supabase) return;
    setError(null);
    setStatus("loading");

    try {
      if (mode === "signup") {
        const { error } = await withTimeout(
          supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=/onboarding` } }),
          15000, "Signup"
        );
        if (error) { setError(error.message); setStatus("idle"); return; }
        setStatus("check_email");
        return;
      }

      const { data, error } = await withTimeout(supabase.auth.signInWithPassword({ email, password }), 15000, "Login");
      if (error || !data?.user?.id) { setError(error?.message || "Login failed."); setStatus("idle"); return; }
      await resolveAndRedirect(data.user.id);
    } catch (e: any) {
      setError(e?.message || "Auth failed unexpectedly.");
      setStatus("idle");
    }
  }

  async function handleResend() {
    if (!supabase || !email) return;
    await supabase.auth.resend({
      email,
      type: "signup",
      options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=/onboarding` },
    });
    setResent(true);
  }

  async function handleGoogleSignIn() {
    if (!supabase) return;
    setError(null);
    setStatus("loading");
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/onboarding` },
    });
    if (error) { setError(error.message); setStatus("idle"); }
  }

  async function handleForgotPassword() {
    if (!supabase) return;
    if (!email.trim()) { setError("Enter your email address above first."); return; }
    setForgotLoading(true);
    setError(null);
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setForgotLoading(false);
    setForgotSent(true);
  }

  if (!supabase) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[#070A12] text-white">
        <div className="h-1 w-24 rounded-full bg-white/10 animate-pulse" />
      </main>
    );
  }

  const inputCls = "w-full rounded-xl bg-black/30 ring-1 ring-white/10 focus:ring-[#FFD28F]/40 focus:ring-2 px-4 py-3 text-sm outline-none placeholder:text-white/30 transition text-white";

  return (
    <main className="min-h-screen bg-[#070A12] text-white flex items-center justify-center px-4 overflow-hidden">
      <div className="relative w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <img src="/tsm-logo.jpeg" alt="The Shared Mile" className="h-10 w-auto rounded mx-auto mb-3" />
          <div className="text-[10px] font-bold tracking-[0.22em] text-white/30 uppercase">
            {status === "check_email" ? "Confirm your email" : mode === "login" ? "Welcome back" : "Create your account"}
          </div>
        </div>

        <div className="rounded-3xl bg-white/5 ring-1 ring-white/10 backdrop-blur-xl p-7 space-y-5">
          {status === "check_email" ? (
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <svg width="52" height="52" viewBox="0 0 52 52" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="6" y="14" width="40" height="28" rx="4" stroke="#FFD28F" strokeWidth="1.5" fill="none" />
                  <path d="M6 18l20 13 20-13" stroke="#FFD28F" strokeWidth="1.5" strokeLinecap="round" fill="none" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-semibold">Check your inbox.</h2>
                <p className="mt-2 text-sm text-white/55 leading-relaxed">
                  We sent a confirmation link to<br />
                  <span className="text-white font-medium">{email}</span>
                </p>
                <p className="mt-2 text-xs text-white/35">
                  Click the confirmation link — it takes you straight into your profile setup.
                </p>
              </div>
              <div className="space-y-2 pt-2">
                {!resent ? (
                  <button
                    onClick={handleResend}
                    className="w-full rounded-full bg-white/8 py-2.5 text-sm text-white/70 ring-1 ring-white/10 hover:ring-white/20 hover:text-white transition"
                  >
                    Resend confirmation email
                  </button>
                ) : (
                  <p className="text-xs text-[#C4EBF2] text-center">Email resent.</p>
                )}
                <button
                  onClick={() => { setStatus("idle"); setMode("login"); }}
                  className="w-full text-xs text-white/35 hover:text-white/60 py-2 transition"
                >
                  Back to Login
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Signup brand tagline */}
              {mode === "signup" && (
                <p className="text-xs font-medium text-[#C4EBF2] text-center tracking-wide">
                  Join the movement. Your miles move real money.
                </p>
              )}

              {/* Google Sign In */}
              <button
                onClick={handleGoogleSignIn}
                disabled={status === "loading"}
                className="w-full flex items-center justify-center gap-3 rounded-full bg-white/8 ring-1 ring-white/15 hover:ring-white/30 hover:bg-white/12 py-3 text-sm font-medium text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="#4285F4"/>
                  <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853"/>
                  <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z" fill="#FBBC05"/>
                  <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58Z" fill="#EA4335"/>
                </svg>
                Continue with Google
              </button>

              {/* Divider */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-white/10" />
                <span className="text-xs text-white/25">or</span>
                <div className="flex-1 h-px bg-white/10" />
              </div>

              {linkExpired && (
                <div className="rounded-xl bg-[#FFD28F]/10 ring-1 ring-[#FFD28F]/25 px-4 py-3 text-sm text-[#FFD28F]">
                  That confirmation link has expired or already been used. Sign up again to get a new one.
                </div>
              )}

              {error && (
                <div className="rounded-xl bg-red-500/10 ring-1 ring-red-500/25 px-4 py-3 text-sm text-red-200">
                  {error}
                </div>
              )}

              <div className="space-y-3">
                <input
                  type="email"
                  placeholder="Email address"
                  className={inputCls}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                />
                <div className="space-y-1">
                  <input
                    type="password"
                    placeholder="Password"
                    className={inputCls}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                  />
                  {mode === "signup" && (
                    <p className="text-xs text-white/30 px-1">8 characters minimum</p>
                  )}
                </div>
              </div>

              <button
                onClick={handleSubmit}
                disabled={status === "loading"}
                className="w-full rounded-full bg-[#FF9B6A] py-3.5 text-sm font-bold text-[#0B0F1C] shadow-[0_8px_24px_rgba(255,155,106,0.20)] hover:bg-[#FFB48E] hover:shadow-[0_10px_36px_rgba(255,155,106,0.35)] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {status === "loading"
                  ? "Please wait…"
                  : mode === "login"
                  ? "Log In"
                  : "Join The Shared Mile"}
              </button>

              {/* Forgot password — login only */}
              {mode === "login" && (
                <div className="text-center">
                  {forgotSent ? (
                    <p className="text-xs text-[#C4EBF2]">Reset link sent. Check your inbox.</p>
                  ) : (
                    <button
                      onClick={handleForgotPassword}
                      disabled={forgotLoading}
                      className="text-xs text-white/30 hover:text-white/55 transition"
                    >
                      {forgotLoading ? "Sending…" : "Forgot password?"}
                    </button>
                  )}
                </div>
              )}

              <button
                onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError(null); setForgotSent(false); }}
                className="w-full text-xs text-white/40 hover:text-[#FFD28F] py-1 transition"
              >
                {mode === "login" ? "Don't have an account? Sign up" : "Already have an account? Log in"}
              </button>
            </>
          )}
        </div>
      </div>
    </main>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type AuthMode = "login" | "signup";
type AuthStatus = "idle" | "loading" | "check_email";

export default function AuthorizationPage() {
  const router = useRouter();

  // ✅ Defer Supabase client until after mount (prevents server crash)
  const [supabase, setSupabase] = useState<
    ReturnType<typeof createSupabaseBrowserClient> | null
  >(null);

  const [mode, setMode] = useState<AuthMode>("login");
  const [status, setStatus] = useState<AuthStatus>("idle");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSupabase(createSupabaseBrowserClient({ persistSession: true }));
  }, []);

  // Handle already-authenticated users
  useEffect(() => {
    if (!supabase) return;
    handleExistingSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase]);

  function withTimeout<T>(promise: Promise<T>, ms: number, label: string) {
    let timeoutId: any;
    const timeout = new Promise<T>((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(new Error(`${label} timed out after ${ms}ms`));
      }, ms);
    });

    return Promise.race([promise, timeout]).finally(() =>
      clearTimeout(timeoutId)
    );
  }

  async function handleExistingSession() {
    if (!supabase) return;

    try {
      setStatus("loading");

      const {
        data: { session },
      } = await withTimeout(supabase.auth.getSession(), 15000, "Session check");

      const user = session?.user;
      if (!user) {
        setStatus("idle");
        return;
      }

      await resolveAndRedirect(user.id);
    } catch {
      // If anything goes sideways, don’t brick auth. Drop them into athlete.
      router.replace("/athlete");
    }
  }

  async function resolveAndRedirect(userId: string) {
    if (!supabase) return;

    // Precedence (LOCKED): Admin > NPO > PMP > Athlete
    // If reads fail due to RLS/network, default to athlete.
    try {
      // 1) Admin
      const { data: adminRow, error: adminErr } = await supabase
        .from("admin_users")
        .select("user_id")
        .eq("user_id", userId)
        .maybeSingle();

      if (!adminErr && adminRow?.user_id) {
        router.replace("/admin");
        return;
      }

      // 2) NPO membership → org-specific hub (/npo/[slug])
      const { data: npoMembership, error: npoErr } = await supabase
        .from("nonprofit_memberships")
        .select("nonprofit_id")
        .eq("user_id", userId)
        .limit(1)
        .maybeSingle();

      if (!npoErr && npoMembership?.nonprofit_id) {
        const { data: nonprofit, error: nonprofitErr } = await supabase
          .from("nonprofits")
          .select("slug")
          .eq("id", npoMembership.nonprofit_id)
          .maybeSingle();

        if (!nonprofitErr && nonprofit?.slug) {
          router.replace(`/npo/${nonprofit.slug}`);
          return;
        }

        // If we can’t resolve slug, still send them to the NPO hub (safe fallback)
        router.replace("/npo");
        return;
      }

      // 3) PMP membership
      const { data: pmpMembership, error: pmpErr } = await supabase
        .from("pmp_memberships")
        .select("pmp_id")
        .eq("user_id", userId)
        .limit(1)
        .maybeSingle();

      if (!pmpErr && pmpMembership?.pmp_id) {
        router.replace("/pmp");
        return;
      }

      // 4) Default
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
          supabase.auth.signUp({
            email,
            password,
            options: {
              emailRedirectTo: `${window.location.origin}/authorization`,
            },
          }),
          15000,
          "Signup request"
        );

        if (error) {
          setError(error.message);
          setStatus("idle");
          return;
        }

        setStatus("check_email");
        return;
      }

      // LOGIN
      const { data, error } = await withTimeout(
        supabase.auth.signInWithPassword({ email, password }),
        15000,
        "Login request"
      );

      if (error || !data?.user?.id) {
        setError(error?.message || "Login failed.");
        setStatus("idle");
        return;
      }

      // Post-login: role resolve → correct landing
      await resolveAndRedirect(data.user.id);
    } catch (e: any) {
      setError(e?.message || "Auth failed unexpectedly.");
      setStatus("idle");
    }
  }

  // ✅ hard safety net (prevents browser-client crash before mount)
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
        <h1 className="text-2xl font-semibold text-center">
          {mode === "login" ? "Welcome back" : "Create your account"}
        </h1>

        {error && (
          <div className="rounded-lg bg-red-500/10 border border-red-500/30 p-3 text-sm text-red-300">
            {error}
          </div>
        )}

        {status === "check_email" ? (
          <p className="text-sm text-center text-white/70">
            Check your email to confirm your account, then return here to log in.
          </p>
        ) : (
          <>
            <div className="space-y-3">
              <input
                type="email"
                placeholder="Email"
                className="w-full rounded-lg bg-black/40 border border-white/10 px-4 py-3 outline-none"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />

              <input
                type="password"
                placeholder="Password"
                className="w-full rounded-lg bg-black/40 border border-white/10 px-4 py-3 outline-none"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <button
              onClick={handleSubmit}
              disabled={status === "loading"}
              className="w-full rounded-full bg-[#FFCC88] text-black font-medium py-3 hover:bg-[#FEC56B] transition"
            >
              {status === "loading"
                ? "Please wait…"
                : mode === "login"
                ? "Login"
                : "Create account"}
            </button>

            <button
              onClick={() => setMode(mode === "login" ? "signup" : "login")}
              className="text-sm underline text-center w-full text-white/70"
            >
              {mode === "login"
                ? "Create an account"
                : "Already have an account? Login"}
            </button>
          </>
        )}
      </div>
    </main>
  );
}

"use client";

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { EmailOtpType } from "@supabase/supabase-js";

function CallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const tokenHash = searchParams.get("token_hash");
    const type = searchParams.get("type") as EmailOtpType | null;
    const code = searchParams.get("code");
    const next = searchParams.get("next") ?? "/onboarding";

    const supabase = createSupabaseBrowserClient();

    async function verify() {
      try {
        if (tokenHash && type) {
          const { error } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type,
          });
          if (error) throw error;
        } else if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
        } else {
          throw new Error("No token_hash or code provided");
        }
        router.replace(next);
      } catch {
        router.replace("/authorization?error=link_expired");
      }
    }

    verify();
  }, []);

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#070A12]">
      <div className="h-1 w-24 rounded-full bg-white/10 animate-pulse" />
    </main>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen flex items-center justify-center bg-[#070A12]">
          <div className="h-1 w-24 rounded-full bg-white/10 animate-pulse" />
        </main>
      }
    >
      <CallbackContent />
    </Suspense>
  );
}

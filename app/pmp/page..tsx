// OLD
// (assumed blank)

// NEW
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function PmpBeaconPage() {
  const router = useRouter();
  const supabase = createSupabaseBrowserClient({ persistSession: true });

  const [message, setMessage] = useState<string>("Checking access…");

  useEffect(() => {
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function run() {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    const user = session?.user;
    if (!user) {
      router.replace("/authorization");
      return;
    }

    try {
      const { data: membership, error: memErr } = await supabase
        .from("pmp_memberships")
        .select("pmp_id")
        .eq("user_id", user.id)
        .limit(1)
        .maybeSingle();

      if (memErr || !membership?.pmp_id) {
        setMessage("You don’t have PMP access on this account.");
        return;
      }

      // PMP landing can evolve later. For now: you’re in, and this is the hub.
      setMessage("PMP access confirmed. (Dashboard coming next.)");
    } catch {
      setMessage("Couldn’t verify PMP access right now. Try again in a moment.");
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#0b0f1c] text-white px-4">
      <div className="w-full max-w-md rounded-2xl bg-white/5 border border-white/10 p-6 space-y-4">
        <h1 className="text-xl font-semibold text-center">PMP Hub</h1>
        <p className="text-sm text-center text-white/70">{message}</p>

        <div className="flex gap-3">
          <button
            onClick={() => router.replace("/athlete")}
            className="flex-1 rounded-full bg-white/10 border border-white/15 py-3 text-sm hover:bg-white/15 transition"
          >
            Back to Athlete
          </button>
          <button
            onClick={() => run()}
            className="flex-1 rounded-full bg-[#FFCC88] text-black font-medium py-3 text-sm hover:bg-[#FEC56B] transition"
          >
            Retry
          </button>
        </div>
      </div>
    </main>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function NpoBeaconPage() {
  const router = useRouter();

  const [message, setMessage] = useState<string>("Checking access…");

  useEffect(() => {
    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function run() {
  const supabase = createSupabaseBrowserClient({ persistSession: true });

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
        .from("nonprofit_memberships")
        .select("nonprofit_id")
        .eq("user_id", user.id)
        .limit(1)
        .maybeSingle();

      if (memErr || !membership?.nonprofit_id) {
        setMessage("You don’t have nonprofit access on this account.");
        return;
      }

      const { data: nonprofit, error: npErr } = await supabase
        .from("nonprofits")
        .select("slug")
        .eq("id", membership.nonprofit_id)
        .maybeSingle();

      if (npErr || !nonprofit?.slug) {
        setMessage("Nonprofit found, but we couldn’t resolve the organization hub.");
        return;
      }

      router.replace(`/npo/${nonprofit.slug}`);
    } catch {
      setMessage("Couldn’t verify nonprofit access right now. Try again in a moment.");
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#0b0f1c] text-white px-4">
      <div className="w-full max-w-md rounded-2xl bg-white/5 border border-white/10 p-6 space-y-4">
        <h1 className="text-xl font-semibold text-center">Nonprofit Hub</h1>
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

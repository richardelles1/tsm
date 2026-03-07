"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminVerificationActions({ id }: { id: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState<"approve" | "reject" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handle(action: "approve" | "reject") {
    setLoading(action);
    setError(null);

    const res = await fetch("/api/admin/verifications/update", {
      method: "POST",
      body: new URLSearchParams({ id, action }),
    });

    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      setError(json?.error ?? "Something went wrong.");
      setLoading(null);
      return;
    }

    router.refresh();
  }

  return (
    <div className="flex flex-col gap-3">
      {error && (
        <div className="rounded-xl bg-red-500/10 ring-1 ring-red-500/30 px-4 py-2 text-sm text-red-200">
          {error}
        </div>
      )}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => handle("approve")}
          disabled={!!loading}
          className="flex-1 rounded-full bg-[#FF9B6A] px-5 py-2.5 text-sm font-medium text-[#0B0F1C] hover:bg-[#FFB48E] shadow-[0_8px_24px_rgba(255,155,106,0.25)] hover:shadow-[0_8px_32px_rgba(255,155,106,0.40)] transition disabled:opacity-60"
        >
          {loading === "approve" ? "Approving…" : "Approve"}
        </button>
        <button
          type="button"
          onClick={() => handle("reject")}
          disabled={!!loading}
          className="flex-1 rounded-full bg-white/5 px-5 py-2.5 text-sm ring-1 ring-red-500/30 text-red-300 hover:bg-red-500/10 hover:ring-red-500/50 transition disabled:opacity-60"
        >
          {loading === "reject" ? "Rejecting…" : "Reject"}
        </button>
      </div>
    </div>
  );
}

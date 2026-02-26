"use client";

import { useRouter } from "next/navigation";

export default function AdminVerificationActions({ id }: { id: string }) {
  const router = useRouter();

  async function handle(action: "approve" | "reject") {
    await fetch("/api/admin/verifications/update", {
      method: "POST",
      body: new URLSearchParams({ id, action }),
    });

    router.refresh();
  }

  return (
    <div className="flex gap-4">
      <button
        onClick={() => handle("approve")}
        className="px-4 py-2 rounded-lg bg-green-500/20 ring-1 ring-green-500/40 text-green-200"
      >
        Approve
      </button>

      <button
        onClick={() => handle("reject")}
        className="px-4 py-2 rounded-lg bg-red-500/20 ring-1 ring-red-500/40 text-red-200"
      >
        Reject
      </button>
    </div>
  );
}
"use client";

import { useState } from "react";

export default function NpoDonorLinkCard({ slug }: { slug: string }) {
  const donorLink = `https://thesharedmile.com/give?npo=${slug}`;
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard.writeText(donorLink).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="rounded-2xl border border-[#FFD28F]/15 bg-[#FFD28F]/5 p-4 md:p-5 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-xs font-semibold text-[#FFD28F] uppercase tracking-wider mb-1">
            Your Donor Link
          </div>
          <p className="text-xs text-neutral-300/70 leading-relaxed">
            Share this with your community. Donations go directly to your fund, no filtering required.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex-1 min-w-0 rounded-xl bg-black/30 ring-1 ring-white/10 px-3 py-2.5">
          <p className="text-xs text-white/60 font-mono truncate">{donorLink}</p>
        </div>
        <button
          onClick={copy}
          className={`shrink-0 rounded-xl px-4 py-2.5 text-xs font-semibold transition-all ring-1 ${
            copied
              ? "bg-emerald-500/15 text-emerald-300 ring-emerald-500/25"
              : "bg-[#FFD28F]/10 text-[#FFD28F] ring-[#FFD28F]/20 hover:bg-[#FFD28F]/20"
          }`}
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
    </div>
  );
}

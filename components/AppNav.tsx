"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function AppNav() {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith("/admin");

  const [open, setOpen] = useState(false);
  const [hasActiveClaim, setHasActiveClaim] = useState(false);
  const [authed, setAuthed] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient({ persistSession: true });
    let cancelled = false;

    async function check() {
      const { data: { user } } = await supabase.auth.getUser();
      if (cancelled || !user) return;
      setAuthed(true);

      const { data } = await supabase
        .from("claims")
        .select("id")
        .eq("athlete_id", user.id)
        .eq("status", "claimed")
        .limit(1)
        .maybeSingle();

      if (!cancelled) setHasActiveClaim(!!data);
    }

    check();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  useEffect(() => { setOpen(false); }, [pathname]);

  const activeLink = "text-[#FFD28F]";
  const normalLink = "text-white/60 hover:text-white transition";

  function isActive(href: string) {
    return pathname === href || pathname?.startsWith(href + "/");
  }

  if (isAdmin) {
    return (
      <nav className="sticky top-0 z-50 bg-[#070A12]/95 backdrop-blur-xl border-b border-white/8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <img src="/tsm-logo.jpeg" alt="TSM" className="h-6 w-auto rounded" />
          </Link>
          <Link href="/admin" className="text-xs text-white/40 hover:text-white/70 transition">
            ← Dashboard
          </Link>
        </div>
      </nav>
    );
  }

  const athleteLinks = (
    <>
      <Link href="/challenges" className={isActive("/challenges") ? activeLink : normalLink} onClick={() => setOpen(false)}>
        Challenges
      </Link>
      {authed && hasActiveClaim && (
        <Link href="/activechallenge" className={`flex items-center gap-1.5 ${isActive("/activechallenge") ? activeLink : normalLink}`} onClick={() => setOpen(false)}>
          <span className="h-1.5 w-1.5 rounded-full bg-[#FF9B6A] animate-pulse" />
          Active
        </Link>
      )}
      {authed && (
        <Link href="/athlete" className={isActive("/athlete") ? activeLink : normalLink} onClick={() => setOpen(false)}>
          My Impact
        </Link>
      )}
      <Link href="/give" className={isActive("/give") ? activeLink : normalLink} onClick={() => setOpen(false)}>
        Give
      </Link>
      {!authed && (
        <Link href="/authorization" className={isActive("/authorization") ? activeLink : normalLink} onClick={() => setOpen(false)}>
          Log In
        </Link>
      )}
    </>
  );

  return (
    <nav className="sticky top-0 z-50 bg-[#070A12]/95 backdrop-blur-xl border-b border-white/8" ref={menuRef}>
      <div className="mx-auto max-w-5xl px-4 sm:px-6 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <img src="/tsm-logo.jpeg" alt="The Shared Mile" className="h-7 w-auto rounded" />
        </Link>

        {/* Desktop links */}
        <div className="hidden sm:flex items-center gap-6 text-sm font-medium">
          {athleteLinks}
        </div>

        {/* Mobile hamburger */}
        <button
          className="sm:hidden flex flex-col gap-[5px] p-2 text-white/50 hover:text-white/80 transition"
          onClick={() => setOpen((v) => !v)}
          aria-label="Menu"
        >
          <span className={`block h-[2px] w-5 bg-current transition-all ${open ? "rotate-45 translate-y-[7px]" : ""}`} />
          <span className={`block h-[2px] w-5 bg-current transition-all ${open ? "opacity-0" : ""}`} />
          <span className={`block h-[2px] w-5 bg-current transition-all ${open ? "-rotate-45 -translate-y-[7px]" : ""}`} />
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="sm:hidden absolute left-0 right-0 top-14 bg-[#0B0F1C]/98 backdrop-blur-2xl border-b border-white/10 py-4 px-6 flex flex-col gap-4 text-sm font-medium shadow-xl">
          {athleteLinks}
        </div>
      )}
    </nav>
  );
}

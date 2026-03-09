import { redirect } from "next/navigation";
import { createSupabaseAuthServerClient } from "@/lib/supabase/serverWithAuth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function NpoSlugLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const authClient = await createSupabaseAuthServerClient();
  const {
    data: { user },
  } = await authClient.auth.getUser();

  if (!user) {
    redirect("/authorization");
  }

  const supabase = createSupabaseServerClient();

  const { data: nonprofit } = await supabase
    .from("nonprofits")
    .select("id,name")
    .eq("slug", slug)
    .maybeSingle();

  if (!nonprofit) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[#070A12] text-white px-4">
        <div className="w-full max-w-md rounded-2xl bg-white/5 border border-white/10 p-6 space-y-3 text-center">
          <div className="text-lg font-semibold">Not Found</div>
          <p className="text-sm text-white/60">This nonprofit portal does not exist.</p>
          <a
            href="/athlete"
            className="inline-block mt-2 rounded-full bg-white/10 border border-white/15 px-5 py-2.5 text-sm hover:bg-white/15 transition"
          >
            Back to Athlete
          </a>
        </div>
      </main>
    );
  }

  const { data: membership } = await supabase
    .from("nonprofit_memberships")
    .select("id")
    .eq("user_id", user.id)
    .eq("nonprofit_id", nonprofit.id)
    .maybeSingle();

  if (!membership) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[#070A12] text-white px-4">
        <div className="w-full max-w-md rounded-2xl bg-white/5 border border-white/10 p-6 space-y-3 text-center">
          <div className="text-lg font-semibold">Access Denied</div>
          <p className="text-sm text-white/60">
            Your account is not linked to <span className="text-white/90 font-medium">{nonprofit.name}</span>.
            If you believe this is an error, contact your Oriva account manager.
          </p>
          <div className="flex gap-3 justify-center pt-1">
            <a
              href="/npo"
              className="rounded-full bg-white/10 border border-white/15 px-5 py-2.5 text-sm hover:bg-white/15 transition"
            >
              Try again
            </a>
            <a
              href="/athlete"
              className="rounded-full bg-white/10 border border-white/15 px-5 py-2.5 text-sm hover:bg-white/15 transition"
            >
              Athlete home
            </a>
          </div>
        </div>
      </main>
    );
  }

  return <>{children}</>;
}

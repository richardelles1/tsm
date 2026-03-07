"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function markPayablesPaid(
  payableIds: string[],
  provider: string,
  providerRef: string
): Promise<{ success: boolean; error?: string }> {
  if (!payableIds.length) return { success: false, error: "No payable IDs provided." };

  const supabase = createSupabaseServerClient();

  const { error } = await supabase
    .from("payables")
    .update({
      status: "paid",
      paid_at: new Date().toISOString(),
      provider: provider.trim() || null,
      provider_ref: providerRef.trim() || null,
    })
    .in("id", payableIds);

  if (error) return { success: false, error: error.message };

  revalidatePath("/admin/payables");
  return { success: true };
}

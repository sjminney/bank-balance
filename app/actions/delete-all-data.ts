"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/**
 * Permanently deletes all data for the current user:
 * - All monthly balances
 * - All monthly income
 * - All bank accounts
 * No backups. Cannot be undone.
 */
export async function deleteAllUserData(): Promise<{ error?: string }> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { error: "You must be logged in" };
    }

    const userId = user.id;

    // Order: balances first (reference bank_accounts), then incomes, then bank_accounts
    const { error: balancesError } = await supabase
      .from("monthly_balances")
      .delete()
      .eq("user_id", userId);

    if (balancesError) {
      console.error("Error deleting balances:", balancesError);
      return { error: balancesError.message };
    }

    const { error: incomesError } = await supabase
      .from("monthly_incomes")
      .delete()
      .eq("user_id", userId);

    if (incomesError) {
      console.error("Error deleting incomes:", incomesError);
      return { error: incomesError.message };
    }

    const { error: accountsError } = await supabase
      .from("bank_accounts")
      .delete()
      .eq("user_id", userId);

    if (accountsError) {
      console.error("Error deleting bank accounts:", accountsError);
      return { error: accountsError.message };
    }

    revalidatePath("/dashboard");
    revalidatePath("/settings");
    return {};
  } catch (err) {
    console.error("deleteAllUserData error:", err);
    return {
      error: err instanceof Error ? err.message : "Failed to delete all data",
    };
  }
}

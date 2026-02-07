"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function addMonthlyBalance(formData: FormData) {
  try {
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { error: "You must be logged in to add a balance" };
    }

    const bankAccountIdRaw = formData.get("bank_account_id") as string | null;
    const bankAccountId = bankAccountIdRaw && bankAccountIdRaw.trim() !== "" ? bankAccountIdRaw.trim() : null;
    const monthYear = formData.get("month_year") as string;
    const balanceRaw = formData.get("balance") as string;
    const interestRaw = formData.get("interest_earned") as string | null;
    const oneOffRaw = formData.get("one_off_deposit") as string | null;
    const notes = (formData.get("notes") as string)?.trim() || null;

    const interestEarned = interestRaw != null && interestRaw !== "" ? parseFloat(interestRaw) : 0;
    if (isNaN(interestEarned) || interestEarned < 0) {
      return { error: "Interest earned must be a valid number" };
    }

    const oneOffDeposit = oneOffRaw != null && oneOffRaw !== "" ? parseFloat(oneOffRaw) : 0;
    if (isNaN(oneOffDeposit) || oneOffDeposit < 0) {
      return { error: "One-off deposit must be a valid number" };
    }

    if (!monthYear || balanceRaw == null || balanceRaw.trim() === "") {
      return { error: "Month and balance are required" };
    }

    const balanceNum = parseFloat(balanceRaw);
    if (isNaN(balanceNum) || balanceNum < 0) {
      return { error: "Balance must be a valid number" };
    }

    // If bank_account_id is provided, verify it belongs to the user
    if (bankAccountId) {
      const { data: account, error: accountError } = await supabase
        .from("bank_accounts")
        .select("id")
        .eq("id", bankAccountId)
        .eq("user_id", user.id)
        .single();

      if (accountError || !account) {
        return { error: "Invalid bank account selected" };
      }
    }

    // Convert month input (YYYY-MM) to date (first day of month)
    // Ensure we have a valid date format
    const dateStr = monthYear.includes("-01") ? monthYear : `${monthYear}-01`;
    const date = new Date(dateStr);
    
    if (isNaN(date.getTime())) {
      return { error: "Invalid date format" };
    }

    // Insert or update the balance
    // Check if a balance already exists for this user, month, and account
    const monthYearStr = date.toISOString().split("T")[0];
    
    let query = supabase
      .from("monthly_balances")
      .select("id")
      .eq("user_id", user.id)
      .eq("month_year", monthYearStr);
    
    if (bankAccountId) {
      query = query.eq("bank_account_id", bankAccountId);
    } else {
      query = query.is("bank_account_id", null);
    }
    
    const { data: existing, error: checkError } = await query.maybeSingle();

    let error;
    if (existing) {
      // Update existing record
      const { error: updateError } = await supabase
        .from("monthly_balances")
        .update({
          balance: balanceNum,
          interest_earned: interestEarned,
          notes,
        })
        .eq("id", existing.id);
      error = updateError;
    } else {
      // Insert new record
      const { error: insertError } = await supabase
        .from("monthly_balances")
        .insert({
          user_id: user.id,
          bank_account_id: bankAccountId,
          month_year: monthYearStr,
          balance: balanceNum,
          interest_earned: interestEarned,
          one_off_deposit: oneOffDeposit,
          notes,
        });
      error = insertError;
    }

    if (error) {
      console.error("Error adding balance:", error);
      const msg = error.message || "Database error";
      if (msg.includes("interest_earned") || msg.includes("one_off_deposit") || msg.includes("column")) {
        return { error: `${msg} Run migrations 006 and 007 in Supabase if you haven’t.` };
      }
      return { error: msg };
    }

    revalidatePath("/dashboard");
    return { success: true };
  } catch (error) {
    console.error("Unexpected error adding balance:", error);
    const message = error instanceof Error ? error.message : String(error);
    return { error: message || "Failed to add balance" };
  }
}

export async function deleteMonthlyBalance(id: string) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { error: "You must be logged in to delete a balance" };
    }

    const { error } = await supabase
      .from("monthly_balances")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      console.error("Error deleting balance:", error);
      return { error: error.message };
    }

    revalidatePath("/dashboard");
    return { success: true };
  } catch (error) {
    console.error("Unexpected error:", error);
    return {
      error: error instanceof Error ? error.message : "Failed to delete balance",
    };
  }
}

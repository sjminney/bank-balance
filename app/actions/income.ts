"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function upsertMonthlyIncome(formData: FormData) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { error: "You must be logged in to add income" };
    }

    const monthYear = formData.get("month_year") as string;
    const amountRaw = formData.get("income_amount") as string | null;
    const notes = (formData.get("income_notes") as string) || null;

    if (!monthYear) {
      return { error: "Month is required" };
    }

    const dateStr = monthYear.includes("-01") ? monthYear : `${monthYear}-01`;
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) {
      return { error: "Invalid date format" };
    }

    const amount = amountRaw != null && amountRaw !== "" ? parseFloat(amountRaw) : 0;
    if (isNaN(amount) || amount < 0) {
      return { error: "Income amount must be a valid number" };
    }

    const monthYearStr = date.toISOString().split("T")[0];

    const { error } = await supabase
      .from("monthly_incomes")
      .upsert(
        {
          user_id: user.id,
          month_year: monthYearStr,
          amount,
          notes,
        },
        { onConflict: "user_id,month_year" }
      );

    if (error) {
      console.error("Error upserting income:", error);
      return { error: error.message };
    }

    revalidatePath("/dashboard");
    return { success: true };
  } catch (error) {
    console.error("Unexpected error:", error);
    return {
      error: error instanceof Error ? error.message : "Failed to save income",
    };
  }
}

export async function deleteMonthlyIncome(id: string) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { error: "You must be logged in to delete income" };
    }

    const { error } = await supabase
      .from("monthly_incomes")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      console.error("Error deleting income:", error);
      return { error: error.message };
    }

    revalidatePath("/dashboard");
    return { success: true };
  } catch (error) {
    console.error("Unexpected error:", error);
    return {
      error: error instanceof Error ? error.message : "Failed to delete income",
    };
  }
}

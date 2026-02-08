"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const ALLOWED_ACCOUNT_TYPES = ["transactions", "expenses", "savings", "emergency", "fun"] as const;
const ALLOWED_CURRENCIES = ["AUD", "USD", "EUR", "GBP", "NZD"] as const;

function validateAccountType(v: string): string {
  return ALLOWED_ACCOUNT_TYPES.includes(v as (typeof ALLOWED_ACCOUNT_TYPES)[number]) ? v : "transactions";
}

function validateCurrency(v: string): string {
  return ALLOWED_CURRENCIES.includes(v as (typeof ALLOWED_CURRENCIES)[number]) ? v : "AUD";
}

export async function addBankAccount(formData: FormData) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { error: "You must be logged in to add a bank account" };
    }

    const name = (formData.get("name") as string)?.trim();
    const bankName = (formData.get("bank_name") as string)?.trim() || null;
    const accountType = validateAccountType((formData.get("account_type") as string) || "transactions");
    const accountNumberLast4 = (formData.get("account_number_last4") as string)?.trim() || null;
    const currency = validateCurrency((formData.get("currency") as string) || "AUD");
    const color = formData.get("color") as string | null;
    const notes = formData.get("notes") as string | null;

    if (!name || !accountType) {
      return { error: "Account name and type are required" };
    }

    const { data, error } = await supabase
      .from("bank_accounts")
      .insert({
        user_id: user.id,
        name,
        bank_name: bankName || null,
        account_type: accountType,
        account_number_last4: accountNumberLast4 || null,
        currency,
        color: color || null,
        notes: notes || null,
        is_active: true,
      })
      .select("id")
      .single();

    if (error) {
      console.error("Error adding bank account:", error);
      return { error: error.message };
    }

    revalidatePath("/settings");
    return { success: true, id: data?.id };
  } catch (error) {
    console.error("Unexpected error:", error);
    return {
      error: error instanceof Error ? error.message : "Failed to add bank account",
    };
  }
}

export async function updateBankAccount(id: string, formData: FormData) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { error: "You must be logged in to update a bank account" };
    }

    const name = (formData.get("name") as string)?.trim();
    const bankName = (formData.get("bank_name") as string)?.trim() || null;
    const accountType = validateAccountType((formData.get("account_type") as string) || "transactions");
    const accountNumberLast4 = (formData.get("account_number_last4") as string)?.trim() || null;
    const currency = validateCurrency((formData.get("currency") as string) || "AUD");
    const color = (formData.get("color") as string)?.trim() || null;
    const notes = (formData.get("notes") as string)?.trim() || null;
    const isActive = formData.get("is_active") === "true";

    if (!name) {
      return { error: "Account name is required" };
    }

    const { error } = await supabase
      .from("bank_accounts")
      .update({
        name,
        bank_name: bankName || null,
        account_type: accountType,
        account_number_last4: accountNumberLast4 || null,
        currency,
        color: color || null,
        notes: notes || null,
        is_active: isActive,
      })
      .eq("id", id)
      .eq("user_id", user.id); // Ensure user owns this account

    if (error) {
      console.error("Error updating bank account:", error);
      return { error: error.message };
    }

    revalidatePath("/settings");
    return { success: true };
  } catch (error) {
    console.error("Unexpected error:", error);
    return {
      error: error instanceof Error ? error.message : "Failed to update bank account",
    };
  }
}

export async function deleteBankAccount(id: string) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { error: "You must be logged in to delete a bank account" };
    }

    const { error } = await supabase
      .from("bank_accounts")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id); // Ensure user owns this account

    if (error) {
      console.error("Error deleting bank account:", error);
      return { error: error.message };
    }

    revalidatePath("/settings");
    return { success: true };
  } catch (error) {
    console.error("Unexpected error:", error);
    return {
      error: error instanceof Error ? error.message : "Failed to delete bank account",
    };
  }
}

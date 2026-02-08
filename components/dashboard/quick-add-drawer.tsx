"use client";

import { useState, useEffect, useCallback } from "react";
import { Drawer } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Calendar, DollarSign, FileText, Loader2, Wallet, Plus, X } from "lucide-react";
import { addMonthlyBalance } from "@/app/actions/balances";
import { addBankAccount } from "@/app/actions/bank-accounts";
import { createClient } from "@/lib/supabase/client";

const ADD_NEW_ACCOUNT_VALUE = "__add_new__";

const ACCOUNT_TYPES = [
  { value: "transactions", label: "Transactions" },
  { value: "expenses", label: "Spend" },
  { value: "savings", label: "Savings" },
  { value: "emergency", label: "Emergency" },
  { value: "fun", label: "Fun" },
];

const ACCOUNT_COLORS = ["#38bdf8", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#06b6d4", "#84cc16"];

interface BankAccount {
  id: string;
  name: string;
  bank_name: string | null;
  account_type: string;
  color: string | null;
  created_at?: string;
}

export interface MonthlyBalanceForEdit {
  id: string;
  bank_account_id: string | null;
  month_year: string;
  balance: number;
  interest_earned?: number;
  one_off_deposit?: number;
  notes: string | null;
}

interface QuickAddDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  initialBalance?: MonthlyBalanceForEdit | null;
}

export function QuickAddDrawer({ open, onOpenChange, onSuccess, initialBalance }: QuickAddDrawerProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const [showAddAccountForm, setShowAddAccountForm] = useState(false);
  const [isAddingAccount, setIsAddingAccount] = useState(false);
  const [addAccountError, setAddAccountError] = useState<string | null>(null);
  const supabase = createClient();

  const fetchBankAccounts = useCallback(async () => {
    setIsLoadingAccounts(true);
    try {
      const { data, error } = await supabase
        .from("bank_accounts")
        .select("id, name, bank_name, account_type, color, created_at")
        .eq("is_active", true)
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Error fetching accounts:", error);
        setBankAccounts([]);
      } else {
        setBankAccounts(data || []);
      }
    } catch (error) {
      console.error("Error:", error);
      setBankAccounts([]);
    } finally {
      setIsLoadingAccounts(false);
    }
  }, [supabase]);

  useEffect(() => {
    if (open) {
      fetchBankAccounts();
      setAddAccountError(null);
      setShowAddAccountForm(false);
    }
  }, [open, fetchBankAccounts]);

  // Sync selected account when accounts load or when current selection is no longer valid
  const defaultAccountId =
    initialBalance?.bank_account_id ??
    bankAccounts.find((a) => a.account_type === "savings")?.id ??
    bankAccounts[0]?.id ??
    "";
  useEffect(() => {
    if (!open || !bankAccounts.length) return;
    setSelectedAccountId((prev) => {
      if (initialBalance) return initialBalance.bank_account_id ?? "";
      if (prev === ADD_NEW_ACCOUNT_VALUE) return prev; // keep "add new" while inline form is shown
      if (prev === "" || !bankAccounts.some((a) => a.id === prev)) return defaultAccountId;
      return prev;
    });
  }, [open, bankAccounts.length, initialBalance?.bank_account_id, defaultAccountId]);

  async function handleAddAccountSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setAddAccountError(null);
    setIsAddingAccount(true);
    const formData = new FormData(e.currentTarget);
    try {
      const result = await addBankAccount(formData);
      if (result?.error) {
        setAddAccountError(result.error);
        return;
      }
      const newId = result && "id" in result ? (result as { id: string }).id : null;
      if (newId) {
        await fetchBankAccounts();
        setSelectedAccountId(newId);
        setShowAddAccountForm(false);
      }
    } catch (err) {
      setAddAccountError(err instanceof Error ? err.message : "Failed to add account");
    } finally {
      setIsAddingAccount(false);
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (selectedAccountId === "" || selectedAccountId === ADD_NEW_ACCOUNT_VALUE) return;
    const form = e.currentTarget;
    setIsSubmitting(true);
    setError(null);

    const formData = new FormData(form);
    formData.set("bank_account_id", selectedAccountId);

    try {
      const result = await addMonthlyBalance(formData);

      const errorMessage = result && "error" in result ? (result as { error: string }).error : null;
      if (errorMessage) {
        setError(typeof errorMessage === "string" ? errorMessage : String(errorMessage));
        setIsSubmitting(false);
        return;
      }

      onOpenChange(false);
      if (!initialBalance && form) form.reset();
      onSuccess();
    } catch (err) {
      console.error("Add balance error:", err);
      const message = err instanceof Error ? err.message : typeof err === "string" ? err : "An unexpected error occurred. Check the browser console for details.";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  const today = new Date();
  const currentMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
  const monthValue = initialBalance?.month_year?.slice(0, 7) ?? currentMonth;
  const isEdit = Boolean(initialBalance);

  return (
    <Drawer open={open} onOpenChange={onOpenChange} title={isEdit ? "Edit balance" : "Add Monthly Balance"}>
      <form key={initialBalance?.id ?? "new"} onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {/* Bank Account */}
        {bankAccounts.length > 0 && !showAddAccountForm && (
          <div className="space-y-2">
            <label htmlFor="bank_account_id" className="text-sm font-medium text-white flex items-center gap-2">
              <Wallet className="w-4 h-4" strokeWidth={1.5} />
              Bank Account *
            </label>
            <select
              id="bank_account_id"
              value={selectedAccountId === ADD_NEW_ACCOUNT_VALUE ? "" : selectedAccountId}
              onChange={(e) => {
                const v = e.target.value;
                if (v === ADD_NEW_ACCOUNT_VALUE) {
                  setSelectedAccountId(ADD_NEW_ACCOUNT_VALUE);
                  setShowAddAccountForm(true);
                  setAddAccountError(null);
                } else {
                  setSelectedAccountId(v);
                }
              }}
              required={!showAddAccountForm}
              className="w-full px-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-white/20 transition-all [color-scheme:dark]"
              style={{ colorScheme: "dark" }}
            >
              <option value="" style={{ backgroundColor: "#09090b", color: "#ffffff" }}>Select an account</option>
              {bankAccounts.map((account) => (
                <option
                  key={account.id}
                  value={account.id}
                  style={{ backgroundColor: "#09090b", color: "#ffffff" }}
                >
                  {account.name} {account.bank_name ? ` (${account.bank_name})` : ""}
                </option>
              ))}
              <option value={ADD_NEW_ACCOUNT_VALUE} style={{ backgroundColor: "#09090b", color: "#94a3b8" }}>
                + Add new account...
              </option>
            </select>
          </div>
        )}

        {/* Inline Add new account form */}
        {showAddAccountForm && (
          <div className="space-y-4 p-4 rounded-2xl bg-white/5 border border-white/10">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-white">New account</h3>
              <button
                type="button"
                onClick={() => { setShowAddAccountForm(false); setAddAccountError(null); setSelectedAccountId(defaultAccountId); }}
                className="p-1.5 rounded-lg hover:bg-white/10 text-muted-foreground hover:text-white transition-colors"
                aria-label="Cancel"
              >
                <X className="w-4 h-4" strokeWidth={1.5} />
              </button>
            </div>
            <form onSubmit={handleAddAccountSubmit} className="space-y-3">
              {addAccountError && (
                <p className="text-sm text-red-400">{addAccountError}</p>
              )}
              <div className="space-y-2">
                <label htmlFor="add_account_name" className="text-xs font-medium text-muted-foreground">Account name *</label>
                <input
                  id="add_account_name"
                  name="name"
                  type="text"
                  required
                  placeholder="e.g. Everyday"
                  className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-white/20"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="add_account_bank_name" className="text-xs font-medium text-muted-foreground">Bank name</label>
                <input
                  id="add_account_bank_name"
                  name="bank_name"
                  type="text"
                  placeholder="e.g. Commonwealth Bank"
                  className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-white/20"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="add_account_type" className="text-xs font-medium text-muted-foreground">Type *</label>
                <select
                  id="add_account_type"
                  name="account_type"
                  required
                  defaultValue="savings"
                  className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:ring-2 focus:ring-white/20 [color-scheme:dark]"
                  style={{ colorScheme: "dark" }}
                >
                  {ACCOUNT_TYPES.map((t) => (
                    <option key={t.value} value={t.value} style={{ backgroundColor: "#09090b", color: "#ffffff" }}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2">
                <Button
                  type="submit"
                  disabled={isAddingAccount}
                  size="sm"
                  className="rounded-xl bg-white text-[#09090b] hover:bg-white/90"
                >
                  {isAddingAccount ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Plus className="w-4 h-4 mr-1.5" strokeWidth={1.5} />Add account</>}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="rounded-xl text-muted-foreground"
                  onClick={() => { setShowAddAccountForm(false); setAddAccountError(null); setSelectedAccountId(defaultAccountId); }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        )}

        {bankAccounts.length === 0 && !isLoadingAccounts && !showAddAccountForm && (
          <div className="p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
            <p className="text-sm text-yellow-400">
              No bank accounts found. Please add a bank account in Settings first.
            </p>
          </div>
        )}

        {/* Month/Year */}
        <div className="space-y-2">
          <label htmlFor="month_year" className="text-sm font-medium text-white flex items-center gap-2">
            <Calendar className="w-4 h-4" strokeWidth={1.5} />
            Month & Year
          </label>
            <input
            id="month_year"
            name="month_year"
            type="month"
            required
            defaultValue={currentMonth}
            className="w-full px-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-white/20 transition-all [color-scheme:dark]"
          />
        </div>

        {/* Balance */}
        <div className="space-y-2">
          <label htmlFor="balance" className="text-sm font-medium text-white flex items-center gap-2">
            <DollarSign className="w-4 h-4" strokeWidth={1.5} />
            Balance
          </label>
          <input
            id="balance"
            name="balance"
            type="number"
            step="0.01"
            required
            min="0"
            placeholder="0.00"
            defaultValue={initialBalance?.balance ?? ""}
            className="w-full px-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-white placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-white/20 transition-all"
          />
        </div>

        {/* Interest earned (this account, this month) */}
        <div className="space-y-2">
          <label htmlFor="interest_earned" className="text-sm font-medium text-white flex items-center gap-2">
            <DollarSign className="w-4 h-4" strokeWidth={1.5} />
            Interest earned $ (optional)
          </label>
          <input
            id="interest_earned"
            name="interest_earned"
            type="number"
            step="0.01"
            min="0"
            placeholder="0.00"
            defaultValue={initialBalance?.interest_earned ?? ""}
            className="w-full px-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-white placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-white/20 transition-all"
          />
        </div>

        {/* One-off deposit (excluded from spend calculation) */}
        <div className="space-y-2">
          <label htmlFor="one_off_deposit" className="text-sm font-medium text-white flex items-center gap-2">
            <DollarSign className="w-4 h-4" strokeWidth={1.5} />
            One-off deposit $ (optional)
          </label>
          <input
            id="one_off_deposit"
            name="one_off_deposit"
            type="number"
            step="0.01"
            min="0"
            placeholder="e.g. inheritance, bonus, tax refund"
            defaultValue={initialBalance?.one_off_deposit ?? ""}
            className="w-full px-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-white placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-white/20 transition-all"
          />
          <p className="text-xs text-muted-foreground">Excluded from spend/savings so it doesn’t distort your numbers.</p>
        </div>

        {/* Notes */}
        <div className="space-y-2">
          <label htmlFor="notes" className="text-sm font-medium text-white flex items-center gap-2">
            <FileText className="w-4 h-4" strokeWidth={1.5} />
            Notes (Optional)
          </label>
          <textarea
            id="notes"
            name="notes"
            rows={4}
            placeholder="Add any notes about this balance..."
            defaultValue={initialBalance?.notes ?? ""}
            className="w-full px-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-white placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-white/20 transition-all resize-none"
          />
        </div>

        {/* Submit Button */}
        <Button
          type="submit"
          disabled={
            isSubmitting ||
            showAddAccountForm ||
            selectedAccountId === "" ||
            selectedAccountId === ADD_NEW_ACCOUNT_VALUE
          }
          className="w-full rounded-2xl bg-white text-[#09090b] hover:bg-white/90 font-medium h-12"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" strokeWidth={1.5} />
              Adding...
            </>
          ) : (
            initialBalance ? "Save changes" : "Add Balance"
          )}
        </Button>
      </form>
    </Drawer>
  );
}

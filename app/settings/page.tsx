"use client";

import { motion } from "framer-motion";
import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Settings, Plus, Edit2, Trash2, Building2, Wallet, CreditCard, TrendingUp, X, Save, Loader2, ArrowLeft, Sparkles, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { addBankAccount, updateBankAccount, deleteBankAccount } from "@/app/actions/bank-accounts";
import { deleteAllUserData } from "@/app/actions/delete-all-data";

interface BankAccount {
  id: string;
  user_id: string;
  name: string;
  bank_name: string | null;
  account_type: string;
  account_number_last4: string | null;
  currency: string;
  color: string | null;
  is_active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

const ACCOUNT_TYPES = [
  { value: "transactions", label: "Transactions", icon: Wallet },
  { value: "expenses", label: "Spend", icon: CreditCard },
  { value: "savings", label: "Savings", icon: TrendingUp },
  { value: "emergency", label: "Emergency", icon: Building2 },
  { value: "fun", label: "Fun", icon: Sparkles },
];

const ACCOUNT_COLORS = [
  "#3b82f6", // Blue
  "#10b981", // Green
  "#f59e0b", // Amber
  "#ef4444", // Red
  "#8b5cf6", // Purple
  "#ec4899", // Pink
  "#06b6d4", // Cyan
  "#84cc16", // Lime
];

export default function SettingsPage() {
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<BankAccount | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false);
  const [deleteAllConfirmed, setDeleteAllConfirmed] = useState(false);
  const [isDeletingAll, setIsDeletingAll] = useState(false);
  const [deleteAllError, setDeleteAllError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  const fetchAccounts = useCallback(async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      const { data, error } = await supabase
        .from("bank_accounts")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching accounts:", error);
        setAccounts([]);
      } else {
        setAccounts(data || []);
      }
    } catch (error) {
      console.error("Error:", error);
      setAccounts([]);
    } finally {
      setIsLoading(false);
    }
  }, [supabase, router]);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const formData = new FormData(e.currentTarget);

    try {
      const result = editingAccount
        ? await updateBankAccount(editingAccount.id, formData)
        : await addBankAccount(formData);

      if (result?.error) {
        setError(result.error);
        setIsSubmitting(false);
        return;
      }

      // Success
      await fetchAccounts();
      setIsDrawerOpen(false);
      setEditingAccount(null);
      e.currentTarget.reset();
    } catch (err) {
      setError("An unexpected error occurred");
      setIsSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this bank account?")) {
      return;
    }

    const result = await deleteBankAccount(id);
    if (result?.error) {
      alert(result.error);
    } else {
      await fetchAccounts();
    }
  }

  function openEditDrawer(account: BankAccount) {
    setEditingAccount(account);
    setIsDrawerOpen(true);
  }

  function openAddDrawer() {
    setEditingAccount(null);
    setIsDrawerOpen(true);
    setError(null);
  }

  function closeDrawer() {
    setIsDrawerOpen(false);
    setEditingAccount(null);
    setError(null);
  }

  function openDeleteAllModal() {
    setShowDeleteAllModal(true);
    setDeleteAllConfirmed(false);
    setDeleteAllError(null);
  }

  async function handleDeleteAll() {
    if (!deleteAllConfirmed) return;
    setIsDeletingAll(true);
    setDeleteAllError(null);
    try {
      const result = await deleteAllUserData();
      if (result?.error) {
        setDeleteAllError(result.error);
        setIsDeletingAll(false);
        return;
      }
      setShowDeleteAllModal(false);
      router.push("/dashboard");
    } catch (err) {
      setDeleteAllError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsDeletingAll(false);
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#09090b] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#09090b] p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="mb-8"
        >
          <Button
            onClick={() => router.push("/dashboard")}
            variant="ghost"
            className="mb-4 rounded-2xl text-muted-foreground hover:text-white"
          >
            <ArrowLeft className="w-4 h-4 mr-2" strokeWidth={1.5} />
            Back to Dashboard
          </Button>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 rounded-xl bg-white/10">
              <Settings className="w-6 h-6 text-white" strokeWidth={1.5} />
            </div>
            <h1 className="text-4xl font-semibold text-white">Settings</h1>
          </div>
          <p className="text-muted-foreground">Manage your bank accounts</p>
        </motion.header>

        {/* Bank Accounts Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold text-white">Bank Accounts</h2>
            <Button
              onClick={openAddDrawer}
              className="rounded-2xl bg-white text-[#09090b] hover:bg-white/90"
            >
              <Plus className="w-4 h-4 mr-2" strokeWidth={1.5} />
              Add Account
            </Button>
          </div>

          {accounts.length === 0 ? (
            <div className="text-center py-12">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/10 mb-4">
                <Wallet className="w-8 h-8 text-white" strokeWidth={1.5} />
              </div>
              <p className="text-muted-foreground mb-4">No bank accounts yet</p>
              <Button
                onClick={openAddDrawer}
                className="rounded-2xl"
              >
                <Plus className="w-4 h-4 mr-2" strokeWidth={1.5} />
                Add Your First Account
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {accounts.map((account) => {
                const AccountIcon = ACCOUNT_TYPES.find((t) => t.value === account.account_type)?.icon || Wallet;
                const accountColor = account.color || ACCOUNT_COLORS[0];

                return (
                  <motion.div
                    key={account.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors border border-white/10"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 flex-1">
                        <div
                          className="p-3 rounded-xl"
                          style={{ backgroundColor: `${accountColor}20` }}
                        >
                          <AccountIcon
                            className="w-5 h-5"
                            style={{ color: accountColor }}
                            strokeWidth={1.5}
                          />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-white">{account.name}</h3>
                            {!account.is_active && (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-muted-foreground">
                                Inactive
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            {account.bank_name && <span>{account.bank_name}</span>}
                            <span className="capitalize">{account.account_type}</span>
                            {account.account_number_last4 && (
                              <span>•••• {account.account_number_last4}</span>
                            )}
                            <span>{account.currency}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          onClick={() => openEditDrawer(account)}
                          variant="ghost"
                          size="icon"
                          className="rounded-xl"
                        >
                          <Edit2 className="w-4 h-4" strokeWidth={1.5} />
                        </Button>
                        <Button
                          onClick={() => handleDelete(account.id)}
                          variant="ghost"
                          size="icon"
                          className="rounded-xl text-red-400 hover:text-red-300"
                        >
                          <Trash2 className="w-4 h-4" strokeWidth={1.5} />
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </motion.div>

        {/* Delete all data */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="mt-8"
        >
          <div className="glass-card border-red-500/20 p-6">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-red-500/10 shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-400" strokeWidth={1.5} />
              </div>
              <div className="min-w-0">
                <h2 className="text-lg font-semibold text-white mb-1">Delete all data</h2>
                <p className="text-sm text-muted-foreground mb-4">
                  Permanently remove all your balances, income, and bank accounts. This cannot be undone.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={openDeleteAllModal}
                  className="rounded-xl border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300"
                >
                  <Trash2 className="w-4 h-4 mr-2" strokeWidth={1.5} />
                  Delete all data
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Delete all confirmation modal */}
      {showDeleteAllModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => !isDeletingAll && setShowDeleteAllModal(false)}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-[#09090b] border border-red-500/30 rounded-2xl p-6 max-w-md w-full shadow-xl"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-xl bg-red-500/20">
                <AlertTriangle className="w-6 h-6 text-red-400" strokeWidth={1.5} />
              </div>
              <h3 className="text-xl font-semibold text-white">Delete all data?</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              This will permanently delete <strong className="text-white">all your data</strong>: every balance, every income entry, and every bank account. There are <strong className="text-white">no backups</strong> and <strong className="text-white">no way to get your data back</strong>.
            </p>
            <label className="flex items-start gap-3 cursor-pointer mb-6 p-3 rounded-xl bg-white/5 border border-white/10">
              <input
                type="checkbox"
                checked={deleteAllConfirmed}
                onChange={(e) => setDeleteAllConfirmed(e.target.checked)}
                className="mt-1 w-4 h-4 rounded border-white/20 bg-white/5 text-red-500 focus:ring-red-500/50"
              />
              <span className="text-sm text-muted-foreground">
                I understand that all my data will be permanently deleted with no backups and no way to recover it.
              </span>
            </label>
            {deleteAllError && (
              <p className="text-sm text-red-400 mb-4">{deleteAllError}</p>
            )}
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                className="flex-1 rounded-xl border-white/20"
                onClick={() => !isDeletingAll && setShowDeleteAllModal(false)}
                disabled={isDeletingAll}
              >
                Cancel
              </Button>
              <Button
                type="button"
                className="flex-1 rounded-xl bg-red-600 hover:bg-red-700 text-white"
                onClick={handleDeleteAll}
                disabled={!deleteAllConfirmed || isDeletingAll}
              >
                {isDeletingAll ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" strokeWidth={1.5} />
                    Deleting...
                  </>
                ) : (
                  "Delete everything"
                )}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Add/Edit Drawer */}
      {isDrawerOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
          onClick={closeDrawer}
        >
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            onClick={(e) => e.stopPropagation()}
            className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-[#09090b] border-l border-white/10 z-50 overflow-y-auto"
          >
            <div className="p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-semibold text-white">
                  {editingAccount ? "Edit Account" : "Add Bank Account"}
                </h2>
                <button
                  onClick={closeDrawer}
                  className="p-2 rounded-xl hover:bg-white/10 transition-colors"
                >
                  <X className="w-5 h-5 text-white" strokeWidth={1.5} />
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20">
                    <p className="text-sm text-red-400">{error}</p>
                  </div>
                )}

                {/* Account Name */}
                <div className="space-y-2">
                  <label htmlFor="name" className="text-sm font-medium text-white">
                    Account Name *
                  </label>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    required
                    defaultValue={editingAccount?.name || ""}
                    className="w-full px-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-white placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-white/20 transition-all"
                    placeholder="e.g., Everyday Transactions"
                  />
                </div>

                {/* Bank Name */}
                <div className="space-y-2">
                  <label htmlFor="bank_name" className="text-sm font-medium text-white">
                    Bank Name
                  </label>
                  <input
                    id="bank_name"
                    name="bank_name"
                    type="text"
                    defaultValue={editingAccount?.bank_name || ""}
                    className="w-full px-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-white placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-white/20 transition-all"
                    placeholder="e.g., Commonwealth Bank, ANZ, Westpac, NAB"
                  />
                </div>

                {/* Account Type */}
                <div className="space-y-2">
                  <label htmlFor="account_type" className="text-sm font-medium text-white">
                    Account Type *
                  </label>
                  <select
                    id="account_type"
                    name="account_type"
                    required
                    defaultValue={editingAccount?.account_type || "transactions"}
                    className="w-full px-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-white/20 transition-all [color-scheme:dark]"
                    style={{ colorScheme: "dark" }}
                  >
                    {ACCOUNT_TYPES.map((type) => (
                      <option key={type.value} value={type.value} style={{ backgroundColor: "#09090b", color: "#ffffff" }}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Last 4 Digits */}
                <div className="space-y-2">
                  <label htmlFor="account_number_last4" className="text-sm font-medium text-white">
                    Last 4 Digits (Optional)
                  </label>
                  <input
                    id="account_number_last4"
                    name="account_number_last4"
                    type="text"
                    maxLength={4}
                    pattern="[0-9]{4}"
                    defaultValue={editingAccount?.account_number_last4 || ""}
                    className="w-full px-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-white placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-white/20 transition-all"
                    placeholder="1234"
                  />
                </div>

                {/* Currency */}
                <div className="space-y-2">
                  <label htmlFor="currency" className="text-sm font-medium text-white">
                    Currency
                  </label>
                  <select
                    id="currency"
                    name="currency"
                    defaultValue={editingAccount?.currency || "AUD"}
                    className="w-full px-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-white/20 transition-all [color-scheme:dark]"
                    style={{ colorScheme: "dark" }}
                  >
                    <option value="AUD" style={{ backgroundColor: "#09090b", color: "#ffffff" }}>AUD - Australian Dollar</option>
                    <option value="USD" style={{ backgroundColor: "#09090b", color: "#ffffff" }}>USD - US Dollar</option>
                    <option value="EUR" style={{ backgroundColor: "#09090b", color: "#ffffff" }}>EUR - Euro</option>
                    <option value="GBP" style={{ backgroundColor: "#09090b", color: "#ffffff" }}>GBP - British Pound</option>
                    <option value="NZD" style={{ backgroundColor: "#09090b", color: "#ffffff" }}>NZD - New Zealand Dollar</option>
                  </select>
                </div>

                {/* Color */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-white">Color</label>
                  <div className="flex gap-2 flex-wrap">
                    {ACCOUNT_COLORS.map((color) => (
                      <label
                        key={color}
                        className="relative cursor-pointer"
                      >
                        <input
                          type="radio"
                          name="color"
                          value={color}
                          defaultChecked={editingAccount?.color === color || (!editingAccount && color === ACCOUNT_COLORS[0])}
                          className="sr-only"
                        />
                        <div
                          className={`w-10 h-10 rounded-xl border-2 transition-all ${
                            (editingAccount?.color === color || (!editingAccount && color === ACCOUNT_COLORS[0]))
                              ? "border-white scale-110"
                              : "border-white/20 hover:border-white/40"
                          }`}
                          style={{ backgroundColor: color }}
                        />
                      </label>
                    ))}
                  </div>
                </div>

                {/* Active Status */}
                {editingAccount && (
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        name="is_active"
                        value="true"
                        defaultChecked={editingAccount.is_active}
                        className="w-4 h-4 rounded bg-white/5 border-white/10 text-white focus:ring-2 focus:ring-white/20"
                      />
                      <span className="text-sm font-medium text-white">Active Account</span>
                    </label>
                  </div>
                )}

                {/* Notes */}
                <div className="space-y-2">
                  <label htmlFor="notes" className="text-sm font-medium text-white">
                    Notes (Optional)
                  </label>
                  <textarea
                    id="notes"
                    name="notes"
                    rows={3}
                    defaultValue={editingAccount?.notes || ""}
                    className="w-full px-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-white placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-white/20 transition-all resize-none"
                    placeholder="Add any notes about this account..."
                  />
                </div>

                {/* Submit Button */}
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full rounded-2xl bg-white text-[#09090b] hover:bg-white/90 font-medium h-12"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" strokeWidth={1.5} />
                      {editingAccount ? "Updating..." : "Adding..."}
                    </>
                  ) : (
                    <>
                      <Save className="w-5 h-5 mr-2" strokeWidth={1.5} />
                      {editingAccount ? "Update Account" : "Add Account"}
                    </>
                  )}
                </Button>
              </form>
            </div>
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}

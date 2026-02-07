"use client";

import { motion } from "framer-motion";
import { Wallet, TrendingUp, TrendingDown, Plus, LogOut, Calendar, Target, TrendingUp as TrendingUpIcon, Settings, Banknote, Receipt } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { signOut } from "@/app/actions/auth";
import { deleteMonthlyBalance } from "@/app/actions/balances";
import { deleteMonthlyIncome } from "@/app/actions/income";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { BalanceChart } from "@/components/dashboard/balance-chart";
import { SpendSaveChart } from "@/components/dashboard/spend-save-chart";
import { QuickAddDrawer } from "@/components/dashboard/quick-add-drawer";
import { AddIncomeDrawer } from "@/components/dashboard/add-income-drawer";
import { Pencil, Trash2, ChevronUp, ChevronDown, Minus } from "lucide-react";

interface MonthlyBalance {
  id: string;
  user_id: string;
  bank_account_id: string | null;
  month_year: string;
  balance: number;
  interest_earned?: number;
  one_off_deposit?: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
  bank_accounts?: {
    name: string;
    bank_name: string | null;
    account_type: string;
    color: string | null;
  } | null;
}

interface BankAccount {
  id: string;
  name: string;
  bank_name: string | null;
  account_type: string;
  color: string | null;
}

interface MonthlyIncome {
  id: string;
  user_id: string;
  month_year: string;
  amount: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export default function DashboardPage() {
  const [balances, setBalances] = useState<MonthlyBalance[]>([]);
  const [incomes, setIncomes] = useState<MonthlyIncome[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [selectedChartAccounts, setSelectedChartAccounts] = useState<string[]>([]); // Empty = all accounts (total)
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState<"overview" | "accounts" | "analytics">("overview");
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isIncomeDrawerOpen, setIsIncomeDrawerOpen] = useState(false);
  const [editingIncome, setEditingIncome] = useState<MonthlyIncome | null>(null);
  const [editingBalance, setEditingBalance] = useState<MonthlyBalance | null>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    async function fetchBalances() {
      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError) {
          console.error("Auth error:", userError);
          router.push("/login");
          return;
        }

        if (!user) {
          router.push("/login");
          return;
        }

        const { data, error } = await supabase
          .from("monthly_balances")
          .select(`
            *,
            bank_accounts (
              name,
              bank_name,
              account_type,
              color
            )
          `)
          .order("month_year", { ascending: false });

        if (error) {
          console.error("Error fetching balances:", {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code,
          });
          
          // Check if table doesn't exist
          if (error.code === "42P01" || error.message?.includes("does not exist")) {
            console.error("Table 'monthly_balances' does not exist. Please run the database migration.");
          }
          
          // Check if RLS is blocking
          if (error.code === "42501" || error.message?.includes("permission denied")) {
            console.error("Permission denied. Check your RLS policies.");
          }
          
          setBalances([]);
          setIsLoading(false);
          return;
        }

        setBalances(data || []);

        // Fetch monthly incomes
        const { data: incomesData } = await supabase
          .from("monthly_incomes")
          .select("*")
          .order("month_year", { ascending: false });
        setIncomes(incomesData || []);

        // Also fetch bank accounts for chart filtering
        const { data: accountsData, error: accountsError } = await supabase
          .from("bank_accounts")
          .select("id, name, bank_name, account_type, color")
          .eq("is_active", true)
          .order("name", { ascending: true });

        if (!accountsError && accountsData) {
          setBankAccounts(accountsData);
        }
      } catch (error) {
        console.error("Unexpected error:", error);
        setBalances([]);
        setIncomes([]);
      } finally {
        setIsLoading(false);
      }
    }

    fetchBalances();
  }, [supabase, router]);

  // Calculate metrics - aggregate balances by month
  const metrics = useMemo(() => {
    // Group balances by month and sum them
    const monthlyTotals = new Map<string, number>();
    balances.forEach((balance) => {
      const monthKey = balance.month_year;
      const currentTotal = monthlyTotals.get(monthKey) || 0;
      monthlyTotals.set(monthKey, currentTotal + balance.balance);
    });

    // Convert to array and sort by date descending (most recent first)
    const sortedMonthlyTotals = Array.from(monthlyTotals.entries())
      .map(([month_year, balance]) => ({ month_year, balance }))
      .sort((a, b) => new Date(b.month_year).getTime() - new Date(a.month_year).getTime());

    const currentBalance = sortedMonthlyTotals.length > 0 ? sortedMonthlyTotals[0] : null;
    const previousBalance = sortedMonthlyTotals.length > 1 ? sortedMonthlyTotals[1] : null;
    
    const totalBalance = currentBalance?.balance || 0;
    const balanceChange = currentBalance && previousBalance
      ? currentBalance.balance - previousBalance.balance
      : 0;
    const balanceChangePercent = previousBalance && previousBalance.balance !== 0
      ? ((balanceChange / previousBalance.balance) * 100)
      : 0;

    // Annual projection: average monthly savings × 12 (savings = change in balance − one-off − interest)
    const oneOffByMonthProj = new Map<string, number>();
    const interestByMonthProj = new Map<string, number>();
    balances.forEach((b) => {
      const m = b.month_year;
      oneOffByMonthProj.set(m, (oneOffByMonthProj.get(m) ?? 0) + Number(b.one_off_deposit ?? 0));
      interestByMonthProj.set(m, (interestByMonthProj.get(m) ?? 0) + Number(b.interest_earned ?? 0));
    });
    const sortedMonthsAsc = Array.from(monthlyTotals.entries())
      .map(([month_year, balance]) => ({ month_year, balance }))
      .sort((a, b) => new Date(a.month_year).getTime() - new Date(b.month_year).getTime());

    let annualProjection = 0;
    if (sortedMonthsAsc.length >= 2) {
      const monthlySavings: number[] = [];
      for (let i = 1; i < sortedMonthsAsc.length; i++) {
        const prev = sortedMonthsAsc[i - 1];
        const curr = sortedMonthsAsc[i];
        const balanceChange = curr.balance - prev.balance;
        const oneOff = oneOffByMonthProj.get(curr.month_year) ?? 0;
        const interest = interestByMonthProj.get(curr.month_year) ?? 0;
        monthlySavings.push(balanceChange - oneOff - interest);
      }
      const avgMonthlySavings = monthlySavings.reduce((a, c) => a + c, 0) / monthlySavings.length;
      annualProjection = avgMonthlySavings * 12;
    }

    // Highest balance ever (from monthly totals)
    const highestBalance = sortedMonthlyTotals.length > 0
      ? Math.max(...sortedMonthlyTotals.map((b) => b.balance))
      : 0;

    // Find the most recent balance record for updated_at timestamp
    const mostRecentBalance = balances.length > 0 
      ? balances.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())[0]
      : null;

    const currentMonthYear = sortedMonthlyTotals[0]?.month_year ?? null;

    return {
      totalBalance,
      balanceChange,
      balanceChangePercent,
      annualProjection,
      highestBalance,
      currentBalance: mostRecentBalance,
      previousBalance,
      currentMonthYear,
      sortedMonthlyTotals,
    };
  }, [balances]);

  const monthlyTotalByMonth = useMemo(() => {
    const map = new Map<string, number>();
    balances.forEach((b) => {
      map.set(b.month_year, (map.get(b.month_year) ?? 0) + b.balance);
    });
    return map;
  }, [balances]);

  const sortedMonthKeys = useMemo(
    () =>
      Array.from(new Set(balances.map((b) => b.month_year))).sort(
        (a, b) => new Date(b).getTime() - new Date(a).getTime()
      ),
    [balances]
  );

  const interestByMonth = useMemo(() => {
    const map = new Map<string, number>();
    balances.forEach((b) => {
      const k = b.month_year;
      map.set(k, (map.get(k) ?? 0) + Number(b.interest_earned ?? 0));
    });
    return map;
  }, [balances]);

  const oneOffByMonth = useMemo(() => {
    const map = new Map<string, number>();
    balances.forEach((b) => {
      const k = b.month_year;
      map.set(k, (map.get(k) ?? 0) + Number(b.one_off_deposit ?? 0));
    });
    return map;
  }, [balances]);

  // One row per month: balance, income, expenses, savings (for table)
  const monthlySummaryRows = useMemo(() => {
    const monthSet = new Set<string>();
    balances.forEach((b) => monthSet.add(b.month_year));
    incomes.forEach((i) => monthSet.add(i.month_year));
    const months = Array.from(monthSet).sort(
      (a, b) => new Date(b).getTime() - new Date(a).getTime()
    );
    return months.map((month_year) => {
      const balance = monthlyTotalByMonth.get(month_year) ?? 0;
      const income = Number(incomes.find((i) => i.month_year === month_year)?.amount ?? 0);
      const prevMonth = months[months.indexOf(month_year) + 1] ?? null;
      const isOpeningMonth = prevMonth === null;
      const prevTotal = prevMonth ? (monthlyTotalByMonth.get(prevMonth) ?? 0) : 0;
      const changeInBalance = balance - prevTotal;
      const oneOff = oneOffByMonth.get(month_year) ?? 0;
      const interest = interestByMonth.get(month_year) ?? 0;
      const savings = isOpeningMonth ? null : changeInBalance - oneOff - interest;
      const expenses = isOpeningMonth ? null : income - (savings as number);
      return {
        month_year,
        balance,
        income,
        expenses,
        savings,
        isOpeningMonth,
      };
    });
  }, [balances, incomes, monthlyTotalByMonth, oneOffByMonth, interestByMonth]);

  // Rows with expenses/savings/income (excluding opening month)
  const withExpenses = useMemo(
    () => monthlySummaryRows.filter((r) => r.expenses !== null) as { expenses: number }[],
    [monthlySummaryRows]
  );
  const withSavings = useMemo(
    () => monthlySummaryRows.filter((r) => r.savings !== null) as { savings: number }[],
    [monthlySummaryRows]
  );

  const avgSpend3Month = withExpenses.length >= 1 ? withExpenses.slice(0, 3).reduce((a, r) => a + r.expenses, 0) / Math.min(3, withExpenses.length) : null;
  const avgSpend6Month = withExpenses.length >= 1 ? withExpenses.slice(0, 6).reduce((a, r) => a + r.expenses, 0) / Math.min(6, withExpenses.length) : null;
  const avgSpend12Month = withExpenses.length >= 1 ? withExpenses.slice(0, 12).reduce((a, r) => a + r.expenses, 0) / Math.min(12, withExpenses.length) : null;

  const avgSave3Month = withSavings.length >= 1 ? withSavings.slice(0, 3).reduce((a, r) => a + r.savings, 0) / Math.min(3, withSavings.length) : null;
  const avgSave6Month = withSavings.length >= 1 ? withSavings.slice(0, 6).reduce((a, r) => a + r.savings, 0) / Math.min(6, withSavings.length) : null;
  const avgSave12Month = withSavings.length >= 1 ? withSavings.slice(0, 12).reduce((a, r) => a + r.savings, 0) / Math.min(12, withSavings.length) : null;

  // Trend: 1 = up, -1 = down, 0 = flat, null = not enough data (compare recent period vs prior period)
  const spend3Trend = useMemo(() => {
    if (withExpenses.length < 6) return null;
    const r = withExpenses.slice(0, 3).reduce((a, x) => a + x.expenses, 0) / 3;
    const p = withExpenses.slice(3, 6).reduce((a, x) => a + x.expenses, 0) / 3;
    return r > p ? 1 : r < p ? -1 : 0;
  }, [withExpenses]);
  const spend6Trend = useMemo(() => {
    if (withExpenses.length < 12) return null;
    const r = withExpenses.slice(0, 6).reduce((a, x) => a + x.expenses, 0) / 6;
    const p = withExpenses.slice(6, 12).reduce((a, x) => a + x.expenses, 0) / 6;
    return r > p ? 1 : r < p ? -1 : 0;
  }, [withExpenses]);
  const save3Trend = useMemo(() => {
    if (withSavings.length < 6) return null;
    const r = withSavings.slice(0, 3).reduce((a, x) => a + x.savings, 0) / 3;
    const p = withSavings.slice(3, 6).reduce((a, x) => a + x.savings, 0) / 3;
    return r > p ? 1 : r < p ? -1 : 0;
  }, [withSavings]);
  const save6Trend = useMemo(() => {
    if (withSavings.length < 12) return null;
    const r = withSavings.slice(0, 6).reduce((a, x) => a + x.savings, 0) / 6;
    const p = withSavings.slice(6, 12).reduce((a, x) => a + x.savings, 0) / 6;
    return r > p ? 1 : r < p ? -1 : 0;
  }, [withSavings]);
  const save12Trend = useMemo(() => {
    if (withSavings.length < 24) return null;
    const r = withSavings.slice(0, 12).reduce((a, x) => a + x.savings, 0) / 12;
    const p = withSavings.slice(12, 24).reduce((a, x) => a + x.savings, 0) / 12;
    return r > p ? 1 : r < p ? -1 : 0;
  }, [withSavings]);

  // Annual projection: use 12 month avg save × 12 when available so it matches that card
  const displayProjection = avgSave12Month != null ? avgSave12Month * 12 : metrics.annualProjection;

  // Spend & save chart data (last 12 months with spend/save)
  const spendSaveChartData = useMemo(
    () =>
      monthlySummaryRows.map((r) => ({
        month_year: r.month_year,
        spend: r.expenses,
        save: r.savings,
      })),
    [monthlySummaryRows]
  );

  async function refreshBalances() {
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        router.push("/login");
        return;
      }

      const { data, error } = await supabase
        .from("monthly_balances")
        .select(`
          *,
          bank_accounts (
            name,
            bank_name,
            account_type,
            color
          )
        `)
        .order("month_year", { ascending: false });

      if (error) {
        console.error("Error refreshing balances:", {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code,
        });
        return;
      }

      setBalances(data || []);

      // Refresh bank accounts too
      const { data: accountsData } = await supabase
        .from("bank_accounts")
        .select("id, name, bank_name, account_type, color")
        .eq("is_active", true)
        .order("name", { ascending: true });

      if (accountsData) {
        setBankAccounts(accountsData);
      }

      const { data: incomesData } = await supabase
        .from("monthly_incomes")
        .select("*")
        .order("month_year", { ascending: false });
      setIncomes(incomesData || []);
    } catch (error) {
      console.error("Unexpected error refreshing balances:", error);
    }
  }

  async function handleSignOut() {
    await signOut();
  }

  async function handleDeleteBalance(balance: MonthlyBalance) {
    if (!confirm(`Remove this balance?\n${balance.bank_accounts?.name ?? "Account"} – ${new Date(balance.month_year).toLocaleDateString("en-AU", { month: "long", year: "numeric" })}`)) return;
    const result = await deleteMonthlyBalance(balance.id);
    if (result?.error) {
      alert(result.error);
      return;
    }
    refreshBalances();
  }

  async function handleDeleteIncome(income: MonthlyIncome) {
    if (!confirm(`Remove income for ${new Date(income.month_year).toLocaleDateString("en-AU", { month: "long", year: "numeric" })}?`)) return;
    const result = await deleteMonthlyIncome(income.id);
    if (result?.error) {
      alert(result.error);
      return;
    }
    refreshBalances();
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
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="mb-8 flex items-center justify-between"
        >
          <div>
            <h1 className="text-4xl font-semibold text-white mb-2">Bank Balance</h1>
            <p className="text-muted-foreground">Track your finances across all accounts</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => router.push("/settings")}
              variant="ghost"
              className="rounded-2xl text-muted-foreground hover:text-white"
            >
              <Settings className="w-4 h-4 mr-2" strokeWidth={1.5} />
              Settings
            </Button>
            <Button
              onClick={handleSignOut}
              variant="ghost"
              className="rounded-2xl text-muted-foreground hover:text-white"
            >
              <LogOut className="w-4 h-4 mr-2" strokeWidth={1.5} />
              Sign Out
            </Button>
          </div>
        </motion.header>

        {/* Navigation Tabs */}
        <motion.nav
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="flex gap-2 mb-8"
        >
          {[
            { id: "overview", label: "Overview" },
            { id: "accounts", label: "Accounts" },
            { id: "analytics", label: "Analytics" },
          ].map((tab) => (
            <motion.button
              key={tab.id}
              onClick={() => setSelectedTab(tab.id as typeof selectedTab)}
              className={`px-6 py-3 rounded-2xl font-medium transition-all ${
                selectedTab === tab.id
                  ? "glass-card text-white"
                  : "text-muted-foreground hover:text-white hover:bg-white/5"
              }`}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {tab.label}
            </motion.button>
          ))}
        </motion.nav>

        {/* Tab Content */}
        <motion.div
          key={selectedTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
        >
          {selectedTab === "overview" && (
            <div className="space-y-6">
              {/* Metrics — Row 1: this month spend, 3m spend, 6m spend, income. Row 2: this month save, 3m save, 6m save, projection */}
              {(balances.length > 0 || incomes.length > 0) && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
                >
                  {/* Row 1 col 1: Spend this month */}
                  {metrics.currentMonthYear && (
                    <div className="glass-card">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="p-2 rounded-xl bg-white/10">
                          <Receipt className="w-5 h-5 text-amber-400" strokeWidth={1.5} />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Spend (this month)</p>
                          <p className="text-2xl font-semibold text-white">
                            ${((): number => {
                              const inc = incomes.find((i) => i.month_year === metrics.currentMonthYear);
                              const income = Number(inc?.amount ?? 0);
                              const interest = interestByMonth.get(metrics.currentMonthYear ?? "") ?? 0;
                              const oneOff = oneOffByMonth.get(metrics.currentMonthYear ?? "") ?? 0;
                              const changeInBalance = metrics.totalBalance - (metrics.previousBalance?.balance ?? 0);
                              const savings = changeInBalance - oneOff - interest;
                              return income - savings;
                            })().toLocaleString("en-AU", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                          </p>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">Income − savings</p>
                    </div>
                  )}

                  {/* Row 1 col 2: 3 month avg spend */}
                  {avgSpend3Month !== null && (
                    <div className="glass-card">
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-xl bg-white/10">
                            <Receipt className="w-5 h-5 text-amber-400/80" strokeWidth={1.5} />
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">3 month avg spend</p>
                            <p className="text-2xl font-semibold text-white">
                              ${avgSpend3Month.toLocaleString("en-AU", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                            </p>
                          </div>
                        </div>
                        {spend3Trend !== null && (
                          <span className="flex items-center gap-0.5 shrink-0" title={spend3Trend === 1 ? "Up vs prior 3m" : spend3Trend === -1 ? "Down vs prior 3m" : "Flat"}>
                            {spend3Trend === 1 ? <ChevronUp className="w-4 h-4 text-red-400" /> : spend3Trend === -1 ? <ChevronDown className="w-4 h-4 text-green-400" /> : <Minus className="w-4 h-4 text-muted-foreground" />}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{spend3Trend !== null ? "vs prior 3m" : "Avg monthly spend"}</p>
                    </div>
                  )}

                  {/* Row 1 col 3: 6 month avg spend */}
                  {avgSpend6Month !== null && (
                    <div className="glass-card">
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-xl bg-white/10">
                            <Receipt className="w-5 h-5 text-amber-400/70" strokeWidth={1.5} />
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">6 month avg spend</p>
                            <p className="text-2xl font-semibold text-white">
                              ${avgSpend6Month.toLocaleString("en-AU", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                            </p>
                          </div>
                        </div>
                        {spend6Trend !== null && (
                          <span className="flex items-center gap-0.5 shrink-0" title={spend6Trend === 1 ? "Up vs prior 6m" : spend6Trend === -1 ? "Down vs prior 6m" : "Flat"}>
                            {spend6Trend === 1 ? <ChevronUp className="w-4 h-4 text-red-400" /> : spend6Trend === -1 ? <ChevronDown className="w-4 h-4 text-green-400" /> : <Minus className="w-4 h-4 text-muted-foreground" />}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{spend6Trend !== null ? "vs prior 6m" : "Avg monthly spend"}</p>
                    </div>
                  )}

                  {/* Row 1 col 4: Income this month */}
                  <div className="glass-card">
                    <div className="flex items-center justify-between gap-3 mb-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-white/10">
                          <Banknote className="w-5 h-5 text-emerald-400" strokeWidth={1.5} />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Income (this month)</p>
                          <p className="text-2xl font-semibold text-white">
                            ${(incomes.find((i) => i.month_year === (metrics.currentMonthYear ?? incomes[0]?.month_year))?.amount ?? 0).toLocaleString("en-AU", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                          </p>
                          {(interestByMonth.get(metrics.currentMonthYear ?? incomes[0]?.month_year ?? "") ?? 0) > 0 && (
                            <p className="text-xs text-muted-foreground">Interest: ${(interestByMonth.get(metrics.currentMonthYear ?? incomes[0]?.month_year ?? "") ?? 0).toLocaleString("en-AU", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</p>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => { setEditingIncome(null); setIsIncomeDrawerOpen(true); }}
                        className="rounded-xl border-white/20 text-muted-foreground hover:text-white shrink-0"
                      >
                        Add income
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {(metrics.currentMonthYear ?? incomes[0]?.month_year)
                        ? new Date(metrics.currentMonthYear ?? incomes[0]?.month_year ?? "").toLocaleDateString("en-AU", { month: "long", year: "numeric" })
                        : "Record income separately from balances (no account)."}
                    </p>
                  </div>

                  {/* Row 2 col 1: Savings this month */}
                  {metrics.currentMonthYear && metrics.previousBalance && (
                    <div className="glass-card">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="p-2 rounded-xl bg-white/10">
                          <TrendingUp className="w-5 h-5 text-green-400" strokeWidth={1.5} />
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Savings (this month)</p>
                          <p className={`text-2xl font-semibold ${((): number => {
                            const interest = interestByMonth.get(metrics.currentMonthYear ?? "") ?? 0;
                            const oneOff = oneOffByMonth.get(metrics.currentMonthYear ?? "") ?? 0;
                            const changeInBalance = metrics.totalBalance - (metrics.previousBalance?.balance ?? 0);
                            return changeInBalance - oneOff - interest;
                          })() >= 0 ? "text-green-400" : "text-red-400"}`}>
                            {(() => {
                              const interest = interestByMonth.get(metrics.currentMonthYear ?? "") ?? 0;
                              const oneOff = oneOffByMonth.get(metrics.currentMonthYear ?? "") ?? 0;
                              const changeInBalance = metrics.totalBalance - (metrics.previousBalance?.balance ?? 0);
                              const s = changeInBalance - oneOff - interest;
                              return `${s >= 0 ? "+" : ""}$${s.toLocaleString("en-AU", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
                            })()}
                          </p>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">Balance change − one-off − interest</p>
                    </div>
                  )}

                  {/* Row 2 col 2: 3 month avg save */}
                  {avgSave3Month !== null && (
                    <div className="glass-card">
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-xl bg-white/10">
                            <TrendingUp className="w-5 h-5 text-green-400" strokeWidth={1.5} />
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">3 month avg save</p>
                            <p className={`text-2xl font-semibold ${avgSave3Month >= 0 ? "text-green-400" : "text-red-400"}`}>
                              {avgSave3Month >= 0 ? "+" : ""}
                              ${avgSave3Month.toLocaleString("en-AU", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                            </p>
                          </div>
                        </div>
                        {save3Trend !== null && (
                          <span className="flex items-center gap-0.5 shrink-0" title={save3Trend === 1 ? "Up vs prior 3m" : save3Trend === -1 ? "Down vs prior 3m" : "Flat"}>
                            {save3Trend === 1 ? <ChevronUp className="w-4 h-4 text-green-400" /> : save3Trend === -1 ? <ChevronDown className="w-4 h-4 text-red-400" /> : <Minus className="w-4 h-4 text-muted-foreground" />}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{save3Trend !== null ? "vs prior 3m" : "Avg monthly savings"}</p>
                    </div>
                  )}

                  {/* Row 2 col 3: 6 month avg save */}
                  {avgSave6Month !== null && (
                    <div className="glass-card">
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-xl bg-white/10">
                            <TrendingUp className="w-5 h-5 text-green-400/90" strokeWidth={1.5} />
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">6 month avg save</p>
                            <p className={`text-2xl font-semibold ${avgSave6Month >= 0 ? "text-green-400" : "text-red-400"}`}>
                              {avgSave6Month >= 0 ? "+" : ""}
                              ${avgSave6Month.toLocaleString("en-AU", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                            </p>
                          </div>
                        </div>
                        {save6Trend !== null && (
                          <span className="flex items-center gap-0.5 shrink-0" title={save6Trend === 1 ? "Up vs prior 6m" : save6Trend === -1 ? "Down vs prior 6m" : "Flat"}>
                            {save6Trend === 1 ? <ChevronUp className="w-4 h-4 text-green-400" /> : save6Trend === -1 ? <ChevronDown className="w-4 h-4 text-red-400" /> : <Minus className="w-4 h-4 text-muted-foreground" />}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{save6Trend !== null ? "vs prior 6m" : "Avg monthly savings"}</p>
                    </div>
                  )}

                  {/* Row 2 col 4: Annual Projection */}
                  <div className="glass-card">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 rounded-xl bg-white/10">
                        <Target className="w-5 h-5 text-blue-400" strokeWidth={1.5} />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Annual Projection</p>
                        <p className={`text-2xl font-semibold ${displayProjection >= 0 ? "text-green-400" : "text-red-400"}`}>
                          {displayProjection >= 0 ? "+" : ""}
                          ${displayProjection.toLocaleString("en-AU", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                        </p>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {avgSave12Month != null ? "12 month avg save × 12" : "Avg monthly savings × 12"}
                    </p>
                  </div>
                </motion.div>
              )}

              {/* Net Worth Hero Card */}
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 }}
                className="glass-card"
              >
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Net Worth</p>
                    <h1 className="text-5xl md:text-6xl font-semibold text-white tracking-tight">
                      ${metrics.totalBalance.toLocaleString("en-AU", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </h1>
                  </div>
                  <Button
                    onClick={() => { setEditingBalance(null); setIsDrawerOpen(true); }}
                    className="rounded-2xl bg-white text-[#09090b] hover:bg-white/90"
                  >
                    <Plus className="w-4 h-4 mr-2" strokeWidth={1.5} />
                    Quick Add
                  </Button>
                </div>
                {metrics.currentBalance && metrics.currentBalance.updated_at && (
                  <p className="text-sm text-muted-foreground">
                    Last updated: {new Date(metrics.currentBalance.updated_at).toLocaleDateString("en-AU", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                )}
              </motion.div>

              {/* Balance Trend Chart */}
              {(balances.length > 0 || bankAccounts.length > 0) && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="glass-card"
                >
                  <div className="mb-6">
                    <h2 className="text-xl font-semibold text-white mb-4">12-Month Trend</h2>
                    {bankAccounts.length > 0 ? (
                      <div className="space-y-3">
                        <p className="text-sm text-muted-foreground">Filter by account:</p>
                        <div className="flex items-center gap-2 flex-wrap">
                          <button
                            onClick={() => setSelectedChartAccounts([])}
                            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                              selectedChartAccounts.length === 0
                                ? "bg-white/10 text-white border border-white/20"
                                : "bg-white/5 text-muted-foreground hover:text-white hover:bg-white/10 border border-transparent"
                            }`}
                          >
                            All Accounts
                          </button>
                          {bankAccounts.map((account) => {
                            const isSelected = selectedChartAccounts.includes(account.id);
                            return (
                              <button
                                key={account.id}
                                onClick={() => {
                                  // Toggle account selection - add if not selected, remove if selected
                                  if (isSelected) {
                                    setSelectedChartAccounts(
                                      selectedChartAccounts.filter((id) => id !== account.id)
                                    );
                                  } else {
                                    setSelectedChartAccounts([...selectedChartAccounts, account.id]);
                                  }
                                }}
                                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${
                                  isSelected
                                    ? "bg-white/10 text-white border-2"
                                    : "bg-white/5 text-muted-foreground hover:text-white hover:bg-white/10 border-2 border-transparent"
                                }`}
                                style={
                                  isSelected && account.color
                                    ? { borderColor: account.color }
                                    : {}
                                }
                              >
                                <div
                                  className="w-2.5 h-2.5 rounded-full"
                                  style={{ backgroundColor: account.color || "#3b82f6" }}
                                />
                                {account.name}
                                {isSelected && (
                                  <span className="ml-1 text-xs">✓</span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                        {selectedChartAccounts.length > 0 && (
                          <p className="text-xs text-muted-foreground">
                            Showing {selectedChartAccounts.length} account{selectedChartAccounts.length !== 1 ? "s" : ""}: {selectedChartAccounts.map(id => bankAccounts.find(a => a.id === id)?.name).filter(Boolean).join(", ")}
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Add bank accounts in Settings to filter the chart
                      </p>
                    )}
                  </div>
                  {balances.length > 0 ? (
                    <BalanceChart data={balances} selectedAccountIds={selectedChartAccounts.length > 0 ? selectedChartAccounts : undefined} />
                  ) : (
                    <div className="h-64 flex items-center justify-center text-muted-foreground">
                      <p>Add monthly balances to see the trend chart</p>
                    </div>
                  )}
                </motion.div>
              )}

              {/* Spend & Save chart */}
              {spendSaveChartData.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.45 }}
                  className="glass-card"
                >
                  <h2 className="text-xl font-semibold text-white mb-4">Spend & Save</h2>
                  <p className="text-sm text-muted-foreground mb-4">
                    Monthly spend and save with 3‑month averages and trendlines (last 12 months).
                  </p>
                  <SpendSaveChart data={spendSaveChartData} />
                </motion.div>
              )}

              {/* Monthly summary table: one row per month */}
              {monthlySummaryRows.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="glass-card overflow-hidden"
                >
                  <h2 className="text-lg font-semibold text-white mb-4">Monthly summary</h2>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-white/10">
                          <th className="pb-3 pr-4 text-sm font-medium text-muted-foreground">Month</th>
                          <th className="pb-3 pr-4 text-sm font-medium text-muted-foreground text-right">Balance</th>
                          <th className="pb-3 pr-4 text-sm font-medium text-muted-foreground text-right">Income</th>
                          <th className="pb-3 pr-4 text-sm font-medium text-muted-foreground text-right">Spend</th>
                          <th className="pb-3 text-sm font-medium text-muted-foreground text-right">Savings</th>
                        </tr>
                      </thead>
                      <tbody>
                        {monthlySummaryRows.map((row) => (
                          <tr key={row.month_year} className="border-b border-white/5 hover:bg-white/5">
                            <td className="py-3 pr-4 text-white whitespace-nowrap">
                              {new Date(row.month_year).toLocaleDateString("en-AU", { month: "short", year: "numeric" })}
                            </td>
                            <td className="py-3 pr-4 text-right text-white tabular-nums">
                              ${row.balance.toLocaleString("en-AU", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                            </td>
                            <td className="py-3 pr-4 text-right text-emerald-400 tabular-nums">
                              ${row.income.toLocaleString("en-AU", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                            </td>
                            <td className="py-3 pr-4 text-right text-amber-400 tabular-nums">
                              {row.isOpeningMonth ? "—" : `$${row.expenses!.toLocaleString("en-AU", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
                            </td>
                            <td className="py-3 text-right tabular-nums">
                              {row.isOpeningMonth ? (
                                <span className="text-muted-foreground">—</span>
                              ) : (
                                <span className={row.savings! >= 0 ? "text-green-400" : "text-red-400"}>
                                  ${row.savings! >= 0 ? "+" : ""}
                                  {row.savings!.toLocaleString("en-AU", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </motion.div>
              )}

              {/* Empty State */}
              {balances.length === 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="glass-card text-center py-12"
                >
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/10 mb-4">
                    <Wallet className="w-8 h-8 text-white" strokeWidth={1.5} />
                  </div>
                  <p className="text-muted-foreground mb-4">No balance records yet</p>
                  <Button
                    onClick={() => { setEditingBalance(null); setIsDrawerOpen(true); }}
                    className="rounded-2xl"
                  >
                    <Plus className="w-4 h-4 mr-2" strokeWidth={1.5} />
                    Add Your First Balance
                  </Button>
                </motion.div>
              )}
            </div>
          )}

          {selectedTab === "accounts" && (
            <div className="space-y-6">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="glass-card"
              >
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-semibold text-white">Monthly Balances</h2>
                  <Button
                    onClick={() => { setEditingBalance(null); setIsDrawerOpen(true); }}
                    className="rounded-2xl bg-white text-[#09090b] hover:bg-white/90"
                  >
                    <Plus className="w-4 h-4 mr-2" strokeWidth={1.5} />
                    Add balance
                  </Button>
                </div>
                {balances.length > 0 ? (
                  <div className="space-y-4">
                    {balances.map((balance) => (
                    <div
                      key={balance.id}
                      className="p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold text-white">
                            {new Date(balance.month_year).toLocaleDateString("en-AU", {
                              day: "numeric",
                              month: "long",
                              year: "numeric",
                            })}
                          </h3>
                          {balance.bank_accounts && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {balance.bank_accounts.name}
                              {balance.bank_accounts.bank_name && ` • ${balance.bank_accounts.bank_name}`}
                            </p>
                          )}
                          {balance.notes && (
                            <p className="text-muted-foreground text-sm mt-1">{balance.notes}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-right">
                          <div className="text-right">
                            <p className="text-xl font-semibold text-white">
                              ${balance.balance.toLocaleString("en-AU", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                            </p>
                            {(Number(balance.interest_earned ?? 0)) > 0 && (
                              <p className="text-xs text-muted-foreground">Interest: ${Number(balance.interest_earned).toLocaleString("en-AU", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</p>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => { setEditingBalance(balance); setIsDrawerOpen(true); }}
                            className="rounded-xl text-muted-foreground hover:text-white shrink-0 h-8 w-8 p-0"
                            title="Edit balance"
                          >
                            <Pencil className="w-4 h-4" strokeWidth={1.5} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteBalance(balance)}
                            className="rounded-xl text-muted-foreground hover:text-red-400 shrink-0 h-8 w-8 p-0"
                            title="Remove balance"
                          >
                            <Trash2 className="w-4 h-4" strokeWidth={1.5} />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">No balance records yet</p>
                )}
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="glass-card"
              >
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-semibold text-white">Income by month</h2>
                  <Button
                    onClick={() => { setEditingIncome(null); setIsIncomeDrawerOpen(true); }}
                    className="rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white"
                  >
                    <Banknote className="w-4 h-4 mr-2" strokeWidth={1.5} />
                    Add income
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  Income is per month. Interest and one-off deposits are per account. Spend excludes one-offs so they don’t distort your numbers.
                </p>
                {incomes.length > 0 ? (
                  <div className="space-y-3">
                    {incomes.map((income) => {
                      const idx = sortedMonthKeys.indexOf(income.month_year);
                      const prevKey = idx >= 0 && idx < sortedMonthKeys.length - 1 ? sortedMonthKeys[idx + 1] : null;
                      const isOpeningMonth = prevKey === null;
                      const thisTotal = monthlyTotalByMonth.get(income.month_year) ?? 0;
                      const prevTotal = prevKey ? (monthlyTotalByMonth.get(prevKey) ?? 0) : 0;
                      const changeInBalance = thisTotal - prevTotal;
                      const totalInterest = interestByMonth.get(income.month_year) ?? 0;
                      const totalOneOff = oneOffByMonth.get(income.month_year) ?? 0;
                      const savings = isOpeningMonth ? null : changeInBalance - totalOneOff - totalInterest;
                      const expenses = isOpeningMonth ? null : Number(income.amount) - savings!;
                      return (
                        <div
                          key={income.id}
                          className="p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
                        >
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <div>
                              <p className="font-medium text-white">
                                {new Date(income.month_year).toLocaleDateString("en-AU", {
                                  month: "long",
                                  year: "numeric",
                                })}
                              </p>
                              {income.notes && (
                                <p className="text-sm text-muted-foreground mt-1">{income.notes}</p>
                              )}
                            </div>
                            <div className="flex items-center gap-4 text-right flex-wrap">
                              <span className="text-emerald-400 font-semibold">
                                Income: ${Number(income.amount).toLocaleString("en-AU", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                              </span>
                              {(totalInterest ?? 0) > 0 && (
                                <span className="text-muted-foreground text-sm">
                                  Interest: ${Number(totalInterest).toLocaleString("en-AU", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                </span>
                              )}
                              {(totalOneOff ?? 0) > 0 && (
                                <span className="text-muted-foreground text-sm">
                                  One-off: ${Number(totalOneOff).toLocaleString("en-AU", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                </span>
                              )}
                              <span className="text-amber-400 font-semibold">
                                Spend: {expenses === null ? "— (opening month)" : `$${expenses.toLocaleString("en-AU", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
                              </span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => { setEditingIncome(income); setIsIncomeDrawerOpen(true); }}
                                className="rounded-xl text-muted-foreground hover:text-white shrink-0 h-8 w-8 p-0"
                                title="Edit income"
                              >
                                <Pencil className="w-4 h-4" strokeWidth={1.5} />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteIncome(income)}
                                className="rounded-xl text-muted-foreground hover:text-red-400 shrink-0 h-8 w-8 p-0"
                                title="Remove income"
                              >
                                <Trash2 className="w-4 h-4" strokeWidth={1.5} />
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-muted-foreground">No income recorded yet. Click &quot;Add income&quot; to record income and interest for a month.</p>
                )}
              </motion.div>
            </div>
          )}

          {selectedTab === "analytics" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="glass-card"
            >
              <h2 className="text-2xl font-semibold text-white mb-6">Analytics</h2>
              <p className="text-muted-foreground">Analytics dashboard coming soon...</p>
            </motion.div>
          )}
        </motion.div>
      </div>

      {/* Quick Add / Edit Balance Drawer */}
      <QuickAddDrawer
        open={isDrawerOpen}
        onOpenChange={(open) => { setIsDrawerOpen(open); if (!open) setEditingBalance(null); }}
        onSuccess={refreshBalances}
        initialBalance={editingBalance ?? undefined}
      />

      {/* Add / Edit Income Drawer */}
      <AddIncomeDrawer
        open={isIncomeDrawerOpen}
        onOpenChange={(open) => { setIsIncomeDrawerOpen(open); if (!open) setEditingIncome(null); }}
        onSuccess={refreshBalances}
        existing={editingIncome ?? undefined}
      />
    </div>
  );
}

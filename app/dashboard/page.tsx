"use client";

import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { signOut } from "@/app/actions/auth";
import { deleteMonthlyBalance } from "@/app/actions/balances";
import { deleteMonthlyIncome } from "@/app/actions/income";
import { Button } from "@/components/ui/button";
import { BalanceChart } from "@/components/dashboard/balance-chart";
import { SpendSaveChart } from "@/components/dashboard/spend-save-chart";
import { QuickAddDrawer } from "@/components/dashboard/quick-add-drawer";
import { AddIncomeDrawer } from "@/components/dashboard/add-income-drawer";
import { Wallet, TrendingUp, TrendingDown, Plus, LogOut, Calendar, Target, TrendingUp as TrendingUpIcon, Settings, Banknote, Receipt, Pencil, Trash2, Minus, HelpCircle, PiggyBank, AlertTriangle, X, Sparkles, Download, BookOpen } from "lucide-react";
import Link from "next/link";
import { exportToExcel } from "@/lib/export-excel";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";

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
  const [summaryTableExpanded, setSummaryTableExpanded] = useState(false);
  const [balancesListExpanded, setBalancesListExpanded] = useState(false);
  const [incomeListExpanded, setIncomeListExpanded] = useState(false);
  const [selectedViewMonth, setSelectedViewMonth] = useState<string | null>(null);
  const [spendingWarningDismissed, setSpendingWarningDismissed] = useState(false);
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

  // Tables: sort by month desc (newest first)
  const sortedBalancesByMonthDesc = useMemo(
    () => [...balances].sort((a, b) => new Date(b.month_year).getTime() - new Date(a.month_year).getTime()),
    [balances]
  );
  const sortedIncomesByMonthDesc = useMemo(
    () => [...incomes].sort((a, b) => new Date(b.month_year).getTime() - new Date(a.month_year).getTime()),
    [incomes]
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

  // When a month is selected, restrict to data up to that month for averages and trends
  const monthlySummaryRowsView = useMemo(
    () =>
      selectedViewMonth
        ? monthlySummaryRows.filter((r) => r.month_year <= selectedViewMonth)
        : monthlySummaryRows,
    [monthlySummaryRows, selectedViewMonth]
  );
  const withExpensesView = useMemo(
    () => monthlySummaryRowsView.filter((r) => r.expenses !== null) as { expenses: number }[],
    [monthlySummaryRowsView]
  );
  const withSavingsView = useMemo(
    () => monthlySummaryRowsView.filter((r) => r.savings !== null) as { savings: number }[],
    [monthlySummaryRowsView]
  );

  const avgSpend3Month = withExpensesView.length >= 1 ? withExpensesView.slice(0, 3).reduce((a, r) => a + r.expenses, 0) / Math.min(3, withExpensesView.length) : null;
  const avgSpend6Month = withExpensesView.length >= 1 ? withExpensesView.slice(0, 6).reduce((a, r) => a + r.expenses, 0) / Math.min(6, withExpensesView.length) : null;
  const avgSpend12Month = withExpensesView.length >= 1 ? withExpensesView.slice(0, 12).reduce((a, r) => a + r.expenses, 0) / Math.min(12, withExpensesView.length) : null;

  const avgSave3Month = withSavingsView.length >= 1 ? withSavingsView.slice(0, 3).reduce((a, r) => a + r.savings, 0) / Math.min(3, withSavingsView.length) : null;
  const avgSave6Month = withSavingsView.length >= 1 ? withSavingsView.slice(0, 6).reduce((a, r) => a + r.savings, 0) / Math.min(6, withSavingsView.length) : null;
  const avgSave12Month = withSavingsView.length >= 1 ? withSavingsView.slice(0, 12).reduce((a, r) => a + r.savings, 0) / Math.min(12, withSavingsView.length) : null;

  // Avg save % and spend % of income (last 12 months) for Analytics pie chart
  const analyticsSaveSpendPie = useMemo(() => {
    const rows = monthlySummaryRows.filter((r) => r.income > 0 && r.savings != null && r.expenses != null).slice(0, 12);
    if (rows.length === 0) return null;
    const totalIncome = rows.reduce((a, r) => a + r.income, 0);
    const totalSpend = rows.reduce((a, r) => a + (r.expenses ?? 0), 0);
    const totalSave = rows.reduce((a, r) => a + (r.savings ?? 0), 0);
    if (totalIncome <= 0) return null;
    const spendPct = (totalSpend / totalIncome) * 100;
    const savePct = (totalSave / totalIncome) * 100;
    return [
      { name: "Spend", value: Math.round(spendPct * 10) / 10, color: "#f59e0b" },
      { name: "Save", value: Math.round(savePct * 10) / 10, color: "#38bdf8" },
    ];
  }, [monthlySummaryRows]);

  // Trend: 1 = up, -1 = down, 0 = flat, null = not enough data (compare recent period vs prior period)
  const spend3Trend = useMemo(() => {
    if (withExpensesView.length < 6) return null;
    const r = withExpensesView.slice(0, 3).reduce((a, x) => a + x.expenses, 0) / 3;
    const p = withExpensesView.slice(3, 6).reduce((a, x) => a + x.expenses, 0) / 3;
    return r > p ? 1 : r < p ? -1 : 0;
  }, [withExpensesView]);
  const spend6Trend = useMemo(() => {
    if (withExpensesView.length < 12) return null;
    const r = withExpensesView.slice(0, 6).reduce((a, x) => a + x.expenses, 0) / 6;
    const p = withExpensesView.slice(6, 12).reduce((a, x) => a + x.expenses, 0) / 6;
    return r > p ? 1 : r < p ? -1 : 0;
  }, [withExpensesView]);
  const save3Trend = useMemo(() => {
    if (withSavingsView.length < 6) return null;
    const r = withSavingsView.slice(0, 3).reduce((a, x) => a + x.savings, 0) / 3;
    const p = withSavingsView.slice(3, 6).reduce((a, x) => a + x.savings, 0) / 3;
    return r > p ? 1 : r < p ? -1 : 0;
  }, [withSavingsView]);
  const save6Trend = useMemo(() => {
    if (withSavingsView.length < 12) return null;
    const r = withSavingsView.slice(0, 6).reduce((a, x) => a + x.savings, 0) / 6;
    const p = withSavingsView.slice(6, 12).reduce((a, x) => a + x.savings, 0) / 6;
    return r > p ? 1 : r < p ? -1 : 0;
  }, [withSavingsView]);
  const save12Trend = useMemo(() => {
    if (withSavingsView.length < 24) return null;
    const r = withSavingsView.slice(0, 12).reduce((a, x) => a + x.savings, 0) / 12;
    const p = withSavingsView.slice(12, 24).reduce((a, x) => a + x.savings, 0) / 12;
    return r > p ? 1 : r < p ? -1 : 0;
  }, [withSavingsView]);

  // Annual projection: use 12 month avg save × 12 when available so it matches that card
  const displayProjection = avgSave12Month != null ? avgSave12Month * 12 : metrics.annualProjection;

  // View month for cards/chart: selected or latest
  const viewMonth = selectedViewMonth ?? metrics.currentMonthYear;
  const viewPreviousMonth = viewMonth ? sortedMonthKeys[sortedMonthKeys.indexOf(viewMonth) + 1] ?? null : null;
  const viewTotalBalance = viewMonth ? (monthlyTotalByMonth.get(viewMonth) ?? 0) : 0;
  const viewPreviousBalance = viewPreviousMonth
    ? { month_year: viewPreviousMonth, balance: monthlyTotalByMonth.get(viewPreviousMonth) ?? 0 }
    : null;
  const currentMonthYear = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;
  // Normalise to YYYY-MM (month_year can be "2024-03" or "2024-03-15") and format safely
  const viewMonthNorm = viewMonth ? viewMonth.slice(0, 7) : "";
  const viewMonthLabel = (() => {
    if (!viewMonthNorm || viewMonthNorm.length < 7) return "this month";
    if (viewMonthNorm === currentMonthYear) return "this month";
    const d = new Date(viewMonthNorm + "-01");
    if (Number.isNaN(d.getTime())) return "this month";
    return d.toLocaleDateString("en-AU", { month: "long", year: "numeric" });
  })();

  // Trend vs previous month for "this month" cards (1 = up, -1 = down, 0 = flat, null = no data)
  const spendThisMonthTrend = useMemo(() => {
    const viewRow = monthlySummaryRows.find((r) => r.month_year === viewMonth);
    const prevRow = viewPreviousMonth ? monthlySummaryRows.find((r) => r.month_year === viewPreviousMonth) : null;
    if (viewRow?.expenses == null || prevRow?.expenses == null) return null;
    return viewRow.expenses > prevRow.expenses ? 1 : viewRow.expenses < prevRow.expenses ? -1 : 0;
  }, [monthlySummaryRows, viewMonth, viewPreviousMonth]);
  const incomeThisMonthTrend = useMemo(() => {
    const viewAmt = incomes.find((i) => i.month_year === viewMonth)?.amount ?? null;
    const prevAmt = viewPreviousMonth ? (incomes.find((i) => i.month_year === viewPreviousMonth)?.amount ?? null) : null;
    if (viewAmt == null || prevAmt == null) return null;
    return viewAmt > prevAmt ? 1 : viewAmt < prevAmt ? -1 : 0;
  }, [incomes, viewMonth, viewPreviousMonth]);
  const savingsThisMonthTrend = useMemo(() => {
    const viewRow = monthlySummaryRows.find((r) => r.month_year === viewMonth);
    const prevRow = viewPreviousMonth ? monthlySummaryRows.find((r) => r.month_year === viewPreviousMonth) : null;
    if (viewRow?.savings == null || prevRow?.savings == null) return null;
    return viewRow.savings > prevRow.savings ? 1 : viewRow.savings < prevRow.savings ? -1 : 0;
  }, [monthlySummaryRows, viewMonth, viewPreviousMonth]);

  // View month: income, save, spend and % of income (for Spend and Save cards)
  const viewMonthIncome = useMemo(
    () => Number(incomes.find((i) => i.month_year === viewMonth)?.amount ?? 0),
    [incomes, viewMonth]
  );
  const viewMonthSave = useMemo(() => {
    if (!viewMonth) return 0;
    const interest = interestByMonth.get(viewMonth) ?? 0;
    const oneOff = oneOffByMonth.get(viewMonth) ?? 0;
    const changeInBalance = viewTotalBalance - (viewPreviousBalance?.balance ?? 0);
    return changeInBalance - oneOff - interest;
  }, [viewMonth, viewPreviousBalance?.balance, viewTotalBalance, interestByMonth, oneOffByMonth]);
  const viewMonthSpend = viewMonthIncome - viewMonthSave;
  const spendPctOfIncome = viewMonthIncome > 0 ? (viewMonthSpend / viewMonthIncome) * 100 : null;
  const savePctOfIncome = viewMonthIncome > 0 ? (viewMonthSave / viewMonthIncome) * 100 : null;

  // Gentle warning when viewing latest: spending has been rising or savings slipping vs prior 3 months (takes priority)
  const showSpendingRisingWarning = useMemo(() => {
    if (selectedViewMonth !== null) return false; // only when viewing "Latest"
    if (withExpensesView.length < 6) return false; // need 6 months for 3m vs 3m
    return spend3Trend === 1 || save3Trend === -1; // spend up or savings down lately
  }, [selectedViewMonth, withExpensesView.length, spend3Trend, save3Trend]);

  // Encouragement when savings are going well (only when we're not showing the warning — warnings take priority)
  const showSavingsEncouragement = useMemo(() => {
    if (showSpendingRisingWarning) return false; // never show congrats when warning applies
    if (selectedViewMonth !== null) return false;
    if (withExpensesView.length < 6) return false;
    return save3Trend === 1 || spend3Trend === -1; // savings up or spending down lately
  }, [showSpendingRisingWarning, selectedViewMonth, withExpensesView.length, save3Trend, spend3Trend]);

  // Persist dismiss in session so it stays dismissed for this tab/session
  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = sessionStorage.getItem("dashboardSpendingWarningDismissed");
    if (stored === "1") setSpendingWarningDismissed(true);
  }, []);
  function dismissSpendingWarning() {
    setSpendingWarningDismissed(true);
    if (typeof window !== "undefined") sessionStorage.setItem("dashboardSpendingWarningDismissed", "1");
  }

  // Spend & save chart data: when a month is selected, last 12 months up to that month; else last 12
  const spendSaveChartData = useMemo(() => {
    const rows = monthlySummaryRows.map((r) => ({
      month_year: r.month_year,
      spend: r.expenses,
      save: r.savings,
    }));
    if (selectedViewMonth) {
      const filtered = rows.filter((r) => r.month_year <= selectedViewMonth);
      return filtered.slice(0, 12);
    }
    return rows.slice(0, 12);
  }, [monthlySummaryRows, selectedViewMonth]);

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
    <div className="min-h-screen bg-[#09090b] p-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[env(safe-area-inset-top)] md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header — title left, Settings & Sign Out right-justified on first line */}
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="mb-6 md:mb-8 flex flex-row items-center justify-between gap-3"
        >
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-semibold text-white mb-1 md:mb-2 truncate">Bank Balance</h1>
            <p className="text-sm text-muted-foreground hidden sm:block">Track your finances across all accounts</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0 ml-auto">
            <Link href="/blog">
              <Button
                variant="ghost"
                size="sm"
                className="rounded-2xl text-muted-foreground hover:text-white px-3 md:px-4"
              >
                <BookOpen className="w-4 h-4 sm:mr-2" strokeWidth={1.5} />
                <span className="hidden sm:inline">Tips</span>
              </Button>
            </Link>
            <Button
              onClick={() => router.push("/help")}
              variant="ghost"
              size="sm"
              className="rounded-2xl text-muted-foreground hover:text-white px-3 md:px-4"
            >
              <HelpCircle className="w-4 h-4 sm:mr-2" strokeWidth={1.5} />
              <span className="hidden sm:inline">Help</span>
            </Button>
            <Button
              onClick={() => router.push("/settings")}
              variant="ghost"
              size="sm"
              className="rounded-2xl text-muted-foreground hover:text-white px-3 md:px-4"
            >
              <Settings className="w-4 h-4 sm:mr-2" strokeWidth={1.5} />
              <span className="hidden sm:inline">Settings</span>
            </Button>
            <Button
              onClick={handleSignOut}
              variant="ghost"
              size="sm"
              className="rounded-2xl text-muted-foreground hover:text-white px-3 md:px-4"
            >
              <LogOut className="w-4 h-4 sm:mr-2" strokeWidth={1.5} />
              <span className="hidden sm:inline">Sign Out</span>
            </Button>
          </div>
        </motion.header>

        {/* Quick actions: Add balance & Add income */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.05 }}
          className="flex flex-wrap items-center gap-2 mb-4 md:mb-6"
        >
          <Button
            variant="outline"
            size="sm"
            onClick={() => { setEditingBalance(null); setIsDrawerOpen(true); }}
            className="rounded-xl border-white/20 text-muted-foreground hover:text-white shrink-0"
          >
            <Plus className="w-4 h-4 mr-2" strokeWidth={1.5} />
            Add balance
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => { setEditingIncome(null); setIsIncomeDrawerOpen(true); }}
            className="rounded-xl border-white/20 text-muted-foreground hover:text-white shrink-0"
          >
            <Banknote className="w-4 h-4 mr-2" strokeWidth={1.5} />
            Add income
          </Button>
        </motion.div>

        {/* Navigation Tabs — compact on mobile */}
        <motion.nav
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="flex flex-wrap gap-2 mb-6 md:mb-8"
        >
          {[
            { id: "overview", label: "Overview" },
            { id: "accounts", label: "Accounts" },
            { id: "analytics", label: "Analytics" },
          ].map((tab) => (
            <motion.button
              key={tab.id}
              onClick={() => setSelectedTab(tab.id as typeof selectedTab)}
              className={`px-4 py-2.5 sm:px-6 sm:py-3 rounded-2xl font-medium transition-all text-sm sm:text-base ${
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
              {/* Month selector: view cards and chart for a specific month */}
              {(sortedMonthKeys.length > 0 || (incomes.length > 0 && monthlySummaryRows.length > 0)) && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-wrap items-center gap-3"
                >
                  <label htmlFor="view-month" className="text-sm font-medium text-muted-foreground">
                    View month
                  </label>
                  <select
                    id="view-month"
                    value={selectedViewMonth ?? ""}
                    onChange={(e) => setSelectedViewMonth(e.target.value || null)}
                    className="rounded-xl bg-white/5 border border-white/10 text-white px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-white/20 [color-scheme:dark]"
                    style={{ colorScheme: "dark" }}
                  >
                    <option value="" style={{ backgroundColor: "#09090b", color: "#ffffff" }}>
                      Latest
                    </option>
                    {monthlySummaryRows.map((row) => {
                      const norm = row.month_year.slice(0, 7);
                      const d = norm.length === 7 ? new Date(norm + "-01") : null;
                      const label = d && !Number.isNaN(d.getTime()) ? d.toLocaleDateString("en-AU", { month: "long", year: "numeric" }) : row.month_year;
                      return (
                        <option
                          key={row.month_year}
                          value={row.month_year}
                          style={{ backgroundColor: "#09090b", color: "#ffffff" }}
                        >
                          {label}
                        </option>
                      );
                    })}
                  </select>
                </motion.div>
              )}

              {/* Gentle nudge when spending is rising or savings slipping lately */}
              {showSpendingRisingWarning && !spendingWarningDismissed && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-start gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20"
                >
                  <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" strokeWidth={1.5} />
                  <p className="text-sm text-muted-foreground flex-1 min-w-0">
                    <span className="font-medium text-amber-200">Heads up —</span>{" "}
                    {spend3Trend === 1 && save3Trend === -1
                      ? "Your spending has been a bit higher lately and savings a bit lower compared to the previous 3 months. Small tweaks can help keep you on track."
                      : spend3Trend === 1
                        ? "Your spending has been a bit higher lately compared to the previous 3 months. Small tweaks can help keep you on track."
                        : "Your savings have been a bit lower lately compared to the previous 3 months. Small tweaks can help keep you on track."}
                  </p>
                  <button
                    type="button"
                    onClick={dismissSpendingWarning}
                    className="p-1.5 rounded-lg text-amber-400/80 hover:text-amber-200 hover:bg-amber-500/20 transition-colors shrink-0"
                    aria-label="Dismiss warning"
                  >
                    <X className="w-4 h-4" strokeWidth={1.5} />
                  </button>
                </motion.div>
              )}

              {/* Encouragement when savings are going well (only when warning isn't shown) */}
              {showSavingsEncouragement && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-start gap-3 p-4 rounded-xl bg-sky-500/10 border border-sky-500/20"
                >
                  <Sparkles className="w-5 h-5 text-sky-400 shrink-0 mt-0.5" strokeWidth={1.5} />
                  <p className="text-sm text-muted-foreground flex-1 min-w-0">
                    <span className="font-medium text-sky-200">Nice going —</span>{" "}
                    {save3Trend === 1 && spend3Trend === -1
                      ? "Your savings have been up and spending down compared to the previous 3 months. You're on track."
                      : save3Trend === 1
                        ? "Your savings have been higher lately compared to the previous 3 months. Keep it up."
                        : "Your spending has been lower lately compared to the previous 3 months. Great progress."}
                  </p>
                </motion.div>
              )}

              {/* Metrics — order: Spend, Save, 3M spend, 3M save, 6M spend, 6M save, Income, Bank balance, Annual Projection */}
              {(balances.length > 0 || incomes.length > 0) && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 [&>div]:min-w-0"
                >
                  {/* 1. Spend this month */}
                  {viewMonth && (
                    <div className="glass-card p-4 sm:p-6">
                      <div className="flex items-center justify-between gap-2 mb-2 sm:mb-3">
                        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                          <div className="p-1.5 sm:p-2 rounded-xl bg-white/10 shrink-0">
                            <Receipt className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400" strokeWidth={1.5} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs sm:text-sm text-muted-foreground">Spend ({viewMonthLabel})</p>
                            <p className="text-xl sm:text-2xl font-semibold text-white tabular-nums break-words">
                              ${viewMonthSpend.toLocaleString("en-AU", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                            </p>
                          </div>
                        </div>
                        {spendThisMonthTrend !== null && (
                          <span className="flex items-center gap-0.5 shrink-0" title={spendThisMonthTrend === 1 ? "Up vs prior month" : spendThisMonthTrend === -1 ? "Down vs prior month" : "Flat"}>
                            {spendThisMonthTrend === 1 ? <TrendingUp className="w-4 h-4 text-red-400" /> : spendThisMonthTrend === -1 ? <TrendingDown className="w-4 h-4 text-sky-400" /> : <Minus className="w-4 h-4 text-muted-foreground" />}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {spendThisMonthTrend !== null ? "vs prior month" : "Income − savings"}
                        {spendPctOfIncome != null && ` · ${spendPctOfIncome.toFixed(0)}% of income`}
                      </p>
                    </div>
                  )}

                  {/* 2. Save this month */}
                  {viewMonth && viewPreviousBalance && (
                    <div className="glass-card p-4 sm:p-6">
                      <div className="flex items-center justify-between gap-2 mb-2 sm:mb-3">
                        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                          <div className="p-1.5 sm:p-2 rounded-xl bg-white/10 shrink-0">
                            <PiggyBank className="w-4 h-4 sm:w-5 sm:h-5 text-sky-400" strokeWidth={1.5} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs sm:text-sm text-muted-foreground">Savings ({viewMonthLabel})</p>
                            <p className={`text-xl sm:text-2xl font-semibold tabular-nums break-words ${viewMonthSave >= 0 ? "text-sky-400" : "text-red-400"}`}>
                              {viewMonthSave >= 0 ? "+" : ""}${viewMonthSave.toLocaleString("en-AU", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                            </p>
                          </div>
                        </div>
                        {savingsThisMonthTrend !== null && (
                          <span className="flex items-center gap-0.5 shrink-0" title={savingsThisMonthTrend === 1 ? "Up vs prior month" : savingsThisMonthTrend === -1 ? "Down vs prior month" : "Flat"}>
                            {savingsThisMonthTrend === 1 ? <TrendingUp className="w-4 h-4 text-sky-400" /> : savingsThisMonthTrend === -1 ? <TrendingDown className="w-4 h-4 text-red-400" /> : <Minus className="w-4 h-4 text-muted-foreground" />}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {savingsThisMonthTrend !== null ? "vs prior month" : "Balance change − one-off − interest"}
                        {savePctOfIncome != null && ` · ${savePctOfIncome.toFixed(0)}% of income`}
                      </p>
                    </div>
                  )}

                  {/* 3. 3 month avg spend */}
                  {avgSpend3Month !== null && (
                    <div className="glass-card p-4 sm:p-6">
                      <div className="flex items-center justify-between gap-2 mb-2 sm:mb-3">
                        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                          <div className="p-1.5 sm:p-2 rounded-xl bg-white/10 shrink-0">
                            <Receipt className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400/80" strokeWidth={1.5} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs sm:text-sm text-muted-foreground">3 month avg spend</p>
                            <p className="text-xl sm:text-2xl font-semibold text-white tabular-nums break-words">
                              ${avgSpend3Month.toLocaleString("en-AU", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                            </p>
                          </div>
                        </div>
                        {spend3Trend !== null && (
                          <span className="flex items-center gap-0.5 shrink-0" title={spend3Trend === 1 ? "Up vs prior 3m" : spend3Trend === -1 ? "Down vs prior 3m" : "Flat"}>
                            {spend3Trend === 1 ? <TrendingUp className="w-4 h-4 text-red-400" /> : spend3Trend === -1 ? <TrendingDown className="w-4 h-4 text-sky-400" /> : <Minus className="w-4 h-4 text-muted-foreground" />}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{spend3Trend !== null ? "vs prior 3m" : "Avg monthly spend"}</p>
                    </div>
                  )}

                  {/* 4. 3 month avg save */}
                  {avgSave3Month !== null && (
                    <div className="glass-card p-4 sm:p-6">
                      <div className="flex items-center justify-between gap-2 mb-2 sm:mb-3">
                        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                          <div className="p-1.5 sm:p-2 rounded-xl bg-white/10 shrink-0">
                            <PiggyBank className="w-4 h-4 sm:w-5 sm:h-5 text-sky-400" strokeWidth={1.5} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs sm:text-sm text-muted-foreground">3 month avg save</p>
                            <p className={`text-xl sm:text-2xl font-semibold tabular-nums break-words ${avgSave3Month >= 0 ? "text-sky-400" : "text-red-400"}`}>
                              {avgSave3Month >= 0 ? "+" : ""}
                              ${avgSave3Month.toLocaleString("en-AU", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                            </p>
                          </div>
                        </div>
                        {save3Trend !== null && (
                          <span className="flex items-center gap-0.5 shrink-0" title={save3Trend === 1 ? "Up vs prior 3m" : save3Trend === -1 ? "Down vs prior 3m" : "Flat"}>
                            {save3Trend === 1 ? <TrendingUp className="w-4 h-4 text-sky-400" /> : save3Trend === -1 ? <TrendingDown className="w-4 h-4 text-red-400" /> : <Minus className="w-4 h-4 text-muted-foreground" />}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{save3Trend !== null ? "vs prior 3m" : "Avg monthly savings"}</p>
                    </div>
                  )}

                  {/* 5. 6 month avg spend */}
                  {avgSpend6Month !== null && (
                    <div className="glass-card p-4 sm:p-6">
                      <div className="flex items-center justify-between gap-2 mb-2 sm:mb-3">
                        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                          <div className="p-1.5 sm:p-2 rounded-xl bg-white/10 shrink-0">
                            <Receipt className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400/70" strokeWidth={1.5} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs sm:text-sm text-muted-foreground">6 month avg spend</p>
                            <p className="text-xl sm:text-2xl font-semibold text-white tabular-nums break-words">
                              ${avgSpend6Month.toLocaleString("en-AU", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                            </p>
                          </div>
                        </div>
                        {spend6Trend !== null && (
                          <span className="flex items-center gap-0.5 shrink-0" title={spend6Trend === 1 ? "Up vs prior 6m" : spend6Trend === -1 ? "Down vs prior 6m" : "Flat"}>
                            {spend6Trend === 1 ? <TrendingUp className="w-4 h-4 text-red-400" /> : spend6Trend === -1 ? <TrendingDown className="w-4 h-4 text-sky-400" /> : <Minus className="w-4 h-4 text-muted-foreground" />}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{spend6Trend !== null ? "vs prior 6m" : "Avg monthly spend"}</p>
                    </div>
                  )}

                  {/* 6. 6 month avg save */}
                  {avgSave6Month !== null && (
                    <div className="glass-card p-4 sm:p-6">
                      <div className="flex items-center justify-between gap-2 mb-2 sm:mb-3">
                        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                          <div className="p-1.5 sm:p-2 rounded-xl bg-white/10 shrink-0">
                            <PiggyBank className="w-4 h-4 sm:w-5 sm:h-5 text-sky-400/90" strokeWidth={1.5} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs sm:text-sm text-muted-foreground">6 month avg save</p>
                            <p className={`text-xl sm:text-2xl font-semibold tabular-nums break-words ${avgSave6Month >= 0 ? "text-sky-400" : "text-red-400"}`}>
                              {avgSave6Month >= 0 ? "+" : ""}
                              ${avgSave6Month.toLocaleString("en-AU", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                            </p>
                          </div>
                        </div>
                        {save6Trend !== null && (
                          <span className="flex items-center gap-0.5 shrink-0" title={save6Trend === 1 ? "Up vs prior 6m" : save6Trend === -1 ? "Down vs prior 6m" : "Flat"}>
                            {save6Trend === 1 ? <TrendingUp className="w-4 h-4 text-sky-400" /> : save6Trend === -1 ? <TrendingDown className="w-4 h-4 text-red-400" /> : <Minus className="w-4 h-4 text-muted-foreground" />}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{save6Trend !== null ? "vs prior 6m" : "Avg monthly savings"}</p>
                    </div>
                  )}

                  {/* 7. Income this month */}
                  <div className="glass-card p-4 sm:p-6 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-2 sm:mb-3">
                      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                        <div className="p-1.5 sm:p-2 rounded-xl bg-white/10 shrink-0">
                          <Banknote className="w-4 h-4 sm:w-5 sm:h-5 text-sky-400" strokeWidth={1.5} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs sm:text-sm text-muted-foreground">Income ({viewMonthLabel})</p>
                          <p className="text-xl sm:text-2xl font-semibold text-white tabular-nums whitespace-nowrap overflow-hidden text-ellipsis" title={`$${(incomes.find((i) => i.month_year === (viewMonth ?? incomes[0]?.month_year))?.amount ?? 0).toLocaleString("en-AU", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}>
                            ${(incomes.find((i) => i.month_year === (viewMonth ?? incomes[0]?.month_year))?.amount ?? 0).toLocaleString("en-AU", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                          </p>
                        </div>
                      </div>
                      {incomeThisMonthTrend !== null && (
                        <span className="flex items-center gap-0.5 shrink-0" title={incomeThisMonthTrend === 1 ? "Up vs prior month" : incomeThisMonthTrend === -1 ? "Down vs prior month" : "Flat"}>
                          {incomeThisMonthTrend === 1 ? <TrendingUp className="w-4 h-4 text-sky-400" /> : incomeThisMonthTrend === -1 ? <TrendingDown className="w-4 h-4 text-red-400" /> : <Minus className="w-4 h-4 text-muted-foreground" />}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {(() => {
                        const m = viewMonth ?? incomes[0]?.month_year ?? "";
                        const norm = m ? m.slice(0, 7) : "";
                        const d = norm.length === 7 ? new Date(norm + "-01") : null;
                        const label = d && !Number.isNaN(d.getTime()) ? d.toLocaleDateString("en-AU", { month: "long", year: "numeric" }) : null;
                        return label ?? "Record income separately from balances (no account).";
                      })()}
                    </p>
                  </div>

                  {/* 8. Bank balance */}
                  <div className="glass-card p-4 sm:p-6 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-2 sm:mb-3">
                      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                        <div className="p-1.5 sm:p-2 rounded-xl bg-white/10 shrink-0">
                          <Wallet className="w-4 h-4 sm:w-5 sm:h-5 text-sky-400" strokeWidth={1.5} />
                        </div>
                        <div className="min-w-0 overflow-hidden">
                          <p className="text-xs sm:text-sm text-muted-foreground">
                            Bank Balance{viewMonthLabel !== "this month" ? ` (${viewMonthLabel})` : ""}
                          </p>
                          <p className="text-xl sm:text-2xl font-semibold text-white tabular-nums whitespace-nowrap overflow-hidden text-ellipsis" title={`$${(viewMonth ? viewTotalBalance : metrics.totalBalance).toLocaleString("en-AU", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}>
                            ${(viewMonth ? viewTotalBalance : metrics.totalBalance).toLocaleString("en-AU", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                          </p>
                        </div>
                      </div>
                    </div>
                    {metrics.currentBalance?.updated_at ? (
                      <p className="text-xs text-muted-foreground">
                        Last updated: {new Date(metrics.currentBalance.updated_at).toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" })}
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground">Total across all accounts</p>
                    )}
                  </div>

                  {/* 9. Annual Projection */}
                  <div className="glass-card p-4 sm:p-6">
                    <div className="flex items-center justify-between gap-2 mb-2 sm:mb-3">
                      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                        <div className="p-1.5 sm:p-2 rounded-xl bg-white/10 shrink-0">
                          <Target className="w-4 h-4 sm:w-5 sm:h-5 text-sky-400" strokeWidth={1.5} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs sm:text-sm text-muted-foreground">Annual Projection</p>
                          <p className={`text-xl sm:text-2xl font-semibold tabular-nums break-words ${displayProjection >= 0 ? "text-sky-400" : "text-red-400"}`}>
                            {displayProjection >= 0 ? "+" : ""}
                            ${displayProjection.toLocaleString("en-AU", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                          </p>
                        </div>
                      </div>
                      {save12Trend !== null && (
                        <span className="flex items-center gap-0.5 shrink-0" title={save12Trend === 1 ? "Up vs prior 12m" : save12Trend === -1 ? "Down vs prior 12m" : "Flat"}>
                          {save12Trend === 1 ? <TrendingUp className="w-4 h-4 text-sky-400" /> : save12Trend === -1 ? <TrendingDown className="w-4 h-4 text-red-400" /> : <Minus className="w-4 h-4 text-muted-foreground" />}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {save12Trend !== null ? "vs prior 12m" : avgSave12Month != null ? "12 month avg save × 12" : "Avg monthly savings × 12"}
                    </p>
                  </div>
                </motion.div>
              )}

              {/* Spend & Save chart */}
              {spendSaveChartData.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="glass-card p-4 sm:p-6"
                >
                  <h2 className="text-lg sm:text-xl font-semibold text-white mb-3 sm:mb-4">Spend & Save</h2>
                  <p className="text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4">
                    Monthly spend and save with trendlines (last 12 months).
                  </p>
                  <SpendSaveChart data={spendSaveChartData} />
                </motion.div>
              )}

              {/* Balance Trend Chart */}
              {(balances.length > 0 || bankAccounts.length > 0) && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="glass-card p-4 sm:p-6"
                >
                  <div className="mb-4 sm:mb-6">
                    <h2 className="text-lg sm:text-xl font-semibold text-white mb-3 sm:mb-4">12-Month Trend</h2>
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
                                  style={{ backgroundColor: account.color || "#38bdf8" }}
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

              {/* Monthly summary table: one row per month */}
              {monthlySummaryRows.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="glass-card overflow-hidden p-4 sm:p-6"
                >
                  <h2 className="text-base sm:text-lg font-semibold text-white mb-3 sm:mb-4">Monthly summary</h2>
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
                        {(summaryTableExpanded ? monthlySummaryRows : monthlySummaryRows.slice(0, 5)).map((row) => (
                          <tr key={row.month_year} className="border-b border-white/5 hover:bg-white/5">
                            <td className="py-3 pr-4 text-white whitespace-nowrap">
                              {new Date(row.month_year).toLocaleDateString("en-AU", { month: "short", year: "numeric" })}
                            </td>
                            <td className="py-3 pr-4 text-right text-white tabular-nums">
                              ${row.balance.toLocaleString("en-AU", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                            </td>
                            <td className="py-3 pr-4 text-right text-sky-400 tabular-nums">
                              ${row.income.toLocaleString("en-AU", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                            </td>
                            <td className="py-3 pr-4 text-right text-amber-400 tabular-nums">
                              {row.isOpeningMonth ? "—" : `$${row.expenses!.toLocaleString("en-AU", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
                            </td>
                            <td className="py-3 text-right tabular-nums">
                              {row.isOpeningMonth ? (
                                <span className="text-muted-foreground">—</span>
                              ) : (
                                <span className={row.savings! >= 0 ? "text-sky-400" : "text-red-400"}>
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
                  {monthlySummaryRows.length > 5 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSummaryTableExpanded((e) => !e)}
                      className="mt-3 w-full rounded-xl text-muted-foreground hover:text-white"
                    >
                      {summaryTableExpanded ? (
                        <>
                          <Minus className="w-4 h-4 mr-2" />
                          Show less
                        </>
                      ) : (
                        <>
                          <Plus className="w-4 h-4 mr-2" />
                          Show more ({monthlySummaryRows.length - 5} more)
                        </>
                      )}
                    </Button>
                  )}
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
                className="glass-card p-4 sm:p-6"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6">
                  <h2 className="text-lg sm:text-2xl font-semibold text-white">Monthly Balances</h2>
                  <Button
                    onClick={() => { setEditingBalance(null); setIsDrawerOpen(true); }}
                    className="rounded-2xl bg-white text-[#09090b] hover:bg-white/90 w-full sm:w-auto"
                  >
                    <Plus className="w-4 h-4 mr-2" strokeWidth={1.5} />
                    Add balance
                  </Button>
                </div>
                {balances.length > 0 ? (
                  <div className="space-y-4">
                    {(balancesListExpanded ? sortedBalancesByMonthDesc : sortedBalancesByMonthDesc.slice(0, 5)).map((balance) => (
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
                    {sortedBalancesByMonthDesc.length > 5 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setBalancesListExpanded((e) => !e)}
                        className="w-full rounded-xl text-muted-foreground hover:text-white mt-2"
                      >
                        {balancesListExpanded ? (
                          <>
                            <Minus className="w-4 h-4 mr-2" />
                            Show less
                          </>
                        ) : (
                          <>
                            <Plus className="w-4 h-4 mr-2" />
                            Show more ({sortedBalancesByMonthDesc.length - 5} more)
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                ) : (
                  <p className="text-muted-foreground">No balance records yet</p>
                )}
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="glass-card p-4 sm:p-6"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6">
                  <h2 className="text-lg sm:text-2xl font-semibold text-white">Income by month</h2>
                  <Button
                    onClick={() => { setEditingIncome(null); setIsIncomeDrawerOpen(true); }}
                    className="rounded-2xl bg-sky-600 hover:bg-sky-500 text-white"
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
                    {(incomeListExpanded ? sortedIncomesByMonthDesc : sortedIncomesByMonthDesc.slice(0, 5)).map((income) => {
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
                              <span className="text-sky-400 font-semibold">
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
                    {sortedIncomesByMonthDesc.length > 5 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIncomeListExpanded((e) => !e)}
                        className="w-full rounded-xl text-muted-foreground hover:text-white mt-2"
                      >
                        {incomeListExpanded ? (
                          <>
                            <Minus className="w-4 h-4 mr-2" />
                            Show less
                          </>
                        ) : (
                          <>
                            <Plus className="w-4 h-4 mr-2" />
                            Show more ({sortedIncomesByMonthDesc.length - 5} more)
                          </>
                        )}
                      </Button>
                    )}
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
              className="space-y-6"
            >
              <div className="glass-card p-4 sm:p-6">
                <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                  <h2 className="text-lg sm:text-2xl font-semibold text-white">Analytics</h2>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      exportToExcel(
                        balances,
                        incomes,
                        monthlySummaryRows,
                        "bank-balance-export"
                      )
                    }
                    className="rounded-xl border-white/20 text-muted-foreground hover:text-white shrink-0"
                  >
                    <Download className="w-4 h-4 mr-2" strokeWidth={1.5} />
                    Export to Excel
                  </Button>
                </div>
                <p className="text-muted-foreground text-sm mb-6">
                  Export includes Summary by month, Balances by account, and Income. Dates use Australian format (e.g. Jan 2025).
                </p>

                {/* Metric cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                  {avgSpend3Month != null && (
                    <div className="rounded-xl bg-white/5 border border-white/10 p-4">
                      <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Avg spend (3 months)</p>
                      <p className="text-xl font-semibold text-white">
                        ${avgSpend3Month.toLocaleString("en-AU", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                      </p>
                    </div>
                  )}
                  {avgSpend6Month != null && (
                    <div className="rounded-xl bg-white/5 border border-white/10 p-4">
                      <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Avg spend (6 months)</p>
                      <p className="text-xl font-semibold text-white">
                        ${avgSpend6Month.toLocaleString("en-AU", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                      </p>
                    </div>
                  )}
                  {avgSave3Month != null && (
                    <div className="rounded-xl bg-white/5 border border-white/10 p-4">
                      <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Avg save (3 months)</p>
                      <p className="text-xl font-semibold text-sky-400">
                        ${avgSave3Month.toLocaleString("en-AU", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                      </p>
                    </div>
                  )}
                  {avgSave6Month != null && (
                    <div className="rounded-xl bg-white/5 border border-white/10 p-4">
                      <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Avg save (6 months)</p>
                      <p className="text-xl font-semibold text-sky-400">
                        ${avgSave6Month.toLocaleString("en-AU", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                      </p>
                    </div>
                  )}
                </div>

                {/* Save vs Spend % pie chart */}
                {analyticsSaveSpendPie != null && (
                  <div className="mb-8">
                    <h3 className="text-sm font-medium text-white mb-3">Share of income (last 12 months)</h3>
                    <div className="rounded-xl bg-white/5 border border-white/10 p-4 flex flex-col sm:flex-row items-center gap-6">
                      <div className="w-full sm:w-64 h-64 shrink-0">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
                            <Pie
                              data={analyticsSaveSpendPie}
                              dataKey="value"
                              nameKey="name"
                              cx="50%"
                              cy="50%"
                              outerRadius="85%"
                              paddingAngle={2}
                              stroke="none"
                              label={({ name, value }) => `${name} ${value}%`}
                              labelLine={false}
                            >
                              {analyticsSaveSpendPie.map((entry, index) => (
                                <Cell key={index} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip
                              formatter={(value: number) => [`${value}%`, ""]}
                              contentStyle={{ backgroundColor: "rgba(9,9,11,0.95)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px" }}
                              labelStyle={{ color: "#a1a1aa" }}
                              itemStyle={{ color: "#fff" }}
                            />
                            <Legend
                              verticalAlign="middle"
                              align="right"
                              layout="vertical"
                              formatter={(value, entry) => (
                                <span className="text-sm text-muted-foreground">
                                  {value} <span className="text-white font-medium">{entry.payload?.value}%</span>
                                </span>
                              )}
                              iconType="circle"
                              iconSize={10}
                              wrapperStyle={{ paddingLeft: "1rem" }}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Based on total spend and total savings as a share of total income over the last 12 months.
                      </div>
                    </div>
                  </div>
                )}

                {/* Last 12 months summary table */}
                {monthlySummaryRows.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-white mb-3">Last 12 months</h3>
                    <div className="overflow-x-auto rounded-xl border border-white/10">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-white/10 text-left text-muted-foreground">
                            <th className="p-3 font-medium">Month</th>
                            <th className="p-3 font-medium text-right">Balance</th>
                            <th className="p-3 font-medium text-right">Income</th>
                            <th className="p-3 font-medium text-right">Spend</th>
                            <th className="p-3 font-medium text-right">Save</th>
                            <th className="p-3 font-medium text-right">Save %</th>
                          </tr>
                        </thead>
                        <tbody>
                          {monthlySummaryRows.slice(0, 12).map((r) => (
                            <tr key={r.month_year} className="border-b border-white/5">
                              <td className="p-3 text-white">
                                {new Date(r.month_year.slice(0, 7) + "-01").toLocaleDateString("en-AU", { month: "short", year: "numeric" })}
                              </td>
                              <td className="p-3 text-right text-white">
                                ${r.balance.toLocaleString("en-AU", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                              </td>
                              <td className="p-3 text-right text-white">
                                ${r.income.toLocaleString("en-AU", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                              </td>
                              <td className="p-3 text-right text-white">
                                {r.expenses != null ? `$${r.expenses.toLocaleString("en-AU", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}` : "—"}
                              </td>
                              <td className="p-3 text-right text-sky-400">
                                {r.savings != null ? `$${r.savings.toLocaleString("en-AU", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}` : "—"}
                              </td>
                              <td className="p-3 text-right text-muted-foreground">
                                {r.income > 0 && r.savings != null
                                  ? `${((r.savings / r.income) * 100).toFixed(0)}%`
                                  : "—"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
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

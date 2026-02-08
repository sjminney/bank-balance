/**
 * Client-side Excel export for dashboard data.
 * Uses en-AU date formatting by default; safe for international use.
 */

import * as XLSX from "xlsx";

export interface BalanceRow {
  id: string;
  month_year: string;
  balance: number;
  interest_earned?: number;
  one_off_deposit?: number;
  notes: string | null;
  bank_accounts?: { name: string; bank_name: string | null; account_type: string } | null;
}

export interface IncomeRow {
  id: string;
  month_year: string;
  amount: number;
  notes: string | null;
}

export interface SummaryRow {
  month_year: string;
  balance: number;
  income: number;
  expenses: number | null;
  savings: number | null;
  isOpeningMonth: boolean;
}

function formatMonth(monthYear: string): string {
  const d = new Date(monthYear.slice(0, 7) + "-01");
  if (Number.isNaN(d.getTime())) return monthYear;
  return d.toLocaleDateString("en-AU", { month: "short", year: "numeric" });
}

export function exportToExcel(
  balances: BalanceRow[],
  incomes: IncomeRow[],
  summaryRows: SummaryRow[],
  filenamePrefix = "bank-balance-export"
) {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Monthly summary (spend, save, income, balance)
  const summaryData = [
    ["Month", "Total balance", "Income", "Spend", "Save", "Save %"],
    ...summaryRows.map((r) => [
      formatMonth(r.month_year),
      r.balance,
      r.income,
      r.expenses ?? "",
      r.savings ?? "",
      r.income > 0 && r.savings != null ? ((r.savings / r.income) * 100).toFixed(1) + "%" : "",
    ]),
  ];
  const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(wb, wsSummary, "Summary by month");

  // Sheet 2: Balances (by account and month)
  const balanceData = [
    ["Month", "Account", "Balance", "Interest", "One-off deposit", "Notes"],
    ...balances
      .sort((a, b) => new Date(b.month_year).getTime() - new Date(a.month_year).getTime())
      .map((b) => [
        formatMonth(b.month_year),
        b.bank_accounts?.name ?? "All / Unspecified",
        b.balance,
        b.interest_earned ?? 0,
        b.one_off_deposit ?? 0,
        b.notes ?? "",
      ]),
  ];
  const wsBalances = XLSX.utils.aoa_to_sheet(balanceData);
  XLSX.utils.book_append_sheet(wb, wsBalances, "Balances");

  // Sheet 3: Income
  const incomeData = [
    ["Month", "Amount", "Notes"],
    ...incomes
      .sort((a, b) => new Date(b.month_year).getTime() - new Date(a.month_year).getTime())
      .map((i) => [formatMonth(i.month_year), i.amount, i.notes ?? ""]),
  ];
  const wsIncome = XLSX.utils.aoa_to_sheet(incomeData);
  XLSX.utils.book_append_sheet(wb, wsIncome, "Income");

  const filename = `${filenamePrefix}-${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wb, filename);
}

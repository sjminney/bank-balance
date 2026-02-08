"use client";

import { useState } from "react";
import { Drawer } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Calendar, DollarSign, FileText, Loader2, Banknote } from "lucide-react";
import { upsertMonthlyIncome } from "@/app/actions/income";

export interface MonthlyIncomeForEdit {
  id: string;
  month_year: string;
  amount: number;
  notes: string | null;
}

interface AddIncomeDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  defaultMonth?: string;
  existing?: MonthlyIncomeForEdit | null;
}

export function AddIncomeDrawer({
  open,
  onOpenChange,
  onSuccess,
  defaultMonth,
  existing,
}: AddIncomeDrawerProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const today = new Date();
  const currentMonth =
    existing?.month_year?.slice(0, 7) ||
    defaultMonth ||
    `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
  const isEdit = Boolean(existing);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setIsSubmitting(true);
    setError(null);

    const formData = new FormData(form);
    formData.set("income_amount", (formData.get("amount") as string) || "0");
    formData.set("income_notes", (formData.get("notes") as string) || "");

    try {
      const result = await upsertMonthlyIncome(formData);

      if (result?.error) {
        setError(result.error);
        return;
      }

      onOpenChange(false);
      if (!isEdit && form) form.reset();
      onSuccess();
    } catch (err) {
      setError("An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange} title={isEdit ? "Edit income" : "Add income"}>
      <form key={existing?.id ?? "new"} onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        <p className="text-sm text-muted-foreground">
          Record your total income for a month (separate from bank balances).
          Interest is recorded per account when you add or edit a balance.
        </p>

        <div className="space-y-2">
          <label
            htmlFor="month_year"
            className="text-sm font-medium text-white flex items-center gap-2"
          >
            <Calendar className="w-4 h-4" strokeWidth={1.5} />
            Month & year *
          </label>
          <input
            id="month_year"
            name="month_year"
            type="month"
            required
            defaultValue={currentMonth}
            className="w-full px-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-white/20 transition-all [color-scheme:dark]"
            style={{ colorScheme: "dark" }}
          />
        </div>

        <div className="space-y-2">
          <label
            htmlFor="amount"
            className="text-sm font-medium text-white flex items-center gap-2"
          >
            <DollarSign className="w-4 h-4" strokeWidth={1.5} />
            Amount *
          </label>
          <input
            id="amount"
            name="amount"
            type="number"
            step="0.01"
            required
            min="0"
            placeholder="0.00"
            defaultValue={existing?.amount ?? ""}
            className="w-full px-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-white placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-white/20 transition-all"
          />
        </div>

        <div className="space-y-2">
          <label
            htmlFor="notes"
            className="text-sm font-medium text-white flex items-center gap-2"
          >
            <FileText className="w-4 h-4" strokeWidth={1.5} />
            Notes (optional)
          </label>
          <textarea
            id="notes"
            name="notes"
            rows={3}
            placeholder="e.g. Salary, side gig..."
            defaultValue={existing?.notes ?? ""}
            className="w-full px-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-white placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-white/20 transition-all resize-none"
          />
        </div>

        <Button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-2xl bg-sky-600 text-white hover:bg-sky-500 font-medium h-12"
        >
          {isSubmitting ? (
            <>
              <Loader2
                className="w-5 h-5 mr-2 animate-spin"
                strokeWidth={1.5}
              />
              Saving...
            </>
          ) : (
            <>
              <Banknote className="w-5 h-5 mr-2" strokeWidth={1.5} />
              {isEdit ? "Save changes" : "Save income"}
            </>
          )}
        </Button>
      </form>
    </Drawer>
  );
}

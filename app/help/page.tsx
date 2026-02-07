"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowLeft, BookOpen, Wallet, Banknote, TrendingUp, Target, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function HelpPage() {
  return (
    <div className="min-h-screen bg-[#09090b] p-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[env(safe-area-inset-top)] md:p-8">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-white -ml-2 mb-4">
              <ArrowLeft className="w-4 h-4 mr-2" strokeWidth={1.5} />
              Back to Dashboard
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-white/10">
              <HelpCircle className="w-8 h-8 text-white" strokeWidth={1.5} />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-semibold text-white">How to use Bank Balance</h1>
              <p className="text-sm text-muted-foreground mt-1">Track real spend and frugal savings</p>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {/* What it's for */}
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="glass rounded-2xl p-6"
          >
            <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-3">
              <BookOpen className="w-5 h-5 text-blue-400" strokeWidth={1.5} />
              What is Bank Balance for?
            </h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Bank Balance helps you track your <strong className="text-white">actual spend and savings each month</strong> based on your
              regular income and the change in your bank balances. The goal is to know what you’re really spending so you can
              <strong className="text-white"> only spend what you earn</strong> and build habits that last.
            </p>
            <p className="text-muted-foreground text-sm leading-relaxed mt-3">
              We focus on <strong className="text-white">“frugal” savings</strong>: we ignore one-off windfalls (bonuses, tax refunds,
              inheritance, etc.) and we <strong className="text-white">exclude interest</strong> from the main savings number. Interest isn’t
              guaranteed and will fluctuate, so we treat it as <strong className="text-white">extra savings for emergencies</strong> rather
              than part of your core spend/save picture.
            </p>
          </motion.section>

          {/* How the numbers work */}
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="glass rounded-2xl p-6"
          >
            <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-3">
              <Target className="w-5 h-5 text-amber-400" strokeWidth={1.5} />
              How the numbers work
            </h2>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex gap-2">
                <span className="text-white font-medium shrink-0">Savings (this month):</span>
                <span>
                  Change in your total balance, <strong className="text-white">minus</strong> one-off deposits and interest. So it’s the
                  bit that came from your normal income and choices.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="text-white font-medium shrink-0">Spend (this month):</span>
                <span>
                  Your income for the month <strong className="text-white">minus</strong> that savings figure. That’s how much you actually
                  spent from your regular income.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="text-white font-medium shrink-0">One-off deposits:</span>
                <span>
                  Things like bonuses, tax refunds, inheritance. Enter them when you add a balance so they’re <strong className="text-white">excluded</strong> from
                  spend and savings and don’t distort your numbers.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="text-white font-medium shrink-0">Interest:</span>
                <span>
                  Recorded per account when you add a balance. We subtract it from the balance change before calculating savings, so your
                  main “savings” number is from your behaviour, not from interest. You can still see interest on the dashboard.
                </span>
              </li>
            </ul>
          </motion.section>

          {/* Getting started */}
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="glass rounded-2xl p-6"
          >
            <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-3">
              <Wallet className="w-5 h-5 text-emerald-400" strokeWidth={1.5} />
              Getting started
            </h2>
            <ol className="space-y-3 text-sm text-muted-foreground list-decimal list-inside">
              <li>
                <strong className="text-white">Add bank accounts</strong> in Settings (e.g. “Everyday”, “Savings”). You can set a type
                (e.g. savings) and colour. You can also add a new account from the <strong className="text-white">Add balance</strong> flow:
                when adding a balance, choose “+ Add new account…” from the account dropdown and fill in the details.
              </li>
              <li>
                <strong className="text-white">Add monthly balances</strong> — use <strong className="text-white">Add balance</strong> on the
                Net Worth card or under Accounts. For each month, enter the total balance per account (or combined). Add <strong className="text-white">interest
                earned</strong> and any <strong className="text-white">one-off deposit</strong> so we can exclude them from spend/savings.
              </li>
              <li>
                <strong className="text-white">Add income</strong> for each month (salary, regular side income). This is the “what you
                earn” we compare against to get spend. Income is per month; interest and one-offs are per account/balance.
              </li>
              <li>
                Once you have at least two months of balances (and income where relevant), the dashboard will show <strong className="text-white">Spend</strong>,{" "}
                <strong className="text-white">Savings</strong>, averages and trends. Use the <strong className="text-white">View month</strong> dropdown to look at
                past months.
              </li>
            </ol>
          </motion.section>

          {/* Dashboard overview */}
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="glass rounded-2xl p-6"
          >
            <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-3">
              <TrendingUp className="w-5 h-5 text-green-400" strokeWidth={1.5} />
              What you’ll see on the dashboard
            </h2>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><strong className="text-white">Net Worth</strong> — total of all balances for the selected (or latest) month. Use <strong className="text-white">Add balance</strong> to record a new balance.</li>
              <li><strong className="text-white">Spend / Savings (this month)</strong> — as above; use View month to see any month. When you have income for that month, we also show <strong className="text-white">% of income</strong> for spend and save.</li>
              <li><strong className="text-white">3m / 6m averages</strong> — average spend and savings over the last 3 or 6 months.</li>
              <li><strong className="text-white">Annual projection</strong> — based on your average monthly savings.</li>
              <li><strong className="text-white">Monthly summary table</strong> — balance, income, spend and savings per month.</li>
              <li><strong className="text-white">Spend & Save chart</strong> — how spend and savings move over time (trendlines only; no averages in the legend).</li>
            </ul>
          </motion.section>

          {/* Income vs one-offs */}
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="glass rounded-2xl p-6"
          >
            <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-3">
              <Banknote className="w-5 h-5 text-amber-400" strokeWidth={1.5} />
              Income vs one-offs
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              <strong className="text-white">Income</strong> is what you record as “regular” earnings for that month (e.g. salary). We use it
              to work out spend (income − savings). <strong className="text-white">One-off deposits</strong> are entered when you add a
              balance so we can subtract them from the balance change before calculating savings. That way a bonus or inheritance doesn’t
              inflate your “savings” or hide how much you actually spent. Interest is handled the same way: it’s recorded and then
              excluded from the main savings figure so you see your true frugal savings and real spend.
            </p>
          </motion.section>
        </div>

        <div className="mt-10 flex justify-center">
          <Link href="/dashboard">
            <Button className="rounded-2xl bg-white text-[#09090b] hover:bg-white/90">
              Back to Dashboard
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

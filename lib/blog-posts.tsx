import React from "react";

export const BLOG_DISCLAIMER = (
  <p className="text-xs text-muted-foreground italic border-l-2 border-amber-500/50 pl-3 py-1 my-4">
    This is general information only and does not constitute financial, tax or other professional advice.
    We recommend seeking advice from a qualified professional for your situation. Bank Balance is used by people in Australia and elsewhere; tips may reference Australian context but are intended to be broadly useful.
  </p>
);

export interface BlogPost {
  slug: string;
  title: string;
  date: string;
  excerpt: string;
  body: React.ReactNode;
}

function TrackYourSpendingBody() {
  return (
    <>
      <p className="text-muted-foreground text-sm leading-relaxed mb-4">
        The first step to saving more is knowing where your money goes. Many people are surprised when they add up
        their monthly spend. Use your bank statements or an app (like Bank Balance) to see the gap between what you
        earn and what you actually keep.
      </p>
      <p className="text-muted-foreground text-sm leading-relaxed mb-4">
        In Australia, a simple approach is to record your total balance at the end of each month and your regular income.
        The difference (after taking out one-off windfalls and interest) is your real savings — and income minus that is
        your real spend. Once you see the numbers, you can set a target for next month.
      </p>
      <p className="text-muted-foreground text-sm leading-relaxed">
        This works anywhere: track income and the change in your balances over time. Consistency matters more than
        the exact method.
      </p>
    </>
  );
}

function PayYourselfFirstBody() {
  return (
    <>
      <p className="text-muted-foreground text-sm leading-relaxed mb-4">
        &quot;Pay yourself first&quot; means moving a set amount into savings as soon as you get paid, instead of
        saving whatever is left at the end of the month. That way you’re not relying on willpower after bills and
        spending.
      </p>
      <p className="text-muted-foreground text-sm leading-relaxed mb-4">
        In practice: set up an automatic transfer on payday from your transaction account to a savings account
        (or offset, if you have a mortgage). Start with an amount you can stick to — even a small percentage —
        then increase it when you’re comfortable. In Australia, many banks let you schedule recurring transfers
        in their app.
      </p>
      <p className="text-muted-foreground text-sm leading-relaxed">
        Tracking your balance and savings each month (e.g. in Bank Balance) helps you see whether you’re hitting
        your target and how much you’re really spending.
      </p>
    </>
  );
}

function HighInterestSavingsBody() {
  return (
    <>
      <p className="text-muted-foreground text-sm leading-relaxed mb-4">
        Keeping spare cash in a high-interest savings account (HISA) can earn more than a standard transaction
        account. In Australia, rates and bonus conditions change often, so it’s worth comparing current offers.
        Look at the base rate and any bonus rate (often conditional on not withdrawing or making a minimum deposit).
      </p>
      <p className="text-muted-foreground text-sm leading-relaxed mb-4">
        You don’t need to chase the absolute highest rate every month — switching too often can be more hassle
        than the extra few dollars. Pick a solid option, set up your automatic savings transfer, and review once
        or twice a year. The same idea applies in other countries: compare savings products and use one that
        pays meaningful interest without locking your money away if you might need it soon.
      </p>
      <p className="text-muted-foreground text-sm leading-relaxed">
        When you record your balances in Bank Balance, we separate interest from your core savings so you can see
        how much you saved from your income versus how much came from interest.
      </p>
    </>
  );
}

function SmallWinsBody() {
  return (
    <>
      <p className="text-muted-foreground text-sm leading-relaxed mb-4">
        Big goals are easier when you get small wins. Instead of &quot;save $10,000 this year,&quot; try
        &quot;save $200 more this month than last month&quot; or &quot;keep spend under $X for the next 3 months.&quot;
        Tracking month-by-month (e.g. with spend and save numbers) lets you see progress quickly.
      </p>
      <p className="text-muted-foreground text-sm leading-relaxed mb-4">
        Celebrate consistency: a few months in a row of steady savings or lower spend can matter more than one
        perfect month. Use your dashboard to spot trends — are you spending less or saving more over the last 3 or
        6 months? That’s a win.
      </p>
      <p className="text-muted-foreground text-sm leading-relaxed">
        This approach works whether you’re in Australia or elsewhere: set short-term targets, track the numbers,
        and adjust as you go.
      </p>
    </>
  );
}

export const blogPosts: BlogPost[] = [
  {
    slug: "track-your-spending",
    title: "Track your spending",
    date: "2025-02-01",
    excerpt: "Knowing where your money goes is the first step to saving more. See how tracking income and balances can help.",
    body: <TrackYourSpendingBody />,
  },
  {
    slug: "pay-yourself-first",
    title: "Pay yourself first",
    date: "2025-02-02",
    excerpt: "Move savings as soon as you get paid so you're not relying on what's left at the end of the month.",
    body: <PayYourselfFirstBody />,
  },
  {
    slug: "high-interest-savings",
    title: "Use a high-interest savings account",
    date: "2025-02-03",
    excerpt: "Make your emergency fund or short-term savings work harder with a HISA. Tips for Australia and beyond.",
    body: <HighInterestSavingsBody />,
  },
  {
    slug: "small-wins",
    title: "Small wins add up",
    date: "2025-02-04",
    excerpt: "Set short-term targets and celebrate consistency. Month-by-month progress beats one perfect month.",
    body: <SmallWinsBody />,
  },
];

export function getPost(slug: string): BlogPost | undefined {
  return blogPosts.find((p) => p.slug === slug);
}

export function getAllPosts(): BlogPost[] {
  return [...blogPosts].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

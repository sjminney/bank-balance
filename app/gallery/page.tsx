"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Wallet, LayoutDashboard, BarChart3, PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

const galleryItems = [
  {
    src: "/gallery/gallery-dashboard-overview.png",
    alt: "Dashboard overview with Spend, Save, Income and Bank Balance cards",
    title: "Dashboard overview",
    description: "See your spend, savings, income and total balance at a glance. Switch between months and track trends.",
    icon: LayoutDashboard,
  },
  {
    src: "/gallery/gallery-analytics-export.png",
    alt: "Analytics tab with Export to Excel and monthly summary table",
    title: "Analytics & export",
    description: "View averages over 3 and 6 months, and export all your data to Excel for your own records.",
    icon: BarChart3,
  },
  {
    src: "/gallery/gallery-add-balance-drawer.png",
    alt: "Add balance drawer for recording monthly balances",
    title: "Add balance",
    description: "Record your balance each month, plus optional interest and one-off deposits so we calculate real spend and savings.",
    icon: PlusCircle,
  },
];

export default function GalleryPage() {
  return (
    <div className="min-h-screen bg-[#09090b] p-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[env(safe-area-inset-top)] md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <Link href="/login">
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-white -ml-2 mb-4">
              <ArrowLeft className="w-4 h-4 mr-2" strokeWidth={1.5} />
              Back to sign in
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-white/10">
              <Wallet className="w-8 h-8 text-white" strokeWidth={1.5} />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-semibold text-white">See the app</h1>
              <p className="text-sm text-muted-foreground mt-1">What you get when you sign up — sample screens with example data</p>
            </div>
          </div>
        </div>

        <ul className="space-y-10">
          {galleryItems.map((item, i) => (
            <motion.li
              key={item.src}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 * i, duration: 0.3 }}
              className="glass rounded-2xl overflow-hidden"
            >
              <div className="relative aspect-[16/10] sm:aspect-[2/1] bg-white/5">
                <Image
                  src={item.src}
                  alt={item.alt}
                  fill
                  className="object-contain object-top p-2 sm:p-4"
                  sizes="(max-width: 768px) 100vw, 896px"
                  priority={i === 0}
                />
              </div>
              <div className="p-4 sm:p-6">
                <div className="flex items-center gap-2 mb-2">
                  <item.icon className="w-5 h-5 text-emerald-400" strokeWidth={1.5} />
                  <h2 className="text-lg font-semibold text-white">{item.title}</h2>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.description}</p>
              </div>
            </motion.li>
          ))}
        </ul>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-12 text-center"
        >
          <p className="text-muted-foreground text-sm mb-4">Ready to track your spend and savings?</p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link href="/login">
              <Button className="rounded-2xl bg-white text-[#09090b] hover:bg-white/90">
                Sign in
              </Button>
            </Link>
            <Link href="/login">
              <Button variant="outline" className="rounded-2xl border-white/20 text-muted-foreground hover:text-white">
                Create account
              </Button>
            </Link>
          </div>
          <p className="text-xs text-muted-foreground mt-4">
            <Link href="/help" className="underline underline-offset-2 hover:text-white">How it works</Link>
            {" · "}
            <Link href="/blog" className="underline underline-offset-2 hover:text-white">Tips to save</Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}

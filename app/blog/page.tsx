"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowLeft, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getAllPosts, BLOG_DISCLAIMER } from "@/lib/blog-posts";

export default function BlogPage() {
  const posts = getAllPosts();

  return (
    <div className="min-h-screen bg-[#09090b] p-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[env(safe-area-inset-top)] md:p-8">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <Link href="/">
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-white -ml-2 mb-4">
              <ArrowLeft className="w-4 h-4 mr-2" strokeWidth={1.5} />
              Home
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-white/10">
              <BookOpen className="w-8 h-8 text-white" strokeWidth={1.5} />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-semibold text-white">Tips to save</h1>
              <p className="text-sm text-muted-foreground mt-1">Ideas to help you spend less and save more</p>
            </div>
          </div>
        </div>

        <div className="mb-6 rounded-2xl glass p-4">
          {BLOG_DISCLAIMER}
        </div>

        <ul className="space-y-4">
          {posts.map((post, i) => (
            <motion.li
              key={post.slug}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 * i }}
            >
              <Link
                href={`/blog/${post.slug}`}
                className="block glass rounded-2xl p-5 sm:p-6 hover:bg-white/10 transition-colors"
              >
                <h2 className="text-lg font-semibold text-white mb-1">{post.title}</h2>
                <p className="text-sm text-muted-foreground mb-2">{post.excerpt}</p>
                <time className="text-xs text-muted-foreground">
                  {new Date(post.date).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}
                </time>
              </Link>
            </motion.li>
          ))}
        </ul>

        <div className="mt-10 flex justify-center gap-3">
          <Link href="/">
            <Button variant="outline" className="rounded-2xl border-white/20 text-muted-foreground hover:text-white">
              Home
            </Button>
          </Link>
          <Link href="/login">
            <Button className="rounded-2xl bg-white text-[#09090b] hover:bg-white/90">
              Log in to track your balances
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

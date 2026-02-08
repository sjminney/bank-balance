"use client";

import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getPost, BLOG_DISCLAIMER } from "@/lib/blog-posts";

export default function BlogPostPage() {
  const params = useParams();
  const router = useRouter();
  const slug = typeof params.slug === "string" ? params.slug : "";
  const post = getPost(slug);

  if (!post) {
    return (
      <div className="min-h-screen bg-[#09090b] p-4 md:p-8 flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Post not found.</p>
          <Button onClick={() => router.push("/blog")} className="rounded-2xl">
            Back to Tips
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#09090b] p-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[env(safe-area-inset-top)] md:p-8">
      <div className="max-w-3xl mx-auto">
        <div className="mb-6 flex flex-wrap items-center gap-2">
          <Link href="/blog">
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-white -ml-2">
              <ArrowLeft className="w-4 h-4 mr-2" strokeWidth={1.5} />
              Back to Tips
            </Button>
          </Link>
          <Link href="/" className="text-sm text-muted-foreground hover:text-white">
            Home
          </Link>
        </div>

        <motion.article
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="glass rounded-2xl p-6 sm:p-8"
        >
          <h1 className="text-2xl sm:text-3xl font-semibold text-white mb-2">{post.title}</h1>
          <time className="text-sm text-muted-foreground block mb-4">
            {new Date(post.date).toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" })}
          </time>
          {BLOG_DISCLAIMER}
          <div className="mt-4">{post.body}</div>
        </motion.article>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/blog">
            <Button variant="outline" size="sm" className="rounded-xl border-white/20 text-muted-foreground hover:text-white">
              All tips
            </Button>
          </Link>
          <Link href="/">
            <Button variant="ghost" size="sm" className="rounded-xl text-muted-foreground hover:text-white">
              Home
            </Button>
          </Link>
          <Link href="/login">
            <Button variant="ghost" size="sm" className="rounded-xl text-muted-foreground hover:text-white">
              Log in
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

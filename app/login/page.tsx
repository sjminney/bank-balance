"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import Link from "next/link";
import { signIn, signUp, resetPassword } from "@/app/actions/auth";
import { Wallet, Mail, Lock, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);

  async function handleSubmit(formData: FormData) {
    // Check cooldown
    if (cooldownSeconds > 0) {
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const result = showForgotPassword
        ? await resetPassword(formData)
        : isSignUp
          ? await signUp(formData)
          : await signIn(formData);

      if (result?.error) {
        // Check if it's a rate limit error
        if (result.error.toLowerCase().includes("3 seconds") || result.error.toLowerCase().includes("rate limit")) {
          setCooldownSeconds(3);
          // Start countdown
          const interval = setInterval(() => {
            setCooldownSeconds((prev) => {
              if (prev <= 1) {
                clearInterval(interval);
                return 0;
              }
              return prev - 1;
            });
          }, 1000);
          setError("Please wait a moment before trying again. Rate limit protection is active.");
        } else {
          setError(result.error);
        }
        setIsLoading(false);
        return;
      }

      if (result && "success" in result && result.success && result.message) {
        // Email confirmation required - show success message
        setError(null);
        setSuccessMessage(result.message);
        setIsLoading(false);
        return;
      }

      // If we get here and no error, redirect should happen
      // Don't set loading to false here as redirect will happen
    } catch (err: unknown) {
      // Check if it's a Next.js redirect (which throws an error but is expected)
      if (
        err &&
        typeof err === "object" &&
        ("digest" in err || err instanceof Error && err.message.includes("NEXT_REDIRECT"))
      ) {
        // This is a Next.js redirect, it's expected - don't show error
        return;
      }

      // Log the actual error for debugging
      console.error("Auth error:", err);
      
      let errorMessage = "An unexpected error occurred.";
      
      if (err instanceof Error) {
        errorMessage = err.message;
      } else if (typeof err === "string") {
        errorMessage = err;
      } else if (err && typeof err === "object") {
        // Try to extract meaningful error message
        const errObj = err as Record<string, unknown>;
        if (errObj.message) {
          errorMessage = String(errObj.message);
        } else if (errObj.error) {
          errorMessage = String(errObj.error);
        }
      }
      
      setError(errorMessage);
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#09090b] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-md"
      >
        {/* Logo/Header */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 mb-4">
            <Wallet className="w-8 h-8 text-white" strokeWidth={1.5} />
          </div>
          <h1 className="text-3xl font-semibold text-white mb-2">Bank Balance</h1>
          <p className="text-muted-foreground">
            {showForgotPassword ? "Reset your password" : isSignUp ? "Create your account" : "Sign in to your account"}
          </p>
        </motion.div>

        {/* Form Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-card"
        >
          <form action={handleSubmit} className="space-y-6">
            {/* Success Message */}
            {successMessage && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 rounded-xl bg-green-500/10 border border-green-500/20"
              >
                <p className="text-sm text-green-400">{successMessage}</p>
              </motion.div>
            )}

            {/* Error Message */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 rounded-xl bg-red-500/10 border border-red-500/20"
              >
                <p className="text-sm text-red-400">{error}</p>
              </motion.div>
            )}

            {/* Email Field */}
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium text-white">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" strokeWidth={1.5} />
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  className="w-full pl-12 pr-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-white placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-white/20 transition-all"
                  placeholder="you@example.com"
                />
              </div>
            </div>

            {/* Password Field - hide when forgot password */}
            {!showForgotPassword && (
              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium text-white">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" strokeWidth={1.5} />
                  <input
                    id="password"
                    name="password"
                    type="password"
                    required={!showForgotPassword}
                    minLength={6}
                    className="w-full pl-12 pr-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-white placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-white/20 transition-all"
                    placeholder="••••••••"
                  />
                </div>
                <div className="text-right">
                  <button
                    type="button"
                    onClick={() => {
                      setShowForgotPassword(true);
                      setError(null);
                      setSuccessMessage(null);
                    }}
                    className="text-sm text-muted-foreground hover:text-white transition-colors"
                  >
                    Forgot password?
                  </button>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={isLoading || cooldownSeconds > 0}
              className="w-full rounded-2xl bg-white text-[#09090b] hover:bg-white/90 font-medium h-12 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" strokeWidth={1.5} />
                  {showForgotPassword ? "Sending link..." : isSignUp ? "Creating account..." : "Signing in..."}
                </>
              ) : cooldownSeconds > 0 ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" strokeWidth={1.5} />
                  Please wait {cooldownSeconds}s...
                </>
              ) : (
                <>
                  {showForgotPassword ? "Send reset link" : isSignUp ? "Create account" : "Sign in"}
                  <ArrowRight className="w-5 h-5 ml-2" strokeWidth={1.5} />
                </>
              )}
            </Button>
          </form>

          {/* Toggle Sign Up / Sign In / Back from Forgot */}
          <div className="mt-6 text-center">
            {showForgotPassword ? (
              <button
                type="button"
                onClick={() => {
                  setShowForgotPassword(false);
                  setError(null);
                  setSuccessMessage(null);
                }}
                className="text-sm text-muted-foreground hover:text-white transition-colors"
              >
                Back to <span className="font-medium text-white">Sign in</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(!isSignUp);
                  setError(null);
                  setSuccessMessage(null);
                  setCooldownSeconds(0);
                }}
                className="text-sm text-muted-foreground hover:text-white transition-colors"
              >
                {isSignUp ? (
                  <>
                    Already have an account?{" "}
                    <span className="font-medium text-white">Sign in</span>
                  </>
                ) : (
                  <>
                    Don&apos;t have an account?{" "}
                    <span className="font-medium text-white">Sign up</span>
                  </>
                )}
              </button>
            )}
          </div>
        </motion.div>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-center mt-8 space-y-2"
        >
          <p className="text-sm text-muted-foreground">
            <Link href="/gallery" className="text-white/80 hover:text-white underline underline-offset-2">
              See what you&apos;re signing up for
            </Link>
          </p>
          <p className="text-sm text-muted-foreground">
            <Link href="/help" className="text-white/80 hover:text-white underline underline-offset-2">
              How to use Bank Balance
            </Link>
          </p>
          <p className="text-sm text-muted-foreground">
            Secure authentication powered by Supabase
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
}

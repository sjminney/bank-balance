"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function signUp(formData: FormData) {
  try {
    const supabase = await createClient();

    const data = {
      email: formData.get("email") as string,
      password: formData.get("password") as string,
    };

    if (!data.email || !data.password) {
      return { error: "Email and password are required" };
    }

    const { data: signUpData, error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/auth/callback`,
      },
    });

    if (error) {
      return { error: error.message };
    }

    // Check if user session exists (email confirmation might be disabled)
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      // User is signed in (email confirmation disabled)
      revalidatePath("/", "layout");
      redirect("/dashboard");
    } else {
      // Email confirmation required
      return {
        success: true,
        message: "Please check your email to confirm your account before signing in.",
      };
    }
  } catch (error) {
    // If it's a redirect error, re-throw it
    if (error && typeof error === "object" && "digest" in error) {
      throw error;
    }
    return {
      error: error instanceof Error ? error.message : "Failed to create account. Please try again.",
    };
  }
}

export async function signIn(formData: FormData) {
  const supabase = await createClient();

  const data = {
    email: formData.get("email") as string,
    password: formData.get("password") as string,
  };

  const { error } = await supabase.auth.signInWithPassword({
    email: data.email,
    password: data.password,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}

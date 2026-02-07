import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  try {
    // Check if environment variables are set
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      console.error("Missing Supabase environment variables");
      redirect("/login");
      return;
    }

    const supabase = await createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error) {
      console.error("Auth error:", error);
      redirect("/login");
      return;
    }

    if (user) {
      redirect("/dashboard");
    } else {
      redirect("/login");
    }
  } catch (error) {
    console.error("Error in home page:", error);
    // Fallback to login page on error
    redirect("/login");
  }
}

"use client";

import { redirect } from "next/navigation";
import LoginPage from "@/app/login/page";

// Redirect to login page which handles both sign in and sign up
export default function SignUpPage() {
  redirect("/login");
}

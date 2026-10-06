import type { Metadata } from "next";
import { redirect } from "next/navigation";
import AuthPage from "@/components/auth/AuthPage";
import SignUpForm from "@/components/auth/SignUpForm";
import { getCurrentUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Sign Up" };

export default async function RegisterPage() {
  if (await getCurrentUser()) {
    redirect("/account");
  }

  return (
    <AuthPage>
      <SignUpForm />
    </AuthPage>
  );
}

import type { Metadata } from "next";
import AuthPage from "@/components/auth/AuthPage";
import AuthStatus from "@/components/auth/AuthStatus";
import BackLink from "@/components/auth/BackLink";
import ResetPasswordForm from "@/components/auth/ResetPasswordForm";
import ButtonLink from "@/components/ButtonLink";
import { hasRecoveryCookie } from "@/lib/auth/recovery";
import { getCurrentUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Choose a New Password" };

export default async function ResetPasswordPage() {
  const user = await getCurrentUser();

  if (!user || !(await hasRecoveryCookie())) {
    return (
      <AuthPage>
        <AuthStatus
          title="Reset link expired"
          action={
            <>
              <ButtonLink href="/forgot-password" size="lg" className="w-full">
                Request a new link
              </ButtonLink>
              <BackLink href="/login" label="Back to log in" />
            </>
          }
        >
          This password reset link is invalid or has expired. Request a new one to continue.
        </AuthStatus>
      </AuthPage>
    );
  }

  return (
    <AuthPage>
      <ResetPasswordForm email={user.email ?? ""} />
    </AuthPage>
  );
}

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import AuthPage from "@/components/auth/AuthPage";
import AuthSwitchLink from "@/components/auth/AuthSwitchLink";
import LoginForm from "@/components/auth/LoginForm";
import FormMessage from "@/components/forms/FormMessage";
import { safeNextPath } from "@/lib/auth/redirect";
import { getCurrentUser } from "@/lib/auth/session";
import { APP_NAME } from "@/lib/brand";

export const metadata: Metadata = { title: "Log In" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { error, next: nextParam } = await searchParams;
  const next = safeNextPath(nextParam);

  if (await getCurrentUser()) {
    redirect(next ?? "/account");
  }

  const subscribing = next?.startsWith("/plans") ?? false;
  const watching = next?.startsWith("/watch/") ?? false;

  return (
    <AuthPage
      title={`Log in to ${APP_NAME}`}
      description={
        subscribing
          ? `Log in to subscribe to ${APP_NAME}+.`
          : watching
            ? "Log in to start watching."
            : "Welcome back. Pick up where you left off."
      }
      footer={
        <AuthSwitchLink prompt={`New to ${APP_NAME}?`} href="/register" label="Create an account" />
      }
    >
      {error === "invalid_link" && (
        <div className="mb-5">
          <FormMessage
            state={{
              status: "error",
              message: "That link is invalid or has expired. Please try again.",
            }}
          />
        </div>
      )}
      <LoginForm next={next} />
    </AuthPage>
  );
}

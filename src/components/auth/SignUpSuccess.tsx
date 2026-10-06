import AuthStatus from "@/components/auth/AuthStatus";
import BackLink from "@/components/auth/BackLink";

export default function SignUpSuccess({ email }: { email: string }) {
  return (
    <AuthStatus
      title="Check your inbox"
      note="Can't find it? Check your spam folder, or wait a few minutes before trying again."
      action={<BackLink href="/login" label="Go to log in" />}
    >
      We sent a confirmation link to <span className="font-medium text-foreground">{email}</span>.
      Open it to activate your account.
    </AuthStatus>
  );
}

"use client";

import { useEffect, useId, useRef, useState } from "react";
import PasswordChecklist, {
  PasswordMatchIndicator,
  RequirementsToggle,
} from "@/components/auth/PasswordChecklist";
import PasswordField from "@/components/forms/PasswordField";
import { MAX_PASSWORD_LENGTH } from "@/lib/auth/validation";

type NewPasswordFieldsProps = {
  errorFor: (field: string) => string | undefined;
  passwordName?: string;
  passwordLabel?: string;
  confirmLabel?: string;
  autoFocus?: boolean;
  defaultRequirementsOpen?: boolean;
};

export default function NewPasswordFields({
  errorFor,
  passwordName = "password",
  passwordLabel = "Password",
  confirmLabel = "Confirm password",
  autoFocus,
  defaultRequirementsOpen = false,
}: NewPasswordFieldsProps) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [requirementsOpen, setRequirementsOpen] = useState(defaultRequirementsOpen);
  const requirementsId = useId();
  const passwordRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const form = passwordRef.current?.form;
    if (!form) return;
    const clear = () => {
      setPassword("");
      setConfirmPassword("");
    };
    form.addEventListener("reset", clear);
    return () => form.removeEventListener("reset", clear);
  }, []);

  return (
    <>
      <PasswordField
        ref={passwordRef}
        label={passwordLabel}
        name={passwordName}
        autoComplete="new-password"
        autoFocus={autoFocus}
        placeholder="Create a password"
        maxLength={MAX_PASSWORD_LENGTH}
        onChange={(event) => setPassword(event.target.value)}
        error={errorFor(passwordName)}
        labelAction={
          <RequirementsToggle
            open={requirementsOpen}
            onToggle={() => setRequirementsOpen((open) => !open)}
            controls={requirementsId}
          />
        }
      >
        <PasswordChecklist id={requirementsId} open={requirementsOpen} password={password} />
      </PasswordField>
      <PasswordField
        label={confirmLabel}
        name="confirmPassword"
        autoComplete="new-password"
        placeholder="Repeat your password"
        maxLength={MAX_PASSWORD_LENGTH}
        onChange={(event) => setConfirmPassword(event.target.value)}
        error={errorFor("confirmPassword")}
        adornment={
          <PasswordMatchIndicator
            matches={confirmPassword.length > 0 && password === confirmPassword}
          />
        }
      />
    </>
  );
}

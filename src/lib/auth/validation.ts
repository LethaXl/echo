export const MIN_PASSWORD_LENGTH = 8;
export const MAX_PASSWORD_LENGTH = 40;
export const MAX_NAME_LENGTH = 100;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type PasswordRule = {
  label: string;
  error: string;
  test: (password: string) => boolean;
};

export const PASSWORD_RULES: PasswordRule[] = [
  {
    label: `At least ${MIN_PASSWORD_LENGTH} characters`,
    error: `Password must be ${MIN_PASSWORD_LENGTH} to ${MAX_PASSWORD_LENGTH} characters.`,
    test: (password) =>
      password.length >= MIN_PASSWORD_LENGTH && password.length <= MAX_PASSWORD_LENGTH,
  },
  {
    label: "Uppercase letter",
    error: "Password must include at least one uppercase letter.",
    test: (password) => /[A-Z]/.test(password),
  },
  {
    label: "Number",
    error: "Password must include at least one number.",
    test: (password) => /\d/.test(password),
  },
];

export const PASSWORD_REQUIREMENTS_HINT = `${MIN_PASSWORD_LENGTH}–${MAX_PASSWORD_LENGTH} characters with an uppercase letter and a number.`;

export function getText(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

export function getPassword(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

export function validateFullName(fullName: string): string | null {
  if (!fullName) return "Enter your name.";
  if (fullName.length > MAX_NAME_LENGTH) {
    return `Name must be ${MAX_NAME_LENGTH} characters or fewer.`;
  }
  return null;
}

export function validateEmail(email: string): string | null {
  if (!email) return "Enter your email address.";
  if (!EMAIL_PATTERN.test(email)) return "Enter a valid email address.";
  return null;
}

export function validatePasswordStrength(password: string): string | null {
  if (!password) return "Enter a password.";
  return PASSWORD_RULES.find((rule) => !rule.test(password))?.error ?? null;
}

export function validatePasswordConfirmation(
  password: string,
  confirmPassword: string,
): string | null {
  if (!confirmPassword) return "Confirm your password.";
  if (password !== confirmPassword) return "Passwords do not match.";
  return null;
}

export function validateNewPassword(
  password: string,
  confirmPassword: string,
): string | null {
  return (
    validatePasswordStrength(password) ?? validatePasswordConfirmation(password, confirmPassword)
  );
}

export type FieldError = { field: string; message: string };

/** Form validators shared by the browser (instant feedback) and the server actions. */
export type FormValidator = (formData: FormData) => FieldError | null;

function firstFieldError(checks: [field: string, message: string | null][]): FieldError | null {
  for (const [field, message] of checks) {
    if (message) return { field, message };
  }
  return null;
}

export const validateNewPasswordForm: FormValidator = (formData) => {
  const password = getPassword(formData, "password");
  return firstFieldError([
    ["password", validatePasswordStrength(password)],
    [
      "confirmPassword",
      validatePasswordConfirmation(password, getPassword(formData, "confirmPassword")),
    ],
  ]);
};

export const validateSignUpForm: FormValidator = (formData) =>
  firstFieldError([
    ["fullName", validateFullName(getText(formData, "fullName"))],
    ["email", validateEmail(getText(formData, "email"))],
  ]) ?? validateNewPasswordForm(formData);

export const validateLogInForm: FormValidator = (formData) =>
  firstFieldError([
    ["email", validateEmail(getText(formData, "email"))],
    ["password", getPassword(formData, "password") ? null : "Enter your password."],
  ]);

export const validateEmailForm: FormValidator = (formData) =>
  firstFieldError([["email", validateEmail(getText(formData, "email"))]]);

// Browser-side mirrors of the checks in updateName, changePassword and deleteAccount.
export const validateNameForm: FormValidator = (formData) =>
  firstFieldError([["fullName", validateFullName(getText(formData, "fullName"))]]);

export const validateChangePasswordForm: FormValidator = (formData) => {
  const newPassword = getPassword(formData, "newPassword");
  return firstFieldError([
    [
      "currentPassword",
      getPassword(formData, "currentPassword") ? null : "Enter your current password.",
    ],
    ["newPassword", validatePasswordStrength(newPassword)],
    [
      "confirmPassword",
      validatePasswordConfirmation(newPassword, getPassword(formData, "confirmPassword")),
    ],
  ]);
};

export const validateDeleteAccountForm: FormValidator = (formData) =>
  firstFieldError([
    ["password", getPassword(formData, "password") ? null : "Enter your password to confirm."],
    [
      "confirm",
      formData.get("confirm") === "on"
        ? null
        : "Confirm that you understand this cannot be undone.",
    ],
  ]);

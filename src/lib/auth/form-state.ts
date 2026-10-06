export type FormState = {
  status: "idle" | "error" | "success";
  message?: string;
  /** Name of the input the error belongs to, when it is about a single field. */
  field?: string;
  values?: Record<string, string>;
};

export const initialFormState: FormState = { status: "idle" };

export type SignupFields = "name" | "email" | "password";

export type SignupActionState =
  | { status: "idle" }
  | {
      status: "error";
      code: "VALIDATION_ERROR" | "DUPLICATE_EMAIL" | "SERVER_ERROR";
      message: string;
      fieldErrors?: Partial<Record<SignupFields, string>>;
    };

export const initialSignupActionState: SignupActionState = { status: "idle" };

export type SignupSubmissionResult =
  | { ok: true; redirectTo: string }
  | {
      ok: false;
      code: "VALIDATION_ERROR" | "DUPLICATE_EMAIL" | "SERVER_ERROR";
      message: string;
      fieldErrors?: Partial<Record<SignupFields, string>>;
    };

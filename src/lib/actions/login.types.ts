export type LoginFields = "email" | "password";

export type LoginActionState =
  | { status: "idle" }
  | {
      status: "error";
      code: "VALIDATION_ERROR" | "INVALID_CREDENTIALS" | "AUTH_ERROR";
      message: string;
      fieldErrors?: Partial<Record<LoginFields, string>>;
    };

export const initialLoginActionState: LoginActionState = { status: "idle" };

export type LoginSubmissionResult =
  | { ok: true; redirectTo: string }
  | {
      ok: false;
      code: "VALIDATION_ERROR" | "INVALID_CREDENTIALS" | "AUTH_ERROR";
      message: string;
      fieldErrors?: Partial<Record<LoginFields, string>>;
    };

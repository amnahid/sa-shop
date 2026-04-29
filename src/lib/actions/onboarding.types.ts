// Branch Onboarding Types
export type BranchFields = "name";

export type BranchActionState =
  | { status: "idle" }
  | {
      status: "error";
      code:
        | "VALIDATION_ERROR"
        | "AUTH_REQUIRED"
        | "SETUP_CONTEXT_MISSING"
        | "HEAD_OFFICE_EXISTS"
        | "SERVER_ERROR";
      message: string;
      fieldErrors?: Partial<Record<BranchFields, string>>;
    };

export const initialBranchActionState: BranchActionState = { status: "idle" };

// Business Onboarding Types
export type BusinessFields = "name" | "email";

export type BusinessActionState =
  | { status: "idle" }
  | {
      status: "error";
      code: "VALIDATION_ERROR" | "AUTH_REQUIRED" | "SETUP_CONTEXT_MISSING" | "SERVER_ERROR";
      message: string;
      fieldErrors?: Partial<Record<BusinessFields, string>>;
    };

export const initialBusinessActionState: BusinessActionState = { status: "idle" };

// Products Onboarding Types
export type ProductsActionState =
  | { status: "idle" }
  | {
      status: "error";
      code:
        | "VALIDATION_ERROR"
        | "EMPTY_CSV"
        | "AUTH_REQUIRED"
        | "SETUP_CONTEXT_MISSING"
        | "SERVER_ERROR";
      message: string;
      fieldErrors?: {
        csv?: string;
      };
    };

export const initialProductsActionState: ProductsActionState = { status: "idle" };

// Team Onboarding Types
export type TeamActionState =
  | { status: "idle" }
  | {
      status: "error";
      code: "VALIDATION_ERROR" | "AUTH_REQUIRED" | "SETUP_CONTEXT_MISSING" | "SERVER_ERROR";
      message: string;
      fieldErrors?: {
        email?: string;
        role?: string;
      };
    }
  | {
      status: "success";
      code: "INVITE_SENT";
      message: string;
    };

export const initialTeamActionState: TeamActionState = { status: "idle" };

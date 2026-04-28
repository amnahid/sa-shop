import assert from "node:assert/strict";
import test from "node:test";
import { submitLogin } from "@/lib/actions/login";
import { submitSignup } from "@/lib/actions/signup";

function createSignupFormData(overrides?: Partial<Record<"name" | "email" | "password", string>>) {
  const formData = new FormData();
  formData.set("name", overrides?.name ?? "Mona Ahmed");
  formData.set("email", overrides?.email ?? "mona@example.com");
  formData.set("password", overrides?.password ?? "password123");
  return formData;
}

function createLoginFormData(overrides?: Partial<Record<"email" | "password", string>>) {
  const formData = new FormData();
  formData.set("email", overrides?.email ?? "mona@example.com");
  formData.set("password", overrides?.password ?? "password123");
  return formData;
}

test("signup returns explicit duplicate email error", async () => {
  const formData = createSignupFormData();

  const result = await submitSignup(formData, {
    findExistingUser: async () => ({ _id: "existing" }),
    createUser: async () => {
      throw new Error("createUser should not be called");
    },
    createTenant: async () => {
      throw new Error("createTenant should not be called");
    },
    createMembership: async () => {
      throw new Error("createMembership should not be called");
    },
  });

  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.code, "DUPLICATE_EMAIL");
  assert.equal(result.fieldErrors?.email, "This email is already registered.");
});

test("login returns explicit invalid credentials error", async () => {
  const formData = createLoginFormData();

  const result = await submitLogin(formData, {
    authenticate: async () => "invalid",
  });

  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.code, "INVALID_CREDENTIALS");
  assert.equal(result.message, "Invalid email or password.");
});

test("login returns deterministic AUTH_ERROR feedback when provider fails", async () => {
  const formData = createLoginFormData();

  const result = await submitLogin(formData, {
    authenticate: async () => "error",
  });

  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.code, "AUTH_ERROR");
  assert.equal(result.message, "Unable to sign in right now. Please try again.");
});

test("signup returns validation errors when required fields are missing", async () => {
  const formData = createSignupFormData({ name: "", email: "", password: "" });

  const result = await submitSignup(formData, {
    findExistingUser: async () => null,
    createUser: async () => {
      throw new Error("createUser should not be called");
    },
    createTenant: async () => {
      throw new Error("createTenant should not be called");
    },
    createMembership: async () => {
      throw new Error("createMembership should not be called");
    },
  });

  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.code, "VALIDATION_ERROR");
  assert.ok(result.fieldErrors?.name);
  assert.ok(result.fieldErrors?.email);
  assert.ok(result.fieldErrors?.password);
});

test("signup lowercases email and wires tenant + membership creation on success", async () => {
  const formData = createSignupFormData({ email: "Mona@Example.COM" });
  const created: { email?: string; userId?: string; tenantId?: string } = {};

  const result = await submitSignup(formData, {
    findExistingUser: async () => null,
    createUser: async (input) => {
      created.email = input.email;
      return { _id: "user-1" };
    },
    createTenant: async () => ({ _id: "tenant-1" }),
    createMembership: async (input) => {
      created.userId = String(input.userId);
      created.tenantId = String(input.tenantId);
    },
  });

  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.redirectTo, "/onboarding/business");
  assert.equal(created.email, "mona@example.com");
  assert.equal(created.userId, "user-1");
  assert.equal(created.tenantId, "tenant-1");
});

test("signup returns server feedback when downstream persistence fails", async () => {
  const formData = createSignupFormData();

  const result = await submitSignup(formData, {
    findExistingUser: async () => null,
    createUser: async () => {
      throw new Error("db unavailable");
    },
    createTenant: async () => ({ _id: "tenant-1" }),
    createMembership: async () => {},
  });

  assert.equal(result.ok, false);
  if (result.ok) return;
  assert.equal(result.code, "SERVER_ERROR");
  assert.equal(result.message, "We could not create your account right now. Please try again.");
});

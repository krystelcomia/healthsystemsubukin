import { describe, it, expect, beforeEach } from "vitest";
import { mockSupabase, seedMockDatabase } from "../integrations/supabase/mockClient";

describe("Password Reset & Verification Flow", () => {
  const testEmail = "krystelcomia@gmail.com";

  beforeEach(() => {
    localStorage.clear();
    seedMockDatabase();
  });

  it("should generate a 6-digit reset token without returning the code to the caller", async () => {
    const res = await (mockSupabase.auth as any).resetPasswordForEmail(testEmail);
    expect(res.error).toBeNull();
    expect(res.data).toBeDefined();
    expect(res.data.email).toBe(testEmail);
    // The response must NOT include the code in data object to prevent on-screen exposure
    expect(res.data.code).toBeUndefined();

    // Verify token exists in internal storage
    const tokens = JSON.parse(localStorage.getItem("bhw_password_reset_tokens") || "{}");
    expect(tokens[testEmail]).toBeDefined();
    expect(tokens[testEmail].code).toHaveLength(6);
    expect(/^\d{6}$/.test(tokens[testEmail].code)).toBe(true);
  });

  it("should fail validation if incorrect verification code is entered", async () => {
    await (mockSupabase.auth as any).resetPasswordForEmail(testEmail);

    const verifyRes = await (mockSupabase.auth as any).verifyResetCode(testEmail, "999999");
    expect(verifyRes.error).toBeDefined();
    expect(verifyRes.error.message).toMatch(/incorrect verification code/i);
    expect(verifyRes.data).toBeNull();
  });

  it("should succeed validation when correct verification code is entered", async () => {
    await (mockSupabase.auth as any).resetPasswordForEmail(testEmail);
    const tokens = JSON.parse(localStorage.getItem("bhw_password_reset_tokens") || "{}");
    const correctCode = tokens[testEmail].code;

    const verifyRes = await (mockSupabase.auth as any).verifyResetCode(testEmail, correctCode);
    expect(verifyRes.error).toBeNull();
    expect(verifyRes.data?.verified).toBe(true);
  });

  it("should refuse password reset if code is missing or incorrect", async () => {
    await (mockSupabase.auth as any).resetPasswordForEmail(testEmail);

    // Missing code
    const failRes1 = await (mockSupabase.auth as any).resetUserPassword(testEmail, "newSecretPass123", "");
    expect(failRes1.error).toBeDefined();

    // Incorrect code
    const failRes2 = await (mockSupabase.auth as any).resetUserPassword(testEmail, "newSecretPass123", "000000");
    expect(failRes2.error).toBeDefined();
  });

  it("should successfully reset password and allow login with new password when correct code is provided", async () => {
    await (mockSupabase.auth as any).resetPasswordForEmail(testEmail);
    const tokens = JSON.parse(localStorage.getItem("bhw_password_reset_tokens") || "{}");
    const correctCode = tokens[testEmail].code;

    const newPass = "updatedPassword2026!";
    const resetRes = await (mockSupabase.auth as any).resetUserPassword(testEmail, newPass, correctCode);
    expect(resetRes.error).toBeNull();
    expect(resetRes.data).toBeDefined();

    // Verify logging in with old password fails
    const oldLoginRes = await mockSupabase.auth.signInWithPassword({
      email: testEmail,
      password: "krystel123"
    });
    expect(oldLoginRes.error).toBeDefined();

    // Verify logging in with new password succeeds
    const newLoginRes = await mockSupabase.auth.signInWithPassword({
      email: testEmail,
      password: newPass
    });
    expect(newLoginRes.error).toBeNull();
    expect(newLoginRes.data.session).toBeDefined();
  });
});

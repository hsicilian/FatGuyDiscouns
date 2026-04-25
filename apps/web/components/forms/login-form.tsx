"use client";

import { useActionState } from "react";
import type { FormActionState } from "@fatguydiscounts/types";
import { loginWithLocalAccountAction } from "../../app/actions/session/login";
import { PasswordInput } from "./password-input";
import { ResendConfirmationForm } from "./resend-confirmation-form";

const initialState: FormActionState = {
  ok: true,
  message: "Enter your email and password to sign in.",
};

export function LoginForm({ redirectTo = "/account" }: { redirectTo?: string }) {
  const [state, formAction, isPending] = useActionState(loginWithLocalAccountAction, initialState);
  const showResendConfirmation = !state.ok && typeof state.suggestedEmail === "string" && state.suggestedEmail.length > 0;

  return (
    <div style={{ display: "grid", gap: 14, marginTop: 20 }}>
      <form action={formAction} style={{ display: "grid", gap: 12 }}>
        <input type="hidden" name="redirectTo" value={redirectTo} />
        <input name="email" placeholder="Email address" autoComplete="email" defaultValue={state.suggestedEmail} style={{ padding: 14, borderRadius: 14, border: "1px solid #d9c7b2" }} />
        <PasswordInput name="password" placeholder="Password" autoComplete="current-password" />
        <button disabled={isPending} style={{ background: "#1f1d1a", color: "#fff", border: 0, borderRadius: 999, padding: "14px 16px", boxShadow: "0 12px 28px rgba(31,29,26,0.16)" }}>
          {isPending ? "Signing in..." : "Log In"}
        </button>
        <p style={{ color: state.ok ? "#2f5d32" : "#8e3200", margin: 0 }}>{state.message}</p>
      </form>

      {showResendConfirmation ? (
        <div style={{ padding: 16, borderRadius: 18, background: "rgba(255,255,255,0.56)", border: "1px solid rgba(232,214,195,0.88)" }}>
          <p style={{ margin: "0 0 10px", color: "var(--muted)", lineHeight: 1.6 }}>
            Need a new confirmation email? We already filled in the address you just tried.
          </p>
          <ResendConfirmationForm defaultEmail={state.suggestedEmail} compact />
        </div>
      ) : null}
    </div>
  );
}

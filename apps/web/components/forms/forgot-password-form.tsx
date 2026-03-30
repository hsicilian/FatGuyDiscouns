"use client";

import { useActionState } from "react";
import type { FormActionState } from "@fatguydiscounts/types";
import { requestPasswordResetAction } from "../../app/actions/session/request-password-reset";

const initialState: FormActionState = {
  ok: true,
  message: "Enter your email and we will send a reset link if the account exists.",
};

export function ForgotPasswordForm() {
  const [state, formAction, isPending] = useActionState(requestPasswordResetAction, initialState);

  return (
    <form action={formAction} style={{ display: "grid", gap: 12, marginTop: 20 }}>
      <input name="email" placeholder="Email address" autoComplete="email" style={{ padding: 14, borderRadius: 14, border: "1px solid #d9c7b2" }} />
      <button disabled={isPending} style={{ background: "#1f1d1a", color: "#fff", border: 0, borderRadius: 999, padding: "14px 16px", boxShadow: "0 12px 28px rgba(31,29,26,0.16)" }}>
        {isPending ? "Sending reset link..." : "Send Reset Link"}
      </button>
      <p style={{ color: state.ok ? "#2f5d32" : "#8e3200", margin: 0 }}>{state.message}</p>
    </form>
  );
}

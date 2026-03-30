"use client";

import { useActionState } from "react";
import type { FormActionState } from "@fatguydiscounts/types";
import { loginWithLocalAccountAction } from "../../app/actions/session/login";

const initialState: FormActionState = {
  ok: true,
  message: "Enter your email and password to sign in.",
};

export function LoginForm({ redirectTo = "/account" }: { redirectTo?: string }) {
  const [state, formAction, isPending] = useActionState(loginWithLocalAccountAction, initialState);

  return (
    <form action={formAction} style={{ display: "grid", gap: 12, marginTop: 20 }}>
      <input type="hidden" name="redirectTo" value={redirectTo} />
      <input name="email" placeholder="Email address" autoComplete="email" style={{ padding: 14, borderRadius: 14, border: "1px solid #d9c7b2" }} />
      <input name="password" placeholder="Password" type="password" autoComplete="current-password" style={{ padding: 14, borderRadius: 14, border: "1px solid #d9c7b2" }} />
      <button disabled={isPending} style={{ background: "#1f1d1a", color: "#fff", border: 0, borderRadius: 999, padding: "14px 16px", boxShadow: "0 12px 28px rgba(31,29,26,0.16)" }}>
        {isPending ? "Signing in..." : "Log In"}
      </button>
      <p style={{ color: state.ok ? "#2f5d32" : "#8e3200", margin: 0 }}>{state.message}</p>
    </form>
  );
}

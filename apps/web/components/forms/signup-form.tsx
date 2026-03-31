"use client";

import { useActionState } from "react";
import type { FormActionState } from "@fatguydiscounts/types";
import { signUpLocalCustomerAction } from "../../app/actions/session/signup";

const initialState: FormActionState = {
  ok: true,
  message: "Create an account and we will place it in the approval queue.",
};

export function SignupForm() {
  const [state, formAction, isPending] = useActionState(signUpLocalCustomerAction, initialState);

  return (
    <form action={formAction} style={{ display: "grid", gap: 12, marginTop: 20 }}>
      <input name="displayName" placeholder="Full name" autoComplete="name" style={{ padding: 14, borderRadius: 14, border: "1px solid #d9c7b2" }} />
      <input name="email" placeholder="Email address" autoComplete="email" style={{ padding: 14, borderRadius: 14, border: "1px solid #d9c7b2" }} />
      <input name="password" placeholder="Create password" type="password" autoComplete="new-password" style={{ padding: 14, borderRadius: 14, border: "1px solid #d9c7b2" }} />
      <button disabled={isPending} style={{ background: "#bb4d00", color: "#fff", border: 0, borderRadius: 999, padding: "14px 16px", boxShadow: "0 12px 28px rgba(187,77,0,0.18)" }}>
        {isPending ? "Creating account..." : "Create Account"}
      </button>
      <p style={{ color: state.ok ? "#2f5d32" : "#8e3200", margin: 0 }}>{state.message}</p>
    </form>
  );
}

"use client";

import { useActionState } from "react";
import type { FormActionState } from "@fatguydiscounts/types";
import { updatePasswordAction } from "../../app/actions/session/update-password";

const initialState: FormActionState = {
  ok: true,
  message: "Choose a new password for this account.",
};

export function ResetPasswordForm() {
  const [state, formAction, isPending] = useActionState(updatePasswordAction, initialState);

  return (
    <form action={formAction} style={{ display: "grid", gap: 12, marginTop: 20 }}>
      <input name="password" type="password" placeholder="New password" autoComplete="new-password" style={{ padding: 14, borderRadius: 14, border: "1px solid #d9c7b2" }} />
      <button disabled={isPending} style={{ background: "#1f1d1a", color: "#fff", border: 0, borderRadius: 999, padding: "14px 16px", boxShadow: "0 12px 28px rgba(31,29,26,0.16)" }}>
        {isPending ? "Updating password..." : "Update Password"}
      </button>
      <p style={{ color: state.ok ? "#2f5d32" : "#8e3200", margin: 0 }}>{state.message}</p>
    </form>
  );
}

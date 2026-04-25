"use client";

import { useActionState } from "react";
import type { FormActionState } from "@fatguydiscounts/types";
import { resendConfirmationAction } from "../../app/actions/session/resend-confirmation";

const initialState: FormActionState = {
  ok: true,
  message: "Enter your email and we will resend the account confirmation link if the account is still waiting on verification.",
};

export function ResendConfirmationForm({
  defaultEmail,
  compact = false,
}: {
  defaultEmail?: string;
  compact?: boolean;
}) {
  const [state, formAction, isPending] = useActionState(resendConfirmationAction, initialState);

  return (
    <form action={formAction} style={{ display: "grid", gap: 12, marginTop: compact ? 0 : 20 }}>
      <input name="email" placeholder="Email address" autoComplete="email" defaultValue={defaultEmail} style={{ padding: 14, borderRadius: 14, border: "1px solid #d9c7b2" }} />
      <button disabled={isPending} style={{ background: "#bb4d00", color: "#fff", border: 0, borderRadius: 999, padding: "14px 16px", boxShadow: "0 12px 28px rgba(187,77,0,0.18)" }}>
        {isPending ? "Resending confirmation..." : "Resend Confirmation Email"}
      </button>
      <p style={{ color: state.ok ? "#2f5d32" : "#8e3200", margin: 0 }}>{state.message}</p>
    </form>
  );
}

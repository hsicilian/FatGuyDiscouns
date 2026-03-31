"use client";

import { useActionState } from "react";
import type { FormActionState } from "@fatguydiscounts/types";
import { sendCustomerMessageAction } from "../../app/actions/account/message";

const initialState: FormActionState = {
  ok: true,
  message: "Send a message to the admin team if you need help with your account, claims, or shipment.",
};

export function CustomerMessageForm() {
  const [state, formAction, isPending] = useActionState(sendCustomerMessageAction, initialState);

  return (
    <form action={formAction} style={{ display: "grid", gap: 10 }}>
      <label style={{ display: "grid", gap: 6 }}>
        <span style={{ color: "#6d655d", fontSize: 14 }}>Message to admin</span>
        <textarea
          name="message"
          rows={4}
          maxLength={500}
          placeholder="Let the admin team know what you need."
          style={{ width: "100%", padding: 12, borderRadius: 12, border: "1px solid #d9c7b2", resize: "vertical", boxSizing: "border-box" }}
        />
      </label>
      <button disabled={isPending} style={{ width: "100%", background: "#1f1d1a", color: "#fff", border: 0, borderRadius: 999, padding: "12px 16px" }}>
        {isPending ? "Sending..." : "Send Message"}
      </button>
      <p style={{ color: state.ok ? "#2f5d32" : "#8e3200", margin: 0 }}>{state.message}</p>
    </form>
  );
}

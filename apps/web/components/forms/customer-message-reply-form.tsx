"use client";

import { useActionState } from "react";
import type { FormActionState } from "@fatguydiscounts/types";
import { replyToCustomerMessageAction } from "../../app/actions/customers/reply-message";

const initialState: FormActionState = {
  ok: true,
  message: "Reply to the customer from their CRM record.",
};

export function CustomerMessageReplyForm({ customerId }: { customerId: string }) {
  const [state, formAction, isPending] = useActionState(replyToCustomerMessageAction, initialState);

  return (
    <form action={formAction} style={{ display: "grid", gap: 10 }}>
      <input type="hidden" name="customerId" value={customerId} />
      <label style={{ display: "grid", gap: 6 }}>
        <span style={{ color: "#6d655d", fontSize: 14 }}>Reply to customer</span>
        <textarea
          name="message"
          rows={3}
          maxLength={500}
          placeholder="Send a reply that will appear in the customer's account."
          style={{ width: "100%", padding: 12, borderRadius: 12, border: "1px solid #d9c7b2", resize: "vertical", boxSizing: "border-box" }}
        />
      </label>
      <button disabled={isPending} style={{ width: "100%", background: "#1f1d1a", color: "#fff", border: 0, borderRadius: 999, padding: "12px 16px" }}>
        {isPending ? "Sending..." : "Send Reply"}
      </button>
      <p style={{ color: state.ok ? "#2f5d32" : "#8e3200", margin: 0 }}>{state.message}</p>
    </form>
  );
}

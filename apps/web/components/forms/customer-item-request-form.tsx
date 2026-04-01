"use client";

import { useActionState } from "react";
import type { FormActionState } from "@fatguydiscounts/types";
import { sendCustomerItemRequestAction } from "../../app/actions/account/item-request";

const initialState: FormActionState = {
  ok: true,
  message: "Tell admin what you're looking for and include as many details as possible.",
};

export function CustomerItemRequestForm() {
  const [state, formAction, isPending] = useActionState(sendCustomerItemRequestAction, initialState);

  return (
    <form action={formAction} style={{ display: "grid", gap: 10 }}>
      <label style={{ display: "grid", gap: 6 }}>
        <span style={{ color: "#6d655d", fontSize: 14 }}>Describe what you want us to find</span>
        <textarea
          name="request"
          rows={5}
          maxLength={1000}
          placeholder="Add as many specifics as possible: brand, size, color, style, fit, budget, team, era, condition, or anything else that would help."
          style={{ width: "100%", padding: 12, borderRadius: 12, border: "1px solid #d9c7b2", resize: "vertical", boxSizing: "border-box" }}
        />
      </label>
      <button disabled={isPending} style={{ width: "100%", background: "#1f1d1a", color: "#fff", border: 0, borderRadius: 999, padding: "12px 16px" }}>
        {isPending ? "Sending..." : "Send Request"}
      </button>
      <p style={{ color: state.ok ? "#2f5d32" : "#8e3200", margin: 0 }}>{state.message}</p>
    </form>
  );
}

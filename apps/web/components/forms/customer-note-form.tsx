"use client";

import { useActionState } from "react";
import type { FormActionState } from "@fatguydiscounts/types";
import { addCustomerNoteAction } from "../../app/actions/customers/note";

const initialState: FormActionState = {
  ok: true,
  message: "Add an internal note for this customer.",
};

export function CustomerNoteForm({ customerId }: { customerId: string }) {
  const [state, formAction, isPending] = useActionState(addCustomerNoteAction, initialState);

  return (
    <form action={formAction} style={{ display: "grid", gap: 8 }}>
      <input type="hidden" name="customerId" value={customerId} />
      <textarea name="note" rows={3} placeholder="Add an internal note" style={{ padding: 10, borderRadius: 12, border: "1px solid #d9c7b2", resize: "vertical" }} />
      <button disabled={isPending} style={{ background: "#1f1d1a", color: "#fff", border: 0, borderRadius: 999, padding: "10px 14px" }}>
        {isPending ? "Saving..." : "Save Note"}
      </button>
      <p style={{ color: state.ok ? "#2f5d32" : "#8e3200", margin: 0 }}>{state.message}</p>
    </form>
  );
}
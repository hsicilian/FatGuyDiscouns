"use client";

import { useActionState } from "react";
import type { FormActionState } from "@fatguydiscounts/types";
import { promoteCustomerToAdminAction } from "../../app/actions/customers/promote";

const initialState: FormActionState = {
  ok: true,
  message: "Master admin can promote this customer to admin.",
};

export function PromoteAdminForm({ customerId }: { customerId: string }) {
  const [state, formAction, isPending] = useActionState(promoteCustomerToAdminAction, initialState);

  return (
    <form action={formAction} style={{ display: "grid", gap: 8 }}>
      <input type="hidden" name="customerId" value={customerId} />
      <button disabled={isPending} style={{ background: "transparent", color: "#1f1d1a", border: "1px solid #d9c7b2", borderRadius: 999, padding: "10px 14px" }}>
        {isPending ? "Promoting..." : "Promote to Admin"}
      </button>
      <p style={{ color: state.ok ? "#2f5d32" : "#8e3200", margin: 0 }}>{state.message}</p>
    </form>
  );
}
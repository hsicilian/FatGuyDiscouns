"use client";

import { useActionState } from "react";
import type { FormActionState } from "@fatguydiscounts/types";
import { createManualCustomerAction } from "../../app/actions/customers/create";

const initialState: FormActionState = {
  ok: true,
  message: "Add a customer directly in the CRM with a confirmed login and approved account.",
};

export function ManualCustomerCreateForm() {
  const [state, formAction, isPending] = useActionState(createManualCustomerAction, initialState);

  return (
    <form action={formAction} style={{ display: "grid", gap: 12 }}>
      <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ color: "var(--muted)", fontSize: 14 }}>Customer name</span>
          <input name="displayName" required placeholder="Barbara Smith" style={{ minWidth: 0, width: "100%", padding: 14, borderRadius: 14, border: "1px solid #d9c7b2" }} />
        </label>
        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ color: "var(--muted)", fontSize: 14 }}>Email</span>
          <input name="email" type="email" required placeholder="customer@email.com" autoComplete="email" style={{ minWidth: 0, width: "100%", padding: 14, borderRadius: 14, border: "1px solid #d9c7b2" }} />
        </label>
      </div>

      <label style={{ display: "grid", gap: 6 }}>
        <span style={{ color: "var(--muted)", fontSize: 14 }}>Temporary password</span>
        <input name="password" type="text" required minLength={8} placeholder="At least 8 characters" autoComplete="new-password" style={{ minWidth: 0, width: "100%", padding: 14, borderRadius: 14, border: "1px solid #d9c7b2" }} />
      </label>

      <label style={{ display: "grid", gap: 6 }}>
        <span style={{ color: "var(--muted)", fontSize: 14 }}>Street address</span>
        <input name="street" required autoComplete="address-line1" placeholder="123 Main St" style={{ minWidth: 0, width: "100%", padding: 14, borderRadius: 14, border: "1px solid #d9c7b2" }} />
      </label>

      <div style={{ display: "grid", gap: 12, gridTemplateColumns: "minmax(0, 1.4fr) minmax(0, 1fr) minmax(0, 1fr)" }}>
        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ color: "var(--muted)", fontSize: 14 }}>City</span>
          <input name="city" required autoComplete="address-level2" style={{ minWidth: 0, width: "100%", padding: 14, borderRadius: 14, border: "1px solid #d9c7b2" }} />
        </label>
        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ color: "var(--muted)", fontSize: 14 }}>State</span>
          <input name="region" required autoComplete="address-level1" style={{ minWidth: 0, width: "100%", padding: 14, borderRadius: 14, border: "1px solid #d9c7b2" }} />
        </label>
        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ color: "var(--muted)", fontSize: 14 }}>Zip code</span>
          <input name="postalCode" required autoComplete="postal-code" style={{ minWidth: 0, width: "100%", padding: 14, borderRadius: 14, border: "1px solid #d9c7b2" }} />
        </label>
      </div>

      <label style={{ display: "grid", gap: 6 }}>
        <span style={{ color: "var(--muted)", fontSize: 14 }}>Timezone</span>
        <select name="timezone" defaultValue="America/New_York" style={{ minWidth: 0, width: "100%", padding: 14, borderRadius: 14, border: "1px solid #d9c7b2" }}>
          <option value="America/New_York">Eastern Time</option>
          <option value="America/Chicago">Central Time</option>
          <option value="America/Denver">Mountain Time</option>
          <option value="America/Los_Angeles">Pacific Time</option>
        </select>
      </label>

      <button disabled={isPending} style={{ background: "#bb4d00", color: "#fff", border: 0, borderRadius: 999, padding: "12px 16px", fontWeight: 700 }}>
        {isPending ? "Adding customer..." : "Add Customer"}
      </button>

      <p style={{ margin: 0, color: state.ok ? "#2f5d32" : "#8e3200" }}>{state.message}</p>
      <p style={{ margin: 0, color: "var(--muted)", fontSize: 13 }}>
        This creates an approved customer account with a confirmed email so they can sign in right away and change the password later.
      </p>
    </form>
  );
}

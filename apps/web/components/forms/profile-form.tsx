"use client";

import { useActionState } from "react";
import type { FormActionState } from "@fatguydiscounts/types";
import { updateCustomerProfileAction } from "../../app/actions/account/profile";

const initialState: FormActionState = {
  ok: true,
  message: "Keep your shipping address and timezone current.",
};

export function ProfileForm({
  defaultAddress,
  defaultTimezone,
}: {
  defaultAddress: string;
  defaultTimezone: string;
}) {
  const [state, formAction, isPending] = useActionState(updateCustomerProfileAction, initialState);

  return (
    <form action={formAction} style={{ display: "grid", gap: 12 }}>
      <label style={{ display: "grid", gap: 6 }}>
        <span style={{ color: "var(--muted)", fontSize: 14 }}>Address</span>
        <textarea name="address" defaultValue={defaultAddress} rows={3} style={{ padding: 14, borderRadius: 14, border: "1px solid #d9c7b2", resize: "vertical", font: "inherit" }} />
      </label>
      <label style={{ display: "grid", gap: 6 }}>
        <span style={{ color: "var(--muted)", fontSize: 14 }}>Timezone</span>
        <select name="timezone" defaultValue={defaultTimezone} style={{ padding: 14, borderRadius: 14, border: "1px solid #d9c7b2" }}>
          <option value="America/New_York">Eastern Time</option>
          <option value="America/Chicago">Central Time</option>
          <option value="America/Denver">Mountain Time</option>
          <option value="America/Los_Angeles">Pacific Time</option>
        </select>
      </label>
      <button disabled={isPending} style={{ background: "#bb4d00", color: "#fff", border: 0, borderRadius: 999, padding: "12px 16px" }}>
        {isPending ? "Saving..." : "Update Profile"}
      </button>
      <p style={{ color: state.ok ? "#2f5d32" : "#8e3200", margin: 0 }}>{state.message}</p>
    </form>
  );
}
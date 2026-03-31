"use client";

import { useActionState } from "react";
import type { FormActionState } from "@fatguydiscounts/types";
import { updateCustomerProfileAction } from "../../app/actions/account/profile";

const initialState: FormActionState = {
  ok: true,
  message: "Keep your shipping address and timezone current.",
};

export function ProfileForm({
  defaultStreet,
  defaultCity,
  defaultRegion,
  defaultPostalCode,
  defaultTimezone,
}: {
  defaultStreet: string;
  defaultCity: string;
  defaultRegion: string;
  defaultPostalCode: string;
  defaultTimezone: string;
}) {
  const [state, formAction, isPending] = useActionState(updateCustomerProfileAction, initialState);

  return (
    <form action={formAction} style={{ display: "grid", gap: 12 }}>
      <label style={{ display: "grid", gap: 6 }}>
        <span style={{ color: "var(--muted)", fontSize: 14 }}>Street address</span>
        <input name="street" defaultValue={defaultStreet} autoComplete="address-line1" style={{ minWidth: 0, width: "100%", padding: 14, borderRadius: 14, border: "1px solid #d9c7b2" }} />
      </label>
      <div style={{ display: "grid", gap: 12, gridTemplateColumns: "minmax(0, 1.5fr) minmax(0, 1fr)", alignItems: "start" }}>
        <label style={{ display: "grid", gap: 6, minWidth: 0 }}>
          <span style={{ color: "var(--muted)", fontSize: 14 }}>City</span>
          <input name="city" defaultValue={defaultCity} autoComplete="address-level2" style={{ minWidth: 0, width: "100%", padding: 14, borderRadius: 14, border: "1px solid #d9c7b2" }} />
        </label>
        <label style={{ display: "grid", gap: 6, minWidth: 0 }}>
          <span style={{ color: "var(--muted)", fontSize: 14 }}>State</span>
          <input name="region" defaultValue={defaultRegion} autoComplete="address-level1" style={{ minWidth: 0, width: "100%", padding: 14, borderRadius: 14, border: "1px solid #d9c7b2" }} />
        </label>
      </div>
      <div style={{ display: "grid", gap: 12 }}>
        <label style={{ display: "grid", gap: 6, minWidth: 0 }}>
          <span style={{ color: "var(--muted)", fontSize: 14 }}>Zip code</span>
          <input name="postalCode" defaultValue={defaultPostalCode} autoComplete="postal-code" style={{ minWidth: 0, width: "100%", padding: 14, borderRadius: 14, border: "1px solid #d9c7b2" }} />
        </label>
      </div>
      <label style={{ display: "grid", gap: 6 }}>
        <span style={{ color: "var(--muted)", fontSize: 14 }}>Timezone</span>
        <select name="timezone" defaultValue={defaultTimezone} style={{ minWidth: 0, width: "100%", padding: 14, borderRadius: 14, border: "1px solid #d9c7b2" }}>
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

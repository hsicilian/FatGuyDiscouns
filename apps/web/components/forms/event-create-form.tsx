"use client";

import { useActionState, useState } from "react";
import type { FormActionState } from "@fatguydiscounts/types";
import { createEventAction } from "../../app/actions/events/create";

const initialState: FormActionState = {
  ok: true,
  message: "Add the next live sale or drop to the calendar.",
};

export function EventCreateForm() {
  const [state, formAction, isPending] = useActionState(createEventAction, initialState);
  const [repeatWeekly, setRepeatWeekly] = useState(false);

  return (
    <form action={formAction} style={{ display: "grid", gap: 10 }}>
      <label style={{ display: "grid", gap: 4 }}>
        <span style={{ color: "#6d655d", fontSize: 14 }}>Title</span>
        <input name="title" type="text" placeholder="Sunday claim show" style={{ padding: 10, borderRadius: 12, border: "1px solid #d9c7b2" }} />
      </label>
      <label style={{ display: "grid", gap: 4 }}>
        <span style={{ color: "#6d655d", fontSize: 14 }}>Date and time</span>
        <input name="startsAtLocal" type="datetime-local" style={{ padding: 10, borderRadius: 12, border: "1px solid #d9c7b2" }} />
      </label>
      <label style={{ display: "grid", gap: 4 }}>
        <span style={{ color: "#6d655d", fontSize: 14 }}>Timezone</span>
        <select name="timeZone" defaultValue="America/New_York" style={{ padding: 10, borderRadius: 12, border: "1px solid #d9c7b2" }}>
          <option value="America/New_York">Eastern Time</option>
          <option value="America/Chicago">Central Time</option>
          <option value="America/Denver">Mountain Time</option>
          <option value="America/Los_Angeles">Pacific Time</option>
        </select>
      </label>
      <label style={{ display: "grid", gap: 4 }}>
        <span style={{ color: "#6d655d", fontSize: 14 }}>Platform</span>
        <input name="platform" type="text" placeholder="Facebook Live" style={{ padding: 10, borderRadius: 12, border: "1px solid #d9c7b2" }} />
      </label>
      <label style={{ display: "grid", gap: 4 }}>
        <span style={{ color: "#6d655d", fontSize: 14 }}>External link</span>
        <input name="externalLink" type="url" placeholder="https://..." style={{ padding: 10, borderRadius: 12, border: "1px solid #d9c7b2" }} />
      </label>
      <label style={{ display: "grid", gap: 4 }}>
        <span style={{ color: "#6d655d", fontSize: 14 }}>Description</span>
        <textarea name="description" rows={5} placeholder="Tell shoppers what is dropping during this event." style={{ padding: 10, borderRadius: 12, border: "1px solid #d9c7b2", resize: "vertical" }} />
      </label>
      <label style={{ display: "flex", gap: 10, alignItems: "center", padding: "6px 2px" }}>
        <input
          name="repeatWeekly"
          type="checkbox"
          checked={repeatWeekly}
          onChange={(event) => setRepeatWeekly(event.target.checked)}
          style={{ width: 16, height: 16 }}
        />
        <span style={{ color: "#6d655d", fontSize: 14 }}>Repeat weekly</span>
      </label>
      {repeatWeekly ? (
        <label style={{ display: "grid", gap: 4 }}>
          <span style={{ color: "#6d655d", fontSize: 14 }}>Repeat until</span>
          <input name="repeatUntilLocal" type="date" style={{ padding: 10, borderRadius: 12, border: "1px solid #d9c7b2" }} />
        </label>
      ) : null}
      <button disabled={isPending} style={{ background: "#bb4d00", color: "#fff", border: 0, borderRadius: 999, padding: "12px 16px", fontWeight: 700 }}>
        {isPending ? "Saving..." : "Add Event"}
      </button>
      <p style={{ color: state.ok ? "#2f5d32" : "#8e3200", margin: 0 }}>{state.message}</p>
    </form>
  );
}

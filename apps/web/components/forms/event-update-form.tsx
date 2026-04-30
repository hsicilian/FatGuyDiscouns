"use client";

import { useActionState } from "react";
import type { FormActionState, ShowEvent } from "@fatguydiscounts/types";
import { updateEventAction } from "../../app/actions/events/update";
import { formatIsoForDateTimeInput } from "../../lib/events";

const initialState: FormActionState = {
  ok: true,
  message: "",
};

export function EventUpdateForm({ event }: { event: ShowEvent }) {
  const [state, formAction, isPending] = useActionState(updateEventAction, initialState);
  const defaultTimeZone = event.timeZone ?? "America/New_York";

  return (
    <form action={formAction} style={{ display: "grid", gap: 10, padding: 16, borderRadius: 18, background: "rgba(255,255,255,0.56)", border: "1px solid rgba(232,214,195,0.85)" }}>
      <input type="hidden" name="eventId" value={event.id} />
      <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
        <label style={{ display: "grid", gap: 4 }}>
          <span style={{ color: "#6d655d", fontSize: 14 }}>Title</span>
          <input name="title" type="text" defaultValue={event.title} style={{ padding: 10, borderRadius: 12, border: "1px solid #d9c7b2" }} />
        </label>
        <label style={{ display: "grid", gap: 4 }}>
          <span style={{ color: "#6d655d", fontSize: 14 }}>Date and time</span>
          <input
            name="startsAtLocal"
            type="datetime-local"
            defaultValue={formatIsoForDateTimeInput(event.startsAt, defaultTimeZone)}
            style={{ padding: 10, borderRadius: 12, border: "1px solid #d9c7b2" }}
          />
        </label>
      </div>
      <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
        <label style={{ display: "grid", gap: 4 }}>
          <span style={{ color: "#6d655d", fontSize: 14 }}>Timezone</span>
          <select name="timeZone" defaultValue={defaultTimeZone} style={{ padding: 10, borderRadius: 12, border: "1px solid #d9c7b2" }}>
            <option value="America/New_York">Eastern Time</option>
            <option value="America/Chicago">Central Time</option>
            <option value="America/Denver">Mountain Time</option>
            <option value="America/Los_Angeles">Pacific Time</option>
          </select>
        </label>
        <label style={{ display: "grid", gap: 4 }}>
          <span style={{ color: "#6d655d", fontSize: 14 }}>Platform</span>
          <input name="platform" type="text" defaultValue={event.platform ?? ""} placeholder="Facebook Live" style={{ padding: 10, borderRadius: 12, border: "1px solid #d9c7b2" }} />
        </label>
      </div>
      <label style={{ display: "grid", gap: 4 }}>
        <span style={{ color: "#6d655d", fontSize: 14 }}>External link</span>
        <input name="externalLink" type="url" defaultValue={event.externalLink} placeholder="https://..." style={{ padding: 10, borderRadius: 12, border: "1px solid #d9c7b2" }} />
      </label>
      <label style={{ display: "grid", gap: 4 }}>
        <span style={{ color: "#6d655d", fontSize: 14 }}>Description</span>
        <textarea name="description" rows={4} defaultValue={event.description} style={{ padding: 10, borderRadius: 12, border: "1px solid #d9c7b2", resize: "vertical" }} />
      </label>
      <button disabled={isPending} style={{ background: "#1f1d1a", color: "#fff", border: 0, borderRadius: 999, padding: "10px 14px", fontWeight: 700 }}>
        {isPending ? "Saving..." : "Save Changes"}
      </button>
      {state.message ? <p style={{ color: state.ok ? "#2f5d32" : "#8e3200", margin: 0, fontSize: 13 }}>{state.message}</p> : null}
    </form>
  );
}

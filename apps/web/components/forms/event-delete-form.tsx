"use client";

import { useActionState } from "react";
import type { FormActionState } from "@fatguydiscounts/types";
import { deleteEventAction } from "../../app/actions/events/delete";

const initialState: FormActionState = {
  ok: true,
  message: "",
};

export function EventDeleteForm({ eventId }: { eventId: string }) {
  const [state, formAction, isPending] = useActionState(deleteEventAction, initialState);

  return (
    <form action={formAction} style={{ display: "grid", gap: 8 }}>
      <input type="hidden" name="eventId" value={eventId} />
      <button
        disabled={isPending}
        style={{
          background: "rgba(142,50,0,0.1)",
          color: "#8e3200",
          border: "1px solid rgba(142,50,0,0.18)",
          borderRadius: 999,
          padding: "10px 16px",
          fontWeight: 700,
        }}
      >
        {isPending ? "Removing..." : "Delete Event"}
      </button>
      {state.message ? <p style={{ color: state.ok ? "#2f5d32" : "#8e3200", margin: 0, fontSize: 13 }}>{state.message}</p> : null}
    </form>
  );
}

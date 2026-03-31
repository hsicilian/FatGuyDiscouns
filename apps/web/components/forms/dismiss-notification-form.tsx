"use client";

import { useActionState } from "react";
import type { FormActionState } from "@fatguydiscounts/types";
import { dismissNotificationAction } from "../../app/actions/notifications/dismiss";

const initialState: FormActionState = {
  ok: true,
  message: "",
};

export function DismissNotificationForm({ notificationId }: { notificationId: string }) {
  const [state, formAction, isPending] = useActionState(dismissNotificationAction, initialState);

  return (
    <form action={formAction} style={{ display: "flex", justifyContent: "flex-end" }}>
      <input type="hidden" name="notificationId" value={notificationId} />
      <button
        disabled={isPending}
        style={{
          background: "rgba(255,255,255,0.82)",
          border: "1px solid var(--line)",
          borderRadius: 999,
          padding: "8px 12px",
          fontWeight: 700,
        }}
      >
        {isPending ? "Dismissing..." : "Dismiss"}
      </button>
      {state.message ? <span style={{ display: "none" }}>{state.message}</span> : null}
    </form>
  );
}

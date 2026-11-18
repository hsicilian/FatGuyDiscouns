"use client";
import { useActionState, useEffect, useState } from "react";
import { addAccountCreditAction } from "../../app/actions/credits/add";
import { getEasternDateInputValue } from "../../lib/date-format";
import type { FormActionState } from "@fatguydiscounts/types";

function CreditEntry({ customerId, startAnother }: { customerId: string; startAnother: () => void }) {
  const [requestId, setRequestId] = useState("");
  useEffect(() => { setRequestId(crypto.randomUUID()); }, []);
  const [state, action, pending] = useActionState(addAccountCreditAction, { ok: false, message: "" } as FormActionState);
  const saved = state.ok === true;
  return <form action={action} style={{ display: "grid", gap: 12 }}>
    <input type="hidden" name="customerId" value={customerId} />
    <input type="hidden" name="requestId" value={requestId} />
    <fieldset disabled={pending || saved} style={{ border: 0, padding: 0, display: "grid", gap: 12 }}>
      <label>Credit to add ($)<input name="amount" type="number" min="0.01" max="9999999999.99" step="0.01" required style={{ width: "100%", minHeight: 44 }} /></label>
      <label>Reason<select name="kind" style={{ width: "100%", minHeight: 44 }}><option>Shipping deposit</option><option>Gift certificate</option><option>Other</option></select></label>
      <label>Note / reference<input name="note" maxLength={240} style={{ width: "100%", minHeight: 44 }} /></label>
      <label>Record date<input name="recordedAt" type="date" required defaultValue={getEasternDateInputValue()} style={{ width: "100%", minHeight: 44 }} /></label>
      <button disabled={!requestId} style={{ minHeight: 44 }}>{pending ? "Saving credit…" : "Add account credit"}</button>
    </fieldset>
    <p role="status" style={{ color: saved ? "#2f5d32" : "#8e3200" }}>{state.message}</p>
    {saved && <button type="button" onClick={startAnother}>Start another credit</button>}
  </form>;
}
export function AddAccountCreditForm({ customerId }: { customerId: string }) {
  const [entry, setEntry] = useState(0);
  return <section style={{ padding: 20, border: "1px solid var(--line)", borderRadius: 20 }}>
    <h3>Add account credit</h3>
    <p>Record money received for future shipping, a gift certificate, or another account credit—even when the balance due is $0. This adds to credit on file and does not pay a bill. Credit is available for later use across the account; the reason records its purpose.</p>
    <CreditEntry key={`${customerId}-${entry}`} customerId={customerId} startAnother={() => setEntry(entry + 1)} />
  </section>;
}

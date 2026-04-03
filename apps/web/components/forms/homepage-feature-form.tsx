"use client";

import { useActionState } from "react";
import type { FormActionState } from "@fatguydiscounts/types";
import { updateHomepageFeaturedAction } from "../../app/actions/inventory/homepage-feature";

const initialState: FormActionState = {
  ok: true,
  message: "Choose whether this item should appear as a homepage top pick.",
};

export function HomepageFeatureForm({
  productId,
  featured,
}: {
  productId: string;
  featured: boolean;
}) {
  const [state, formAction, isPending] = useActionState(updateHomepageFeaturedAction, initialState);

  return (
    <form action={formAction} style={{ display: "grid", gap: 8 }}>
      <input type="hidden" name="productId" value={productId} />
      <input type="hidden" name="featured" value={featured ? "false" : "true"} />
      <button
        disabled={isPending}
        style={{ background: featured ? "#1d1d1d" : "var(--accent)", color: "#fff", border: 0, borderRadius: 999, padding: "10px 14px", fontWeight: 700 }}
      >
        {isPending ? "Saving..." : featured ? "Remove From Homepage" : "Feature On Homepage"}
      </button>
      <p style={{ color: state.ok ? "#2f5d32" : "#8e3200", margin: 0, fontSize: 13 }}>{state.message}</p>
    </form>
  );
}

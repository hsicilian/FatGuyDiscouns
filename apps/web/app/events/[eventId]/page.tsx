import { notFound } from "next/navigation";
import { getCurrentSessionAccount } from "../../../lib/auth/session";
import { getCurrentCustomer, getEventById } from "../../../lib/data/local-db";
import { formatEventLabel, labelTimezone } from "../../../lib/events";

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const [event, currentSession] = await Promise.all([
    getEventById(eventId),
    getCurrentSessionAccount(),
  ]);

  if (!event) {
    notFound();
  }

  const isCustomerLocal = currentSession?.role === "customer";
  const currentCustomer = isCustomerLocal ? await getCurrentCustomer() : null;
  const displayTimeZone = currentCustomer?.timezone ?? "America/New_York";
  const displayZoneLabel = labelTimezone(displayTimeZone, isCustomerLocal);

  return (
    <main style={{ maxWidth: 960, margin: "0 auto", padding: "36px 24px 72px", display: "grid", gap: 24 }}>
      <section style={{ background: "linear-gradient(145deg, rgba(255, 249, 241, 0.95) 0%, rgba(246, 229, 209, 0.92) 100%)", border: "1px solid var(--line)", borderRadius: 30, padding: 28, boxShadow: "var(--shadow)" }}>
        <p style={{ textTransform: "uppercase", letterSpacing: "0.14em", fontSize: 12, color: "var(--accent-strong)", marginTop: 0, fontWeight: 700 }}>{event.platform ?? "Live sale"}</p>
        <h1 style={{ margin: "0 0 12px" }}>{event.title}</h1>
        <p style={{ color: "var(--muted)", lineHeight: 1.7, marginBottom: 0 }}>
          {formatEventLabel(event.startsAt, displayTimeZone)} {displayZoneLabel}
        </p>
      </section>

      <section style={{ background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 26, padding: 24, boxShadow: "var(--shadow)", display: "grid", gap: 18 }}>
        <div>
          <h2 style={{ marginTop: 0 }}>Event details</h2>
          <p style={{ color: "var(--muted)", lineHeight: 1.8, marginBottom: 0 }}>{event.description || "More details will be shared soon."}</p>
        </div>

        <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
          <div style={{ padding: 16, borderRadius: 18, background: "rgba(255,255,255,0.56)", border: "1px solid rgba(232,214,195,0.85)" }}>
            <p style={{ marginTop: 0, color: "var(--muted)", fontSize: 13, textTransform: "uppercase", letterSpacing: "0.08em" }}>Time</p>
            <strong>{formatEventLabel(event.startsAt, displayTimeZone)} {displayZoneLabel}</strong>
          </div>
          <div style={{ padding: 16, borderRadius: 18, background: "rgba(255,255,255,0.56)", border: "1px solid rgba(232,214,195,0.85)" }}>
            <p style={{ marginTop: 0, color: "var(--muted)", fontSize: 13, textTransform: "uppercase", letterSpacing: "0.08em" }}>Platform</p>
            <strong>{event.platform ?? "Live sale"}</strong>
          </div>
        </div>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <a href="/events" style={{ padding: "12px 18px", borderRadius: 999, border: "1px solid var(--line)", background: "rgba(255,255,255,0.72)", fontWeight: 700 }}>
            Back to calendar
          </a>
          {event.externalLink ? (
            <a href={event.externalLink} target="_blank" rel="noreferrer" style={{ padding: "12px 18px", borderRadius: 999, background: "#bb4d00", color: "#fff", fontWeight: 700, boxShadow: "0 12px 24px rgba(187, 77, 0, 0.18)" }}>
              Open external event link
            </a>
          ) : null}
        </div>
      </section>
    </main>
  );
}

import { getCurrentSessionAccount } from "../../lib/auth/session";
import { getCurrentCustomer, listEvents } from "../../lib/data/local-db";

function formatEventLabel(iso: string, timeZone: string) {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone,
  }).format(new Date(iso));
}

function labelTimezone(timeZone: string, isCustomerLocal: boolean) {
  if (!isCustomerLocal) {
    return "ET";
  }

  switch (timeZone) {
    case "America/Chicago":
      return "CT";
    case "America/Denver":
      return "MT";
    case "America/Los_Angeles":
      return "PT";
    case "America/New_York":
    default:
      return "ET";
  }
}

export default async function EventsPage() {
  const [events, currentSession] = await Promise.all([
    listEvents(),
    getCurrentSessionAccount(),
  ]);

  const isCustomerLocal = currentSession?.role === "customer";
  const currentCustomer = isCustomerLocal ? await getCurrentCustomer() : null;
  const displayTimeZone = currentCustomer?.timezone ?? "America/New_York";
  const displayZoneLabel = labelTimezone(displayTimeZone, isCustomerLocal);

  return (
    <main style={{ maxWidth: 1120, margin: "0 auto", padding: "36px 24px 72px" }}>
      <section style={{ background: "linear-gradient(145deg, rgba(255, 249, 241, 0.95) 0%, rgba(246, 229, 209, 0.92) 100%)", border: "1px solid var(--line)", borderRadius: 30, padding: 28, boxShadow: "var(--shadow)", marginBottom: 24 }}>
        <p style={{ textTransform: "uppercase", letterSpacing: "0.14em", fontSize: 12, color: "var(--accent-strong)", marginTop: 0, fontWeight: 700 }}>Upcoming shows</p>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 18, alignItems: "end", flexWrap: "wrap" }}>
          <div>
            <h1 style={{ margin: "0 0 12px" }}>Live sale schedule</h1>
            <p style={{ color: "var(--muted)", maxWidth: 760, lineHeight: 1.7, marginBottom: 0 }}>
              {isCustomerLocal
                ? `Your calendar is shown in your saved timezone (${displayZoneLabel}) so show times match your account settings.`
                : "Guests and staff see upcoming shows in Eastern Time."}
            </p>
          </div>
          <div style={{ background: "rgba(255,255,255,0.52)", border: "1px solid rgba(232,214,195,0.9)", borderRadius: 18, padding: 16, width: "min(100%, 220px)" }}>
            <p style={{ marginTop: 0, color: "var(--muted)", fontSize: 13, textTransform: "uppercase", letterSpacing: "0.08em" }}>Time zone</p>
            <strong style={{ fontSize: "1.15rem" }}>{displayZoneLabel}</strong>
            <p style={{ margin: "6px 0 0", color: "var(--muted)" }}>{events.length} upcoming event{events.length === 1 ? "" : "s"}</p>
          </div>
        </div>
      </section>

      <div style={{ display: "grid", gap: 16 }}>
        {events.map((event, index) => (
          <article key={event.id} style={{ background: index === 0 ? "linear-gradient(145deg, rgba(187,77,0,0.94) 0%, rgba(142,50,0,0.98) 100%)" : "var(--panel)", color: index === 0 ? "#fff" : "var(--ink)", border: index === 0 ? "none" : "1px solid var(--line)", borderRadius: 26, padding: 24, boxShadow: "var(--shadow)", backdropFilter: "blur(14px)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap", alignItems: "start" }}>
              <div>
                <p style={{ marginTop: 0, color: index === 0 ? "rgba(255,244,230,0.92)" : "var(--accent-strong)", textTransform: "uppercase", letterSpacing: "0.08em", fontSize: 12, fontWeight: 700 }}>
                  {event.platform ?? "Live sale"}
                </p>
                <h2 style={{ margin: "0 0 8px" }}>{event.title}</h2>
                <p style={{ color: index === 0 ? "rgba(255,244,230,0.9)" : "var(--muted)", marginTop: 0 }}>
                  {formatEventLabel(event.startsAt, displayTimeZone)} {displayZoneLabel}
                </p>
              </div>
              <a href={event.externalLink} style={{ color: index === 0 ? "#fff" : "var(--accent-strong)", fontWeight: 700 }}>
                Open event details
              </a>
            </div>
            <p style={{ color: index === 0 ? "rgba(255,244,230,0.92)" : "var(--muted)", lineHeight: 1.7, marginBottom: 0 }}>{event.description}</p>
          </article>
        ))}
      </div>
    </main>
  );
}

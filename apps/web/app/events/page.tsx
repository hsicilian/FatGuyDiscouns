import { getCurrentSessionAccount } from "../../lib/auth/session";
import { getCurrentCustomer, listEvents } from "../../lib/data/local-db";
import { buildCalendarCells, filterEventsForCalendarMonth, formatEventLabel, labelTimezone } from "../../lib/events";

const weekdayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function getMonthOffset(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = Number(raw ?? "0");
  if (!Number.isInteger(parsed)) {
    return 0;
  }

  return Math.min(2, Math.max(0, parsed));
}

export default async function EventsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [events, currentSession] = await Promise.all([
    listEvents(),
    getCurrentSessionAccount(),
  ]);
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const monthOffset = getMonthOffset(resolvedSearchParams.month);

  const isCustomerLocal = currentSession?.role === "customer";
  const currentCustomer = isCustomerLocal ? await getCurrentCustomer() : null;
  const displayTimeZone = currentCustomer?.timezone ?? "America/New_York";
  const displayZoneLabel = labelTimezone(displayTimeZone, isCustomerLocal);
  const calendar = buildCalendarCells(events, displayTimeZone, monthOffset);
  const monthEvents = filterEventsForCalendarMonth(events, displayTimeZone, monthOffset);
  const previousMonthHref = monthOffset > 0 ? `/events?month=${monthOffset - 1}` : null;
  const nextMonthHref = monthOffset < 2 ? `/events?month=${monthOffset + 1}` : null;

  return (
    <main style={{ maxWidth: 1200, margin: "0 auto", padding: "36px 24px 72px", display: "grid", gap: 24 }}>
      <section style={{ background: "linear-gradient(145deg, rgba(255, 249, 241, 0.95) 0%, rgba(246, 229, 209, 0.92) 100%)", border: "1px solid var(--line)", borderRadius: 30, padding: 28, boxShadow: "var(--shadow)" }}>
        <p style={{ textTransform: "uppercase", letterSpacing: "0.14em", fontSize: 12, color: "var(--accent-strong)", marginTop: 0, fontWeight: 700 }}>Upcoming shows</p>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 18, alignItems: "end", flexWrap: "wrap" }}>
          <div>
            <h1 style={{ margin: "0 0 12px" }}>Event calendar</h1>
            <p style={{ color: "var(--muted)", maxWidth: 760, lineHeight: 1.7, marginBottom: 0 }}>
              {isCustomerLocal
                ? `Your event times are shown in your saved timezone (${displayZoneLabel}) so live sale reminders match your local clock.`
                : "Guests and staff see event times in Eastern Time by default."}
            </p>
          </div>
          <div style={{ background: "rgba(255,255,255,0.52)", border: "1px solid rgba(232,214,195,0.9)", borderRadius: 18, padding: 16, width: "min(100%, 260px)" }}>
            <p style={{ marginTop: 0, color: "var(--muted)", fontSize: 13, textTransform: "uppercase", letterSpacing: "0.08em" }}>Showing</p>
            <strong style={{ fontSize: "1.15rem" }}>{calendar.monthLabel}</strong>
            <p style={{ margin: "6px 0 0", color: "var(--muted)" }}>{monthEvents.length} event{monthEvents.length === 1 ? "" : "s"} this month</p>
          </div>
        </div>
      </section>

      <section style={{ background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 26, padding: 20, boxShadow: "var(--shadow)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap", marginBottom: 18 }}>
          <h2 style={{ margin: 0 }}>{calendar.monthLabel}</h2>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            {previousMonthHref ? (
              <a href={previousMonthHref} style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", minWidth: 44, minHeight: 44, padding: "10px 14px", borderRadius: 999, background: "rgba(255,255,255,0.78)", border: "1px solid var(--line)", fontWeight: 700 }}>
                ←
              </a>
            ) : (
              <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", minWidth: 44, minHeight: 44, padding: "10px 14px", borderRadius: 999, background: "rgba(247,238,228,0.6)", border: "1px solid rgba(232,214,195,0.6)", color: "var(--muted)" }}>
                ←
              </span>
            )}
            <span style={{ color: "var(--muted)", fontSize: 14 }}>Month {monthOffset + 1} of 3</span>
            {nextMonthHref ? (
              <a href={nextMonthHref} style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", minWidth: 44, minHeight: 44, padding: "10px 14px", borderRadius: 999, background: "var(--accent)", color: "#fff", fontWeight: 700 }}>
                →
              </a>
            ) : (
              <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", minWidth: 44, minHeight: 44, padding: "10px 14px", borderRadius: 999, background: "rgba(247,238,228,0.6)", border: "1px solid rgba(232,214,195,0.6)", color: "var(--muted)" }}>
                →
              </span>
            )}
          </div>
        </div>
        <div style={{ overflowX: "auto" }}>
          <div style={{ minWidth: 760 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: 10, marginBottom: 10 }}>
              {weekdayLabels.map((label) => (
                <div key={label} style={{ padding: "8px 10px", textTransform: "uppercase", letterSpacing: "0.08em", fontSize: 12, color: "var(--muted)", fontWeight: 700 }}>
                  {label}
                </div>
              ))}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: 10 }}>
              {calendar.cells.map((cell) => (
                <div
                  key={cell.key}
                  style={{
                    minHeight: 132,
                    borderRadius: 18,
                    border: "1px solid rgba(232,214,195,0.88)",
                    background: cell.day ? "rgba(255,255,255,0.58)" : "rgba(247,238,228,0.45)",
                    padding: 12,
                    display: "grid",
                    gap: 8,
                    alignContent: "start",
                  }}
                >
                  {cell.day ? (
                    <>
                      <strong>{cell.day}</strong>
                      {cell.events.length > 0 ? cell.events.map((event) => (
                        <a
                          key={event.id}
                          href={`/events/${event.id}`}
                          style={{
                            display: "grid",
                            gap: 4,
                            padding: 10,
                            borderRadius: 14,
                            background: "linear-gradient(145deg, rgba(187,77,0,0.94) 0%, rgba(142,50,0,0.98) 100%)",
                            color: "#fff",
                            boxShadow: "0 12px 24px rgba(142,50,0,0.18)",
                          }}
                        >
                          <strong style={{ fontSize: 14 }}>{event.title}</strong>
                          <span style={{ fontSize: 12, opacity: 0.92 }}>{formatEventLabel(event.startsAt, displayTimeZone)} {displayZoneLabel}</span>
                        </a>
                      )) : (
                        <span style={{ color: "var(--muted)", fontSize: 13 }}>No event</span>
                      )}
                    </>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section style={{ display: "grid", gap: 16 }}>
        {monthEvents.map((event, index) => (
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
              <a href={`/events/${event.id}`} style={{ color: index === 0 ? "#fff" : "var(--accent-strong)", fontWeight: 700 }}>
                View event page
              </a>
            </div>
            <p style={{ color: index === 0 ? "rgba(255,244,230,0.92)" : "var(--muted)", lineHeight: 1.7, marginBottom: 0 }}>{event.description}</p>
          </article>
        ))}
        {monthEvents.length === 0 ? (
          <article style={{ background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 26, padding: 24, boxShadow: "var(--shadow)" }}>
            <h2 style={{ marginTop: 0 }}>No events this month</h2>
            <p style={{ marginBottom: 0, color: "var(--muted)" }}>Try the month arrows above to check the next scheduled window.</p>
          </article>
        ) : null}
      </section>
    </main>
  );
}

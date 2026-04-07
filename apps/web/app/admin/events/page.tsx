import { EventCreateForm } from "../../../components/forms/event-create-form";
import { EventDeleteForm } from "../../../components/forms/event-delete-form";
import { EventUpdateForm } from "../../../components/forms/event-update-form";
import { ensureAdminAccess } from "../../../lib/auth/guards";
import { listEvents } from "../../../lib/data/local-db";

const eventDate = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
});

export default async function AdminEventsPage() {
  await ensureAdminAccess();
  const events = await listEvents();

  return (
    <main style={{ maxWidth: 1120, margin: "0 auto", padding: "48px 24px 72px", display: "grid", gap: 24 }}>
      <section style={{ background: "linear-gradient(145deg, rgba(255, 249, 241, 0.95) 0%, rgba(246, 229, 209, 0.92) 100%)", border: "1px solid var(--line)", borderRadius: 30, padding: 28, boxShadow: "var(--shadow)" }}>
        <p style={{ textTransform: "uppercase", letterSpacing: "0.14em", fontSize: 12, color: "var(--accent-strong)", marginTop: 0 }}>Calendar desk</p>
        <h1 style={{ margin: "0 0 12px" }}>Events and show schedule</h1>
        <p style={{ color: "var(--muted)", lineHeight: 1.7, marginBottom: 0 }}>
          Add upcoming live sales and drop events here. Customers will see them on the public calendar, and clicking an event will open an on-site detail page first.
        </p>
      </section>

      <section style={{ display: "grid", gap: 24, gridTemplateColumns: "minmax(300px, 360px) minmax(0, 1fr)" }}>
        <div style={{ background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 24, padding: 22, boxShadow: "var(--shadow)" }}>
          <h2 style={{ marginTop: 0 }}>Add an event</h2>
          <EventCreateForm />
        </div>

        <div style={{ background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 24, padding: 22, boxShadow: "var(--shadow)", display: "grid", gap: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "end" }}>
            <div>
              <p style={{ margin: 0, color: "var(--accent-strong)", textTransform: "uppercase", letterSpacing: "0.08em", fontSize: 12, fontWeight: 700 }}>Scheduled</p>
              <h2 style={{ margin: "8px 0 0" }}>Upcoming events</h2>
            </div>
            <span style={{ color: "var(--muted)" }}>{events.length} event{events.length === 1 ? "" : "s"}</span>
          </div>

          {events.length > 0 ? events.map((event) => (
            <article key={event.id} style={{ borderTop: "1px solid rgba(232,214,195,0.88)", paddingTop: 14, display: "grid", gap: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <strong>{event.title}</strong>
                <a href={`/events/${event.id}`} style={{ color: "var(--accent-strong)", fontWeight: 700 }}>View page</a>
              </div>
              <p style={{ margin: 0, color: "var(--muted)" }}>{eventDate.format(new Date(event.startsAt))}</p>
              <p style={{ margin: 0, color: "var(--muted)" }}>{event.platform ?? "Live sale"}</p>
              <EventUpdateForm event={event} />
              <EventDeleteForm eventId={event.id} />
            </article>
          )) : (
            <div style={{ padding: 18, borderRadius: 18, background: "rgba(255,255,255,0.56)", border: "1px solid rgba(232,214,195,0.85)", color: "var(--muted)" }}>
              No events are scheduled yet.
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

import { shipmentStatusLabel } from "@fatguydiscounts/core";
import { ShipmentUpdateForm } from "../../../components/forms/shipment-update-form";
import { ensureAdminAccess } from "../../../lib/auth/guards";
import { listShipmentRecords } from "../../../lib/data/local-db";

export default async function AdminShipmentsPage() {
  await ensureAdminAccess();

  const shipments = await listShipmentRecords();
  const openShipments = shipments.filter((shipment) => shipment.status !== "completed").length;

  return (
    <main style={{ maxWidth: 1120, margin: "0 auto", padding: "48px 24px 72px" }}>
      <section style={{ background: "linear-gradient(145deg, rgba(255, 249, 241, 0.95) 0%, rgba(246, 229, 209, 0.92) 100%)", border: "1px solid var(--line)", borderRadius: 30, padding: 28, boxShadow: "var(--shadow)", marginBottom: 24 }}>
        <p style={{ textTransform: "uppercase", letterSpacing: "0.14em", fontSize: 12, color: "var(--accent-strong)", marginTop: 0 }}>Shipment queue</p>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 18, alignItems: "end", flexWrap: "wrap" }}>
          <div>
            <h1 style={{ margin: "0 0 10px" }}>Shipment management</h1>
            <p style={{ color: "var(--muted)", lineHeight: 1.7, maxWidth: 760, margin: 0 }}>
              Customers confirm the address on file when they request shipment. Admins can update shipment status and save tracking directly from this page.
            </p>
          </div>
          <div style={{ background: "rgba(255,255,255,0.52)", border: "1px solid rgba(232,214,195,0.9)", borderRadius: 18, padding: 16, minWidth: 220 }}>
            <p style={{ marginTop: 0, color: "var(--muted)", fontSize: 13, textTransform: "uppercase", letterSpacing: "0.08em" }}>Open shipments</p>
            <strong style={{ fontSize: "1.9rem" }}>{openShipments}</strong>
          </div>
        </div>
      </section>

      <div style={{ display: "grid", gap: 16 }}>
        {shipments.map((shipment) => (
          <section key={shipment.id} style={{ background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 24, padding: 24, boxShadow: "var(--shadow)", backdropFilter: "blur(14px)" }}>
            <div style={{ display: "grid", gap: 18, gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}>
              <div>
                <p style={{ marginTop: 0, color: "var(--accent-strong)", textTransform: "uppercase", letterSpacing: "0.08em", fontSize: 12 }}>Shipment record</p>
                <h2 style={{ marginTop: 0 }}>{shipment.customerName}</h2>
                <p style={{ color: "var(--muted)", margin: "4px 0" }}>Requested: {shipment.requestedAt}</p>
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 12 }}>
                  <div style={{ padding: 14, borderRadius: 16, background: "rgba(255,255,255,0.56)", border: "1px solid rgba(232,214,195,0.88)" }}>
                    <p style={{ margin: 0, color: "var(--muted)" }}>Status</p>
                    <strong>{shipmentStatusLabel(shipment.status)}</strong>
                  </div>
                  <div style={{ padding: 14, borderRadius: 16, background: "rgba(255,255,255,0.56)", border: "1px solid rgba(232,214,195,0.88)" }}>
                    <p style={{ margin: 0, color: "var(--muted)" }}>Shipment date</p>
                    <strong>{shipment.shipmentDate ?? "Pending"}</strong>
                  </div>
                </div>
              </div>
              <div style={{ padding: 16, borderRadius: 20, background: "rgba(255,255,255,0.55)", border: "1px solid rgba(232,214,195,0.88)" }}>
                <ShipmentUpdateForm
                  shipmentId={shipment.id}
                  defaultStatus={shipment.status}
                  defaultTrackingNumber={shipment.trackingNumber}
                />
              </div>
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
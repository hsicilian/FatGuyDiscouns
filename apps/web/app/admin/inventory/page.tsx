import { PRODUCT_STATUS_LABELS } from "@fatguydiscounts/core";
import { Panel } from "@fatguydiscounts/ui";
import { InventoryAdjustForm } from "../../../components/forms/inventory-adjust-form";
import { InventoryCreateForm } from "../../../components/forms/inventory-create-form";
import { ensureAdminAccess } from "../../../lib/auth/guards";
import { listProducts } from "../../../lib/data/local-db";

export default async function AdminInventoryPage() {
  await ensureAdminAccess();

  const products = await listProducts();
  const lowStockCount = products.filter((product) => product.quantity <= 1).length;

  return (
    <main style={{ maxWidth: 1120, margin: "0 auto", padding: "48px 24px 72px" }}>
      <section style={{ background: "linear-gradient(145deg, rgba(255, 249, 241, 0.95) 0%, rgba(246, 229, 209, 0.92) 100%)", border: "1px solid var(--line)", borderRadius: 30, padding: 28, boxShadow: "var(--shadow)", marginBottom: 24 }}>
        <p style={{ textTransform: "uppercase", letterSpacing: "0.14em", fontSize: 12, color: "var(--accent-strong)", marginTop: 0 }}>Stock room</p>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 18, alignItems: "end", flexWrap: "wrap" }}>
          <div>
            <h1 style={{ margin: "0 0 10px" }}>Inventory management</h1>
            <p style={{ color: "var(--muted)", lineHeight: 1.7, maxWidth: 760, margin: 0 }}>
              Inventory updates immediately as claims are created. Use the stock tools below to restock, decrement, and keep visible sell-outs accurate.
            </p>
          </div>
          <div style={{ background: "rgba(255,255,255,0.52)", border: "1px solid rgba(232,214,195,0.9)", borderRadius: 18, padding: 16, minWidth: 220 }}>
            <p style={{ marginTop: 0, color: "var(--muted)", fontSize: 13, textTransform: "uppercase", letterSpacing: "0.08em" }}>Low stock items</p>
            <strong style={{ fontSize: "1.9rem" }}>{lowStockCount}</strong>
          </div>
        </div>
      </section>

      <Panel>
        <div style={{ display: "grid", gap: 16 }}>
          <div>
            <p style={{ textTransform: "uppercase", letterSpacing: "0.14em", fontSize: 12, color: "var(--accent-strong)", marginTop: 0, marginBottom: 8 }}>
              New listing
            </p>
            <h2 style={{ margin: "0 0 8px" }}>Add a new inventory item</h2>
            <p style={{ color: "var(--muted)", lineHeight: 1.7, margin: 0 }}>
              Create a new product listing right from the admin stock room. New items appear in the shop as soon as they are saved.
            </p>
          </div>
          <InventoryCreateForm />
        </div>
      </Panel>

      <div style={{ display: "grid", gap: 16 }}>
        {products.map((product) => (
          <Panel key={product.id}>
            <div style={{ display: "grid", gap: 18, gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 14, flexWrap: "wrap", alignItems: "center" }}>
                  <div>
                    <p style={{ color: "var(--muted)", marginTop: 0, marginBottom: 8 }}>{product.category}</p>
                    <h2 style={{ marginTop: 0 }}>{product.title}</h2>
                  </div>
                  <span style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.08em", color: product.quantity > 0 ? "#2f5d32" : "var(--accent-strong)" }}>
                    {PRODUCT_STATUS_LABELS[product.status]}
                  </span>
                </div>
                <p style={{ color: "var(--muted)", lineHeight: 1.7, marginTop: 0 }}>{product.description}</p>
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                  <div style={{ padding: 14, borderRadius: 16, background: "rgba(255,255,255,0.56)", border: "1px solid rgba(232,214,195,0.88)" }}>
                    <p style={{ margin: 0, color: "var(--muted)" }}>Qty on hand</p>
                    <strong>{product.quantity}</strong>
                  </div>
                  <div style={{ padding: 14, borderRadius: 16, background: "rgba(255,255,255,0.56)", border: "1px solid rgba(232,214,195,0.88)" }}>
                    <p style={{ margin: 0, color: "var(--muted)" }}>Price</p>
                    <strong>${product.price.toFixed(2)}</strong>
                  </div>
                </div>
              </div>
              <div style={{ padding: 16, borderRadius: 20, background: "rgba(255,255,255,0.55)", border: "1px solid rgba(232,214,195,0.88)" }}>
                <InventoryAdjustForm productId={product.id} />
              </div>
            </div>
          </Panel>
        ))}
      </div>
    </main>
  );
}

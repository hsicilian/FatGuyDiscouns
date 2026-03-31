import { canDeleteArchivedProduct, PRODUCT_ARCHIVE_RETENTION_DAYS } from "@fatguydiscounts/core";
import { Panel } from "@fatguydiscounts/ui";
import { DeleteArchivedProductForm } from "../../../../components/forms/delete-archived-product-form";
import { ensureAdminAccess } from "../../../../lib/auth/guards";
import { listProducts } from "../../../../lib/data/local-db";

export default async function ArchivedInventoryPage() {
  await ensureAdminAccess();

  const archivedProducts = (await listProducts()).filter((product) => product.status === "archived");

  return (
    <main style={{ maxWidth: 1120, margin: "0 auto", padding: "48px 24px 72px", display: "grid", gap: 24 }}>
      <section style={{ background: "linear-gradient(145deg, rgba(255, 249, 241, 0.95) 0%, rgba(246, 229, 209, 0.92) 100%)", border: "1px solid var(--line)", borderRadius: 30, padding: 28, boxShadow: "var(--shadow)" }}>
        <a href="/admin/inventory" style={{ color: "var(--accent-strong)", fontWeight: 700 }}>Back to inventory</a>
        <p style={{ textTransform: "uppercase", letterSpacing: "0.14em", fontSize: 12, color: "var(--accent-strong)", marginBottom: 8, fontWeight: 700 }}>Archived items</p>
        <h1 style={{ margin: 0 }}>Archive queue</h1>
        <p style={{ color: "var(--muted)", lineHeight: 1.7, marginBottom: 0 }}>
          Archived items stay off the live shop. After {PRODUCT_ARCHIVE_RETENTION_DAYS} days, items with no claim history can be permanently deleted here.
        </p>
      </section>

      <div style={{ display: "grid", gap: 16 }}>
        {archivedProducts.length > 0 ? archivedProducts.map((product) => {
          const canDelete = canDeleteArchivedProduct(product.archivedAt);
          const helperText = canDelete
            ? "This item is old enough to delete if it has no claim history."
            : `This item must stay archived for ${PRODUCT_ARCHIVE_RETENTION_DAYS} days before deletion.`;

          return (
            <Panel key={product.id}>
              <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}>
                <div>
                  <p style={{ color: "var(--muted)", marginTop: 0, marginBottom: 8 }}>{product.category}</p>
                  <h2 style={{ marginTop: 0 }}>{product.title}</h2>
                  <p style={{ color: "var(--muted)", lineHeight: 1.7, marginTop: 0 }}>{product.description}</p>
                  <p style={{ margin: 0, color: "var(--muted)" }}>Archived on: {product.archivedAt ? product.archivedAt.slice(0, 10) : "Unknown"}</p>
                </div>
                <div style={{ padding: 16, borderRadius: 20, background: "rgba(255,255,255,0.55)", border: "1px solid rgba(232,214,195,0.88)" }}>
                  <DeleteArchivedProductForm productId={product.id} disabled={!canDelete} helperText={helperText} />
                </div>
              </div>
            </Panel>
          );
        }) : (
          <Panel>
            <p style={{ margin: 0, color: "var(--muted)" }}>No archived inventory items yet.</p>
          </Panel>
        )}
      </div>
    </main>
  );
}

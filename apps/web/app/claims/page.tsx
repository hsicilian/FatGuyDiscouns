import { ClaimSubmitForm } from "../../components/forms/claim-submit-form";
import { ensureClaimAccess } from "../../lib/auth/guards";
import { previewClaimAction } from "../../lib/actions/claims";
import { getCurrentCustomer, listProducts } from "../../lib/data/local-db";

export default async function ClaimsPage() {
  await ensureClaimAccess();

  const [products, currentCustomer] = await Promise.all([listProducts(), getCurrentCustomer()]);

  return (
    <main style={{ maxWidth: 1100, margin: "0 auto", padding: "48px 24px 72px" }}>
      <div style={{ marginBottom: 24 }}>
        <p style={{ textTransform: "uppercase", letterSpacing: "0.12em", fontSize: 12, color: "#8e3200" }}>Claim workflow</p>
        <h1 style={{ margin: "0 0 12px" }}>Reserve items against the active balance cycle</h1>
        <p style={{ color: "#6d655d", lineHeight: 1.7, maxWidth: 760 }}>
          Claims permanently reserve inventory and attach to the customer&apos;s current running balance. Customers cannot remove claims themselves after submission.
        </p>
      </div>
      <section style={{ background: "#fffaf3", border: "1px solid #e8d6c3", borderRadius: 22, padding: 24, marginBottom: 24 }}>
        <h2 style={{ marginTop: 0 }}>Customer state</h2>
        <p style={{ color: "#6d655d", marginBottom: 0 }}>Current customer: {currentCustomer.displayName} · {currentCustomer.accountState}</p>
      </section>
      <div style={{ display: "grid", gap: 16 }}>
        {await Promise.all(products.map(async (product) => {
          const preview = await previewClaimAction(product.id, 1);
          return (
            <section key={product.id} style={{ background: "#fffaf3", border: "1px solid #e8d6c3", borderRadius: 20, padding: 22 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
                <div>
                  <h2 style={{ marginTop: 0 }}>{product.title}</h2>
                  <p style={{ color: "#6d655d", margin: "4px 0" }}>{product.description}</p>
                  <p style={{ color: "#6d655d", margin: 0 }}>Available qty: {product.quantity}</p>
                </div>
                <div style={{ flex: "1 1 240px", maxWidth: 320 }}>
                  <p style={{ fontSize: 22, fontWeight: 700, marginTop: 0 }}>${product.price.toFixed(2)}</p>
                  <ClaimSubmitForm productId={product.id} disabled={!preview.ok} />
                </div>
              </div>
            </section>
          );
        }))}
      </div>
    </main>
  );
}
import { ClaimSubmitForm } from "../../components/forms/claim-submit-form";
import { ensureClaimAccess } from "../../lib/auth/guards";
import { previewClaimAction } from "../../lib/actions/claims";
import { getCurrentCustomer, listProducts } from "../../lib/data/local-db";

export default async function ClaimsPage() {
  await ensureClaimAccess();

  const [products, currentCustomer] = await Promise.all([listProducts(), getCurrentCustomer()]);

  return (
    <main style={{ maxWidth: 1100, margin: "0 auto", padding: "36px 24px 72px" }}>
      <section style={{ background: "linear-gradient(145deg, rgba(255, 249, 241, 0.95) 0%, rgba(246, 229, 209, 0.92) 100%)", border: "1px solid var(--line)", borderRadius: 30, padding: 28, boxShadow: "var(--shadow)", marginBottom: 24 }}>
        <p style={{ textTransform: "uppercase", letterSpacing: "0.12em", fontSize: 12, color: "var(--accent-strong)", marginTop: 0, fontWeight: 700 }}>Claims</p>
        <h1 style={{ margin: "0 0 12px" }}>Claim items to add them to your balance</h1>
        <p style={{ color: "var(--muted)", lineHeight: 1.7, maxWidth: 760 }}>
          Claiming reserves inventory right away and adds the item to your current running balance. Claims stay in place unless an admin updates them for you.
        </p>
      </section>

      <section style={{ background: "#fffaf3", border: "1px solid #e8d6c3", borderRadius: 22, padding: 24, marginBottom: 24 }}>
        <h2 style={{ marginTop: 0 }}>Your claim access</h2>
        <p style={{ color: "#6d655d", marginBottom: 0 }}>
          Signed in as <strong>{currentCustomer.displayName}</strong> · account status: <strong>{currentCustomer.accountState.replaceAll("_", " ")}</strong>
        </p>
      </section>

      <div style={{ display: "grid", gap: 16 }}>
        {await Promise.all(products.map(async (product) => {
          const preview = await previewClaimAction(product.id, 1);
          return (
            <section key={product.id} style={{ background: "#fffaf3", border: "1px solid #e8d6c3", borderRadius: 20, padding: 22 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
                <div>
                  <h2 style={{ marginTop: 0 }}>{product.title}</h2>
                  <p style={{ color: "#6d655d", margin: "4px 0", lineHeight: 1.7 }}>{product.description}</p>
                  <p style={{ color: "#6d655d", margin: 0 }}>Available now: {product.quantity}</p>
                </div>
                <div style={{ flex: "1 1 240px", maxWidth: 320 }}>
                  {product.isOnSale && product.salePrice != null ? (
                    <div style={{ display: "grid", gap: 4, marginBottom: 10 }}>
                      <p style={{ margin: 0, color: "#6d655d", textDecoration: "line-through" }}>${product.originalPrice.toFixed(2)}</p>
                      <p style={{ fontSize: 22, fontWeight: 700, margin: 0, color: "#b42318" }}>${product.salePrice.toFixed(2)}</p>
                      <p style={{ margin: 0, color: "#b42318", fontSize: 13, fontWeight: 700 }}>
                        {product.salePercentage}% off through {product.saleEndsAt?.slice(0, 10)}
                      </p>
                    </div>
                  ) : (
                    <p style={{ fontSize: 22, fontWeight: 700, marginTop: 0 }}>${product.price.toFixed(2)}</p>
                  )}
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

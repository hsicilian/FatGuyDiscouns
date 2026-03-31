import { PRODUCT_STATUS_LABELS } from "@fatguydiscounts/core";
import { Panel } from "@fatguydiscounts/ui";
import { listProducts } from "../lib/data/local-db";

function money(value: number) {
  return `$${value.toFixed(2)}`;
}

export default async function HomePage() {
  const products = await listProducts();
  const latestProducts = products.slice(0, 10);

  return (
    <main style={{ maxWidth: 1240, margin: "0 auto", padding: "36px 24px 72px" }}>
      <section
        style={{
          background: "linear-gradient(145deg, rgba(255, 249, 239, 0.96) 0%, rgba(255, 239, 218, 0.93) 100%)",
          border: "1px solid rgba(222, 197, 174, 0.95)",
          borderRadius: 34,
          padding: "38px clamp(24px, 4vw, 42px)",
          boxShadow: "var(--shadow)",
          marginBottom: 28,
        }}
      >
        <h1 style={{ margin: "0 0 14px", fontSize: "clamp(2.7rem, 6vw, 4.4rem)", lineHeight: 0.95 }}>
          Welcome To FatGuyDiscounts!
        </h1>
        <p style={{ margin: 0, color: "var(--muted)", fontSize: "1.08rem", lineHeight: 1.8, maxWidth: 760 }}>
          Shop, check your balance &amp; request shipments all in one place!
        </p>
      </section>

      <section>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "end", gap: 16, flexWrap: "wrap", marginBottom: 20 }}>
          <div>
            <p style={{ margin: 0, fontSize: 12, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--accent-strong)", fontWeight: 700 }}>
              Fresh inventory
            </p>
            <h2 style={{ margin: "8px 0 0", fontSize: "clamp(2rem, 4vw, 3rem)" }}>Newly Added Inventory</h2>
          </div>
          <a href="/store" style={{ color: "var(--accent-strong)", fontWeight: 700 }}>
            See More
          </a>
        </div>

        <div className="home-listings-grid" style={{ display: "grid", gap: 18, gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))" }}>
          {latestProducts.map((product) => (
            <Panel key={product.id}>
              <article style={{ display: "grid", gap: 16 }}>
                <div
                  style={{
                    minHeight: 200,
                    padding: 20,
                    display: "flex",
                    alignItems: "end",
                    borderRadius: 20,
                    background: "linear-gradient(145deg, #ecd0af 0%, #fff0d6 100%)",
                  }}
                >
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: "8px 12px",
                      borderRadius: 999,
                      background: "rgba(255,255,255,0.82)",
                      fontSize: 12,
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                      color: "var(--accent-strong)",
                      fontWeight: 700,
                    }}
                  >
                    {product.category}
                  </span>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "start" }}>
                  <h3 style={{ margin: 0, fontSize: "1.28rem" }}>{product.title}</h3>
                  <span style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.08em", color: product.quantity > 0 ? "#2f5d32" : "var(--accent-strong)" }}>
                    {PRODUCT_STATUS_LABELS[product.status]}
                  </span>
                </div>

                <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.7, minHeight: 72 }}>{product.description}</p>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "end", gap: 12, flexWrap: "wrap" }}>
                  <div>
                    {product.isOnSale && product.salePrice != null ? (
                      <div style={{ display: "grid", gap: 4 }}>
                        <p style={{ margin: 0, color: "var(--muted)", textDecoration: "line-through" }}>{money(product.originalPrice)}</p>
                        <p style={{ margin: 0, fontSize: "1.2rem", fontWeight: 700, color: "#b42318" }}>{money(product.salePrice)}</p>
                      </div>
                    ) : (
                      <p style={{ margin: 0, fontSize: "1.2rem", fontWeight: 700 }}>{money(product.price)}</p>
                    )}
                    <p style={{ margin: "6px 0 0", color: "var(--muted)" }}>
                      {product.quantity > 0 ? `${product.quantity} available now` : "Currently out of stock"}
                    </p>
                  </div>
                  <a
                    href={`/store#product-${product.id}`}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: "12px 16px",
                      borderRadius: 999,
                      background: "#1d1d1d",
                      color: "#fff",
                      fontWeight: 700,
                    }}
                  >
                    View Item
                  </a>
                </div>
              </article>
            </Panel>
          ))}
        </div>
      </section>
    </main>
  );
}

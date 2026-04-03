import { PRODUCT_STATUS_LABELS } from "@fatguydiscounts/core";
import { Panel } from "@fatguydiscounts/ui";
import { HomeIntroSplash } from "../components/home/home-intro-splash";
import { listProducts } from "../lib/data/local-db";
import { getProductPath } from "../lib/products";

function money(value: number) {
  return `$${value.toFixed(2)}`;
}

function getCardImage(images: string[]) {
  return images[0] ?? "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=1200&q=80";
}

export default async function HomePage() {
  const products = await listProducts();
  const latestProducts = products.slice(0, 12);

  return (
    <main style={{ maxWidth: 1240, margin: "0 auto", padding: "36px 24px 72px" }}>
      <HomeIntroSplash />
      <section
        className="home-welcome-panel"
        style={{
          background:
            "linear-gradient(135deg, rgba(255, 249, 243, 0.98) 0%, rgba(255, 228, 205, 0.96) 42%, rgba(255, 214, 198, 0.96) 72%, rgba(225, 249, 241, 0.96) 100%)",
          border: "1px solid rgba(240, 194, 170, 0.92)",
          borderRadius: 34,
          padding: "38px clamp(24px, 4vw, 42px)",
          boxShadow: "var(--shadow)",
          marginBottom: 28,
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(circle at top right, rgba(255, 220, 94, 0.28) 0%, rgba(255, 220, 94, 0) 28%), radial-gradient(circle at 18% 24%, rgba(255, 120, 120, 0.18) 0%, rgba(255, 120, 120, 0) 26%), radial-gradient(circle at 78% 72%, rgba(111, 221, 204, 0.2) 0%, rgba(111, 221, 204, 0) 26%)",
          }}
        />
        <h1 className="home-welcome-title" style={{ margin: "0 0 14px", fontSize: "clamp(2.7rem, 6vw, 4.4rem)", lineHeight: 0.95, position: "relative", zIndex: 1, color: "var(--berry)" }}>
          Welcome To Fat Guy Discounts!
        </h1>
        <p
          className="home-welcome-copy"
          style={{
            margin: 0,
            color: "var(--berry)",
            fontSize: "1.08rem",
            lineHeight: 1.8,
            maxWidth: 760,
            position: "relative",
            zIndex: 1,
          }}
        >
          Shop, check your balance &amp; request shipments all in one place!
        </p>
      </section>

      <section>
        <div className="home-section-heading" style={{ display: "flex", justifyContent: "space-between", alignItems: "end", gap: 16, flexWrap: "wrap", marginBottom: 20 }}>
          <div>
            <p style={{ margin: 0, fontSize: 12, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--accent-strong)", fontWeight: 700 }}>
              Fresh inventory
            </p>
            <h2 style={{ margin: "8px 0 0", fontSize: "clamp(2rem, 4vw, 3rem)", color: "var(--berry)" }}>Newly Added Inventory</h2>
          </div>
          <a
            href="/store"
            style={{
              color: "#fff",
              fontWeight: 800,
              padding: "12px 18px",
              borderRadius: 999,
              background: "linear-gradient(135deg, var(--accent) 0%, var(--accent-strong) 58%, #ffb253 100%)",
              boxShadow: "0 16px 28px rgba(240, 95, 87, 0.22)",
            }}
          >
            See More
          </a>
        </div>

        <div className="home-listings-grid" style={{ display: "grid", gap: 18, gridTemplateColumns: "repeat(4, minmax(0, 1fr))" }}>
          {latestProducts.map((product) => {
            const cardImage = getCardImage(product.images);
            const productPath = getProductPath(product);

            return (
            <Panel key={product.id}>
              <article
                style={{
                  display: "grid",
                  gap: 16,
                  gridTemplateRows: "200px auto minmax(72px, auto) 1fr",
                  height: "100%",
                }}
              >
                <div
                  style={{
                    padding: 20,
                    display: "flex",
                    alignItems: "end",
                    borderRadius: 20,
                    background: "linear-gradient(145deg, #ecd0af 0%, #fff0d6 100%)",
                    position: "relative",
                    overflow: "hidden",
                  }}
                >
                  <img
                    src={cardImage}
                    alt={product.title}
                    style={{
                      position: "absolute",
                      inset: 0,
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                  />
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      background: "linear-gradient(180deg, rgba(255,255,255,0.06) 0%, rgba(16,12,8,0.18) 100%)",
                    }}
                  />
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: "8px 12px",
                      borderRadius: 999,
                      background: "rgba(255,255,255,0.88)",
                      fontSize: 12,
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                      color: "var(--accent-strong)",
                      fontWeight: 700,
                      position: "relative",
                      zIndex: 1,
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

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "end",
                    gap: 12,
                    flexWrap: "wrap",
                    alignSelf: "end",
                  }}
                >
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
                    href={productPath}
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
            );
          })}
        </div>
      </section>
    </main>
  );
}

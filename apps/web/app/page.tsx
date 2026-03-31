import { PRODUCT_STATUS_LABELS } from "@fatguydiscounts/core";
import { getCurrentSessionAccount } from "../lib/auth/session";
import { listProducts } from "../lib/data/local-db";

const heroHighlights = [
  "Fresh discounts added for live-sale customers",
  "Claim now and settle your running balance later",
  "Easy shipment requests once you are ready",
];

const whyShopHere = [
  {
    title: "Claim-first shopping",
    description: "Reserve pieces as you shop without a traditional checkout on every item.",
  },
  {
    title: "One running balance",
    description: "Keep your claims together, watch your due date, and pay your balance in one place.",
  },
  {
    title: "Made for repeat buyers",
    description: "Track shipment requests, invoice history, and account updates from your dashboard.",
  },
];

function money(value: number) {
  return `$${value.toFixed(2)}`;
}

function StoreStat({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        background: "rgba(255, 255, 255, 0.82)",
        border: "1px solid rgba(214, 190, 167, 0.78)",
        borderRadius: 22,
        padding: 20,
        boxShadow: "var(--shadow-soft)",
      }}
    >
      <p style={{ margin: 0, fontSize: 12, letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--muted)" }}>{label}</p>
      <p style={{ margin: "10px 0 0", fontSize: "1.9rem", fontWeight: 700 }}>{value}</p>
    </div>
  );
}

export default async function HomePage() {
  const [products, currentUser] = await Promise.all([listProducts(), getCurrentSessionAccount()]);
  const featuredProducts = products.slice(0, 4);
  const inStockCount = products.filter((product) => product.quantity > 0).length;
  const soldOutCount = products.filter((product) => product.quantity === 0).length;
  const categoryCount = new Set(products.map((product) => product.category)).size;

  return (
    <main>
      <section style={{ maxWidth: 1240, margin: "0 auto", padding: "38px 24px 28px" }}>
        <div
          style={{
            display: "grid",
            gap: 26,
            gridTemplateColumns: "minmax(0, 1.4fr) minmax(300px, 0.9fr)",
            alignItems: "stretch",
          }}
        >
          <div
            style={{
              position: "relative",
              overflow: "hidden",
              background: "linear-gradient(145deg, rgba(255, 249, 239, 0.96) 0%, rgba(255, 239, 218, 0.93) 100%)",
              border: "1px solid rgba(222, 197, 174, 0.95)",
              borderRadius: 36,
              padding: "38px clamp(24px, 4vw, 42px)",
              boxShadow: "var(--shadow)",
            }}
          >
            <div
              style={{
                position: "absolute",
                inset: "auto -80px -120px auto",
                width: 240,
                height: 240,
                borderRadius: "50%",
                background: "radial-gradient(circle, rgba(191, 88, 7, 0.18) 0%, rgba(191, 88, 7, 0) 72%)",
              }}
            />
            <p style={{ margin: 0, fontSize: 12, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--accent-strong)", fontWeight: 700 }}>
              Live claims. Real deals. No cart-chasing.
            </p>
            <h1 style={{ margin: "18px 0 16px", fontSize: "clamp(3.5rem, 8vw, 5.8rem)", lineHeight: 0.9, letterSpacing: "-0.04em" }}>
              Fatguydiscounts
            </h1>
            <p style={{ margin: 0, maxWidth: 640, color: "var(--muted)", fontSize: "1.08rem", lineHeight: 1.8 }}>
              Shop the latest listings, claim what you want before it is gone, and keep everything organized inside one simple running balance.
            </p>

            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 28 }}>
              <a
                href="/store"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "14px 22px",
                  borderRadius: 999,
                  background: "var(--accent)",
                  color: "#fff",
                  fontWeight: 700,
                  boxShadow: "0 16px 32px rgba(187, 77, 0, 0.24)",
                }}
              >
                Shop Available Items
              </a>
              <a
                href={currentUser ? "/account" : "/signup"}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "14px 22px",
                  borderRadius: 999,
                  background: "rgba(255,255,255,0.78)",
                  border: "1px solid var(--line)",
                  fontWeight: 700,
                }}
              >
                {currentUser ? "Go To My Account" : "Create Customer Account"}
              </a>
            </div>

            <div style={{ display: "grid", gap: 10, marginTop: 26 }}>
              {heroHighlights.map((item) => (
                <div key={item} style={{ display: "flex", gap: 10, alignItems: "center", color: "var(--ink)" }}>
                  <span style={{ width: 10, height: 10, borderRadius: "50%", background: "var(--accent)" }} />
                  <span style={{ fontWeight: 600 }}>{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display: "grid", gap: 16 }}>
            <div
              style={{
                background: "rgba(255, 252, 246, 0.92)",
                border: "1px solid var(--line)",
                borderRadius: 30,
                padding: 28,
                boxShadow: "var(--shadow)",
              }}
            >
              <p style={{ margin: 0, fontSize: 12, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--muted)" }}>
                How it works
              </p>
              <div style={{ display: "grid", gap: 18, marginTop: 18 }}>
                {[
                  ["1", "Browse the store", "Shop current listings and check stock in real time."],
                  ["2", "Get approved to claim", "Create an account and wait for claim approval from the admin team."],
                  ["3", "Track your balance", "Claims, shipments, and invoice history all stay in one customer dashboard."],
                ].map(([step, title, text]) => (
                  <div key={step} style={{ display: "grid", gridTemplateColumns: "44px 1fr", gap: 14, alignItems: "start" }}>
                    <div style={{ width: 44, height: 44, borderRadius: "50%", background: "#1d1d1d", color: "#fff", display: "grid", placeItems: "center", fontWeight: 700 }}>
                      {step}
                    </div>
                    <div>
                      <h2 style={{ margin: "2px 0 6px", fontSize: "1.1rem" }}>{title}</h2>
                      <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.7 }}>{text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: "grid", gap: 14, gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))" }}>
              <StoreStat label="Claimable now" value={String(inStockCount)} />
              <StoreStat label="Categories" value={String(categoryCount)} />
              <StoreStat label="Sold out" value={String(soldOutCount)} />
            </div>
          </div>
        </div>
      </section>

      <section style={{ maxWidth: 1240, margin: "0 auto", padding: "8px 24px 34px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "end", gap: 16, flexWrap: "wrap", marginBottom: 18 }}>
          <div>
            <p style={{ margin: 0, fontSize: 12, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--accent-strong)", fontWeight: 700 }}>
              Shop with confidence
            </p>
            <h2 style={{ margin: "8px 0 0", fontSize: "clamp(2rem, 4vw, 3rem)" }}>Built for repeat buyers, fast claims, and easy follow-up.</h2>
          </div>
          <a href="/events" style={{ color: "var(--accent-strong)", fontWeight: 700 }}>
            View upcoming shows
          </a>
        </div>

        <div style={{ display: "grid", gap: 18, gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))" }}>
          {whyShopHere.map((item) => (
            <div
              key={item.title}
              style={{
                background: "rgba(255, 252, 246, 0.9)",
                border: "1px solid var(--line)",
                borderRadius: 26,
                padding: 24,
                boxShadow: "var(--shadow-soft)",
              }}
            >
              <h3 style={{ marginTop: 0, marginBottom: 10, fontSize: "1.2rem" }}>{item.title}</h3>
              <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.7 }}>{item.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section style={{ maxWidth: 1240, margin: "0 auto", padding: "0 24px 72px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "end", gap: 16, flexWrap: "wrap", marginBottom: 18 }}>
          <div>
            <p style={{ margin: 0, fontSize: 12, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--accent-strong)", fontWeight: 700 }}>
              Fresh in the shop
            </p>
            <h2 style={{ margin: "8px 0 0", fontSize: "clamp(2rem, 4vw, 3rem)" }}>Current listings</h2>
          </div>
          <a href="/store" style={{ color: "var(--accent-strong)", fontWeight: 700 }}>
            Browse full store
          </a>
        </div>

        <div style={{ display: "grid", gap: 18, gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))" }}>
          {featuredProducts.map((product) => (
            <article
              key={product.id}
              style={{
                overflow: "hidden",
                background: "rgba(255, 251, 245, 0.92)",
                border: "1px solid var(--line)",
                borderRadius: 28,
                boxShadow: "var(--shadow)",
              }}
            >
              <div
                style={{
                  minHeight: 220,
                  padding: 22,
                  display: "flex",
                  alignItems: "end",
                  background: "linear-gradient(145deg, #ecd0af 0%, #fff0d6 100%)",
                }}
              >
                <div
                  style={{
                    maxWidth: 180,
                    padding: "10px 14px",
                    borderRadius: 999,
                    background: "rgba(255,255,255,0.78)",
                    fontSize: 12,
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    color: "var(--accent-strong)",
                    fontWeight: 700,
                  }}
                >
                  {product.category}
                </div>
              </div>
              <div style={{ padding: 22 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "start" }}>
                  <h3 style={{ margin: "0 0 10px", fontSize: "1.35rem" }}>{product.title}</h3>
                  <span style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.08em", color: product.quantity > 0 ? "#2f5d32" : "var(--accent-strong)" }}>
                    {PRODUCT_STATUS_LABELS[product.status]}
                  </span>
                </div>
                <p style={{ margin: "0 0 18px", color: "var(--muted)", lineHeight: 1.7 }}>{product.description}</p>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                  <div>
                    <p style={{ margin: 0, fontSize: "1.25rem", fontWeight: 700 }}>{money(product.price)}</p>
                    <p style={{ margin: "4px 0 0", color: "var(--muted)" }}>
                      {product.quantity > 0 ? `${product.quantity} available now` : "Currently out of stock"}
                    </p>
                  </div>
                  <a
                    href="/store"
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
                    View item
                  </a>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

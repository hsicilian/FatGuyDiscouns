import { DASHBOARD_SECTIONS, PRODUCT_STATUS_LABELS } from "@fatguydiscounts/core";
import { getPlatformSummary, listProducts } from "../lib/data/local-db";

function SectionCard({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div
      style={{
        background: "var(--panel)",
        border: "1px solid var(--line)",
        borderRadius: 24,
        padding: 24,
        boxShadow: "var(--shadow)",
        backdropFilter: "blur(14px)",
      }}
    >
      <h3 style={{ marginTop: 0, marginBottom: 10 }}>{title}</h3>
      <p style={{ marginBottom: 0, color: "var(--muted)", lineHeight: 1.6 }}>{description}</p>
    </div>
  );
}

const quickLinks = [
  { href: "/store", label: "Browse products" },
  { href: "/login", label: "Login flow" },
  { href: "/account", label: "Customer dashboard" },
  { href: "/events", label: "Upcoming shows" },
  { href: "/admin", label: "Admin center" },
];

export default async function HomePage() {
  const [platformSummary, products] = await Promise.all([getPlatformSummary(), listProducts()]);
  const inStock = products.filter((product) => product.quantity > 0).length;

  return (
    <main>
      <section style={{ padding: "72px 24px 34px", maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ display: "grid", gap: 24, gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", alignItems: "stretch" }}>
          <div style={{ background: "linear-gradient(145deg, rgba(255, 249, 241, 0.95) 0%, rgba(246, 229, 209, 0.92) 100%)", border: "1px solid rgba(232, 214, 195, 0.95)", borderRadius: 34, padding: 34, boxShadow: "var(--shadow)", backdropFilter: "blur(18px)" }}>
            <p style={{ textTransform: "uppercase", letterSpacing: "0.18em", color: "var(--accent-strong)", fontSize: 12, fontWeight: 700, marginTop: 0 }}>Web launch track</p>
            <h1 style={{ fontSize: "clamp(3rem, 7vw, 5.4rem)", lineHeight: 0.94, margin: "0 0 18px" }}>Fatguydiscounts</h1>
            <p style={{ color: "var(--muted)", lineHeight: 1.8, maxWidth: 620, fontSize: "1.02rem" }}>
              A claim-first resale platform built for fast web launch: browse, reserve, track running balances, manage shipments, and keep the business moving from one control center.
            </p>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 28 }}>
              {quickLinks.map((link, index) => (
                <a key={link.href} href={link.href} style={{ background: index === 0 ? "var(--accent)" : "rgba(255,255,255,0.72)", color: index === 0 ? "#fff" : "var(--ink)", padding: "14px 20px", borderRadius: 999, border: index === 0 ? "none" : "1px solid var(--line)", boxShadow: index === 0 ? "0 12px 30px rgba(187, 77, 0, 0.22)" : "none", fontWeight: 700 }}>
                  {link.label}
                </a>
              ))}
            </div>
          </div>

          <div style={{ display: "grid", gap: 16 }}>
            <div style={{ background: "rgba(255, 249, 241, 0.9)", border: "1px solid var(--line)", borderRadius: 30, padding: 28, boxShadow: "var(--shadow)" }}>
              <h2 style={{ marginTop: 0, marginBottom: 14 }}>Current foundation</h2>
              <ul style={{ paddingLeft: 18, marginBottom: 0, lineHeight: 1.8 }}>
                {platformSummary.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
            <div style={{ display: "grid", gap: 14, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
              <div style={{ background: "rgba(255, 249, 241, 0.9)", border: "1px solid var(--line)", borderRadius: 24, padding: 22, boxShadow: "var(--shadow)" }}>
                <p style={{ marginTop: 0, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em", fontSize: 12 }}>Inventory live</p>
                <h3 style={{ margin: "4px 0 0", fontSize: "2rem" }}>{inStock}</h3>
                <p style={{ marginBottom: 0, color: "var(--muted)" }}>items currently claimable</p>
              </div>
              <div style={{ background: "rgba(255, 249, 241, 0.9)", border: "1px solid var(--line)", borderRadius: 24, padding: 22, boxShadow: "var(--shadow)" }}>
                <p style={{ marginTop: 0, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em", fontSize: 12 }}>Workflows ready</p>
                <h3 style={{ margin: "4px 0 0", fontSize: "2rem" }}>{DASHBOARD_SECTIONS.length}</h3>
                <p style={{ marginBottom: 0, color: "var(--muted)" }}>shared domain modules active</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section style={{ padding: "0 24px 34px", maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap", alignItems: "end", marginBottom: 18 }}>
          <div>
            <p style={{ margin: 0, color: "var(--accent-strong)", textTransform: "uppercase", letterSpacing: "0.12em", fontSize: 12 }}>Operations map</p>
            <h2 style={{ margin: "8px 0 0" }}>Core modules in progress</h2>
          </div>
          <p style={{ margin: 0, color: "var(--muted)", maxWidth: 420 }}>The same shared rules drive customer views, admin operations, and the future mobile scaffold.</p>
        </div>
        <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
          {DASHBOARD_SECTIONS.map((section) => (
            <SectionCard key={section.slug} title={section.title} description={section.description} />
          ))}
        </div>
      </section>

      <section style={{ padding: "0 24px 72px", maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap", alignItems: "end", marginBottom: 18 }}>
          <div>
            <p style={{ margin: 0, color: "var(--accent-strong)", textTransform: "uppercase", letterSpacing: "0.12em", fontSize: 12 }}>Store snapshot</p>
            <h2 style={{ margin: "8px 0 0" }}>Live product state</h2>
          </div>
          <a href="/store" style={{ color: "var(--accent-strong)", fontWeight: 700 }}>Open full storefront</a>
        </div>
        <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))" }}>
          {products.map((product) => (
            <div key={product.id} style={{ background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 26, padding: 22, boxShadow: "var(--shadow)", backdropFilter: "blur(14px)" }}>
              <div style={{ height: 170, borderRadius: 18, marginBottom: 16, background: "linear-gradient(145deg, #f4dfc3 0%, #fff7ea 100%)" }} />
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
                <p style={{ color: "var(--muted)", marginTop: 0, marginBottom: 8 }}>{product.category}</p>
                <span style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--accent-strong)" }}>{PRODUCT_STATUS_LABELS[product.status]}</span>
              </div>
              <h3 style={{ marginTop: 0 }}>{product.title}</h3>
              <p style={{ color: "var(--muted)", minHeight: 52 }}>{product.description}</p>
              <p style={{ fontWeight: 700, fontSize: "1.18rem", marginBottom: 8 }}>${product.price.toFixed(2)}</p>
              <p style={{ color: "var(--muted)", marginBottom: 0 }}>Available now: {product.quantity}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
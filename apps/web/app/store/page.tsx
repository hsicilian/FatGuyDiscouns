import { PRODUCT_STATUS_LABELS, canClaim } from "@fatguydiscounts/core";
import { Panel } from "@fatguydiscounts/ui";
import { RestockRequestForm } from "../../components/forms/restock-request-form";
import { getCurrentSessionAccount } from "../../lib/auth/session";
import { listProducts } from "../../lib/data/local-db";

const sortOptions = {
  featured: "Featured",
  price_asc: "Price: low to high",
  price_desc: "Price: high to low",
  title_asc: "Title: A to Z",
  stock_desc: "Stock: highest first",
} as const;

type SortKey = keyof typeof sortOptions;

function sortProducts(products: Awaited<ReturnType<typeof listProducts>>, sort: SortKey) {
  const sorted = [...products];

  switch (sort) {
    case "price_asc":
      return sorted.sort((a, b) => a.price - b.price);
    case "price_desc":
      return sorted.sort((a, b) => b.price - a.price);
    case "title_asc":
      return sorted.sort((a, b) => a.title.localeCompare(b.title));
    case "stock_desc":
      return sorted.sort((a, b) => b.quantity - a.quantity);
    default:
      return sorted.sort((a, b) => Number(b.quantity > 0) - Number(a.quantity > 0));
  }
}

const linkPillStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  background: "var(--accent)",
  color: "#fff",
  borderRadius: 999,
  padding: "12px 16px",
  fontWeight: 700,
};

function renderClaimCta(session: Awaited<ReturnType<typeof getCurrentSessionAccount>>) {
  if (!session) {
    return <a href="/login" style={linkPillStyle}>Login to Claim</a>;
  }

  if (session.role !== "customer") {
    return <a href="/admin" style={linkPillStyle}>Open Admin</a>;
  }

  if (canClaim(session.role, session.accountState)) {
    return <a href="/claims" style={linkPillStyle}>Claim This Item</a>;
  }

  if (session.accountState === "pending_approval") {
    return <a href="/account" style={linkPillStyle}>Approval Pending</a>;
  }

  if (session.accountState === "claiming_disabled") {
    return <a href="/account" style={linkPillStyle}>Claiming Disabled</a>;
  }

  return <a href="/account" style={linkPillStyle}>Account Unavailable</a>;
}

export default async function StorePage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [products, currentSession] = await Promise.all([
    listProducts(),
    getCurrentSessionAccount(),
  ]);
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const search = typeof resolvedSearchParams.search === "string" ? resolvedSearchParams.search : "";
  const category = typeof resolvedSearchParams.category === "string" ? resolvedSearchParams.category : "all";
  const sortParam = typeof resolvedSearchParams.sort === "string" ? resolvedSearchParams.sort : "featured";
  const sort = sortParam in sortOptions ? (sortParam as SortKey) : "featured";

  const categories = ["all", ...new Set(products.map((product) => product.category))];
  const filteredProducts = sortProducts(
    products.filter((product) => {
      const matchesSearch = !search || `${product.title} ${product.description}`.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = category === "all" || product.category === category;
      return matchesSearch && matchesCategory;
    }),
    sort,
  );

  return (
    <main style={{ maxWidth: 1200, margin: "0 auto", padding: "48px 24px 72px" }}>
      <div style={{ marginBottom: 24 }}>
        <p style={{ textTransform: "uppercase", letterSpacing: "0.12em", fontSize: 12, color: "#8e3200" }}>Storefront</p>
        <h1 style={{ margin: "0 0 12px" }}>Claim-ready product browsing</h1>
        <p style={{ color: "#6d655d", maxWidth: 720, lineHeight: 1.7 }}>
          Search, filter, and sort are now available on the web store so customers can browse more like a real shop before they claim.
        </p>
      </div>

      <section style={{ background: "#fffaf3", border: "1px solid #e8d6c3", borderRadius: 22, padding: 20, marginBottom: 24, boxShadow: "var(--shadow)" }}>
        <form style={{ display: "grid", gap: 14, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", alignItems: "end" }}>
          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ color: "#6d655d", fontSize: 14 }}>Search items</span>
            <input
              type="search"
              name="search"
              defaultValue={search}
              placeholder="Search titles and descriptions"
              style={{ padding: 12, borderRadius: 14, border: "1px solid #d9c7b2" }}
            />
          </label>
          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ color: "#6d655d", fontSize: 14 }}>Category</span>
            <select name="category" defaultValue={category} style={{ padding: 12, borderRadius: 14, border: "1px solid #d9c7b2" }}>
              {categories.map((entry) => (
                <option key={entry} value={entry}>{entry === "all" ? "All categories" : entry}</option>
              ))}
            </select>
          </label>
          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ color: "#6d655d", fontSize: 14 }}>Sort</span>
            <select name="sort" defaultValue={sort} style={{ padding: 12, borderRadius: 14, border: "1px solid #d9c7b2" }}>
              {Object.entries(sortOptions).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>
          <button style={{ background: "#1f1d1a", color: "#fff", border: 0, borderRadius: 999, padding: "12px 18px", minHeight: 46 }}>
            Apply
          </button>
        </form>
      </section>

      <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap", marginBottom: 16 }}>
        <p style={{ margin: 0, color: "#6d655d" }}>{filteredProducts.length} item{filteredProducts.length === 1 ? "" : "s"} shown</p>
        <a href="/store" style={{ color: "#8e3200", fontWeight: 700 }}>Reset filters</a>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16 }}>
        {filteredProducts.map((product) => (
          <Panel key={product.id}>
            <div style={{ background: "#f0dfcc", borderRadius: 16, height: 180, marginBottom: 16 }} />
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
              <p style={{ color: "#6d655d", marginTop: 0, marginBottom: 8 }}>{product.category}</p>
              <span style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.08em", color: product.quantity > 0 ? "#2f5d32" : "#8e3200" }}>
                {PRODUCT_STATUS_LABELS[product.status]}
              </span>
            </div>
            <h2 style={{ marginTop: 0, fontSize: "1.25rem" }}>{product.title}</h2>
            <p style={{ color: "#6d655d", minHeight: 48 }}>{product.description}</p>
            <p style={{ fontSize: "1.2rem", fontWeight: 700 }}>${product.price.toFixed(2)}</p>
            <p style={{ color: "#6d655d" }}>Available now: {product.quantity}</p>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {renderClaimCta(currentSession)}
              {product.quantity === 0 ? <RestockRequestForm productId={product.id} /> : null}
            </div>
          </Panel>
        ))}
      </div>

      {filteredProducts.length === 0 ? (
        <section style={{ marginTop: 20, background: "#fffaf3", border: "1px solid #e8d6c3", borderRadius: 20, padding: 22 }}>
          <h2 style={{ marginTop: 0 }}>No items matched</h2>
          <p style={{ color: "#6d655d", marginBottom: 0 }}>Try broadening the search, switching categories, or resetting filters.</p>
        </section>
      ) : null}
    </main>
  );
}
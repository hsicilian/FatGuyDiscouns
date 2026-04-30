import { formatSalePercentage, PRODUCT_STATUS_LABELS, canClaim } from "@fatguydiscounts/core";
import { Panel } from "@fatguydiscounts/ui";
import type { Product } from "@fatguydiscounts/types";
import { ClaimSubmitForm } from "../../components/forms/claim-submit-form";
import { RestockRequestForm } from "../../components/forms/restock-request-form";
import { getCurrentSessionAccount } from "../../lib/auth/session";
import { listProducts } from "../../lib/data/local-db";
import { getProductPath } from "../../lib/products";

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

const ctaStyle = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 46,
  padding: "12px 16px",
  borderRadius: 999,
  fontWeight: 700,
};

function renderClaimCta(
  session: Awaited<ReturnType<typeof getCurrentSessionAccount>>,
  productId: string,
  outOfStock: boolean,
) {
  if (!session) {
    return <a href="/login" style={{ ...ctaStyle, background: "var(--accent)", color: "#fff" }}>Login to Claim</a>;
  }

  if (session.role !== "customer") {
    return <a href="/admin" style={{ ...ctaStyle, background: "#1d1d1d", color: "#fff" }}>Open Admin</a>;
  }

  if (canClaim(session.role, session.accountState)) {
    return (
      <div style={{ minWidth: 180, width: "100%" }}>
        <ClaimSubmitForm
          productId={productId}
          disabled={outOfStock}
          submitLabel="Claim This Item"
          disabledLabel="Unavailable"
          compact
        />
      </div>
    );
  }

  if (session.accountState === "pending_approval") {
    return <a href="/account" style={{ ...ctaStyle, background: "rgba(255,255,255,0.82)", border: "1px solid var(--line)" }}>Approval Pending</a>;
  }

  if (session.accountState === "claiming_disabled") {
    return <a href="/account" style={{ ...ctaStyle, background: "rgba(255,255,255,0.82)", border: "1px solid var(--line)" }}>Claiming Disabled</a>;
  }

  return <a href="/account" style={{ ...ctaStyle, background: "rgba(255,255,255,0.82)", border: "1px solid var(--line)" }}>Account Unavailable</a>;
}

function getItemRequestHref(session: Awaited<ReturnType<typeof getCurrentSessionAccount>>) {
  if (!session) {
    return "/login";
  }

  if (session.role === "customer") {
    return "/account#item-request";
  }

  return "/admin/requests";
}

function money(value: number) {
  return `$${value.toFixed(2)}`;
}

function getCardImage(images: string[]) {
  return images[0] ?? "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=1200&q=80";
}

function buildCategoryLink(category: string) {
  const params = new URLSearchParams({ category, sort: "featured" });
  return `/store?${params.toString()}#store-grid`;
}

function ProductCard({
  currentSession,
  product,
}: {
  currentSession: Awaited<ReturnType<typeof getCurrentSessionAccount>>;
  product: Product;
}) {
  const cardImage = getCardImage(product.images);
  const productPath = getProductPath(product);

  return (
    <Panel>
      <article
        style={{
          display: "grid",
          gap: 16,
          gridTemplateRows: "220px auto minmax(72px, auto) 1fr",
          height: "100%",
        }}
      >
        <a
          href={productPath}
          style={{
            borderRadius: 20,
            background: "linear-gradient(145deg, #ecd0af 0%, #fff0d6 100%)",
            padding: 18,
            display: "flex",
            alignItems: "end",
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
              background: "rgba(255,255,255,0.82)",
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
        </a>

        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "start" }}>
          <h2 style={{ margin: 0, fontSize: "1.28rem" }}>
            <a href={productPath}>{product.title}</a>
          </h2>
          <span style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.08em", color: product.quantity > 0 ? "#2f5d32" : "var(--accent-strong)" }}>
            {PRODUCT_STATUS_LABELS[product.status]}
          </span>
        </div>

        <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.7, minHeight: 72 }}>{product.description}</p>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            alignItems: "end",
            flexWrap: "wrap",
            alignSelf: "end",
          }}
        >
          <div>
            {product.isOnSale && product.salePrice != null ? (
              <div style={{ display: "grid", gap: 4 }}>
                <p style={{ margin: 0, color: "var(--muted)", textDecoration: "line-through" }}>{money(product.originalPrice)}</p>
                <p style={{ margin: 0, fontSize: "1.24rem", fontWeight: 700, color: "#b42318" }}>{money(product.salePrice)}</p>
                <p style={{ margin: 0, color: "#b42318", fontSize: 13, fontWeight: 700 }}>
                  {formatSalePercentage(product.salePercentage)}% off through {product.saleEndsAt?.slice(0, 10)}
                </p>
              </div>
            ) : (
              <p style={{ margin: 0, fontSize: "1.24rem", fontWeight: 700 }}>{money(product.price)}</p>
            )}
            <p style={{ margin: "6px 0 0", color: "var(--muted)" }}>
              {product.quantity > 0 ? `${product.quantity} available` : "Out of stock"}
            </p>
          </div>
          <div id={`product-${product.id}`} style={{ display: "grid", gap: 10, justifyItems: "stretch", width: "min(100%, 220px)" }}>
            <a href={productPath} style={{ ...ctaStyle, background: "#1d1d1d", color: "#fff" }}>
              View Item
            </a>
            {renderClaimCta(currentSession, product.id, product.quantity === 0)}
            {product.quantity === 0 ? <RestockRequestForm productId={product.id} /> : null}
          </div>
        </div>
      </article>
    </Panel>
  );
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

  const useCategoryRows = !search && category === "all" && sort === "featured";
  const categorySections = categories
    .filter((entry) => entry !== "all")
    .map((entry) => ({
      category: entry,
      products: sortProducts(
        products.filter((product) => product.category === entry),
        "featured",
      ).slice(0, 4),
    }))
    .filter((section) => section.products.length > 0);

  return (
    <main style={{ maxWidth: 1240, margin: "0 auto", padding: "28px 24px 72px" }}>
      <section
        className="store-hero-grid"
        style={{
          display: "grid",
          gap: 20,
          gridTemplateColumns: "minmax(0, 1.2fr) minmax(280px, 0.7fr)",
          alignItems: "stretch",
          marginBottom: 24,
        }}
      >
        <div
          className="store-hero-main"
          style={{
            background: "linear-gradient(145deg, rgba(255, 249, 239, 0.96) 0%, rgba(252, 237, 217, 0.94) 100%)",
            border: "1px solid rgba(222, 197, 174, 0.92)",
            borderRadius: 34,
            padding: "32px clamp(22px, 4vw, 38px)",
            boxShadow: "var(--shadow)",
          }}
        >
          <p style={{ margin: 0, fontSize: 12, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--accent-strong)", fontWeight: 700 }}>
            Shop the current drop
          </p>
          <h1 style={{ margin: "14px 0 12px", fontSize: "clamp(2.6rem, 5vw, 4.2rem)", lineHeight: 0.96 }}>
            Claim-ready finds, updated live.
          </h1>
          <p style={{ margin: 0, maxWidth: 640, color: "var(--muted)", lineHeight: 1.8, fontSize: "1.03rem" }}>
            Browse available items, filter by category, and claim what you want once your customer account is approved.
          </p>
          <div className="store-hero-actions" style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 24 }}>
            <a href="#store-grid" style={{ ...ctaStyle, background: "var(--accent)", color: "#fff" }}>
              Shop Available Items
            </a>
            <a href="/events" style={{ ...ctaStyle, background: "rgba(255,255,255,0.8)", border: "1px solid var(--line)" }}>
              Upcoming Shows
            </a>
          </div>
          <p style={{ margin: "16px 0 0", color: "var(--muted)", lineHeight: 1.7 }}>
            Need something specific?{" "}
            <a href={getItemRequestHref(currentSession)} style={{ color: "var(--accent-strong)", fontWeight: 700 }}>
              Request it from your account
            </a>
            .
          </p>
        </div>

        <div className="store-hero-stats" style={{ display: "grid", gap: 14, gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
          <Panel>
            <p style={{ margin: 0, fontSize: 12, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--muted)" }}>Visible items</p>
            <p style={{ margin: "10px 0 0", fontSize: "2rem", fontWeight: 700 }}>{filteredProducts.length}</p>
          </Panel>
          <Panel>
            <p style={{ margin: 0, fontSize: 12, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--muted)" }}>Categories</p>
            <p style={{ margin: "10px 0 0", fontSize: "2rem", fontWeight: 700 }}>{categories.length - 1}</p>
          </Panel>
          <Panel>
            <p style={{ margin: 0, fontSize: 12, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--muted)" }}>Ready to claim</p>
            <p style={{ margin: "10px 0 0", fontSize: "2rem", fontWeight: 700 }}>{products.filter((product) => product.quantity > 0).length}</p>
          </Panel>
          <Panel>
            <p style={{ margin: 0, fontSize: 12, textTransform: "uppercase", letterSpacing: "0.12em", color: "var(--muted)" }}>Need restock</p>
            <p style={{ margin: "10px 0 0", fontSize: "2rem", fontWeight: 700 }}>{products.filter((product) => product.quantity === 0).length}</p>
          </Panel>
        </div>
      </section>

      <section
        style={{
          background: "rgba(255, 251, 244, 0.88)",
          border: "1px solid var(--line)",
          borderRadius: 24,
          padding: 20,
          marginBottom: 20,
          boxShadow: "var(--shadow-soft)",
        }}
      >
        <form style={{ display: "grid", gap: 14, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", alignItems: "end" }}>
          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ color: "var(--muted)", fontSize: 14 }}>Search</span>
            <input
              type="search"
              name="search"
              defaultValue={search}
              placeholder="Search by title or description"
              style={{ padding: 12, borderRadius: 14, border: "1px solid #d9c7b2" }}
            />
          </label>
          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ color: "var(--muted)", fontSize: 14 }}>Category</span>
            <select name="category" defaultValue={category} style={{ padding: 12, borderRadius: 14, border: "1px solid #d9c7b2" }}>
              {categories.map((entry) => (
                <option key={entry} value={entry}>{entry === "all" ? "All categories" : entry}</option>
              ))}
            </select>
          </label>
          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ color: "var(--muted)", fontSize: 14 }}>Sort</span>
            <select name="sort" defaultValue={sort} style={{ padding: 12, borderRadius: 14, border: "1px solid #d9c7b2" }}>
              {Object.entries(sortOptions).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>
          <button style={{ minHeight: 46, background: "#1d1d1d", color: "#fff", border: 0, borderRadius: 999, padding: "12px 18px", fontWeight: 700 }}>
            Apply Filters
          </button>
        </form>
      </section>

      <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap", marginBottom: 18, alignItems: "center" }}>
        <p style={{ margin: 0, color: "var(--muted)" }}>
          {useCategoryRows
            ? `Showing ${categorySections.length} category row${categorySections.length === 1 ? "" : "s"} with 4 items each`
            : `Showing ${filteredProducts.length} item${filteredProducts.length === 1 ? "" : "s"}`}
        </p>
        <a href="/store" style={{ color: "var(--accent-strong)", fontWeight: 700 }}>Clear filters</a>
      </div>

      {useCategoryRows ? (
        <div id="store-grid" style={{ display: "grid", gap: 28 }}>
          {categorySections.map((section) => (
            <section
              key={section.category}
              style={{
                display: "grid",
                gap: 16,
                background: "rgba(255, 251, 244, 0.72)",
                border: "1px solid rgba(232,214,195,0.88)",
                borderRadius: 28,
                padding: 22,
                boxShadow: "var(--shadow-soft)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 14, alignItems: "baseline", flexWrap: "wrap" }}>
                <div>
                  <p style={{ margin: 0, textTransform: "uppercase", letterSpacing: "0.12em", fontSize: 12, color: "var(--accent-strong)", fontWeight: 700 }}>
                    {section.category}
                  </p>
                  <h2 style={{ margin: "8px 0 0", fontSize: "clamp(1.6rem, 3vw, 2rem)" }}>{section.category} picks</h2>
                </div>
                <a href={buildCategoryLink(section.category)} style={{ color: "var(--accent-strong)", fontWeight: 700 }}>
                  View more
                </a>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
                  gap: 18,
                }}
                className="store-category-grid"
              >
                {section.products.map((product) => (
                  <ProductCard
                    key={product.id}
                    currentSession={currentSession}
                    product={product}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <div id="store-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 18 }}>
          {filteredProducts.map((product) => (
            <ProductCard
              key={product.id}
              currentSession={currentSession}
              product={product}
            />
          ))}
        </div>
      )}

      {!useCategoryRows && filteredProducts.length === 0 ? (
        <section style={{ marginTop: 20, background: "rgba(255, 251, 244, 0.88)", border: "1px solid var(--line)", borderRadius: 20, padding: 22 }}>
          <h2 style={{ marginTop: 0 }}>No items matched that search</h2>
          <p style={{ color: "var(--muted)", marginBottom: 0 }}>Try another keyword, switch categories, or clear filters to see everything again.</p>
        </section>
      ) : null}
    </main>
  );
}

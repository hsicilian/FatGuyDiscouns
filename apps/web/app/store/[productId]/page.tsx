import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PRODUCT_STATUS_LABELS, canClaim } from "@fatguydiscounts/core";
import { ClaimSubmitForm } from "../../../components/forms/claim-submit-form";
import { RestockRequestForm } from "../../../components/forms/restock-request-form";
import { ShareProductButton } from "../../../components/store/share-product-button";
import { getCurrentSessionAccount } from "../../../lib/auth/session";
import { getProductById } from "../../../lib/data/local-db";
import { getProductPath } from "../../../lib/products";
import { getSiteUrl } from "../../../lib/supabase";

function money(value: number) {
  return `$${value.toFixed(2)}`;
}

function getProductUrl(product: { id: string; title: string }) {
  return `${getSiteUrl().replace(/\/$/, "")}${getProductPath(product)}`;
}

function getPrimaryImage(images: string[]) {
  return images[0] ?? "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=1200&q=80";
}

function renderClaimCta(
  session: Awaited<ReturnType<typeof getCurrentSessionAccount>>,
  productId: string,
  outOfStock: boolean,
) {
  const ctaStyle = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 46,
    padding: "12px 16px",
    borderRadius: 999,
    fontWeight: 700,
  };

  if (!session) {
    return <a href="/login" style={{ ...ctaStyle, background: "var(--accent)", color: "#fff" }}>Login to Claim</a>;
  }

  if (session.role !== "customer") {
    return <a href="/admin" style={{ ...ctaStyle, background: "#1d1d1d", color: "#fff" }}>Open Admin</a>;
  }

  if (canClaim(session.role, session.accountState)) {
    return (
      <ClaimSubmitForm
        productId={productId}
        disabled={outOfStock}
        submitLabel="Claim This Item"
        disabledLabel="Unavailable"
        compact
      />
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

export async function generateMetadata({
  params,
}: {
  params: Promise<{ productId: string }>;
}): Promise<Metadata> {
  const { productId } = await params;
  const product = await getProductById(productId);

  if (!product) {
    return {
      title: "Item not found | Fatguydiscounts",
    };
  }

  const productUrl = getProductUrl(product);
  const primaryImage = getPrimaryImage(product.images);
  const priceLine = product.isOnSale && product.salePrice != null
    ? `${money(product.salePrice)} sale price`
    : `${money(product.price)}`;

  return {
    title: `${product.title} | Fatguydiscounts`,
    description: `${product.description} ${priceLine}.`,
    openGraph: {
      title: product.title,
      description: `${product.description} ${priceLine}.`,
      url: productUrl,
      images: [{ url: primaryImage }],
    },
  };
}

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ productId: string }>;
}) {
  const { productId } = await params;
  const [product, currentSession] = await Promise.all([
    getProductById(productId),
    getCurrentSessionAccount(),
  ]);

  if (!product) {
    notFound();
  }

  const productUrl = getProductUrl(product);
  const gallery = product.images.length > 0 ? product.images : [getPrimaryImage([])];

  return (
    <main style={{ maxWidth: 1240, margin: "0 auto", padding: "32px 24px 72px", display: "grid", gap: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap", alignItems: "center" }}>
        <a href="/store" style={{ color: "var(--accent-strong)", fontWeight: 700 }}>Back to shop</a>
        <p style={{ margin: 0, color: "var(--muted)" }}>{product.category} | {PRODUCT_STATUS_LABELS[product.status]}</p>
      </div>

      <section className="product-detail-grid" style={{ display: "grid", gap: 24, gridTemplateColumns: "minmax(0, 1.15fr) minmax(320px, 0.85fr)", alignItems: "start" }}>
        <div style={{ display: "grid", gap: 14 }}>
          <div
            className="product-detail-primary-image"
            style={{
              minHeight: 520,
              borderRadius: 28,
              border: "1px solid var(--line)",
              background: "linear-gradient(145deg, #ecd0af 0%, #fff0d6 100%)",
              boxShadow: "var(--shadow)",
              overflow: "hidden",
              position: "relative",
            }}
          >
            <img
              src={gallery[0]}
              alt={product.title}
              style={{
                display: "block",
                width: "100%",
                height: "100%",
                minHeight: 520,
                objectFit: "cover",
              }}
            />
          </div>
          <div className="product-detail-gallery" style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))" }}>
            {gallery.slice(1, 6).map((image, index) => (
              <div
                key={`${product.id}-image-${index + 1}`}
                className="product-detail-gallery-item"
                style={{
                  minHeight: 140,
                  borderRadius: 18,
                  border: "1px solid var(--line)",
                  background: "linear-gradient(145deg, #ecd0af 0%, #fff0d6 100%)",
                  overflow: "hidden",
                }}
              >
                <img
                  src={image}
                  alt={`${product.title} view ${index + 2}`}
                  style={{
                    display: "block",
                    width: "100%",
                    height: "100%",
                    minHeight: 140,
                    objectFit: "cover",
                  }}
                />
              </div>
            ))}
          </div>
        </div>

        <section className="product-detail-panel" style={{ background: "linear-gradient(145deg, rgba(255, 249, 239, 0.96) 0%, rgba(255, 239, 218, 0.93) 100%)", border: "1px solid rgba(222, 197, 174, 0.95)", borderRadius: 32, padding: "32px clamp(22px, 4vw, 36px)", boxShadow: "var(--shadow)", display: "grid", gap: 18 }}>
          <div>
            <p style={{ margin: 0, fontSize: 12, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--accent-strong)", fontWeight: 700 }}>
              Claim-ready listing
            </p>
            <h1 style={{ margin: "12px 0 10px", fontSize: "clamp(2.4rem, 5vw, 4rem)", lineHeight: 0.96 }}>
              {product.title}
            </h1>
            <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.8 }}>{product.description}</p>
          </div>

          <div style={{ display: "grid", gap: 8 }}>
            {product.isOnSale && product.salePrice != null ? (
              <>
                <p style={{ margin: 0, color: "var(--muted)", textDecoration: "line-through", fontSize: "1.04rem" }}>{money(product.originalPrice)}</p>
                <p style={{ margin: 0, fontSize: "2rem", fontWeight: 800, color: "#b42318" }}>{money(product.salePrice)}</p>
                <p style={{ margin: 0, color: "#b42318", fontSize: 13, fontWeight: 700 }}>
                  {product.salePercentage}% off through {product.saleEndsAt?.slice(0, 10)}
                </p>
              </>
            ) : (
              <p style={{ margin: 0, fontSize: "2rem", fontWeight: 800 }}>{money(product.price)}</p>
            )}
            <p style={{ margin: 0, color: "var(--muted)" }}>
              {product.quantity > 0 ? `${product.quantity} available right now` : "Currently out of stock"}
            </p>
          </div>

          <div style={{ display: "grid", gap: 12 }}>
            {renderClaimCta(currentSession, product.id, product.quantity === 0)}
            {product.quantity === 0 ? <RestockRequestForm productId={product.id} /> : null}
            <ShareProductButton url={productUrl} title={product.title} />
          </div>

          <div style={{ display: "grid", gap: 10, padding: 18, borderRadius: 20, background: "rgba(255,255,255,0.58)", border: "1px solid rgba(232,214,195,0.88)" }}>
            <strong>Why share this page</strong>
            <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.7 }}>
              This direct item link is the one you can post when something is on sale. It keeps shoppers focused on the exact listing instead of sending them back to the full shop.
            </p>
          </div>
        </section>
      </section>
    </main>
  );
}

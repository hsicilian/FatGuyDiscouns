import { PRODUCT_STATUS_LABELS } from "@fatguydiscounts/core";
import { Panel } from "@fatguydiscounts/ui";
import { ArchiveProductForm } from "../../../components/forms/archive-product-form";
import { CategoryCreateForm } from "../../../components/forms/category-create-form";
import { CategoryDeleteForm } from "../../../components/forms/category-delete-form";
import { InventoryAdjustForm } from "../../../components/forms/inventory-adjust-form";
import { InventoryBulkImportForm } from "../../../components/forms/inventory-bulk-import-form";
import { InventoryCreateForm } from "../../../components/forms/inventory-create-form";
import { InventorySaleForm } from "../../../components/forms/inventory-sale-form";
import { ensureAdminAccess } from "../../../lib/auth/guards";
import { listCategories, listProducts } from "../../../lib/data/local-db";

const sortOptions = {
  newest: "Newest first",
  oldest: "Oldest first",
  title_asc: "Title: A to Z",
  stock_low: "Stock: low to high",
  stock_high: "Stock: high to low",
} as const;

type InventorySortKey = keyof typeof sortOptions;

function getCardImage(images: string[]) {
  return images[0] ?? "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=1200&q=80";
}

function sortProducts(products: Awaited<ReturnType<typeof listProducts>>, sort: InventorySortKey) {
  const sorted = [...products];

  switch (sort) {
    case "oldest":
      return sorted.reverse();
    case "title_asc":
      return sorted.sort((a, b) => a.title.localeCompare(b.title));
    case "stock_low":
      return sorted.sort((a, b) => a.quantity - b.quantity || a.title.localeCompare(b.title));
    case "stock_high":
      return sorted.sort((a, b) => b.quantity - a.quantity || a.title.localeCompare(b.title));
    default:
      return sorted;
  }
}

export default async function AdminInventoryPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  await ensureAdminAccess();

  const resolvedSearchParams = searchParams ? await searchParams : {};
  const sortParam = typeof resolvedSearchParams.sort === "string" ? resolvedSearchParams.sort : "newest";
  const sort = sortParam in sortOptions ? (sortParam as InventorySortKey) : "newest";
  const [activeProducts, archivedProducts] = await Promise.all([
    listProducts(),
    listProducts({ includeArchived: true }),
  ]);
  const categories = await listCategories();
  const sortedProducts = sortProducts(activeProducts, sort);
  const archivedCount = archivedProducts.length;
  const lowStockCount = activeProducts.filter((product) => product.quantity <= 1).length;

  return (
    <main style={{ maxWidth: 1120, margin: "0 auto", padding: "48px 24px 72px" }}>
      <section style={{ background: "linear-gradient(145deg, rgba(255, 249, 241, 0.95) 0%, rgba(246, 229, 209, 0.92) 100%)", border: "1px solid var(--line)", borderRadius: 30, padding: 28, boxShadow: "var(--shadow)", marginBottom: 24 }}>
        <p style={{ textTransform: "uppercase", letterSpacing: "0.14em", fontSize: 12, color: "var(--accent-strong)", marginTop: 0 }}>Stock room</p>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 18, alignItems: "end", flexWrap: "wrap" }}>
          <div>
            <h1 style={{ margin: "0 0 10px" }}>Inventory management</h1>
            <p style={{ color: "var(--muted)", lineHeight: 1.7, maxWidth: 760, margin: 0 }}>
              Inventory updates immediately as claims are created. Use the stock tools below to restock, decrement, and keep visible sell-outs accurate.
            </p>
          </div>
          <div style={{ background: "rgba(255,255,255,0.52)", border: "1px solid rgba(232,214,195,0.9)", borderRadius: 18, padding: 16, minWidth: 220 }}>
            <p style={{ marginTop: 0, color: "var(--muted)", fontSize: 13, textTransform: "uppercase", letterSpacing: "0.08em" }}>Low stock items</p>
            <strong style={{ fontSize: "1.9rem" }}>{lowStockCount}</strong>
            <p style={{ margin: "8px 0 0" }}>
              <a href="/admin/inventory/archived" style={{ color: "var(--accent-strong)", fontWeight: 700 }}>
                View archived items ({archivedCount})
              </a>
            </p>
          </div>
        </div>
      </section>

      <Panel>
        <div style={{ display: "grid", gap: 16 }}>
          <div>
            <p style={{ textTransform: "uppercase", letterSpacing: "0.14em", fontSize: 12, color: "var(--accent-strong)", marginTop: 0, marginBottom: 8 }}>
              New listing
            </p>
            <h2 style={{ margin: "0 0 8px" }}>Add a new inventory item</h2>
            <p style={{ color: "var(--muted)", lineHeight: 1.7, margin: 0 }}>
              Create a new product listing right from the admin stock room. New items appear in the shop as soon as they are saved.
            </p>
          </div>
          <InventoryCreateForm categories={categories} />
        </div>
      </Panel>

      <Panel>
        <div style={{ display: "grid", gap: 16 }}>
          <div>
            <p style={{ textTransform: "uppercase", letterSpacing: "0.14em", fontSize: 12, color: "var(--accent-strong)", marginTop: 0, marginBottom: 8 }}>
              Categories
            </p>
            <h2 style={{ margin: "0 0 8px" }}>Manage inventory categories</h2>
            <p style={{ color: "var(--muted)", lineHeight: 1.7, margin: 0 }}>
              Add categories here, then choose them from the inventory item dropdown. Categories can only be removed when no products are using them.
            </p>
          </div>

          <CategoryCreateForm />

          <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
            {categories.map((category) => (
              <div
                key={category.id}
                style={{
                  display: "grid",
                  gap: 12,
                  padding: 16,
                  borderRadius: 18,
                  background: "rgba(255,255,255,0.56)",
                  border: "1px solid rgba(232,214,195,0.88)",
                }}
              >
                <strong>{category.name}</strong>
                <CategoryDeleteForm categoryId={category.id} />
              </div>
            ))}
          </div>
        </div>
      </Panel>

      <Panel>
        <div style={{ display: "grid", gap: 16 }}>
          <div>
            <p style={{ textTransform: "uppercase", letterSpacing: "0.14em", fontSize: 12, color: "var(--accent-strong)", marginTop: 0, marginBottom: 8 }}>
              Bulk import
            </p>
            <h2 style={{ margin: "0 0 8px" }}>Upload several inventory rows at once</h2>
            <p style={{ color: "var(--muted)", lineHeight: 1.7, margin: 0 }}>
              Import a CSV when you have a batch of titles, prices, stock counts, and categories ready to go. Photos can still be added item by item afterward.
            </p>
          </div>
          <InventoryBulkImportForm />
        </div>
      </Panel>

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
        <form style={{ display: "grid", gap: 14, gridTemplateColumns: "minmax(220px, 320px) auto", alignItems: "end" }}>
          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ color: "var(--muted)", fontSize: 14 }}>Sort inventory</span>
            <select name="sort" defaultValue={sort} style={{ padding: 12, borderRadius: 14, border: "1px solid #d9c7b2" }}>
              {Object.entries(sortOptions).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>
          <button style={{ minHeight: 46, background: "#1d1d1d", color: "#fff", border: 0, borderRadius: 999, padding: "12px 18px", fontWeight: 700 }}>
            Apply Sort
          </button>
        </form>
      </section>

      <div style={{ display: "grid", gap: 16 }}>
        {sortedProducts.map((product) => (
          <Panel key={product.id}>
            <div style={{ display: "grid", gap: 18, gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}>
              <div style={{ display: "grid", gap: 16 }}>
                <div
                  style={{
                    minHeight: 220,
                    borderRadius: 22,
                    background: "linear-gradient(145deg, #ecd0af 0%, #fff0d6 100%)",
                    position: "relative",
                    overflow: "hidden",
                    border: "1px solid rgba(232,214,195,0.88)",
                  }}
                >
                  <img
                    src={getCardImage(product.images)}
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
                      background: "linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(16,12,8,0.18) 100%)",
                    }}
                  />
                </div>

                <div>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 14, flexWrap: "wrap", alignItems: "center" }}>
                  <div>
                    <p style={{ color: "var(--muted)", marginTop: 0, marginBottom: 8 }}>{product.category}</p>
                    <h2 style={{ marginTop: 0 }}>{product.title}</h2>
                  </div>
                  <span style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.08em", color: product.quantity > 0 ? "#2f5d32" : "var(--accent-strong)" }}>
                    {PRODUCT_STATUS_LABELS[product.status]}
                  </span>
                </div>
                <p style={{ color: "var(--muted)", lineHeight: 1.7, marginTop: 0 }}>{product.description}</p>
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                  <div style={{ padding: 14, borderRadius: 16, background: "rgba(255,255,255,0.56)", border: "1px solid rgba(232,214,195,0.88)" }}>
                    <p style={{ margin: 0, color: "var(--muted)" }}>Qty on hand</p>
                    <strong>{product.quantity}</strong>
                  </div>
                  <div style={{ padding: 14, borderRadius: 16, background: "rgba(255,255,255,0.56)", border: "1px solid rgba(232,214,195,0.88)" }}>
                    <p style={{ margin: 0, color: "var(--muted)" }}>Price</p>
                    <strong>${product.originalPrice.toFixed(2)}</strong>
                    {product.isOnSale && product.salePrice != null ? (
                      <p style={{ margin: "6px 0 0", color: "#b42318", fontWeight: 700 }}>
                        Sale ${product.salePrice.toFixed(2)}
                      </p>
                    ) : null}
                  </div>
                </div>
                </div>
              </div>
              <div style={{ display: "grid", gap: 14 }}>
                <div style={{ padding: 16, borderRadius: 20, background: "rgba(255,255,255,0.55)", border: "1px solid rgba(232,214,195,0.88)" }}>
                  <InventoryAdjustForm productId={product.id} />
                </div>
                <div style={{ padding: 16, borderRadius: 20, background: "rgba(255,255,255,0.55)", border: "1px solid rgba(232,214,195,0.88)" }}>
                  <div style={{ display: "grid", gap: 8, marginBottom: 12 }}>
                    <strong>Sale pricing</strong>
                    <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.6 }}>
                      Set a percentage discount and end date. The shop will show the original price crossed out and the sale price in red.
                    </p>
                  </div>
                  <InventorySaleForm
                    productId={product.id}
                    currentSalePercentage={product.salePercentage}
                    currentSaleEndsAt={product.saleEndsAt}
                  />
                </div>
                <div style={{ padding: 16, borderRadius: 20, background: "rgba(255,255,255,0.55)", border: "1px solid rgba(232,214,195,0.88)" }}>
                  <div style={{ display: "grid", gap: 8, marginBottom: 12 }}>
                    <strong>Archive item</strong>
                    <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.6 }}>
                      Archive removes this item from the live shop first. If you no longer need it, you can delete it later from the archived items page.
                    </p>
                  </div>
                  <ArchiveProductForm productId={product.id} />
                </div>
              </div>
            </div>
          </Panel>
        ))}
      </div>
    </main>
  );
}

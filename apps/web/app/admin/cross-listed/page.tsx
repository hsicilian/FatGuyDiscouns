import { CrossListedInventoryEditForm, CrossListedInventoryForm } from "../../../components/forms/cross-listed-inventory-form";
import { DeleteCrossListedInventoryForm } from "../../../components/forms/delete-cross-listed-inventory-form";
import { ensureMasterAdminAccess } from "../../../lib/auth/guards";
import { listCrossListedInventory } from "../../../lib/data/local-db";

function getSearchValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function formatPlatformDate(value?: string) {
  if (!value) {
    return "";
  }

  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "2-digit",
  }).format(date);
}

function formatPlatformLabel(platform: string, platformDates: Record<string, string>) {
  const formattedDate = formatPlatformDate(platformDates[platform]);
  return formattedDate ? `${platform} - ${formattedDate}` : platform;
}

export default async function AdminCrossListedPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  await ensureMasterAdminAccess();
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const search = getSearchValue(resolvedSearchParams.search).trim();
  const records = await listCrossListedInventory(search);

  return (
    <main style={{ maxWidth: 1120, margin: "0 auto", padding: "48px 24px 72px", display: "grid", gap: 24 }}>
      <section style={{ background: "linear-gradient(145deg, rgba(255, 249, 241, 0.95) 0%, rgba(246, 229, 209, 0.92) 100%)", border: "1px solid var(--line)", borderRadius: 30, padding: 28, boxShadow: "var(--shadow)" }}>
        <a href="/admin" style={{ color: "var(--accent-strong)", fontWeight: 700 }}>Back to admin dashboard</a>
        <p style={{ textTransform: "uppercase", letterSpacing: "0.14em", fontSize: 12, color: "var(--accent-strong)", marginBottom: 8, fontWeight: 700 }}>Master admin only</p>
        <h1 style={{ margin: "0 0 10px" }}>Cross listed inventory</h1>
        <p style={{ margin: 0, color: "var(--muted)", lineHeight: 1.7 }}>
          Track where each SKU is live so when something sells, you immediately know which platforms still need to be updated.
        </p>
      </section>

      <section style={{ display: "grid", gap: 24, gridTemplateColumns: "minmax(0, 380px) minmax(0, 1fr)" }}>
        <div style={{ background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 24, padding: 22, boxShadow: "var(--shadow)" }}>
          <h2 style={{ marginTop: 0 }}>Add or update item</h2>
          <CrossListedInventoryForm />
        </div>

        <div style={{ background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 24, padding: 22, boxShadow: "var(--shadow)", display: "grid", gap: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "end", flexWrap: "wrap" }}>
            <div>
              <h2 style={{ margin: "0 0 8px" }}>Saved listings</h2>
              <p style={{ margin: 0, color: "var(--muted)" }}>Search by SKU, item name, or platform.</p>
            </div>
            <form style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <input
                type="search"
                name="search"
                defaultValue={search}
                placeholder="Search SKU, item, or platform"
                style={{ minWidth: 220, padding: 12, borderRadius: 12, border: "1px solid #d9c7b2" }}
              />
              <button style={{ background: "var(--accent)", color: "#fff", border: 0, borderRadius: 999, padding: "12px 18px", fontWeight: 700 }}>
                Search
              </button>
              {search ? (
                <a href="/admin/cross-listed" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", borderRadius: 999, padding: "12px 18px", border: "1px solid var(--line)", background: "rgba(255,255,255,0.6)", fontWeight: 700 }}>
                  Clear
                </a>
              ) : null}
            </form>
          </div>

          <div style={{ display: "grid", gap: 12 }}>
            {records.length > 0 ? records.map((record) => (
              <article key={record.id} style={{ borderTop: "1px solid #eedfce", paddingTop: 12, display: "grid", gap: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                  <div>
                    <strong>{record.itemName}</strong>
                    <p style={{ margin: "4px 0 0", color: "var(--muted)" }}>SKU {record.sku}</p>
                  </div>
                  <span style={{ color: "var(--muted)", fontSize: 13 }}>Updated {record.updatedAt}</span>
                </div>
                <div style={{ display: "grid", gap: 8 }}>
                  <strong>Platforms</strong>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {record.platforms.map((platform) => (
                      <span
                        key={`${record.id}-${platform}`}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          borderRadius: 999,
                          padding: "8px 12px",
                          border: "1px solid rgba(232,214,195,0.88)",
                          background: "rgba(255,255,255,0.62)",
                          fontSize: 14,
                          fontWeight: 600,
                        }}
                      >
                        {formatPlatformLabel(platform, record.platformDates)}
                      </span>
                    ))}
                  </div>
                </div>
                <div style={{ display: "grid", gap: 14, gridTemplateColumns: "minmax(0, 1fr) auto" }}>
                  <div style={{ padding: 14, borderRadius: 18, background: "rgba(255,255,255,0.56)", border: "1px solid rgba(232,214,195,0.88)" }}>
                    <CrossListedInventoryEditForm
                      sku={record.sku}
                      itemName={record.itemName}
                      platforms={record.platforms}
                      platformDates={record.platformDates}
                    />
                  </div>
                  <div style={{ display: "flex", alignItems: "start" }}>
                    <DeleteCrossListedInventoryForm recordId={record.id} />
                  </div>
                </div>
              </article>
            )) : (
              <p style={{ margin: 0, color: "var(--muted)" }}>
                {search ? "No cross-listed items matched that search." : "No cross-listed items saved yet."}
              </p>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}

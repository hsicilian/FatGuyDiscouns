const customerLinks = [
  { href: "/store", label: "Store" },
  { href: "/claims", label: "Claim" },
  { href: "/events", label: "Shows" },
  { href: "/account", label: "My Balance" },
  { href: "/account/history", label: "History" },
  { href: "/login", label: "Login" },
];

const adminLinks = [
  { href: "/admin", label: "Admin" },
  { href: "/admin/approvals", label: "Approvals" },
  { href: "/admin/inventory", label: "Inventory" },
  { href: "/admin/claims", label: "Claims" },
  { href: "/admin/payments", label: "Payments" },
  { href: "/admin/shipments", label: "Shipments" },
  { href: "/admin/customers", label: "Customers" },
  { href: "/admin/reports", label: "Reports" },
];

function NavGroup({ title, links }: { title: string; links: Array<{ href: string; label: string }> }) {
  return (
    <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
      <span style={{ color: "var(--muted)", fontSize: 14 }}>{title}</span>
      {links.map((link) => (
        <a key={link.href} href={link.href} style={{ padding: "10px 14px", borderRadius: 999, border: "1px solid var(--line)", background: "var(--panel)" }}>
          {link.label}
        </a>
      ))}
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <header style={{ position: "sticky", top: 0, zIndex: 20, backdropFilter: "blur(14px)", background: "rgba(247, 241, 232, 0.88)", borderBottom: "1px solid var(--line)" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "16px 24px", display: "grid", gap: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
            <a href="/" style={{ fontSize: 24, fontWeight: 700 }}>Fatguydiscounts</a>
            <NavGroup title="Customer" links={customerLinks} />
          </div>
          <NavGroup title="Operations" links={adminLinks} />
        </div>
      </header>
      {children}
    </div>
  );
}


import type { Metadata } from "next";
import { SignOutForm } from "../components/forms/sign-out-form";
import { getCurrentSessionAccount } from "../lib/auth/session";
import "./globals.css";

export const metadata: Metadata = {
  title: "Fatguydiscounts",
  description: "Claim-based live-sale platform for customers and admins.",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const currentUser = await getCurrentSessionAccount();
  const navLinks = [
    { href: "/", label: "Home" },
    { href: "/store", label: "Store" },
    { href: "/events", label: "Events" },
    ...(currentUser
      ? [{ href: "/account", label: currentUser.role === "customer" ? "Account" : "Dashboard" }]
      : [{ href: "/login", label: "Login" }, { href: "/signup", label: "Sign Up" }]),
    ...((currentUser?.role === "admin" || currentUser?.role === "master_admin") ? [{ href: "/admin", label: "Admin" }] : []),
    ...(currentUser?.role === "customer" ? [{ href: "/claims", label: "Claims" }] : []),
  ];

  return (
    <html lang="en">
      <body>
        <div>
          <header
            className="site-header"
            style={{
              position: "sticky",
              top: 0,
              zIndex: 20,
              backdropFilter: "blur(16px)",
              background: "rgba(255, 249, 242, 0.92)",
              borderBottom: "1px solid rgba(219, 198, 174, 0.8)",
            }}
          >
            <div style={{ maxWidth: 1240, margin: "0 auto", padding: "16px 24px", display: "grid", gap: 14 }}>
              <div className="site-header-bar" style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
                <div className="site-brand" style={{ display: "grid", gap: 2 }}>
                  <a href="/" style={{ fontSize: 24, fontWeight: 800, letterSpacing: "-0.04em" }}>
                    Fatguydiscounts
                  </a>
                  <span style={{ color: "var(--muted)", fontSize: 13 }}>Claim-first deals for repeat shoppers</span>
                </div>
                {currentUser ? (
                  <div className="site-header-actions" style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", justifyContent: "flex-end" }}>
                    <div style={{ padding: "10px 14px", borderRadius: 999, border: "1px solid var(--line)", background: "var(--panel)" }}>
                      <strong>{currentUser.displayName}</strong>
                      <span style={{ color: "var(--muted)" }}> | {currentUser.role.replaceAll("_", " ")}</span>
                    </div>
                    <SignOutForm />
                  </div>
                ) : (
                  <div className="site-header-actions" style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <a href="/login" style={{ padding: "10px 16px", borderRadius: 999, border: "1px solid var(--line)", background: "rgba(255,255,255,0.76)", fontWeight: 700 }}>
                      Sign In
                    </a>
                    <a href="/signup" style={{ padding: "10px 16px", borderRadius: 999, border: "1px solid var(--line)", background: "#bb4d00", color: "#fff", fontWeight: 700, boxShadow: "0 12px 24px rgba(187, 77, 0, 0.18)" }}>
                      Create Account
                    </a>
                  </div>
                )}
              </div>
              <nav className="site-nav" style={{ display: "flex", gap: 18, flexWrap: "wrap", alignItems: "center" }}>
                {navLinks.map((link) => (
                  <a key={link.href} href={link.href} style={{ color: "#5c5247", fontWeight: 700 }}>
                    {link.label}
                  </a>
                ))}
              </nav>
            </div>
          </header>
          {children}
        </div>
      </body>
    </html>
  );
}

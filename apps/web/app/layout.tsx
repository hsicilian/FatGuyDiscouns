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
      ? [{ href: currentUser.role === "customer" ? "/account" : "/admin", label: currentUser.role === "customer" ? "Account" : "Dashboard" }]
      : [{ href: "/login", label: "Login" }, { href: "/signup", label: "Sign Up" }]),
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
              background: "rgba(255, 248, 241, 0.94)",
              borderBottom: "1px solid var(--line)",
            }}
          >
            <div style={{ maxWidth: 1240, margin: "0 auto", padding: "16px 24px", display: "grid", gap: 14 }}>
              <div className="site-header-bar" style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
                <div className="site-brand" style={{ display: "grid", gap: 2 }}>
                  <a
                    href="/"
                    style={{
                      fontSize: 24,
                      fontWeight: 900,
                      letterSpacing: "-0.04em",
                      color: "var(--berry)",
                    }}
                  >
                    Fatguydiscounts
                  </a>
                  <span style={{ color: "var(--muted)", fontSize: 13 }}>Claim-first deals for repeat shoppers</span>
                </div>
                {currentUser ? (
                  <div className="site-header-actions" style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", justifyContent: "flex-end" }}>
                    <div
                      style={{
                        padding: "10px 14px",
                        borderRadius: 999,
                        border: "1px solid var(--line)",
                        background: "linear-gradient(135deg, rgba(255,255,255,0.92) 0%, rgba(255, 240, 228, 0.88) 100%)",
                        boxShadow: "var(--shadow-soft)",
                      }}
                    >
                      <strong>{currentUser.displayName}</strong>
                      <span style={{ color: "var(--muted)" }}> | {currentUser.role.replaceAll("_", " ")}</span>
                    </div>
                    <SignOutForm />
                  </div>
                ) : (
                  <div className="site-header-actions" style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <a
                      href="/login"
                      style={{
                        padding: "10px 16px",
                        borderRadius: 999,
                        border: "1px solid var(--line)",
                        background: "linear-gradient(135deg, rgba(255,255,255,0.88) 0%, rgba(229, 251, 245, 0.86) 100%)",
                        fontWeight: 700,
                        boxShadow: "var(--shadow-soft)",
                      }}
                    >
                      Sign In
                    </a>
                    <a
                      href="/signup"
                      style={{
                        padding: "10px 16px",
                        borderRadius: 999,
                        border: "1px solid rgba(255, 126, 102, 0.46)",
                        background: "linear-gradient(135deg, var(--accent) 0%, var(--accent-strong) 52%, #ffb04f 100%)",
                        color: "#fff",
                        fontWeight: 700,
                        boxShadow: "0 16px 28px rgba(240, 95, 87, 0.28)",
                      }}
                    >
                      Create Account
                    </a>
                  </div>
                )}
              </div>
              <nav className="site-nav site-nav-desktop" style={{ display: "flex", gap: 18, flexWrap: "wrap", alignItems: "center" }}>
                {navLinks.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    style={{
                      color: "var(--berry)",
                      fontWeight: 800,
                    }}
                  >
                    {link.label}
                  </a>
                ))}
              </nav>
              <details className="mobile-nav-menu">
                <summary>Menu</summary>
                <nav className="site-nav-mobile">
                  {navLinks.map((link) => (
                    <a key={link.href} href={link.href}>
                      {link.label}
                    </a>
                  ))}
                </nav>
              </details>
            </div>
          </header>
          {children}
        </div>
      </body>
    </html>
  );
}

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
            style={{
              position: "sticky",
              top: 0,
              zIndex: 20,
              backdropFilter: "blur(14px)",
              background: "rgba(247, 241, 232, 0.92)",
              borderBottom: "1px solid var(--line)",
            }}
          >
            <div style={{ maxWidth: 1200, margin: "0 auto", padding: "16px 24px", display: "grid", gap: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
                <a href="/" style={{ fontSize: 24, fontWeight: 700 }}>
                  Fatguydiscounts
                </a>
                {currentUser ? (
                  <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", justifyContent: "flex-end" }}>
                    <div style={{ padding: "10px 14px", borderRadius: 999, border: "1px solid var(--line)", background: "var(--panel)" }}>
                      <strong>{currentUser.displayName}</strong>
                      <span style={{ color: "var(--muted)" }}> | {currentUser.role.replaceAll("_", " ")}</span>
                    </div>
                    <SignOutForm />
                  </div>
                ) : (
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <a href="/login" style={{ padding: "10px 14px", borderRadius: 999, border: "1px solid var(--line)", background: "var(--panel)", fontWeight: 600 }}>
                      Sign In
                    </a>
                    <a href="/signup" style={{ padding: "10px 14px", borderRadius: 999, border: "1px solid var(--line)", background: "#bb4d00", color: "#fff", fontWeight: 600 }}>
                      Create Account
                    </a>
                  </div>
                )}
              </div>
              <nav style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                {navLinks.map((link) => (
                  <a key={link.href} href={link.href} style={{ color: "#5c5247", fontWeight: 600 }}>
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
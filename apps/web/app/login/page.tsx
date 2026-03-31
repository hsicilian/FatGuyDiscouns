import { LoginForm } from "../../components/forms/login-form";
import { SignOutForm } from "../../components/forms/sign-out-form";
import { getCurrentSessionAccount } from "../../lib/auth/session";

export default async function LoginPage() {
  const currentUser = await getCurrentSessionAccount();

  return (
    <main style={{ maxWidth: 1040, margin: "0 auto", padding: "56px 24px 72px" }}>
      <section style={{ background: "linear-gradient(145deg, rgba(255, 249, 241, 0.95) 0%, rgba(246, 229, 209, 0.92) 100%)", border: "1px solid var(--line)", borderRadius: 30, padding: 28, boxShadow: "var(--shadow)", marginBottom: 24 }}>
        <p style={{ textTransform: "uppercase", letterSpacing: "0.14em", fontSize: 12, color: "var(--accent-strong)", marginTop: 0, fontWeight: 700 }}>Sign in</p>
        <h1 style={{ margin: "0 0 12px" }}>Access your customer account</h1>
        <p style={{ color: "var(--muted)", lineHeight: 1.7, maxWidth: 760, marginBottom: 0 }}>
          Sign in to view your balance, check invoice history, request shipments, and claim items once your account is approved.
        </p>
      </section>

      <div style={{ display: "grid", gap: 24, gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}>
        <section style={{ background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 26, padding: 28, boxShadow: "var(--shadow)", backdropFilter: "blur(14px)" }}>
          <h2 style={{ marginTop: 0 }}>{currentUser ? "You are already signed in" : "Welcome back"}</h2>
          <p style={{ color: "var(--muted)", lineHeight: 1.7 }}>
            Signing in unlocks your account tools, customer approval status, and claim access once you are approved.
          </p>
          {currentUser ? (
            <div style={{ display: "grid", gap: 14, marginTop: 20 }}>
              <div style={{ padding: 16, borderRadius: 18, background: "rgba(255,255,255,0.56)", border: "1px solid rgba(232,214,195,0.88)" }}>
                <p style={{ marginTop: 0, color: "var(--muted)" }}>Signed in as</p>
                <strong>{currentUser.displayName}</strong>
                <p style={{ margin: "6px 0 0", color: "var(--muted)" }}>{currentUser.email}</p>
              </div>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
                <a href={currentUser.role === "customer" ? "/account" : "/admin"} style={{ color: "var(--accent-strong)", fontWeight: 700 }}>
                  Continue to {currentUser.role === "customer" ? "my account" : "admin"}
                </a>
                <SignOutForm />
              </div>
            </div>
          ) : (
            <LoginForm />
          )}
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 18 }}>
            <a href="/signup" style={{ color: "var(--accent-strong)", fontWeight: 700 }}>Create account</a>
            <a href="/forgot-password" style={{ color: "var(--accent-strong)", fontWeight: 700 }}>Forgot password?</a>
          </div>
        </section>

        <aside style={{ background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 26, padding: 28, boxShadow: "var(--shadow)", backdropFilter: "blur(14px)" }}>
          <p style={{ marginTop: 0, color: "var(--accent-strong)", textTransform: "uppercase", letterSpacing: "0.1em", fontSize: 12, fontWeight: 700 }}>Before you claim</p>
          <h2 style={{ marginTop: 0 }}>What to expect</h2>
          <div style={{ display: "grid", gap: 12, color: "var(--muted)", lineHeight: 1.7 }}>
            <p style={{ margin: 0 }}>New accounts enter a short approval step before claims are enabled.</p>
            <p style={{ margin: 0 }}>Once approved, you can claim items, track balances, and request shipment from your dashboard.</p>
            <p style={{ margin: 0 }}>If your account is disabled or banned, claim access stays blocked until the admin team updates it.</p>
          </div>
        </aside>
      </div>
    </main>
  );
}

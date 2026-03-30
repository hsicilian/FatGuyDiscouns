import { LoginForm } from "../../components/forms/login-form";
import { SignOutForm } from "../../components/forms/sign-out-form";
import { getCurrentSessionAccount } from "../../lib/auth/session";
import { hasSupabaseEnv } from "../../lib/supabase";

export default async function LoginPage() {
  const currentUser = await getCurrentSessionAccount();
  const productionAuth = hasSupabaseEnv();

  return (
    <main style={{ maxWidth: 1040, margin: "0 auto", padding: "56px 24px 72px" }}>
      <section style={{ background: "linear-gradient(145deg, rgba(255, 249, 241, 0.95) 0%, rgba(246, 229, 209, 0.92) 100%)", border: "1px solid var(--line)", borderRadius: 30, padding: 28, boxShadow: "var(--shadow)", marginBottom: 24 }}>
        <p style={{ textTransform: "uppercase", letterSpacing: "0.14em", fontSize: 12, color: "var(--accent-strong)", marginTop: 0 }}>Sign-in desk</p>
        <h1 style={{ margin: "0 0 12px" }}>Sign in to claim live-sale items</h1>
        <p style={{ color: "var(--muted)", lineHeight: 1.7, maxWidth: 760, marginBottom: 0 }}>
          {productionAuth
            ? "The public-ready web app now uses Supabase Auth for signup, login, email verification, and password recovery while preserving the existing approval-gated claim workflow."
            : "The beta fallback auth path is still available locally until Supabase environment variables are configured."}
        </p>
      </section>

      <div style={{ display: "grid", gap: 24, gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}>
        <section style={{ background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 26, padding: 28, boxShadow: "var(--shadow)", backdropFilter: "blur(14px)" }}>
          <h2 style={{ marginTop: 0 }}>{productionAuth ? "Secure account sign-in" : "Local account sign-in"}</h2>
          <p style={{ color: "var(--muted)", lineHeight: 1.7 }}>
            Visitors can browse before login. Approved customer accounts can claim immediately, while pending, disabled, or banned states are enforced after sign-in.
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
                  Continue to {currentUser.role === "customer" ? "account" : "admin"}
                </a>
                <SignOutForm />
              </div>
            </div>
          ) : (
            <LoginForm />
          )}
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 18 }}>
            <a href="/store" style={{ color: "var(--accent-strong)", fontWeight: 700 }}>Browse as guest</a>
            <a href="/signup" style={{ color: "var(--accent-strong)", fontWeight: 700 }}>Create an account</a>
            <a href="/forgot-password" style={{ color: "var(--accent-strong)", fontWeight: 700 }}>Forgot password?</a>
          </div>
        </section>

        <aside style={{ background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 26, padding: 28, boxShadow: "var(--shadow)", backdropFilter: "blur(14px)" }}>
          <p style={{ marginTop: 0, color: "var(--accent-strong)", textTransform: "uppercase", letterSpacing: "0.1em", fontSize: 12 }}>Launch notes</p>
          <h2 style={{ marginTop: 0 }}>Auth expectations</h2>
          <div style={{ display: "grid", gap: 12, color: "var(--muted)", lineHeight: 1.7 }}>
            <p style={{ margin: 0 }}>New signups create a customer account in `pending_approval`.</p>
            <p style={{ margin: 0 }}>Email verification should complete before the first real sign-in when Supabase auth is active.</p>
            <p style={{ margin: 0 }}>Approved customers can claim. Disabled or banned customers are blocked by server-side checks.</p>
            <p style={{ margin: 0 }}>Admins and master admin keep their existing dashboard access, and only master admin can access financial reports.</p>
          </div>
        </aside>
      </div>
    </main>
  );
}

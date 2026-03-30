import { SignupForm } from "../../components/forms/signup-form";
import { hasSupabaseEnv } from "../../lib/supabase";

export default function SignupPage() {
  const productionAuth = hasSupabaseEnv();

  return (
    <main style={{ maxWidth: 880, margin: "0 auto", padding: "56px 24px 72px" }}>
      <section style={{ background: "linear-gradient(145deg, rgba(255, 249, 241, 0.95) 0%, rgba(246, 229, 209, 0.92) 100%)", border: "1px solid var(--line)", borderRadius: 30, padding: 28, boxShadow: "var(--shadow)", marginBottom: 24 }}>
        <p style={{ textTransform: "uppercase", letterSpacing: "0.14em", fontSize: 12, color: "var(--accent-strong)", marginTop: 0 }}>Customer signup</p>
        <h1 style={{ margin: "0 0 12px" }}>Create your account</h1>
        <p style={{ color: "var(--muted)", lineHeight: 1.7, maxWidth: 720, marginBottom: 0 }}>
          New customers can register here, land in the admin approval queue, and keep the existing approval-gated claim workflow. {productionAuth ? "The production path uses Supabase Auth email verification before first login." : "The local beta fallback still works until Supabase env vars are configured."}
        </p>
      </section>

      <section style={{ background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 26, padding: 28, boxShadow: "var(--shadow)", backdropFilter: "blur(14px)" }}>
        <h2 style={{ marginTop: 0 }}>Pending approval onboarding</h2>
        <p style={{ color: "var(--muted)", lineHeight: 1.7 }}>
          After signup, the account is marked as pending approval. Customers can sign in after verification, update their profile, and wait for an admin to approve claiming.
        </p>
        <SignupForm />
      </section>
    </main>
  );
}

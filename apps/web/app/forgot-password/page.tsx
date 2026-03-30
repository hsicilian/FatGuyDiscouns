import { ForgotPasswordForm } from "../../components/forms/forgot-password-form";

export default function ForgotPasswordPage() {
  return (
    <main style={{ maxWidth: 760, margin: "0 auto", padding: "56px 24px 72px" }}>
      <section style={{ background: "linear-gradient(145deg, rgba(255, 249, 241, 0.95) 0%, rgba(246, 229, 209, 0.92) 100%)", border: "1px solid var(--line)", borderRadius: 30, padding: 28, boxShadow: "var(--shadow)", marginBottom: 24 }}>
        <p style={{ textTransform: "uppercase", letterSpacing: "0.14em", fontSize: 12, color: "var(--accent-strong)", marginTop: 0 }}>Account recovery</p>
        <h1 style={{ margin: "0 0 12px" }}>Reset your password</h1>
        <p style={{ color: "var(--muted)", lineHeight: 1.7, maxWidth: 640, marginBottom: 0 }}>
          Enter the email for your customer or staff account and we will send a secure reset link.
        </p>
      </section>

      <section style={{ background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 26, padding: 28, boxShadow: "var(--shadow)", backdropFilter: "blur(14px)" }}>
        <h2 style={{ marginTop: 0 }}>Password reset email</h2>
        <p style={{ color: "var(--muted)", lineHeight: 1.7 }}>
          Use the same email address you use to log in. For public launch, this route is backed by Supabase Auth when the production environment variables are configured.
        </p>
        <ForgotPasswordForm />
      </section>
    </main>
  );
}

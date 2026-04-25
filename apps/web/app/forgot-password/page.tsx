import { ForgotPasswordForm } from "../../components/forms/forgot-password-form";
import { ResendConfirmationForm } from "../../components/forms/resend-confirmation-form";

export default function ForgotPasswordPage() {
  return (
    <main style={{ maxWidth: 760, margin: "0 auto", padding: "56px 24px 72px" }}>
      <section style={{ background: "linear-gradient(145deg, rgba(255, 249, 241, 0.95) 0%, rgba(246, 229, 209, 0.92) 100%)", border: "1px solid var(--line)", borderRadius: 30, padding: 28, boxShadow: "var(--shadow)", marginBottom: 24 }}>
        <p style={{ textTransform: "uppercase", letterSpacing: "0.14em", fontSize: 12, color: "var(--accent-strong)", marginTop: 0, fontWeight: 700 }}>Password help</p>
        <h1 style={{ margin: "0 0 12px" }}>Reset your password</h1>
        <p style={{ color: "var(--muted)", lineHeight: 1.7, maxWidth: 640, marginBottom: 0 }}>
          Enter the email address on your account and we will send you a secure password reset link.
        </p>
      </section>

      <div style={{ display: "grid", gap: 24, gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}>
        <section style={{ background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 26, padding: 28, boxShadow: "var(--shadow)", backdropFilter: "blur(14px)" }}>
          <h2 style={{ marginTop: 0 }}>Send reset email</h2>
          <p style={{ color: "var(--muted)", lineHeight: 1.7 }}>
            Use the same email you use to sign in to Fatguydiscounts.
          </p>
          <ForgotPasswordForm />
        </section>

        <section style={{ background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 26, padding: 28, boxShadow: "var(--shadow)", backdropFilter: "blur(14px)" }}>
          <h2 style={{ marginTop: 0 }}>Never got the first email?</h2>
          <p style={{ color: "var(--muted)", lineHeight: 1.7 }}>
            If the account was created but never confirmed, resend the signup confirmation email here instead of doing a password reset.
          </p>
          <ResendConfirmationForm />
        </section>
      </div>
    </main>
  );
}

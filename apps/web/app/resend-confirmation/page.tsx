import { ResendConfirmationForm } from "../../components/forms/resend-confirmation-form";

export default function ResendConfirmationPage() {
  return (
    <main style={{ maxWidth: 760, margin: "0 auto", padding: "56px 24px 72px" }}>
      <section style={{ background: "linear-gradient(145deg, rgba(255, 249, 241, 0.95) 0%, rgba(246, 229, 209, 0.92) 100%)", border: "1px solid var(--line)", borderRadius: 30, padding: 28, boxShadow: "var(--shadow)", marginBottom: 24 }}>
        <p style={{ textTransform: "uppercase", letterSpacing: "0.14em", fontSize: 12, color: "var(--accent-strong)", marginTop: 0, fontWeight: 700 }}>Email confirmation</p>
        <h1 style={{ margin: "0 0 12px" }}>Resend your confirmation email</h1>
        <p style={{ color: "var(--muted)", lineHeight: 1.7, maxWidth: 640, marginBottom: 0 }}>
          If you created an account but never got the confirmation email, enter the same email address here and we will resend it.
        </p>
      </section>

      <section style={{ background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 26, padding: 28, boxShadow: "var(--shadow)", backdropFilter: "blur(14px)" }}>
        <h2 style={{ marginTop: 0 }}>Send confirmation again</h2>
        <p style={{ color: "var(--muted)", lineHeight: 1.7 }}>
          Use this if your account is stuck before first sign-in. If you already signed in before, use password reset instead.
        </p>
        <ResendConfirmationForm />
      </section>
    </main>
  );
}

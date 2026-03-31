import { SignupForm } from "../../components/forms/signup-form";

export default function SignupPage() {
  return (
    <main style={{ maxWidth: 880, margin: "0 auto", padding: "56px 24px 72px" }}>
      <section style={{ background: "linear-gradient(145deg, rgba(255, 249, 241, 0.95) 0%, rgba(246, 229, 209, 0.92) 100%)", border: "1px solid var(--line)", borderRadius: 30, padding: 28, boxShadow: "var(--shadow)", marginBottom: 24 }}>
        <p style={{ textTransform: "uppercase", letterSpacing: "0.14em", fontSize: 12, color: "var(--accent-strong)", marginTop: 0, fontWeight: 700 }}>Create account</p>
        <h1 style={{ margin: "0 0 12px" }}>Join Fatguydiscounts</h1>
        <p style={{ color: "var(--muted)", lineHeight: 1.7, maxWidth: 720, marginBottom: 0 }}>
          Set up your customer account to track claims, balances, invoices, and shipment requests in one place.
        </p>
      </section>

      <section style={{ background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 26, padding: 28, boxShadow: "var(--shadow)", backdropFilter: "blur(14px)" }}>
        <h2 style={{ marginTop: 0 }}>New customer signup</h2>
        <p style={{ color: "var(--muted)", lineHeight: 1.7 }}>
          After signup, your account will be created and wait for manual approval before you can claim items.
        </p>
        <SignupForm />
      </section>
    </main>
  );
}

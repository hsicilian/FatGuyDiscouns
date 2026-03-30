import { ResetPasswordForm } from "../../components/forms/reset-password-form";
import { getCurrentSessionAccount } from "../../lib/auth/session";

export default async function ResetPasswordPage() {
  const currentUser = await getCurrentSessionAccount();

  return (
    <main style={{ maxWidth: 760, margin: "0 auto", padding: "56px 24px 72px" }}>
      <section style={{ background: "linear-gradient(145deg, rgba(255, 249, 241, 0.95) 0%, rgba(246, 229, 209, 0.92) 100%)", border: "1px solid var(--line)", borderRadius: 30, padding: 28, boxShadow: "var(--shadow)", marginBottom: 24 }}>
        <p style={{ textTransform: "uppercase", letterSpacing: "0.14em", fontSize: 12, color: "var(--accent-strong)", marginTop: 0 }}>Secure reset</p>
        <h1 style={{ margin: "0 0 12px" }}>Choose a new password</h1>
        <p style={{ color: "var(--muted)", lineHeight: 1.7, maxWidth: 640, marginBottom: 0 }}>
          {currentUser
            ? `Updating password for ${currentUser.email}.`
            : "Open this page from the password reset email so the secure recovery session is attached."}
        </p>
      </section>

      <section style={{ background: "var(--panel)", border: "1px solid var(--line)", borderRadius: 26, padding: 28, boxShadow: "var(--shadow)", backdropFilter: "blur(14px)" }}>
        <h2 style={{ marginTop: 0 }}>New password</h2>
        <p style={{ color: "var(--muted)", lineHeight: 1.7 }}>
          Use at least 8 characters. After the password is updated, you can continue with the recovery session or return to the login page.
        </p>
        <ResetPasswordForm />
      </section>
    </main>
  );
}

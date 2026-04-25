export default function SupabaseRequiredPage() {
  return (
    <main style={{ maxWidth: 760, margin: "0 auto", padding: "56px 24px 72px" }}>
      <section style={{ background: "linear-gradient(145deg, rgba(255, 249, 241, 0.95) 0%, rgba(246, 229, 209, 0.92) 100%)", border: "1px solid var(--line)", borderRadius: 30, padding: 28, boxShadow: "var(--shadow)" }}>
        <p style={{ textTransform: "uppercase", letterSpacing: "0.14em", fontSize: 12, color: "var(--accent-strong)", marginTop: 0, fontWeight: 700 }}>Service unavailable</p>
        <h1 style={{ margin: "0 0 12px" }}>The website is temporarily unavailable.</h1>
        <p style={{ color: "var(--muted)", lineHeight: 1.7, marginBottom: 12 }}>
          Fat Guy Discounts requires a live Supabase connection and won&apos;t switch to demo or placeholder customer data.
        </p>
        <p style={{ color: "var(--muted)", lineHeight: 1.7, marginBottom: 0 }}>
          Please try again shortly. If you run the site locally, make sure the Supabase environment variables are configured before starting the app.
        </p>
      </section>
    </main>
  );
}

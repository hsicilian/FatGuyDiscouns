import { hasSupabaseEnv, isProductionRuntime } from "../../../lib/supabase";

export async function GET() {
  const supabaseConfigured = hasSupabaseEnv();
  const healthy = !isProductionRuntime() || supabaseConfigured;

  return Response.json(
    {
      ok: healthy,
      service: "fatguydiscounts-web",
      mode: "supabase",
      supabaseConfigured,
      timestamp: new Date().toISOString(),
    },
    { status: healthy ? 200 : 503 },
  );
}

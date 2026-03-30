import { createClient } from "@supabase/supabase-js";

function requireEnv(name: string, value: string | undefined) {
  if (!value) {
    throw new Error(`${name} is missing.`);
  }

  return value;
}

export function createMobileSupabaseClient() {
  const url = requireEnv("EXPO_PUBLIC_SUPABASE_URL", process.env.EXPO_PUBLIC_SUPABASE_URL);
  const key = requireEnv("EXPO_PUBLIC_SUPABASE_ANON_KEY", process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY);

  return createClient(url, key);
}


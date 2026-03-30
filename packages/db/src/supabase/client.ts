import { createClient } from "@supabase/supabase-js";

export function createSharedSupabaseClient(url: string, key: string) {
  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}


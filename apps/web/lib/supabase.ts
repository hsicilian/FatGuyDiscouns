import { createBrowserClient, createServerClient, type CookieOptions } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";

function requireEnv(name: string, value: string | undefined) {
  if (!value) {
    throw new Error(`${name} is missing.`);
  }

  return value;
}

export function hasSupabaseEnv() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

export function isProductionRuntime() {
  return process.env.NODE_ENV === "production";
}

function isProductionBuildPhase() {
  return process.env.NEXT_PHASE === "phase-production-build";
}

export function assertProductionSupabaseReady() {
  if (isProductionRuntime() && !isProductionBuildPhase() && !hasSupabaseEnv()) {
    throw new Error("Supabase environment variables are required in production.");
  }
}

export function getSiteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL ?? process.env.SITE_URL ?? "http://localhost:3000";
}

export function getProductImagesBucket() {
  return process.env.SUPABASE_PRODUCT_IMAGES_BUCKET ?? "product-images";
}

export function normalizeInternalRedirect(input: string | null | undefined, fallback = "/account") {
  if (!input) {
    return fallback;
  }

  if (!input.startsWith("/") || input.startsWith("//")) {
    return fallback;
  }

  return input;
}

function getSupabaseUrl() {
  return requireEnv("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL);
}

function getSupabaseAnonKey() {
  return requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

function getSupabaseServiceRoleKey() {
  return requireEnv("SUPABASE_SERVICE_ROLE_KEY", process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export function createBrowserSupabaseClient() {
  assertProductionSupabaseReady();
  return createBrowserClient(getSupabaseUrl(), getSupabaseAnonKey());
}

export async function createServerSupabaseClient() {
  assertProductionSupabaseReady();
  const cookieStore = await cookies();

  return createServerClient(getSupabaseUrl(), getSupabaseAnonKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Server Components cannot always write cookies during render.
        }
      },
    },
  });
}

export function createSupabaseAdminClient() {
  assertProductionSupabaseReady();
  return createClient(getSupabaseUrl(), getSupabaseServiceRoleKey(), {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

function applyCookies(response: NextResponse, cookiesToSet: Array<{ name: string; value: string; options?: CookieOptions }>) {
  cookiesToSet.forEach(({ name, value, options }) => {
    response.cookies.set(name, value, options);
  });
}

export async function updateSupabaseSession(request: NextRequest) {
  assertProductionSupabaseReady();
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(getSupabaseUrl(), getSupabaseAnonKey(), {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({
          request: {
            headers: request.headers,
          },
        });
        applyCookies(response, cookiesToSet);
      },
    },
  });

  await supabase.auth.getUser();
  return response;
}

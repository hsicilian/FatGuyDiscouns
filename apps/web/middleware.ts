import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { hasSupabaseEnv, isProductionRuntime, updateSupabaseSession } from "./lib/supabase";

export async function middleware(request: NextRequest) {
  if (hasSupabaseEnv()) {
    return updateSupabaseSession(request);
  }

  if (isProductionRuntime()) {
    return NextResponse.rewrite(new URL("/supabase-required", request.url));
  }

  return NextResponse.rewrite(new URL("/supabase-required", request.url));
}

export const config = {
  // Every page renders an authenticated layout, including Home and Store.
  // Refresh in middleware so rotated cookies reach both render and browser.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|sw\\.js|manifest\\.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};

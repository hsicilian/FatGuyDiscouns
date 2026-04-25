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
  matcher: ["/account/:path*", "/claims/:path*", "/admin/:path*", "/login", "/signup", "/auth/:path*", "/forgot-password", "/reset-password", "/resend-confirmation"],
};

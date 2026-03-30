import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { hasSupabaseEnv, isProductionRuntime, updateSupabaseSession } from "./lib/supabase";

const protectedPrefixes = ["/account", "/claims", "/admin"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (hasSupabaseEnv()) {
    return updateSupabaseSession(request);
  }

  if (isProductionRuntime()) {
    return NextResponse.json(
      {
        ok: false,
        error: "Supabase environment variables are required in production.",
      },
      { status: 503 },
    );
  }

  if (protectedPrefixes.some((prefix) => pathname.startsWith(prefix))) {
    const response = NextResponse.next();
    response.headers.set("x-fatguydiscounts-auth", "required");
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/account/:path*", "/claims/:path*", "/admin/:path*", "/login", "/signup", "/auth/:path*", "/forgot-password", "/reset-password"],
};

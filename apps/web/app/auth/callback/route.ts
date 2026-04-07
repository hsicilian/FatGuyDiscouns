import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { NextRequest } from "next/server";
import { createSupabaseAdminClient, getSiteUrl, normalizeInternalRedirect } from "../../../lib/supabase";
import { sendAdminEmailNotification } from "../../../lib/admin-email";

function requireEnv(name: string, value: string | undefined) {
  if (!value) {
    throw new Error(`${name} is missing.`);
  }

  return value;
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = normalizeInternalRedirect(requestUrl.searchParams.get("next"), "/account");
  const publicSiteUrl = getSiteUrl().replace(/\/$/, "");

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return NextResponse.redirect(new URL("/login", publicSiteUrl));
  }

  let response = NextResponse.redirect(new URL(next, publicSiteUrl));
  const supabase = createServerClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL),
    requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(error.message)}`, publicSiteUrl));
    }

    const user = data.user;
    if (user?.id) {
      const admin = createSupabaseAdminClient();
      const { data: existingNotification } = await admin
        .from("notifications")
        .select("id")
        .eq("type", "pending_approval")
        .eq("customer_id", user.id)
        .is("read_at", null)
        .maybeSingle();

      if (!existingNotification) {
        const displayName = typeof user.user_metadata?.display_name === "string" && user.user_metadata.display_name.trim().length > 0
          ? user.user_metadata.display_name.trim()
          : (user.email?.split("@")[0] ?? "New customer");

        await admin.from("notifications").insert({
          type: "pending_approval",
          customer_id: user.id,
          payload: {
            label: `${displayName} is waiting for account approval.`,
            email: user.email ?? null,
          },
        });
        try {
          await sendAdminEmailNotification({
            subject: "Account approval needed",
            text: `${displayName} confirmed an email and is waiting for account approval.\nEmail: ${user.email ?? "unknown"}`,
          });
        } catch {
          // Keep the in-app approval queue even if email delivery fails.
        }
      }
    }
  }

  return response;
}

import { NextRequest, NextResponse } from "next/server";
import { getCurrentSessionUser } from "../../../../lib/auth/session";
import { deleteInboxNotification, listInbox } from "../../../../lib/push/inbox";
import { readPushBody, trustedPushRequest } from "../../../../lib/push/request-policy";
export const dynamic = "force-dynamic";
const reply = (data: unknown, status = 200) => NextResponse.json(data, { status, headers: { "Cache-Control": "no-store" } });
export async function GET(request: NextRequest) {
  const actor = await getCurrentSessionUser();
  if (!actor || actor.role !== "customer" || actor.accountState === "banned") return reply({ error: "Customer sign-in required." }, 403);
  try { return reply({ notifications: await listInbox(actor, Number(request.nextUrl.searchParams.get("page") ?? 0)) }); }
  catch { return reply({ error: "Notifications are temporarily unavailable." }, 400); }
}
export async function POST(request: NextRequest) {
  const canonical = process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || request.url;
  if (!trustedPushRequest(request.headers.get("origin"), request.headers.get("content-type"), canonical)) return reply({ error: "Invalid request origin." }, 403);
  const actor = await getCurrentSessionUser();
  if (!actor || actor.role !== "customer" || actor.accountState === "banned") return reply({ error: "Customer sign-in required." }, 403);
  try {
    const input = await readPushBody(request);
    if (input.op !== "delete") return reply({ error: "Unknown action." }, 400);
    await deleteInboxNotification(actor, input.id);
    return reply({ ok: true });
  } catch { return reply({ error: "Could not delete this notification. Please try again." }, 400); }
}

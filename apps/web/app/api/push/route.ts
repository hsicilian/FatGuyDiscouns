import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getCurrentSessionUser } from "../../../lib/auth/session";
import { canManagePush } from "../../../lib/push/policy";
import { readPushBody, trustedPushRequest } from "../../../lib/push/request-policy";
import { confirm, reconcileDevice, deviceState, disableSubscription, dispatchBatch, preferences, preview, recentSends, registerSubscription, savePreferences, searchPushCustomers } from "../../../lib/push/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const reply = (data: unknown, status = 200) => NextResponse.json(data, { status, headers: { "Cache-Control": "no-store" } });
export async function GET() {
  if (process.env.PUSH_ENABLED !== "true") return reply({ enabled: false });
  const actor = await getCurrentSessionUser();
  if (!actor || actor.accountState === "banned") return reply({ error: "Sign in to manage notifications." }, 401);
  try {
    return reply({ enabled: true, userId: actor.id, publicKey: process.env.VAPID_PUBLIC_KEY ?? "", preferences: await preferences(actor.id),
      owner: canManagePush(actor), sendingEnabled: process.env.PUSH_SEND_ENABLED === "true",
      sends: canManagePush(actor) ? await recentSends() : [] });
  } catch { return reply({ error: "Notifications are temporarily unavailable." }, 503); }
}
export async function POST(request: NextRequest) {
  if (process.env.PUSH_ENABLED !== "true") return reply({ error: "Notifications are not enabled yet." }, 503);
  // Cookie-authenticated mutations require same-origin JSON, including behind Caddy.
  const canonical = process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || request.url;
  if (!trustedPushRequest(request.headers.get("origin"), request.headers.get("content-type"), canonical)) return reply({ error: "Invalid request origin." }, 403);
  const actor = await getCurrentSessionUser();
  if (!actor || actor.accountState === "banned") return reply({ error: "Sign in to manage notifications." }, 401);
  try {
    const input = await readPushBody(request);
    const jar = await cookies();
    if (["preview", "confirm", "process", "searchCustomers"].includes(input.op) && !canManagePush(actor)) return reply({ error: "Owner access required." }, 403);
    switch (input.op) {
      case "preferences":
        if (actor.role !== "customer") return reply({ error: "Customer preferences only." }, 403);
        await savePreferences(actor.id, input);
        return reply({ ok: true });
      case "subscribe": {
        const previous = jar.get("fgd-push-device")?.value;
        await reconcileDevice(actor.id, input.subscription, previous);
        const id = await registerSubscription(actor.id, input.subscription);
        if (previous && previous !== id) await disableSubscription(actor.id, previous);
        jar.set("fgd-push-device", id, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 31536000 });
        return reply({ ok: true });
      }
      case "reconcile": return reply(await reconcileDevice(actor.id, input.subscription, jar.get("fgd-push-device")?.value));
      case "device": return reply({ active: typeof input.endpoint === "string" && await deviceState(actor.id, input.endpoint) });
      case "unsubscribe":
        await disableSubscription(actor.id, jar.get("fgd-push-device")?.value, input.all === true);
        jar.delete("fgd-push-device");
        return reply({ ok: true });
      case "searchCustomers": return reply(await searchPushCustomers(actor, input.query));
      case "preview": return reply(await preview(actor, input));
      case "confirm": return reply(await confirm(actor, input.id, input.confirmed === true));
      case "process": return reply(await dispatchBatch(actor, input.id));
      default: return reply({ error: "Unknown notification action." }, 400);
    }
  } catch {
    // Never echo provider/database errors, endpoint URLs or subscription keys.
    return reply({ error: "Could not complete this action. Check your inputs and notification setup, refresh the preview, or review send history before retrying." }, 400);
  }
}

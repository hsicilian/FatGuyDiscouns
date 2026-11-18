import { redirect } from "next/navigation";
import { ensureCustomerAccess } from "../../../lib/auth/guards";
import { getCurrentSessionUser } from "../../../lib/auth/session";
import { listInbox } from "../../../lib/push/inbox";
import { InboxList } from "../../../components/push/inbox-list";
export const dynamic = "force-dynamic";
export default async function AccountNotificationsPage({ searchParams }: { searchParams?: Promise<{ page?: string }> }) {
  const user = await getCurrentSessionUser();
  if (!user) redirect("/login?redirectTo=%2Faccount%2Fnotifications");
  if (user.accountState !== "banned" && (user.role === "admin" || user.role === "master_admin")) {
    redirect("/admin/notifications");
  }
  await ensureCustomerAccess();
  const raw = (await searchParams)?.page;
  const page = raw && /^\d+$/.test(raw) && Number(raw) <= 100000 ? Number(raw) : 0;
  const notifications = await listInbox(user, page);
  return <main style={{ maxWidth: 900, margin: "0 auto", padding: "32px 20px 64px" }}>
    <a href="/account">Back to account</a>
    <h1>Notifications</h1>
    <p style={{ color: "var(--muted)", lineHeight: 1.6 }}>Your FGD announcements and payment reminders stay here until you delete them. Phone notifications are optional.</p>
    <InboxList notifications={notifications} />
    <nav aria-label="Notification pages" style={{ display: "flex", gap: 24, marginTop: 24 }}>
      {page > 0 && <a href={`/account/notifications?page=${page - 1}`}>Newer notifications</a>}
      {notifications.length === 50 && <a href={`/account/notifications?page=${page + 1}`}>Older notifications</a>}
    </nav>
  </main>;
}

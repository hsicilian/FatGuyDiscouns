import { ensureMasterAdminAccess } from "../../../lib/auth/guards";
import { AdminPush } from "../../../components/push/admin-push";
export default async function PushAdminPage() {
  await ensureMasterAdminAccess();
  return <main style={{ maxWidth: 1000, margin: "0 auto", padding: "36px 24px" }}>
    <a href="/admin/notifications">Back to notification history</a>
    <h1>Send Notifications</h1>
    <p>Owner tools for Sale Announcements and Payment Reminders. Choose the notification type below, then preview before confirming a send.</p>
    {process.env.PUSH_ENABLED === "true" ? <AdminPush /> : <p>Push notifications are not enabled yet.</p>}
  </main>;
}

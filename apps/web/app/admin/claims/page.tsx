import { redirect } from "next/navigation";
import { ensureAdminAccess } from "../../../lib/auth/guards";

export default async function AdminClaimsPage() {
  await ensureAdminAccess();
  redirect("/admin/customers");
}

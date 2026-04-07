import "server-only";

import type { AdminAuditEntry, UserRole } from "@fatguydiscounts/types";
import { getCurrentSessionUser } from "./auth/session";
import { getAdminClient } from "./data/supabase-helpers";

export async function recordAdminAuditEntry(input: {
  actionType: string;
  entityType: string;
  entityId?: string | null;
  targetCustomerId?: string | null;
  summary: string;
  actorId?: string;
  actorName?: string;
  actorRole?: UserRole;
}) {
  const actor = input.actorId && input.actorName && input.actorRole
    ? {
      id: input.actorId,
      name: input.actorName,
      role: input.actorRole,
    }
    : await getCurrentSessionUser().then((user) => (
      user
        ? { id: user.id, name: user.displayName, role: user.role }
        : null
    ));

  if (!actor || (actor.role !== "admin" && actor.role !== "master_admin")) {
    return { ok: false as const, message: "Admin actor required for audit logging." };
  }

  const admin = await getAdminClient();
  const { error } = await admin.from("admin_audit_log").insert({
    actor_id: actor.id,
    actor_name: actor.name,
    actor_role: actor.role,
    action_type: input.actionType,
    entity_type: input.entityType,
    entity_id: input.entityId ?? null,
    target_customer_id: input.targetCustomerId ?? null,
    summary: input.summary,
  });

  if (error) {
    return { ok: false as const, message: error.message };
  }

  return { ok: true as const };
}

export function toAdminAuditEntry(row: Record<string, any>): AdminAuditEntry {
  return {
    id: String(row.id),
    actorId: String(row.actor_id),
    actorName: String(row.actor_name ?? "Admin"),
    actorRole: (row.actor_role ?? "admin") as UserRole,
    actionType: String(row.action_type ?? "update"),
    entityType: String(row.entity_type ?? "record"),
    entityId: row.entity_id ? String(row.entity_id) : null,
    targetCustomerId: row.target_customer_id ? String(row.target_customer_id) : null,
    summary: String(row.summary ?? ""),
    createdAt: String(row.created_at ?? new Date().toISOString()),
  };
}

import { createAdminClient } from "@/lib/supabase/admin";

type WriteAdminAuditLogParams = {
  adminUserId: string;
  targetUserId?: string | null;
  action: string;
  details?: Record<string, unknown>;
};

export async function writeAdminAuditLog({
  adminUserId,
  targetUserId = null,
  action,
  details = {},
}: WriteAdminAuditLogParams) {
  const admin = createAdminClient();

  const { error } = await admin.from("admin_audit_log").insert({
    admin_user_id: adminUserId,
    target_user_id: targetUserId,
    action,
    details,
  });

  if (error) {
    console.error("Failed to write admin audit log", error);
  }
}
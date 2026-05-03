"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/admin/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";

const SYSTEM_GROUP_ID = process.env.SKYLTJAKTEN_SYSTEM_GROUP_ID!;
const DEFAULT_CHALLENGE_ID = process.env.SKYLTJAKTEN_DEFAULT_CHALLENGE_ID!;

type ImportRow = {
  target: string;
  foundAt: string;
};

function redirectWithStatus(
  userId: string,
  type: "message" | "error",
  code: string
): never {
  redirect(`/admin/users/${userId}/import?${type}=${encodeURIComponent(code)}`);
}

function isValidUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

function validateRows(rows: ImportRow[]) {
  if (!Array.isArray(rows)) {
    return "invalid_rows";
  }

  const normalized = rows.map((row) => ({
    target: String(row.target ?? "").trim(),
    foundAt: String(row.foundAt ?? "").trim(),
  }));

  const seen = new Set<string>();

  normalized.sort((a, b) => a.target.localeCompare(b.target));

  for (let i = 0; i < normalized.length; i++) {
    const row = normalized[i];
    const expected = String(i + 1).padStart(3, "0");

    if (!/^\d{3}$/.test(row.target)) {
      return "invalid_target";
    }

    if (row.target !== expected) {
      return "non_contiguous_targets";
    }

    if (seen.has(row.target)) {
      return "duplicate_target";
    }

    seen.add(row.target);

    const date = new Date(row.foundAt);

    if (Number.isNaN(date.getTime())) {
      return "invalid_date";
    }

    if (date.getTime() > Date.now() + 5 * 60 * 1000) {
      return "future_date";
    }

    if (i > 0) {
      const previousDate = new Date(normalized[i - 1].foundAt);

      if (date.getTime() < previousDate.getTime()) {
        return "dates_not_in_order";
      }
    }
  }

  return null;
}

export async function replaceUserSightings(formData: FormData) {
  const adminSession = await requireAdmin();

  const targetUserId = String(formData.get("targetUserId") ?? "");
  const rowsJson = String(formData.get("rowsJson") ?? "[]");

  if (!isValidUuid(targetUserId)) {
    redirect("/admin?error=invalid_user_id");
  }

  let rows: ImportRow[];

  try {
    rows = JSON.parse(rowsJson) as ImportRow[];
  } catch {
    redirectWithStatus(targetUserId, "error", "invalid_json");
  }

  const validationError = validateRows(rows);

  if (validationError) {
    redirectWithStatus(targetUserId, "error", validationError);
  }

  const admin = createAdminClient();

  const { data: targetProfile } = await admin
    .from("profiles")
    .select("id")
    .eq("id", targetUserId)
    .maybeSingle();

  if (!targetProfile) {
    redirect("/admin?error=user_not_found");
  }

  const { error } = await admin.rpc("admin_replace_user_sightings", {
    p_admin_user_id: adminSession.userId,
    p_target_user_id: targetUserId,
    p_challenge_id: DEFAULT_CHALLENGE_ID,
    p_group_id: SYSTEM_GROUP_ID,
    p_rows: rows,
  });

  if (error) {
    console.error("admin_replace_user_sightings failed", error);
    redirectWithStatus(targetUserId, "error", "replace_failed");
  }

  revalidatePath(`/admin/users/${targetUserId}`);
  revalidatePath(`/admin/users/${targetUserId}/import`);
  revalidatePath("/admin");

  redirect(`/admin/users/${targetUserId}?message=sightings_replaced`);
}
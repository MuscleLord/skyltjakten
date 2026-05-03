import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type AdminSession = {
  userId: string;
  username: string;
};

export async function requireAdmin(): Promise<AdminSession> {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims?.sub) {
    redirect("/login");
  }

  const userId = data.claims.sub;
  const admin = createAdminClient();

  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("id, username, role")
    .eq("id", userId)
    .maybeSingle();

  if (profileError || !profile || profile.role !== "admin") {
    redirect("/dashboard");
  }

  return {
    userId,
    username: profile.username,
  };
}
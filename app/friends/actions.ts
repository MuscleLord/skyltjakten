"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";


function redirectWithMessage(type: "message" | "error", code: string): never {
  redirect(`/friends?${type}=${encodeURIComponent(code)}`);
}


async function getCurrentUserId(): Promise<string> {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims?.sub) {
    redirect("/login");
  }

  return data.claims.sub;
}

function normalizeUsername(value: string): string {
  return value.trim().toLowerCase();
}

export async function sendFriendRequest(formData: FormData) {
  const currentUserId = await getCurrentUserId();
  const username = normalizeUsername(String(formData.get("username") ?? ""));

  if (!username) {
    //redirect("/friends?error=Ange ett användarnamn.");
    redirectWithMessage("error", "missing_username");
  }

  const admin = createAdminClient();

  const { data: targetProfile, error: profileError } = await admin
    .from("profiles")
    .select("id, username")
    .ilike("username", username)
    .maybeSingle();

  if (profileError) {
    //redirect("/friends?error=Kunde inte söka användare.");
    redirectWithMessage("error", "user_search_failed");
  }

  if (!targetProfile) {
    //redirect("/friends?error=Ingen användare hittades.");
    redirectWithMessage("error", "user_not_found");
  }

  if (targetProfile.id === currentUserId) {
    //redirect("/friends?error=Du kan inte lägga till dig själv.");
    redirectWithMessage("error", "cannot_add_self");
  }

  const { data: existingA } = await admin
    .from("friendships")
    .select("id, status, requester_id, addressee_id")
    .eq("requester_id", currentUserId)
    .eq("addressee_id", targetProfile.id)
    .maybeSingle();

  const { data: existingB } = await admin
    .from("friendships")
    .select("id, status, requester_id, addressee_id")
    .eq("requester_id", targetProfile.id)
    .eq("addressee_id", currentUserId)
    .maybeSingle();

  const existing = existingA ?? existingB;

  if (existing?.status === "accepted") {
    //redirect("/friends?error=Ni är redan vänner.");
    redirectWithMessage("error", "already_friends");
  }

  if (existing?.status === "pending") {
    //redirect("/friends?error=Det finns redan en aktiv vänförfrågan.");
    redirectWithMessage("error", "pending_request_exists");
  }

  if (existing?.status === "declined") {
    const { error: updateError } = await admin
      .from("friendships")
      .update({
        requester_id: currentUserId,
        addressee_id: targetProfile.id,
        status: "pending",
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id);

    if (updateError) {
      //redirect("/friends?error=Kunde inte skicka vänförfrågan.");
      redirectWithMessage("error", "send_failed");
    }

    revalidatePath("/friends");
    //redirect("/friends?message=Vänförfrågan skickad.");
    redirectWithMessage("message", "friend_request_sent");
  }

  const { error: insertError } = await admin.from("friendships").insert({
    requester_id: currentUserId,
    addressee_id: targetProfile.id,
    status: "pending",
  });

  if (insertError) {
    //redirect("/friends?error=Kunde inte skicka vänförfrågan.");
    redirectWithMessage("error", "send_failed");

  }

  revalidatePath("/friends");
  //redirect("/friends?message=Vänförfrågan skickad.");
  redirectWithMessage("message", "friend_request_sent");

}

export async function acceptFriendRequest(formData: FormData) {
  const currentUserId = await getCurrentUserId();
  const friendshipId = String(formData.get("friendshipId") ?? "");

  if (!friendshipId) {
    //redirect("/friends?error=Saknar vänförfrågan.");
    redirectWithMessage("error", "missing_friend_request");
  }

  const admin = createAdminClient();

  const { error } = await admin
    .from("friendships")
    .update({
      status: "accepted",
      updated_at: new Date().toISOString(),
    })
    .eq("id", friendshipId)
    .eq("addressee_id", currentUserId)
    .eq("status", "pending");

  if (error) {
    //redirect("/friends?error=Kunde inte acceptera vänförfrågan.");
    redirectWithMessage("error", "accept_failed");
  }

  revalidatePath("/friends");
  //redirect("/friends?message=Vänförfrågan accepterad.");
  redirectWithMessage("message", "friend_request_accepted");
}

export async function declineFriendRequest(formData: FormData) {
  const currentUserId = await getCurrentUserId();
  const friendshipId = String(formData.get("friendshipId") ?? "");

  if (!friendshipId) {
    //redirect("/friends?error=Saknar vänförfrågan.");
    redirectWithMessage("error", "missing_friend_request");
  }

  const admin = createAdminClient();

  const { error } = await admin
    .from("friendships")
    .update({
      status: "declined",
      updated_at: new Date().toISOString(),
    })
    .eq("id", friendshipId)
    .eq("addressee_id", currentUserId)
    .eq("status", "pending");

  if (error) {
    //redirect("/friends?error=Kunde inte neka vänförfrågan.");
    redirectWithMessage("error", "decline_failed");

  }

  revalidatePath("/friends");
  //redirect("/friends?message=Vänförfrågan nekad.");
  redirectWithMessage("message", "friend_request_declined");

}

export async function removeFriend(formData: FormData) {
  const currentUserId = await getCurrentUserId();
  const friendshipId = String(formData.get("friendshipId") ?? "");

  if (!friendshipId) {
    //redirect("/friends?error=Saknar vänskap.");
    redirectWithMessage("error", "missing_friendship");

  }

  const admin = createAdminClient();

  const { error } = await admin
    .from("friendships")
    .delete()
    .eq("id", friendshipId)
    .or(`requester_id.eq.${currentUserId},addressee_id.eq.${currentUserId}`);

  if (error) {
    //redirect("/friends?error=Kunde inte ta bort vän.");
    redirectWithMessage("error", "remove_failed");

  }

  revalidatePath("/friends");
  //redirect("/friends?message=Vän borttagen.");
  redirectWithMessage("message", "friend_removed");

}
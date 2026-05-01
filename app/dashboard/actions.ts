"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  FIRST_TARGET,
  LAST_TARGET,
  formatTargetNumber,
} from "@/lib/skyltjakten/number-challenge";

const SYSTEM_GROUP_ID = process.env.SKYLTJAKTEN_SYSTEM_GROUP_ID!;
const DEFAULT_CHALLENGE_ID = process.env.SKYLTJAKTEN_DEFAULT_CHALLENGE_ID!;

async function getCurrentUserId(): Promise<string> {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims?.sub) {
    redirect("/login");
  }

  return data.claims.sub;
}

export async function startNumberChallenge() {
  const userId = await getCurrentUserId();
  const admin = createAdminClient();

  const { error } = await admin.from("user_progress").upsert(
    {
      user_id: userId,
      challenge_id: DEFAULT_CHALLENGE_ID,
      current_step_index: FIRST_TARGET,
      started_at: new Date().toISOString(),
      completed_at: null,
    },
    {
      onConflict: "user_id,challenge_id",
      ignoreDuplicates: true,
    }
  );

  if (error) {
    throw new Error("Kunde inte starta utmaningen.");
  }

  revalidatePath("/dashboard");
}

export async function markCurrentTargetFound() {
  const userId = await getCurrentUserId();
  const admin = createAdminClient();

  const { data: progress, error: progressError } = await admin
    .from("user_progress")
    .select("id, current_step_index, started_at, completed_at")
    .eq("user_id", userId)
    .eq("challenge_id", DEFAULT_CHALLENGE_ID)
    .maybeSingle();

  if (progressError) {
    throw new Error("Kunde inte läsa progression.");
  }

  if (!progress) {
    throw new Error("Utmaningen är inte startad.");
  }

  if (progress.completed_at || progress.current_step_index > LAST_TARGET) {
    throw new Error("Utmaningen är redan färdig.");
  }

  const currentStep = progress.current_step_index;
  const targetPattern = formatTargetNumber(currentStep);

  const { data: previousSighting, error: previousError } = await admin
    .from("sightings")
    .select("found_at")
    .eq("user_id", userId)
    .eq("challenge_id", DEFAULT_CHALLENGE_ID)
    .order("found_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (previousError) {
    throw new Error("Kunde inte läsa senaste fynd.");
  }

  const now = new Date();

    const previousTime = previousSighting?.found_at ?? progress.started_at;

    const secondsSincePrevious = previousTime
    ? Math.floor((now.getTime() - new Date(previousTime).getTime()) / 1000)
    : null;

  const { error: insertError } = await admin.from("sightings").insert({
    user_id: userId,
    group_id: SYSTEM_GROUP_ID,
    challenge_id: DEFAULT_CHALLENGE_ID,
    step_index: currentStep,
    target_pattern: targetPattern,
    plate_tag: null,
    found_at: now.toISOString(),
    created_at: now.toISOString(),
    seconds_since_previous: secondsSincePrevious,
  });

  if (insertError) {
    if (insertError.code === "23505") {
      throw new Error("Detta steg är redan registrerat.");
    }

    throw new Error("Kunde inte spara fyndet.");
  }

  const nextStep = currentStep + 1;
  const completedAt = nextStep > LAST_TARGET ? now.toISOString() : null;

  const { error: updateError } = await admin
    .from("user_progress")
    .update({
      current_step_index: nextStep,
      completed_at: completedAt,
    })
    .eq("user_id", userId)
    .eq("challenge_id", DEFAULT_CHALLENGE_ID)
    .eq("current_step_index", currentStep);

  if (updateError) {
    throw new Error("Kunde inte uppdatera progression.");
  }

  revalidatePath("/dashboard");
}
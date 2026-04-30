"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

function normalizeUsername(value: string): string {
  return value.trim().toLowerCase();
}

function isValidUsername(username: string): boolean {
  return /^[a-z0-9_]{3,24}$/.test(username);
}

export async function signUp(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const username = normalizeUsername(String(formData.get("username") ?? ""));
  const password = String(formData.get("password") ?? "");

  if (!email || !username || !password) {
    redirect("/login?error=missing-fields");
  }

  if (!isValidUsername(username)) {
    redirect(
      "/login?error=Användarnamn får bara innehålla a-z, 0-9 och _ samt vara 3-24 tecken."
    );
  }

  if (password.length < 6) {
    redirect("/login?error=Lösenordet måste vara minst 6 tecken.");
  }

  
  const admin = createAdminClient();

  const { data: existingProfile, error: usernameCheckError } = await admin
    .from("profiles")
    .select("id")
    .ilike("username", username)
    .maybeSingle();

   if (usernameCheckError) {
    redirect("/login?error=Kunde inte kontrollera användarnamnet.");
  }


  if (existingProfile) {
    redirect("/login?error=Användarnamnet är redan taget.");
  }

  const origin = (await headers()).get("origin");


   if (!origin) {
    redirect("/login?error=Kunde inte läsa origin.");
  }
  const supabase = await createClient();

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        username,
      },
      emailRedirectTo: `${origin}/auth/callback?next=/dashboard`,
    },
  });

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }

  redirect(
    "/login?message=Konto skapat. Kontrollera mejlen och bekräfta kontot."
  );
}

export async function signIn(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    redirect("/login?error=missing-fields");
  }

  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/dashboard");
}

export async function signOut() {
  const supabase = await createClient();

  await supabase.auth.signOut();

  redirect("/login");
}
import { redirect } from "next/navigation";
import { signOut } from "@/app/auth/actions";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  LAST_TARGET,
  formatTargetNumber,
  isChallengeCompleted,
} from "@/lib/skyltjakten/number-challenge";
import {
  markCurrentTargetFound,
  startNumberChallenge,
} from "@/app/dashboard/actions";

const DEFAULT_CHALLENGE_ID = process.env.SKYLTJAKTEN_DEFAULT_CHALLENGE_ID!;

function formatDuration(seconds: number | null): string {
  if (seconds === null) return "—";

  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (days > 0) return `${days} d ${hours} h ${minutes} min`;
  if (hours > 0) return `${hours} h ${minutes} min`;
  return `${minutes} min`;
}

export default async function DashboardPage() {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims?.sub) {
    redirect("/login");
  }

  const userId = data.claims.sub;
  const email = data.claims.email;

  const admin = createAdminClient();

  const { data: profile } = await admin
    .from("profiles")
    .select("username")
    .eq("id", userId)
    .maybeSingle();

  const { data: progress } = await admin
    .from("user_progress")
    .select("current_step_index, started_at, completed_at")
    .eq("user_id", userId)
    .eq("challenge_id", DEFAULT_CHALLENGE_ID)
    .maybeSingle();

  const { count: sightingsCount } = await admin
    .from("sightings")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("challenge_id", DEFAULT_CHALLENGE_ID);

  const { data: lastSighting } = await admin
    .from("sightings")
    .select("target_pattern, found_at, seconds_since_previous")
    .eq("user_id", userId)
    .eq("challenge_id", DEFAULT_CHALLENGE_ID)
    .order("found_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const hasStarted = Boolean(progress);
  const currentStep = progress?.current_step_index ?? 1;
  const completed = progress
    ? isChallengeCompleted(progress.current_step_index)
    : false;

  const currentTarget = completed
    ? "Klar"
    : formatTargetNumber(currentStep);

  const foundCount = sightingsCount ?? 0;
  const progressPercent = Math.min(
    100,
    Math.round((foundCount / LAST_TARGET) * 100)
  );

  return (
    <main className="mx-auto min-h-screen max-w-4xl px-6 py-10">
      <header className="flex items-center justify-between border-b border-zinc-800 pb-4">
        <div>
          <h1 className="text-2xl font-semibold">Skyltjakten</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Inloggad som {profile?.username ?? email}
          </p>
        </div>

        <form>
          <button
            formAction={signOut}
            className="rounded-lg border border-zinc-700 px-4 py-2 text-sm hover:bg-zinc-900"
          >
            Logga ut
          </button>
        </form>
      </header>

      <section className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
        {!hasStarted ? (
          <>
            <h2 className="text-xl font-semibold">Starta 001-999</h2>
            <p className="mt-2 text-sm text-zinc-400">
              När du startar börjar jakten på nummer 001. Varje fynd sparas med
              tid och datum.
            </p>

            <form className="mt-6">
              <button
                formAction={startNumberChallenge}
                className="w-full rounded-xl bg-white px-5 py-4 text-lg font-semibold text-black hover:bg-zinc-200"
              >
                Starta utmaning
              </button>
            </form>
          </>
        ) : completed ? (
          <>
            <h2 className="text-xl font-semibold">Utmaningen är klar</h2>
            <p className="mt-2 text-sm text-zinc-400">
              Du har hittat alla nummer från 001 till 999.
            </p>
          </>
        ) : (
          <>
            <p className="text-sm uppercase tracking-wide text-zinc-500">
              Nuvarande mål
            </p>

            <div className="mt-3 text-center text-7xl font-bold tabular-nums">
              {currentTarget}
            </div>

            <form className="mt-8">
              <button
                formAction={markCurrentTargetFound}
                className="w-full rounded-xl bg-white px-5 py-4 text-lg font-semibold text-black hover:bg-zinc-200"
              >
                Hittade {currentTarget}
              </button>
            </form>
          </>
        )}
      </section>

      <section className="mt-6 grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-zinc-800 p-5">
          <p className="text-sm text-zinc-500">Progress</p>
          <p className="mt-2 text-2xl font-semibold">
            {foundCount} / {LAST_TARGET}
          </p>
          <p className="mt-1 text-sm text-zinc-500">{progressPercent}%</p>
        </div>

        <div className="rounded-2xl border border-zinc-800 p-5">
          <p className="text-sm text-zinc-500">Senaste fynd</p>
          <p className="mt-2 text-2xl font-semibold">
            {lastSighting?.target_pattern ?? "—"}
          </p>
          <p className="mt-1 text-sm text-zinc-500">
            {lastSighting?.found_at
              ? new Date(lastSighting.found_at).toLocaleString("sv-SE")
              : "Inget fynd ännu"}
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-800 p-5">
          <p className="text-sm text-zinc-500">Tid sedan föregående</p>
          <p className="mt-2 text-2xl font-semibold">
            {formatDuration(lastSighting?.seconds_since_previous ?? null)}
          </p>
        </div>
      </section>
    </main>
  );
}


/*
export default async function DashboardPage() {
  const supabase = await createClient();

  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims) {
    redirect("/login");
  }
  const email = data.claims.email;



  return (
    <main className="mx-auto min-h-screen max-w-4xl px-6 py-10">
      <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Inloggad som {email}
          </p>
        </div>

        <form>
          <button
            formAction={signOut}
            className="rounded-lg border border-zinc-700 px-4 py-2 text-sm hover:bg-zinc-900"
          >
            Logga ut
          </button>
        </form>
      </div>

      <section className="mt-8 rounded-2xl border border-zinc-800 p-6">
        <h2 className="text-lg font-medium">Nästa steg</h2>
        <p className="mt-2 text-sm text-zinc-500">
          Här bygger vi sedan grupp, challenge och första sighting-flödet.
        </p>
      </section>
    </main>
  );
}*/
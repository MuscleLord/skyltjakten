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

import {
  ProgressLineChart,
  type ProgressChartPoint,
} from "@/components/charts/progress-line-chart";
import Link from "next/link";
import Image from "next/image";

const DEFAULT_CHALLENGE_ID = process.env.SKYLTJAKTEN_DEFAULT_CHALLENGE_ID!;

/* function formatDuration(seconds: number | null): string {
  if (seconds === null) return "—";

  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (days > 0) return `${days} d ${hours} h ${minutes} min`;
  if (hours > 0) return `${hours} h ${minutes} min`;
  return `${minutes} min`;
} */
function formatDuration(seconds: number | null): string {
  if (seconds === null) return "—";

  if (seconds < 60) {
    return `${seconds} sek`;
  }

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

  const { count: incomingFriendRequestCount } = await admin
  .from("friendships")
  .select("id", { count: "exact", head: true })
  .eq("addressee_id", userId)
  .eq("status", "pending");


  const { data: progressSightings } = await admin
  .from("sightings")
  .select("step_index, target_pattern, found_at")
  .eq("user_id", userId)
  .eq("challenge_id", DEFAULT_CHALLENGE_ID)
  .order("found_at", { ascending: true });  

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

  const progressChartData: ProgressChartPoint[] = (progressSightings ?? []).map(
  (s) => {
    const foundAt = new Date(s.found_at);

    return {
      label: foundAt.toLocaleDateString("sv-SE", {
        month: "short",
        day: "numeric",
      }),
      progress: s.step_index,
      target: s.target_pattern,
      foundAt: foundAt.toLocaleString("sv-SE"),
    };
  }
);

  return (
    <main className="mx-auto min-h-screen max-w-4xl px-6 py-10 text-slate-50">
      <header className="flex items-center justify-between border-b border-sky-900/60 pb-4">
        <div>
          <div className="relative mx-2 mb-1 w-24 h-24 mb:w-32 mb:h-32 sm:w-24 sm:h-24 lg:w-48 lg:h-48">

          <Image
            src="/logo.png"
            alt="Skyltjakten"            
            fill={true}
            />
          </div>
          
          <p className="mt-1 text-sm text-zinc-300">
            Inloggad som {profile?.username ?? email}
          </p>
        </div>
        <div className="flex items-center gap-3">
           <Link
            href="/friends"
            className="relative rounded-xl border border-sky-400/40 bg-sky-950/30 px-4 py-2 text-sm text-sky-100 hover:bg-sky-900/50"
          >
            Vänner

            {(incomingFriendRequestCount ?? 0) > 0 && (
              <span className="absolute -right-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#f9d142] px-1.5 text-xs font-bold text-slate-950 shadow">
                {(incomingFriendRequestCount ?? 0) > 9
                  ? "9+"
                  : incomingFriendRequestCount}
              </span>
            )}
          </Link>
        <form>
          <button
            formAction={signOut}
            className="rounded-xl border border-sky-400/40 bg-sky-950/30 px-4 py-2 text-sm text-sky-100 hover:bg-sky-900/50"
          >
            Logga ut
          </button>
        </form>
        </div>
      </header>

      <section className="mt-8 rounded-3xl border border-sky-400/20 bg-[#0e1b38]/90 p-6 shadow-xl shadow-blue-950/30">
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
                className="w-full rounded-2xl bg-[#f9d142] px-5 py-4 text-2xl font-bold text-slate-950 shadow-lg shadow-yellow-950/30 hover:bg-[#ffe16a]"
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
            <p className="text-sm uppercase tracking-wide text-zinc-400">
              Nuvarande mål att hitta
            </p>

        <div className="mx-auto mt-3 flex w-full max-w-sm overflow-hidden rounded-xl border-4 border-slate-950 bg-white shadow-lg">
          <div className="flex w-14 shrink-0 flex-col items-center justify-center bg-blue-700 text-white">
            <span className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-dotted border-yellow-400 text-[10px] font-bold leading-none">
              EU
            </span>

            <span className="mt-2 text-2xl font-black leading-none">S</span>
          </div>

          <div className="flex flex-1 items-center justify-center px-6 py-3">
            <div className="text-center text-7xl font-black tabular-nums tracking-widest text-slate-950">
              {currentTarget}
            </div>
          </div>
        </div>

            <form className="mt-8">
              <button
                formAction={markCurrentTargetFound}
                className="w-full rounded-2xl bg-[#f9d142] px-5 py-4 text-2xl font-bold text-slate-950 shadow-lg shadow-yellow-950/30 hover:bg-[#ffe16a]"
              >
                Hittade {currentTarget}
              </button>
            </form>
          </>
        )}
      </section>

      <section className="mt-6 grid gap-4 md:grid-cols-3">
        <div className="rounded-3xl border border-blue-400/20 bg-blue-950/50 shadow-xl shadow-blue-950/40 backdrop-blur p-5">
          <p className="text-sm text-zinc-400">Progress</p>
          <p className="mt-2 text-2xl font-semibold">
            {foundCount} / {LAST_TARGET}
          </p>
          <p className="mt-1 text-sm text-zinc-400">{progressPercent}%</p>
        </div>

        <div className="rounded-3xl border border-blue-400/20 bg-blue-950/50 shadow-xl shadow-blue-950/40 backdrop-blur p-5">
          <p className="text-sm text-zinc-400">Senaste fynd</p>
          <p className="mt-2 text-2xl font-semibold">
            {lastSighting?.target_pattern ?? "—"}
          </p>
          <p className="mt-1 text-sm text-zinc-400">
            {lastSighting?.found_at
              ? new Date(lastSighting.found_at).toLocaleString("sv-SE")
              : "Inget fynd ännu"}
          </p>
        </div>

        <div className="rounded-3xl border border-blue-400/20 bg-blue-950/50 shadow-xl shadow-blue-950/40 backdrop-blur p-5">
          <p className="text-sm text-zinc-400">Tid för senaste steg</p>
          <p className="mt-2 text-2xl font-semibold">
            {formatDuration(lastSighting?.seconds_since_previous ?? null)}
          </p>
        </div>
      </section>
      <section className="mt-6 rounded-3xl border border-blue-400/20 bg-blue-950/30 shadow-xl shadow-blue-950/40 backdrop-blur p-5 min-w-1">
        <div className="mb-4">
          <h2 className="text-lg font-semibold">Progress över tid</h2>
          <p className="mt-1 text-sm text-zinc-400">
            Visar hur långt du kommit i 001-999-serien.
          </p>
        </div>

        <ProgressLineChart data={progressChartData} />
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
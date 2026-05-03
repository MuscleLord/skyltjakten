
/* #region -> Imports */
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

import { ConfirmActionButton } from "@/components/confirm-action-button";

/* #endregion */



/* #region -> declared types/variables */
type DashboardPageProps = {
  searchParams: Promise<{
    error?: string;
    message?: string;
  }>;
};

const DEFAULT_CHALLENGE_ID = process.env.SKYLTJAKTEN_DEFAULT_CHALLENGE_ID!;

const dashboardMessages: Record<string, string> = {
  challenge_started: "Utmaningen är startad.",
  target_registered: "Fyndet är registrerat.",
};

const dashboardErrors: Record<string, string> = {
  challenge_start_failed: "Kunde inte starta utmaningen.",
  progress_read_failed: "Kunde inte läsa progression.",
  challenge_not_started: "Utmaningen är inte startad.",
  challenge_already_completed: "Utmaningen är redan färdig.",
  target_already_registered: "Detta steg är redan registrerat.",
  target_register_failed: "Kunde inte registrera fyndet.",
  progress_update_failed: "Kunde inte uppdatera progression.",
};
/* #endregion */

/* #region -> Functions */
function getQueryText(
  value: string | undefined,
  map: Record<string, string>
): string | null {
  if (!value) return null;
  return map[value] ?? null;
}
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
/* #endregion */

/* #region -> Component */
export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const supabase = await createClient();
  const params = await searchParams;

  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims?.sub) {
    redirect("/login");
  }

  const userId = data.claims.sub;
  const email = data.claims.email;

  const admin = createAdminClient();


  
  const [
  profileResult,
  progressResult,
  incomingFriendRequestsResult,
  progressSightingsResult,
] = await Promise.all([
  admin
    .from("profiles")
    .select("username, role")
    .eq("id", userId)
    .maybeSingle(),

  admin
    .from("user_progress")
    .select("current_step_index, started_at, completed_at")
    .eq("user_id", userId)
    .eq("challenge_id", DEFAULT_CHALLENGE_ID)
    .maybeSingle(),

  admin
    .from("friendships")
    .select("id", { count: "exact", head: true })
    .eq("addressee_id", userId)
    .eq("status", "pending"),

  admin
    .from("sightings")
    .select("step_index, target_pattern, found_at, seconds_since_previous")
    .eq("user_id", userId)
    .eq("challenge_id", DEFAULT_CHALLENGE_ID)
    .order("found_at", { ascending: true }),
]);

const profile = profileResult.data;
const progress = progressResult.data;
const incomingFriendRequestCount = incomingFriendRequestsResult.count ?? 0;

const sightings = progressSightingsResult.data ?? [];
const foundCount = sightings.length;
const lastSighting = sightings.at(-1) ?? null;
  

/*

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

  const foundCount = sightingsCount ?? 0;
  */


  const hasStarted = Boolean(progress);
  const currentStep = progress?.current_step_index ?? 1;
  const completed = progress
    ? isChallengeCompleted(progress.current_step_index)
    : false;

  const currentTarget = completed
    ? "Klar"
    : formatTargetNumber(currentStep);


  const progressPercent = Math.min(
    100,
    Math.round((foundCount / LAST_TARGET) * 100)
  );

  /*
  const progressChartData: ProgressChartPoint[] = (progressSightings ?? []).map(
  (s, index) => {
    const foundAt = new Date(s.found_at);

    return {
      index: index + 1,
      label: `#${index + 1}`,
      progress: s.step_index,
      target: s.target_pattern,
      foundAt: foundAt.toLocaleString("sv-SE"),
    };
  }
);
*/

const progressChartData: ProgressChartPoint[] = sightings.map((s, index) => {
  const foundAt = new Date(s.found_at);

  return {
    index: index + 1,
    label: `#${index + 1}`,
    progress: s.step_index,
    target: s.target_pattern,
    foundAt: foundAt.toLocaleString("sv-SE"),
  };
});
  const errorText = getQueryText(params.error, dashboardErrors);
  //const messageText = getQueryText(params.message, dashboardMessages);


  let messageText = getQueryText(params.message, dashboardMessages);

  if (params.message === "target_registered" && lastSighting?.target_pattern) {
    messageText = `${lastSighting.target_pattern} registrerat. Nästa mål är ${currentTarget}.`;
  }

  return (
    <main className="mx-auto min-h-screen w-sm md:w-xl lg:w-4xl max-w-3xl md:max-w-4xl px-6 py-10 text-slate-50">
      <header className="flex items-center justify-between w-full border-b border-sky-900/60 pb-4">
        <div>
          <div className="relative mx-2 mb-1 w-24 h-24 md:w-64 md:h-64">

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
        <div className="flex flex-wrap justify-end gap-3">
     
           <Link
            href="/friends"
            className="relative nav-button"
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
              className="nav-button"
            >
              Logga ut
            </button>
          </form>
            
            {profile?.role === "admin" && (
            <Link
              href="/admin"
              className="rounded-xl border border-yellow-400/50 bg-yellow-950/30 px-4 py-2 text-sm text-yellow-100 hover:scale-[1.05] hover:bg-yellow-700/30 duration-300 active:bg-yellow-900/50 active:scale-[0.97] active:duration-300"
            >
              Admin
            </Link>
          )}
        </div>
      </header>
            {errorText && (
              <div className="mt-6 rounded-lg border border-red-800 bg-red-950 px-3 py-2 text-sm text-red-200">
                {errorText}
              </div>
            )}

            {messageText && (
              <div className="mt-6 rounded-lg border border-emerald-800 bg-emerald-950 px-3 py-2 text-sm text-emerald-200">
                {messageText}
              </div>
            )}
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
                className="w-full rounded-2xl bg-[#f9d142] px-5 py-4 text-2xl font-bold text-slate-950 shadow-lg shadow-yellow-950/30 hover:bg-[#ffe16a] duration-300 active:bg-[#ffd735] active:scale-[0.95] active:duration-300"
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
            <p className="text-lg text-center uppercase tracking-wide text-zinc-300">
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
          <div className="mt-8">
          <ConfirmActionButton
                action={markCurrentTargetFound}
                title={`Registrera ${currentTarget}?`}
                description={`Bekräfta att du har hittat ett registreringsnummer med ${currentTarget}. Detta sparas med tid och datum och flyttar dig vidare till nästa nummer.`}
                confirmLabel={`Ja, registrera ${currentTarget}`}
                buttonClassName="w-full px-5 py-4 text-2xl primary-yellow-button"
            >
                Hittade {currentTarget}
            </ConfirmActionButton>
            </div>
          {/*
            <form className="mt-8">
              <button
                formAction={markCurrentTargetFound}
                className="w-full rounded-2xl bg-[#f9d142] px-5 py-4 text-2xl font-bold text-slate-950 shadow-lg shadow-yellow-950/30 hover:bg-[#ffe16a]"
              >
                Hittade {currentTarget}
              </button>
            </form>*/}
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
          <p className="mt-2 text-2xl font-semibold overflow-clip">
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
/* #endregion */

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
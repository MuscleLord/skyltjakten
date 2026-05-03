import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatTargetNumber, LAST_TARGET } from "@/lib/skyltjakten/number-challenge";

const DEFAULT_CHALLENGE_ID = process.env.SKYLTJAKTEN_DEFAULT_CHALLENGE_ID!;

type AdminUserPageProps = {
  params: Promise<{
    userId: string;
  }>;
};

type SightingRow = {
  id: string;
  step_index: number;
  target_pattern: string;
  found_at: string;
  seconds_since_previous: number | null;
};

function formatDuration(seconds: number | null): string {
  if (seconds === null) return "—";
  if (seconds < 60) return `${seconds} sek`;

  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (days > 0) return `${days} d ${hours} h ${minutes} min`;
  if (hours > 0) return `${hours} h ${minutes} min`;
  return `${minutes} min`;
}

export default async function AdminUserPage({ params }: AdminUserPageProps) {
  await requireAdmin();

  const { userId } = await params;
  const admin = createAdminClient();

  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("id, username, role, created_at")
    .eq("id", userId)
    .maybeSingle();

  if (profileError || !profile) {
    notFound();
  }

  const { data: progress } = await admin
    .from("user_progress")
    .select("current_step_index, started_at, completed_at")
    .eq("user_id", userId)
    .eq("challenge_id", DEFAULT_CHALLENGE_ID)
    .maybeSingle();

  const { data: sightingsRaw, error: sightingsError } = await admin
    .from("sightings")
    .select("id, step_index, target_pattern, found_at, seconds_since_previous")
    .eq("user_id", userId)
    .eq("challenge_id", DEFAULT_CHALLENGE_ID)
    .order("step_index", { ascending: true });

  if (sightingsError) {
    throw new Error("Kunde inte läsa fyndhistorik.");
  }

  const sightings = (sightingsRaw ?? []) as SightingRow[];
  const foundCount = sightings.length;

  const currentTarget =
    progress?.completed_at || (progress?.current_step_index ?? 1) > LAST_TARGET
      ? "Klar"
      : formatTargetNumber(progress?.current_step_index ?? 1);

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-6 py-10 text-slate-50">
      <header className="flex items-center justify-between border-b border-sky-900/60 pb-4">
        <div>
          <h1 className="text-2xl font-semibold">{profile.username}</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Adminvy för användarens Skyltjakten-progress.
          </p>
        </div>

        <Link
          href="/admin"
          className="rounded-xl border border-sky-400/40 bg-sky-950/30 px-4 py-2 text-sm text-sky-100 hover:bg-sky-900/50"
        >
          Tillbaka
        </Link>
      </header>

      <section className="mt-6 grid gap-4 md:grid-cols-3">
        <div className="rounded-3xl border border-blue-400/20 bg-blue-950/50 p-5 shadow-xl shadow-blue-950/40">
          <p className="text-sm text-zinc-400">Nuvarande mål</p>
          <p className="mt-2 text-3xl font-black">{currentTarget}</p>
        </div>

        <div className="rounded-3xl border border-blue-400/20 bg-blue-950/50 p-5 shadow-xl shadow-blue-950/40">
          <p className="text-sm text-zinc-400">Fynd</p>
          <p className="mt-2 text-3xl font-black">
            {foundCount} / {LAST_TARGET}
          </p>
        </div>

        <div className="rounded-3xl border border-blue-400/20 bg-blue-950/50 p-5 shadow-xl shadow-blue-950/40">
          <p className="text-sm text-zinc-400">Roll</p>
          <p className="mt-2 text-3xl font-black">{profile.role}</p>
        </div>
      </section>

      <section className="mt-6 rounded-3xl border border-sky-400/20 bg-[#0e1b38]/90 p-5 shadow-xl shadow-blue-950/30">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold">Fyndhistorik</h2>
            <p className="mt-1 text-sm text-zinc-400">
              Här kommer vi senare lägga till redigering, radering och import.
            </p>
          </div>

          <Link
            href={`/admin/users/${userId}/import`}
            className="rounded-2xl bg-[#f9d142] px-4 py-2 text-sm font-black text-slate-950 shadow-lg shadow-yellow-950/30 hover:bg-[#ffe16a]"
          >
            Importera/redigera
          </Link>
        </div>

        {sightings.length === 0 ? (
          <p className="mt-4 text-sm text-zinc-400">
            Användaren har inga registrerade fynd ännu.
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-180 border-collapse text-sm">
              <thead>
                <tr className="border-b border-sky-900/60 text-left text-zinc-400">
                  <th className="py-3 pr-4">Steg</th>
                  <th className="py-3 pr-4">Nummer</th>
                  <th className="py-3 pr-4">Tidpunkt</th>
                  <th className="py-3 pr-4">Tid sedan föregående</th>
                </tr>
              </thead>

              <tbody>
                {sightings.map((sighting) => (
                  <tr
                    key={sighting.id}
                    className="border-b border-sky-950/70"
                  >
                    <td className="py-3 pr-4">{sighting.step_index}</td>
                    <td className="py-3 pr-4 font-medium">
                      {sighting.target_pattern}
                    </td>
                    <td className="py-3 pr-4 text-zinc-300">
                      {new Date(sighting.found_at).toLocaleString("sv-SE")}
                    </td>
                    <td className="py-3 pr-4 text-zinc-300">
                      {formatDuration(sighting.seconds_since_previous)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
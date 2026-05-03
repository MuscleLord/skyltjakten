import Link from "next/link";
import { requireAdmin } from "@/lib/admin/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatTargetNumber, LAST_TARGET } from "@/lib/skyltjakten/number-challenge";

const DEFAULT_CHALLENGE_ID = process.env.SKYLTJAKTEN_DEFAULT_CHALLENGE_ID!;

type AdminPageProps = {
  searchParams: Promise<{
    q?: string;
  }>;
};

type ProfileRow = {
  id: string;
  username: string;
  role: "user" | "admin";
  created_at: string;
};

type ProgressRow = {
  user_id: string;
  current_step_index: number;
  completed_at: string | null;
};

function getProgressLabel(progress?: ProgressRow) {
  if (!progress) return "Ej startad";

  if (progress.completed_at || progress.current_step_index > LAST_TARGET) {
    return "Klar";
  }

  return formatTargetNumber(progress.current_step_index);
}

function getFoundCount(progress?: ProgressRow) {
  if (!progress) return 0;
  return Math.min(LAST_TARGET, Math.max(0, progress.current_step_index - 1));
}

export default async function AdminPage({ searchParams }: AdminPageProps) {
  await requireAdmin();

  const params = await searchParams;
  const query = String(params.q ?? "").trim().toLowerCase();

  const admin = createAdminClient();

  let profilesQuery = admin
    .from("profiles")
    .select("id, username, role, created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  if (query) {
    profilesQuery = profilesQuery.ilike("username", `%${query}%`);
  }

  const { data: profilesRaw, error: profilesError } = await profilesQuery;

  if (profilesError) {
    throw new Error("Kunde inte läsa användare.");
  }

  const profiles = (profilesRaw ?? []) as ProfileRow[];
  const userIds = profiles.map((p) => p.id);

  const { data: progressRaw } = userIds.length
    ? await admin
        .from("user_progress")
        .select("user_id, current_step_index, completed_at")
        .eq("challenge_id", DEFAULT_CHALLENGE_ID)
        .in("user_id", userIds)
    : { data: [] };

  const progressByUser = new Map(
    ((progressRaw ?? []) as ProgressRow[]).map((p) => [p.user_id, p])
  );

  return (
    <main className="mx-auto min-h-screen max-w-5xl px-6 py-10 text-slate-50">
      <header className="flex items-center justify-between border-b border-sky-900/60 pb-4">
        <div>
          <h1 className="text-2xl font-semibold">Admin</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Hantera användare och progress.
          </p>
        </div>

        <Link
          href="/dashboard"
          className="rounded-xl border border-sky-400/40 bg-sky-950/30 px-4 py-2 text-sm text-sky-100 hover:bg-sky-900/50"
        >
          Dashboard
        </Link>
      </header>

      <section className="mt-6 rounded-3xl border border-sky-400/20 bg-[#0e1b38]/90 p-5 shadow-xl shadow-blue-950/30">
        <form className="flex gap-3">
          <input
            name="q"
            type="text"
            defaultValue={query}
            placeholder="Sök användarnamn"
            className="min-w-0 flex-1 rounded-lg border-2 border-zinc-700 bg-zinc-300 px-3 py-2 text-zinc-900 outline-none focus:border-amber-400"
          />

          <button className="rounded-2xl bg-[#f9d142] px-4 py-2 text-sm font-black text-slate-950 shadow-lg shadow-yellow-950/30 hover:bg-[#ffe16a]">
            Sök
          </button>

          {query && (
            <Link
              href="/admin"
              className="rounded-xl border border-sky-400/40 bg-sky-950/30 px-4 py-2 text-sm text-sky-100 hover:bg-sky-900/50"
            >
              Rensa
            </Link>
          )}
        </form>
      </section>

      <section className="mt-6 rounded-3xl border border-sky-400/20 bg-[#0e1b38]/90 p-5 shadow-xl shadow-blue-950/30">
        <h2 className="text-lg font-semibold">Användare</h2>

        {profiles.length === 0 ? (
          <p className="mt-4 text-sm text-zinc-400">
            Inga användare hittades.
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-180 border-collapse text-sm">
              <thead>
                <tr className="border-b border-sky-900/60 text-left text-zinc-400">
                  <th className="py-3 pr-4">Användare</th>
                  <th className="py-3 pr-4">Roll</th>
                  <th className="py-3 pr-4">Nuvarande mål</th>
                  <th className="py-3 pr-4">Fynd</th>
                  <th className="py-3 pr-4">Skapad</th>
                  <th className="py-3 pr-4"></th>
                </tr>
              </thead>

              <tbody>
                {profiles.map((profile) => {
                  const progress = progressByUser.get(profile.id);

                  return (
                    <tr
                      key={profile.id}
                      className="border-b border-sky-950/70"
                    >
                      <td className="py-3 pr-4 font-medium">
                        {profile.username}
                      </td>
                      <td className="py-3 pr-4">{profile.role}</td>
                      <td className="py-3 pr-4">
                        {getProgressLabel(progress)}
                      </td>
                      <td className="py-3 pr-4">
                        {getFoundCount(progress)} / {LAST_TARGET}
                      </td>
                      <td className="py-3 pr-4 text-zinc-400">
                        {new Date(profile.created_at).toLocaleDateString(
                          "sv-SE"
                        )}
                      </td>
                      <td className="py-3 pr-4 text-right">
                        <Link
                          href={`/admin/users/${profile.id}`}
                          className="rounded-xl border border-sky-400/40 bg-sky-950/30 px-3 py-2 text-sm text-sky-100 hover:bg-sky-900/50"
                        >
                          Öppna
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
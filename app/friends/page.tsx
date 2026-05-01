import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatTargetNumber, LAST_TARGET } from "@/lib/skyltjakten/number-challenge";
import {
  acceptFriendRequest,
  declineFriendRequest,
  removeFriend,
  sendFriendRequest,
} from "@/app/friends/actions";

const DEFAULT_CHALLENGE_ID = process.env.SKYLTJAKTEN_DEFAULT_CHALLENGE_ID!;

type FriendsPageProps = {
  searchParams: Promise<{
    error?: string;
    message?: string;
  }>;
};

type FriendshipRow = {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: "pending" | "accepted" | "declined";
};

type ProfileRow = {
  id: string;
  username: string;
};

type ProgressRow = {
  user_id: string;
  current_step_index: number;
  completed_at: string | null;
};

function getOtherUserId(friendship: FriendshipRow, currentUserId: string) {
  return friendship.requester_id === currentUserId
    ? friendship.addressee_id
    : friendship.requester_id;
}

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

export default async function FriendsPage({ searchParams }: FriendsPageProps) {
  const params = await searchParams;

  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims?.sub) {
    redirect("/login");
  }

  const currentUserId = data.claims.sub;
  const admin = createAdminClient();

  const { data: friendshipsRaw, error: friendshipsError } = await admin
    .from("friendships")
    .select("id, requester_id, addressee_id, status")
    .or(`requester_id.eq.${currentUserId},addressee_id.eq.${currentUserId}`)
    .order("created_at", { ascending: false });

  if (friendshipsError) {
    throw new Error("Kunde inte läsa vänlista.");
  }

  const friendships = (friendshipsRaw ?? []) as FriendshipRow[];

  const otherUserIds = Array.from(
    new Set(friendships.map((f) => getOtherUserId(f, currentUserId)))
  );

  const { data: profilesRaw } = otherUserIds.length
    ? await admin
        .from("profiles")
        .select("id, username")
        .in("id", otherUserIds)
    : { data: [] };

  const { data: progressRaw } = otherUserIds.length
    ? await admin
        .from("user_progress")
        .select("user_id, current_step_index, completed_at")
        .eq("challenge_id", DEFAULT_CHALLENGE_ID)
        .in("user_id", otherUserIds)
    : { data: [] };

  const profiles = new Map(
    ((profilesRaw ?? []) as ProfileRow[]).map((p) => [p.id, p])
  );

  const progressByUser = new Map(
    ((progressRaw ?? []) as ProgressRow[]).map((p) => [p.user_id, p])
  );

  const accepted = friendships.filter((f) => f.status === "accepted");
  const incoming = friendships.filter(
    (f) => f.status === "pending" && f.addressee_id === currentUserId
  );
  const outgoing = friendships.filter(
    (f) => f.status === "pending" && f.requester_id === currentUserId
  );

  return (
    <main className="mx-auto min-h-screen max-w-4xl px-4 py-10">
      <header className="flex items-center justify-between border-b border-zinc-600 pb-4">
        <div>
          <h1 className="text-2xl font-semibold">Vänner</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Lägg till vänner och se deras Skyltjakten-status.
          </p>
        </div>

        <Link
          href="/dashboard"
          className="relative rounded-xl border border-sky-400/40 bg-sky-950/30 px-4 py-2 text-sm text-sky-100 hover:bg-sky-900/50"
        >
          Dashboard
        </Link>
      </header>

      {params.error && (
        <div className="mt-6 rounded-lg border border-red-800 bg-red-950 px-3 py-2 text-sm text-red-200">
          {decodeURIComponent(params.error)}
        </div>
      )}

      {params.message && (
        <div className="mt-6 rounded-lg border border-emerald-800 bg-emerald-950 px-3 py-2 text-sm text-emerald-200">
          {decodeURIComponent(params.message)}
        </div>
      )}

      <section className="mt-6 rounded-3xl border border-sky-400/20 bg-[#0e1b38]/90 p-6 shadow-xl shadow-blue-950/30">
        <h2 className="text-lg font-semibold">Lägg till vän</h2>

        <form className="mt-4 flex gap-3">
          <input
            name="username"
            type="text"
            placeholder="användarnamn"
            required
            className="min-w-0 flex-1 rounded-lg border-2 border-zinc-700 bg-zinc-300 px-3 py-2 text-zinc-800 outline-none focus:border-amber-400"
          />

          <button
            formAction={sendFriendRequest}
            className="rounded-2xl bg-[#f9d142] font-black text-slate-950 shadow-lg shadow-yellow-950/30 hover:bg-[#ffe16a] active:scale-[0.99] px-4 py-2 text-sm"
          >
            Skicka
          </button>
        </form>
      </section>

      {incoming.length > 0 && (
        <section className="mt-6 rounded-2xl border-2 border-sky-900/60 bg-[#0e1b38]/90 shadow-lg shadow-sky-950/30 p-5">
          <h2 className="text-lg font-semibold">Vänförfrågningar</h2>

          <div className="mt-4 space-y-3">
            {incoming.map((friendship) => {
              const otherId = getOtherUserId(friendship, currentUserId);
              const profile = profiles.get(otherId);

              return (
                <div
                  key={friendship.id}
                  className="flex items-center justify-between rounded-xl border border-zinc-800 p-4"
                >
                  <span className="font-medium">
                    {profile?.username ?? "Okänd användare"}
                  </span>

                  <div className="flex gap-2">
                    <form>
                      <input
                        type="hidden"
                        name="friendshipId"
                        value={friendship.id}
                      />
                      <button
                        formAction={acceptFriendRequest}
                        className="rounded-lg bg-white px-3 py-2 text-sm text-black"
                      >
                        Acceptera
                      </button>
                    </form>

                    <form>
                      <input
                        type="hidden"
                        name="friendshipId"
                        value={friendship.id}
                      />
                      <button
                        formAction={declineFriendRequest}
                        className="rounded-lg border border-zinc-700 px-3 py-2 text-sm"
                      >
                        Neka
                      </button>
                    </form>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {outgoing.length > 0 && (
        <section className="mt-6 rounded-2xl border-2 border-sky-900/60 bg-[#0e1b38]/90 shadow-lg shadow-sky-950/30 p-5">
          <h2 className="text-lg font-semibold">Skickade förfrågningar</h2>

          <div className="mt-4 space-y-3">
            {outgoing.map((friendship) => {
              const otherId = getOtherUserId(friendship, currentUserId);
              const profile = profiles.get(otherId);

              return (
                <div
                  key={friendship.id}
                  className="rounded-xl border border-zinc-800 p-4"
                >
                  <span className="font-medium">
                    {profile?.username ?? "Okänd användare"}
                  </span>
                  <p className="mt-1 text-sm text-zinc-500">Väntar på svar</p>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <section className="mt-6 rounded-2xl border-2 border-sky-900/60 bg-[#0e1b38]/90 shadow-lg shadow-sky-950/30 p-5">
        <h2 className="text-lg font-semibold">Dina vänner</h2>

        {accepted.length === 0 ? (
          <p className="mt-4 text-sm text-zinc-500">
            Du har inga vänner tillagda ännu.
          </p>
        ) : (
          <div className="mt-4 space-y-3">
            {accepted.map((friendship) => {
              const otherId = getOtherUserId(friendship, currentUserId);
              const profile = profiles.get(otherId);
              const friendProgress = progressByUser.get(otherId);

              const foundCount = getFoundCount(friendProgress);
              const progressLabel = getProgressLabel(friendProgress);

              return (
                <div
                  key={friendship.id}
                  className="flex items-center justify-between rounded-xl border border-sky-800/60 p-4"
                >
                  <div>
                    <p className="font-medium">
                      {profile?.username ?? "Okänd användare"}
                    </p>
                    <p className="mt-1 text-sm text-zinc-500">
                      Nuvarande mål: {progressLabel}
                    </p>
                    <p className="mt-1 text-sm text-zinc-500">
                      Progress: {foundCount} / {LAST_TARGET}
                    </p>
                  </div>

                  <form>
                    <input
                      type="hidden"
                      name="friendshipId"
                      value={friendship.id}
                    />
                    <button
                      formAction={removeFriend}
                      className="rounded-xl border border-sky-400/40 bg-sky-950/30 px-4 py-2 text-sm text-sky-100 hover:bg-sky-900/50"
                    >
                      Ta bort
                    </button>
                  </form>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
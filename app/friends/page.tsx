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
import { ConfirmActionButton } from "@/components/confirm-action-button";
import Image from "next/image";


const DEFAULT_CHALLENGE_ID = process.env.SKYLTJAKTEN_DEFAULT_CHALLENGE_ID!;


const friendMessages: Record<string, string> = {
  friend_request_sent: "Vänförfrågan skickad.",
  friend_request_accepted: "Vänförfrågan accepterad.",
  friend_request_declined: "Vänförfrågan nekad.",
  friend_removed: "Vän borttagen.",
};

const friendErrors: Record<string, string> = {
  missing_username: "Ange ett användarnamn.",
  user_search_failed: "Kunde inte söka användare.",
  user_not_found: "Ingen användare hittades.",
  cannot_add_self: "Du kan inte lägga till dig själv.",
  already_friends: "Ni är redan vänner.",
  pending_request_exists: "Det finns redan en aktiv vänförfrågan.",
  send_failed: "Kunde inte skicka vänförfrågan.",
  missing_friend_request: "Saknar vänförfrågan.",
  accept_failed: "Kunde inte acceptera vänförfrågan.",
  decline_failed: "Kunde inte neka vänförfrågan.",
  missing_friendship: "Saknar vänskap.",
  remove_failed: "Kunde inte ta bort vän.",
};


/* #region -> types */

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
/* #endregion */

/* #region -> functions */

function getQueryText(
  value: string | undefined,
  map: Record<string, string>
): string | null {
  if (!value) return null;
  return map[value] ?? null;
}

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

/* #endregion */


/* #region -> Component */
export default async function FriendsPage({ searchParams }: FriendsPageProps) {
  const params = await searchParams;

  const errorText = getQueryText(params.error, friendErrors);
  const messageText = getQueryText(params.message, friendMessages);

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
    <main className="mx-auto min-h-screen w-sm md:w-xl lg:w-4xl max-w-3xl md:max-w-4xl px-6 py-10 text-slate-50">
      <header className="flex items-center h-fit justify-between border-b border-zinc-500 pb-4">
        <div className="flex flex-col gap-1 w-[50%]">
          <div className="relative mx-1 mb-1 w-24 h-24 md:w-48 md:h-48">
          
            <Image
              src="/logo.png"
              alt="Skyltjakten"            
              fill={true}
              />
            </div>
          <h1 className="text-2xl font-semibold">Vänner</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Lägg till vänner och se deras Skyltjakten-status.
          </p>
        </div>
        <div className="flex h-full flex-wrap w-[50%] justify-end">
          <Link
            href="/dashboard"
            className="relative rounded-xl h-fit border border-sky-400/40 bg-sky-950/30 px-4 py-2 text-sm text-sky-100 hover:bg-sky-900/50 hover:scale-[1.05] duration-300 active:bg-sky-400/30 active:scale-[0.97] active:duration-300"
          >
            Dashboard
          </Link>
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

      <section className="mt-6 rounded-3xl border border-sky-400/20 bg-[#0e1b38]/90 p-5 shadow-xl shadow-blue-950/30">
        <h2 className="text-lg font-semibold">Lägg till vän</h2>

        <form className="mt-4 flex gap-3">
          <input
            name="username"
            type="text"
            placeholder="användarnamn"
            required
            className="min-w-0 flex-1 rounded-lg border-2 border-zinc-700 bg-zinc-300 px-2 py-2 text-zinc-800 outline-none focus:border-amber-400"
          />

          <button
            formAction={sendFriendRequest}
            className="rounded-2xl bg-[#f9d142] font-black text-slate-950 shadow-lg shadow-yellow-950/30 hover:bg-[#ffe16a] px-4 py-2 text-sm hover:scale-[1.05] duration-300 active:scale-[0.97] active:duration-300"
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
                  className="flex items-center justify-between rounded-xl border border-sky-800/60 p-4"
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
                        className="rounded-lg bg-green-600/40 border-green-500/50 border px-3 py-2 text-sm text-black hover:bg-green-500/50 hover:scale-[1.05] duration-300 active:bg-green-400/60 active:scale-[0.97] active:duration-300"
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
                        className="rounded-lg border bg-red-950/40 border-red-700/50 px-3 py-2 text-sm hover:bg-red-800/40 hover:scale-[1.05] duration-300 active:bg-red-400/40 active:scale-[0.97] active:duration-300"
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
                  className="flex items-center justify-between rounded-xl border border-sky-800/60 p-4"
                >
                  <span className="font-medium">
                    {profile?.username ?? "Okänd användare"}
                  </span>
                  <p className="mt-1 text-md text-zinc-300">Väntar på svar</p>
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


                  <ConfirmActionButton
                    action={removeFriend}
                    title="Ta bort vän?"
                    description={`Vill du ta bort ${profile?.username ?? "den här användaren"} från din vänlista? Ni kommer inte längre se varandras status.`}
                    confirmLabel="Ja, ta bort"
                    variant="danger"
                    hiddenFields={{
                      friendshipId: friendship.id,
                    }}
                    buttonClassName="rounded-lg border bg-red-950/40 border-red-500/50 px-3 py-2 text-sm text-red-200 hover:bg-red-800/40 hover:scale-[1.05] duration-300 active:bg-red-400/50 active:scale-[0.97] active:duration-300"
                  >
                    Ta bort
                  </ConfirmActionButton>
                  {/*
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
                  </form>*/}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}

/* #endregion */
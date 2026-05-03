import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/admin/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { replaceUserSightings } from "@/app/admin/users/[userId]/import/actions";
import { AdminSightingsImportEditor } from "@/components/admin/admin-sightings-import-editor";

const DEFAULT_CHALLENGE_ID = process.env.SKYLTJAKTEN_DEFAULT_CHALLENGE_ID!;

type ImportPageProps = {
  params: Promise<{
    userId: string;
  }>;
  searchParams: Promise<{
    error?: string;
    message?: string;
  }>;
};

const messages: Record<string, string> = {
  imported: "Importen är sparad.",
};

const errors: Record<string, string> = {
  invalid_json: "Importdatan kunde inte läsas.",
  invalid_rows: "Raderna är ogiltiga.",
  invalid_target: "Minst ett nummer är ogiltigt.",
  non_contiguous_targets:
    "Numren måste vara sammanhängande från 001 utan luckor.",
  duplicate_target: "Samma nummer förekommer flera gånger.",
  invalid_date: "Minst ett datum är ogiltigt.",
  future_date: "Minst ett datum ligger i framtiden.",
  dates_not_in_order: "Datumen måste följa nummerordningen.",
  replace_failed: "Kunde inte ersätta användarens progress.",
};

function getQueryText(
  value: string | undefined,
  map: Record<string, string>
): string | null {
  if (!value) return null;
  return map[value] ?? null;
}

export default async function AdminUserImportPage({
  params,
  searchParams,
}: ImportPageProps) {
  await requireAdmin();

  const { userId } = await params;
  const query = await searchParams;

  const admin = createAdminClient();

  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("id, username")
    .eq("id", userId)
    .maybeSingle();

  if (profileError || !profile) {
    notFound();
  }

  const { data: sightingsRaw, error: sightingsError } = await admin
    .from("sightings")
    .select("id, target_pattern, found_at")
    .eq("user_id", userId)
    .eq("challenge_id", DEFAULT_CHALLENGE_ID)
    .order("step_index", { ascending: true });

  if (sightingsError) {
    throw new Error("Kunde inte läsa befintliga fynd.");
  }

  const initialRows = (sightingsRaw ?? []).map((row) => ({
    id: row.id,
    target: row.target_pattern,
    foundAt: row.found_at,
    source: "existing" as const,
  }));

  const errorText = getQueryText(query.error, errors);
  const messageText = getQueryText(query.message, messages);

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-6 py-10 text-slate-50">
      <header className="flex items-center justify-between border-b border-sky-900/60 pb-4">
        <div>
          <h1 className="text-2xl font-semibold">
            Importera/redigera: {profile.username}
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            Bygg en slutlig lista. När du sparar ersätts användarens befintliga
            progress.
          </p>
        </div>

        <Link
          href={`/admin/users/${userId}`}
          className="nav-button"
        >
          Tillbaka
        </Link>
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

      <AdminSightingsImportEditor
        targetUserId={userId}
        initialRows={initialRows}
        action={replaceUserSightings}
      />
    </main>
  );
}
import { redirect } from "next/navigation";
import { signOut } from "@/app/auth/actions";
import { createClient } from "@/lib/supabase/server";

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
}
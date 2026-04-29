import { signIn, signUp } from "@/app/auth/actions";

type LoginPageProps = {
  searchParams: Promise<{
    error?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6">
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-lg">
        <h1 className="text-2xl font-semibold text-white">Skyltjakten</h1>
        <p className="mt-2 text-sm text-zinc-400">
          Logga in eller skapa konto för att fortsätta.
        </p>

        {params.error && (
          <div className="mt-4 rounded-lg border border-red-800 bg-red-950 px-3 py-2 text-sm text-red-200">
            {decodeURIComponent(params.error)}
          </div>
        )}

        <form className="mt-6 flex flex-col gap-3">
          <label className="text-sm text-zinc-300">
            E-post
            <input
              name="email"
              type="email"
              required
              className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-white outline-none focus:border-zinc-400"
            />
          </label>

          <label className="text-sm text-zinc-300">
            Lösenord
            <input
              name="password"
              type="password"
              required
              minLength={6}
              className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-white outline-none focus:border-zinc-400"
            />
          </label>

          <div className="mt-3 grid grid-cols-2 gap-3">
            <button
              formAction={signIn}
              className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-black hover:bg-zinc-200"
            >
              Logga in
            </button>

            <button
              formAction={signUp}
              className="rounded-lg border border-zinc-700 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-900"
            >
              Skapa konto
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
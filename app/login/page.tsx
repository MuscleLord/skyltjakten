import { signIn, signUp } from "@/app/auth/actions";

type LoginPageProps = {
  searchParams: Promise<{
    error?: string;
    message?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl items-center justify-center px-6 py-10">
      <div className="grid w-full gap-6 md:grid-cols-2">
        <section className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
          <h1 className="text-2xl font-semibold text-white">Logga in</h1>
          <p className="mt-2 text-sm text-zinc-400">
            Fortsätt till Skyltjakten.
          </p>

          <form className="mt-6 flex flex-col gap-3">
            <label className="text-sm text-zinc-300">
              E-post
              <input
                name="email"
                type="email"
                required
                autoComplete="email"
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
                autoComplete="current-password"
                className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-white outline-none focus:border-zinc-400"
              />
            </label>

            <button
              formAction={signIn}
              className="mt-3 rounded-lg bg-white px-4 py-2 text-sm font-medium text-black hover:bg-zinc-200"
            >
              Logga in
            </button>
          </form>
        </section>

        <section className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6">
          <h2 className="text-2xl font-semibold text-white">Skapa konto</h2>
          <p className="mt-2 text-sm text-zinc-400">
            Välj användarnamn och bekräfta kontot via mejl.
          </p>

          {params.error && (
            <div className="mt-4 rounded-lg border border-red-800 bg-red-950 px-3 py-2 text-sm text-red-200">
              {decodeURIComponent(params.error)}
            </div>
          )}

          {params.message && (
            <div className="mt-4 rounded-lg border border-emerald-800 bg-emerald-950 px-3 py-2 text-sm text-emerald-200">
              {decodeURIComponent(params.message)}
            </div>
          )}

          <form className="mt-6 flex flex-col gap-3">
            <label className="text-sm text-zinc-300">
              Användarnamn
              <input
                name="username"
                type="text"
                required
                minLength={3}
                maxLength={24}
                pattern="[a-zA-Z0-9_]+"
                autoComplete="username"
                className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-white outline-none focus:border-zinc-400"
              />
            </label>

            <label className="text-sm text-zinc-300">
              E-post
              <input
                name="email"
                type="email"
                required
                autoComplete="email"
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
                autoComplete="new-password"
                className="mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-white outline-none focus:border-zinc-400"
              />
            </label>

            <button
              formAction={signUp}
              className="mt-3 rounded-lg border border-zinc-700 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-900"
            >
              Skapa konto
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
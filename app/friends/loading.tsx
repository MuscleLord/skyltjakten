export default function FriendsLoading() {
  return (
    <main className="mx-auto min-h-screen max-w-4xl px-6 py-10 text-slate-50">
      <div className="h-24 animate-pulse rounded-3xl bg-blue-950/40" />

      <section className="mt-8 rounded-3xl border border-sky-400/20 bg-[#0e1b38]/90 p-6">
        <div className="h-6 w-40 animate-pulse rounded bg-blue-900/60" />
        <div className="mx-auto mt-6 h-28 max-w-sm animate-pulse rounded-xl bg-slate-300/40" />
        <div className="mt-8 h-16 animate-pulse rounded-2xl bg-yellow-300/50" />
      </section>

      <section className="mt-6 grid gap-4 md:grid-cols-3">
        <div className="h-28 animate-pulse rounded-3xl bg-blue-950/50" />
        <div className="h-28 animate-pulse rounded-3xl bg-blue-950/50" />
        <div className="h-28 animate-pulse rounded-3xl bg-blue-950/50" />
      </section>
    </main>
  );
}
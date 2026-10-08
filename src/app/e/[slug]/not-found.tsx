export default function EventNotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-900 px-4">
      <div className="max-w-sm rounded-2xl bg-white p-8 text-center shadow-xl">
        <p className="text-4xl">🔗</p>
        <h1 className="mt-3 text-lg font-bold text-slate-900">This link is not valid</h1>
        <p className="mt-2 text-sm text-slate-500">
          The event may have been removed, or the link was copied incorrectly. Please ask the church for the link again.
        </p>
      </div>
    </main>
  );
}

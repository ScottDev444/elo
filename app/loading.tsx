export default function Loading() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-white px-6">
      <div className="mb-6 rounded-full bg-emerald-100 px-4 py-2 text-sm font-medium text-emerald-700">
        The Summer of ’26 🍦
      </div>

      <div className="h-14 w-14 animate-spin rounded-full border-4 border-neutral-200 border-t-emerald-600" />

      <p className="mt-6 text-sm text-neutral-500">
        Loading East Lothian...
      </p>
    </main>
  );
}
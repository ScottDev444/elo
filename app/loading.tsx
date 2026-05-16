export default function Loading() {
  return (
    <main className="flex h-screen w-screen items-center justify-center overflow-hidden bg-white px-6">
      <div className="flex flex-col items-center">
        <div className="mb-5 rounded-full bg-emerald-100 px-4 py-2 text-sm font-bold text-emerald-700">
          The Summer of ’26 🍦
        </div>

        <div className="h-14 w-14 animate-spin rounded-full border-4 border-neutral-200 border-t-emerald-600" />
      </div>
    </main>
  );
}
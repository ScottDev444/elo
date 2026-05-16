import SignInBox from "./SignInBox";

export default function AuthPage() {
  return (
    <main className="relative h-[100dvh] overflow-hidden bg-white px-5 text-zinc-950">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.08),transparent_45%)]" />

      <section className="relative z-10 mx-auto flex w-full max-w-[360px] flex-col pt-16">
        <div className="mb-6">
          <h1 className="text-2xl font-black tracking-[-0.035em]">
            Sign in to ELO.
          </h1>

          <p className="mt-2 text-sm leading-6 text-zinc-500">
            Access your account, saved posts and local tools.
          </p>
        </div>

        <SignInBox />
      </section>
    </main>
  );
}
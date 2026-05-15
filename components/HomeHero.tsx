export default function HomeHero() {
  return (
    <section className="relative mt-2 overflow-hidden rounded-[2rem] bg-black">
      <img
        src="/hero-east-lothian.png"
        alt=""
        className="h-[320px] w-full object-cover md:h-[420px]"
      />

      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />

      <div className="absolute inset-x-0 bottom-0 p-6 text-white md:p-10">
        <p className="mb-3 inline-flex rounded-full bg-white/15 px-3 py-1 text-xs font-medium backdrop-blur">
          The Summer of '26 🍦
        </p>

        <h1 className="max-w-3xl text-4xl font-black leading-none tracking-tight md:text-7xl">
          Summer starts here.
        </h1>

        <p className="mt-4 max-w-xl text-sm text-white/80 md:text-lg">
          Local events, deals and updates from across East Lothian.
        </p>
      </div>
    </section>
  );
}
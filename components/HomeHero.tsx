import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";

export default function HomeHero() {
  return (
    <section className="relative mt-2 min-h-[560px] overflow-hidden rounded-[2rem] bg-[#27b7dc] px-6 py-12 text-white md:min-h-[640px] md:px-16 md:py-16">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-20 -top-24 h-72 w-72 rounded-full bg-yellow-300/70 blur-3xl" />
        <div className="absolute right-0 -top-24 h-72 w-72 rounded-full bg-yellow-300/60 blur-3xl" />
        <div className="absolute -bottom-28 -left-24 h-72 w-72 rounded-full bg-[#f36d2d]" />
        <div className="absolute -bottom-48 -right-20 h-[430px] w-[430px] rounded-full bg-[#d9a73b]" />
      </div>

      <div className="relative z-10 mx-auto max-w-6xl">
        <div className="inline-flex items-center gap-2 rounded-full border-[3px] border-[#10245d] bg-[#ffe84a] px-5 py-3 text-xs font-black uppercase tracking-[0.18em] text-[#10245d] shadow-[7px_7px_0_#10245d]">
          <Sparkles size={15} />
          Live throughout August
        </div>

        <div className="mt-12 max-w-5xl">
          <h1
            className="text-[4rem] font-black uppercase leading-[0.8] tracking-[-0.07em] sm:text-[6rem] md:text-[8.5rem]"
            style={{ textShadow: "8px 8px 0 #10245d" }}
          >
            Summer
            <span className="block">
              Sessions
              <span className="ml-4 text-[#ff6425]">’26</span>
            </span>
          </h1>

          <p className="mt-10 max-w-2xl text-xl font-black leading-tight md:text-2xl">
            Live music, cold drinks and brilliant East Lothian nights.
          </p>

          <Link
            href="/summer-sessions"
            className="mt-8 inline-flex items-center gap-3 rounded-full border-[3px] border-[#10245d] bg-[#ff6425] px-7 py-4 text-base font-black text-white shadow-[8px_8px_0_#10245d] transition-transform hover:-translate-y-1"
          >
            Find your night
            <ArrowRight size={20} />
          </Link>
        </div>
      </div>
    </section>
  );
}
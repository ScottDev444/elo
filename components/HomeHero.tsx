import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";

export default function HomeHero() {
  return (
    <section className="relative mt-2 min-h-[500px] overflow-hidden rounded-[1.5rem] bg-[#27b7dc] px-5 py-8 text-white sm:min-h-[560px] sm:rounded-[2rem] sm:px-6 sm:py-12 md:min-h-[640px] md:px-16 md:py-16">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-28 -top-28 h-64 w-64 rounded-full bg-yellow-300/70 blur-3xl sm:-left-20 sm:-top-24 sm:h-72 sm:w-72" />
        <div className="absolute -right-24 -top-20 h-56 w-56 rounded-full bg-yellow-300/60 blur-3xl sm:right-0 sm:-top-24 sm:h-72 sm:w-72" />
        <div className="absolute -bottom-32 -left-32 h-64 w-64 rounded-full bg-[#f36d2d] sm:-bottom-28 sm:-left-24 sm:h-72 sm:w-72" />
        <div className="absolute -bottom-40 -right-40 h-80 w-80 rounded-full bg-[#d9a73b] sm:-bottom-48 sm:-right-20 sm:h-[430px] sm:w-[430px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-6xl">
        <div className="inline-flex items-center gap-2 rounded-full border-[3px] border-[#10245d] bg-[#ffe84a] px-4 py-2.5 text-[10px] font-black uppercase tracking-[0.14em] text-[#10245d] shadow-[5px_5px_0_#10245d] sm:px-5 sm:py-3 sm:text-xs sm:tracking-[0.18em] sm:shadow-[7px_7px_0_#10245d]">
          <Sparkles size={14} />
          Live throughout August
        </div>

        <div className="mt-10 max-w-5xl sm:mt-12">
          <h1
            className="text-[3.15rem] font-black uppercase leading-[0.82] tracking-[-0.07em] min-[390px]:text-[3.6rem] sm:text-[6rem] md:text-[8.5rem]"
            style={{ textShadow: "6px 6px 0 #10245d" }}
          >
            Summer

            <span className="block">Sessions</span>

            <span className="mt-2 block text-[#ff6425] sm:ml-4 sm:mt-0 sm:inline">
              ’26
            </span>
          </h1>

          <p className="mt-8 max-w-sm text-base font-black leading-tight sm:mt-10 sm:max-w-2xl sm:text-xl md:text-2xl">
            Live music, cold drinks and brilliant East Lothian nights.
          </p>

          <Link
            href="/summer-sessions"
            className="mt-7 inline-flex items-center gap-3 rounded-full border-[3px] border-[#10245d] bg-[#ff6425] px-6 py-3.5 text-sm font-black text-white shadow-[6px_6px_0_#10245d] transition-transform hover:-translate-y-1 sm:mt-8 sm:px-7 sm:py-4 sm:text-base sm:shadow-[8px_8px_0_#10245d]"
          >
            Find your night
            <ArrowRight size={20} />
          </Link>
        </div>
      </div>
    </section>
  );
}
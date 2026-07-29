"use client";

import Link from "next/link";
import {
  CalendarDays,
  MapPin,
  Plus,
  UserRound,
} from "lucide-react";

import HomeSearch from "./HomeSearch";

const quickActions = [
  {
    label: "Calendar",
    icon: CalendarDays,
    href: "/calendar",
  },
  {
    label: "Places",
    icon: MapPin,
    href: "/places",
  },
  {
    label: "Create",
    icon: Plus,
    href: "/create",
  },
  {
    label: "Profile",
    icon: UserRound,
    href: "/account",
  },
];

export default function HomeHero() {
  return (
    <section className="relative isolate w-full min-w-0 bg-emerald-700">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <svg
          className="absolute inset-0 h-full w-full opacity-35"
          viewBox="0 0 1440 800"
          preserveAspectRatio="xMidYMid slice"
          aria-hidden="true"
        >
          <polygon points="0,0 260,0 150,210" fill="#10b981" />
          <polygon points="260,0 500,0 370,190 150,210" fill="#059669" />
          <polygon points="500,0 760,0 650,230 370,190" fill="#047857" />
          <polygon points="760,0 1020,0 890,210 650,230" fill="#0d9488" />
          <polygon points="1020,0 1250,0 1160,190 890,210" fill="#059669" />
          <polygon points="1250,0 1440,0 1440,230 1160,190" fill="#10b981" />
          <polygon points="0,0 150,210 0,360" fill="#047857" />
          <polygon points="150,210 370,190 260,410 0,360" fill="#065f46" />
          <polygon points="370,190 650,230 510,430 260,410" fill="#10b981" />
          <polygon points="650,230 890,210 780,440 510,430" fill="#064e3b" />
          <polygon points="890,210 1160,190 1050,420 780,440" fill="#047857" />
          <polygon points="1160,190 1440,230 1440,430 1050,420" fill="#065f46" />
          <polygon points="0,360 260,410 120,620 0,570" fill="#059669" />
          <polygon points="260,410 510,430 390,650 120,620" fill="#047857" />
          <polygon points="510,430 780,440 650,670 390,650" fill="#065f46" />
          <polygon points="780,440 1050,420 920,650 650,670" fill="#10b981" />
          <polygon points="1050,420 1440,430 1260,640 920,650" fill="#047857" />
          <polygon points="0,570 120,620 0,800" fill="#064e3b" />
          <polygon points="120,620 390,650 260,800 0,800" fill="#047857" />
          <polygon points="390,650 650,670 540,800 260,800" fill="#059669" />
          <polygon points="650,670 920,650 820,800 540,800" fill="#065f46" />
          <polygon points="920,650 1260,640 1120,800 820,800" fill="#047857" />
          <polygon points="1260,640 1440,430 1440,800 1120,800" fill="#059669" />

          <g
            fill="none"
            stroke="rgba(255,255,255,0.12)"
            strokeWidth="2"
          >
            <polyline points="0,0 150,210 370,190 650,230 890,210 1160,190 1440,230" />
            <polyline points="0,360 260,410 510,430 780,440 1050,420 1440,430" />
            <polyline points="0,570 120,620 390,650 650,670 920,650 1260,640 1440,430" />
          </g>
        </svg>

        <div className="absolute inset-0 bg-gradient-to-b from-emerald-900/10 via-emerald-700/20 to-emerald-900/30" />
      </div>

      <div className="relative z-10 mx-auto flex min-h-[52vh] w-full max-w-6xl min-w-0 items-center px-4 py-10 sm:min-h-[68vh] sm:px-6 sm:py-20 lg:min-h-[72vh] lg:px-8">
        <div className="w-full min-w-0 text-center">
          <h1 className="mx-auto max-w-5xl text-4xl font-bold tracking-tight text-white sm:text-6xl lg:text-7xl">
            East Lothian Online
          </h1>

          <div className="relative z-50 mx-auto mt-6 w-full min-w-0 max-w-2xl sm:mt-10">
            <HomeSearch />
          </div>

          <div className="relative z-10 mx-auto mt-5 flex w-full min-w-0 flex-wrap items-start justify-center gap-2.5 sm:mt-7 sm:gap-6">
            {quickActions.map((action) => {
              const Icon = action.icon;

              return (
                <Link
                  key={action.label}
                  href={action.href}
                  className="group/action flex w-16 shrink-0 flex-col items-center gap-1.5 sm:gap-2"
                  aria-label={action.label}
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-full border border-white/30 bg-white/15 text-white shadow-md shadow-emerald-950/10 backdrop-blur-xl transition-all duration-300 group-hover/action:-translate-y-0.5 group-hover/action:border-white/60 group-hover/action:bg-white/25 sm:h-12 sm:w-12">
                    <Icon className="h-4.5 w-4.5 sm:h-5 sm:w-5" />
                  </span>

                  <span className="text-[10px] font-medium text-white/80 transition group-hover/action:text-white sm:text-[11px]">
                    {action.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
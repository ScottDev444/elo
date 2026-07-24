"use client";

import Link from "next/link";
import { motion } from "motion/react";
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
    href: "/profile",
  },
];

export default function HomeHero() {
  return (
    <section className="relative isolate w-full min-w-0 bg-emerald-700">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <motion.svg
          className="absolute inset-0 h-full w-full opacity-35"
          viewBox="0 0 1440 800"
          preserveAspectRatio="xMidYMid slice"
          aria-hidden="true"
          initial={{
            scale: 1.04,
            x: 0,
            y: 0,
          }}
          animate={{
            scale: [1.04, 1.07, 1.04],
            x: [0, -10, 0],
            y: [0, -6, 0],
          }}
          transition={{
            duration: 40,
            ease: "easeInOut",
            repeat: Infinity,
          }}
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
        </motion.svg>

        <div className="absolute inset-0 bg-gradient-to-b from-emerald-900/10 via-emerald-700/20 to-emerald-900/30" />

        <motion.div
          className="absolute -left-[40%] top-0 h-full w-[35%] skew-x-[-18deg] bg-gradient-to-r from-transparent via-white/10 to-transparent blur-2xl"
          animate={{
            x: ["0%", "450%"],
          }}
          transition={{
            duration: 3,
            delay: 5,
            repeat: Infinity,
            repeatDelay: 14,
            ease: "easeInOut",
          }}
        />
      </div>

      <div className="relative z-10 mx-auto flex min-h-[72vh] w-full max-w-6xl min-w-0 items-center px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
        <div className="w-full min-w-0 text-center">
          <motion.h1
            className="mx-auto max-w-5xl text-4xl font-bold tracking-tight text-white sm:text-6xl lg:text-7xl"
            initial={{
              opacity: 0,
              y: 22,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            transition={{
              duration: 0.65,
              ease: [0.22, 1, 0.36, 1],
            }}
          >
            East Lothian Online
          </motion.h1>

          <motion.div
            className="relative z-50 mx-auto mt-8 w-full min-w-0 max-w-2xl sm:mt-10"
            initial={{
              opacity: 0,
              y: 16,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            transition={{
              duration: 0.55,
              delay: 0.15,
              ease: [0.22, 1, 0.36, 1],
            }}
          >
            <HomeSearch />
          </motion.div>

          <motion.div
            className="relative z-10 mx-auto mt-7 flex w-full min-w-0 flex-wrap items-start justify-center gap-3 sm:gap-6"
            initial={{
              opacity: 0,
              y: 10,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            transition={{
              duration: 0.5,
              delay: 0.3,
              ease: [0.22, 1, 0.36, 1],
            }}
          >
            {quickActions.map((action) => {
              const Icon = action.icon;

              return (
                <Link
                  key={action.label}
                  href={action.href}
                  className="group/action flex w-16 shrink-0 flex-col items-center gap-2"
                  aria-label={action.label}
                >
                  <span className="flex h-11 w-11 items-center justify-center rounded-full border border-white/30 bg-white/15 text-white shadow-md shadow-emerald-950/10 backdrop-blur-xl transition-all duration-300 group-hover/action:-translate-y-0.5 group-hover/action:border-white/60 group-hover/action:bg-white/25 sm:h-12 sm:w-12">
                    <Icon className="h-5 w-5" />
                  </span>

                  <span className="text-[11px] font-medium text-white/80 transition group-hover/action:text-white">
                    {action.label}
                  </span>
                </Link>
              );
            })}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
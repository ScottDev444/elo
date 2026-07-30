"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "motion/react";
import { Mail, MapPin, ShieldCheck } from "lucide-react";
import { FaFacebookF, FaInstagram } from "react-icons/fa6";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="relative isolate overflow-hidden bg-emerald-700 text-white">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <motion.svg
          className="absolute inset-0 h-full w-full opacity-35"
          viewBox="0 0 1440 800"
          preserveAspectRatio="xMidYMid slice"
          aria-hidden="true"
          initial={{ scale: 1.04, x: 0, y: 0 }}
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

          <polygon
            points="260,0 500,0 370,190 150,210"
            fill="#059669"
          />

          <polygon
            points="500,0 760,0 650,230 370,190"
            fill="#047857"
          />

          <polygon
            points="760,0 1020,0 890,210 650,230"
            fill="#0d9488"
          />

          <polygon
            points="1020,0 1250,0 1160,190 890,210"
            fill="#059669"
          />

          <polygon
            points="1250,0 1440,0 1440,230 1160,190"
            fill="#10b981"
          />

          <polygon points="0,0 150,210 0,360" fill="#047857" />

          <polygon
            points="150,210 370,190 260,410 0,360"
            fill="#065f46"
          />

          <polygon
            points="370,190 650,230 510,430 260,410"
            fill="#10b981"
          />

          <polygon
            points="650,230 890,210 780,440 510,430"
            fill="#064e3b"
          />

          <polygon
            points="890,210 1160,190 1050,420 780,440"
            fill="#047857"
          />

          <polygon
            points="1160,190 1440,230 1440,430 1050,420"
            fill="#065f46"
          />

          <polygon
            points="0,360 260,410 120,620 0,570"
            fill="#059669"
          />

          <polygon
            points="260,410 510,430 390,650 120,620"
            fill="#047857"
          />

          <polygon
            points="510,430 780,440 650,670 390,650"
            fill="#065f46"
          />

          <polygon
            points="780,440 1050,420 920,650 650,670"
            fill="#10b981"
          />

          <polygon
            points="1050,420 1440,430 1260,640 920,650"
            fill="#047857"
          />

          <polygon
            points="0,570 120,620 0,800"
            fill="#064e3b"
          />

          <polygon
            points="120,620 390,650 260,800 0,800"
            fill="#047857"
          />

          <polygon
            points="390,650 650,670 540,800 260,800"
            fill="#059669"
          />

          <polygon
            points="650,670 920,650 820,800 540,800"
            fill="#065f46"
          />

          <polygon
            points="920,650 1260,640 1120,800 820,800"
            fill="#047857"
          />

          <polygon
            points="1260,640 1440,430 1440,800 1120,800"
            fill="#059669"
          />

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

        <div className="absolute inset-0 bg-gradient-to-b from-emerald-900/20 via-emerald-700/30 to-emerald-950/70" />

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

      <div className="relative z-10 mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-16">
        <div className="grid gap-10 lg:grid-cols-[1.4fr_1fr_1fr]">
          <motion.div
            initial={{
              opacity: 0,
              y: 18,
            }}
            whileInView={{
              opacity: 1,
              y: 0,
            }}
            viewport={{
              once: true,
              amount: 0.25,
            }}
            transition={{
              duration: 0.55,
              ease: [0.22, 1, 0.36, 1],
            }}
          >
            <Link
              href="/"
              className="inline-flex items-center gap-3"
            >
              <Image
                src="/logo-new.png"
                alt="East Lothian Online"
                width={48}
                height={48}
                className="h-12 w-12 rounded-xl object-contain"
              />

              <div>
                <p className="text-xl font-bold tracking-tight text-white">
                  East Lothian Online
                </p>

                <p className="text-xs font-medium uppercase tracking-[0.2em] text-white/65">
                  Your Community's Digital Home
                </p>
              </div>
            </Link>

            <p className="mt-5 max-w-md text-sm leading-6 text-white/70">
              East Lothian Online is the first Community of Atlas — building a world where you'll always know what's happening locally, wherever you go.

Atlas — The World in Your Pocket.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <a
                href="https://www.instagram.com/eastlothian.online"
                target="_blank"
                rel="noreferrer"
                aria-label="Instagram"
                className="flex h-11 w-11 items-center justify-center rounded-full border border-white/25 bg-white/15 text-white shadow-md shadow-emerald-950/10 backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-white/50 hover:bg-white/25"
              >
                <FaInstagram className="h-5 w-5" />
              </a>

              <a
                href="https://www.facebook.com/eastlothian.online"
                target="_blank"
                rel="noreferrer"
                aria-label="Facebook"
                className="flex h-11 w-11 items-center justify-center rounded-full border border-white/25 bg-white/15 text-white shadow-md shadow-emerald-950/10 backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-white/50 hover:bg-white/25"
              >
                <FaFacebookF className="h-5 w-5" />
              </a>

              <a
                href="mailto:eastlothian.online@outlook.com"
                aria-label="Email East Lothian Online"
                className="flex h-11 w-11 items-center justify-center rounded-full border border-white/25 bg-white/15 text-white shadow-md shadow-emerald-950/10 backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-white/50 hover:bg-white/25"
              >
                <Mail className="h-5 w-5" />
              </a>
            </div>
          </motion.div>

          <motion.div
            initial={{
              opacity: 0,
              y: 18,
            }}
            whileInView={{
              opacity: 1,
              y: 0,
            }}
            viewport={{
              once: true,
              amount: 0.25,
            }}
            transition={{
              duration: 0.55,
              delay: 0.08,
              ease: [0.22, 1, 0.36, 1],
            }}
          >
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-white">
              East Lothian Online
            </p>

            <div className="mt-5 space-y-3">
              <Link
                href="/about"
                className="block text-sm text-white/65 transition hover:translate-x-1 hover:text-white"
              >
                About us
              </Link>

              <Link
                href="/local-partnership"
                className="block text-sm text-white/65 transition hover:translate-x-1 hover:text-white"
              >
                Local Partnership
              </Link>

              <Link
                href="/create-page"
                className="block text-sm text-white/65 transition hover:translate-x-1 hover:text-white"
              >
                Create a page
              </Link>

              <a
                href="mailto:eastlothian.online@outlook.com"
                className="block break-all text-sm text-white/65 transition hover:translate-x-1 hover:text-white"
              >
                eastlothian.online@outlook.com
              </a>
            </div>
          </motion.div>

          <motion.div
            initial={{
              opacity: 0,
              y: 18,
            }}
            whileInView={{
              opacity: 1,
              y: 0,
            }}
            viewport={{
              once: true,
              amount: 0.25,
            }}
            transition={{
              duration: 0.55,
              delay: 0.16,
              ease: [0.22, 1, 0.36, 1],
            }}
          >
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-white">
              Information
            </p>

            <div className="mt-5 space-y-3">
              <Link
                href="/privacy"
                className="block text-sm text-white/65 transition hover:translate-x-1 hover:text-white"
              >
                Privacy policy
              </Link>

              <Link
                href="/terms"
                className="block text-sm text-white/65 transition hover:translate-x-1 hover:text-white"
              >
                Terms of use
              </Link>

              <Link
                href="/community-guidelines"
                className="block text-sm text-white/65 transition hover:translate-x-1 hover:text-white"
              >
                Community guidelines
              </Link>

              <Link
                href="/accessibility"
                className="block text-sm text-white/65 transition hover:translate-x-1 hover:text-white"
              >
                Accessibility
              </Link>
            </div>
          </motion.div>
        </div>

        <div className="my-10 h-px bg-white/20" />

        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-white/55">
            <span>© {currentYear} East Lothian Online</span>

            <span className="inline-flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5" />
              Built in East Lothian
            </span>

            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5" />
              Independent
            </span>
          </div>

          <p className="text-xs font-semibold tracking-wide text-white/55">
            East Lothian Online — Your Communities Digital Home.
          </p>
        </div>
      </div>
    </footer>
  );
}
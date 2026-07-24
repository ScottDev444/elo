"use client";

import Link from "next/link";
import { motion } from "motion/react";
import {
  ArrowUpRight,
  Clock3,
  MapPin,
  Navigation,
  Sparkles,
} from "lucide-react";

type OpeningHours = Record<
  string,
  {
    open?: string;
    close?: string;
    closed?: boolean;
  }
>;

type PlacePostProps = {
  id: string;
  title: string;
  description?: string | null;
  location_name?: string | null;
  address?: string | null;
  postcode?: string | null;
  images?: string[] | null;
  tags?: string[] | null;
  opening_hours?: OpeningHours | null;
  is_24_7?: boolean | null;
  slug?: string | null;
};

const dayNames = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

function getTodayHours(
  openingHours?: OpeningHours | null,
  isTwentyFourSeven?: boolean | null
) {
  if (isTwentyFourSeven) {
    return {
      label: "Open 24 hours",
      isOpen: true,
    };
  }

  if (!openingHours) {
    return {
      label: "Hours unavailable",
      isOpen: false,
    };
  }

  const today = dayNames[new Date().getDay()];
  const hours = openingHours[today];

  if (!hours || hours.closed) {
    return {
      label: "Closed today",
      isOpen: false,
    };
  }

  if (!hours.open || !hours.close) {
    return {
      label: "Hours unavailable",
      isOpen: false,
    };
  }

  return {
    label: `${hours.open} – ${hours.close}`,
    isOpen: true,
  };
}

export default function PlacePost({
  id,
  title,
  description,
  location_name,
  address,
  postcode,
  images,
  tags,
  opening_hours,
  is_24_7,
  slug,
}: PlacePostProps) {
  const image = images?.[0];
  const todayHours = getTodayHours(opening_hours, is_24_7);

  const href = slug ? `/places/${slug}` : `/places/${id}`;

  const directionsQuery = encodeURIComponent(
    [address, postcode].filter(Boolean).join(", ")
  );

  return (
    <motion.article
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.45, ease: "easeOut" }}
      whileHover={{ y: -4 }}
      className="group overflow-hidden rounded-[2rem] bg-white shadow-[0_18px_60px_rgba(15,23,42,0.08)] ring-1 ring-black/5"
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500">
        {image ? (
          <motion.img
            src={image}
            alt={title}
            className="h-full w-full object-cover"
            whileHover={{ scale: 1.045 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <span className="text-6xl">🌍</span>
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-slate-950/10 to-transparent" />

        <div className="absolute left-4 top-4 flex items-center gap-2">
          <span
            className={`flex items-center gap-2 rounded-full px-3 py-2 text-xs font-bold shadow-lg backdrop-blur-xl ${
              todayHours.isOpen
                ? "bg-emerald-500 text-white"
                : "bg-white/90 text-slate-700"
            }`}
          >
            <span
              className={`h-2 w-2 rounded-full ${
                todayHours.isOpen ? "bg-white" : "bg-slate-400"
              }`}
            />

            {todayHours.isOpen ? "Open Now" : "Closed Today"}
          </span>
        </div>

        <Link
          href={href}
          aria-label={`View ${title}`}
          className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full bg-white/90 text-slate-900 shadow-lg backdrop-blur-xl transition hover:scale-105 hover:bg-white"
        >
          <ArrowUpRight className="h-5 w-5" />
        </Link>

        <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6">
          {location_name && (
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-white/80">
              <MapPin className="h-4 w-4" />
              <span>{location_name}</span>
            </div>
          )}

          <h2 className="text-2xl font-black tracking-tight text-white sm:text-3xl">
            {title}
          </h2>
        </div>
      </div>

      <div className="p-5 sm:p-6">
        {tags && tags.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-2">
            {tags.slice(0, 4).map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {description && (
          <p className="line-clamp-3 text-sm leading-6 text-slate-600">
            {description}
          </p>
        )}

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="flex items-center gap-3 rounded-2xl bg-slate-50 p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-emerald-600 shadow-sm">
              <Clock3 className="h-5 w-5" />
            </div>

            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Today
              </p>
              <p className="truncate text-sm font-bold text-slate-900">
                {todayHours.label}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-2xl bg-slate-50 p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-emerald-600 shadow-sm">
              <MapPin className="h-5 w-5" />
            </div>

            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Location
              </p>
              <p className="truncate text-sm font-bold text-slate-900">
                {[address, postcode].filter(Boolean).join(", ") ||
                  "Location unavailable"}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-5 flex gap-3">
          <Link
            href={href}
            className="flex flex-1 items-center justify-center gap-2 rounded-full bg-slate-950 px-5 py-3 text-sm font-bold text-white transition hover:bg-emerald-600"
          >
            View Place
          </Link>

          {directionsQuery && (
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${directionsQuery}`}
              target="_blank"
              rel="noreferrer"
              aria-label={`Get directions to ${title}`}
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-700 transition hover:bg-emerald-100"
            >
              <Navigation className="h-5 w-5" />
            </a>
          )}
        </div>
      </div>
    </motion.article>
  );
}
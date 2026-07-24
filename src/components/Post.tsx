"use client";

import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  MapPin,
  UserRound,
} from "lucide-react";

type PostProps = {
  title: string;
  description: string;
  href: string;

  date?: string;
  dates?: string[];
  postedBy?: string;
  location?: string;

  category?: string;
  colour?: "emerald" | "red" | "amber" | "blue";

  featured?: boolean;
};

const colours = {
  emerald: "bg-emerald-100 text-emerald-700",
  red: "bg-red-100 text-red-700",
  amber: "bg-amber-100 text-amber-700",
  blue: "bg-sky-100 text-sky-700",
};

function getLocalDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(
    2,
    "0",
  );
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function parseDateKey(dateKey: string) {
  const [year, month, day] = dateKey
    .split("-")
    .map(Number);

  if (!year || !month || !day) {
    return null;
  }

  const date = new Date(year, month - 1, day);

  return Number.isNaN(date.getTime()) ? null : date;
}

function getTomorrowDateKey() {
  const tomorrow = new Date();

  tomorrow.setDate(tomorrow.getDate() + 1);

  return getLocalDateKey(tomorrow);
}

function getWeekendWindow() {
  const today = new Date();

  today.setHours(0, 0, 0, 0);

  const dayOfWeek = today.getDay();
  const saturday = new Date(today);
  const sunday = new Date(today);

  if (dayOfWeek === 6) {
    sunday.setDate(today.getDate() + 1);
  } else if (dayOfWeek === 0) {
    saturday.setDate(today.getDate() - 1);
  } else {
    saturday.setDate(
      today.getDate() + (6 - dayOfWeek),
    );

    sunday.setDate(saturday.getDate() + 1);
  }

  saturday.setHours(0, 0, 0, 0);
  sunday.setHours(23, 59, 59, 999);

  return {
    start: saturday,
    end: sunday,
  };
}

function isThisWeekend(dateKey: string) {
  const date = parseDateKey(dateKey);

  if (!date) {
    return false;
  }

  const weekend = getWeekendWindow();

  return (
    date.getTime() >= weekend.start.getTime() &&
    date.getTime() <= weekend.end.getTime()
  );
}

function normaliseDates(
  date?: string,
  dates?: string[],
) {
  const combinedDates = [
    ...(Array.isArray(dates) ? dates : []),
    ...(date ? [date] : []),
  ];

  return Array.from(new Set(combinedDates))
    .filter((dateKey) => parseDateKey(dateKey))
    .sort((a, b) => a.localeCompare(b));
}

function getDateTags(
  date?: string,
  dates?: string[],
) {
  const activeDates = normaliseDates(date, dates);

  if (activeDates.length === 0) {
    return [];
  }

  const tags: string[] = [];
  const todayKey = getLocalDateKey();
  const tomorrowKey = getTomorrowDateKey();

  if (activeDates.includes(todayKey)) {
    tags.push("Today");
  } else if (activeDates.includes(tomorrowKey)) {
    tags.push("Tomorrow");
  } else if (
    activeDates.some((dateKey) =>
      isThisWeekend(dateKey),
    )
  ) {
    tags.push("This Weekend");
  }

  if (activeDates.length > 1) {
    tags.push(`${activeDates.length} Dates`);
  }

  return tags;
}

export default function Post({
  title,
  description,
  href,
  date,
  dates,
  postedBy,
  location,
  category = "Post",
  colour = "emerald",
  featured = false,
}: PostProps) {
  const dateTags = getDateTags(date, dates);

  return (
    <Link
      href={href}
      className={`group block overflow-hidden rounded-3xl border border-slate-200 bg-white transition-all duration-300 hover:-translate-y-1 hover:border-emerald-300 hover:shadow-xl ${
        featured
          ? "ring-2 ring-emerald-500/20"
          : ""
      }`}
    >
      <div className="p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${colours[colour]}`}
            >
              {category}
            </span>

            {dateTags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700"
              >
                {tag}
              </span>
            ))}
          </div>

          <ArrowRight className="h-5 w-5 shrink-0 text-slate-300 transition duration-300 group-hover:translate-x-1 group-hover:text-emerald-600" />
        </div>

        <h2 className="mt-5 text-2xl font-bold tracking-tight text-slate-900">
          {title}
        </h2>

        {description && (
          <p className="mt-3 line-clamp-3 leading-7 text-slate-600">
            {description}
          </p>
        )}

        {(date || postedBy || location) && (
          <div className="mt-6 flex flex-wrap gap-x-5 gap-y-3 text-sm text-slate-500">
            {date && (
              <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 shrink-0" />
                <span>{date}</span>
              </div>
            )}

            {postedBy && (
              <div className="flex items-center gap-2">
                <UserRound className="h-4 w-4 shrink-0" />
                <span>Posted by {postedBy}</span>
              </div>
            )}

            {location && (
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 shrink-0" />
                <span>{location}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </Link>
  );
}
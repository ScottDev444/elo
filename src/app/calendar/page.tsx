"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  LoaderCircle,
  MapPin,
  Search,
  X,
} from "lucide-react";

import SiteHeader from "@/components/SiteHeader";
import Footer from "@/components/Footer";
import { createClient } from "@/lib/supabase/client";

type CalendarCategory = "Event" | "Deal";

type PostMetadata = {
  public_type?: string | null;
  active_dates?: string[] | null;
  location?: string | null;
  deal_kind?: string | null;
  deal_price?: string | null;
};

type DatabasePost = {
  id: string;
  group_id: string | null;
  title: string;
  type: string;
  event_start: string | null;
  event_end: string | null;
  expires_at: string | null;
  metadata: PostMetadata | null;
};

type DatabaseGroup = {
  id: string;
  name: string | null;
};

type CalendarItem = {
  id: string;
  title: string;
  date: string;
  time: string | null;
  location: string | null;
  postedBy: string | null;
  category: CalendarCategory;
  href: string;
};

const monthNames = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const weekdayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function toLocalDateKey(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function parseDateKey(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day, 12, 0, 0);
}

function getMonthGrid(year: number, month: number) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startOffset = (firstDay.getDay() + 6) % 7;
  const totalCells = Math.ceil((startOffset + lastDay.getDate()) / 7) * 7;

  return Array.from({ length: totalCells }, (_, index) => {
    const dayNumber = index - startOffset + 1;
    return new Date(year, month, dayNumber);
  });
}

function getCategory(post: DatabasePost): CalendarCategory | null {
  const value = (
    post.metadata?.public_type ||
    post.type ||
    ""
  ).toLowerCase();

  if (value.includes("alert")) {
    return null;
  }

  if (value.includes("deal")) {
    return "Deal";
  }

  if (value.includes("event")) {
    return "Event";
  }

  return null;
}

function formatTime(value: string | null) {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function buildCalendarItems(
  posts: DatabasePost[],
  groupNames: Map<string, string>
) {
  const items: CalendarItem[] = [];

  posts.forEach((post) => {
    const category = getCategory(post);

    if (!category) {
      return;
    }

    const activeDates = post.metadata?.active_dates?.filter(Boolean) ?? [];

    if (activeDates.length > 0) {
      activeDates.forEach((date) => {
        items.push({
          id: `${post.id}-${date}`,
          title: post.title,
          date,
          time: formatTime(post.event_start),
          location: post.metadata?.location ?? null,
          postedBy: post.group_id
            ? groupNames.get(post.group_id) ?? null
            : null,
          category,
          href: `/posts/${post.id}`,
        });
      });

      return;
    }

    if (post.event_start) {
      const start = new Date(post.event_start);

      if (!Number.isNaN(start.getTime())) {
        items.push({
          id: post.id,
          title: post.title,
          date: toLocalDateKey(start),
          time: formatTime(post.event_start),
          location: post.metadata?.location ?? null,
          postedBy: post.group_id
            ? groupNames.get(post.group_id) ?? null
            : null,
          category,
          href: `/posts/${post.id}`,
        });
      }
    }
  });

  return items.sort((a, b) => {
    const dateCompare = a.date.localeCompare(b.date);

    if (dateCompare !== 0) {
      return dateCompare;
    }

    return (a.time ?? "23:59").localeCompare(b.time ?? "23:59");
  });
}

export default function CalendarPage() {
  const today = useMemo(() => new Date(), []);
  const todayKey = useMemo(() => toLocalDateKey(today), [today]);

  const [visibleMonth, setVisibleMonth] = useState(
    new Date(today.getFullYear(), today.getMonth(), 1)
  );
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [posts, setPosts] = useState<DatabasePost[]>([]);
  const [groupNames, setGroupNames] = useState<Map<string, string>>(
    new Map()
  );
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    async function loadPosts() {
      setLoading(true);
      setLoadError(null);

      const { data, error } = await supabase
        .from("posts")
        .select(
          "id, group_id, title, type, event_start, event_end, expires_at, metadata"
        )
        .order("event_start", { ascending: true, nullsFirst: false });

      if (cancelled) {
        return;
      }

      if (error) {
        console.error("Failed to load calendar posts:", error);
        setLoadError("The calendar could not be loaded.");
        setPosts([]);
        setLoading(false);
        return;
      }

      const databasePosts = (data as DatabasePost[] | null) ?? [];
      const groupIds = Array.from(
        new Set(
          databasePosts
            .map((post) => post.group_id)
            .filter((groupId): groupId is string => Boolean(groupId))
        )
      );

      const names = new Map<string, string>();

      if (groupIds.length > 0) {
        const { data: groupsData, error: groupsError } = await supabase
          .from("groups")
          .select("id, name")
          .in("id", groupIds);

        if (groupsError) {
          console.error("Failed to load post authors:", groupsError);
        } else {
          for (const group of (groupsData ?? []) as DatabaseGroup[]) {
            if (group.name) {
              names.set(group.id, group.name);
            }
          }
        }
      }

      if (cancelled) {
        return;
      }

      setPosts(databasePosts);
      setGroupNames(names);
      setLoading(false);
    }

    void loadPosts();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!selectedDate) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setSelectedDate(null);
      }
    }

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [selectedDate]);

  const monthGrid = useMemo(
    () =>
      getMonthGrid(visibleMonth.getFullYear(), visibleMonth.getMonth()),
    [visibleMonth]
  );

  const calendarItems = useMemo(
    () => buildCalendarItems(posts, groupNames),
    [posts, groupNames]
  );

  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return calendarItems.filter((item) => {
      if (item.date < todayKey) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      const searchValue = [
        item.title,
        item.location,
        item.category,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchValue.includes(normalizedQuery);
    });
  }, [calendarItems, query, todayKey]);

  const eventsByDate = useMemo(() => {
    const grouped = new Map<string, CalendarItem[]>();

    filteredItems.forEach((item) => {
      const existing = grouped.get(item.date) ?? [];
      existing.push(item);
      grouped.set(item.date, existing);
    });

    return grouped;
  }, [filteredItems]);

  const selectedItems = selectedDate
    ? eventsByDate.get(selectedDate) ?? []
    : [];

  function changeMonth(offset: number) {
    setVisibleMonth(
      new Date(
        visibleMonth.getFullYear(),
        visibleMonth.getMonth() + offset,
        1
      )
    );
  }

  function jumpToToday() {
    setVisibleMonth(new Date(today.getFullYear(), today.getMonth(), 1));
    setSelectedDate(todayKey);
  }

  return (
    <div className="min-h-screen bg-white text-slate-950">
      <SiteHeader />

      <main className="w-full">
        <section className="border-b border-slate-200 bg-white px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-4xl font-black tracking-tight sm:text-5xl">
                👋 What’s happening in East Lothian?
              </h1>

              <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
                Explore events and deals happening across East Lothian.
              </p>

              <Link
                href="/places"
                className="mt-5 inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 font-black text-white transition hover:bg-emerald-800"
              >
                <MapPin className="h-5 w-5" />
                Explore Places
              </Link>
            </div>

            <label className="relative block w-full lg:max-w-md">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search the calendar"
                className="h-13 w-full rounded-xl border border-slate-300 bg-white pl-12 pr-12 text-base outline-none transition focus:border-slate-950"
              />

              {query ? (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-950"
                  aria-label="Clear search"
                >
                  <X className="h-5 w-5" />
                </button>
              ) : null}
            </label>
          </div>
        </section>

        <section className="w-full px-3 py-6 sm:px-6 lg:px-8 lg:py-8">
          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-emerald-800 bg-emerald-700 px-3 py-4 text-white sm:px-6 lg:px-8">
            <button
              type="button"
              onClick={() => changeMonth(-1)}
              className="grid h-11 w-11 place-items-center rounded-xl border border-white/30 bg-white/10 transition hover:bg-white/20"
              aria-label="Previous month"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>

            <div className="text-center">
              <h2 className="text-xl font-black sm:text-2xl lg:text-3xl">
                {monthNames[visibleMonth.getMonth()]}{" "}
                {visibleMonth.getFullYear()}
              </h2>

              <button
                type="button"
                onClick={jumpToToday}
                className="mt-1 text-sm font-bold text-emerald-100 transition hover:text-white"
              >
                Today
              </button>
            </div>

            <button
              type="button"
              onClick={() => changeMonth(1)}
              className="grid h-11 w-11 place-items-center rounded-xl border border-white/30 bg-white/10 transition hover:bg-white/20"
              aria-label="Next month"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>

          {loading ? (
            <div className="grid min-h-[60vh] place-items-center">
              <div className="flex items-center gap-3 font-bold text-slate-600">
                <LoaderCircle className="h-5 w-5 animate-spin" />
                Loading calendar
              </div>
            </div>
          ) : loadError ? (
            <div className="grid min-h-[60vh] place-items-center px-4 text-center">
              <div>
                <CalendarDays className="mx-auto h-9 w-9 text-slate-400" />
                <p className="mt-4 text-lg font-black">{loadError}</p>
                <p className="mt-2 text-sm text-slate-500">
                  Please refresh the page and try again.
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
                {weekdayNames.map((day) => (
                  <div
                    key={day}
                    className="py-3 text-center text-[10px] font-black uppercase tracking-wider text-slate-500 sm:text-xs lg:text-sm"
                  >
                    <span className="sm:hidden">{day.slice(0, 1)}</span>
                    <span className="hidden sm:inline">{day}</span>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7">
                {monthGrid.map((date) => {
                  const dateKey = toLocalDateKey(date);
                  const isCurrentMonth =
                    date.getMonth() === visibleMonth.getMonth();
                  const isToday = dateKey === todayKey;
                  const isPast = dateKey < todayKey;
                  const isNextMonth =
                    !isCurrentMonth &&
                    date >
                      new Date(
                        visibleMonth.getFullYear(),
                        visibleMonth.getMonth() + 1,
                        0
                      );
                  const dateItems = eventsByDate.get(dateKey) ?? [];
                  const eventCount = dateItems.filter(
                    (item) => item.category === "Event"
                  ).length;
                  const dealCount = dateItems.filter(
                    (item) => item.category === "Deal"
                  ).length;

                  return (
                    <button
                      key={dateKey}
                      type="button"
                      onClick={() => {
                        if (!isPast) {
                          setSelectedDate(dateKey);
                        }
                      }}
                      disabled={isPast}
                      className={`relative min-h-[82px] border-b border-r border-slate-200 p-1.5 text-left transition sm:min-h-32 sm:p-3 lg:min-h-40 lg:p-4 ${
                        isPast
                          ? "cursor-default"
                          : "cursor-pointer hover:bg-slate-50"
                      } ${
                        isCurrentMonth
                          ? "bg-white"
                          : "bg-slate-50 text-slate-400"
                      }`}
                      aria-label={`Open ${date.toLocaleDateString("en-GB", {
                        weekday: "long",
                        day: "numeric",
                        month: "long",
                      })}`}
                    >
                      <div className="flex items-start justify-between gap-1">
                        <span
                          className={`grid h-7 w-7 place-items-center rounded-full text-sm font-black sm:h-8 sm:w-8 ${
                            isToday
                              ? "bg-emerald-700 text-white"
                              : "text-current"
                          }`}
                        >
                          {date.getDate()}
                        </span>

                        {isPast ? (
                          <span
                            className="grid h-7 w-7 place-items-center rounded-full bg-emerald-100 text-lg font-black text-emerald-700 sm:h-8 sm:w-8 sm:text-xl"
                            aria-label="Day complete"
                          >
                            ✓
                          </span>
                        ) : isNextMonth ? (
                          <span
                            className="grid h-7 w-7 place-items-center rounded-full bg-slate-200 text-lg font-black text-slate-500 sm:h-8 sm:w-8 sm:text-xl"
                            aria-label="Next month"
                          >
                            ×
                          </span>
                        ) : null}
                      </div>

                      <div className="mt-2 hidden space-y-1.5 sm:block">
                        {dateItems.slice(0, 3).map((item) => (
                          <div
                            key={item.id}
                            className={`truncate rounded-md px-2 py-1 text-xs font-bold ${
                              item.category === "Deal"
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-sky-100 text-sky-800"
                            }`}
                          >
                            {item.title}
                          </div>
                        ))}

                        {dateItems.length > 3 ? (
                          <div className="text-xs font-bold text-slate-500">
                            +{dateItems.length - 3} more
                          </div>
                        ) : null}
                      </div>

                      {dateItems.length > 0 ? (
                        <div className="absolute bottom-2 left-1.5 flex items-center gap-1 sm:hidden">
                          {eventCount > 0 ? (
                            <span className="h-2 w-2 rounded-full bg-sky-500" />
                          ) : null}

                          {dealCount > 0 ? (
                            <span className="h-2 w-2 rounded-full bg-emerald-500" />
                          ) : null}

                          <span className="ml-0.5 text-[10px] font-black text-slate-600">
                            {dateItems.length}
                          </span>
                        </div>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </>
          )}
          </div>
        </section>
      </main>

      <Footer />

      {selectedDate ? (
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/60 p-0 backdrop-blur-sm sm:items-center sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="calendar-day-title"
          onMouseDown={(event) => {
            if (event.currentTarget === event.target) {
              setSelectedDate(null);
            }
          }}
        >
          <div className="max-h-[88vh] w-full overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:max-w-2xl sm:rounded-3xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-5 sm:px-7">
              <div>
                <p className="text-sm font-black uppercase tracking-wider text-emerald-700">
                  {selectedItems.length}{" "}
                  {selectedItems.length === 1 ? "listing" : "listings"}
                </p>

                <h2
                  id="calendar-day-title"
                  className="mt-1 text-2xl font-black sm:text-3xl"
                >
                  {parseDateKey(selectedDate).toLocaleDateString("en-GB", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setSelectedDate(null)}
                className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-slate-300 transition hover:bg-slate-100"
                aria-label="Close day"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="max-h-[calc(88vh-100px)] overflow-y-auto p-4 sm:p-6">
              {selectedItems.length > 0 ? (
                <div className="space-y-3">
                  {selectedItems.map((item) => (
                    <Link
                      key={item.id}
                      href={item.href}
                      className="block rounded-2xl border border-slate-200 p-4 transition hover:border-slate-400 hover:shadow-sm sm:p-5"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p
                            className={`text-xs font-black uppercase tracking-wider ${
                              item.category === "Deal"
                                ? "text-emerald-700"
                                : "text-sky-700"
                            }`}
                          >
                            {item.category}
                          </p>

                          <h3 className="mt-1 text-lg font-black sm:text-xl">
                            {item.title}
                          </h3>
                        </div>

                        <ChevronRight className="mt-1 h-5 w-5 shrink-0 text-slate-400" />
                      </div>

                      <div className="mt-4 flex flex-col gap-2 text-sm font-medium text-slate-600 sm:flex-row sm:flex-wrap sm:gap-5">
                        <span>
                          Posted by{" "}
                          <strong className="font-black text-slate-900">
                            {item.postedBy ?? "East Lothian Online"}
                          </strong>
                        </span>

                        {item.location ? (
                          <span className="flex items-center gap-2">
                            <MapPin className="h-4 w-4" />
                            {item.location}
                          </span>
                        ) : null}
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="py-16 text-center">
                  <CalendarDays className="mx-auto h-9 w-9 text-slate-300" />
                  <p className="mt-4 text-lg font-black">
                    Nothing listed for this day
                  </p>
                  <p className="mt-2 text-sm text-slate-500">
                    Choose another date to keep browsing.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
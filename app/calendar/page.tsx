"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import PostCard from "@/components/PostCard";

function getPageName(post: any) {
  return post.groups?.name ?? "East Lothian";
}

function normaliseDate(date: Date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function dateKey(date: Date) {
  return date.toLocaleDateString("en-CA");
}

function getSelectedDates(post: any) {
  const metadataDates = post.metadata?.active_dates ?? [];

  if (metadataDates.length > 0) return metadataDates;
  if (post.event_start) return [post.event_start];

  return [];
}

function selectedDateKey(value: any) {
  if (!value) return "";
  if (typeof value === "string") return value.slice(0, 10);
  if (value?.date) return String(value.date).slice(0, 10);
  if (value?.start) return String(value.start).slice(0, 10);
  return "";
}

function hasSelectedDate(post: any, target: Date) {
  const targetKey = dateKey(target);

  return getSelectedDates(post).some(
    (date: any) => selectedDateKey(date) === targetKey
  );
}

function getTimeLabel(post: any) {
  const dates = getSelectedDates(post);
  if (!dates.length) return "";

  const today = normaliseDate(new Date());

  if (hasSelectedDate(post, today)) return "Today";

  const firstDateKey = selectedDateKey(dates[0]);
  if (!firstDateKey) return "";

  const firstDate = normaliseDate(new Date(firstDateKey));

  const diff = Math.round(
    (firstDate.getTime() - today.getTime()) / 86400000
  );

  if (diff === 1) return "Tomorrow";
  if (diff > 1) return `In ${diff} days`;

  return "";
}

function monthLabel(date: Date) {
  return date.toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
  });
}

function dayLabel(date: Date) {
  return date.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

export default function CalendarPage() {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [monthDate, setMonthDate] = useState(() =>
    normaliseDate(new Date())
  );
  const [selectedDate, setSelectedDate] = useState(() =>
    normaliseDate(new Date())
  );

  useEffect(() => {
    async function loadPosts() {
      const { data } = await supabase
        .from("posts")
        .select(`
          id,
          title,
          image_url,
          created_at,
          expires_at,
          event_start,
          event_end,
          metadata,
          type,
          groups(name)
        `)
        .in("type", ["event", "deal"])
        .order("created_at", { ascending: false })
        .limit(300);

      setPosts(data ?? []);
      setLoading(false);
    }

    loadPosts();
  }, []);

  const today = normaliseDate(new Date());

  const calendarDays = useMemo(() => {
    const year = monthDate.getFullYear();
    const month = monthDate.getMonth();

    const firstDay = new Date(year, month, 1);
    const startDay = (firstDay.getDay() + 6) % 7;

    const start = normaliseDate(new Date(firstDay));
    start.setDate(firstDay.getDate() - startDay);

    return Array.from({ length: 42 }).map((_, index) => {
      const date = normaliseDate(new Date(start));
      date.setDate(start.getDate() + index);
      return date;
    });
  }, [monthDate]);

  const selectedPosts = posts.filter((post: any) =>
    hasSelectedDate(post, selectedDate)
  );

  const monthlyPostCount = posts.filter((post: any) =>
    getSelectedDates(post).some((date: any) =>
      selectedDateKey(date).startsWith(
        `${monthDate.getFullYear()}-${String(
          monthDate.getMonth() + 1
        ).padStart(2, "0")}`
      )
    )
  ).length;

  function postsForDate(date: Date) {
    return posts.filter((post: any) =>
      hasSelectedDate(post, date)
    );
  }

  function goPreviousMonth() {
    const next = new Date(monthDate);
    next.setMonth(monthDate.getMonth() - 1);
    setMonthDate(normaliseDate(next));
  }

  function goNextMonth() {
    const next = new Date(monthDate);
    next.setMonth(monthDate.getMonth() + 1);
    setMonthDate(normaliseDate(next));
  }

  return (
    <main className="min-h-screen bg-white p-6">
      <div className="mb-8 flex items-center justify-between">
        <Link
          href="/"
          className="flex items-center gap-2 text-sm font-semibold text-neutral-500"
        >
          <ChevronLeft size={18} />
          Home
        </Link>

        <div className="rounded-2xl bg-emerald-100 p-3 text-emerald-800">
          <CalendarDays size={24} />
        </div>
      </div>

      <section className="rounded-[2rem] bg-emerald-800 p-6 text-white shadow-xl">
        <p className="mb-2 text-xs font-bold uppercase tracking-[0.25em] text-emerald-100/70">
          East Lothian Calendar
        </p>

        <h1 className="text-4xl font-black leading-none">
          What’s on.
        </h1>

        <p className="mt-3 max-w-md text-sm text-white/80">
          Tap a day to see events and deals happening across East Lothian.
        </p>
      </section>

      <div className="mx-auto max-w-2xl">
        <section className="mt-8 rounded-[2rem] bg-neutral-50 p-4">
          <div className="mb-3 flex items-center justify-between">
            <button
              onClick={goPreviousMonth}
              className="rounded-2xl bg-white p-3 text-black shadow-sm"
            >
              <ChevronLeft size={20} />
            </button>

            <div className="text-center">
              <h2 className="text-2xl font-black text-black">
                {monthLabel(monthDate)}
              </h2>

              <p className="mt-1 text-sm font-semibold text-neutral-500">
                {monthlyPostCount} events this month
              </p>
            </div>

            <button
              onClick={goNextMonth}
              className="rounded-2xl bg-white p-3 text-black shadow-sm"
            >
              <ChevronRight size={20} />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-2 text-center text-xs font-bold text-neutral-400">
            <span>Mon</span>
            <span>Tue</span>
            <span>Wed</span>
            <span>Thu</span>
            <span>Fri</span>
            <span>Sat</span>
            <span>Sun</span>
          </div>

          <div className="mt-3 grid grid-cols-7 gap-2">
            {calendarDays.map((date) => {
              const key = dateKey(date);
              const isPast = date < today;
              const isCurrentMonth =
                date.getMonth() === monthDate.getMonth();
              const isSelected =
                key === dateKey(selectedDate);
              const count = postsForDate(date).length;

              return (
                <button
                  key={key}
                  disabled={isPast}
                  onClick={() => setSelectedDate(date)}
                  className={[
                    "relative flex aspect-square items-center justify-center rounded-2xl text-sm font-bold transition",
                    isPast
                      ? "cursor-not-allowed bg-neutral-100 text-neutral-300"
                      : "bg-white text-black shadow-sm hover:bg-emerald-50",
                    !isCurrentMonth && !isPast
                      ? "text-neutral-300"
                      : "",
                    isSelected
                      ? "bg-emerald-100 text-emerald-900 ring-2 ring-emerald-700 hover:bg-emerald-100"
                      : "",
                  ].join(" ")}
                >
                  {date.getDate()}

                  {!isPast && count > 0 && (
                    <span className="absolute right-1 top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-emerald-500 px-1 text-[10px] font-black text-white">
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </section>

        <section className="mt-10">
          <h2 className="mb-4 text-3xl font-black tracking-tight text-black">
            📅 {dayLabel(selectedDate)}
          </h2>

          {loading ? (
            <p className="text-sm text-neutral-500">
              Loading calendar...
            </p>
          ) : selectedPosts.length > 0 ? (
            <div>
              {selectedPosts.map((post: any) => (
                <PostCard
                  key={post.id}
                  id={post.id}
                  title={post.title}
                  pageName={getPageName(post)}
                  imageUrl={post.image_url}
                  timeLabel={getTimeLabel(post)}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-3xl bg-neutral-100 p-6 text-center">
              <p className="font-bold text-black">
                Nothing on this day yet.
              </p>
              <p className="mt-1 text-sm text-neutral-500">
                Events and deals will appear here.
              </p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
} from "lucide-react";

import SiteHeader from "@/components/SiteHeader";
import {
  WebFeedPostCard,
  WebFeedStyles,
} from "@/components/WebFeedItems";
import { createClient } from "@/lib/supabase/client";

const DAYS = ["M", "T", "W", "T", "F", "S", "S"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

type GroupInfo = {
  id: string;
  name: string;
  is_local_partner: boolean;
  brand_color: string | null;
};

type CalendarPost = {
  id: string;
  group_id: string | null;
  title: string;
  content: string | null;
  image_url: string | null;
  created_at: string;
  type: "event" | "deal" | "popup";
  expires_at: string | null;
  event_start: string | null;
  event_end: string | null;
  deal_price: string | null;
  metadata: {
    active_dates?: string[];
    public_type?: string;
    deal_price?: number | string | null;
    image_urls?: string[];
    popup_address?: string | null;
    popup_start_time?: string | null;
    popup_end_time?: string | null;
  } | null;
  group?: GroupInfo | null;
};

function validBrandColour(value: string | null | undefined) {
  return /^#[0-9a-f]{6}$/i.test(value?.trim() || "")
    ? value!.trim()
    : "#005744";
}

function formatTime(value: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return `${String(date.getHours()).padStart(2, "0")}:${String(
    date.getMinutes()
  ).padStart(2, "0")}`;
}

export default function CalendarPage() {
  const supabase = useMemo(() => createClient(), []);

  const [today, setToday] = useState<Date | null>(null);
  const [currentDate, setCurrentDate] = useState<Date | null>(null);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const [posts, setPosts] = useState<CalendarPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const now = new Date();
    setToday(now);
    setCurrentDate(new Date(now.getFullYear(), now.getMonth(), 1));
    setSelectedDay(now.getDate());
  }, []);

  const year = currentDate?.getFullYear() ?? null;
  const month = currentDate?.getMonth() ?? null;
  const monthName = month === null ? "" : MONTHS[month];

  const daysInMonth =
    year === null || month === null ? 0 : new Date(year, month + 1, 0).getDate();

  const firstDay =
    year === null || month === null ? 1 : new Date(year, month, 1).getDay();

  const mondayOffset = firstDay === 0 ? 6 : firstDay - 1;

  const dateString = useCallback(
    (day: number) => {
      if (year === null || month === null) return "";
      return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(
        2,
        "0"
      )}`;
    },
    [year, month]
  );

  const isPast = useCallback(
    (day: number) => {
      if (!today || year === null || month === null) return false;

      const date = new Date(year, month, day);
      const startToday = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate()
      );

      return date < startToday;
    },
    [today, year, month]
  );

  const isToday = useCallback(
    (day: number) => {
      if (!today || year === null || month === null) return false;

      return (
        day === today.getDate() &&
        month === today.getMonth() &&
        year === today.getFullYear()
      );
    },
    [today, year, month]
  );

  const canGoPrevious = useCallback(() => {
    if (!today || year === null || month === null) return false;

    const displayed = new Date(year, month, 1);
    const current = new Date(today.getFullYear(), today.getMonth(), 1);

    return displayed > current;
  }, [today, year, month]);

  const loadPosts = useCallback(
    async (showLoader = true) => {
      if (showLoader) setLoading(true);
      setError(null);

      try {
        const { data, error: postsError } = await supabase
          .from("posts")
          .select(`
            id,
            group_id,
            title,
            content,
            image_url,
            created_at,
            type,
            expires_at,
            event_start,
            event_end,
            deal_price,
            metadata
          `)
          .in("type", ["event", "deal", "popup"])
          .limit(500);

        if (postsError) throw postsError;

        const rawPosts = (data ?? []) as CalendarPost[];

        const groupIds = Array.from(
          new Set(
            rawPosts
              .map((post) => post.group_id)
              .filter((id): id is string => Boolean(id))
          )
        );

        let groups: GroupInfo[] = [];

        if (groupIds.length > 0) {
          const { data: groupData, error: groupError } = await supabase
            .from("groups")
            .select("id,name,is_local_partner,brand_color")
            .in("id", groupIds);

          if (groupError) throw groupError;
          groups = (groupData ?? []) as GroupInfo[];
        }

        const groupMap = new Map(groups.map((group) => [group.id, group]));

        setPosts(
          rawPosts.map((post) => ({
            ...post,
            group: post.group_id ? groupMap.get(post.group_id) ?? null : null,
          }))
        );
      } catch (caught) {
        console.error(caught);
        setPosts([]);
        setError("Calendar posts couldn’t be loaded. Please try again.");
      } finally {
        setLoading(false);
      }
    },
    [supabase]
  );

  useEffect(() => {
    if (year === null || month === null) return;
    void loadPosts();
  }, [year, month, loadPosts]);

  const calendarDays = useMemo(() => {
    const cells: (number | null)[] = [];

    for (let i = 0; i < mondayOffset; i += 1) cells.push(null);
    for (let day = 1; day <= daysInMonth; day += 1) cells.push(day);
    while (cells.length % 7 !== 0) cells.push(null);

    return cells;
  }, [daysInMonth, mondayOffset]);

  const datesForPost = useCallback((post: CalendarPost) => {
    const activeDates = post.metadata?.active_dates ?? [];
    if (activeDates.length > 0) return activeDates;

    if (post.event_start) {
      const eventDate = new Date(post.event_start);

      if (!Number.isNaN(eventDate.getTime())) {
        return [
          `${eventDate.getFullYear()}-${String(eventDate.getMonth() + 1).padStart(
            2,
            "0"
          )}-${String(eventDate.getDate()).padStart(2, "0")}`,
        ];
      }
    }

    return [];
  }, []);

  const postsForDay = useCallback(
    (day: number) => {
      if (isPast(day)) return [];
      const target = dateString(day);
      return posts.filter((post) => datesForPost(post).includes(target));
    },
    [dateString, datesForPost, isPast, posts]
  );

  function priority(post: CalendarPost) {
    const name = post.group?.name?.trim().toLowerCase() ?? "";

    if (name === "east lothian online") return 2;
    if (post.group?.is_local_partner) return 0;
    return 1;
  }

  const selectedPosts = useMemo(() => {
    if (selectedDay === null) return [];
    return [...postsForDay(selectedDay)].sort(
      (a, b) => priority(a) - priority(b)
    );
  }, [postsForDay, selectedDay]);

  function previousMonth() {
    if (!canGoPrevious() || year === null || month === null || !today) return;

    const previous = new Date(year, month - 1, 1);
    setCurrentDate(previous);

    if (
      previous.getFullYear() === today.getFullYear() &&
      previous.getMonth() === today.getMonth()
    ) {
      setSelectedDay(today.getDate());
    } else {
      setSelectedDay(1);
    }
  }

  function nextMonth() {
    if (year === null || month === null) return;
    setCurrentDate(new Date(year, month + 1, 1));
    setSelectedDay(1);
  }

  async function refresh() {
    if (refreshing) return;
    setRefreshing(true);
    try {
      await loadPosts(false);
    } finally {
      setRefreshing(false);
    }
  }

  const previousAvailable = canGoPrevious();
  const mounted = Boolean(today && currentDate && selectedDay !== null);

  return (
    <div className="elo-calendar-page">
      <SiteHeader />

      <main className="elo-calendar-main">
        <header className="elo-calendar-page-header">
          <div>
            <h1>Calendar</h1>
            <p>See what&apos;s happening across East Lothian.</p>
          </div>

          <button
            type="button"
            className="elo-calendar-refresh"
            onClick={() => void refresh()}
            disabled={refreshing || !mounted}
            aria-label="Refresh calendar"
          >
            <RefreshCw size={19} className={refreshing ? "elo-calendar-spin" : undefined} />
          </button>
        </header>

        {!mounted ? (
          <div className="elo-calendar-initial-loading" role="status">
            <span className="elo-calendar-loader" />
            <span>Loading calendar…</span>
          </div>
        ) : (
          <>
            {error && (
              <div className="elo-calendar-error" role="alert">
                <span>{error}</span>
                <button type="button" onClick={() => void refresh()}>
                  Try again
                </button>
              </div>
            )}

            <section className="elo-calendar-card" aria-label={`${monthName} ${year}`}>
              <div className="elo-calendar-month-header">
                <button
                  type="button"
                  className="elo-calendar-arrow"
                  disabled={!previousAvailable}
                  onClick={previousMonth}
                  aria-label="Previous month"
                >
                  <ChevronLeft size={21} />
                </button>

                <div className="elo-calendar-month-centre">
                  <strong>{monthName}</strong>
                  <span>{year}</span>
                </div>

                <button
                  type="button"
                  className="elo-calendar-arrow"
                  onClick={nextMonth}
                  aria-label="Next month"
                >
                  <ChevronRight size={21} />
                </button>
              </div>

              <div className="elo-calendar-week-row" aria-hidden="true">
                {DAYS.map((day, index) => (
                  <div key={`${day}-${index}`}>{day}</div>
                ))}
              </div>

              {loading ? (
                <div className="elo-calendar-loading" role="status">
                  <span className="elo-calendar-loader" />
                </div>
              ) : (
                <div className="elo-calendar-grid">
                  {calendarDays.map((day, index) => {
                    if (!day) {
                      return (
                        <div
                          key={`empty-${index}`}
                          className="elo-calendar-day elo-calendar-empty-day"
                          aria-hidden="true"
                        />
                      );
                    }

                    const past = isPast(day);
                    const dayPosts = postsForDay(day);
                    const hasEvent = dayPosts.some((post) => post.type === "event");
                    const hasDeal = dayPosts.some((post) => post.type === "deal");
                    const hasPopup = dayPosts.some((post) => post.type === "popup");
                    const selected = selectedDay === day && !past;
                    const todayCell = isToday(day);

                    return (
                      <button
                        key={day}
                        type="button"
                        className={[
                          "elo-calendar-day",
                          selected ? "is-selected" : "",
                          todayCell && !selected ? "is-today" : "",
                          past ? "is-past" : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                        disabled={past}
                        onClick={() => setSelectedDay(day)}
                        aria-label={`${day} ${monthName}${dayPosts.length ? `, ${dayPosts.length} posts` : ""}`}
                        aria-pressed={selected}
                      >
                        <span className="elo-calendar-day-number">{day}</span>

                        {!past && (
                          <span className="elo-calendar-dots" aria-hidden="true">
                            {hasEvent && <span className="elo-calendar-dot event" />}
                            {hasDeal && <span className="elo-calendar-dot deal" />}
                            {hasPopup && <span className="elo-calendar-dot popup" />}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </section>

            <div className="elo-calendar-selected-header">
              <div>
                <span className="elo-calendar-selected-label">
                  {selectedDay !== null && isToday(selectedDay)
                    ? "TODAY"
                    : "SELECTED DATE"}
                </span>
                <h2>
                  {selectedDay} {monthName}
                </h2>
              </div>

              <span className="elo-calendar-count">
                {selectedPosts.length} {selectedPosts.length === 1 ? "post" : "posts"}
              </span>
            </div>

            {selectedPosts.length === 0 ? (
              <section className="elo-calendar-empty-card">
                <CalendarDays size={27} />
                <h3>Nothing here yet</h3>
                <p>Events, deals and pop-ups happening on this date will appear here.</p>
              </section>
            ) : (
              <div className="elo-calendar-post-list">
                {selectedPosts.map((post) => (
                  <WebFeedPostCard
                    key={post.id}
                    post={post}
                    onClick={() => {}}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </main>

      <WebFeedStyles />

      <style>{`
        .elo-calendar-page {
          min-height: 100dvh;
          background: #F4F5F4;
          color: #111111;
          font-family: var(--font-geist-sans), Arial, sans-serif;
        }

        .elo-calendar-page *,
        .elo-calendar-page *::before,
        .elo-calendar-page *::after {
          box-sizing: border-box;
        }

        .elo-calendar-main {
          width: 100%;
          max-width: 760px;
          margin: 0 auto;
          padding: 0 18px 110px;
        }

        .elo-calendar-page-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          padding: 20px 0 18px;
        }

        .elo-calendar-page-header h1 {
          margin: 0;
          color: #005744;
          font-size: 27px;
          line-height: 1.15;
          font-weight: 900;
          letter-spacing: -0.6px;
        }

        .elo-calendar-page-header p {
          margin: 4px 0 0;
          color: #777777;
          font-size: 14px;
        }

        .elo-calendar-refresh,
        .elo-calendar-arrow {
          border: 0;
          cursor: pointer;
          color: #111111;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .elo-calendar-refresh {
          width: 42px;
          height: 42px;
          flex: 0 0 42px;
          border-radius: 12px;
          background: #E8F4F0;
          color: #005744;
        }

        .elo-calendar-refresh:disabled,
        .elo-calendar-arrow:disabled {
          opacity: .45;
          cursor: not-allowed;
        }

        .elo-calendar-card {
          width: 100%;
          aspect-ratio: 1 / 1;
          display: flex;
          flex-direction: column;
          background: #FFFFFF;
          border: 1px solid #E4E4E4;
          border-radius: 20px;
          padding: 16px;
          overflow: hidden;
        }

        .elo-calendar-month-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 18px;
        }

        .elo-calendar-arrow {
          width: 42px;
          height: 42px;
          border-radius: 12px;
          background: #F4F5F4;
        }

        .elo-calendar-month-centre {
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .elo-calendar-month-centre strong {
          font-size: 20px;
          font-weight: 800;
        }

        .elo-calendar-month-centre span {
          margin-top: 2px;
          color: #858585;
          font-size: 12px;
          font-weight: 600;
        }

        .elo-calendar-week-row,
        .elo-calendar-grid {
          display: grid;
          grid-template-columns: repeat(7, minmax(0, 1fr));
        }

        .elo-calendar-week-row {
          margin-bottom: 7px;
        }

        .elo-calendar-week-row div {
          text-align: center;
          color: #909090;
          font-size: 11px;
          font-weight: 800;
        }

        .elo-calendar-grid {
          flex: 1;
          min-height: 0;
          border-top: 1px solid #E5E5E5;
          border-left: 1px solid #E5E5E5;
          grid-auto-rows: 1fr;
        }

        .elo-calendar-day {
          position: relative;
          min-width: 0;
          min-height: 0;
          height: auto;
          padding: 0;
          border: 0;
          border-right: 1px solid #E5E5E5;
          border-bottom: 1px solid #E5E5E5;
          background: #FFFFFF;
          color: #222222;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }

        .elo-calendar-empty-day {
          background: #FAFAFA;
        }

        .elo-calendar-day.is-selected {
          background: #008564;
          color: #FFFFFF;
        }

        .elo-calendar-day.is-today {
          background: #E8F4F0;
          color: #008564;
        }

        .elo-calendar-day.is-past {
          color: #D0D0D0;
          cursor: default;
        }

        .elo-calendar-day-number {
          font-size: 14px;
          font-weight: 700;
        }

        .elo-calendar-day.is-selected .elo-calendar-day-number,
        .elo-calendar-day.is-today .elo-calendar-day-number {
          font-weight: 900;
        }

        .elo-calendar-dots {
          display: flex;
          gap: 3px;
          height: 4px;
          margin-top: 4px;
        }

        .elo-calendar-dot {
          width: 4px;
          height: 4px;
          border-radius: 50%;
        }

        .elo-calendar-dot.event {
          background: #008564;
        }

        .elo-calendar-dot.deal {
          background: #E49B28;
        }

        .elo-calendar-dot.popup {
          background: #7A5AF8;
        }

        .elo-calendar-day.is-selected .elo-calendar-dot {
          background: #FFFFFF;
        }

        .elo-calendar-loading,
        .elo-calendar-initial-loading {
          display: flex;
          align-items: center;
          justify-content: center;
          color: #005744;
        }

        .elo-calendar-loading {
          flex: 1;
          min-height: 0;
        }

        .elo-calendar-initial-loading {
          min-height: 45vh;
          flex-direction: column;
          gap: 12px;
          font-size: 14px;
          font-weight: 700;
        }

        .elo-calendar-loader {
          width: 28px;
          height: 28px;
          border: 3px solid #D8E7E2;
          border-top-color: #008564;
          border-radius: 50%;
          animation: elo-calendar-spin .8s linear infinite;
        }

        .elo-calendar-selected-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          margin-top: 24px;
          margin-bottom: 12px;
        }

        .elo-calendar-selected-label {
          display: block;
          color: #999999;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 1px;
        }

        .elo-calendar-selected-header h2 {
          margin: 3px 0 0;
          font-size: 21px;
          font-weight: 800;
          line-height: 1.2;
        }

        .elo-calendar-count {
          flex: 0 0 auto;
          padding: 7px 11px;
          border-radius: 10px;
          background: #E8F4F0;
          color: #008564;
          font-size: 12px;
          font-weight: 800;
        }

        .elo-calendar-empty-card {
          padding: 28px;
          background: #FFFFFF;
          border: 1px solid #E7E7E7;
          border-radius: 18px;
          display: flex;
          flex-direction: column;
          align-items: center;
          color: #008564;
          text-align: center;
        }

        .elo-calendar-empty-card h3 {
          margin: 12px 0 0;
          color: #111111;
          font-size: 17px;
          font-weight: 800;
        }

        .elo-calendar-empty-card p {
          margin: 6px 0 0;
          max-width: 420px;
          color: #777777;
          font-size: 13px;
          line-height: 19px;
        }

        .elo-calendar-post-list {
          display: grid;
          gap: 14px;
        }

        .elo-calendar-error {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 14px;
          padding: 13px 14px;
          border-radius: 14px;
          background: #FFE9E7;
          color: #B42318;
          font-size: 13px;
          line-height: 1.4;
        }

        .elo-calendar-error button {
          flex: 0 0 auto;
          border: 0;
          background: transparent;
          color: inherit;
          font: inherit;
          font-weight: 900;
          text-decoration: underline;
          cursor: pointer;
        }

        .elo-calendar-page button:focus-visible {
          outline: 2px solid #007A5E;
          outline-offset: 3px;
        }

        .elo-calendar-spin {
          animation: elo-calendar-spin .8s linear infinite;
        }

        @keyframes elo-calendar-spin {
          to { transform: rotate(360deg); }
        }

        @media (min-width: 768px) {
          .elo-calendar-main {
            padding-top: 12px;
          }
        }

        @media (max-width: 420px) {
          .elo-calendar-main {
            padding-left: 12px;
            padding-right: 12px;
          }

          .elo-calendar-card {
            padding: 12px;
            border-radius: 18px;
          }

        }

        @media (prefers-reduced-motion: reduce) {
          .elo-calendar-spin,
          .elo-calendar-loader {
            animation: none;
          }
        }
      `}</style>
    </div>
  );
}

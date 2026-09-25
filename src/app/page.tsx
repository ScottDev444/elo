"use client";

import SiteHeader from "@/components/SiteHeader";
import AlertStrip from "@/components/AlertStrip";


type HeroWeatherResponse = {
  current?: {
    weather_code?: number;
    is_day?: number;
  };
};

function getHeroTimeGreeting(date: Date) {
  const hour = date.getHours();

  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";

  return "Good evening";
}

function getEasterDate(year: number) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;

  return new Date(year, month - 1, day);
}

function sameHeroDay(first: Date, second: Date) {
  return (
    first.getFullYear() === second.getFullYear() &&
    first.getMonth() === second.getMonth() &&
    first.getDate() === second.getDate()
  );
}

function getHeroHolidayGreeting(now: Date) {
  const month = now.getMonth();
  const day = now.getDate();

  if (month === 11 && day === 25) return "Merry Christmas 🎄";
  if (month === 0 && day === 1) return "Happy New Year 🎆";
  if (month === 9 && day === 31) return "Happy Halloween 🎃";

  if (sameHeroDay(now, getEasterDate(now.getFullYear()))) {
    return "Happy Easter 🐣";
  }

  return null;
}

function getHeroWeatherCategory(code: number) {
  if (code === 0) return "clear";
  if ([1, 2].includes(code)) return "partly";
  if (code === 3) return "cloudy";
  if ([45, 48].includes(code)) return "fog";
  if ([51, 53, 55, 56, 57].includes(code)) return "drizzle";
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return "rain";
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "snow";
  if ([95, 96, 99].includes(code)) return "storm";

  return "cloudy";
}

function getHeroWeatherEmoji(category: string, isDay: boolean) {
  if (category === "clear") return isDay ? "☀️" : "🌙";
  if (category === "partly") return isDay ? "🌤️" : "☁️";
  if (category === "fog") return "🌫️";
  if (category === "drizzle") return "🌦️";
  if (category === "rain") return "🌧️";
  if (category === "snow") return "🌨️";
  if (category === "storm") return "⛈️";

  return "☁️";
}

function getMostCommonHeroWeather(results: HeroWeatherResponse[]) {
  const available = results
    .map((item) => {
      const code = item.current?.weather_code;

      if (typeof code !== "number") return null;

      return {
        category: getHeroWeatherCategory(code),
        isDay: item.current?.is_day !== 0,
      };
    })
    .filter(
      (
        item
      ): item is {
        category: string;
        isDay: boolean;
      } => item !== null
    );

  if (available.length === 0) return "☁️";

  const counts = new Map<string, number>();

  for (const item of available) {
    counts.set(item.category, (counts.get(item.category) ?? 0) + 1);
  }

  const winningCategory =
    [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ??
    available[0].category;

  const matching = available.filter(
    (item) => item.category === winningCategory
  );

  const dayCount = matching.filter((item) => item.isDay).length;

  return getHeroWeatherEmoji(
    winningCategory,
    dayCount >= matching.length / 2
  );
}

function AppHero() {
  const [now, setNow] = useState<Date | null>(null);
  const [weatherEmoji, setWeatherEmoji] = useState("☁️");

  useEffect(() => {
    setNow(new Date());

    const clock = window.setInterval(() => {
      setNow(new Date());
    }, 60_000);

    return () => window.clearInterval(clock);
  }, []);

  useEffect(() => {
    let active = true;

    async function loadWeather() {
      try {
        const response = await fetch(
          "https://api.open-meteo.com/v1/forecast?latitude=55.9419,55.9560,56.0029&longitude=-3.0539,-2.7830,-2.5160&current=weather_code,is_day&timezone=Europe%2FLondon"
        );

        if (!response.ok) return;

        const data = (await response.json()) as
          | HeroWeatherResponse
          | HeroWeatherResponse[];

        const results = Array.isArray(data) ? data : [data];

        if (active) {
          setWeatherEmoji(getMostCommonHeroWeather(results));
        }
      } catch {
        if (active) setWeatherEmoji("☁️");
      }
    }

    void loadWeather();

    const interval = window.setInterval(loadWeather, 15 * 60 * 1000);

    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, []);

  const dateText = now
    ? new Intl.DateTimeFormat("en-GB", {
        weekday: "long",
        day: "numeric",
        month: "long",
      }).format(now)
    : "";

  const greeting = now ? getHeroTimeGreeting(now) : "";
  const holidayGreeting = now ? getHeroHolidayGreeting(now) : null;

  return (
    <section className="elo-app-hero">
      <div className="elo-app-hero-date-row">
        <span>{dateText}</span>
        <span className="elo-app-hero-weather">{weatherEmoji}</span>
      </div>

      <h1>{greeting ? `${greeting} 👋` : "\u00A0"}</h1>

      {holidayGreeting && (
        <div className="elo-app-hero-holiday">{holidayGreeting}</div>
      )}

      <p>Here&apos;s what&apos;s happening in East Lothian</p>

      <style>{`
        .elo-app-hero {
          width: 100%;
          max-width: 760px;
          margin: 0 auto;
          box-sizing: border-box;
          background: #F4F5F4;
          padding: 14px 16px 18px;
        }

        .elo-app-hero-date-row {
          display: flex;
          align-items: center;
          gap: 7px;
          margin-bottom: 5px;
          color: #777777;
          font-size: 12px;
          font-weight: 700;
        }

        .elo-app-hero-weather {
          font-size: 15px;
          line-height: 18px;
        }

        .elo-app-hero h1 {
          margin: 0;
          color: #005744;
          font-size: 27px;
          line-height: 32px;
          font-weight: 900;
          letter-spacing: -0.7px;
        }

        .elo-app-hero-holiday {
          margin-top: 3px;
          color: #005744;
          font-size: 14px;
          line-height: 18px;
          font-weight: 800;
        }

        .elo-app-hero p {
          margin: 3px 0 0;
          color: #777777;
          font-size: 13px;
          line-height: 18px;
          font-weight: 600;
        }
      `}</style>
    </section>
  );
}
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  WebFeedPostCard,
  WebFeedStyles,
  WebPlaceCard,
  type FeedPost,
  type GroupInfo,
  type Place,
} from "@/components/WebFeedItems";
import { createClient } from "@/lib/supabase/client";

type FeaturedItem = {
  id: string;
  title: string;
  subtitle: string | null;
  image_url: string | null;
  is_active: boolean;
  starts_at: string | null;
  expires_at: string | null;
  priority: number;
  created_at: string;
};

type FeedItem =
  | {
      key: string;
      kind: "event" | "deal" | "update" | "popup" | "advert";
      post: FeedPost;
      dateHeadingKey: string | null;
    }
  | {
      key: string;
      kind: "place";
      place: Place;
      dateHeadingKey: null;
    };

const POST_SELECT = `
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
`;

const PLACE_SELECT = `
  id,
  page_id,
  title,
  description,
  location_name,
  address,
  postcode,
  slug,
  images,
  is_active,
  opening_hours,
  is_24_7,
  metadata
`;

function localDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDateKey(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function getNextDate(post: FeedPost, now: Date) {
  const today = localDateKey(now);
  const activeDates = post.metadata?.active_dates;

  if (Array.isArray(activeDates) && activeDates.length > 0) {
    return [...activeDates].filter((date) => date >= today).sort()[0] ?? null;
  }

  if (post.event_start) {
    const start = new Date(post.event_start);

    if (!Number.isNaN(start.getTime())) {
      const startKey = localDateKey(start);
      if (startKey >= today) return startKey;
    }
  }

  if (post.expires_at && new Date(post.expires_at).getTime() >= now.getTime()) {
    return today;
  }

  return null;
}

function isPostActiveToday(post: FeedPost, now: Date) {
  const today = localDateKey(now);
  const activeDates = post.metadata?.active_dates;

  if (Array.isArray(activeDates) && activeDates.length > 0) {
    return activeDates.includes(today);
  }

  const startKey = post.event_start
    ? localDateKey(new Date(post.event_start))
    : null;

  const endKey = post.event_end
    ? localDateKey(new Date(post.event_end))
    : null;

  if (startKey && endKey) return startKey <= today && endKey >= today;

  if (startKey) {
    if (startKey > today) return false;

    if (post.expires_at) {
      return new Date(post.expires_at).getTime() >= now.getTime();
    }

    return startKey === today;
  }

  if (post.expires_at) {
    return new Date(post.expires_at).getTime() >= now.getTime();
  }

  return localDateKey(new Date(post.created_at)) === today;
}

function isUpdateToday(post: FeedPost, now: Date) {
  if (post.expires_at && new Date(post.expires_at).getTime() < now.getTime()) {
    return false;
  }

  return localDateKey(new Date(post.created_at)) === localDateKey(now);
}

function isActiveAdvert(post: FeedPost, now: Date) {
  const today = localDateKey(now);
  const activeDates = post.metadata?.active_dates;

  if (Array.isArray(activeDates) && activeDates.length > 0) {
    return activeDates.includes(today);
  }

  if (post.event_start && new Date(post.event_start).getTime() > now.getTime()) {
    return false;
  }

  if (post.expires_at && new Date(post.expires_at).getTime() < now.getTime()) {
    return false;
  }

  return true;
}

function itemPriority(group?: GroupInfo | null) {
  if (group?.name?.trim().toLowerCase() === "east lothian online") return 2;
  if (group?.is_local_partner) return 0;
  return 1;
}

function compareTodayPosts(a: FeedPost, b: FeedPost) {
  const priority = itemPriority(a.group) - itemPriority(b.group);
  if (priority !== 0) return priority;

  return (
    new Date(b.created_at).getTime() -
    new Date(a.created_at).getTime()
  );
}

function compareBackbonePosts(a: FeedPost, b: FeedPost, now: Date) {
  const aDate = getNextDate(a, now) ?? "9999-12-31";
  const bDate = getNextDate(b, now) ?? "9999-12-31";

  if (aDate !== bDate) return aDate.localeCompare(bDate);

  const priority = itemPriority(a.group) - itemPriority(b.group);
  if (priority !== 0) return priority;

  return (
    new Date(a.created_at).getTime() -
    new Date(b.created_at).getTime()
  );
}

function getDateHeading(dateKey: string, now: Date) {
  const today = parseDateKey(localDateKey(now));
  const target = parseDateKey(dateKey);

  const difference = Math.round(
    (target.getTime() - today.getTime()) / 86400000
  );

  if (difference === 0) return "Today";
  if (difference === 1) return "Tomorrow";

  return target.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function parseMinutes(value?: string) {
  if (!value) return null;

  const match = value.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (!match) return null;

  const hour = Number(match[1]);
  const minute = Number(match[2]);

  if (
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59 ||
    Number.isNaN(hour) ||
    Number.isNaN(minute)
  ) {
    return null;
  }

  return hour * 60 + minute;
}

function isPlaceOpenNow(place: Place, now: Date) {
  if (place.is_24_7 === true || place.metadata?.open_24_7 === true) return true;

  const hours = place.opening_hours;
  if (!hours) return true;

  const dayNames = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
  ];

  const dayName = dayNames[now.getDay()];
  const matchingKey = Object.keys(hours).find(
    (key) => key.toLowerCase() === dayName
  );

  const todayHours = hours[dayName] ?? (matchingKey ? hours[matchingKey] : undefined);

  if (!todayHours || todayHours.closed) return false;

  const open = parseMinutes(todayHours.open);
  const close = parseMinutes(todayHours.close);

  if (open === null || close === null) return true;

  const current = now.getHours() * 60 + now.getMinutes();

  if (open === close) return true;
  if (close > open) return current >= open && current < close;

  return current >= open || current < close;
}

function enrichPosts(
  posts: FeedPost[],
  groups: Map<string, GroupInfo>
): FeedPost[] {
  return posts.map((post) => ({
    ...post,
    group: post.group_id ? groups.get(post.group_id) ?? null : null,
  }));
}

function enrichPlaces(
  places: Place[],
  groups: Map<string, GroupInfo>
): Place[] {
  return places.map((place) => ({
    ...place,
    group: place.page_id ? groups.get(place.page_id) ?? null : null,
  }));
}

function buildMixedFeed({
  backbone,
  updates,
  popups,
  places,
  adverts,
  now,
}: {
  backbone: FeedPost[];
  updates: FeedPost[];
  popups: FeedPost[];
  places: Place[];
  adverts: FeedPost[];
  now: Date;
}) {
  const sortedBackbone = [...backbone]
    .filter((post) => getNextDate(post, now) !== null)
    .sort((a, b) => compareBackbonePosts(a, b, now));

  const sortedUpdates = [...updates]
    .filter((post) => isUpdateToday(post, now))
    .sort(compareTodayPosts);

  const sortedPopups = [...popups]
    .filter((post) => isPostActiveToday(post, now))
    .sort(compareTodayPosts);

  const sortedPlaces = [...places]
    .filter((place) => place.is_active && isPlaceOpenNow(place, now))
    .sort((a, b) => itemPriority(a.group) - itemPriority(b.group));

  const sortedAdverts = [...adverts]
    .filter((post) => isActiveAdvert(post, now))
    .sort(compareTodayPosts);

  let previousBackboneDate: string | null = null;

  const backboneItems: FeedItem[] = sortedBackbone.map((post) => {
    const dateKey = getNextDate(post, now);
    const dateHeadingKey =
      dateKey && dateKey !== previousBackboneDate ? dateKey : null;

    if (dateKey) previousBackboneDate = dateKey;

    return {
      key: `post-${post.id}`,
      kind: post.type === "deal" ? "deal" : "event",
      post,
      dateHeadingKey,
    };
  });

  const discoveryPool: FeedItem[] = [
    ...sortedPopups.map(
      (post): FeedItem => ({
        key: `post-${post.id}`,
        kind: "popup",
        post,
        dateHeadingKey: null,
      })
    ),
    ...sortedPlaces.map(
      (place): FeedItem => ({
        key: `place-${place.id}`,
        kind: "place",
        place,
        dateHeadingKey: null,
      })
    ),
  ].sort((a, b) => {
    const aGroup = a.kind === "place" ? a.place.group : a.post.group;
    const bGroup = b.kind === "place" ? b.place.group : b.post.group;

    const priority = itemPriority(aGroup) - itemPriority(bGroup);
    if (priority !== 0) return priority;

    if (a.kind === "popup" && b.kind !== "popup") return -1;
    if (b.kind === "popup" && a.kind !== "popup") return 1;

    return 0;
  });

  const mixed: FeedItem[] = [];
  let updateIndex = 0;
  let discoveryIndex = 0;
  let backboneCount = 0;

  backboneItems.forEach((item) => {
    mixed.push(item);
    backboneCount += 1;

    if (backboneCount % 2 === 0 && updateIndex < sortedUpdates.length) {
      const update = sortedUpdates[updateIndex];

      mixed.push({
        key: `post-${update.id}`,
        kind: "update",
        post: update,
        dateHeadingKey: null,
      });

      updateIndex += 1;
    }

    if (backboneCount % 3 === 0 && discoveryIndex < discoveryPool.length) {
      mixed.push(discoveryPool[discoveryIndex]);
      discoveryIndex += 1;
    }
  });

  while (updateIndex < sortedUpdates.length) {
    const update = sortedUpdates[updateIndex];

    mixed.push({
      key: `post-${update.id}`,
      kind: "update",
      post: update,
      dateHeadingKey: null,
    });

    updateIndex += 1;
  }

  const finalFeed: FeedItem[] = [];
  let contentCount = 0;
  let advertIndex = 0;

  mixed.forEach((item) => {
    finalFeed.push(item);
    contentCount += 1;

    if (contentCount % 5 === 0 && sortedAdverts.length > 0) {
      const advert = sortedAdverts[advertIndex % sortedAdverts.length];

      finalFeed.push({
        key: `advert-${advert.id}-${advertIndex}`,
        kind: "advert",
        post: advert,
        dateHeadingKey: null,
      });

      advertIndex += 1;
    }
  });

  return finalFeed;
}

function FeaturedFeed() {
  const supabase = useMemo(() => createClient(), []);
  const [items, setItems] = useState<FeaturedItem[]>([]);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    let active = true;

    async function load() {
      const now = new Date().toISOString();

      const { data, error } = await supabase
        .from("featured")
        .select(
          "id,title,subtitle,image_url,is_active,starts_at,expires_at,priority,created_at"
        )
        .eq("is_active", true)
        .or(`starts_at.is.null,starts_at.lte.${now}`)
        .or(`expires_at.is.null,expires_at.gt.${now}`)
        .order("priority", { ascending: false })
        .order("created_at", { ascending: false });

      if (!active || error) return;

      setItems((data ?? []) as FeaturedItem[]);
      setIndex(0);
    }

    void load();

    return () => {
      active = false;
    };
  }, [supabase]);

  useEffect(() => {
    if (items.length <= 1) return;

    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % items.length);
    }, 5000);

    return () => window.clearInterval(timer);
  }, [items.length]);

  const item = items[index];
  if (!item) return null;

  return (
    <section className="elo-web-feature">
      <h2>Featured</h2>

      <div
        className="elo-web-feature-card"
        style={
          item.image_url
            ? {
                backgroundImage: `linear-gradient(rgba(0,0,0,.18),rgba(0,0,0,.58)), url("${item.image_url}")`,
              }
            : undefined
        }
      >
        {!item.image_url && <div className="elo-web-feature-shards" />}

        <div className="elo-web-feature-copy">
          <h3>{item.title}</h3>
          {item.subtitle && <p>{item.subtitle}</p>}
        </div>
      </div>

      {items.length > 1 && (
        <div className="elo-web-feature-dots" aria-hidden="true">
          {items.map((feature, itemIndex) => (
            <span
              key={feature.id}
              className={itemIndex === index ? "active" : ""}
            />
          ))}
        </div>
      )}
    </section>
  );
}


function AnimatedWebFeedItem({
  children,
  immediate = false,
}: {
  children: ReactNode;
  immediate?: boolean;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(immediate);

  useLayoutEffect(() => {
    if (visible) return;

    const node = ref.current;
    if (!node) return;

    const rect = node.getBoundingClientRect();

    // Anything already on-screen when the feed appears should be visible
    // immediately rather than waiting for IntersectionObserver.
    if (rect.bottom > 0 && rect.top < window.innerHeight) {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      {
        threshold: 0.12,
      }
    );

    observer.observe(node);

    return () => observer.disconnect();
  }, [visible]);

  return (
    <div
      ref={ref}
      className={`elo-web-reveal ${visible ? "is-visible" : ""}`}
    >
      {children}
    </div>
  );
}

function HomeFeedApp() {
  const supabase = useMemo(() => createClient(), []);

  const [backbone, setBackbone] = useState<FeedPost[]>([]);
  const [updates, setUpdates] = useState<FeedPost[]>([]);
  const [popups, setPopups] = useState<FeedPost[]>([]);
  const [adverts, setAdverts] = useState<FeedPost[]>([]);
  const [places, setPlaces] = useState<Place[]>([]);
  const [now, setNow] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);

  const loadFeed = useCallback(async () => {
    setLoading(true);

    try {
      const [
        backboneResult,
        updatesResult,
        popupsResult,
        advertsResult,
        placesResult,
      ] = await Promise.all([
        supabase
          .from("posts")
          .select(POST_SELECT)
          .in("type", ["event", "deal"])
          .limit(1000),
        supabase
          .from("posts")
          .select(POST_SELECT)
          .eq("type", "update")
          .order("created_at", { ascending: false })
          .limit(120),
        supabase
          .from("posts")
          .select(POST_SELECT)
          .eq("type", "popup")
          .order("created_at", { ascending: false })
          .limit(120),
        supabase
          .from("posts")
          .select(POST_SELECT)
          .eq("type", "advert")
          .order("created_at", { ascending: false })
          .limit(120),
        supabase
          .from("places")
          .select(PLACE_SELECT)
          .eq("is_active", true)
          .limit(1000),
      ]);

      const firstError =
        backboneResult.error ??
        updatesResult.error ??
        popupsResult.error ??
        advertsResult.error ??
        placesResult.error;

      if (firstError) throw firstError;

      const rawBackbone = (backboneResult.data ?? []) as FeedPost[];
      const rawUpdates = (updatesResult.data ?? []) as FeedPost[];
      const rawPopups = (popupsResult.data ?? []) as FeedPost[];
      const rawAdverts = (advertsResult.data ?? []) as FeedPost[];
      const rawPlaces = (placesResult.data ?? []) as Place[];

      const groupIds = Array.from(
        new Set(
          [
            ...rawBackbone.map((post) => post.group_id),
            ...rawUpdates.map((post) => post.group_id),
            ...rawPopups.map((post) => post.group_id),
            ...rawAdverts.map((post) => post.group_id),
            ...rawPlaces.map((place) => place.page_id),
          ].filter((id): id is string => Boolean(id))
        )
      );

      let groupMap = new Map<string, GroupInfo>();

      if (groupIds.length > 0) {
        const { data: groupData, error: groupError } = await supabase
          .from("groups")
          .select("id,name,is_local_partner,brand_color")
          .in("id", groupIds);

        if (groupError) throw groupError;

        groupMap = new Map(
          ((groupData ?? []) as GroupInfo[]).map((group) => [group.id, group])
        );
      }

      setBackbone(enrichPosts(rawBackbone, groupMap));
      setUpdates(enrichPosts(rawUpdates, groupMap));
      setPopups(enrichPosts(rawPopups, groupMap));
      setAdverts(enrichPosts(rawAdverts, groupMap));
      setPlaces(enrichPlaces(rawPlaces, groupMap));
    } catch (error) {
      console.error("Home feed error:", error);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    setNow(new Date());
    void loadFeed();

    const timer = window.setInterval(() => {
      setNow(new Date());
    }, 60_000);

    return () => window.clearInterval(timer);
  }, [loadFeed]);

  const feedItems = useMemo(() => {
    if (!now) return [];

    return buildMixedFeed({
      backbone,
      updates,
      popups,
      places,
      adverts,
      now,
    });
  }, [backbone, updates, popups, places, adverts, now]);

  return (
    <>
      <FeaturedFeed />

      <section className="elo-web-home-feed">
        {loading ? (
          <div className="elo-web-home-loading">
            <span className="elo-web-home-spinner" />
            <p>Loading East Lothian...</p>
          </div>
        ) : feedItems.length === 0 ? (
          <div className="elo-web-home-empty">
            <h2>Nothing coming up yet</h2>
            <p>Check back soon for what&apos;s happening across East Lothian.</p>
          </div>
        ) : (
          feedItems.map((item, index) => (
            <div key={item.key} className="elo-web-home-item">
              <AnimatedWebFeedItem immediate={index === 0}>
                {item.dateHeadingKey && now && (
                  <div className="elo-web-date-heading">
                    <strong>{getDateHeading(item.dateHeadingKey, now)}</strong>
                    <span />
                  </div>
                )}

                {item.kind === "place" ? (
                  <WebPlaceCard place={item.place} />
                ) : (
                  <WebFeedPostCard post={item.post} />
                )}
              </AnimatedWebFeedItem>
            </div>
          ))
        )}
      </section>

      <WebFeedStyles />

      <style>{`
        .elo-web-feature,
        .elo-web-home-feed {
          width: 100%;
          max-width: 760px;
          margin: 0 auto;
          padding-left: 16px;
          padding-right: 16px;
          box-sizing: border-box;
        }

        .elo-web-feature {
          padding-top: 8px;
          padding-bottom: 18px;
        }

        .elo-web-feature h2 {
          margin: 0 0 10px;
          color: #111111;
          font-size: 19px;
          font-weight: 900;
        }

        .elo-web-feature-card {
          position: relative;
          height: 190px;
          overflow: hidden;
          border-radius: 18px;
          background: #005744;
          background-size: cover;
          background-position: center;
        }

        .elo-web-feature-shards {
          position: absolute;
          inset: 0;
          background:
            linear-gradient(145deg, #00906C 0 22%, transparent 22%),
            linear-gradient(25deg, #00795D 0 36%, transparent 36%),
            linear-gradient(155deg, transparent 0 45%, #00A078 45% 66%, transparent 66%),
            #005744;
        }

        .elo-web-feature-copy {
          position: absolute;
          left: 20px;
          right: 20px;
          bottom: 18px;
          color: #FFFFFF;
        }

        .elo-web-feature-copy h3 {
          margin: 0;
          font-size: 25px;
          line-height: 29px;
          font-weight: 900;
          letter-spacing: -.5px;
        }

        .elo-web-feature-copy p {
          margin: 5px 0 0;
          max-width: 520px;
          color: rgba(255,255,255,.84);
          font-size: 12px;
          line-height: 17px;
          font-weight: 600;
        }

        .elo-web-feature-dots {
          display: flex;
          justify-content: center;
          gap: 5px;
          margin-top: 9px;
        }

        .elo-web-feature-dots span {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #C9D0CD;
        }

        .elo-web-feature-dots span.active {
          width: 18px;
          border-radius: 999px;
          background: #005744;
        }

        .elo-web-home-feed {
          padding-bottom: 90px;
        }

        .elo-web-date-heading {
          display: flex;
          align-items: center;
          gap: 12px;
          margin: 6px 0 12px;
        }

        .elo-web-date-heading strong {
          flex: 0 0 auto;
          color: #444444;
          font-size: 14px;
          font-weight: 800;
        }

        .elo-web-date-heading span {
          height: 1px;
          flex: 1;
          background: #DDDFDD;
        }

        .elo-web-home-loading {
          min-height: 300px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 10px;
          color: #005744;
          font-size: 13px;
          font-weight: 700;
        }

        .elo-web-home-spinner {
          width: 30px;
          height: 30px;
          border: 3px solid #D9E6E2;
          border-top-color: #005744;
          border-radius: 50%;
          animation: elo-home-spin .8s linear infinite;
        }

        .elo-web-home-loading p {
          margin: 0;
        }

        .elo-web-home-empty {
          padding: 50px 20px;
          text-align: center;
        }

        .elo-web-home-empty h2 {
          margin: 0;
          color: #111111;
          font-size: 18px;
          font-weight: 900;
        }

        .elo-web-home-empty p {
          margin: 7px 0 0;
          color: #777777;
          font-size: 13px;
          line-height: 19px;
        }

        .elo-web-reveal {
          width: 100%;
          opacity: 0;
          transform: translateY(8px);
          transition:
            opacity 180ms ease,
            transform 180ms ease;
        }

        .elo-web-reveal.is-visible {
          opacity: 1;
          transform: translateY(0);
        }

        @keyframes elo-home-spin {
          to { transform: rotate(360deg); }
        }

        @media (prefers-reduced-motion: reduce) {
          .elo-web-home-spinner {
            animation: none;
          }

          .elo-web-reveal {
            opacity: 1;
            transform: none;
            transition: none;
          }
        }
      `}</style>
    </>
  );
}


export default function HomePage() {
  return (
    <main
      style={{
        minHeight: "100dvh",
        background: "#F4F5F4",
      }}
    >
      <SiteHeader />
      <AppHero />
      <AlertStrip />
      <HomeFeedApp />
    </main>
  );
}
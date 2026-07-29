"use client";

import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "motion/react";
import { LoaderCircle } from "lucide-react";

import Post from "./Post";
import PlacePost from "./PlacePost";
import { createClient } from "@/lib/supabase/client";

type PostColour =
  | "emerald"
  | "blue"
  | "red"
  | "amber";

type PostMetadata = {
  public_type?: string | null;
  active_dates?: string[] | null;
  location?: string | null;
  featured?: boolean | null;
  deal_kind?: string | null;
  alert_icon?: string | null;
  deal_price?: string | number | null;
  buy_quantity?: number | null;
  pay_quantity?: number | null;
  discount_percent?: number | null;
};

type CardMetadata = {
  public_type?: string | null;
  active_dates?: string[] | null;
  location?: string | null;
  featured?: boolean | null;
  deal_kind?: string | null;
  alert_icon?: string | null;
  deal_price?: number | null;
  buy_quantity?: number | null;
  pay_quantity?: number | null;
  discount_percent?: number | null;
};

type DatabasePost = {
  id: string;
  group_id: string | null;
  user_id: string | null;
  title: string;
  content: string | null;
  image_url: string | null;
  created_at: string | null;
  metadata: PostMetadata | null;
  type: string;
  expires_at: string | null;
  event_start: string | null;
  event_end: string | null;
  deal_price: string | null;
};

type DatabaseGroup = {
  id: string;
  name: string | null;
  brand_color: string | null;
  is_local_partner: boolean | null;
};

type DayHours = {
  open?: string;
  close?: string;
  closed?: boolean;
};

type OpeningHours = Record<
  string,
  DayHours | undefined
>;

type DatabasePlace = {
  id: string;
  page_id: string;
  title: string;
  description: string | null;
  location_name: string | null;
  address: string | null;
  postcode: string | null;
  latitude: number | null;
  longitude: number | null;
  tags: string[] | null;
  images: string[] | null;
  opening_hours: OpeningHours | null;
  metadata: Record<string, unknown> | null;
  is_active: boolean | null;
  created_at: string | null;
  updated_at: string | null;
  is_24_7: boolean | null;
  slug: string | null;
};

type DisplayPost = {
  id: string;
  category: string;
  colour: PostColour;
  type: "event" | "deal" | "post";
  title: string;
  description: string;
  href: string;
  imageUrl?: string;
  date?: string;
  dates: string[];
  postedBy?: string;
  location?: string;
  brandColour?: string;
  metadata: CardMetadata | null;
  featured?: boolean;
  isLocalPartner: boolean;
  createdAt: string;
  sortDate: string;
};

type FeedItem =
  | {
      kind: "post";
      key: string;
      post: DisplayPost;
      animationIndex: number;
    }
  | {
      kind: "place";
      key: string;
      place: DatabasePlace;
      animationIndex: number;
    };

type AnalyticsEventType =
  | "impression"
  | "conversion";

function getAnalyticsSessionId() {
  const storageKey = "elo_analytics_session_id";

  try {
    const existing =
      window.localStorage.getItem(storageKey);

    if (existing) {
      return existing;
    }

    const sessionId = crypto.randomUUID();

    window.localStorage.setItem(
      storageKey,
      sessionId,
    );

    return sessionId;
  } catch {
    return crypto.randomUUID();
  }
}

function hasTrackedEvent(
  postId: string,
  eventType: AnalyticsEventType,
) {
  try {
    return (
      window.sessionStorage.getItem(
        `elo_post_${eventType}_${postId}`,
      ) === "true"
    );
  } catch {
    return false;
  }
}

function markEventTracked(
  postId: string,
  eventType: AnalyticsEventType,
) {
  try {
    window.sessionStorage.setItem(
      `elo_post_${eventType}_${postId}`,
      "true",
    );
  } catch {
    // Analytics should never interrupt the feed.
  }
}

async function recordPostAnalytics(
  postId: string,
  eventType: AnalyticsEventType,
) {
  if (hasTrackedEvent(postId, eventType)) {
    return;
  }

  markEventTracked(postId, eventType);

  try {
    const supabase = createClient();

    const { error } = await supabase
      .from("post_analytics")
      .insert({
        post_id: postId,
        event_type: eventType,
        session_id: getAnalyticsSessionId(),
      });

    if (error) {
      console.error(
        `Failed to record post ${eventType}:`,
        error,
      );
    }
  } catch (error) {
    console.error(
      `Failed to record post ${eventType}:`,
      error,
    );
  }
}

function AnalyticsPostWrapper({
  postId,
  children,
}: {
  postId: string;
  children: ReactNode;
}) {
  const wrapperRef =
    useRef<HTMLDivElement | null>(null);

  const impressionTimerRef =
    useRef<ReturnType<typeof setTimeout> | null>(
      null,
    );

  useEffect(() => {
    const element = wrapperRef.current;

    if (
      !element ||
      hasTrackedEvent(postId, "impression")
    ) {
      return;
    }

    if (!("IntersectionObserver" in window)) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (
          entry.isIntersecting &&
          entry.intersectionRatio >= 0.5
        ) {
          if (!impressionTimerRef.current) {
            impressionTimerRef.current =
              setTimeout(() => {
                void recordPostAnalytics(
                  postId,
                  "impression",
                );

                observer.disconnect();
                impressionTimerRef.current = null;
              }, 1000);
          }

          return;
        }

        if (impressionTimerRef.current) {
          clearTimeout(
            impressionTimerRef.current,
          );

          impressionTimerRef.current = null;
        }
      },
      {
        threshold: [0, 0.5, 1],
      },
    );

    observer.observe(element);

    return () => {
      observer.disconnect();

      if (impressionTimerRef.current) {
        clearTimeout(
          impressionTimerRef.current,
        );
      }
    };
  }, [postId]);

  function handleClick(
    event: React.MouseEvent<HTMLDivElement>,
  ) {
    const target = event.target;

    if (!(target instanceof Element)) {
      return;
    }

    const postLink = target.closest(
      'a[href^="/posts/"]',
    );

    if (!postLink) {
      return;
    }

    void recordPostAnalytics(
      postId,
      "conversion",
    );
  }

  return (
    <div
      ref={wrapperRef}
      onClickCapture={handleClick}
    >
      {children}
    </div>
  );
}

const DAY_NAMES = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
] as const;

function isTrue(value: unknown) {
  return (
    value === true ||
    value === "true" ||
    value === 1 ||
    value === "1"
  );
}

function getLocalDateString(
  date = new Date(),
) {
  const year = date.getFullYear();

  const month = String(
    date.getMonth() + 1,
  ).padStart(2, "0");

  const day = String(
    date.getDate(),
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function normaliseTime(
  time: string | undefined,
) {
  if (!time) {
    return null;
  }

  const match = time
    .trim()
    .match(
      /^(\d{1,2}):(\d{2})(?::\d{2})?$/,
    );

  if (!match) {
    return null;
  }

  const hours = Number(match[1]);
  const minutes = Number(match[2]);

  if (
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return null;
  }

  return hours * 60 + minutes;
}

function getDayHours(
  openingHours: OpeningHours,
  dayName: string,
) {
  const exactMatch =
    openingHours[dayName];

  if (exactMatch) {
    return exactMatch;
  }

  const matchingKey = Object.keys(
    openingHours,
  ).find(
    (key) =>
      key.toLowerCase() ===
      dayName.toLowerCase(),
  );

  return matchingKey
    ? openingHours[matchingKey]
    : undefined;
}

function isWithinOpeningPeriod(
  currentMinutes: number,
  openingMinutes: number,
  closingMinutes: number,
) {
  if (
    openingMinutes === closingMinutes
  ) {
    return true;
  }

  if (
    closingMinutes > openingMinutes
  ) {
    return (
      currentMinutes >= openingMinutes &&
      currentMinutes < closingMinutes
    );
  }

  return (
    currentMinutes >= openingMinutes ||
    currentMinutes < closingMinutes
  );
}

function isPlaceOpenNow(
  place: DatabasePlace,
  now = new Date(),
) {
  if (!isTrue(place.is_active)) {
    return false;
  }

  if (isTrue(place.metadata?.open_24_7)) {
    return true;
  }

  if (!place.opening_hours) {
    return false;
  }

  const currentDayIndex =
    now.getDay();

  const previousDayIndex =
    (currentDayIndex + 6) % 7;

  const currentMinutes =
    now.getHours() * 60 +
    now.getMinutes();

  const currentDayName =
    DAY_NAMES[currentDayIndex];

  const previousDayName =
    DAY_NAMES[previousDayIndex];

  const currentDayHours =
    getDayHours(
      place.opening_hours,
      currentDayName,
    );

  if (
    currentDayHours &&
    !currentDayHours.closed
  ) {
    const openingMinutes =
      normaliseTime(
        currentDayHours.open,
      );

    const closingMinutes =
      normaliseTime(
        currentDayHours.close,
      );

    if (
      openingMinutes !== null &&
      closingMinutes !== null &&
      isWithinOpeningPeriod(
        currentMinutes,
        openingMinutes,
        closingMinutes,
      )
    ) {
      return true;
    }
  }

  const previousDayHours =
    getDayHours(
      place.opening_hours,
      previousDayName,
    );

  if (
    !previousDayHours ||
    previousDayHours.closed
  ) {
    return false;
  }

  const previousOpeningMinutes =
    normaliseTime(
      previousDayHours.open,
    );

  const previousClosingMinutes =
    normaliseTime(
      previousDayHours.close,
    );

  if (
    previousOpeningMinutes === null ||
    previousClosingMinutes === null
  ) {
    return false;
  }

  const crossesMidnight =
    previousClosingMinutes <
    previousOpeningMinutes;

  return (
    crossesMidnight &&
    currentMinutes <
      previousClosingMinutes
  );
}

function getFirstSentence(text: string) {
  const cleanedText = text
    .replace(/\s+/g, " ")
    .trim();

  if (!cleanedText) {
    return "";
  }

  if (
    typeof Intl.Segmenter !== "undefined"
  ) {
    const segmenter =
      new Intl.Segmenter("en-GB", {
        granularity: "sentence",
      });

    const firstSegment = segmenter
      .segment(cleanedText)
      [Symbol.iterator]()
      .next();

    const firstSentence =
      firstSegment.value?.segment;

    if (firstSentence) {
      return firstSentence.trim();
    }
  }

  const fallbackMatch =
    cleanedText.match(
      /^.*?[.!?](?=\s|$)/,
    );

  return (
    fallbackMatch?.[0]?.trim() ??
    cleanedText
  );
}

function shouldShowImage(
  postId: string,
) {
  let hash = 0;

  for (
    let index = 0;
    index < postId.length;
    index++
  ) {
    hash =
      (hash * 31 +
        postId.charCodeAt(index)) >>>
      0;
  }

  return hash % 100 < 15;
}

function getPostType(
  post: DatabasePost,
) {
  return (
    post.metadata?.public_type ||
    post.type ||
    "post"
  );
}

function getPostColour(
  type: string,
): PostColour {
  switch (type.toLowerCase()) {
    case "alert":
      return "red";

    case "deal":
      return "blue";

    case "event":
      return "emerald";

    default:
      return "amber";
  }
}

function formatCategory(type: string) {
  return (
    type.charAt(0).toUpperCase() +
    type.slice(1).toLowerCase()
  );
}

function isValidDateKey(
  dateKey: string,
) {
  const [year, month, day] =
    dateKey.split("-").map(Number);

  if (!year || !month || !day) {
    return false;
  }

  const date = new Date(
    year,
    month - 1,
    day,
  );

  return !Number.isNaN(
    date.getTime(),
  );
}

function formatActiveDate(
  date: string | undefined,
) {
  if (!date) {
    return undefined;
  }

  const [year, month, day] =
    date.split("-").map(Number);

  if (!year || !month || !day) {
    return undefined;
  }

  const parsedDate = new Date(
    year,
    month - 1,
    day,
  );

  if (
    Number.isNaN(
      parsedDate.getTime(),
    )
  ) {
    return undefined;
  }

  return parsedDate.toLocaleDateString(
    "en-GB",
    {
      weekday: "short",
      day: "numeric",
      month: "long",
    },
  );
}

function getUpcomingDates(
  post: DatabasePost,
) {
  const today =
    getLocalDateString();

  const activeDates =
    post.metadata?.active_dates ?? [];

  return Array.from(
    new Set(activeDates),
  )
    .filter(
      (date) =>
        typeof date === "string" &&
        isValidDateKey(date) &&
        date >= today,
    )
    .sort((a, b) =>
      a.localeCompare(b),
    );
}

function isPostActive(
  post: DatabasePost,
) {
  const activeDates =
    post.metadata?.active_dates ?? [];

  if (activeDates.length > 0) {
    return (
      getUpcomingDates(post).length > 0
    );
  }

  if (post.expires_at) {
    const expiryTime = new Date(
      post.expires_at,
    ).getTime();

    return (
      !Number.isNaN(expiryTime) &&
      expiryTime >= Date.now()
    );
  }

  return true;
}

function mapPost(
  post: DatabasePost,
  groups: Map<
    string,
    {
      name?: string;
      brandColour?: string;
      isLocalPartner: boolean;
    }
  >,
): DisplayPost {
  const type = getPostType(post);
  const normalisedType = type.toLowerCase();

  const cardType: "event" | "deal" | "post" =
    normalisedType === "event"
      ? "event"
      : normalisedType === "deal"
        ? "deal"
        : "post";

  const group = post.group_id
    ? groups.get(post.group_id)
    : undefined;

  const rawDealPrice =
    post.metadata?.deal_price ??
    post.deal_price ??
    null;

  const parsedDealPrice =
    rawDealPrice === null ||
    rawDealPrice === undefined ||
    rawDealPrice === ""
      ? null
      : Number(rawDealPrice);

  const cardMetadata: CardMetadata = {
    ...(post.metadata ?? {}),
    public_type:
      post.metadata?.public_type ?? post.type,
    active_dates:
      post.metadata?.active_dates ?? [],
    location:
      post.metadata?.location ?? null,
    featured:
      post.metadata?.featured ?? false,
    deal_kind:
      post.metadata?.deal_kind ?? null,
    alert_icon:
      post.metadata?.alert_icon ?? null,
    deal_price: Number.isFinite(parsedDealPrice)
      ? parsedDealPrice
      : null,
    buy_quantity:
      post.metadata?.buy_quantity ?? null,
    pay_quantity:
      post.metadata?.pay_quantity ?? null,
    discount_percent:
      post.metadata?.discount_percent ?? null,
  };

  const upcomingDates =
    getUpcomingDates(post);

  const nextActiveDate =
    upcomingDates[0];

  const featured =
    post.metadata?.featured ?? false;

  const displayImage =
    Boolean(post.image_url) &&
    (featured ||
      shouldShowImage(post.id));

  return {
    id: post.id,
    category: formatCategory(type),
    colour: getPostColour(type),
    type: cardType,
    title: post.title,

    description: getFirstSentence(
      post.content ?? "",
    ),

    href: `/posts/${post.id}`,

    imageUrl: displayImage
      ? post.image_url ?? undefined
      : undefined,

    date: nextActiveDate,

    dates: upcomingDates,

    postedBy: group?.name,

    location:
      post.metadata?.location ??
      undefined,

    brandColour:
      group?.brandColour,

    metadata: cardMetadata,

    featured,

    isLocalPartner:
      group?.isLocalPartner ?? false,

    createdAt:
      post.created_at ??
      "9999-12-31T23:59:59.999Z",

    sortDate:
      nextActiveDate ??
      "9999-12-31",
  };
}

function shufflePlaces(
  places: DatabasePlace[],
) {
  const shuffled = [...places];

  for (
    let index =
      shuffled.length - 1;
    index > 0;
    index--
  ) {
    const randomIndex = Math.floor(
      Math.random() * (index + 1),
    );

    [
      shuffled[index],
      shuffled[randomIndex],
    ] = [
      shuffled[randomIndex],
      shuffled[index],
    ];
  }

  return shuffled;
}

function getGreeting(
  date = new Date(),
) {
  const hour = date.getHours();

  if (hour < 12) {
    return "Good morning";
  }

  if (hour < 18) {
    return "Good afternoon";
  }

  return "Good evening";
}

function getFirstName(
  value: string | null | undefined,
) {
  if (!value) {
    return null;
  }

  const cleanedValue = value
    .trim()
    .replace(/[@._-]+/g, " ")
    .replace(/\s+/g, " ");

  if (!cleanedValue) {
    return null;
  }

  const firstName =
    cleanedValue.split(" ")[0];

  return (
    firstName.charAt(0).toUpperCase() +
    firstName.slice(1)
  );
}

function createFeedItems(
  posts: DisplayPost[],
  places: DatabasePlace[],
): FeedItem[] {
  const items: FeedItem[] = [];

  const openPlaces = shufflePlaces(
    places.filter((place) => isPlaceOpenNow(place)),
  );

  let placeIndex = 0;
  let postsSincePlace = 0;
  let nextPlaceAfter = 3;

  posts.forEach((post, index) => {
    items.push({
      kind: "post",
      key: `post-${post.id}`,
      post,
      animationIndex:
        items.length,
    });

    postsSincePlace += 1;

    const shouldInsertPlace =
      placeIndex <
        openPlaces.length &&
      postsSincePlace >=
        nextPlaceAfter &&
      index < posts.length - 1;

    if (!shouldInsertPlace) {
      return;
    }

    const place =
      openPlaces[placeIndex];

    items.push({
      kind: "place",
      key: `place-${place.id}`,
      place,
      animationIndex:
        items.length,
    });

    placeIndex += 1;
    postsSincePlace = 0;

    nextPlaceAfter =
      nextPlaceAfter === 3 ? 5 : 3;
  });

  return items;
}

export default function HomePosts() {
  const [posts, setPosts] =
    useState<DisplayPost[]>([]);

  const [places, setPlaces] =
    useState<DatabasePlace[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] = useState<
    string | null
  >(null);

  const [firstName, setFirstName] =
    useState<string | null>(null);

  const [greeting, setGreeting] =
    useState(() => getGreeting());

  const feedItems = useMemo(
    () =>
      createFeedItems(
        posts,
        places,
      ),
    [posts, places],
  );

  useEffect(() => {
    const supabase =
      createClient();

    async function loadUser() {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session?.user) {
        setFirstName(null);
        return;
      }

      const {
        data: publicUser,
        error: publicUserError,
      } = await supabase
        .from("users")
        .select("username")
        .eq("id", session.user.id)
        .maybeSingle();

      if (publicUserError) {
        console.error(
          "Failed to load public user:",
          publicUserError,
        );

        setFirstName(null);
        return;
      }

      setFirstName(
        getFirstName(
          publicUser?.username,
        ),
      );
    }

    async function loadContent() {
      setLoading(true);
      setError(null);

      const [
        postsResult,
        placesResult,
      ] = await Promise.all([
        supabase
          .from("posts")
          .select(`
            id,
            group_id,
            user_id,
            title,
            content,
            image_url,
            created_at,
            metadata,
            type,
            expires_at,
            event_start,
            event_end,
            deal_price
          `)
          .order("created_at", {
            ascending: false,
          }),

        supabase
          .from("places")
          .select(`
            id,
            page_id,
            title,
            description,
            location_name,
            address,
            postcode,
            latitude,
            longitude,
            tags,
            images,
            opening_hours,
            metadata,
            is_active,
            created_at,
            updated_at,
            is_24_7,
            slug
          `)
          .eq("is_active", true)
          .order("updated_at", {
            ascending: false,
          }),
      ]);

      if (postsResult.error) {
        console.error(
          "Failed to load posts:",
          postsResult.error,
        );

        setError(
          postsResult.error.message,
        );

        setLoading(false);

        return;
      }

      if (placesResult.error) {
        console.error(
          "Failed to load places:",
          placesResult.error,
        );
      }

      const databasePosts =
        (postsResult.data ??
          []) as DatabasePost[];

      const databasePlaces =
        (placesResult.data ??
          []) as DatabasePlace[];

      const filteredPosts =
        databasePosts.filter(
          (post) =>
            post.metadata !== null &&
            Boolean(
              post.metadata
                .public_type,
            ) &&
            Array.isArray(
              post.metadata
                .active_dates,
            ) &&
            post.metadata
              .active_dates.length >
              0 &&
            isPostActive(post),
        );

      const groupIds = [
        ...new Set(
          filteredPosts
            .map(
              (post) =>
                post.group_id,
            )
            .filter(
              (
                groupId,
              ): groupId is string =>
                Boolean(groupId),
            ),
        ),
      ];

      const groups = new Map<
        string,
        {
          name?: string;
          brandColour?: string;
          isLocalPartner: boolean;
        }
      >();

      if (groupIds.length > 0) {
        const {
          data: groupsData,
          error: groupsError,
        } = await supabase
          .from("groups")
          .select("id, name, brand_color, is_local_partner")
          .in("id", groupIds);

        if (groupsError) {
          console.error(
            "Failed to load post authors:",
            groupsError,
          );
        } else {
          for (const group of (groupsData ??
            []) as DatabaseGroup[]) {
            groups.set(group.id, {
              name: group.name ?? undefined,
              brandColour:
                group.brand_color ?? undefined,
              isLocalPartner:
                group.is_local_partner === true,
            });
          }
        }
      }

      const activePosts =
        filteredPosts
          .map((post) =>
            mapPost(
              post,
              groups,
            ),
          )
          .sort((a, b) => {
            const dateOrder =
              a.sortDate.localeCompare(
                b.sortDate,
              );

            if (dateOrder !== 0) {
              return dateOrder;
            }

            if (
              a.isLocalPartner !==
              b.isLocalPartner
            ) {
              return a.isLocalPartner
                ? -1
                : 1;
            }

            const postedOrder =
              a.createdAt.localeCompare(
                b.createdAt,
              );

            if (postedOrder !== 0) {
              return postedOrder;
            }

            return a.id.localeCompare(b.id);
          });

      const openPlaces =
        databasePlaces.filter(
          (place) =>
            isPlaceOpenNow(place),
        );

      setPosts(activePosts);
      setPlaces(openPlaces);
      setLoading(false);
    }

    setGreeting(getGreeting());
    void loadUser();
    void loadContent();
  }, []);

  return (
    <section className="bg-slate-50 py-14">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-600">
            Discover
          </p>

          <h2 className="mt-2 text-4xl font-bold tracking-tight text-slate-900">
            {greeting}
            {firstName
              ? `, ${firstName}.`
              : "."}
          </h2>
        </div>

        {loading && (
          <div className="flex min-h-64 items-center justify-center">
            <LoaderCircle className="h-7 w-7 animate-spin text-emerald-600" />
          </div>
        )}

        {!loading && error && (
          <div className="rounded-3xl bg-red-50 p-6">
            <p className="font-semibold text-red-800">
              We couldn&apos;t load
              the latest posts.
            </p>

            <p className="mt-1 text-sm text-red-700">
              {error}
            </p>
          </div>
        )}

        {!loading &&
          !error &&
          feedItems.length === 0 && (
            <div className="rounded-3xl bg-white p-8 text-center">
              <p className="font-semibold text-slate-900">
                Nothing is happening
                just yet.
              </p>

              <p className="mt-1 text-sm text-slate-500">
                New events, deals and
                alerts will appear here.
              </p>
            </div>
          )}

        {!loading &&
          !error &&
          feedItems.length > 0 && (
            <div className="space-y-6">
              {feedItems.map(
                (item) => (
                  <motion.div
                    key={item.key}
                    initial={{
                      opacity: 0,
                      y: 28,
                      scale: 0.99,
                    }}
                    whileInView={{
                      opacity: 1,
                      y: 0,
                      scale: 1,
                    }}
                    viewport={{
                      once: true,
                      amount: 0.15,
                      margin:
                        "0px 0px -80px 0px",
                    }}
                    transition={{
                      duration: 0.5,
                      delay:
                        Math.min(
                          item.animationIndex %
                            3,
                          2,
                        ) * 0.04,
                      ease: [
                        0.22,
                        1,
                        0.36,
                        1,
                      ],
                    }}
                  >
                    {item.kind ===
                    "post" ? (
                      <AnalyticsPostWrapper
                        postId={item.post.id}
                      >
                        <Post
                          category={
                            item.post
                              .category
                          }
                          colour={
                            item.post
                              .colour
                          }
                          type={
                            item.post.type
                          }
                          brandColour={
                            item.post
                              .brandColour
                          }
                          metadata={
                            item.post
                              .metadata
                          }
                          title={
                            item.post
                              .title
                          }
                          description={
                            item.post
                              .description
                          }
                          href={
                            item.post.href
                          }
                          date={
                            item.post.date
                          }
                          dates={
                            item.post.dates
                          }
                          postedBy={
                            item.post
                              .postedBy
                          }
                          location={
                            item.post
                              .location
                          }
                          featured={
                            item.post
                              .featured
                          }
                          isLocalPartner={
                            item.post
                              .isLocalPartner
                          }
                        />
                      </AnalyticsPostWrapper>
                    ) : (
                      <PlacePost
                        id={
                          item.place.id
                        }
                        title={
                          item.place
                            .title
                        }
                        description={
                          item.place
                            .description
                        }
                        location_name={
                          item.place
                            .location_name
                        }
                        address={
                          item.place
                            .address
                        }
                        postcode={
                          item.place
                            .postcode
                        }
                        images={
                          item.place
                            .images
                        }
                        tags={
                          item.place
                            .tags
                        }
                        opening_hours={
                          item.place
                            .opening_hours as any
                        }
                        is_24_7={
                          isTrue(
                            item.place
                              .metadata
                              ?.open_24_7,
                          )
                        }
                        slug={
                          item.place
                            .slug
                        }
                      />
                    )}
                  </motion.div>
                ),
              )}
            </div>
          )}
      </div>
    </section>
  );
}
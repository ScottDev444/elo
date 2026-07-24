"use client";

import { useEffect, useMemo, useState } from "react";
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
  deal_price?: string | null;
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
  title: string;
  description: string;
  href: string;
  imageUrl?: string;
  date?: string;
  dates: string[];
  postedBy?: string;
  location?: string;
  featured?: boolean;
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

  if (isTrue(place.is_24_7)) {
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
  groupNames: Map<string, string>,
): DisplayPost {
  const type = getPostType(post);

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
    title: post.title,

    description: getFirstSentence(
      post.content ?? "",
    ),

    href: `/posts/${post.id}`,

    imageUrl: displayImage
      ? post.image_url ?? undefined
      : undefined,

    date: formatActiveDate(
      nextActiveDate,
    ),

    dates: upcomingDates,

    postedBy: post.group_id
      ? groupNames.get(post.group_id)
      : undefined,

    location:
      post.metadata?.location ??
      undefined,

    featured,

    sortDate:
      nextActiveDate ??
      post.created_at ??
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

function createFeedItems(
  posts: DisplayPost[],
  places: DatabasePlace[],
): FeedItem[] {
  const items: FeedItem[] = [];

  const openPlaces = places.filter(
    (place) => isPlaceOpenNow(place),
  );

  const alwaysVisiblePlaces =
    shufflePlaces(
      openPlaces.filter((place) =>
        isTrue(place.is_24_7),
      ),
    );

  const regularOpenPlaces =
    shufflePlaces(
      openPlaces.filter(
        (place) =>
          !isTrue(place.is_24_7),
      ),
    );

  alwaysVisiblePlaces.forEach(
    (place) => {
      items.push({
        kind: "place",
        key: `place-${place.id}`,
        place,
        animationIndex:
          items.length,
      });
    },
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
        regularOpenPlaces.length &&
      postsSincePlace >=
        nextPlaceAfter &&
      index < posts.length - 1;

    if (!shouldInsertPlace) {
      return;
    }

    const place =
      regularOpenPlaces[placeIndex];

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

      const groupNames = new Map<
        string,
        string
      >();

      if (groupIds.length > 0) {
        const {
          data: groupsData,
          error: groupsError,
        } = await supabase
          .from("groups")
          .select("id, name")
          .in("id", groupIds);

        if (groupsError) {
          console.error(
            "Failed to load post authors:",
            groupsError,
          );
        } else {
          for (const group of (groupsData ??
            []) as DatabaseGroup[]) {
            if (group.name) {
              groupNames.set(
                group.id,
                group.name,
              );
            }
          }
        }
      }

      const activePosts =
        filteredPosts
          .map((post) =>
            mapPost(
              post,
              groupNames,
            ),
          )
          .sort((a, b) =>
            a.sortDate.localeCompare(
              b.sortDate,
            ),
          );

      const openPlaces =
        databasePlaces.filter(
          (place) =>
            isPlaceOpenNow(place),
        );

      setPosts(activePosts);
      setPlaces(openPlaces);
      setLoading(false);
    }

    void loadContent();
  }, []);

  return (
    <section className="bg-slate-50 py-14">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          className="mb-8"
          initial={{
            opacity: 0,
            y: 24,
          }}
          whileInView={{
            opacity: 1,
            y: 0,
          }}
          viewport={{
            once: true,
            amount: 0.4,
          }}
          transition={{
            duration: 0.55,
            ease: [
              0.22,
              1,
              0.36,
              1,
            ],
          }}
        >
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-600">
            Discover
          </p>

          <h2 className="mt-2 text-4xl font-bold tracking-tight text-slate-900">
            Good morning, Ethan 👋
          </h2>
        </motion.div>

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
                      <Post
                        category={
                          item.post
                            .category
                        }
                        colour={
                          item.post
                            .colour
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
                      />
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
                          item.place
                            .is_24_7
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
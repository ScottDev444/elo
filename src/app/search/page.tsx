"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  CircleX,
  LayoutGrid,
  LoaderCircle,
  MapPin,
  Navigation,
  Search,
  Store,
  Tag,
} from "lucide-react";

import SiteHeader from "@/components/SiteHeader";
import { createClient } from "@/lib/supabase/client";

type GroupInfo = {
  id: string;
  name: string;
  slug: string | null;
  description: string | null;
  logo_url: string | null;
  brand_color: string | null;
  is_local_partner: boolean;
  status: string | null;
  is_public: boolean | null;
};

type Place = {
  id: string;
  page_id: string | null;
  title: string;
  description: string | null;
  location_name: string | null;
  address: string | null;
  postcode: string | null;
  slug: string | null;
  images: unknown;
  is_active: boolean;
  group?: GroupInfo | null;
};

type SearchPost = {
  id: string;
  group_id: string | null;
  title: string;
  content: string | null;
  image_url: string | null;
  type: string;
  event_start: string | null;
  event_end: string | null;
  expires_at: string | null;
  deal_price: string | number | null;
  metadata: {
    public_type?: string;
    active_dates?: string[];
    image_urls?: string[];
    deal_price?: number | string | null;
  } | null;
  group?: GroupInfo | null;
};

type SearchType =
  | "all"
  | "pages"
  | "places"
  | "events"
  | "deals";

type SearchResult =
  | {
      kind: "page";
      score: number;
      item: GroupInfo;
    }
  | {
      kind: "place";
      score: number;
      item: Place;
    }
  | {
      kind: "event";
      score: number;
      item: SearchPost;
    }
  | {
      kind: "deal";
      score: number;
      item: SearchPost;
    };

type SearchLogType =
  | "search"
  | "failed"
  | "selected"
  | "abandoned";

type SearchSourceData = {
  rawPlaces: Place[];
  rawPosts: SearchPost[];
  rawPages: GroupInfo[];
};

const SEARCH_LOG_DELAY = 900;

let searchWarmCache: SearchSourceData | null = null;
let searchWarmupPromise: Promise<SearchSourceData> | null = null;

function todayKey() {
  const now = new Date();

  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(now.getDate()).padStart(2, "0")}`;
}

function localDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(date.getDate()).padStart(2, "0")}`;
}

function parseDateKey(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function normaliseText(value?: string | null) {
  return (value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function normaliseHex(value?: string | null) {
  const clean = value?.trim();

  if (clean && /^#[0-9a-fA-F]{6}$/.test(clean)) {
    return clean;
  }

  if (clean && /^#[0-9a-fA-F]{3}$/.test(clean)) {
    const chars = clean.slice(1);

    return `#${chars
      .split("")
      .map((char) => `${char}${char}`)
      .join("")}`;
  }

  return "#008564";
}

function hexToRgba(colour: string, alpha: number) {
  const hex = normaliseHex(colour).replace("#", "");

  const red = Number.parseInt(hex.slice(0, 2), 16);
  const green = Number.parseInt(hex.slice(2, 4), 16);
  const blue = Number.parseInt(hex.slice(4, 6), 16);

  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

function getReadableTextColour(colour: string) {
  const hex = normaliseHex(colour).replace("#", "");

  const red = Number.parseInt(hex.slice(0, 2), 16);
  const green = Number.parseInt(hex.slice(2, 4), 16);
  const blue = Number.parseInt(hex.slice(4, 6), 16);

  const luminance =
    (0.299 * red + 0.587 * green + 0.114 * blue) / 255;

  return luminance > 0.62 ? "#111111" : "#FFFFFF";
}

function getReadableAccentColour(colour: string) {
  const hex = normaliseHex(colour).replace("#", "");

  let red = Number.parseInt(hex.slice(0, 2), 16);
  let green = Number.parseInt(hex.slice(2, 4), 16);
  let blue = Number.parseInt(hex.slice(4, 6), 16);

  function channelToLinear(value: number) {
    const channel = value / 255;

    return channel <= 0.03928
      ? channel / 12.92
      : Math.pow((channel + 0.055) / 1.055, 2.4);
  }

  function contrastAgainstWhite() {
    const luminance =
      0.2126 * channelToLinear(red) +
      0.7152 * channelToLinear(green) +
      0.0722 * channelToLinear(blue);

    return 1.05 / (luminance + 0.05);
  }

  while (contrastAgainstWhite() < 4.5) {
    red = Math.max(0, Math.round(red * 0.88));
    green = Math.max(0, Math.round(green * 0.88));
    blue = Math.max(0, Math.round(blue * 0.88));
  }

  const toHex = (value: number) =>
    value.toString(16).padStart(2, "0");

  return `#${toHex(red)}${toHex(green)}${toHex(blue)}`;
}

function getUpcomingDates(post: SearchPost) {
  const dates = post.metadata?.active_dates ?? [];
  const today = todayKey();

  return [...dates]
    .filter((date) => date >= today)
    .sort();
}

function getNextDate(post: SearchPost) {
  const dates = getUpcomingDates(post);

  if (dates.length > 0) {
    return dates[0];
  }

  const originalDates = post.metadata?.active_dates;

  if (Array.isArray(originalDates) && originalDates.length > 0) {
    return null;
  }

  if (post.event_start) {
    const parsed = new Date(post.event_start);

    if (!Number.isNaN(parsed.getTime())) {
      const date = localDateKey(parsed);

      if (date >= todayKey()) {
        return date;
      }
    }
  }

  if (post.type === "deal" && post.expires_at) {
    const expiry = new Date(post.expires_at);

    if (
      !Number.isNaN(expiry.getTime()) &&
      expiry.getTime() >= Date.now()
    ) {
      return todayKey();
    }
  }

  return null;
}

function daysUntil(dateKey: string) {
  const today = parseDateKey(todayKey());
  const target = parseDateKey(dateKey);

  return Math.round(
    (target.getTime() - today.getTime()) / 86400000
  );
}

function getRelativeDate(post: SearchPost) {
  const date = getNextDate(post);

  if (!date) return "";

  const difference = daysUntil(date);

  if (difference === 0) return "Today";
  if (difference === 1) return "Tomorrow";
  if (difference < 7) return `In ${difference} days`;

  return parseDateKey(date).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
}

function normaliseImages(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter(
      (item): item is string =>
        typeof item === "string" && item.trim().length > 0
    );
  }

  if (typeof value === "string") {
    const clean = value.trim();

    if (!clean) return [];

    try {
      const parsed = JSON.parse(clean);

      if (Array.isArray(parsed)) {
        return parsed.filter(
          (item): item is string => typeof item === "string"
        );
      }
    } catch {
      return [clean];
    }
  }

  return [];
}

function getPlaceImage(place: Place) {
  return normaliseImages(place.images)[0] ?? null;
}

function getPostImage(post: SearchPost) {
  return post.image_url ?? post.metadata?.image_urls?.[0] ?? null;
}

function getDealPrice(post: SearchPost) {
  const value = post.metadata?.deal_price ?? post.deal_price;

  if (value === null || value === undefined) {
    return "DEAL";
  }

  const clean = String(value).trim();

  if (!clean) {
    return "DEAL";
  }

  if (/^\d+([.,]\d+)?$/.test(clean)) {
    return `£${clean}`;
  }

  return clean;
}

function scorePage(page: GroupInfo, rawQuery: string) {
  const search = normaliseText(rawQuery);

  if (!search) return 0;

  const words = search.split(" ").filter(Boolean);
  const name = normaliseText(page.name);
  const description = normaliseText(page.description);
  const slug = normaliseText(page.slug).replace(/-/g, " ");
  const wholeText = [name, description, slug].join(" ");

  if (!words.every((word) => wholeText.includes(word))) {
    return 0;
  }

  let score = 1;

  if (name === search) {
    score += 1600;
  } else if (name.startsWith(search)) {
    score += 1400;
  } else if (name.includes(search)) {
    score += 1200;
  }

  if (description.includes(search)) {
    score += 80;
  }

  if (slug.includes(search)) {
    score += 120;
  }

  return score;
}

function scorePlace(place: Place, rawQuery: string) {
  const search = normaliseText(rawQuery);

  if (!search) return 0;

  const words = search.split(" ").filter(Boolean);
  const title = normaliseText(place.title);
  const location = normaliseText(place.location_name);
  const address = normaliseText(place.address);
  const postcode = normaliseText(place.postcode);
  const organisation = normaliseText(place.group?.name);
  const description = normaliseText(place.description);

  const wholeText = [
    title,
    location,
    address,
    postcode,
    organisation,
    description,
  ].join(" ");

  if (!words.every((word) => wholeText.includes(word))) {
    return 0;
  }

  let score = 1;

  if (location === search) {
    score += 1500;
  } else if (location.startsWith(search)) {
    score += 1300;
  } else if (location.includes(search)) {
    score += 1100;
  }

  if (address.includes(search)) {
    score += 900;
  }

  if (postcode === search) {
    score += 1300;
  } else if (postcode.includes(search)) {
    score += 800;
  }

  if (title === search) {
    score += 750;
  } else if (title.startsWith(search)) {
    score += 650;
  } else if (title.includes(search)) {
    score += 550;
  }

  if (organisation === search) {
    score += 400;
  } else if (organisation.includes(search)) {
    score += 250;
  }

  if (description.includes(search)) {
    score += 40;
  }

  return score;
}

function scorePost(post: SearchPost, rawQuery: string) {
  const search = normaliseText(rawQuery);

  if (!search) return 0;

  const words = search.split(" ").filter(Boolean);
  const title = normaliseText(post.title);
  const organisation = normaliseText(post.group?.name);
  const content = normaliseText(post.content);

  const wholeText = [title, organisation, content].join(" ");

  if (!words.every((word) => wholeText.includes(word))) {
    return 0;
  }

  let score = 1;

  if (title === search) {
    score += 700;
  } else if (title.startsWith(search)) {
    score += 600;
  } else if (title.includes(search)) {
    score += 500;
  }

  if (organisation === search) {
    score += 350;
  } else if (organisation.includes(search)) {
    score += 220;
  }

  if (content.includes(search)) {
    score += 35;
  }

  return score;
}

function relevanceTier(score: number) {
  if (score >= 900) return 4;
  if (score >= 500) return 3;
  if (score >= 200) return 2;
  return 1;
}

async function fetchSearchSourceData() {
  const supabase = createClient();

  const [placesResult, postsResult, pagesResult] =
    await Promise.all([
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
          slug,
          images,
          is_active
        `)
        .eq("is_active", true),

      supabase
        .from("posts")
        .select(`
          id,
          group_id,
          title,
          content,
          image_url,
          type,
          event_start,
          event_end,
          expires_at,
          deal_price,
          metadata
        `)
        .in("type", ["event", "deal"])
        .limit(500),

      supabase
        .from("groups")
        .select(`
          id,
          name,
          slug,
          description,
          logo_url,
          brand_color,
          is_local_partner,
          status,
          is_public
        `)
        .eq("status", "approved")
        .order("name", {
          ascending: true,
        }),
    ]);

  if (placesResult.error) {
    console.error("Search places error:", placesResult.error);
  }

  if (postsResult.error) {
    console.error("Search posts error:", postsResult.error);
  }

  if (pagesResult.error) {
    console.error("Search pages error:", pagesResult.error);
  }

  return {
    rawPlaces: (placesResult.data ?? []) as Place[],
    rawPosts: (postsResult.data ?? []) as SearchPost[],
    rawPages: ((pagesResult.data ?? []) as GroupInfo[]).filter(
      (page) => page.is_public !== false
    ),
  };
}

function getWarmedSearchData() {
  if (searchWarmCache) {
    return Promise.resolve(searchWarmCache);
  }

  if (!searchWarmupPromise) {
    searchWarmupPromise = fetchSearchSourceData()
      .then((data) => {
        searchWarmCache = data;
        return data;
      })
      .catch((error) => {
        searchWarmupPromise = null;
        throw error;
      });
  }

  return searchWarmupPromise;
}

function PartnerTick({
  colour,
}: {
  colour: string;
}) {
  return (
    <span className="elo-search-partner-tick">
      <CheckCircle2 size={15} color={colour} />
      <span style={{ color: colour }}>Local Partner</span>
    </span>
  );
}

export default function SearchPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [pages, setPages] = useState<GroupInfo[]>([]);
  const [places, setPlaces] = useState<Place[]>([]);
  const [posts, setPosts] = useState<SearchPost[]>([]);
  const [loading, setLoading] = useState(true);

  const [query, setQuery] = useState("");
  const [selectedType, setSelectedType] =
    useState<SearchType>("all");

  const logTimerRef = useRef<ReturnType<
    typeof setTimeout
  > | null>(null);

  const activeQueryRef = useRef("");
  const lastLoggedQueryRef = useRef("");
  const selectedResultRef = useRef(false);

  const recordSearchLog = useCallback(
    async ({
      searchQuery,
      type,
    }: {
      searchQuery: string;
      type: SearchLogType;
    }) => {
      const cleanedQuery = searchQuery
        .trim()
        .slice(0, 200);

      if (!cleanedQuery) return;

      const { error } = await supabase
        .from("search_logs")
        .insert({
          query: cleanedQuery,
          type,
        });

      if (error) {
        console.error(
          "Could not record search log:",
          error
        );
      }
    },
    [supabase]
  );

  const loadData = useCallback(
    async (forceRefresh = false) => {
      setLoading(true);

      try {
        const source = forceRefresh
          ? await fetchSearchSourceData()
          : await getWarmedSearchData();

        if (forceRefresh) {
          searchWarmCache = source;
          searchWarmupPromise = Promise.resolve(source);
        }

        const {
          rawPlaces,
          rawPosts,
          rawPages,
        } = source;

        const upcomingPosts = rawPosts.filter(
          (post) => getNextDate(post) !== null
        );

        const groupMap = new Map(
          rawPages.map((group) => [
            group.id,
            group,
          ])
        );

        setPages(rawPages);

        setPlaces(
          rawPlaces.map((place) => ({
            ...place,
            group: place.page_id
              ? groupMap.get(place.page_id) ?? null
              : null,
          }))
        );

        setPosts(
          upcomingPosts.map((post) => ({
            ...post,
            group: post.group_id
              ? groupMap.get(post.group_id) ?? null
              : null,
          }))
        );
      } catch (error) {
        console.error("Search load error:", error);
        setPages([]);
        setPlaces([]);
        setPosts([]);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const results = useMemo<SearchResult[]>(() => {
    const cleanQuery = query.trim();

    if (!cleanQuery) {
      return [];
    }

    const allResults: SearchResult[] = [];

    if (
      selectedType === "all" ||
      selectedType === "pages"
    ) {
      pages.forEach((page) => {
        const score = scorePage(page, cleanQuery);

        if (score > 0) {
          allResults.push({
            kind: "page",
            item: page,
            score,
          });
        }
      });
    }

    if (
      selectedType === "all" ||
      selectedType === "places"
    ) {
      places.forEach((place) => {
        const score = scorePlace(place, cleanQuery);

        if (score > 0) {
          allResults.push({
            kind: "place",
            item: place,
            score,
          });
        }
      });
    }

    if (
      selectedType === "all" ||
      selectedType === "events"
    ) {
      posts
        .filter((post) => post.type === "event")
        .forEach((post) => {
          const score = scorePost(
            post,
            cleanQuery
          );

          if (score > 0) {
            allResults.push({
              kind: "event",
              item: post,
              score,
            });
          }
        });
    }

    if (
      selectedType === "all" ||
      selectedType === "deals"
    ) {
      posts
        .filter((post) => post.type === "deal")
        .forEach((post) => {
          const score = scorePost(
            post,
            cleanQuery
          );

          if (score > 0) {
            allResults.push({
              kind: "deal",
              item: post,
              score,
            });
          }
        });
    }

    return allResults.sort((a, b) => {
      const aTier = relevanceTier(a.score);
      const bTier = relevanceTier(b.score);

      if (aTier !== bTier) {
        return bTier - aTier;
      }

      const aPartner =
        (a.kind === "page"
          ? a.item.is_local_partner
          : a.item.group?.is_local_partner)
          ? 1
          : 0;

      const bPartner =
        (b.kind === "page"
          ? b.item.is_local_partner
          : b.item.group?.is_local_partner)
          ? 1
          : 0;

      if (aPartner !== bPartner) {
        return bPartner - aPartner;
      }

      if (a.score !== b.score) {
        return b.score - a.score;
      }

      if (
        (a.kind === "event" ||
          a.kind === "deal") &&
        (b.kind === "event" ||
          b.kind === "deal")
      ) {
        const aDate = getNextDate(a.item);
        const bDate = getNextDate(b.item);

        if (
          aDate &&
          bDate &&
          aDate !== bDate
        ) {
          return aDate.localeCompare(bDate);
        }
      }

      return 0;
    });
  }, [
    pages,
    places,
    posts,
    query,
    selectedType,
  ]);

  useEffect(() => {
    if (logTimerRef.current) {
      clearTimeout(logTimerRef.current);
    }

    const cleanedQuery = query.trim();

    activeQueryRef.current = cleanedQuery;

    if (!cleanedQuery || loading) {
      return;
    }

    logTimerRef.current = setTimeout(() => {
      if (
        lastLoggedQueryRef.current ===
        cleanedQuery
      ) {
        return;
      }

      lastLoggedQueryRef.current =
        cleanedQuery;

      void recordSearchLog({
        searchQuery: cleanedQuery,
        type:
          results.length > 0
            ? "search"
            : "failed",
      });
    }, SEARCH_LOG_DELAY);

    return () => {
      if (logTimerRef.current) {
        clearTimeout(logTimerRef.current);
        logTimerRef.current = null;
      }
    };
  }, [
    loading,
    query,
    recordSearchLog,
    results.length,
  ]);

  const recordAbandonedSearch = useCallback(() => {
    const activeQuery =
      activeQueryRef.current.trim();

    if (
      !activeQuery ||
      selectedResultRef.current
    ) {
      return;
    }

    void recordSearchLog({
      searchQuery: activeQuery,
      type: "abandoned",
    });

    activeQueryRef.current = "";
  }, [recordSearchLog]);

  useEffect(() => {
    return () => {
      recordAbandonedSearch();
    };
  }, [recordAbandonedSearch]);

  function handleQueryChange(value: string) {
    setQuery(value);

    activeQueryRef.current =
      value.trim();

    selectedResultRef.current = false;
  }

  function clearSearch() {
    recordAbandonedSearch();

    setQuery("");
    activeQueryRef.current = "";
    lastLoggedQueryRef.current = "";
    selectedResultRef.current = false;
  }

  function openResult(
    href: string
  ) {
    selectedResultRef.current = true;

    void recordSearchLog({
      searchQuery: query,
      type: "selected",
    });

    activeQueryRef.current = "";
    router.push(href);
  }

  function renderPageResult(page: GroupInfo) {
    const colour = normaliseHex(
      page.brand_color
    );

    const accentColour =
      getReadableAccentColour(colour);

    return (
      <button
        key={`page-${page.id}`}
        type="button"
        className="elo-search-result-card"
        onClick={() =>
          openResult(
            `/pages/${encodeURIComponent(
              page.slug || page.id
            )}`
          )
        }
      >
        {page.logo_url ? (
          <span className="elo-search-result-image elo-search-page-logo-wrap">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={page.logo_url}
              alt=""
              className="elo-search-page-logo"
            />
          </span>
        ) : (
          <span
            className="elo-search-result-image elo-search-image-fallback"
            style={{
              backgroundColor: hexToRgba(
                colour,
                0.1
              ),
            }}
          >
            <Store
              size={26}
              color={colour}
            />
          </span>
        )}

        <span className="elo-search-result-body">
          <span className="elo-search-label-row">
            <span
              className="elo-search-type-badge"
              style={{
                backgroundColor: hexToRgba(
                  accentColour,
                  0.1
                ),
                color: accentColour,
              }}
            >
              <Store size={12} />
              PAGE
            </span>

            {page.is_local_partner && (
              <PartnerTick
                colour={accentColour}
              />
            )}
          </span>

          <span className="elo-search-result-title">
            {page.name}
          </span>

          {page.description ? (
            <span className="elo-search-page-description">
              {page.description}
            </span>
          ) : (
            <span
              className="elo-search-organisation"
              style={{
                color: accentColour,
              }}
            >
              Official ELO Page
            </span>
          )}
        </span>

        <ChevronRight
          size={19}
          color="#BBBBBB"
          className="elo-search-chevron"
        />
      </button>
    );
  }

  function renderPlaceResult(place: Place) {
    const image = getPlaceImage(place);

    const colour = normaliseHex(
      place.group?.brand_color
    );

    const accentColour =
      getReadableAccentColour(colour);

    return (
      <button
        key={`place-${place.id}`}
        type="button"
        className="elo-search-result-card"
        onClick={() =>
          openResult(
            `/places/${encodeURIComponent(
              place.slug || place.id
            )}`
          )
        }
      >
        {image ? (
          <span className="elo-search-result-image">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={image}
              alt=""
              className="elo-search-cover-image"
            />
          </span>
        ) : (
          <span
            className="elo-search-result-image elo-search-image-fallback"
            style={{
              backgroundColor: hexToRgba(
                colour,
                0.1
              ),
            }}
          >
            <MapPin
              size={26}
              color={colour}
            />
          </span>
        )}

        <span className="elo-search-result-body">
          <span className="elo-search-label-row">
            <span
              className="elo-search-type-badge"
              style={{
                backgroundColor: hexToRgba(
                  accentColour,
                  0.1
                ),
                color: accentColour,
              }}
            >
              <MapPin size={12} />
              PLACE
            </span>

            {place.group?.is_local_partner && (
              <PartnerTick
                colour={accentColour}
              />
            )}
          </span>

          <span className="elo-search-result-title">
            {place.title}
          </span>

          {place.location_name && (
            <span className="elo-search-location-row">
              <Navigation size={13} />
              <span>
                {place.location_name}
              </span>
            </span>
          )}

          {place.group?.name && (
            <span
              className="elo-search-organisation"
              style={{
                color: accentColour,
              }}
            >
              {place.group.name}
            </span>
          )}
        </span>

        <ChevronRight
          size={19}
          color="#BBBBBB"
          className="elo-search-chevron"
        />
      </button>
    );
  }

  function renderEventResult(post: SearchPost) {
    const image = getPostImage(post);

    const colour = normaliseHex(
      post.group?.brand_color
    );

    const accentColour =
      getReadableAccentColour(colour);

    return (
      <button
        key={`event-${post.id}`}
        type="button"
        className="elo-search-result-card"
        onClick={() =>
          openResult(
            `/posts/${encodeURIComponent(
              post.id
            )}`
          )
        }
      >
        {image ? (
          <span className="elo-search-result-image">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={image}
              alt=""
              className="elo-search-cover-image"
            />
          </span>
        ) : (
          <span
            className="elo-search-result-image elo-search-image-fallback"
            style={{
              backgroundColor: hexToRgba(
                colour,
                0.1
              ),
            }}
          >
            <CalendarDays
              size={25}
              color={colour}
            />
          </span>
        )}

        <span className="elo-search-result-body">
          <span className="elo-search-label-row">
            <span
              className="elo-search-type-badge"
              style={{
                backgroundColor: hexToRgba(
                  accentColour,
                  0.1
                ),
                color: accentColour,
              }}
            >
              <CalendarDays size={12} />
              EVENT
            </span>

            <span
              className="elo-search-date-text"
              style={{
                color: accentColour,
              }}
            >
              {getRelativeDate(post)}
            </span>
          </span>

          <span className="elo-search-result-title">
            {post.title}
          </span>

          <span className="elo-search-organisation-row">
            {post.group?.name && (
              <span
                className="elo-search-organisation"
                style={{
                  color: accentColour,
                }}
              >
                {post.group.name}
              </span>
            )}

            {post.group?.is_local_partner && (
              <PartnerTick
                colour={accentColour}
              />
            )}
          </span>
        </span>

        <ChevronRight
          size={19}
          color="#BBBBBB"
          className="elo-search-chevron"
        />
      </button>
    );
  }

  function renderDealResult(post: SearchPost) {
    const colour = normaliseHex(
      post.group?.brand_color
    );

    const textColour =
      getReadableTextColour(colour);

    return (
      <button
        key={`deal-${post.id}`}
        type="button"
        className="elo-search-deal-card"
        style={{
          backgroundColor: colour,
          borderColor:
            getReadableAccentColour(
              colour
            ),
        }}
        onClick={() =>
          openResult(
            `/posts/${encodeURIComponent(
              post.id
            )}`
          )
        }
      >
        <span className="elo-search-deal-info">
          <span className="elo-search-deal-top">
            <span
              className="elo-search-deal-badge"
              style={{
                backgroundColor:
                  textColour,
                color: colour,
              }}
            >
              <Tag size={11} />
              DEAL
            </span>

            {post.group?.is_local_partner && (
              <span
                className="elo-search-deal-partner"
                style={{
                  color: textColour,
                }}
              >
                <CheckCircle2
                  size={14}
                />
                LP
              </span>
            )}
          </span>

          <span
            className="elo-search-deal-title"
            style={{
              color: textColour,
            }}
          >
            {post.title}
          </span>

          <span
            className="elo-search-deal-organisation"
            style={{
              color: hexToRgba(
                textColour,
                0.8
              ),
            }}
          >
            {post.group?.name ?? ""}
          </span>

          <span
            className="elo-search-deal-date"
            style={{
              color: textColour,
            }}
          >
            {getRelativeDate(post)}
          </span>
        </span>

        <span
          className="elo-search-deal-divider"
          style={{
            borderColor: hexToRgba(
              textColour,
              0.35
            ),
          }}
        />

        <span className="elo-search-deal-price-area">
          <span
            className="elo-search-deal-price"
            style={{
              color: textColour,
            }}
          >
            {getDealPrice(post)}
          </span>
        </span>
      </button>
    );
  }

  const filterOptions: Array<{
    value: SearchType;
    label: string;
    icon: React.ReactNode;
  }> = [
    {
      value: "all",
      label: "All",
      icon: <LayoutGrid size={14} />,
    },
    {
      value: "pages",
      label: "Pages",
      icon: <Store size={14} />,
    },
    {
      value: "places",
      label: "Places",
      icon: <MapPin size={14} />,
    },
    {
      value: "events",
      label: "Events",
      icon: <CalendarDays size={14} />,
    },
    {
      value: "deals",
      label: "Deals",
      icon: <Tag size={14} />,
    },
  ];

  return (
    <main className="elo-search-page">
      <SiteHeader />

      <section className="elo-search-main">
        <div className="elo-search-area">
          <h1>Search East Lothian</h1>

          <p>
            Pages, Places, upcoming events and local deals.
          </p>

          <div className="elo-search-box">
            <Search
              size={21}
              color="#777777"
              strokeWidth={2.2}
            />

            <input
              value={query}
              onChange={(event) =>
                handleQueryChange(
                  event.target.value
                )
              }
              placeholder='Try “Haddington”, “coffee” or “market”'
              autoComplete="off"
              spellCheck={false}
              aria-label="Search East Lothian"
            />

            {loading &&
              query.trim().length > 0 && (
                <LoaderCircle
                  size={19}
                  color="#008564"
                  className="elo-search-spin"
                />
              )}

            {query.length > 0 && (
              <button
                type="button"
                className="elo-search-clear"
                onClick={clearSearch}
                aria-label="Clear search"
              >
                <CircleX
                  size={20}
                  color="#999999"
                />
              </button>
            )}
          </div>

          <div
            className="elo-search-filters"
            role="group"
            aria-label="Search filters"
          >
            {filterOptions.map(
              ({
                value,
                label,
                icon,
              }) => {
                const active =
                  selectedType === value;

                return (
                  <button
                    key={value}
                    type="button"
                    className={`elo-search-filter ${
                      active
                        ? "is-active"
                        : ""
                    }`}
                    onClick={() =>
                      setSelectedType(
                        value
                      )
                    }
                  >
                    {icon}
                    <span>{label}</span>
                  </button>
                );
              }
            )}
          </div>

          {query.trim() &&
            !loading &&
            results.length > 0 && (
              <div className="elo-search-results-text">
                {results.length}{" "}
                {results.length === 1
                  ? "result"
                  : "results"}
              </div>
            )}
        </div>

        <div className="elo-search-results">
          {query.trim().length === 0 ? (
            <div className="elo-search-empty">
              <div className="elo-search-empty-icon">
                <Search
                  size={28}
                  color="#008564"
                />
              </div>

              <h2>
                Find something local
              </h2>

              <p>
                Search by Page, town, Place, event, business, postcode or deal.
              </p>
            </div>
          ) : loading ? (
            <div className="elo-search-pending">
              <LoaderCircle
                size={19}
                color="#008564"
                className="elo-search-spin"
              />
              <span>
                Searching East Lothian...
              </span>
            </div>
          ) : results.length === 0 ? (
            <div className="elo-search-empty">
              <Search
                size={31}
                color="#AAAAAA"
              />

              <h2>
                Nothing found
              </h2>

              <p>
                Try another town, name or keyword.
              </p>
            </div>
          ) : (
            results.map((result) => {
              if (
                result.kind === "page"
              ) {
                return renderPageResult(
                  result.item
                );
              }

              if (
                result.kind === "place"
              ) {
                return renderPlaceResult(
                  result.item
                );
              }

              if (
                result.kind === "event"
              ) {
                return renderEventResult(
                  result.item
                );
              }

              return renderDealResult(
                result.item
              );
            })
          )}
        </div>
      </section>

      <style>{`
        .elo-search-page {
          min-height: 100dvh;
          background: #F4F5F4;
          color: #171717;
          font-family: var(--font-geist-sans), Arial, sans-serif;
        }

        .elo-search-page *,
        .elo-search-page *::before,
        .elo-search-page *::after {
          box-sizing: border-box;
        }

        .elo-search-page button,
        .elo-search-page input {
          font: inherit;
        }

        .elo-search-main {
          width: 100%;
          max-width: 760px;
          margin: 0 auto;
          padding-bottom: 120px;
        }

        .elo-search-area {
          padding: 21px 16px 14px;
        }

        .elo-search-area h1 {
          margin: 0;
          color: #005744;
          font-size: 27px;
          line-height: 33px;
          font-weight: 900;
          letter-spacing: -.6px;
        }

        .elo-search-area > p {
          margin: 4px 0 0;
          color: #777777;
          font-size: 14px;
          line-height: 20px;
        }

        .elo-search-box {
          height: 56px;
          display: flex;
          align-items: center;
          gap: 10px;
          margin-top: 18px;
          padding: 0 16px;
          border: 1px solid #DCDDDC;
          border-radius: 16px;
          background: #FFFFFF;
        }

        .elo-search-box > svg {
          flex: 0 0 auto;
        }

        .elo-search-box input {
          min-width: 0;
          flex: 1;
          height: 100%;
          border: 0;
          outline: 0;
          background: transparent;
          color: #111111;
          font-size: 15px;
          font-weight: 600;
        }

        .elo-search-box input::placeholder {
          color: #999999;
          opacity: 1;
        }

        .elo-search-clear {
          width: 28px;
          height: 28px;
          flex: 0 0 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 0;
          border-radius: 50%;
          background: transparent;
          padding: 0;
          cursor: pointer;
        }

        .elo-search-filters {
          display: grid;
          grid-template-columns: repeat(5, minmax(0, 1fr));
          gap: 7px;
          margin-top: 11px;
        }

        .elo-search-filter {
          min-width: 0;
          min-height: 38px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
          border: 1px solid #DEDFDE;
          border-radius: 11px;
          background: #FFFFFF;
          color: #666666;
          padding: 0 7px;
          cursor: pointer;
        }

        .elo-search-filter span {
          overflow: hidden;
          text-overflow: ellipsis;
          font-size: 10px;
          font-weight: 800;
        }

        .elo-search-filter.is-active {
          border-color: #008564;
          background: #008564;
          color: #FFFFFF;
        }

        .elo-search-filter:focus {
          outline: none;
        }

        .elo-search-filter:focus-visible,
        .elo-search-result-card:focus-visible,
        .elo-search-deal-card:focus-visible {
          outline: 2px solid #9CADAA;
          outline-offset: 2px;
        }

        .elo-search-results-text {
          margin-top: 13px;
          color: #999999;
          font-size: 11px;
          font-weight: 700;
        }

        .elo-search-results {
          width: 100%;
        }

        .elo-search-result-card {
          width: calc(100% - 32px);
          min-height: 102px;
          display: flex;
          align-items: center;
          gap: 12px;
          margin: 0 16px 10px;
          padding: 9px;
          border: 1px solid #E1E2E1;
          border-radius: 16px;
          background: #FFFFFF;
          color: inherit;
          text-align: left;
          cursor: pointer;
          transition:
            transform 120ms ease,
            box-shadow 120ms ease;
        }

        .elo-search-result-card:hover {
          transform: translateY(-1px);
          box-shadow: 0 7px 20px rgba(0,0,0,.055);
        }

        .elo-search-result-image {
          position: relative;
          width: 82px;
          height: 82px;
          flex: 0 0 82px;
          overflow: hidden;
          border-radius: 12px;
          background: #EEEEEE;
        }

        .elo-search-cover-image,
        .elo-search-page-logo {
          display: block;
          width: 100%;
          height: 100%;
        }

        .elo-search-cover-image {
          object-fit: cover;
        }

        .elo-search-page-logo-wrap {
          border: 1px solid #E4E7E5;
          background: #FFFFFF;
          padding: 8px;
        }

        .elo-search-page-logo {
          object-fit: contain;
          background: #FFFFFF;
        }

        .elo-search-image-fallback {
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .elo-search-result-body {
          min-width: 0;
          flex: 1;
          display: block;
        }

        .elo-search-label-row {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 7px;
        }

        .elo-search-type-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 4px 7px;
          border-radius: 7px;
          font-size: 9px;
          line-height: 12px;
          font-weight: 900;
          letter-spacing: .7px;
        }

        .elo-search-date-text {
          margin-left: auto;
          font-size: 10px;
          font-weight: 900;
        }

        .elo-search-partner-tick {
          display: inline-flex;
          align-items: center;
          gap: 3px;
        }

        .elo-search-partner-tick span {
          font-size: 9px;
          font-weight: 800;
        }

        .elo-search-result-title {
          display: -webkit-box;
          overflow: hidden;
          margin-top: 6px;
          color: #171717;
          font-size: 15px;
          line-height: 19px;
          font-weight: 800;
          -webkit-box-orient: vertical;
          -webkit-line-clamp: 2;
        }

        .elo-search-page-description {
          display: -webkit-box;
          overflow: hidden;
          margin-top: 5px;
          color: #707A76;
          font-size: 11px;
          line-height: 16px;
          font-weight: 600;
          -webkit-box-orient: vertical;
          -webkit-line-clamp: 2;
        }

        .elo-search-location-row {
          min-width: 0;
          display: flex;
          align-items: center;
          gap: 4px;
          margin-top: 5px;
          color: #666666;
        }

        .elo-search-location-row span {
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: 11px;
          font-weight: 700;
        }

        .elo-search-organisation-row {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: 4px;
        }

        .elo-search-organisation {
          display: block;
          max-width: 100%;
          overflow: hidden;
          margin-top: 4px;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: 11px;
          font-weight: 800;
        }

        .elo-search-organisation-row .elo-search-organisation {
          min-width: 0;
          margin-top: 0;
        }

        .elo-search-chevron {
          flex: 0 0 auto;
        }

        .elo-search-deal-card {
          width: calc(100% - 32px);
          min-height: 132px;
          display: flex;
          overflow: hidden;
          margin: 0 16px 10px;
          padding: 0 0 0 17px;
          border: 1px solid;
          border-radius: 18px;
          text-align: left;
          cursor: pointer;
          transition:
            transform 120ms ease,
            box-shadow 120ms ease;
        }

        .elo-search-deal-card:hover {
          transform: translateY(-1px);
          box-shadow: 0 7px 22px rgba(0,0,0,.09);
        }

        .elo-search-deal-info {
          min-width: 0;
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: center;
          padding: 14px 12px 14px 0;
        }

        .elo-search-deal-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
        }

        .elo-search-deal-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          border-radius: 7px;
          padding: 5px 8px;
          font-size: 9px;
          line-height: 12px;
          font-weight: 900;
          letter-spacing: .8px;
        }

        .elo-search-deal-partner {
          display: inline-flex;
          align-items: center;
          gap: 3px;
          font-size: 9px;
          font-weight: 900;
        }

        .elo-search-deal-title {
          display: -webkit-box;
          overflow: hidden;
          margin-top: 9px;
          font-size: 16px;
          line-height: 20px;
          font-weight: 900;
          -webkit-box-orient: vertical;
          -webkit-line-clamp: 2;
        }

        .elo-search-deal-organisation {
          overflow: hidden;
          margin-top: 3px;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: 11px;
          font-weight: 800;
        }

        .elo-search-deal-date {
          margin-top: 7px;
          font-size: 10px;
          font-weight: 800;
        }

        .elo-search-deal-divider {
          width: 1px;
          flex: 0 0 1px;
          margin: 13px 0;
          border-left: 1px dashed;
        }

        .elo-search-deal-price-area {
          width: 108px;
          flex: 0 0 108px;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0 8px;
        }

        .elo-search-deal-price {
          max-width: 100%;
          overflow-wrap: anywhere;
          text-align: center;
          font-size: 28px;
          line-height: 29px;
          font-weight: 900;
          letter-spacing: -.8px;
        }

        .elo-search-pending {
          min-height: 72px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 9px;
          margin: 0 16px;
          color: #7A8580;
          font-size: 11px;
          font-weight: 700;
        }

        .elo-search-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 65px 36px 0;
          text-align: center;
        }

        .elo-search-empty-icon {
          width: 62px;
          height: 62px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
          background: #E6F3EF;
        }

        .elo-search-empty h2 {
          margin: 14px 0 0;
          color: #222222;
          font-size: 18px;
          line-height: 23px;
          font-weight: 800;
        }

        .elo-search-empty p {
          max-width: 310px;
          margin: 6px 0 0;
          color: #888888;
          font-size: 13px;
          line-height: 20px;
        }

        .elo-search-spin {
          flex: 0 0 auto;
          animation: elo-search-spin .8s linear infinite;
        }

        @keyframes elo-search-spin {
          to {
            transform: rotate(360deg);
          }
        }

        @media (max-width: 560px) {
          .elo-search-filters {
            display: flex;
            overflow-x: auto;
            scrollbar-width: none;
            padding-bottom: 1px;
          }

          .elo-search-filters::-webkit-scrollbar {
            display: none;
          }

          .elo-search-filter {
            min-width: 88px;
            flex: 0 0 auto;
          }
        }

        @media (max-width: 420px) {
          .elo-search-result-image {
            width: 72px;
            height: 72px;
            flex-basis: 72px;
          }

          .elo-search-result-card {
            min-height: 92px;
            gap: 10px;
          }

          .elo-search-deal-price-area {
            width: 92px;
            flex-basis: 92px;
          }

          .elo-search-deal-price {
            font-size: 23px;
            line-height: 25px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .elo-search-spin {
            animation: none;
          }

          .elo-search-result-card,
          .elo-search-deal-card {
            transition: none;
          }
        }
      `}</style>
    </main>
  );
}

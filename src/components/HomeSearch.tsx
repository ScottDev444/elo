"use client";

import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  CalendarDays,
  Loader2,
  MapPin,
  Search,
  Store,
  Users,
  X,
} from "lucide-react";

import { createClient } from "@/lib/supabase/client";

type PostMetadata = {
  public_type?: string;
  active_dates?: string[];
  location?: string;
  slug?: string;
  description?: string;
  address?: string;
  category?: string;
  tags?: string[];
};

type SearchPost = {
  id: string;
  group_id: string | null;
  title: string;
  content: string | null;
  expires_at: string | null;
  metadata: PostMetadata | null;
};

type SearchGroup = {
  id: string;
  name: string;
  description: string | null;
  slug: string | null;
};

type SearchPlace = {
  id: string;
  page_id: string | null;
  title: string;
  description: string | null;
  location_name: string | null;
  address: string | null;
  postcode: string | null;
  tags: string[] | null;
  slug: string | null;
  is_active: boolean | null;
};

type SearchResult =
  | {
      kind: "today";
      post: SearchPost;
    }
  | {
      kind: "place";
      place: SearchPlace;
    }
  | {
      kind: "upcoming";
      post: SearchPost;
    }
  | {
      kind: "group";
      group: SearchGroup;
    };

type SearchSection = {
  id: "today" | "places" | "upcoming" | "groups";
  title: string;
  results: SearchResult[];
};

type SearchLogType =
  | "search"
  | "failed"
  | "abandoned"
  | "selected";

const RESULTS_PER_SECTION = 5;
const SEARCH_LOG_DELAY = 650;

function getLocalDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function parseLocalDate(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);

  if (!year || !month || !day) {
    return null;
  }

  const date = new Date(
    year,
    month - 1,
    day,
    23,
    59,
    59,
    999,
  );

  return Number.isNaN(date.getTime()) ? null : date;
}

function getActiveDates(post: SearchPost) {
  const activeDates = post.metadata?.active_dates;

  if (!Array.isArray(activeDates)) {
    return [];
  }

  return activeDates.filter(
    (date): date is string =>
      typeof date === "string" &&
      parseLocalDate(date) !== null,
  );
}

function isPostActive(post: SearchPost) {
  if (!post.metadata?.public_type) {
    return false;
  }

  const now = Date.now();

  if (post.expires_at) {
    const expiry = new Date(post.expires_at);

    if (
      !Number.isNaN(expiry.getTime()) &&
      expiry.getTime() < now
    ) {
      return false;
    }
  }

  const activeDates = getActiveDates(post);

  if (activeDates.length === 0) {
    return false;
  }

  return activeDates.some((dateKey) => {
    const date = parseLocalDate(dateKey);

    return date && date.getTime() >= now;
  });
}

function isOnToday(post: SearchPost) {
  return getActiveDates(post).includes(getLocalDateKey());
}

function startOfDay(date: Date) {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  );
}

function endOfDay(date: Date) {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    23,
    59,
    59,
    999,
  );
}

function getUpcomingWindow() {
  const today = startOfDay(new Date());
  const dayOfWeek = today.getDay();

  if (dayOfWeek === 5) {
    const sunday = new Date(today);
    sunday.setDate(today.getDate() + 2);

    return {
      start: today,
      end: endOfDay(sunday),
      title: "This weekend",
    };
  }

  if (dayOfWeek === 6) {
    const sunday = new Date(today);
    sunday.setDate(today.getDate() + 1);

    return {
      start: today,
      end: endOfDay(sunday),
      title: "This weekend",
    };
  }

  if (dayOfWeek === 0) {
    return {
      start: today,
      end: endOfDay(today),
      title: "This weekend",
    };
  }

  const sunday = new Date(today);
  sunday.setDate(today.getDate() + (7 - dayOfWeek));

  return {
    start: today,
    end: endOfDay(sunday),
    title: "This week",
  };
}

function isInUpcomingWindow(post: SearchPost) {
  const todayKey = getLocalDateKey();
  const upcomingWindow = getUpcomingWindow();

  return getActiveDates(post).some((dateKey) => {
    if (dateKey === todayKey) {
      return false;
    }

    const date = parseLocalDate(dateKey);

    if (!date) {
      return false;
    }

    return (
      date.getTime() >= upcomingWindow.start.getTime() &&
      date.getTime() <= upcomingWindow.end.getTime()
    );
  });
}

function getNextActiveDate(post: SearchPost) {
  const now = Date.now();

  return (
    getActiveDates(post)
      .map(parseLocalDate)
      .filter((date): date is Date => date !== null)
      .map((date) => date.getTime())
      .filter((time) => time >= now)
      .sort((a, b) => a - b)[0] ??
    Number.MAX_SAFE_INTEGER
  );
}

function normalise(value: string) {
  return value
    .toLocaleLowerCase("en-GB")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function getPostSearchText(post: SearchPost) {
  return [
    post.title,
    post.content,
    post.metadata?.location,
    post.metadata?.category,
    post.metadata?.public_type,
  ]
    .filter(Boolean)
    .join(" ");
}

function getPlaceSearchText(place: SearchPlace) {
  return [
    place.title,
    place.description,
    place.location_name,
    place.address,
    place.postcode,
    ...(Array.isArray(place.tags) ? place.tags : []),
  ]
    .filter(Boolean)
    .join(" ");
}

function getGroupSearchText(group: SearchGroup) {
  return [group.name, group.description]
    .filter(Boolean)
    .join(" ");
}

function getSearchScore(
  query: string,
  title: string,
  searchableText: string,
) {
  const normalisedQuery = normalise(query);

  if (!normalisedQuery) {
    return 0;
  }

  const normalisedTitle = normalise(title);
  const normalisedText = normalise(searchableText);

  let score = 0;

  /*
   * Title relevance deliberately dominates everything else.
   * A weak description match should never outrank a strong
   * page, place or post title match.
   */
  if (normalisedTitle === normalisedQuery) {
    score += 1200;
  } else if (normalisedTitle.startsWith(normalisedQuery)) {
    score += 900;
  } else if (normalisedTitle.includes(normalisedQuery)) {
    score += 650;
  }

  if (normalisedText.includes(normalisedQuery)) {
    score += 80;
  }

  const words = query
    .toLocaleLowerCase("en-GB")
    .split(/\s+/)
    .filter(Boolean);

  const lowerTitle = title.toLocaleLowerCase("en-GB");
  const lowerText = searchableText.toLocaleLowerCase("en-GB");

  score +=
    words.filter((word) => lowerTitle.includes(word)).length *
    120;

  score +=
    words.filter((word) => lowerText.includes(word)).length *
    12;

  return score;
}

function truncate(
  value: string | null,
  maximumLength = 110,
) {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();

  if (trimmed.length <= maximumLength) {
    return trimmed;
  }

  return `${trimmed.slice(0, maximumLength).trim()}…`;
}

function getResultId(result: SearchResult) {
  if (result.kind === "group") {
    return result.group.id;
  }

  if (result.kind === "place") {
    return result.place.id;
  }

  return result.post.id;
}

function getResultKey(result: SearchResult) {
  return `${result.kind}-${getResultId(result)}`;
}

function getResultHref(result: SearchResult) {
  if (result.kind === "group") {
    return `/pages/${result.group.id}`;
  }

  if (result.kind === "place") {
    return `/places/${result.place.slug ?? result.place.id}`;
  }

  return `/posts/${result.post.id}`;
}

function getResultTitle(result: SearchResult) {
  if (result.kind === "group") {
    return result.group.name;
  }

  if (result.kind === "place") {
    return result.place.title;
  }

  return result.post.title;
}

function getResultDescription(result: SearchResult) {
  if (result.kind === "group") {
    return truncate(result.group.description);
  }

  if (result.kind === "place") {
    return truncate(result.place.description);
  }

  return truncate(result.post.content);
}

function getResultLocation(result: SearchResult) {
  if (result.kind === "place") {
    return [
      result.place.location_name,
      result.place.address,
      result.place.postcode,
    ]
      .filter(Boolean)
      .join(", ");
  }

  if (result.kind === "group") {
    return null;
  }

  return result.post.metadata?.location;
}

function ResultIcon({
  result,
}: {
  result: SearchResult;
}) {
  if (result.kind === "place") {
    return <MapPin className="h-4 w-4" />;
  }

  if (result.kind === "group") {
    return <Users className="h-4 w-4" />;
  }

  return <CalendarDays className="h-4 w-4" />;
}

function SectionIcon({
  sectionId,
}: {
  sectionId: SearchSection["id"];
}) {
  if (sectionId === "places") {
    return <Store className="h-3.5 w-3.5" />;
  }

  if (sectionId === "groups") {
    return <Users className="h-3.5 w-3.5" />;
  }

  return <CalendarDays className="h-3.5 w-3.5" />;
}

function SearchResultItem({
  result,
  onSelect,
}: {
  result: SearchResult;
  onSelect: (result: SearchResult) => void;
}) {
  const title = getResultTitle(result);
  const description = getResultDescription(result);
  const location = getResultLocation(result);

  return (
    <button
      type="button"
      onClick={() => onSelect(result)}
      className="group/result flex w-full gap-3 rounded-2xl px-3 py-3 text-left transition hover:bg-emerald-50 focus-visible:bg-emerald-50 focus-visible:outline-none"
    >
      <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 transition group-hover/result:bg-emerald-600 group-hover/result:text-white">
        <ResultIcon result={result} />
      </span>

      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-neutral-900">
          {title}
        </span>

        {description && (
          <span className="mt-1 line-clamp-2 block text-xs leading-5 text-neutral-500">
            {description}
          </span>
        )}

        {location && (
          <span className="mt-1.5 flex items-center gap-1 text-[11px] font-medium text-emerald-700">
            <MapPin className="h-3 w-3" />
            {location}
          </span>
        )}
      </span>
    </button>
  );
}

export default function HomeSearch() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const containerRef = useRef<HTMLDivElement>(null);

  const logTimerRef = useRef<
    ReturnType<typeof setTimeout> | undefined
  >(undefined);

  const activeQueryRef = useRef("");
  const lastLoggedQueryRef = useRef("");
  const selectedResultRef = useRef(false);

  const [query, setQuery] = useState("");
  const [posts, setPosts] = useState<SearchPost[]>([]);
  const [places, setPlaces] = useState<SearchPlace[]>([]);
  const [groups, setGroups] = useState<SearchGroup[]>([]);
  const [isFocused, setIsFocused] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(
    null,
  );

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

      if (!cleanedQuery) {
        return;
      }

      const { error: searchLogError } = await supabase
        .from("search_logs")
        .insert({
          query: cleanedQuery,
          type,
        });

      if (searchLogError) {
        console.error("Could not record search log:", {
          message: searchLogError.message,
          details: searchLogError.details,
          hint: searchLogError.hint,
          code: searchLogError.code,
        });
      }
    },
    [supabase],
  );

  useEffect(() => {
    let cancelled = false;

    async function loadSearchData() {
      setIsLoading(true);
      setError(null);

      const [postsResponse, placesResponse, groupsResponse] =
        await Promise.all([
          supabase.from("posts").select(`
            id,
            group_id,
            title,
            content,
            expires_at,
            metadata
          `),

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
              tags,
              slug,
              is_active
            `)
            .eq("is_active", true),

          supabase.from("groups").select(`
            id,
            name,
            description,
            slug
          `),
        ]);

      if (cancelled) {
        return;
      }

      if (postsResponse.error) {
        console.error("Could not load search posts:", {
          message: postsResponse.error.message,
          details: postsResponse.error.details,
          hint: postsResponse.error.hint,
          code: postsResponse.error.code,
        });

        setError("Search is temporarily unavailable.");
        setIsLoading(false);
        return;
      }

      if (placesResponse.error) {
        console.error("Could not load search places:", {
          message: placesResponse.error.message,
          details: placesResponse.error.details,
          hint: placesResponse.error.hint,
          code: placesResponse.error.code,
        });

        setError("Search is temporarily unavailable.");
        setIsLoading(false);
        return;
      }

      if (groupsResponse.error) {
        console.error("Could not load search pages:", {
          message: groupsResponse.error.message,
          details: groupsResponse.error.details,
          hint: groupsResponse.error.hint,
          code: groupsResponse.error.code,
        });

        setError("Search is temporarily unavailable.");
        setIsLoading(false);
        return;
      }

      setPosts((postsResponse.data ?? []) as SearchPost[]);
      setPlaces((placesResponse.data ?? []) as SearchPlace[]);
      setGroups((groupsResponse.data ?? []) as SearchGroup[]);
      setIsLoading(false);
    }

    void loadSearchData();

    return () => {
      cancelled = true;
    };
  }, [supabase]);

  const activePosts = useMemo(
    () => posts.filter(isPostActive),
    [posts],
  );

  const groupIdsWithPlaces = useMemo(
    () =>
      new Set(
        places
          .map((place) => place.page_id)
          .filter((id): id is string => Boolean(id)),
      ),
    [places],
  );

  const sections = useMemo<SearchSection[]>(() => {
    const cleanedQuery = query.trim();

    if (!cleanedQuery) {
      return [];
    }

    const matchingPosts = activePosts
      .map((post) => ({
        post,
        score: getSearchScore(
          cleanedQuery,
          post.title,
          getPostSearchText(post),
        ),
      }))
      .filter(({ score }) => score > 0);

    const todayMatches = matchingPosts
      .filter(({ post }) => isOnToday(post))
      .sort((a, b) => b.score - a.score);

    const upcomingMatches = matchingPosts
      .filter(
        ({ post }) =>
          !isOnToday(post) &&
          isInUpcomingWindow(post),
      )
      .sort((a, b) => {
        if (b.score !== a.score) {
          return b.score - a.score;
        }

        return (
          getNextActiveDate(a.post) -
          getNextActiveDate(b.post)
        );
      });

    const placeMatches = places
      .map((place) => ({
        place,
        score: getSearchScore(
          cleanedQuery,
          place.title,
          getPlaceSearchText(place),
        ),
      }))
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score);

    const groupMatches = groups
      .filter((group) => !groupIdsWithPlaces.has(group.id))
      .map((group) => ({
        group,
        score: getSearchScore(
          cleanedQuery,
          group.name,
          getGroupSearchText(group),
        ),
      }))
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score);

    return [
      {
        id: "today" as const,
        title: "On today",
        rank: todayMatches[0]?.score ?? 0,
        priority: 4,
        results: todayMatches
          .slice(0, RESULTS_PER_SECTION)
          .map(({ post }) => ({
            kind: "today" as const,
            post,
          })),
      },
      {
        id: "places" as const,
        title: "Places",
        rank: placeMatches[0]?.score ?? 0,
        priority: 3,
        results: placeMatches
          .slice(0, RESULTS_PER_SECTION)
          .map(({ place }) => ({
            kind: "place" as const,
            place,
          })),
      },
      {
        id: "groups" as const,
        title: "Pages",
        rank: groupMatches[0]?.score ?? 0,
        priority: 2,
        results: groupMatches
          .slice(0, RESULTS_PER_SECTION)
          .map(({ group }) => ({
            kind: "group" as const,
            group,
          })),
      },
      {
        id: "upcoming" as const,
        title: getUpcomingWindow().title,
        rank: upcomingMatches[0]?.score ?? 0,
        priority: 1,
        results: upcomingMatches
          .slice(0, RESULTS_PER_SECTION)
          .map(({ post }) => ({
            kind: "upcoming" as const,
            post,
          })),
      },
    ]
      .filter((section) => section.results.length > 0)
      .sort((a, b) => {
        if (b.rank !== a.rank) {
          return b.rank - a.rank;
        }

        return b.priority - a.priority;
      })
      .map(({ id, title, results }) => ({
        id,
        title,
        results,
      })) as SearchSection[];
  }, [
    activePosts,
    groupIdsWithPlaces,
    groups,
    places,
    query,
  ]);

  const totalResults = useMemo(
    () =>
      sections.reduce(
        (total, section) =>
          total + section.results.length,
        0,
      ),
    [sections],
  );

  useEffect(() => {
    if (logTimerRef.current) {
      clearTimeout(logTimerRef.current);
    }

    const cleanedQuery = query.trim();

    activeQueryRef.current = cleanedQuery;

    if (!cleanedQuery || isLoading || error) {
      return;
    }

    logTimerRef.current = setTimeout(() => {
      if (
        lastLoggedQueryRef.current === cleanedQuery
      ) {
        return;
      }

      lastLoggedQueryRef.current = cleanedQuery;

      void recordSearchLog({
        searchQuery: cleanedQuery,
        type:
          totalResults > 0 ? "search" : "failed",
      });
    }, SEARCH_LOG_DELAY);

    return () => {
      if (logTimerRef.current) {
        clearTimeout(logTimerRef.current);
      }
    };
  }, [
    error,
    isLoading,
    query,
    recordSearchLog,
    totalResults,
  ]);

  const recordAbandonedSearch = useCallback(() => {
    const activeQuery = activeQueryRef.current.trim();

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
    function handleOutsidePointer(
      event: PointerEvent,
    ) {
      const target = event.target as Node;

      const clickedInsideSearch =
        containerRef.current?.contains(target);

      if (!clickedInsideSearch) {
        recordAbandonedSearch();
        setIsFocused(false);
      }
    }

    document.addEventListener(
      "pointerdown",
      handleOutsidePointer,
    );

    return () => {
      document.removeEventListener(
        "pointerdown",
        handleOutsidePointer,
      );
    };
  }, [recordAbandonedSearch]);

  function handleQueryChange(
    event: React.ChangeEvent<HTMLInputElement>,
  ) {
    const nextQuery = event.target.value;

    setQuery(nextQuery);
    setIsFocused(true);

    activeQueryRef.current = nextQuery.trim();
    selectedResultRef.current = false;
  }

  function handleClear() {
    recordAbandonedSearch();

    setQuery("");
    setIsFocused(true);

    activeQueryRef.current = "";
    lastLoggedQueryRef.current = "";
    selectedResultRef.current = false;
  }

  function handleResultSelect(result: SearchResult) {
    selectedResultRef.current = true;

    void recordSearchLog({
      searchQuery: query,
      type: "selected",
    });

    const href = getResultHref(result);

    activeQueryRef.current = "";
    router.push(href);
    setIsFocused(false);
  }

  const showDropdown =
    isFocused && query.trim().length > 0;

  const dropdown =
    showDropdown ? (
      <div className="relative z-[100] mt-2 max-h-[min(34rem,65vh)] w-full overflow-y-auto overscroll-contain rounded-3xl border border-white/20 bg-white p-2 text-left shadow-2xl shadow-emerald-950/30">
        {isLoading ? (
          <div className="flex items-center justify-center gap-2 px-5 py-10 text-sm text-neutral-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading…
          </div>
        ) : error ? (
          <div className="px-5 py-10 text-center">
            <p className="text-sm font-semibold text-red-600">
              {error}
            </p>
          </div>
        ) : totalResults === 0 ? (
          <div className="px-5 py-10 text-center">
            <Search className="mx-auto h-5 w-5 text-neutral-400" />

            <p className="mt-3 text-sm font-semibold text-neutral-900">
              Nothing found
            </p>

            <p className="mt-1 text-xs text-neutral-500">
              Try another place, event or page.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {sections.map((section) => (
              <section key={section.id}>
                <div className="flex items-center gap-2 px-3 pb-1 pt-3 text-emerald-600">
                  <SectionIcon sectionId={section.id} />

                  <h2 className="text-[11px] font-bold uppercase tracking-[0.14em] text-neutral-500">
                    {section.title}
                  </h2>
                </div>

                <div>
                  {section.results.map((result) => (
                    <SearchResultItem
                      key={getResultKey(result)}
                      result={result}
                      onSelect={handleResultSelect}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    ) : null;

  return (
    <div
      ref={containerRef}
      className="relative z-[100] w-full"
    >
      <div className="group relative isolate flex h-11 items-center overflow-hidden rounded-full border border-white/40 px-5 shadow-lg shadow-emerald-950/10 transition-all duration-300 focus-within:border-white/70 focus-within:shadow-xl focus-within:shadow-emerald-950/20">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-full bg-white/20 backdrop-blur-xl transition-colors duration-300 group-hover:bg-white/25 group-focus-within:bg-white/25"
        />

        <div className="relative z-10 flex w-full items-center">
          {isLoading ? (
          <Loader2 className="h-4 w-4 shrink-0 animate-spin text-white" />
        ) : (
          <Search className="h-4 w-4 shrink-0 text-white transition-transform duration-300 group-focus-within:translate-x-0.5" />
        )}

        <input
          type="text"
          inputMode="search"
          value={query}
          onChange={handleQueryChange}
          onFocus={() => setIsFocused(true)}
          aria-label="Search East Lothian Online"
          placeholder="Search East Lothian..."
          className="ml-3 w-full bg-transparent text-[16px] text-white outline-none placeholder:text-white/60 sm:text-sm"
          autoComplete="off"
          spellCheck={false}
        />

          {query && (
            <button
              type="button"
              onClick={handleClear}
              aria-label="Clear search"
              className="ml-2 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-white/70 transition hover:bg-white/15 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {dropdown}
    </div>
  );
}
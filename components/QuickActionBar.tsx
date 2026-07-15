"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  User,
  CalendarDays,
  Plus,
  Search,
  House,
  X,
  AlertTriangle,
  ChevronRight,
  Store,
  MapPin,
  Tag,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

type SearchGroup = {
  id?: string;
  name?: string;
  slug?: string | null;
  is_local_partner?: boolean | null;
  local_partner?: boolean | null;
  partner?: boolean | null;
};

type ActiveDate =
  | string
  | {
      date?: string;
      start?: string;
    };

type SearchPost = {
  id: string;
  title: string;
  type: string;
  expires_at?: string | null;
  event_start?: string | null;
  event_end?: string | null;
  metadata?: {
    active_dates?: ActiveDate[];
    public_type?: string | null;
  } | null;
  groups?: SearchGroup | SearchGroup[] | null;
};

type SearchPage = {
  id: string;
  name: string;
  slug: string;
  page_type?: string | null;
  description?: string | null;
  is_local_partner?: boolean | null;
  local_partner?: boolean | null;
  partner?: boolean | null;
  places?:
    | {
        id?: string;
      }
    | {
        id?: string;
      }[]
    | null;
};

type SearchPlace = {
  id: string;
  page_id?: string | null;
  title?: string | null;
  description?: string | null;
  location_name?: string | null;
  address?: string | null;
  postcode?: string | null;
  tags?: string[] | null;
  is_active?: boolean | null;
  groups?: SearchGroup | SearchGroup[] | null;
};

type SearchResult =
  | {
      kind: "alert";
      post: SearchPost;
      random: number;
    }
  | {
      kind: "place";
      place: SearchPlace;
      random: number;
    }
  | {
      kind: "post";
      post: SearchPost;
      random: number;
    }
  | {
      kind: "page";
      page: SearchPage;
      random: number;
    };

function normaliseSearchText(value: string | null | undefined) {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]/g, "");
}

function normaliseDate(date: Date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function dateKey(value: ActiveDate) {
  if (typeof value === "string") {
    return value.slice(0, 10);
  }

  if (value?.date) {
    return String(value.date).slice(0, 10);
  }

  if (value?.start) {
    return String(value.start).slice(0, 10);
  }

  return "";
}

function getPostDates(post: SearchPost) {
  const metadataDates = post.metadata?.active_dates ?? [];

  const dates =
    metadataDates.length > 0
      ? metadataDates.map(dateKey)
      : [post.event_start, post.event_end]
          .filter(Boolean)
          .map((value) => String(value).slice(0, 10));

  return [...new Set(dates)]
    .filter(Boolean)
    .filter((value) => {
      const parsed = new Date(`${value}T12:00:00`);
      return !Number.isNaN(parsed.getTime());
    })
    .sort();
}

function getMostRecentDate(post: SearchPost) {
  const dates = getPostDates(post);
  return dates[dates.length - 1] ?? "";
}

function isPostExpired(post: SearchPost) {
  const today = normaliseDate(new Date());

  if (post.expires_at) {
    const expiry = new Date(post.expires_at);

    if (
      !Number.isNaN(expiry.getTime()) &&
      expiry.getTime() < Date.now()
    ) {
      return true;
    }
  }

  const isAlert =
    post.type === "update" ||
    post.type === "alert" ||
    post.metadata?.public_type === "alert";

  if (isAlert) {
    return false;
  }

  const mostRecentDate = getMostRecentDate(post);

  if (!mostRecentDate) {
    return false;
  }

  const lastDate = normaliseDate(
    new Date(`${mostRecentDate}T12:00:00`),
  );

  return lastDate < today;
}

function formatPostDate(post: SearchPost) {
  const mostRecentDate = getMostRecentDate(post);

  if (!mostRecentDate) {
    return "";
  }

  const parsed = new Date(`${mostRecentDate}T12:00:00`);

  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
  }).format(parsed);
}

function getSingleRelation<T>(value: T | T[] | null | undefined) {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

function hasPlace(page: SearchPage) {
  if (!page.places) return false;

  if (Array.isArray(page.places)) {
    return page.places.length > 0;
  }

  return Boolean(page.places.id);
}

function isLocalPartner(
  value:
    | {
        is_local_partner?: boolean | null;
        local_partner?: boolean | null;
        partner?: boolean | null;
      }
    | null
    | undefined,
) {
  return Boolean(
    value?.is_local_partner ||
      value?.local_partner ||
      value?.partner,
  );
}

function matchesSearch(query: string, values: unknown[]) {
  const cleanedQuery = normaliseSearchText(query);

  if (!cleanedQuery) {
    return false;
  }

  return values.some((value) => {
    if (Array.isArray(value)) {
      return value.some((item) =>
        normaliseSearchText(String(item)).includes(cleanedQuery),
      );
    }

    return normaliseSearchText(String(value ?? "")).includes(
      cleanedQuery,
    );
  });
}

function createRandomValue() {
  return Math.random();
}

export default function QuickActionBar() {
  const [isMobile, setIsMobile] = useState(false);
  const [hasApprovedPage, setHasApprovedPage] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");

  const [posts, setPosts] = useState<SearchPost[]>([]);
  const [pages, setPages] = useState<SearchPage[]>([]);
  const [places, setPlaces] = useState<SearchPlace[]>([]);

  const [loading, setLoading] = useState(false);
  const [lastSavedQuery, setLastSavedQuery] = useState("");
  const [searchSeed, setSearchSeed] = useState(0);

  useEffect(() => {
    function checkMobile() {
      setIsMobile(window.innerWidth < 768);
    }

    checkMobile();
    window.addEventListener("resize", checkMobile);

    return () => {
      window.removeEventListener("resize", checkMobile);
    };
  }, []);

  useEffect(() => {
    if (!searchOpen) return;

    const previousOverflow = document.body.style.overflow;
    const previousPosition = document.body.style.position;
    const previousWidth = document.body.style.width;

    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.width = "100%";

    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.position = previousPosition;
      document.body.style.width = previousWidth;
    };
  }, [searchOpen]);

  useEffect(() => {
    async function checkApprovedPage() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { data } = await supabase
        .from("groups")
        .select("id")
        .eq("user_id", user.id)
        .eq("status", "approved")
        .limit(1)
        .maybeSingle();

      setHasApprovedPage(Boolean(data));
    }

    checkApprovedPage();
  }, []);

  useEffect(() => {
    if (!searchOpen) return;

    const cleaned = query.trim();

    if (cleaned.length < 2) {
      setPosts([]);
      setPages([]);
      setPlaces([]);
      setLoading(false);
      return;
    }

    const timeout = window.setTimeout(async () => {
      setLoading(true);

      /*
       * We intentionally fetch a broader collection and then perform
       * punctuation-insensitive matching locally.
       *
       * This means:
       * "stationhouse bakery"
       * matches:
       * "Station House Bakery"
       */
      const searchWords = cleaned
        .split(/\s+/)
        .map((word) => word.trim())
        .filter(Boolean);

      const broadTerm =
        searchWords.sort((a, b) => b.length - a.length)[0] ??
        cleaned;

      const safeTerm = broadTerm
        .replace(/[%_,()]/g, "")
        .slice(0, 60);

      const [pageResult, postResult, placeResult] =
        await Promise.all([
          supabase
            .from("groups")
            .select(`
              id,
              name,
              slug,
              page_type,
              description,
              is_local_partner,
              local_partner,
              partner,
              places(id)
            `)
            .eq("status", "approved")
            .or(
              `name.ilike.%${safeTerm}%,description.ilike.%${safeTerm}%,page_type.ilike.%${safeTerm}%`,
            )
            .limit(40),

          supabase
            .from("posts")
            .select(`
              id,
              title,
              type,
              expires_at,
              event_start,
              event_end,
              metadata,
              groups(
                id,
                name,
                slug,
                is_local_partner,
                local_partner,
                partner
              )
            `)
            .or(
              `title.ilike.%${safeTerm}%,content.ilike.%${safeTerm}%,type.ilike.%${safeTerm}%`,
            )
            .limit(60),

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
              is_active,
              groups:page_id(
                id,
                name,
                slug,
                is_local_partner,
                local_partner,
                partner
              )
            `)
            .eq("is_active", true)
            .or(
              `title.ilike.%${safeTerm}%,description.ilike.%${safeTerm}%,location_name.ilike.%${safeTerm}%,address.ilike.%${safeTerm}%,postcode.ilike.%${safeTerm}%`,
            )
            .limit(40),
        ]);

      if (pageResult.error) {
        console.error("Page search error:", pageResult.error);
      }

      if (postResult.error) {
        console.error("Post search error:", postResult.error);
      }

      if (placeResult.error) {
        console.error("Place search error:", placeResult.error);
      }

      const loadedPages = (pageResult.data ?? []) as SearchPage[];
      const loadedPosts = (postResult.data ?? []) as SearchPost[];
      const loadedPlaces = (placeResult.data ?? []) as SearchPlace[];

      const matchingPages = loadedPages.filter((page) => {
        if (hasPlace(page)) {
          return false;
        }

        return matchesSearch(cleaned, [
          page.name,
          page.description,
          page.page_type,
          page.slug,
        ]);
      });

      const matchingPosts = loadedPosts.filter((post) => {
        const group = getSingleRelation(post.groups);

        return (
          !isPostExpired(post) &&
          matchesSearch(cleaned, [
            post.title,
            post.type,
            post.metadata?.public_type,
            group?.name,
            group?.slug,
          ])
        );
      });

      const matchingPlaces = loadedPlaces.filter((place) => {
        const group = getSingleRelation(place.groups);

        return matchesSearch(cleaned, [
          place.title,
          place.description,
          place.location_name,
          place.address,
          place.postcode,
          place.tags,
          group?.name,
          group?.slug,
        ]);
      });

      setPages(matchingPages);
      setPosts(matchingPosts);
      setPlaces(matchingPlaces);

      /*
       * Changing this seed gives every completed search a fresh,
       * randomised order while preserving the required categories.
       */
      setSearchSeed((current) => current + 1);
      setLoading(false);
    }, 120);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [query, searchOpen]);

  useEffect(() => {
    const cleaned = query.trim();

    if (!searchOpen || cleaned.length <= 3) return;
    if (cleaned === lastSavedQuery) return;

    const timeout = window.setTimeout(async () => {
      await supabase.from("suggestions").insert({
        suggestion: cleaned,
      });

      setLastSavedQuery(cleaned);
    }, 1200);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [query, searchOpen, lastSavedQuery]);

  const actions = [
    {
      label: "Account",
      href: "/account",
      icon: User,
    },
    {
      label: "My Calendar",
      href: "/my-calendar",
      icon: CalendarDays,
    },
    ...(hasApprovedPage
      ? [
          {
            label: "Post",
            href: "/create-post",
            icon: Plus,
            highlight: true,
          },
        ]
      : []),
    {
      label: "Search",
      href: "#",
      icon: Search,
      search: true,
    },
    {
      label: "Home",
      href: "/",
      icon: House,
    },
  ];

  const results = useMemo<SearchResult[]>(() => {
    const alerts: SearchResult[] = posts
      .filter(
        (post) =>
          post.type === "update" ||
          post.type === "alert" ||
          post.metadata?.public_type === "alert",
      )
      .map((post) => ({
        kind: "alert",
        post,
        random: createRandomValue(),
      }));

    const placeResults: SearchResult[] = places.map((place) => ({
      kind: "place",
      place,
      random: createRandomValue(),
    }));

    const eventAndDealResults: SearchResult[] = posts
      .filter(
        (post) =>
          post.type !== "update" &&
          post.type !== "alert" &&
          post.metadata?.public_type !== "alert",
      )
      .map((post) => ({
        kind: "post",
        post,
        random: createRandomValue(),
      }));

    const pageResults: SearchResult[] = pages.map((page) => ({
      kind: "page",
      page,
      random: createRandomValue(),
    }));

    function getResultPartner(result: SearchResult) {
      if (result.kind === "page") {
        return isLocalPartner(result.page);
      }

      if (result.kind === "place") {
        return isLocalPartner(
          getSingleRelation(result.place.groups),
        );
      }

      return isLocalPartner(
        getSingleRelation(result.post.groups),
      );
    }

    function sortSection(section: SearchResult[]) {
      return [...section].sort((a, b) => {
        const aPartner = getResultPartner(a);
        const bPartner = getResultPartner(b);

        /*
         * Local Partners always lead their section.
         */
        if (aPartner !== bPartner) {
          return aPartner ? -1 : 1;
        }

        /*
         * Everything else is deliberately randomised.
         */
        return a.random - b.random;
      });
    }

    /*
     * Required permanent hierarchy:
     *
     * Alerts
     * Places
     * Events and deals
     * Pages
     */
    return [
      ...sortSection(alerts),
      ...sortSection(placeResults),
      ...sortSection(eventAndDealResults),
      ...sortSection(pageResults),
    ];
  }, [pages, places, posts, searchSeed]);

  const hasResults = results.length > 0;

  function closeSearch() {
    setSearchOpen(false);
    setQuery("");
    setPosts([]);
    setPages([]);
    setPlaces([]);
  }

  if (!isMobile) return null;

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around border-t border-neutral-200 bg-white px-4 py-3">
        {actions.map(
          ({
            label,
            href,
            icon: Icon,
            highlight,
            search,
          }) =>
            search ? (
              <button
                key={label}
                type="button"
                aria-label={label}
                onClick={() => setSearchOpen(true)}
                className="flex h-10 w-10 items-center justify-center rounded-full transition hover:bg-neutral-100"
              >
                <Icon size={22} className="text-black" />
              </button>
            ) : (
              <Link
                key={label}
                href={href}
                aria-label={label}
                className={`flex h-10 w-10 items-center justify-center rounded-full transition ${
                  highlight
                    ? "bg-emerald-100"
                    : "hover:bg-neutral-100"
                }`}
              >
                <Icon size={22} className="text-black" />
              </Link>
            ),
        )}
      </nav>

      {searchOpen && (
        <div className="fixed inset-0 z-[100] flex h-dvh flex-col overflow-hidden bg-white">
          <div className="flex items-center gap-3 border-b border-neutral-100 p-4">
            <div className="flex flex-1 items-center gap-3 rounded-2xl bg-neutral-100 px-4 py-3">
              <Search
                size={20}
                className="shrink-0 text-neutral-400"
              />

              <input
                autoFocus
                value={query}
                onChange={(event) =>
                  setQuery(event.target.value)
                }
                placeholder="Search East Lothian..."
                className="w-full bg-transparent text-base font-semibold text-black outline-none placeholder:text-neutral-400"
              />
            </div>

            <button
              type="button"
              aria-label="Close search"
              onClick={closeSearch}
              className="rounded-2xl bg-neutral-100 p-3 text-black"
            >
              <X size={20} />
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-5 pb-24">
            {query.trim().length < 2 ? (
              <div className="rounded-[2rem] bg-emerald-800 p-6 text-white">
                <p className="text-xs font-bold uppercase tracking-[0.25em] text-emerald-100/70">
                  Search
                </p>

                <h2 className="mt-2 text-3xl font-black leading-none">
                  Find local things fast.
                </h2>

                <p className="mt-3 text-sm text-white/80">
                  Search places, alerts, events, deals and
                  pages.
                </p>
              </div>
            ) : loading ? (
              <p className="text-sm font-semibold text-neutral-500">
                Searching...
              </p>
            ) : hasResults ? (
              <div className="space-y-2">
                {results.map((result) => {
                  if (result.kind === "page") {
                    const page = result.page;
                    const partner = isLocalPartner(page);

                    return (
                      <Link
                        key={`page-${page.id}`}
                        href={`/${page.slug}`}
                        onClick={closeSearch}
                        className="flex items-center justify-between rounded-3xl bg-neutral-50 p-4"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="shrink-0 rounded-2xl bg-neutral-200 p-3 text-black">
                            <Store size={20} />
                          </div>

                          <div className="min-w-0">
                            <p className="truncate font-bold text-black">
                              {page.name}
                            </p>

                            <p className="truncate text-xs text-neutral-500">
                              {partner
                                ? "Local Partner · "
                                : ""}
                              {page.page_type ?? "Page"}
                            </p>
                          </div>
                        </div>

                        <ChevronRight
                          size={20}
                          className="shrink-0 text-neutral-400"
                        />
                      </Link>
                    );
                  }

                  if (result.kind === "place") {
                    const place = result.place;
                    const group = getSingleRelation(
                      place.groups,
                    );
                    const partner = isLocalPartner(group);
                    const placeTitle =
                      place.title ??
                      group?.name ??
                      "Local place";

                    const placeHref = group?.slug
                      ? `/${group.slug}`
                      : `/places/${place.id}`;

                    return (
                      <Link
                        key={`place-${place.id}`}
                        href={placeHref}
                        onClick={closeSearch}
                        className="flex items-center justify-between rounded-3xl bg-neutral-50 p-4"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="shrink-0 rounded-2xl bg-blue-100 p-3 text-blue-800">
                            <MapPin size={20} />
                          </div>

                          <div className="min-w-0">
                            <p className="truncate font-bold text-black">
                              {placeTitle}
                            </p>

                            <p className="truncate text-xs text-neutral-500">
                              {partner
                                ? "Local Partner · "
                                : ""}
                              {place.location_name ??
                                place.address ??
                                group?.name ??
                                "Place"}
                            </p>
                          </div>
                        </div>

                        <ChevronRight
                          size={20}
                          className="shrink-0 text-neutral-400"
                        />
                      </Link>
                    );
                  }

                  const post = result.post;
                  const group = getSingleRelation(post.groups);
                  const partner = isLocalPartner(group);
                  const isAlert = result.kind === "alert";
                  const isDeal =
                    post.type === "deal" ||
                    post.metadata?.public_type === "deal";
                  const mostRecentDate =
                    formatPostDate(post);

                  return (
                    <Link
                      key={`${result.kind}-${post.id}`}
                      href={`/posts/${post.id}`}
                      onClick={closeSearch}
                      className="flex items-center justify-between rounded-3xl bg-neutral-50 p-4"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <div
                          className={`shrink-0 rounded-2xl p-3 ${
                            isAlert
                              ? "bg-yellow-100 text-yellow-700"
                              : isDeal
                                ? "bg-purple-100 text-purple-800"
                                : "bg-emerald-100 text-emerald-800"
                          }`}
                        >
                          {isAlert ? (
                            <AlertTriangle size={20} />
                          ) : isDeal ? (
                            <Tag size={20} />
                          ) : (
                            <CalendarDays size={20} />
                          )}
                        </div>

                        <div className="min-w-0">
                          <p className="truncate font-bold text-black">
                            {post.title}
                          </p>

                          <p className="truncate text-xs text-neutral-500">
                            {partner
                              ? "Local Partner · "
                              : ""}
                            {group?.name ?? "East Lothian"}
                            {!isAlert && mostRecentDate
                              ? ` · ${mostRecentDate}`
                              : ""}
                          </p>
                        </div>
                      </div>

                      <ChevronRight
                        size={20}
                        className="shrink-0 text-neutral-400"
                      />
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-[2rem] bg-neutral-100 p-6 text-center">
                <p className="text-2xl font-black text-black">
                  No results yet.
                </p>

                <p className="mt-2 text-sm text-neutral-500">
                  We’ll use searches like this to learn what
                  East Lothian wants.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
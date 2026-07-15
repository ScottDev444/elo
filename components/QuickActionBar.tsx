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

type GenericRecord = Record<string, any>;

type SearchPost = GenericRecord & {
  id: string;
  title?: string | null;
  type?: string | null;
  metadata?: GenericRecord | null;
  groups?: GenericRecord | GenericRecord[] | null;
};

type SearchPage = GenericRecord & {
  id: string;
  name?: string | null;
  slug?: string | null;
  page_type?: string | null;
};

type SearchPlace = GenericRecord & {
  id: string;
  page_id?: string | null;
  groups?: GenericRecord | GenericRecord[] | null;
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

function getSingleRelation<T>(
  value: T | T[] | null | undefined,
): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

function normaliseText(value: unknown) {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]/g, "");
}

function matchesSearch(query: string, values: unknown[]) {
  const cleanQuery = normaliseText(query);

  if (!cleanQuery) return false;

  return values.some((value) => {
    if (Array.isArray(value)) {
      return value.some((item) =>
        normaliseText(item).includes(cleanQuery),
      );
    }

    return normaliseText(value).includes(cleanQuery);
  });
}

function isLocalPartner(record: GenericRecord | null | undefined) {
  if (!record) return false;

  return Boolean(
    record.is_local_partner ??
      record.local_partner ??
      record.is_partner ??
      record.partner ??
      record.local_partner_active ??
      record.partner_active ??
      record.subscription_active ??
      false,
  );
}

function extractDate(value: unknown): string | null {
  if (!value) return null;

  if (typeof value === "string") {
    return value.slice(0, 10);
  }

  if (typeof value === "object") {
    const record = value as GenericRecord;

    const possibleDate =
      record.date ??
      record.start ??
      record.start_date ??
      record.event_date ??
      record.active_date;

    if (typeof possibleDate === "string") {
      return possibleDate.slice(0, 10);
    }
  }

  return null;
}

function getPostDates(post: SearchPost) {
  const metadata = post.metadata ?? {};

  const possibleArrays = [
    metadata.active_dates,
    metadata.dates,
    metadata.event_dates,
    post.active_dates,
    post.dates,
  ];

  const dates: string[] = [];

  for (const possibleArray of possibleArrays) {
    if (!Array.isArray(possibleArray)) continue;

    for (const value of possibleArray) {
      const date = extractDate(value);

      if (date) {
        dates.push(date);
      }
    }
  }

  const individualDates = [
    post.event_date,
    post.event_start,
    post.event_end,
    post.start_date,
    post.end_date,
    metadata.event_date,
    metadata.event_start,
    metadata.event_end,
    metadata.start_date,
    metadata.end_date,
  ];

  for (const value of individualDates) {
    const date = extractDate(value);

    if (date) {
      dates.push(date);
    }
  }

  return [...new Set(dates)]
    .filter((date) => {
      const parsed = new Date(`${date}T12:00:00`);
      return !Number.isNaN(parsed.getTime());
    })
    .sort((a, b) => a.localeCompare(b));
}

function getMostRecentPostDate(post: SearchPost) {
  const dates = getPostDates(post);
  return dates[dates.length - 1] ?? null;
}

function isAlert(post: SearchPost) {
  const publicType = String(
    post.metadata?.public_type ??
      post.public_type ??
      "",
  ).toLowerCase();

  const type = String(post.type ?? "").toLowerCase();

  return (
    type === "alert" ||
    type === "update" ||
    publicType === "alert" ||
    publicType === "update"
  );
}

function isDeal(post: SearchPost) {
  const publicType = String(
    post.metadata?.public_type ??
      post.public_type ??
      "",
  ).toLowerCase();

  const type = String(post.type ?? "").toLowerCase();

  return type === "deal" || publicType === "deal";
}

function isPostExpired(post: SearchPost) {
  if (isAlert(post)) {
    const explicitExpiry =
      post.expires_at ??
      post.expiry_date ??
      post.metadata?.expires_at ??
      post.metadata?.expiry_date;

    if (!explicitExpiry) return false;

    const expiry = new Date(explicitExpiry);

    return (
      !Number.isNaN(expiry.getTime()) &&
      expiry.getTime() < Date.now()
    );
  }

  const explicitExpiry =
    post.expires_at ??
    post.expiry_date ??
    post.metadata?.expires_at ??
    post.metadata?.expiry_date;

  if (explicitExpiry) {
    const expiry = new Date(explicitExpiry);

    if (
      !Number.isNaN(expiry.getTime()) &&
      expiry.getTime() < Date.now()
    ) {
      return true;
    }
  }

  const mostRecentDate = getMostRecentPostDate(post);

  if (!mostRecentDate) {
    return false;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const finalDate = new Date(`${mostRecentDate}T12:00:00`);
  finalDate.setHours(0, 0, 0, 0);

  return finalDate < today;
}

function formatPostDate(post: SearchPost) {
  const date = getMostRecentPostDate(post);

  if (!date) return "";

  const parsed = new Date(`${date}T12:00:00`);

  if (Number.isNaN(parsed.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
  }).format(parsed);
}

function getPlaceName(place: SearchPlace) {
  const group = getSingleRelation(place.groups);

  return (
    place.title ??
    place.name ??
    place.location_name ??
    group?.name ??
    "Local place"
  );
}

function getPlaceHref(place: SearchPlace) {
  const group = getSingleRelation(place.groups);

  if (group?.slug) {
    return `/${group.slug}`;
  }

  if (place.slug) {
    return `/${place.slug}`;
  }

  return `/places/${place.id}`;
}

function resultIsLocalPartner(result: SearchResult) {
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

export default function QuickActionBar() {
  const [isMobile, setIsMobile] = useState(false);
  const [hasApprovedPage, setHasApprovedPage] =
    useState(false);

  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");

  const [allPosts, setAllPosts] = useState<SearchPost[]>([]);
  const [allPages, setAllPages] = useState<SearchPage[]>([]);
  const [allPlaces, setAllPlaces] = useState<SearchPlace[]>([]);

  const [loading, setLoading] = useState(false);
  const [searchLoaded, setSearchLoaded] = useState(false);
  const [lastSavedQuery, setLastSavedQuery] = useState("");
  const [randomSeed, setRandomSeed] = useState(0);

  useEffect(() => {
    function checkMobile() {
      setIsMobile(window.innerWidth < 768);
    }

    checkMobile();
    window.addEventListener("resize", checkMobile);

    return () =>
      window.removeEventListener("resize", checkMobile);
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
    if (!searchOpen || searchLoaded) return;

    async function loadSearchData() {
      setLoading(true);

      const [pageResult, postResult, placeResult] =
        await Promise.all([
          supabase
            .from("groups")
            .select("*")
            .eq("status", "approved")
            .limit(500),

          supabase
            .from("posts")
            .select(`
              *,
              groups(*)
            `)
            .limit(750),

          supabase
            .from("places")
            .select(`
              *,
              groups:page_id(*)
            `)
            .limit(500),
        ]);

      if (pageResult.error) {
        console.error(
          "Page search loading error:",
          pageResult.error.message,
        );
      }

      if (postResult.error) {
        console.error(
          "Post search loading error:",
          postResult.error.message,
        );
      }

      if (placeResult.error) {
        console.error(
          "Place search loading error:",
          placeResult.error.message,
        );
      }

      setAllPages(
        (pageResult.data ?? []) as SearchPage[],
      );

      setAllPosts(
        (postResult.data ?? []) as SearchPost[],
      );

      setAllPlaces(
        (placeResult.data ?? []) as SearchPlace[],
      );

      setSearchLoaded(true);
      setLoading(false);
    }

    loadSearchData();
  }, [searchOpen, searchLoaded]);

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

    return () => window.clearTimeout(timeout);
  }, [query, searchOpen, lastSavedQuery]);

  useEffect(() => {
    setRandomSeed((current) => current + 1);
  }, [query]);

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
    const cleanedQuery = query.trim();

    if (cleanedQuery.length < 2) {
      return [];
    }

    const pageIdsWithPlaces = new Set(
      allPlaces
        .map((place) =>
          String(
            place.page_id ??
              getSingleRelation(place.groups)?.id ??
              "",
          ),
        )
        .filter(Boolean),
    );

    const matchingPages = allPages.filter((page) => {
      if (pageIdsWithPlaces.has(String(page.id))) {
        return false;
      }

      return matchesSearch(cleanedQuery, [
        page.name,
        page.slug,
        page.description,
        page.page_type,
        page.category,
        page.location,
      ]);
    });

    const matchingPlaces = allPlaces.filter((place) => {
      if (
        place.is_active === false ||
        place.active === false ||
        place.status === "inactive"
      ) {
        return false;
      }

      const group = getSingleRelation(place.groups);

      return matchesSearch(cleanedQuery, [
        place.title,
        place.name,
        place.description,
        place.location_name,
        place.address,
        place.postcode,
        place.tags,
        place.category,
        group?.name,
        group?.slug,
        group?.description,
      ]);
    });

    const matchingPosts = allPosts.filter((post) => {
      if (isPostExpired(post)) {
        return false;
      }

      const group = getSingleRelation(post.groups);

      return matchesSearch(cleanedQuery, [
        post.title,
        post.content,
        post.description,
        post.type,
        post.metadata?.public_type,
        group?.name,
        group?.slug,
      ]);
    });

    const alerts: SearchResult[] = matchingPosts
      .filter(isAlert)
      .map((post) => ({
        kind: "alert",
        post,
        random: Math.random(),
      }));

    const places: SearchResult[] = matchingPlaces.map(
      (place) => ({
        kind: "place",
        place,
        random: Math.random(),
      }),
    );

    const posts: SearchResult[] = matchingPosts
      .filter((post) => !isAlert(post))
      .map((post) => ({
        kind: "post",
        post,
        random: Math.random(),
      }));

    const pages: SearchResult[] = matchingPages.map(
      (page) => ({
        kind: "page",
        page,
        random: Math.random(),
      }),
    );

    function sortSection(section: SearchResult[]) {
      return [...section].sort((a, b) => {
        const aPartner = resultIsLocalPartner(a);
        const bPartner = resultIsLocalPartner(b);

        if (aPartner !== bPartner) {
          return aPartner ? -1 : 1;
        }

        return a.random - b.random;
      });
    }

    return [
      ...sortSection(alerts),
      ...sortSection(places),
      ...sortSection(posts),
      ...sortSection(pages),
    ];
  }, [
    allPages,
    allPlaces,
    allPosts,
    query,
    randomSeed,
  ]);

  function closeSearch() {
    setSearchOpen(false);
    setQuery("");
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
            ) : results.length > 0 ? (
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
                          <div className="shrink-0 rounded-2xl bg-emerald-100 p-3 text-emerald-800">
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

                    const partner =
                      isLocalPartner(group);

                    return (
                      <Link
                        key={`place-${place.id}`}
                        href={getPlaceHref(place)}
                        onClick={closeSearch}
                        className="flex items-center justify-between rounded-3xl bg-neutral-50 p-4"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="shrink-0 rounded-2xl bg-blue-100 p-3 text-blue-800">
                            <MapPin size={20} />
                          </div>

                          <div className="min-w-0">
                            <p className="truncate font-bold text-black">
                              {getPlaceName(place)}
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
                  const alert = result.kind === "alert";
                  const deal = isDeal(post);
                  const date = formatPostDate(post);

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
                            alert
                              ? "bg-yellow-100 text-yellow-700"
                              : deal
                                ? "bg-purple-100 text-purple-800"
                                : "bg-emerald-100 text-emerald-800"
                          }`}
                        >
                          {alert ? (
                            <AlertTriangle size={20} />
                          ) : deal ? (
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
                            {!alert && date
                              ? ` · ${date}`
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
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Building2,
  Compass,
  LoaderCircle,
  MapPin,
  Search,
  Sparkles,
  X,
} from "lucide-react";

import SiteHeader from "@/components/SiteHeader";
import Footer from "@/components/Footer";
import PlacePost from "@/components/PlacePost";
import { createClient } from "@/lib/supabase/client";

type OpeningDay = {
  open?: string | null;
  close?: string | null;
  closed?: boolean | null;
};

type OpeningHours = Partial<
  Record<
    | "monday"
    | "tuesday"
    | "wednesday"
    | "thursday"
    | "friday"
    | "saturday"
    | "sunday",
    OpeningDay
  >
>;

type PlaceMetadata = {
  accepts_walk_ins?: boolean | null;
  walk_ins?: boolean | null;
  open_24_7?: boolean | null;
  community?: string | null;
  town?: string | null;
  village?: string | null;
  category?: string | null;
  public_type?: string | null;
  is_local_partner?: boolean | null;
};

type DatabasePlace = {
  id: string;
  name?: string | null;
  title?: string | null;
  slug?: string | null;
  description?: string | null;
  image_url?: string | null;
  images?: string[] | null;
  address?: string | null;
  postcode?: string | null;
  location?: string | null;
  town?: string | null;
  community?: string | null;
  category?: string | null;
  tags?: string[] | null;
  opening_hours?: OpeningHours | null;
  metadata?: PlaceMetadata | null;
  approved?: boolean | null;
  active?: boolean | null;
  is_local_partner?: boolean | null;
};

type Place = {
  id: string;
  name: string;
  description: string | null;
  href: string;
  imageUrl: string | null;
  images: string[];
  address: string | null;
  postcode: string | null;
  community: string;
  category: string | null;
  tags: string[];
  openingHours: OpeningHours | null;
  open24Seven: boolean;
  isLocalPartner: boolean;
};

const communities = [
  "Aberlady",
  "Athelstaneford",
  "Auldhame",
  "Belhaven",
  "Bolton",
  "Cockenzie",
  "Dirleton",
  "Drem",
  "Dunbar",
  "East Linton",
  "East Saltoun",
  "Elphinstone",
  "Garvald",
  "Gifford",
  "Gladsmuir",
  "Gullane",
  "Haddington",
  "Humbie",
  "Innerwick",
  "Kingston",
  "Longniddry",
  "Macmerry",
  "Musselburgh",
  "North Berwick",
  "Ormiston",
  "Pencaitland",
  "Port Seton",
  "Prestonpans",
  "Stenton",
  "Tranent",
  "Wallyford",
  "West Barns",
  "West Saltoun",
  "Whitecraig",
  "Whitekirk",
];

const communityDescriptions: Record<string, string> = {
  Aberlady:
    "A coastal village shaped by its bay, nature reserve and welcoming local stops.",
  Athelstaneford:
    "A small rural community surrounded by open countryside and local history.",
  Auldhame:
    "A tiny coastal settlement near Seacliff, surrounded by farmland, beaches and historic landmarks.",
  Belhaven:
    "A coastal community beside Dunbar, known for its beach, bridge and relaxed pace.",
  Bolton:
    "A small rural village near Haddington, surrounded by farmland and quiet country roads.",
  Cockenzie:
    "A historic harbour community with a strong local identity and coastal character.",
  Dirleton:
    "A picturesque village with historic streets, gardens and places worth slowing down for.",
  Drem:
    "A rural village and railway stop connecting the surrounding countryside with the coast.",
  Dunbar:
    "A lively coastal town full of history, independent businesses and dramatic sea views.",
  "East Linton":
    "A riverside community with independent shops, historic buildings and countryside nearby.",
  "East Saltoun":
    "A peaceful village near the Lammermuirs, surrounded by woodland, farmland and local history.",
  Elphinstone:
    "A close-knit village between Tranent and the surrounding East Lothian countryside.",
  Garvald:
    "A peaceful rural village tucked into the Lammermuir foothills.",
  Gifford:
    "A handsome village centred around its square, local businesses and countryside walks.",
  Gladsmuir:
    "A rural village between Tranent and Haddington with open countryside and a strong local community.",
  Gullane:
    "A coastal community known for its beach, golf, food and wide-open views.",
  Haddington:
    "East Lothian's historic county town, filled with local shops, food and community life.",
  Humbie:
    "A scattered rural community surrounded by farmland, woodland and quiet roads.",
  Innerwick:
    "A historic village east of Dunbar, set between the coast and the Lammermuir Hills.",
  Kingston:
    "A small rural settlement near North Berwick, surrounded by farmland and open East Lothian countryside.",
  Longniddry:
    "A coastal village with local shops, green spaces and easy access to the shore.",
  Macmerry:
    "A growing village with a strong community spirit and local services.",
  Musselburgh:
    "A historic town at the edge of Edinburgh, with busy streets, coastline and local character.",
  "North Berwick":
    "A vibrant seaside town packed with independent places, beaches and harbour views.",
  Ormiston:
    "A historic village with a proud local community and countryside on every side.",
  Pencaitland:
    "A village split by the Tyne, with woodland, heritage and local places to discover.",
  "Port Seton":
    "A harbour community with fishing roots, coastal views and a lively local scene.",
  Prestonpans:
    "A historic coastal town shaped by industry, art, community and the sea.",
  Stenton:
    "A beautifully preserved village near Dunbar, known for its stone buildings and peaceful rural setting.",
  Tranent:
    "A busy local town with deep history and a growing mix of shops and services.",
  Wallyford:
    "A fast-growing community connecting East Lothian with Edinburgh and the coast.",
  "West Barns":
    "A village beside Dunbar with local character, open countryside and easy coastal access.",
  "West Saltoun":
    "A small rural settlement near East Saltoun, surrounded by woodland and farmland.",
  Whitecraig:
    "A compact community beside Dalkeith Country Park and the western edge of East Lothian.",
  Whitekirk:
    "A historic rural village near the coast, surrounded by farmland and centuries of local heritage.",
};

function normaliseCommunityText(value?: string | null) {
  return (value ?? "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function placeMatchesCommunity(place: Place, community: string) {
  const keyword = normaliseCommunityText(community);

  if (!keyword) {
    return true;
  }

  return [
    place.community,
    place.address,
    place.description,
  ].some((value) => normaliseCommunityText(value).includes(keyword));
}

const dayNames = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
] as const;

function getPlaceName(place: DatabasePlace) {
  return place.name?.trim() || place.title?.trim() || "Local place";
}

function getCommunity(place: DatabasePlace) {
  return (
    place.community?.trim() ||
    place.town?.trim() ||
    place.metadata?.community?.trim() ||
    place.metadata?.town?.trim() ||
    place.metadata?.village?.trim() ||
    "East Lothian"
  );
}

function acceptsWalkIns(place: DatabasePlace) {
  const acceptsWalkInsValue = place.metadata?.accepts_walk_ins;
  const walkInsValue = place.metadata?.walk_ins;

  // Only hide a place when it has been explicitly marked as
  // not accepting walk-ins. Older listings may not have either
  // metadata field yet, so they should still remain visible.
  if (acceptsWalkInsValue === false || walkInsValue === false) {
    return false;
  }

  return true;
}

function mapPlace(place: DatabasePlace): Place {
  const name = getPlaceName(place);

  return {
    id: place.id,
    name,
    description: place.description?.trim() || null,
    href: place.slug ? `/places/${place.slug}` : `/places/${place.id}`,
    imageUrl: place.image_url || null,
    images: Array.from(
      new Set(
        [
          ...(Array.isArray(place.images) ? place.images : []),
          place.image_url,
        ].filter(
          (image): image is string =>
            typeof image === "string" && image.trim().length > 0,
        ),
      ),
    ),
    address: place.address?.trim() || place.location?.trim() || null,
    postcode: place.postcode?.trim() || null,
    community: getCommunity(place),
    category:
      place.category?.trim() ||
      place.metadata?.category?.trim() ||
      place.metadata?.public_type?.trim() ||
      null,
    tags: Array.from(
      new Set(
        [
          ...(Array.isArray(place.tags) ? place.tags : []),
          place.category?.trim(),
          place.metadata?.category?.trim(),
        ].filter(
          (tag): tag is string =>
            typeof tag === "string" && tag.trim().length > 0,
        ),
      ),
    ),
    openingHours: place.opening_hours ?? null,
    open24Seven: place.metadata?.open_24_7 === true,
    isLocalPartner:
      place.is_local_partner === true ||
      place.metadata?.is_local_partner === true,
  };
}

function isPlaceOpen(place: Place, now: Date) {
  if (place.open24Seven) {
    return true;
  }

  const openingHours = place.openingHours;

  if (!openingHours) {
    return false;
  }

  const dayName = dayNames[now.getDay()];
  const today = openingHours[dayName];

  if (!today || today.closed || !today.open || !today.close) {
    return false;
  }

  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const [openHour, openMinute] = today.open.split(":").map(Number);
  const [closeHour, closeMinute] = today.close.split(":").map(Number);

  if (
    [openHour, openMinute, closeHour, closeMinute].some((value) =>
      Number.isNaN(value)
    )
  ) {
    return false;
  }

  const openMinutes = openHour * 60 + openMinute;
  const closeMinutes = closeHour * 60 + closeMinute;

  if (closeMinutes < openMinutes) {
    return currentMinutes >= openMinutes || currentMinutes < closeMinutes;
  }

  return currentMinutes >= openMinutes && currentMinutes < closeMinutes;
}

function getTodayHours(place: Place, now: Date) {
  if (place.open24Seven) {
    return "Open 24 hours";
  }

  const today = place.openingHours?.[dayNames[now.getDay()]];

  if (!today || today.closed || !today.open || !today.close) {
    return "Closed today";
  }

  return `${today.open}–${today.close}`;
}

function normaliseOpeningHours(
  openingHours: OpeningHours | null,
): Record<
  string,
  {
    open?: string;
    close?: string;
    closed?: boolean;
  }
> | null {
  if (!openingHours) {
    return null;
  }

  return Object.fromEntries(
    Object.entries(openingHours).map(([day, value]) => [
      day,
      {
        open: value?.open ?? undefined,
        close: value?.close ?? undefined,
        closed: value?.closed ?? undefined,
      },
    ]),
  );
}

export default function PlacesPage() {
  const [places, setPlaces] = useState<Place[]>([]);
  const [query, setQuery] = useState("");
  const [selectedCommunity, setSelectedCommunity] = useState<string | null>(
    null
  );
  const [showOpenNow, setShowOpenNow] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const interval = window.setInterval(() => {
      setNow(new Date());
    }, 60_000);

    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    async function loadPlaces() {
      setLoading(true);
      setLoadError(null);

      const { data, error } = await supabase
        .from("places")
        .select("*");

      if (cancelled) {
        return;
      }

      if (error) {
        console.error("Failed to load places:", error);
        setPlaces([]);
        setLoadError("Places could not be loaded.");
        setLoading(false);
        return;
      }

      const mapped = ((data as DatabasePlace[] | null) ?? [])
        .filter((place) => acceptsWalkIns(place))
        .filter((place) => place.approved !== false)
        .filter((place) => place.active !== false)
        .map(mapPlace)
        .sort((a, b) => {
          if (a.isLocalPartner !== b.isLocalPartner) {
            return a.isLocalPartner ? -1 : 1;
          }

          return a.name.localeCompare(b.name);
        });

      setPlaces(mapped);
      setLoading(false);
    }

    void loadPlaces();

    return () => {
      cancelled = true;
    };
  }, []);

  const communityOfTheDay = useMemo(() => {
    const startOfYear = new Date(now.getFullYear(), 0, 0);
    const dayOfYear = Math.floor(
      (now.getTime() - startOfYear.getTime()) / 86_400_000
    );

    return communities[dayOfYear % communities.length];
  }, [now]);

  const allCommunities = useMemo(() => {
    const databaseCommunities = places
      .map((place) => place.community.trim())
      .filter(
        (community) =>
          community.length > 0 &&
          normaliseCommunityText(community) !== "east lothian",
      );

    return Array.from(new Set([...communities, ...databaseCommunities])).sort(
      (a, b) => a.localeCompare(b),
    );
  }, [places]);

  const communityPlaces = useMemo(
    () =>
      places.filter((place) =>
        placeMatchesCommunity(place, communityOfTheDay),
      ),
    [communityOfTheDay, places],
  );

  const filteredPlaces = useMemo(() => {
    const normalisedQuery = query.trim().toLowerCase();

    return places.filter((place) => {
      if (
        selectedCommunity &&
        !placeMatchesCommunity(place, selectedCommunity)
      ) {
        return false;
      }

      if (showOpenNow && !isPlaceOpen(place, now)) {
        return false;
      }

      if (!normalisedQuery) {
        return true;
      }

      return [
        place.name,
        place.description,
        place.address,
        place.community,
        place.category,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(normalisedQuery);
    });
  }, [now, places, query, selectedCommunity, showOpenNow]);

  return (
    <div className="min-h-screen bg-[#f6f7f8] text-slate-950">
      <SiteHeader />

      <main>
        <section className="relative overflow-hidden bg-[#072d22] text-white">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(52,211,153,0.22),transparent_32%),radial-gradient(circle_at_85%_20%,rgba(255,255,255,0.08),transparent_28%)]" />

          <div className="relative px-4 pb-10 pt-12 sm:px-6 lg:px-8 lg:pb-14 lg:pt-16">
            <div className="mx-auto max-w-7xl">
              <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-end">
                <div>
                  <div className="inline-flex items-center gap-2 text-sm font-black uppercase tracking-[0.2em] text-emerald-300">
                    <Compass className="h-4 w-4" />
                    East Lothian Places
                  </div>

                  <h1 className="mt-5 max-w-4xl text-4xl font-black tracking-[-0.04em] sm:text-6xl lg:text-7xl">
                    Find somewhere local worth stepping into.
                  </h1>

                  <p className="mt-5 max-w-2xl text-base leading-8 text-emerald-50/80 sm:text-lg">
                    Shops, cafés, venues and useful local places across every
                    corner of East Lothian.
                  </p>
                </div>

                <div className="rounded-[1.75rem] border border-white/10 bg-white/8 p-5 backdrop-blur">
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-300">
                    On the map now
                  </p>

                  <div className="mt-3 flex items-end justify-between gap-4">
                    <div>
                      <p className="text-4xl font-black">{places.length}</p>
                      <p className="mt-1 text-sm text-white/65">
                        walk-in places listed
                      </p>
                    </div>

                    <Link
                      href="/create"
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-white px-4 text-sm font-black text-emerald-950 transition hover:bg-emerald-100"
                    >
                      Add yours
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              </div>

              <div className="mt-10 grid gap-3 lg:grid-cols-[1fr_auto]">
                <label className="relative block">
                  <Search className="pointer-events-none absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search a place, community or category"
                    className="h-16 w-full rounded-2xl border border-white/10 bg-white pl-14 pr-14 text-base font-semibold text-slate-950 shadow-2xl shadow-black/15 outline-none transition placeholder:font-medium placeholder:text-slate-400 focus:ring-4 focus:ring-emerald-300/20"
                  />

                  {query ? (
                    <button
                      type="button"
                      onClick={() => setQuery("")}
                      className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-950"
                      aria-label="Clear search"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  ) : null}
                </label>

                <button
                  type="button"
                  onClick={() => setShowOpenNow((current) => !current)}
                  className={`h-16 rounded-2xl border px-7 font-black transition ${
                    showOpenNow
                      ? "border-emerald-300 bg-emerald-300 text-emerald-950"
                      : "border-white/15 bg-white/10 text-white hover:bg-white/15"
                  }`}
                >
                  {showOpenNow ? "Showing open now" : "Open now"}
                </button>
              </div>
            </div>
          </div>
        </section>

        {!query.trim() ? (
          <>
          <section className="border-b border-slate-200 bg-[#edf7f2] px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
            <div className="mx-auto max-w-7xl">
              <div className="overflow-hidden rounded-[2rem] bg-[#0b3d2e] text-white shadow-xl shadow-emerald-950/10">
                <div className="grid lg:grid-cols-[minmax(0,1fr)_24rem]">
                  <div className="p-7 sm:p-10 lg:p-12">
                    <div className="inline-flex items-center gap-2 text-sm font-black uppercase tracking-[0.2em] text-emerald-300">
                      <Sparkles className="h-4 w-4" />
                      Community of the day
                    </div>
  
                    <h2 className="mt-4 text-4xl font-black tracking-tight sm:text-6xl">
                      {communityOfTheDay}
                    </h2>
  
                    <p className="mt-5 max-w-2xl text-base leading-8 text-white/70 sm:text-lg">
                      {communityDescriptions[communityOfTheDay] ??
                        `Discover ${communityOfTheDay}, one of East Lothian's many unique local communities.`}
                    </p>
  
                    <div className="mt-7 flex flex-wrap items-center gap-4">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedCommunity(communityOfTheDay);
                          setShowOpenNow(false);
                          document
                            .getElementById("all-places")
                            ?.scrollIntoView({ behavior: "smooth" });
                        }}
                        className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-emerald-300 px-5 font-black text-emerald-950 transition hover:bg-white"
                      >
                        Explore {communityOfTheDay}
                        <ArrowRight className="h-5 w-5" />
                      </button>
  
                      {communityPlaces.length > 0 ? (
                        <span className="text-sm font-bold text-emerald-100/80">
                          {communityPlaces.length}{" "}
                          {communityPlaces.length === 1 ? "place" : "places"} listed
                        </span>
                      ) : null}
                    </div>
                  </div>
  
                  <div className="relative min-h-72 overflow-hidden bg-emerald-700">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.28),transparent_42%)]" />
                    <div className="absolute -bottom-20 -right-14 h-64 w-64 rounded-full border-[3rem] border-white/10" />
                    <div className="absolute inset-0 grid place-items-center">
                      <div className="text-center">
                        <div className="mx-auto grid h-24 w-24 place-items-center rounded-full bg-white/10 backdrop-blur">
                          <MapPin className="h-12 w-12 text-white" />
                        </div>
                        <p className="mt-5 text-2xl font-black">
                          {communityOfTheDay}
                        </p>
                        <p className="mt-1 text-xs font-black uppercase tracking-[0.2em] text-emerald-100">
                          East Lothian
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
          </>
        ) : null}

        {!query.trim() ? (
          <>
          <section className="border-b border-slate-200 bg-white px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
            <div className="mx-auto max-w-7xl">
              <div className="max-w-2xl">
                <p className="text-sm font-black uppercase tracking-[0.18em] text-emerald-700">
                  Choose an area
                </p>
                <h2 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
                  Browse communities
                </h2>
                <p className="mt-3 leading-7 text-slate-600">
                  From busy high streets to small villages, every community gets
                  its own place on the map.
                </p>
              </div>
  
              <div className="mt-7 flex gap-3 overflow-x-auto pb-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <button
                  type="button"
                  onClick={() => setSelectedCommunity(null)}
                  className={`shrink-0 rounded-full border px-5 py-3 text-sm font-black transition ${
                    selectedCommunity === null
                      ? "border-emerald-700 bg-emerald-700 text-white"
                      : "border-slate-200 bg-white text-slate-700 hover:border-slate-400"
                  }`}
                >
                  All communities
                </button>
  
                {allCommunities.map((community) => {
                  const count = places.filter((place) =>
                    placeMatchesCommunity(place, community),
                  ).length;
                  const selected = selectedCommunity === community;
  
                  return (
                    <button
                      key={community}
                      type="button"
                      onClick={() => setSelectedCommunity(community)}
                      className={`shrink-0 rounded-full border px-5 py-3 text-sm font-black transition ${
                        selected
                          ? "border-emerald-700 bg-emerald-700 text-white"
                          : "border-slate-200 bg-white text-slate-700 hover:border-slate-400"
                      }`}
                    >
                      {community}
                      {count > 0 ? (
                        <span
                          className={`ml-2 ${
                            selected ? "text-emerald-100" : "text-slate-400"
                          }`}
                        >
                          {count}
                        </span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>
          </section>
          </>
        ) : null}

        <section
          id="all-places"
          className="bg-[#f6f7f8] px-4 py-10 sm:px-6 lg:px-8 lg:py-14"
        >
          <div className="mx-auto max-w-7xl">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.18em] text-emerald-700">
                  Explore
                </p>

                <h2 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
                  {selectedCommunity
                    ? `Places in ${selectedCommunity}`
                    : showOpenNow
                    ? "Places open now"
                    : "All places"}
                </h2>

                {!loading && !loadError ? (
                  <p className="mt-2 text-sm font-semibold text-slate-500">
                    {filteredPlaces.length}{" "}
                    {filteredPlaces.length === 1 ? "place" : "places"}
                  </p>
                ) : null}
              </div>

              {selectedCommunity || showOpenNow || query ? (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCommunity(null);
                    setShowOpenNow(false);
                    setQuery("");
                  }}
                  className="inline-flex items-center gap-2 self-start rounded-full border border-slate-300 bg-white px-4 py-2.5 text-sm font-black text-slate-700 transition hover:border-slate-500 hover:text-slate-950 sm:self-auto"
                >
                  <X className="h-4 w-4" />
                  Clear filters
                </button>
              ) : null}
            </div>

            {loading ? (
              <div className="grid min-h-80 place-items-center">
                <div className="flex items-center gap-3 font-bold text-slate-600">
                  <LoaderCircle className="h-5 w-5 animate-spin" />
                  Loading places
                </div>
              </div>
            ) : loadError ? (
              <div className="grid min-h-80 place-items-center text-center">
                <div>
                  <Building2 className="mx-auto h-10 w-10 text-slate-300" />
                  <p className="mt-4 text-lg font-black">{loadError}</p>
                  <p className="mt-2 text-sm text-slate-500">
                    Refresh the page and try again.
                  </p>
                </div>
              </div>
            ) : filteredPlaces.length > 0 ? (
              <div className="mt-10 grid gap-8 md:grid-cols-2 2xl:grid-cols-3">
                {filteredPlaces.map((place) => (
                  <div key={place.id} className="min-w-0">
                    {place.isLocalPartner ? (
                      <div className="mb-3 flex items-center gap-2 px-1">
                        <span className="h-2.5 w-2.5 rounded-full bg-emerald-600 ring-4 ring-amber-300/40" />
                        <span className="text-xs font-black uppercase tracking-[0.16em] text-emerald-800">
                          Verified local partner
                        </span>
                      </div>
                    ) : null}

                    <PlacePost
                      id={place.id}
                      title={place.name}
                      description={place.description}
                      location_name={place.community}
                      address={place.address}
                      postcode={place.postcode}
                      images={place.images}
                      tags={place.tags}
                      opening_hours={
                        normaliseOpeningHours(place.openingHours) ?? undefined
                      }
                      is_24_7={place.open24Seven}
                      slug={
                        place.href.startsWith("/places/")
                          ? place.href.replace("/places/", "")
                          : null
                      }
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-8 rounded-[2rem] border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
                <MapPin className="mx-auto h-10 w-10 text-slate-300" />
                <h3 className="mt-4 text-xl font-black">
                  No places found here yet
                </h3>
                <p className="mx-auto mt-2 max-w-md leading-7 text-slate-500">
                  This community still belongs on the map. Listings will appear
                  here as local places join ELO.
                </p>
              </div>
            )}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
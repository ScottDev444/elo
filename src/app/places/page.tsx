"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Building2,
  ChevronRight,
  Clock3,
  LoaderCircle,
  MapPin,
  Search,
  Store,
  X,
} from "lucide-react";

import SiteHeader from "@/components/SiteHeader";
import Footer from "@/components/Footer";
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
};

type DatabasePlace = {
  id: string;
  name?: string | null;
  title?: string | null;
  slug?: string | null;
  description?: string | null;
  image_url?: string | null;
  address?: string | null;
  location?: string | null;
  town?: string | null;
  community?: string | null;
  category?: string | null;
  opening_hours?: OpeningHours | null;
  metadata?: PlaceMetadata | null;
  approved?: boolean | null;
  active?: boolean | null;
};

type Place = {
  id: string;
  name: string;
  description: string | null;
  href: string;
  imageUrl: string | null;
  address: string | null;
  community: string;
  category: string | null;
  openingHours: OpeningHours | null;
  open24Seven: boolean;
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
  Belhaven:
    "A coastal community beside Dunbar, known for its beach, bridge and relaxed pace.",
  Cockenzie:
    "A historic harbour community with a strong local identity and coastal character.",
  Dirleton:
    "A picturesque village with historic streets, gardens and places worth slowing down for.",
  Dunbar:
    "A lively coastal town full of history, independent businesses and dramatic sea views.",
  "East Linton":
    "A riverside community with independent shops, historic buildings and countryside nearby.",
  Elphinstone:
    "A close-knit village between Tranent and the surrounding East Lothian countryside.",
  Garvald:
    "A peaceful rural village tucked into the Lammermuir foothills.",
  Gifford:
    "A handsome village centred around its square, local businesses and countryside walks.",
  Gullane:
    "A coastal community known for its beach, golf, food and wide-open views.",
  Haddington:
    "East Lothian's historic county town, filled with local shops, food and community life.",
  Humbie:
    "A scattered rural community surrounded by farmland, woodland and quiet roads.",
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
  Tranent:
    "A busy local town with deep history and a growing mix of shops and services.",
  Wallyford:
    "A fast-growing community connecting East Lothian with Edinburgh and the coast.",
  "West Barns":
    "A village beside Dunbar with local character, open countryside and easy coastal access.",
  Whitecraig:
    "A compact community beside Dalkeith Country Park and the western edge of East Lothian.",
};

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
  return (
    place.metadata?.accepts_walk_ins === true ||
    place.metadata?.walk_ins === true
  );
}

function mapPlace(place: DatabasePlace): Place {
  const name = getPlaceName(place);

  return {
    id: place.id,
    name,
    description: place.description?.trim() || null,
    href: place.slug ? `/places/${place.slug}` : `/places/${place.id}`,
    imageUrl: place.image_url || null,
    address: place.address?.trim() || place.location?.trim() || null,
    community: getCommunity(place),
    category:
      place.category?.trim() ||
      place.metadata?.category?.trim() ||
      place.metadata?.public_type?.trim() ||
      null,
    openingHours: place.opening_hours ?? null,
    open24Seven: place.metadata?.open_24_7 === true,
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

function PlaceCard({
  place,
  now,
}: {
  place: Place;
  now: Date;
}) {
  const open = isPlaceOpen(place, now);

  return (
    <Link
      href={place.href}
      className="group overflow-hidden rounded-2xl border border-slate-200 bg-white transition hover:-translate-y-1 hover:border-slate-300 hover:shadow-lg"
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-slate-100">
        {place.imageUrl ? (
          <Image
            src={place.imageUrl}
            alt=""
            fill
            className="object-cover transition duration-500 group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw"
            onError={(event) => {
              event.currentTarget.style.display = "none";
            }}
          />
        ) : (
          <div className="grid h-full place-items-center">
            <Store className="h-10 w-10 text-slate-300" />
          </div>
        )}

        <div
          className={`absolute left-3 top-3 rounded-lg px-3 py-1.5 text-xs font-black shadow-sm ${
            open
              ? "bg-emerald-700 text-white"
              : "bg-white text-slate-700"
          }`}
        >
          {open ? "Open now" : "Closed"}
        </div>
      </div>

      <div className="p-4 sm:p-5">
        {place.category ? (
          <p className="text-xs font-black uppercase tracking-wider text-emerald-700">
            {place.category}
          </p>
        ) : null}

        <div className="mt-1 flex items-start justify-between gap-4">
          <h3 className="text-xl font-black leading-tight">{place.name}</h3>
          <ChevronRight className="mt-1 h-5 w-5 shrink-0 text-slate-400 transition group-hover:translate-x-1 group-hover:text-slate-900" />
        </div>

        <div className="mt-3 space-y-2 text-sm font-medium text-slate-600">
          <div className="flex items-start gap-2">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              {place.address
                ? `${place.address}, ${place.community}`
                : place.community}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Clock3 className="h-4 w-4 shrink-0" />
            <span>{getTodayHours(place, now)}</span>
          </div>
        </div>
      </div>
    </Link>
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
        .sort((a, b) => a.name.localeCompare(b.name));

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

  const communityPlaces = useMemo(
    () =>
      places.filter(
        (place) =>
          place.community.toLowerCase() === communityOfTheDay.toLowerCase()
      ),
    [communityOfTheDay, places]
  );

  const openNowPlaces = useMemo(
    () => places.filter((place) => isPlaceOpen(place, now)),
    [now, places]
  );

  const filteredPlaces = useMemo(() => {
    const normalisedQuery = query.trim().toLowerCase();

    return places.filter((place) => {
      if (
        selectedCommunity &&
        place.community.toLowerCase() !== selectedCommunity.toLowerCase()
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
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <SiteHeader />

      <main>
        <section className="border-b border-emerald-800 bg-emerald-700 text-white">
          <div className="px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
            <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.2em] text-emerald-100">
                  Atlas Places
                </p>

                <h1 className="mt-3 max-w-4xl text-4xl font-black tracking-tight sm:text-5xl lg:text-6xl">
                  Discover somewhere worth visiting.
                </h1>

                <p className="mt-4 max-w-2xl text-base leading-7 text-emerald-50 sm:text-lg">
                  Explore physical places across every East Lothian community,
                  from the largest towns to the smallest villages.
                </p>
              </div>

              <Link
                href="/create"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-white px-5 font-black text-emerald-800 transition hover:bg-emerald-50"
              >
                Add a place
                <ArrowRight className="h-5 w-5" />
              </Link>
            </div>

            <div className="mt-8 grid gap-3 lg:grid-cols-[1fr_auto]">
              <label className="relative block">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-emerald-900/50" />

                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search places, communities or categories"
                  className="h-14 w-full rounded-xl border border-white/30 bg-white pl-12 pr-12 text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-white"
                />

                {query ? (
                  <button
                    type="button"
                    onClick={() => setQuery("")}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-950"
                    aria-label="Clear search"
                  >
                    <X className="h-5 w-5" />
                  </button>
                ) : null}
              </label>

              <button
                type="button"
                onClick={() => setShowOpenNow((current) => !current)}
                className={`h-14 rounded-xl border px-6 font-black transition ${
                  showOpenNow
                    ? "border-white bg-white text-emerald-800"
                    : "border-white/40 bg-emerald-800 text-white hover:bg-emerald-900"
                }`}
              >
                {showOpenNow ? "Showing Open Now" : "Open Now"}
              </button>
            </div>
          </div>
        </section>

        <section className="border-b border-slate-200 bg-white px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-slate-950 text-white shadow-sm">
            <div className="grid lg:grid-cols-[1.1fr_0.9fr]">
              <div className="p-6 sm:p-8 lg:p-10">
                <p className="text-sm font-black uppercase tracking-[0.2em] text-emerald-400">
                  Community of the Day
                </p>

                <h2 className="mt-3 text-4xl font-black sm:text-5xl">
                  {communityOfTheDay}
                </h2>

                <p className="mt-4 max-w-xl text-base leading-7 text-slate-300 sm:text-lg">
                  {communityDescriptions[communityOfTheDay] ??
                    `Discover ${communityOfTheDay}, one of East Lothian's many unique local communities.`}
                </p>

                {communityPlaces.length > 0 ? (
                  <p className="mt-4 font-bold text-emerald-300">
                    {communityPlaces.length}{" "}
                    {communityPlaces.length === 1 ? "place" : "places"} to
                    discover
                  </p>
                ) : null}

                <button
                  type="button"
                  onClick={() => {
                    setSelectedCommunity(communityOfTheDay);
                    setShowOpenNow(false);
                    document
                      .getElementById("all-places")
                      ?.scrollIntoView({ behavior: "smooth" });
                  }}
                  className="mt-7 inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 font-black text-white transition hover:bg-emerald-500"
                >
                  Explore {communityOfTheDay}
                  <ArrowRight className="h-5 w-5" />
                </button>
              </div>

              <div className="relative min-h-64 overflow-hidden bg-emerald-700">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.24),transparent_45%)]" />
                <div className="absolute inset-0 grid place-items-center">
                  <div className="text-center">
                    <MapPin className="mx-auto h-16 w-16 text-white/90" />
                    <p className="mt-4 text-2xl font-black">
                      {communityOfTheDay}
                    </p>
                    <p className="mt-1 text-sm font-bold uppercase tracking-[0.2em] text-emerald-100">
                      East Lothian
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {openNowPlaces.length > 0 && !showOpenNow && !selectedCommunity ? (
          <section className="border-b border-slate-200 bg-white px-4 py-10 sm:px-6 lg:px-8 lg:py-12">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-sm font-black uppercase tracking-[0.18em] text-emerald-700">
                  Right now
                </p>
                <h2 className="mt-2 text-3xl font-black sm:text-4xl">
                  Open Now
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setShowOpenNow(true)}
                className="hidden items-center gap-2 font-black text-emerald-700 transition hover:text-emerald-900 sm:flex"
              >
                See all
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-6 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
              {openNowPlaces.slice(0, 4).map((place) => (
                <PlaceCard key={place.id} place={place} now={now} />
              ))}
            </div>
          </section>
        ) : null}

        <section className="border-b border-slate-200 bg-slate-50 px-4 py-10 sm:px-6 lg:px-8 lg:py-12">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.18em] text-emerald-700">
              Every corner counts
            </p>
            <h2 className="mt-2 text-3xl font-black sm:text-4xl">
              Browse Communities
            </h2>
            <p className="mt-3 max-w-2xl leading-7 text-slate-600">
              Big towns, coastal villages, rural communities and everywhere in
              between.
            </p>
          </div>

          <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6">
            <button
              type="button"
              onClick={() => setSelectedCommunity(null)}
              className={`min-h-20 rounded-xl border p-4 text-left font-black transition ${
                selectedCommunity === null
                  ? "border-emerald-700 bg-emerald-700 text-white"
                  : "border-slate-200 bg-white hover:border-slate-400"
              }`}
            >
              All communities
            </button>

            {communities.map((community) => {
              const count = places.filter(
                (place) =>
                  place.community.toLowerCase() === community.toLowerCase()
              ).length;
              const selected = selectedCommunity === community;

              return (
                <button
                  key={community}
                  type="button"
                  onClick={() => setSelectedCommunity(community)}
                  className={`min-h-20 rounded-xl border p-4 text-left transition ${
                    selected
                      ? "border-emerald-700 bg-emerald-700 text-white"
                      : "border-slate-200 bg-white hover:border-slate-400"
                  }`}
                >
                  <span className="block font-black">{community}</span>
                  {count > 0 ? (
                    <span
                      className={`mt-1 block text-xs font-bold ${
                        selected ? "text-emerald-100" : "text-slate-500"
                      }`}
                    >
                      {count} {count === 1 ? "place" : "places"}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </section>

        <section
          id="all-places"
          className="bg-white px-4 py-10 sm:px-6 lg:px-8 lg:py-12"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.18em] text-emerald-700">
                Explore
              </p>

              <h2 className="mt-2 text-3xl font-black sm:text-4xl">
                {selectedCommunity
                  ? `Places in ${selectedCommunity}`
                  : showOpenNow
                  ? "Places open now"
                  : "All Places"}
              </h2>
            </div>

            {selectedCommunity || showOpenNow || query ? (
              <button
                type="button"
                onClick={() => {
                  setSelectedCommunity(null);
                  setShowOpenNow(false);
                  setQuery("");
                }}
                className="inline-flex items-center gap-2 self-start font-black text-slate-600 transition hover:text-slate-950 sm:self-auto"
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
            <div className="mt-7 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {filteredPlaces.map((place) => (
                <PlaceCard key={place.id} place={place} now={now} />
              ))}
            </div>
          ) : (
            <div className="mt-7 rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-6 py-16 text-center">
              <MapPin className="mx-auto h-10 w-10 text-slate-300" />
              <h3 className="mt-4 text-xl font-black">
                No places found here yet
              </h3>
              <p className="mx-auto mt-2 max-w-md leading-7 text-slate-500">
                This community still belongs on the map. Listings will appear
                here as local places join Atlas.
              </p>
            </div>
          )}
        </section>
      </main>

      <Footer />
    </div>
  );
}
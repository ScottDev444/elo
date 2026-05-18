"use client";

import { useEffect, useMemo, useState } from "react";
import { Compass, Search, X } from "lucide-react";
import PostCardPlace from "@/components/PostCardPlace";
import { supabase } from "@/lib/supabase";

type OpeningDay = {
  closed?: boolean;
  open?: string;
  close?: string;
  is24h?: boolean;
  is_24_7?: boolean;
};

type GroupRelation =
  | { name?: string; is_local_partner?: boolean }
  | { name?: string; is_local_partner?: boolean }[];

type Place = {
  id: string;
  title: string;
  description?: string;
  location_name?: string;
  address?: string;
  postcode?: string;
  tags?: string[];
  images?: string[];
  opening_hours?: Record<string, OpeningDay>;
  metadata?: { open_24_7?: boolean };
  groups?: GroupRelation;
};

type Props = {
  places: Place[];
};

function isLocalPartner(place: Place) {
  if (Array.isArray(place.groups)) {
    return place.groups.some((group) => group.is_local_partner === true);
  }

  return place.groups?.is_local_partner === true;
}

function isPlaceOpen(place: Place) {
  if (place.metadata?.open_24_7) return true;

  const now = new Date();

  const days = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
  ];

  const todayHours = place.opening_hours?.[days[now.getDay()]];

  if (!todayHours || todayHours.closed) return false;
  if (todayHours.is24h || todayHours.is_24_7) return true;
  if (!todayHours.open || !todayHours.close) return false;

  const currentTime = now.toTimeString().slice(0, 5);

  return currentTime >= todayHours.open && currentTime <= todayHours.close;
}

function sortPlaces(places: Place[]) {
  return [...places].sort((a, b) => {
    if (isLocalPartner(a) && !isLocalPartner(b)) return -1;
    if (!isLocalPartner(a) && isLocalPartner(b)) return 1;
    return a.title.localeCompare(b.title);
  });
}

function matchesSearch(place: Place, query: string) {
  const search = query.trim().toLowerCase();
  if (!search) return true;

  const searchableText = [
    place.title,
    place.description,
    place.location_name,
    place.address,
    place.postcode,
    ...(place.tags ?? []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return searchableText.includes(search);
}

async function saveSearchSubmission(query: string, resultCount: number) {
  const cleanQuery = query.trim();

  await supabase.from("cubmissions").insert({
    type: "explore_search",
    title: cleanQuery || "Empty explore search",
    content: cleanQuery,
    metadata: {
      query: cleanQuery,
      result_count: resultCount,
      status: resultCount > 0 ? "success" : "failed",
      source: "explore",
    },
  });
}

export default function ExploreClient({ places }: Props) {
  const [query, setQuery] = useState("");
  const [lastSavedQuery, setLastSavedQuery] = useState("");

  const sortedPlaces = useMemo(() => sortPlaces(places), [places]);

  const openPlaces = useMemo(
    () => sortedPlaces.filter(isPlaceOpen),
    [sortedPlaces]
  );

  const closedPlaces = useMemo(
    () => sortedPlaces.filter((place) => !isPlaceOpen(place)),
    [sortedPlaces]
  );

  const searchedPlaces = useMemo(() => {
    return sortedPlaces.filter((place) => matchesSearch(place, query));
  }, [sortedPlaces, query]);

  useEffect(() => {
    const cleanQuery = query.trim();

    if (cleanQuery === lastSavedQuery) return;

    const timeout = setTimeout(() => {
      saveSearchSubmission(cleanQuery, searchedPlaces.length).catch(() => {});
      setLastSavedQuery(cleanQuery);
    }, 900);

    return () => clearTimeout(timeout);
  }, [query, searchedPlaces.length, lastSavedQuery]);

  return (
    <main className="min-h-screen bg-white px-6 pb-10 pt-4 md:p-8">
      <section className="overflow-hidden rounded-[2rem] bg-emerald-800 p-6 text-white shadow-xl md:p-10">
        <div className="max-w-3xl">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-xs font-black uppercase tracking-[0.25em] text-emerald-100/80">
            <Compass size={14} />
            Explore East Lothian
          </div>

          <h1 className="text-5xl font-black leading-none tracking-tight md:text-7xl">
            Find somewhere worth going.
          </h1>

          <p className="mt-5 max-w-xl text-base font-semibold leading-relaxed text-white/75 md:text-lg">
            Shops, cafés, beaches, galleries, landmarks and local places across
            East Lothian.
          </p>
        </div>
      </section>

      <section className="sticky top-3 z-20 mt-6 rounded-[2rem] border border-neutral-200 bg-white/90 p-3 shadow-sm backdrop-blur">
        <div className="flex items-center gap-3 rounded-2xl bg-neutral-50 px-4 py-4">
          <Search size={20} className="text-neutral-400" />

          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search cafés, beaches, gifts, galleries..."
            className="w-full bg-transparent text-sm font-bold text-black outline-none placeholder:text-neutral-400"
          />

          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="rounded-full bg-white p-2 text-neutral-500"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </section>

      {query.trim() ? (
        <section className="mt-8">
          <h2 className="mb-4 text-3xl font-black tracking-tight text-black">
            Search results
          </h2>

          {searchedPlaces.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {searchedPlaces.map((place) => (
                <PostCardPlace key={place.id} place={place} />
              ))}
            </div>
          ) : (
            <div className="rounded-[2rem] bg-neutral-50 p-8 text-center">
              <h2 className="text-3xl font-black text-black">
                Nothing found.
              </h2>

              <p className="mx-auto mt-3 max-w-sm text-sm font-semibold text-neutral-500">
                That search has been saved so ELO can learn what people are
                looking for.
              </p>
            </div>
          )}
        </section>
      ) : (
        <>
          {openPlaces.length > 0 && (
            <section className="mt-10">
              <h2 className="mb-4 text-4xl font-black tracking-tight text-black">
                Open Places
              </h2>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {openPlaces.slice(0, 12).map((place) => (
                  <PostCardPlace key={place.id} place={place} />
                ))}
              </div>
            </section>
          )}

          {closedPlaces.length > 0 && (
            <section className="mt-12">
              <h2 className="mb-4 text-3xl font-black text-black">
                All Places
              </h2>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {closedPlaces.slice(0, 60).map((place) => (
                  <PostCardPlace key={place.id} place={place} />
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {sortedPlaces.length === 0 && (
        <section className="mt-10 rounded-[2rem] bg-neutral-50 p-8 text-center">
          <h2 className="text-3xl font-black text-black">No Places yet.</h2>

          <p className="mx-auto mt-3 max-w-sm text-sm font-semibold text-neutral-500">
            Once Places are added, this becomes the local discovery page for
            East Lothian.
          </p>
        </section>
      )}
    </main>
  );
}
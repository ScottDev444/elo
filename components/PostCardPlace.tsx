"use client";

import Link from "next/link";
import { Clock3, MapPin, Tag } from "lucide-react";
import { useMemo } from "react";

type OpeningDay = {
  closed?: boolean;
  open?: string;
  close?: string;
  is24h?: boolean;
  is_24_7?: boolean;
};

type Place = {
  id: string;
  slug?: string;
  title: string;
  description?: string;
  location_name?: string;
  address?: string;
  postcode?: string;
  tags?: string[];
  images?: string[];
  opening_hours?: Record<string, OpeningDay>;
  metadata?: {
    open_24_7?: boolean;
  };
};

type Props = {
  place: Place;
};

export default function PostCardPlace({ place }: Props) {
  const todayKey = useMemo(() => {
    const days = [
      "sunday",
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
    ];

    return days[new Date().getDay()];
  }, []);

  const todayHours = place.opening_hours?.[todayKey];

  const isAlwaysOpen =
    place.metadata?.open_24_7 ||
    todayHours?.is24h ||
    todayHours?.is_24_7;

  const openLabel = useMemo(() => {
    if (isAlwaysOpen) return "Open 24/7";
    if (!todayHours) return "Hours unavailable";
    if (todayHours.closed) return "Closed today";

    return `Open today ${todayHours.open} - ${todayHours.close}`;
  }, [todayHours, isAlwaysOpen]);

  const card = (
    <article className="h-full overflow-hidden rounded-[2rem] border border-neutral-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      {place.images?.[0] && (
        <div className="relative aspect-[16/9] w-full overflow-hidden">
          <img
            src={place.images[0]}
            alt={place.title}
            className="h-full w-full object-cover"
          />

          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />

          <div className="absolute bottom-4 left-4 right-4">
            <h2 className="text-2xl font-black text-white">{place.title}</h2>

            {place.location_name && (
              <div className="mt-2 flex items-center gap-2 text-sm font-semibold text-white/90">
                <MapPin size={16} />
                <span>{place.location_name}</span>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="p-5">
        {!place.images?.[0] && (
          <>
            <h2 className="text-2xl font-black text-black">{place.title}</h2>

            {place.location_name && (
              <div className="mt-2 flex items-center gap-2 text-sm font-semibold text-neutral-500">
                <MapPin size={16} />
                <span>{place.location_name}</span>
              </div>
            )}
          </>
        )}

        {place.description && (
          <p className="mt-4 line-clamp-3 text-sm leading-relaxed text-neutral-700">
            {place.description}
          </p>
        )}

        <div className="mt-5 rounded-2xl bg-emerald-50 p-4">
          <div className="flex items-center gap-2 text-emerald-900">
            <Clock3 size={18} />
            <p className="text-sm font-black">{openLabel}</p>
          </div>
        </div>

        {!!place.tags?.length && (
          <div className="mt-5 flex flex-wrap gap-2">
            {place.tags.slice(0, 4).map((tag: string) => (
              <div
                key={tag}
                className="flex items-center gap-1 rounded-full bg-neutral-100 px-3 py-2 text-xs font-bold text-neutral-700"
              >
                <Tag size={12} />
                <span>{tag}</span>
              </div>
            ))}
          </div>
        )}

        {(place.address || place.postcode) && (
          <div className="mt-5 rounded-2xl bg-neutral-50 p-4">
            <p className="text-xs font-black uppercase tracking-wide text-neutral-500">
              Address
            </p>

            <p className="mt-2 text-sm font-semibold text-black">
              {[place.address, place.postcode].filter(Boolean).join(", ")}
            </p>
          </div>
        )}
      </div>
    </article>
  );

  if (!place.slug) return card;

  return (
    <Link href={`/places/${place.slug}`} className="block h-full">
      {card}
    </Link>
  );
}
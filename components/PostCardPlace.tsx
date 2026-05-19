"use client";

import Link from "next/link";
import { Clock3, MapPin } from "lucide-react";
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
  images?: string[];
  opening_hours?: Record<string, OpeningDay>;
  metadata?: {
    open_24_7?: boolean;
  };
};

type Props = {
  place: Place;
};

function minutesFromTime(time?: string) {
  if (!time) return null;

  const [hours, minutes] = time.split(":").map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;

  return hours * 60 + minutes;
}

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
    place.metadata?.open_24_7 || todayHours?.is24h || todayHours?.is_24_7;

  const isClosingSoon = useMemo(() => {
    if (isAlwaysOpen || !todayHours || todayHours.closed) return false;

    const closeMinutes = minutesFromTime(todayHours.close);
    if (closeMinutes === null) return false;

    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();

    return closeMinutes - nowMinutes > 0 && closeMinutes - nowMinutes <= 60;
  }, [todayHours, isAlwaysOpen]);

  const statusLabel = useMemo(() => {
    if (isClosingSoon) return "Closing soon";
    if (isAlwaysOpen) return "Open now";
    if (!todayHours) return "Hours unavailable";
    if (todayHours.closed) return "Closed today";

    return `${todayHours.open} - ${todayHours.close}`;
  }, [todayHours, isAlwaysOpen, isClosingSoon]);

  const imageUrl = place.images?.[0];

  const card = (
    <article className="group relative aspect-square h-full w-full overflow-hidden rounded-[2rem] border border-neutral-200 bg-neutral-100 shadow-sm transition hover:-translate-y-0.5 hover:shadow-xl">
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={place.title}
          className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105"
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-100 via-white to-neutral-100" />
      )}

      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/75 via-45% to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/95 via-black/70 to-transparent" />

      <div className="absolute inset-x-0 bottom-0 p-5">
        <h2 className="line-clamp-2 text-2xl font-black leading-tight text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
          {place.title}
        </h2>

        {place.location_name && (
          <div className="mt-2 flex items-center gap-2 text-sm font-bold text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.8)]">
            <MapPin size={16} />
            <span className="line-clamp-1">{place.location_name}</span>
          </div>
        )}

        <div
          className={`mt-4 flex items-center gap-2 rounded-2xl px-4 py-3 shadow-sm ${
            isClosingSoon
              ? "bg-red-600 text-white"
              : "bg-white text-emerald-950"
          }`}
        >
          <Clock3 size={17} />
          <p className="text-sm font-black">{statusLabel}</p>
        </div>
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
import Link from "next/link";
import { notFound } from "next/navigation";
import { Clock3, MapPin, Tag } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import BackButton from "@/components/BackButton";

export const dynamic = "force-dynamic";

type OpeningDay = {
  closed?: boolean;
  open?: string;
  close?: string;
  is24h?: boolean;
  is_24_7?: boolean;
};

type OwnerPage = {
  name?: string;
  slug?: string;
  is_local_partner?: boolean;
};

type Place = {
  id: string;
  page_id?: string;
  slug?: string;
  title: string;
  description?: string;
  location_name?: string;
  address?: string;
  postcode?: string;
  brand_color?: string;
  tags?: string[];
  images?: string[];
  opening_hours?: Record<string, OpeningDay>;
  metadata?: {
    open_24_7?: boolean;
  };
};

const dayLabels = [
  ["monday", "Monday"],
  ["tuesday", "Tuesday"],
  ["wednesday", "Wednesday"],
  ["thursday", "Thursday"],
  ["friday", "Friday"],
  ["saturday", "Saturday"],
  ["sunday", "Sunday"],
] as const;

function isSafeHexColour(value?: string) {
  return typeof value === "string" && /^#[0-9A-Fa-f]{6}$/.test(value);
}

function getTodayKey() {
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
}

function isPlaceOpen(place: Place) {
  if (place.metadata?.open_24_7) return true;

  const todayHours = place.opening_hours?.[getTodayKey()];

  if (!todayHours || todayHours.closed) return false;
  if (todayHours.is24h || todayHours.is_24_7) return true;
  if (!todayHours.open || !todayHours.close) return false;

  const currentTime = new Date().toTimeString().slice(0, 5);

  return currentTime >= todayHours.open && currentTime <= todayHours.close;
}

function todayLabel(place: Place) {
  if (place.metadata?.open_24_7) return "Open 24/7";

  const todayHours = place.opening_hours?.[getTodayKey()];

  if (!todayHours) return "Hours unavailable";
  if (todayHours.closed) return "Closed today";
  if (todayHours.is24h || todayHours.is_24_7) return "Open 24/7";

  return `Open today ${todayHours.open} - ${todayHours.close}`;
}

export default async function PlacePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const supabase = await createClient();

  const { data: place, error: placeError } = await supabase
    .from("places")
    .select(`
      id,
      page_id,
      slug,
      title,
      description,
      location_name,
      address,
      postcode,
      brand_color,
      tags,
      images,
      opening_hours,
      metadata,
      is_active
    `)
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();

  if (placeError || !place) notFound();

  let ownerPage: OwnerPage | null = null;

  if (place.page_id) {
    const { data: owner } = await supabase
      .from("groups")
      .select("name, slug, is_local_partner")
      .eq("id", place.page_id)
      .maybeSingle();

    ownerPage = owner;
  }

  const open = isPlaceOpen(place);
  const ownerSlug = ownerPage?.slug ?? "";
  const ownerName = ownerPage?.name ?? "East Lothian Online";
  const isLocalPartner = ownerPage?.is_local_partner === true;

  const brandColour = isSafeHexColour(place.brand_color)
    ? place.brand_color
    : "#047857";

  return (
    <main className="min-h-screen bg-white px-6 pb-12 pt-4 md:p-8">
      <div className="mb-5">
        <BackButton />
      </div>

      <section
        className="rounded-[2rem] p-6 text-white shadow-xl"
        style={{ backgroundColor: brandColour }}
      >
        <div className="flex flex-col items-start gap-6 md:flex-row">
          <div className="flex-1">
            <div className="mb-3 flex flex-wrap gap-2">
              <span
                className={`rounded-full px-3 py-1 text-xs font-black ${
                  open ? "bg-white text-black" : "bg-white/20 text-white"
                }`}
              >
                {todayLabel(place)}
              </span>

              {isLocalPartner && (
                <span className="rounded-full bg-black/20 px-3 py-1 text-xs font-black text-white">
                  Local Partner
                </span>
              )}
            </div>

            <h1 className="text-4xl font-black leading-none tracking-tight md:text-6xl">
              {place.title}
            </h1>

            {place.location_name && (
              <div className="mt-4 flex items-center gap-2 text-sm font-bold text-white/90">
                <MapPin size={18} />
                {place.location_name}
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="mt-6 grid gap-4 md:grid-cols-[1.4fr_0.8fr]">
        <div className="rounded-[2rem] bg-neutral-50 p-6">
          <h2 className="text-2xl font-black text-black">About</h2>

          <p className="mt-4 whitespace-pre-wrap text-base font-semibold leading-relaxed text-neutral-700">
            {place.description || "No description yet."}
          </p>

          {!!place.tags?.length && (
            <div className="mt-6 flex flex-wrap gap-2">
              {place.tags.map((tag: string) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-2 text-xs font-black text-neutral-700"
                >
                  <Tag size={12} />
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        <aside className="space-y-4">
          <section
            className="rounded-[2rem] p-5"
            style={{ backgroundColor: `${brandColour}14` }}
          >
            <div
              className="flex items-center gap-2"
              style={{ color: brandColour }}
            >
              <Clock3 size={20} />
              <h2 className="font-black">Opening hours</h2>
            </div>

            <p
              className="mt-3 text-sm font-black"
              style={{ color: brandColour }}
            >
              {todayLabel(place)}
            </p>

            {!place.metadata?.open_24_7 && (
              <div className="mt-4 space-y-2">
                {dayLabels.map(([key, label]) => {
                  const day = place.opening_hours?.[key];

                  return (
                    <div
                      key={key}
                      className="flex justify-between gap-3 rounded-xl bg-white px-3 py-2 text-sm"
                    >
                      <span className="font-bold text-black">{label}</span>

                      <span className="text-right font-semibold text-neutral-600">
                        {!day || day.closed
                          ? "Closed"
                          : day.is24h || day.is_24_7
                            ? "24 hours"
                            : `${day.open} - ${day.close}`}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {(place.address || place.postcode || place.location_name) && (
            <section className="rounded-[2rem] bg-neutral-50 p-5">
              <div className="flex items-center gap-2 text-black">
                <MapPin size={20} />
                <h2 className="font-black">Location</h2>
              </div>

              <p className="mt-3 text-sm font-semibold leading-relaxed text-neutral-700">
                {[place.location_name, place.address, place.postcode]
                  .filter(Boolean)
                  .join(", ")}
              </p>
            </section>
          )}

          <section className="rounded-[2rem] bg-neutral-50 p-5">
            <p className="text-xs font-black uppercase tracking-[0.25em] text-neutral-400">
              Listed by
            </p>

            {ownerSlug ? (
              <Link
                href={`/${ownerSlug}`}
                className="mt-2 block text-lg font-black text-black underline underline-offset-4"
                style={{ textDecorationColor: brandColour }}
              >
                {ownerName}
              </Link>
            ) : (
              <p className="mt-2 text-lg font-black text-black">{ownerName}</p>
            )}
          </section>
        </aside>
      </section>

      {(place.images?.length ?? 0) > 0 && (
        <section className="mt-6">
          <h2 className="mb-4 text-3xl font-black text-black">Photos</h2>

          <div className="grid gap-4 md:grid-cols-3">
            {place.images?.map((image: string, index: number) => (
              <div
                key={image}
                className="aspect-square overflow-hidden rounded-[2rem] bg-neutral-100"
              >
                <img
                  src={image}
                  alt={`${place.title} photo ${index + 1}`}
                  className="h-full w-full object-cover"
                />
              </div>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
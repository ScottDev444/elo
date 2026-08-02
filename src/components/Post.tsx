"use client";

import Link from "next/link";
import { useState, type MouseEvent } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Clock3,
  Navigation,
  CalendarDays,
  ChevronDown,
  ChevronUp,
  BadgeCheck,
  MapPin,
  X,
  Tag,
  UserRound,
} from "lucide-react";

type DealMetadata = {
  deal_kind?: "price" | "percent" | "buy_x_get_y" | "free" | string | null;
  deal_price?: number | null;
  discount_percent?: number | null;
  buy_quantity?: number | null;
  pay_quantity?: number | null;
  active_dates?: string[] | null;
  public_type?: string | null;
  image_urls?: string[] | null;
  popup_address?: string | null;
  popup_start_time?: string | null;
  popup_end_time?: string | null;
  advert_cta?: string | null;
  advert_url?: string | null;
};

type PostProps = {
  title: string;
  description: string;
  href: string;

  date?: string;
  dates?: string[];
  postedBy?: string;
  location?: string;

  category?: string;
  colour?: "emerald" | "red" | "amber" | "blue";
  type?: "event" | "deal" | "update" | "popup" | "advert" | "post";

  brandColour?: string;
  metadata?: DealMetadata | null;
  imageUrl?: string | null;

  featured?: boolean;
  isLocalPartner?: boolean;
};

const colours = {
  emerald: "bg-emerald-100 text-emerald-700",
  red: "bg-red-100 text-red-700",
  amber: "bg-amber-100 text-amber-700",
  blue: "bg-sky-100 text-sky-700",
};

function getLocalDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function parseDateKey(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);

  if (!year || !month || !day) {
    return null;
  }

  const parsedDate = new Date(year, month - 1, day);

  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
}

function formatDateKey(dateKey: string) {
  const parsedDate = parseDateKey(dateKey);

  if (!parsedDate) {
    return dateKey;
  }

  return parsedDate.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
}

function getTomorrowDateKey() {
  const tomorrow = new Date();

  tomorrow.setDate(tomorrow.getDate() + 1);

  return getLocalDateKey(tomorrow);
}

function getWeekendWindow() {
  const today = new Date();

  today.setHours(0, 0, 0, 0);

  const dayOfWeek = today.getDay();
  const saturday = new Date(today);
  const sunday = new Date(today);

  if (dayOfWeek === 6) {
    sunday.setDate(today.getDate() + 1);
  } else if (dayOfWeek === 0) {
    saturday.setDate(today.getDate() - 1);
  } else {
    saturday.setDate(today.getDate() + (6 - dayOfWeek));
    sunday.setDate(saturday.getDate() + 1);
  }

  saturday.setHours(0, 0, 0, 0);
  sunday.setHours(23, 59, 59, 999);

  return {
    start: saturday,
    end: sunday,
  };
}

function isThisWeekend(dateKey: string) {
  const parsedDate = parseDateKey(dateKey);

  if (!parsedDate) {
    return false;
  }

  const weekend = getWeekendWindow();

  return (
    parsedDate.getTime() >= weekend.start.getTime() &&
    parsedDate.getTime() <= weekend.end.getTime()
  );
}

function normaliseDates(
  date?: string,
  dates?: string[],
  metadataDates?: string[] | null,
) {
  const combinedDates = [
    ...(Array.isArray(metadataDates) ? metadataDates : []),
    ...(Array.isArray(dates) ? dates : []),
    ...(date ? [date] : []),
  ];

  return Array.from(new Set(combinedDates))
    .filter((dateKey) => parseDateKey(dateKey))
    .sort((a, b) => a.localeCompare(b));
}

function getDisplayDateKey(activeDates: string[]) {
  if (activeDates.length === 0) {
    return null;
  }

  const todayKey = getLocalDateKey();

  return (
    activeDates.find((dateKey) => dateKey >= todayKey) ??
    activeDates[activeDates.length - 1]
  );
}

function getDateTags(activeDates: string[]) {
  if (activeDates.length === 0) {
    return [];
  }

  const tags: string[] = [];
  const todayKey = getLocalDateKey();
  const tomorrowKey = getTomorrowDateKey();

  if (activeDates.includes(todayKey)) {
    tags.push("Today");
  } else if (activeDates.includes(tomorrowKey)) {
    tags.push("Tomorrow");
  } else if (activeDates.some((dateKey) => isThisWeekend(dateKey))) {
    tags.push("This Weekend");
  }

  if (activeDates.length > 1) {
    tags.push(`${activeDates.length} Dates`);
  }

  return tags;
}

function getResolvedType(
  type: PostProps["type"],
  category: string,
  metadata?: DealMetadata | null,
) {
  if (type) {
    return type;
  }

  if (
    metadata?.public_type === "deal" ||
    metadata?.public_type === "update" ||
    metadata?.public_type === "popup" ||
    metadata?.public_type === "advert"
  ) {
    return metadata.public_type;
  }

  const normalisedCategory = category.trim().toLowerCase();

  if (normalisedCategory === "deal") {
    return "deal";
  }

  if (normalisedCategory === "event") {
    return "event";
  }

  return "post";
}


function getEloPostColour(seed: string) {
  const palette = [
    "#166534",
    "#1d4ed8",
    "#b45309",
    "#be123c",
    "#7e22ce",
    "#0f766e",
    "#c2410c",
  ];

  let hash = 0;
  for (let index = 0; index < seed.length; index++) {
    hash = (hash * 31 + seed.charCodeAt(index)) >>> 0;
  }

  return palette[hash % palette.length];
}

function safeBrandColour(colour?: string) {
  if (
    colour &&
    /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(colour)
  ) {
    return colour;
  }

  return "#15803d";
}

function getReadableTextColour(hex: string) {
  const cleaned = hex.replace("#", "");

  const fullHex =
    cleaned.length === 3
      ? cleaned
          .split("")
          .map((character) => character + character)
          .join("")
      : cleaned;

  if (!/^[0-9A-Fa-f]{6}$/.test(fullHex)) {
    return "#ffffff";
  }

  const red = Number.parseInt(fullHex.slice(0, 2), 16);
  const green = Number.parseInt(fullHex.slice(2, 4), 16);
  const blue = Number.parseInt(fullHex.slice(4, 6), 16);

  const luminance =
    (0.299 * red + 0.587 * green + 0.114 * blue) / 255;

  return luminance > 0.62 ? "#111111" : "#ffffff";
}

function formatMoney(value: number) {
  return Number.isInteger(value)
    ? `£${value}`
    : `£${value.toFixed(2)}`;
}

function getDealValue(metadata?: DealMetadata | null) {
  switch (metadata?.deal_kind) {
    case "price":
      return typeof metadata.deal_price === "number"
        ? formatMoney(metadata.deal_price)
        : "Deal";

    case "percent":
      return typeof metadata.discount_percent === "number"
        ? `${metadata.discount_percent}% OFF`
        : "Discount";

    case "buy_x_get_y":
      if (
        typeof metadata.buy_quantity === "number" &&
        typeof metadata.pay_quantity === "number"
      ) {
        return `${metadata.buy_quantity} FOR ${metadata.pay_quantity}`;
      }

      return "Multi-buy";

    case "free":
      return "FREE";

    default:
      return "Special Deal";
  }
}

function LocalPartnerBadge({
  onClick,
}: {
  onClick: (event: MouseEvent<HTMLSpanElement>) => void;
}) {
  return (
    <span
      role="button"
      tabIndex={0}
      aria-label="Learn about Local Partners"
      onClick={onClick}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          event.currentTarget.click();
        }
      }}
      className="inline-flex h-5 w-5 shrink-0 cursor-pointer items-center justify-center rounded-full bg-emerald-600 transition hover:scale-110 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
    >
      <BadgeCheck className="h-3.5 w-3.5 text-amber-300" />
    </span>
  );
}


export default function Post({
  title,
  description,
  href,
  date,
  dates,
  postedBy,
  location,
  category = "Post",
  colour = "emerald",
  type,
  brandColour,
  metadata,
  imageUrl,
  featured = false,
  isLocalPartner = false,
}: PostProps) {
  const [showPartnerInfo, setShowPartnerInfo] = useState(false);
  const [showUpdateDetails, setShowUpdateDetails] = useState(false);

  const openPartnerInfo = (
    event: MouseEvent<HTMLSpanElement>,
  ) => {
    event.preventDefault();
    event.stopPropagation();
    setShowPartnerInfo(true);
  };

  const partnerPopup = showPartnerInfo ? (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm"
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        setShowPartnerInfo(false);
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="local-partner-title"
        className="relative w-full max-w-sm rounded-3xl bg-white p-6 text-left text-slate-900 shadow-2xl"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
        }}
      >
        <button
          type="button"
          aria-label="Close"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            setShowPartnerInfo(false);
          }}
          className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition hover:bg-slate-200"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-600">
          <BadgeCheck className="h-7 w-7 text-amber-300" />
        </div>

        <h3
          id="local-partner-title"
          className="mt-5 text-xl font-black tracking-tight"
        >
          Local Partner
        </h3>

        <p className="mt-2 leading-6 text-slate-600">
          This post is from an ELO Local Partner — a local business or organisation supporting East Lothian Online.
        </p>
      </div>
    </div>
  ) : null;

  const activeDates = normaliseDates(
    date,
    dates,
    metadata?.active_dates,
  );
  const dateTags = getDateTags(activeDates);
  const displayDate = getDisplayDateKey(activeDates);

  const resolvedType = getResolvedType(
    type,
    category,
    metadata,
  );

  const isEloPost =
    postedBy?.trim().toLowerCase() === "east lothian online";

  const resolvedBrandColour = isEloPost
    ? getEloPostColour(`${href}-${title}`)
    : safeBrandColour(brandColour);

  const brandTextColour = getReadableTextColour(
    resolvedBrandColour,
  );

  const isDeal = resolvedType === "deal";
  const isEvent = resolvedType === "event";
  const isUpdate = resolvedType === "update";
  const isPopup = resolvedType === "popup";
  const isAdvert = resolvedType === "advert";

  if (isAdvert) {
    return (
      <>
        <article className="border border-slate-200 bg-white shadow-sm">
          {imageUrl ? (
            <div className="flex w-full items-stretch">
              <div className="relative min-w-0 flex-1">
                <img
                  src={imageUrl}
                  alt={title}
                  className="block h-full max-h-[180px] w-full object-cover sm:max-h-[220px]"
                />

                {isLocalPartner ? (
                  <div className="absolute left-3 top-3 z-30">
                    <LocalPartnerBadge onClick={openPartnerInfo} />
                  </div>
                ) : null}
              </div>

              {metadata?.advert_url ? (
                <a
                  href={metadata.advert_url}
                  className="flex w-20 shrink-0 items-center justify-center px-2 text-center text-xs font-black uppercase tracking-[0.08em] transition hover:brightness-95 sm:w-28 sm:text-sm"
                  style={{
                    backgroundColor: resolvedBrandColour,
                    color: brandTextColour,
                  }}
                >
                  {metadata?.advert_cta || "LEARN MORE"}
                </a>
              ) : null}
            </div>
          ) : null}
        </article>
        {partnerPopup}
      </>
    );
  }

  if (isPopup) {
    const popupAddress = metadata?.popup_address || location || "";
    const popupHours =
      metadata?.popup_start_time && metadata?.popup_end_time
        ? `${metadata.popup_start_time} – ${metadata.popup_end_time}`
        : "Hours unavailable";

    const directionsQuery = encodeURIComponent(popupAddress);

    return (
      <>
        <article className="group overflow-hidden rounded-[2rem] bg-white shadow-[0_18px_60px_rgba(15,23,42,0.08)] ring-1 ring-black/5 transition hover:-translate-y-1">
          <div
            className="relative aspect-[16/10] overflow-hidden"
            style={{ backgroundColor: resolvedBrandColour }}
          >
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={title}
                className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.045]"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <MapPin
                  className="h-14 w-14"
                  style={{ color: brandTextColour }}
                />
              </div>
            )}

            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-slate-950/10 to-transparent" />

            <div className="absolute left-4 top-4 flex items-center gap-2">
              <span className="flex items-center gap-2 rounded-full bg-emerald-500 px-3 py-2 text-xs font-bold text-white shadow-lg backdrop-blur-xl">
                <span className="h-2 w-2 rounded-full bg-white" />
                Open Today
              </span>
            </div>

            <Link
              href={href}
              aria-label={`View ${title}`}
              className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full bg-white/90 text-slate-900 shadow-lg backdrop-blur-xl transition hover:scale-105 hover:bg-white"
            >
              <ArrowUpRight className="h-5 w-5" />
            </Link>

            <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6">
              {popupAddress ? (
                <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-white/80">
                  <MapPin className="h-4 w-4" />
                  <span>{popupAddress}</span>
                </div>
              ) : null}

              <h2 className="text-2xl font-black tracking-tight text-white sm:text-3xl">
                {title}
              </h2>
            </div>
          </div>

          <div className="p-5 sm:p-6">
            {description ? (
              <p className="line-clamp-3 text-sm leading-6 text-slate-600">
                {description}
              </p>
            ) : null}

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="flex items-center gap-3 rounded-2xl bg-slate-50 p-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-emerald-600 shadow-sm">
                  <Clock3 className="h-5 w-5" />
                </div>

                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Today
                  </p>
                  <p className="truncate text-sm font-bold text-slate-900">
                    {popupHours}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-2xl bg-slate-50 p-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-emerald-600 shadow-sm">
                  <MapPin className="h-5 w-5" />
                </div>

                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Location
                  </p>
                  <p className="truncate text-sm font-bold text-slate-900">
                    {popupAddress || "Location unavailable"}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-5 flex gap-3">
              <Link
                href={href}
                className="flex flex-1 items-center justify-center gap-2 rounded-full bg-slate-950 px-5 py-3 text-sm font-bold text-white transition hover:bg-emerald-600"
              >
                View Pop-Up
              </Link>

              {directionsQuery ? (
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${directionsQuery}`}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`Get directions to ${title}`}
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-700 transition hover:bg-emerald-100"
                >
                  <Navigation className="h-5 w-5" />
                </a>
              ) : null}
            </div>
          </div>
        </article>
        {partnerPopup}
      </>
    );
  }

  if (isUpdate) {
    const updateImages = Array.isArray(metadata?.image_urls)
      ? metadata.image_urls.slice(0, 3)
      : [];

    return (
      <>
        <article
          role="button"
          tabIndex={0}
          aria-expanded={showUpdateDetails}
          onClick={() => setShowUpdateDetails((current) => !current)}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              setShowUpdateDetails((current) => !current);
            }
          }}
          className="group relative cursor-pointer overflow-hidden rounded-[1.6rem] border bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
          style={{ borderColor: `${resolvedBrandColour}45` }}
        >
          <div
            className="absolute left-0 top-0 h-full w-2"
            style={{ backgroundColor: resolvedBrandColour }}
          />

          <div className="px-6 py-6 pl-8">
            <div className="flex items-start justify-between gap-5">
              <div className="min-w-0">
                <h2 className="text-2xl font-black tracking-tight text-slate-900">
                  {title}
                </h2>
                {postedBy ? (
                  <p className="mt-2 text-sm font-bold" style={{ color: resolvedBrandColour }}>
                    {postedBy}
                  </p>
                ) : null}
              </div>

              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition group-hover:scale-105"
                style={{
                  backgroundColor: `${resolvedBrandColour}12`,
                  color: resolvedBrandColour,
                }}
              >
                <ChevronDown
                  className={`h-5 w-5 transition-transform duration-300 ${
                    showUpdateDetails ? "rotate-180" : ""
                  }`}
                />
              </div>
            </div>

            {!showUpdateDetails ? (
              <p className="mt-5 text-sm font-semibold text-slate-400">
                Tap to open notice
              </p>
            ) : (
              <div className="mt-5 border-t border-dashed border-slate-200 pt-5">
                {description ? (
                  <p className="whitespace-pre-wrap text-[0.98rem] leading-7 text-black">
                    {description}
                  </p>
                ) : null}

                {updateImages.length > 0 ? (
                  <div className="mt-6 space-y-3">
                    {updateImages.map((image, index) => (
                      <div
                        key={`${image}-${index}`}
                        className="overflow-hidden rounded-xl bg-slate-100"
                      >
                        <img
                          src={image}
                          alt={`${title} image ${index + 1}`}
                          className="h-auto w-full object-cover"
                        />
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </article>
        {partnerPopup}
      </>
    );
  }

  if (isDeal) {
    const dealValue = getDealValue(metadata);

    return (
      <>
        <Link
        href={href}
        className={`group block transition-all duration-300 hover:-translate-y-1 ${
          featured ? "drop-shadow-xl" : ""
        }`}
      >
        <article
          className="relative overflow-hidden rounded-[1.75rem] shadow-sm transition-shadow duration-300 group-hover:shadow-xl"
          style={{
            backgroundColor: resolvedBrandColour,
            color: brandTextColour,
          }}
        >
          <div
            className="absolute right-0 top-1/2 h-12 w-12 -translate-y-1/2 translate-x-6 rounded-full"
            style={{ backgroundColor: "#f8fafc" }}
          />

          <div className="grid min-h-[12rem] grid-cols-[7.5rem_minmax(0,1fr)] sm:min-h-[10.5rem] sm:grid-cols-[10rem_minmax(0,1fr)]">
            <div className="flex items-center justify-center border-r border-white/20 p-4 text-center">
              <div>
                <Tag className="mx-auto h-5 w-5" />

                <p className="mt-2 text-[0.65rem] font-black uppercase tracking-[0.2em] opacity-75">
                  Deal
                </p>

                <p className="mt-1 break-words text-2xl font-black leading-none tracking-tight sm:text-3xl">
                  {dealValue}
                </p>
              </div>
            </div>

            <div
              className="flex min-w-0 flex-col justify-center px-6 py-5 pr-10"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex flex-wrap items-center gap-2">
                  {isLocalPartner && (
                    <LocalPartnerBadge onClick={openPartnerInfo} />
                  )}
                  {dateTags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-white/15 px-3 py-1 text-xs font-bold backdrop-blur-sm"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                <ArrowRight className="h-5 w-5 shrink-0 opacity-70 transition duration-300 group-hover:translate-x-1 group-hover:opacity-100" />
              </div>

              <h2 className="mt-3 line-clamp-2 text-xl font-black tracking-tight sm:text-2xl">
                {title}
              </h2>

              {description && (
                <p className="mt-2 line-clamp-2 text-sm leading-6 opacity-80 sm:text-base">
                  {description}
                </p>
              )}

              {(postedBy || location || displayDate) && (
                <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs font-semibold opacity-80 sm:text-sm">
                  {displayDate && (
                    <span className="flex items-center gap-1.5">
                      <CalendarDays className="h-4 w-4 shrink-0" />
                      {formatDateKey(displayDate)}
                    </span>
                  )}

                  {postedBy && (
                    <span className="flex items-center gap-1.5">
                      <UserRound className="h-4 w-4 shrink-0" />
                      {postedBy}
                    </span>
                  )}

                  {location && (
                    <span className="flex items-center gap-1.5">
                      <MapPin className="h-4 w-4 shrink-0" />
                      {location}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </article>
        </Link>
        {partnerPopup}
      </>
    );
  }

  if (isEvent) {
    return (
      <>
        <Link
        href={href}
        className={`group relative block overflow-hidden rounded-3xl border border-slate-200 bg-white transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${
          featured ? "ring-2 ring-black/10" : ""
        }`}
      >
        <div className="grid sm:grid-cols-[7.5rem_minmax(0,1fr)]">
          <div
            className="flex items-center justify-center p-5"
            style={{
              backgroundColor: resolvedBrandColour,
              color: brandTextColour,
            }}
          >
            <div className="text-center">
              <CalendarDays className="mx-auto h-6 w-6" />

              <p className="mt-3 text-xs font-bold uppercase tracking-[0.16em] opacity-75">
                Event
              </p>

              {displayDate ? (
                <p className="mt-1 text-lg font-black">
                  {formatDateKey(displayDate)}
                </p>
              ) : (
                <p className="mt-1 text-lg font-black">
                  Coming up
                </p>
              )}
            </div>
          </div>

          <div className="p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className="rounded-full px-3 py-1 text-xs font-semibold"
                  style={{
                    backgroundColor: `${resolvedBrandColour}18`,
                    color: resolvedBrandColour,
                  }}
                >
                  {category}
                </span>

                {isLocalPartner && (
                  <LocalPartnerBadge onClick={openPartnerInfo} />
                )}

                {dateTags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700"
                  >
                    {tag}
                  </span>
                ))}
              </div>

              <ArrowRight
                className="h-5 w-5 shrink-0 transition duration-300 group-hover:translate-x-1"
                style={{ color: resolvedBrandColour }}
              />
            </div>


        <h2 className="mt-5 text-2xl font-bold tracking-tight text-slate-900">
              {title}
            </h2>

            {description && (
              <p className="mt-3 line-clamp-3 leading-7 text-slate-600">
                {description}
              </p>
            )}

            {(postedBy || location) && (
              <div className="mt-6 flex flex-wrap gap-x-5 gap-y-3 text-sm text-slate-500">
                {postedBy && (
                  <div className="flex items-center gap-2">
                    <UserRound className="h-4 w-4 shrink-0" />
                    <span>Posted by {postedBy}</span>
                  </div>
                )}

                {location && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 shrink-0" />
                    <span>{location}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        </Link>
        {partnerPopup}
      </>
    );
  }

  return (
    <>
      <Link
      href={href}
      className={`group relative block overflow-hidden rounded-3xl border border-slate-200 bg-white transition-all duration-300 hover:-translate-y-1 hover:border-emerald-300 hover:shadow-xl ${
        featured ? "ring-2 ring-emerald-500/20" : ""
      }`}
    >
      <div className="p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${colours[colour]}`}
            >
              {category}
            </span>

            {isLocalPartner && (
              <LocalPartnerBadge onClick={openPartnerInfo} />
            )}

            {dateTags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700"
              >
                {tag}
              </span>
            ))}
          </div>

          <ArrowRight className="h-5 w-5 shrink-0 text-slate-300 transition duration-300 group-hover:translate-x-1 group-hover:text-emerald-600" />
        </div>

        <h2 className="mt-5 text-2xl font-bold tracking-tight text-slate-900">
          {title}
        </h2>

        {description && (
          <p className="mt-3 line-clamp-3 leading-7 text-slate-600">
            {description}
          </p>
        )}

        {(displayDate || postedBy || location) && (
          <div className="mt-6 flex flex-wrap gap-x-5 gap-y-3 text-sm text-slate-500">
            {displayDate && (
              <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 shrink-0" />
                <span>{formatDateKey(displayDate)}</span>
              </div>
            )}

            {postedBy && (
              <div className="flex items-center gap-2">
                <UserRound className="h-4 w-4 shrink-0" />
                <span>Posted by {postedBy}</span>
              </div>
            )}

            {location && (
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 shrink-0" />
                <span>{location}</span>
              </div>
            )}
          </div>
        )}
      </div>
      </Link>
      {partnerPopup}
    </>
  );
}
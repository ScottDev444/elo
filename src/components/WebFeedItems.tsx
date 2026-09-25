"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  CircleAlert,
  MapPin,
  Megaphone,
  Navigation,
  Repeat2,
  Store,
  Tag,
} from "lucide-react";

export type GroupInfo = {
  id: string;
  name: string;
  is_local_partner: boolean;
  brand_color: string | null;
};

export type FeedPost = {
  id: string;
  group_id: string | null;
  title: string;
  content: string | null;
  image_url: string | null;
  created_at: string;
  type: string;
  expires_at: string | null;
  event_start: string | null;
  event_end: string | null;
  deal_price: string | null;
  metadata: {
    public_type?: string;
    image_urls?: string[];
    deal_price?: number | string | null;
    active_dates?: string[];
    advert_cta?: string | null;
    advert_url?: string | null;
    popup_address?: string | null;
    popup_start_time?: string | null;
    popup_end_time?: string | null;
    location?: string | null;
  } | null;
  group?: GroupInfo | null;
};

export type PlaceOpeningHours = Record<
  string,
  {
    open?: string;
    close?: string;
    closed?: boolean;
  }
>;

export type Place = {
  id: string;
  page_id: string | null;
  title: string;
  description: string | null;
  location_name: string | null;
  address: string | null;
  postcode: string | null;
  slug: string | null;
  images: unknown;
  is_active: boolean;
  opening_hours: PlaceOpeningHours | null;
  is_24_7: boolean | null;
  metadata?: {
    open_24_7?: boolean | null;
  } | null;
  group?: GroupInfo | null;
};

type PostCardProps = {
  post: FeedPost;
  accent?: string;
  onClick?: () => void;
};

type PlaceCardProps = {
  place: Place;
  onClick?: () => void;
};

const DAY_NAMES = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
] as const;

function normaliseHex(value?: string | null) {
  const cleaned = value?.trim();

  if (!cleaned) return "#008564";

  if (/^#[0-9a-fA-F]{6}$/.test(cleaned)) return cleaned;

  if (/^#[0-9a-fA-F]{3}$/.test(cleaned)) {
    const chars = cleaned.slice(1);
    return `#${chars
      .split("")
      .map((char) => `${char}${char}`)
      .join("")}`;
  }

  return "#008564";
}

function hexToRgba(colour: string, alpha: number) {
  const cleaned = normaliseHex(colour).replace("#", "");
  const red = parseInt(cleaned.slice(0, 2), 16);
  const green = parseInt(cleaned.slice(2, 4), 16);
  const blue = parseInt(cleaned.slice(4, 6), 16);

  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

function getReadableTextColour(colour: string) {
  const cleaned = normaliseHex(colour).replace("#", "");
  const red = parseInt(cleaned.slice(0, 2), 16);
  const green = parseInt(cleaned.slice(2, 4), 16);
  const blue = parseInt(cleaned.slice(4, 6), 16);
  const luminance = (0.299 * red + 0.587 * green + 0.114 * blue) / 255;

  return luminance > 0.62 ? "#111111" : "#FFFFFF";
}

function getAccentPresentation(hex: string) {
  let clean = hex.replace("#", "").trim();

  if (/^[0-9A-Fa-f]{3}$/.test(clean)) {
    clean = clean
      .split("")
      .map((char) => `${char}${char}`)
      .join("");
  }

  if (!/^[0-9A-Fa-f]{6}$/.test(clean)) {
    return {
      isVeryLight: false,
      ui: "#005744",
      rim: "#D8DEDB",
    };
  }

  const red = parseInt(clean.slice(0, 2), 16);
  const green = parseInt(clean.slice(2, 4), 16);
  const blue = parseInt(clean.slice(4, 6), 16);
  const luminance = (0.299 * red + 0.587 * green + 0.114 * blue) / 255;
  const isVeryLight = luminance >= 0.92;

  return {
    isVeryLight,
    ui: isVeryLight ? "#66716C" : `#${clean}`,
    rim: isVeryLight ? "#D8DEDB" : hexToRgba(`#${clean}`, 0.22),
  };
}

function getImage(post: FeedPost) {
  if (post.image_url) return post.image_url;

  const images = post.metadata?.image_urls;
  if (images?.length) return images[0];

  return null;
}

function getPlaceImage(place: Place) {
  const images = place.images;

  if (Array.isArray(images)) {
    for (const image of images) {
      if (typeof image === "string" && image.trim()) return image;

      if (image && typeof image === "object") {
        const candidate = image as Record<string, unknown>;
        const value =
          candidate.url ?? candidate.publicUrl ?? candidate.image_url;

        if (typeof value === "string" && value.trim()) return value;
      }
    }
  }

  if (typeof images === "string") {
    const cleaned = images.trim();

    if (cleaned.startsWith("http://") || cleaned.startsWith("https://")) {
      return cleaned;
    }

    try {
      const parsed = JSON.parse(cleaned);

      if (Array.isArray(parsed)) {
        const first = parsed.find((item) => typeof item === "string");
        if (typeof first === "string") return first;
      }
    } catch {}
  }

  return null;
}

function parseDateKey(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function localDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getPostDates(post: FeedPost) {
  const activeDates = post.metadata?.active_dates;

  if (Array.isArray(activeDates) && activeDates.length > 0) {
    return [...activeDates].filter(Boolean).sort();
  }

  if (post.event_start) {
    const date = new Date(post.event_start);
    if (!Number.isNaN(date.getTime())) return [localDateKey(date)];
  }

  return [];
}

function getDisplayDate(post: FeedPost, now: Date | null) {
  const dates = getPostDates(post);
  if (dates.length === 0) return null;

  if (!now) return dates[0];

  const today = localDateKey(now);
  return dates.find((date) => date >= today) ?? dates[0];
}

function getEventDateParts(post: FeedPost, now: Date | null) {
  const dateKey = getDisplayDate(post, now);
  if (!dateKey) return null;

  const date = parseDateKey(dateKey);

  return {
    weekday: date
      .toLocaleDateString("en-GB", { weekday: "short" })
      .toUpperCase(),
    day: String(date.getDate()).padStart(2, "0"),
    month: date
      .toLocaleDateString("en-GB", { month: "short" })
      .toUpperCase(),
  };
}

function getRelativeSchedule(post: FeedPost, now: Date | null) {
  const dates = getPostDates(post);
  const displayDate = getDisplayDate(post, now);

  if (!displayDate || !now) return null;

  const today = parseDateKey(localDateKey(now));
  const target = parseDateKey(displayDate);
  const difference = Math.round(
    (target.getTime() - today.getTime()) / 86400000
  );

  const relative =
    difference === 0
      ? "Today"
      : difference === 1
        ? "Tomorrow"
        : difference > 1
          ? `In ${difference} days`
          : target.toLocaleDateString("en-GB", {
              day: "numeric",
              month: "long",
            });

  const remaining = dates.filter((date) => date >= localDateKey(now)).length;

  return remaining > 1
    ? `${relative} • ${remaining} dates remaining`
    : relative;
}

function getDealValue(post: FeedPost) {
  const value = post.metadata?.deal_price ?? post.deal_price;

  if (value === null || value === undefined) return null;

  const text = String(value).trim();
  if (!text) return null;

  return /^\d+([.,]\d+)?$/.test(text) ? `£${text}` : text;
}

function getMetadataValue(post: FeedPost, key: string) {
  const metadata = post.metadata as Record<string, unknown> | null;
  const value = metadata?.[key];

  return typeof value === "string" ? value.trim() : "";
}

function parseTime(value?: string) {
  if (!value) return null;

  const match = value
    .trim()
    .match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);

  if (!match) return null;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);

  if (
    Number.isNaN(hours) ||
    Number.isNaN(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return null;
  }

  return hours * 60 + minutes;
}

function formatTime(value?: string) {
  const minutes = parseTime(value);

  if (minutes === null) return value ?? "";

  const hours = Math.floor(minutes / 60);
  const mins = String(minutes % 60).padStart(2, "0");

  return `${String(hours).padStart(2, "0")}:${mins}`;
}

function getPopupState(start: string, end: string, now: Date | null) {
  if (!now) return start && end ? `${start}–${end}` : "Today";

  const startMinutes = parseTime(start);
  const endMinutes = parseTime(end);

  if (startMinutes === null || endMinutes === null) {
    return start && end ? `${start}–${end}` : "Today";
  }

  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  if (nowMinutes < startMinutes) return `Opens ${start}`;
  if (nowMinutes < endMinutes) return `Open until ${end}`;

  return "Finished today";
}

function isPlaceTwentyFourSeven(place: Place) {
  return place.is_24_7 === true || place.metadata?.open_24_7 === true;
}

function getDayHours(openingHours: PlaceOpeningHours, dayName: string) {
  const direct = openingHours[dayName];
  if (direct) return direct;

  const matchingKey = Object.keys(openingHours).find(
    (key) => key.toLowerCase() === dayName.toLowerCase()
  );

  return matchingKey ? openingHours[matchingKey] : undefined;
}

function getOpenUntil(place: Place, now: Date | null) {
  if (isPlaceTwentyFourSeven(place)) return "Open 24/7";
  if (!now) return "Opening hours";

  const openingHours = place.opening_hours;
  if (!openingHours) return "Open now";

  const todayIndex = now.getDay();
  const previousIndex = (todayIndex + 6) % 7;
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const todayHours = getDayHours(openingHours, DAY_NAMES[todayIndex]);

  if (todayHours && !todayHours.closed) {
    const open = parseTime(todayHours.open);
    const close = parseTime(todayHours.close);

    if (open !== null && close !== null) {
      const openNow =
        open === close
          ? true
          : close > open
            ? currentMinutes >= open && currentMinutes < close
            : currentMinutes >= open;

      if (openNow) return `Open until ${formatTime(todayHours.close)}`;
    }
  }

  const previousHours = getDayHours(
    openingHours,
    DAY_NAMES[previousIndex]
  );

  if (previousHours && !previousHours.closed) {
    const previousOpen = parseTime(previousHours.open);
    const previousClose = parseTime(previousHours.close);

    if (
      previousOpen !== null &&
      previousClose !== null &&
      previousClose < previousOpen &&
      currentMinutes < previousClose
    ) {
      return `Open until ${formatTime(previousHours.close)}`;
    }
  }

  return "Open now";
}

function useClientNow() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());

    const timer = window.setInterval(() => {
      setNow(new Date());
    }, 60_000);

    return () => window.clearInterval(timer);
  }, []);

  return now;
}

function CardButton({
  children,
  className,
  onClick,
  style,
  label,
}: {
  children: ReactNode;
  className: string;
  onClick?: () => void;
  style?: CSSProperties;
  label?: string;
}) {
  return (
    <button
      type="button"
      className={className}
      onClick={onClick}
      aria-label={label}
      style={style}
    >
      {children}
    </button>
  );
}

export function WebEventCard({
  post,
  accent = normaliseHex(post.group?.brand_color),
  onClick,
}: PostCardProps) {
  const now = useClientNow();
  const colour = normaliseHex(accent);
  const accentText = getReadableTextColour(colour);
  const presentation = getAccentPresentation(colour);
  const dateParts = getEventDateParts(post, now);

  if (!dateParts) return null;

  const location = getMetadataValue(post, "location");
  const upcomingDates = getPostDates(post);
  const partner = post.group?.is_local_partner === true;

  return (
    <CardButton
      className="elo-web-event-card"
      onClick={onClick}
      style={{ borderColor: presentation.rim }}
      label={`Event: ${post.title}`}
    >
      <div
        className="elo-web-event-date"
        style={{
          backgroundColor: colour,
          color: accentText,
          borderRightColor: presentation.rim,
        }}
      >
        <span className="weekday">{dateParts.weekday}</span>
        <strong>{dateParts.day}</strong>
        <span className="month">{dateParts.month}</span>
      </div>

      <div className="elo-web-event-body">
        <div className="elo-web-event-meta">
          <span style={{ color: presentation.ui }}>EVENT</span>

          {partner && (
            <span className="elo-web-partner-inline" style={{ color: presentation.ui }}>
              <CheckCircle2 size={14} />
              LOCAL PARTNER
            </span>
          )}
        </div>

        {post.group?.name && (
          <div
            className="elo-web-event-group"
            style={{ color: presentation.ui }}
          >
            {post.group.name}
          </div>
        )}

        <h3>{post.title}</h3>

        {post.content && (
          <p className="elo-web-event-description">{post.content}</p>
        )}

        {location && (
          <div className="elo-web-event-location">
            <MapPin size={14} />
            <span>{location}</span>
          </div>
        )}

        {upcomingDates.length > 1 && (
          <div
            className="elo-web-recurring"
            style={{
              color: presentation.ui,
              backgroundColor: hexToRgba(colour, 0.08),
            }}
          >
            <Repeat2 size={13} />
            <span>{upcomingDates.length} upcoming dates</span>
          </div>
        )}
      </div>
    </CardButton>
  );
}

export function WebDealCard({
  post,
  accent = normaliseHex(post.group?.brand_color),
  onClick,
}: PostCardProps) {
  const now = useClientNow();
  const colour = normaliseHex(accent);
  const accentText = getReadableTextColour(colour);
  const dealValue = getDealValue(post);
  const schedule = getRelativeSchedule(post, now);
  const partner = post.group?.is_local_partner === true;

  return (
    <CardButton
      className="elo-web-deal-card"
      onClick={onClick}
      style={{
        backgroundColor: colour,
        borderColor: colour,
        color: accentText,
      }}
      label={`Deal: ${post.title}`}
    >
      <span
        className="elo-web-deal-notch left"
        style={{ borderColor: colour }}
      />
      <span
        className="elo-web-deal-notch right"
        style={{ borderColor: colour }}
      />

      <div className="elo-web-deal-top">
        <span
          className="elo-web-deal-label"
          style={{ backgroundColor: accentText, color: colour }}
        >
          <Tag size={11} />
          DEAL
        </span>

        {partner && (
          <span className="elo-web-deal-partner">
            <CheckCircle2 size={13} />
            LOCAL PARTNER
          </span>
        )}
      </div>

      {post.group?.name && (
        <div className="elo-web-deal-group">{post.group.name}</div>
      )}

      <h3>{post.title}</h3>

      {dealValue && (
        <span
          className="elo-web-deal-value"
          style={{ backgroundColor: hexToRgba(accentText, 0.14) }}
        >
          {dealValue}
        </span>
      )}

      <div
        className="elo-web-deal-divider"
        style={{ borderColor: hexToRgba(accentText, 0.38) }}
      />

      {schedule && (
        <div className="elo-web-deal-schedule">
          <CalendarDays size={14} />
          <span>{schedule}</span>
        </div>
      )}

      {post.content && <p>{post.content}</p>}
    </CardButton>
  );
}

export function WebUpdateCard({
  post,
  accent = normaliseHex(post.group?.brand_color),
  onClick,
}: PostCardProps) {
  const colour = normaliseHex(accent);
  const accentText = getReadableTextColour(colour);
  const presentation = getAccentPresentation(colour);
  const partner = post.group?.is_local_partner === true;

  return (
    <CardButton
      className="elo-web-update-card"
      onClick={onClick}
      style={{
        backgroundColor: colour,
        color: accentText,
        borderColor: presentation.rim,
        borderWidth: presentation.isVeryLight ? 1 : 0,
      }}
      label={`Update: ${post.title}`}
    >
      <span
        className="elo-web-update-watermark"
        style={{ borderColor: hexToRgba(accentText, 0.12) }}
      />

      <span
        className="elo-web-update-icon"
        style={{ backgroundColor: hexToRgba(accentText, 0.14) }}
      >
        <Megaphone size={27} />
      </span>

      {post.group?.name && (
        <div
          className="elo-web-update-org"
          style={{ color: hexToRgba(accentText, 0.78) }}
        >
          <span>{post.group.name}</span>
          {partner && <CheckCircle2 size={14} color={accentText} />}
        </div>
      )}

      <h3>{post.title}</h3>

      <span
        className="elo-web-update-divider"
        style={{ backgroundColor: hexToRgba(accentText, 0.28) }}
      />

      <span className="elo-web-update-read">
        Read more
        <ArrowRight size={15} />
      </span>
    </CardButton>
  );
}

export function WebPopupCard({
  post,
  accent = normaliseHex(post.group?.brand_color),
  onClick,
}: PostCardProps) {
  const now = useClientNow();
  const colour = normaliseHex(accent);
  const accentText = getReadableTextColour(colour);
  const image = getImage(post);
  const address = getMetadataValue(post, "popup_address");
  const startTime = getMetadataValue(post, "popup_start_time");
  const endTime = getMetadataValue(post, "popup_end_time");
  const status = getPopupState(startTime, endTime, now);
  const organisation = post.group?.name?.trim();
  const partner = post.group?.is_local_partner === true;

  return (
    <CardButton
      className="elo-web-square-card elo-web-popup-card"
      onClick={onClick}
      label={`Pop-up: ${post.title}`}
    >
      {image ? (
        <img src={image} alt="" className="elo-web-square-image" />
      ) : (
        <div
          className="elo-web-square-image elo-web-square-fallback"
          style={{ backgroundColor: colour, color: accentText }}
        >
          <MapPin size={54} />
        </div>
      )}

      <div className="elo-web-square-overlay" />

      <div className="elo-web-popup-status">
        <span
          className="elo-web-popup-ribbon"
          style={{ backgroundColor: colour, color: accentText }}
        >
          POP-UP
        </span>

        <span className="elo-web-open-panel">
          <i />
          {status}
        </span>
      </div>

      <div className="elo-web-square-bottom">
        {organisation && (
          <div className="elo-web-square-org">
            <span>{organisation}</span>
            {partner && <CheckCircle2 size={14} />}
          </div>
        )}

        <h3>{post.title}</h3>

        {address && (
          <div className="elo-web-square-location">
            <MapPin size={15} />
            <span>{address}</span>
          </div>
        )}
      </div>
    </CardButton>
  );
}

export function WebAdvertCard({
  post,
  accent = normaliseHex(post.group?.brand_color),
  onClick,
}: PostCardProps) {
  const image = getImage(post);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setLoaded(false);
  }, [image]);

  if (!image) return null;

  function handleClick() {
    if (onClick) {
      onClick();
      return;
    }

    const raw = post.metadata?.advert_url?.trim();
    if (!raw) return;

    const url = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  return (
    <CardButton
      className="elo-web-advert-card"
      onClick={handleClick}
      label={`Advert: ${post.title}`}
    >
      {!loaded && (
        <span
          className="elo-web-advert-loader"
          style={{ backgroundColor: `${normaliseHex(accent)}12` }}
        >
          <CircleAlert size={18} />
        </span>
      )}

      <img
        src={image}
        alt={post.title || "Advert"}
        onLoad={() => setLoaded(true)}
        onError={() => setLoaded(true)}
        style={{ opacity: loaded ? 1 : 0 }}
      />
    </CardButton>
  );
}

export function WebPlaceCard({ place, onClick }: PlaceCardProps) {
  const router = useRouter();
  const now = useClientNow();
  const image = getPlaceImage(place);
  const accent = normaliseHex(place.group?.brand_color);
  const location = place.location_name ?? place.address ?? place.postcode;
  const openLabel = getOpenUntil(place, now);
  const partner = place.group?.is_local_partner === true;

  const openPlace =
    onClick ??
    (() => {
      router.push(
        `/places/${encodeURIComponent(place.slug || place.id)}`
      );
    });

  return (
    <CardButton
      className="elo-web-square-card elo-web-place-card"
      onClick={openPlace}
      label={`Place: ${place.title}`}
    >
      {image ? (
        <img src={image} alt="" className="elo-web-square-image" />
      ) : (
        <div
          className="elo-web-square-image elo-web-square-fallback"
          style={{ backgroundColor: accent }}
        >
          <Store size={52} color="#FFFFFF" />
        </div>
      )}

      <div className="elo-web-square-overlay place" />

      <div className="elo-web-place-top">
        <span className="elo-web-place-tag">
          <MapPin size={12} />
          PLACE
        </span>

        {partner && (
          <span className="elo-web-place-partner">
            <CheckCircle2 size={13} />
            LOCAL PARTNER
          </span>
        )}
      </div>

      <span className="elo-web-open-panel elo-web-place-open">
        <i />
        {openLabel}
      </span>

      <div className="elo-web-square-bottom">
        <span className="elo-web-place-eyebrow">SOMEWHERE TO GO</span>
        <h3>{place.title}</h3>

        {location && (
          <div className="elo-web-square-location">
            <Navigation size={15} />
            <span>{location}</span>
          </div>
        )}

        <div className="elo-web-place-footer">
          <span>Explore this place</span>
          <i>
            <ArrowRight size={17} />
          </i>
        </div>
      </div>
    </CardButton>
  );
}

export function WebFeedPostCard(props: PostCardProps) {
  const router = useRouter();
  const type = props.post.type?.trim().toLowerCase();

  const openPost =
    props.onClick ??
    (() => {
      router.push(`/posts/${encodeURIComponent(props.post.id)}`);
    });

  if (type === "event") {
    return <WebEventCard {...props} onClick={openPost} />;
  }

  if (type === "deal") {
    return <WebDealCard {...props} onClick={openPost} />;
  }

  if (type === "update") {
    return <WebUpdateCard {...props} onClick={openPost} />;
  }

  if (type === "popup" || type === "pop-up") {
    return <WebPopupCard {...props} onClick={openPost} />;
  }

  // Adverts keep their own external advert URL behaviour.
  if (type === "advert") {
    return <WebAdvertCard {...props} />;
  }

  return null;
}

export function WebFeedStyles() {
  return (
    <style>{`
      .elo-web-event-card,
      .elo-web-deal-card,
      .elo-web-update-card,
      .elo-web-square-card,
      .elo-web-advert-card {
        width: 100%;
        font: inherit;
        text-align: left;
        cursor: pointer;
        box-sizing: border-box;
      }

      .elo-web-event-card,
      .elo-web-deal-card,
      .elo-web-update-card,
      .elo-web-square-card,
      .elo-web-advert-card {
        appearance: none;
        -webkit-appearance: none;
      }

      .elo-web-event-card {
        display: flex;
        min-height: 164px;
        margin: 0 0 18px;
        padding: 0;
        overflow: hidden;
        background: #FFFFFF;
        border: 1px solid #E5E5E5;
        border-radius: 16px;
      }

      .elo-web-event-date {
        width: 70px;
        flex: 0 0 70px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 14px 0;
        border-right: 0 solid transparent;
      }

      .elo-web-event-date .weekday {
        font-size: 9px;
        font-weight: 900;
        letter-spacing: 1.1px;
        opacity: .78;
      }

      .elo-web-event-date strong {
        margin-top: 1px;
        font-size: 32px;
        line-height: 36px;
        font-weight: 900;
        letter-spacing: -1.1px;
      }

      .elo-web-event-date .month {
        margin-top: 1px;
        font-size: 10px;
        font-weight: 900;
        letter-spacing: 1.15px;
      }

      .elo-web-event-body {
        min-width: 0;
        flex: 1;
        padding: 13px 14px 12px;
      }

      .elo-web-event-meta {
        min-height: 18px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        margin-bottom: 4px;
        font-size: 8px;
        font-weight: 900;
        letter-spacing: 1.25px;
      }

      .elo-web-partner-inline {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        font-size: 7px;
        font-weight: 900;
        letter-spacing: .45px;
      }

      .elo-web-event-group {
        margin-bottom: 3px;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        font-size: 10px;
        font-weight: 800;
      }

      .elo-web-event-body h3 {
        margin: 0;
        color: #151515;
        font-size: 18px;
        line-height: 22px;
        font-weight: 900;
        letter-spacing: -.3px;
        display: -webkit-box;
        -webkit-line-clamp: 3;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }

      .elo-web-event-description {
        margin: 6px 0 0;
        color: #707070;
        font-size: 11px;
        line-height: 16px;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }

      .elo-web-event-location {
        display: flex;
        align-items: center;
        gap: 5px;
        margin-top: 8px;
        color: #686868;
        font-size: 11px;
        font-weight: 700;
      }

      .elo-web-event-location span {
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .elo-web-recurring {
        width: fit-content;
        display: inline-flex;
        align-items: center;
        gap: 5px;
        margin-top: 8px;
        padding: 5px 7px;
        border-radius: 6px;
        font-size: 9px;
        font-weight: 800;
      }

      .elo-web-deal-card {
        position: relative;
        display: block;
        overflow: hidden;
        margin: 0 0 18px;
        padding: 17px 18px 18px;
        border: 1px solid;
        border-radius: 18px;
      }

      .elo-web-deal-notch {
        position: absolute;
        top: 63%;
        width: 20px;
        height: 20px;
        border: 1px solid;
        border-radius: 50%;
        background: #F4F5F4;
      }

      .elo-web-deal-notch.left { left: -10px; }
      .elo-web-deal-notch.right { right: -10px; }

      .elo-web-deal-top {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
      }

      .elo-web-deal-label {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        padding: 5px 8px;
        border-radius: 6px;
        font-size: 9px;
        font-weight: 900;
        letter-spacing: 1px;
      }

      .elo-web-deal-partner {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        font-size: 8px;
        font-weight: 900;
        letter-spacing: .4px;
      }

      .elo-web-deal-group {
        margin-top: 14px;
        font-size: 11px;
        font-weight: 800;
        opacity: .82;
      }

      .elo-web-deal-card h3 {
        margin: 5px 0 0;
        font-size: 31px;
        line-height: 35px;
        font-weight: 900;
        letter-spacing: -.9px;
        display: -webkit-box;
        -webkit-line-clamp: 3;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }

      .elo-web-deal-value {
        width: fit-content;
        display: block;
        margin-top: 12px;
        padding: 7px 10px;
        border-radius: 7px;
        font-size: 16px;
        font-weight: 900;
      }

      .elo-web-deal-divider {
        margin: 17px 0 13px;
        border-top: 1px dashed;
      }

      .elo-web-deal-schedule {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 11px;
        font-weight: 800;
      }

      .elo-web-deal-card p {
        margin: 9px 0 0;
        font-size: 12px;
        line-height: 18px;
        font-weight: 600;
        opacity: .82;
        display: -webkit-box;
        -webkit-line-clamp: 3;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }

      .elo-web-update-card {
        position: relative;
        min-height: 238px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        overflow: hidden;
        margin: 0 0 20px;
        padding: 24px 24px 20px;
        border-style: solid;
        border-radius: 22px;
        text-align: center;
      }

      .elo-web-update-watermark {
        position: absolute;
        top: -88px;
        right: -82px;
        width: 210px;
        height: 210px;
        border: 28px solid;
        border-radius: 50%;
      }

      .elo-web-update-icon {
        width: 58px;
        height: 58px;
        display: flex;
        align-items: center;
        justify-content: center;
        margin-bottom: 14px;
        border-radius: 50%;
      }

      .elo-web-update-org {
        max-width: 85%;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 5px;
        margin-bottom: 8px;
        font-size: 10px;
        font-weight: 900;
        letter-spacing: .7px;
        text-transform: uppercase;
      }

      .elo-web-update-org span {
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .elo-web-update-card h3 {
        width: 100%;
        margin: 0;
        font-size: 28px;
        line-height: 33px;
        font-weight: 900;
        letter-spacing: -.7px;
        text-align: center;
        display: -webkit-box;
        -webkit-line-clamp: 5;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }

      .elo-web-update-divider {
        width: 34px;
        height: 2px;
        margin: 17px 0 12px;
        border-radius: 1px;
      }

      .elo-web-update-read {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 5px;
        font-size: 10px;
        font-weight: 900;
        letter-spacing: .2px;
      }

      .elo-web-square-card {
        position: relative;
        display: block;
        aspect-ratio: 1;
        overflow: hidden;
        margin: 0 0 20px;
        padding: 0;
        border: 0;
        border-radius: 8px;
        background: #111111;
        color: #FFFFFF;
      }

      .elo-web-square-image {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      .elo-web-square-fallback {
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .elo-web-square-overlay {
        position: absolute;
        inset: 0;
        background: rgba(0,0,0,.31);
      }

      .elo-web-square-overlay.place {
        background: rgba(0,0,0,.34);
      }

      .elo-web-popup-status {
        position: absolute;
        top: 14px;
        right: 0;
        display: flex;
        flex-direction: column;
        align-items: flex-end;
      }

      .elo-web-popup-ribbon {
        min-height: 28px;
        display: flex;
        align-items: center;
        padding: 0 15px 0 12px;
        border-radius: 6px 0 0 0;
        font-size: 9px;
        font-weight: 900;
        letter-spacing: 1px;
      }

      .elo-web-open-panel {
        min-height: 34px;
        display: inline-flex;
        align-items: center;
        gap: 7px;
        padding: 0 15px 0 11px;
        border-radius: 0 0 0 6px;
        background: #005744;
        color: #FFFFFF;
        font-size: 10.5px;
        font-weight: 900;
      }

      .elo-web-open-panel i {
        width: 7px;
        height: 7px;
        flex: 0 0 7px;
        border-radius: 50%;
        background: #7DFFD0;
      }

      .elo-web-square-bottom {
        position: absolute;
        left: 18px;
        right: 18px;
        bottom: 18px;
      }

      .elo-web-square-org {
        max-width: 80%;
        display: flex;
        align-items: center;
        gap: 5px;
        margin-bottom: 6px;
        color: rgba(255,255,255,.78);
        font-size: 9px;
        font-weight: 900;
        letter-spacing: .7px;
        text-transform: uppercase;
      }

      .elo-web-square-org span {
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .elo-web-square-bottom h3 {
        margin: 0;
        color: #FFFFFF;
        font-size: 29px;
        line-height: 32px;
        font-weight: 900;
        letter-spacing: -.7px;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }

      .elo-web-square-location {
        display: flex;
        align-items: center;
        gap: 6px;
        margin-top: 8px;
        color: rgba(255,255,255,.82);
        font-size: 11.5px;
        font-weight: 700;
      }

      .elo-web-square-location span {
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .elo-web-place-top {
        position: absolute;
        top: 14px;
        left: 14px;
        right: 14px;
        display: flex;
        align-items: center;
        justify-content: space-between;
      }

      .elo-web-place-tag {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        padding: 6px 9px;
        border-radius: 4px;
        background: #FFFFFF;
        color: #005744;
        font-size: 9px;
        font-weight: 900;
        letter-spacing: 1px;
      }

      .elo-web-place-partner {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        padding: 6px 8px;
        border-radius: 4px;
        background: rgba(0,0,0,.52);
        color: #FFFFFF;
        font-size: 8px;
        font-weight: 900;
        letter-spacing: .45px;
      }

      .elo-web-place-open {
        position: absolute;
        top: 58px;
        right: 0;
        padding-top: 9px;
        padding-bottom: 9px;
        border-radius: 6px 0 0 6px;
        font-size: 11px;
      }

      .elo-web-place-eyebrow {
        display: block;
        margin-bottom: 6px;
        color: rgba(255,255,255,.72);
        font-size: 9px;
        font-weight: 900;
        letter-spacing: 1.4px;
      }

      .elo-web-place-footer {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-top: 15px;
        color: #FFFFFF;
        font-size: 12px;
        font-weight: 800;
      }

      .elo-web-place-footer i {
        width: 36px;
        height: 36px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
        background: #FFFFFF;
        color: #111111;
      }

      .elo-web-advert-card {
        position: relative;
        display: block;
        aspect-ratio: 3.25;
        overflow: hidden;
        margin: 0 0 14px;
        padding: 0;
        border: 0;
        border-radius: 12px;
        background: #ECEFED;
      }

      .elo-web-advert-card img {
        display: block;
        width: 100%;
        height: 100%;
        object-fit: cover;
        transition: opacity .15s ease;
      }

      .elo-web-advert-loader {
        position: absolute;
        inset: 0;
        z-index: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #005744;
      }

      .elo-web-event-card:focus-visible,
      .elo-web-deal-card:focus-visible,
      .elo-web-update-card:focus-visible,
      .elo-web-square-card:focus-visible,
      .elo-web-advert-card:focus-visible {
        outline: 2px solid #007A5E;
        outline-offset: 3px;
      }

      @media (max-width: 420px) {
        .elo-web-deal-card h3 {
          font-size: 27px;
          line-height: 31px;
        }

        .elo-web-square-bottom h3 {
          font-size: 25px;
          line-height: 28px;
        }

        .elo-web-event-date {
          width: 64px;
          flex-basis: 64px;
        }
      }
    `}</style>
  );
}

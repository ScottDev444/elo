"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ComponentType,
} from "react";
import { useParams, useRouter } from "next/navigation";
import {
  BriefcaseBusiness,
  CalendarDays,
  Car,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Coffee,
  Dumbbell,
  Gift,
  Globe2,
  Hammer,
  Heart,
  Home,
  Leaf,
  List,
  LoaderCircle,
  Newspaper,
  PawPrint,
  Utensils,
  Share2,
  ShieldCheck,
  Sparkles,
  Store,
  X,
} from "lucide-react";
import { FaFacebook, FaInstagram } from "react-icons/fa";

import SiteHeader from "@/components/SiteHeader";
import {
  WebFeedPostCard,
  WebFeedStyles,
  WebPlaceCard,
  type FeedPost,
  type GroupInfo,
  type Place,
} from "@/components/WebFeedItems";
import { createClient } from "@/lib/supabase/client";

const DAYS = ["M", "T", "W", "T", "F", "S", "S"];
const GALLERY_COLUMNS = 3;
const GALLERY_GAP = 8;

type PartnerMenuItem = {
  id: string;
  title: string;
  description: string;
  price: string;
  icon: string;
};

type PartnerFeatures = {
  branded_calendar?: boolean;
  menu_enabled?: boolean;
  menu_title?: string;
  menu_items?: unknown;
};

type PageLayout = {
  socials?: {
    facebook?: string | null;
    instagram?: string | null;
  } | null;
  facebook?: string | null;
  instagram?: string | null;
  partner_features?: PartnerFeatures | null;
  [key: string]: unknown;
};

type ELOPage = {
  id: string;
  name: string;
  slug: string | null;
  description: string | null;
  logo_url: string | null;
  brand_color: string | null;
  website: string | null;
  layout: PageLayout | null;
  showcase_images: unknown;
  is_local_partner: boolean | null;
  status: string | null;
  is_public: boolean | null;
};

const MENU_ICONS: Record<
  string,
  ComponentType<{ size?: number; strokeWidth?: number }>
> = {
  "restaurant-outline": Utensils,
  "cafe-outline": Coffee,
  "briefcase-outline": BriefcaseBusiness,
  "home-outline": Home,
  "car-outline": Car,
  "fitness-outline": Dumbbell,
  "heart-outline": Heart,
  "leaf-outline": Leaf,
  "gift-outline": Gift,
  "hammer-outline": Hammer,
  "paw-outline": PawPrint,
  "sparkles-outline": Sparkles,
};

function normaliseHex(value: string | null | undefined) {
  const clean = value?.trim();

  if (clean && /^#[0-9A-Fa-f]{6}$/.test(clean)) {
    return clean;
  }

  return "#005744";
}

function getReadableTextColour(hex: string) {
  const clean = hex.replace("#", "");

  if (!/^[0-9A-Fa-f]{6}$/.test(clean)) {
    return "#FFFFFF";
  }

  const red = Number.parseInt(clean.slice(0, 2), 16);
  const green = Number.parseInt(clean.slice(2, 4), 16);
  const blue = Number.parseInt(clean.slice(4, 6), 16);
  const luminance = (0.299 * red + 0.587 * green + 0.114 * blue) / 255;

  return luminance > 0.62 ? "#111111" : "#FFFFFF";
}

function getAccessibleLinkColour(hex: string) {
  const clean = hex.replace("#", "").trim();

  if (!/^[0-9A-Fa-f]{6}$/.test(clean)) {
    return "#005744";
  }

  const red = Number.parseInt(clean.slice(0, 2), 16);
  const green = Number.parseInt(clean.slice(2, 4), 16);
  const blue = Number.parseInt(clean.slice(4, 6), 16);
  const luminance = (0.299 * red + 0.587 * green + 0.114 * blue) / 255;

  if (luminance < 0.62) {
    return `#${clean}`;
  }

  const darken = (value: number) =>
    Math.max(0, Math.round(value * 0.5))
      .toString(16)
      .padStart(2, "0");

  return `#${darken(red)}${darken(green)}${darken(blue)}`;
}

function hexToRgba(hex: string, alpha: number) {
  const clean = normaliseHex(hex).replace("#", "");
  const red = Number.parseInt(clean.slice(0, 2), 16);
  const green = Number.parseInt(clean.slice(2, 4), 16);
  const blue = Number.parseInt(clean.slice(4, 6), 16);

  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

function normaliseImages(value: unknown, maxImages: number) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item): string | null => {
      if (typeof item === "string") {
        return item.trim() || null;
      }

      if (item && typeof item === "object" && !Array.isArray(item)) {
        const record = item as Record<string, unknown>;
        const possible =
          record.url ??
          record.image_url ??
          record.src ??
          record.publicUrl;

        return typeof possible === "string"
          ? possible.trim() || null
          : null;
      }

      return null;
    })
    .filter((item): item is string => Boolean(item))
    .slice(0, maxImages);
}

function normaliseMenuItems(value: unknown): PartnerMenuItem[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item): PartnerMenuItem | null => {
      if (!item || typeof item !== "object" || Array.isArray(item)) {
        return null;
      }

      const row = item as Record<string, unknown>;
      const title = typeof row.title === "string" ? row.title.trim() : "";

      if (!title) {
        return null;
      }

      return {
        id: typeof row.id === "string" ? row.id : title,
        title,
        description:
          typeof row.description === "string"
            ? row.description.trim()
            : "",
        price: typeof row.price === "string" ? row.price.trim() : "",
        icon:
          typeof row.icon === "string" && MENU_ICONS[row.icon]
            ? row.icon
            : "briefcase-outline",
      };
    })
    .filter((item): item is PartnerMenuItem => Boolean(item));
}

function normaliseWebsite(value: string | null | undefined) {
  const clean = value?.trim();

  if (!clean) {
    return null;
  }

  return /^https?:\/\//i.test(clean) ? clean : `https://${clean}`;
}

function normaliseSocial(
  value: string | null | undefined,
  network: "facebook" | "instagram"
) {
  const clean = value?.trim();

  if (!clean) {
    return null;
  }

  if (/^https?:\/\//i.test(clean)) {
    return clean;
  }

  let handle = clean.replace(/^@/, "").replace(/^www\./i, "");

  if (network === "facebook") {
    handle = handle.replace(/^facebook\.com\//i, "");
    return `https://www.facebook.com/${handle}`;
  }

  handle = handle.replace(/^instagram\.com\//i, "");
  return `https://www.instagram.com/${handle}`;
}

function isPostActive(post: FeedPost) {
  const now = Date.now();

  if (post.expires_at) {
    const expiry = new Date(post.expires_at).getTime();

    if (!Number.isNaN(expiry) && expiry < now) {
      return false;
    }
  }

  if (post.type === "event" || post.type === "deal") {
    const activeDates = post.metadata?.active_dates ?? [];

    if (activeDates.length > 0) {
      const today = new Date().toISOString().slice(0, 10);

      return activeDates.some(
        (date) => String(date).slice(0, 10) >= today
      );
    }

    const finalDate = post.event_end ?? post.event_start;

    if (finalDate) {
      const end = new Date(finalDate).getTime();

      if (!Number.isNaN(end) && end < now) {
        return false;
      }
    }
  }

  return true;
}

function datesForPost(post: FeedPost) {
  const activeDates = post.metadata?.active_dates ?? [];

  if (activeDates.length > 0) {
    return activeDates.map((date) => String(date).slice(0, 10));
  }

  if (post.event_start) {
    const eventDate = new Date(post.event_start);

    if (!Number.isNaN(eventDate.getTime())) {
      const year = eventDate.getFullYear();
      const month = String(eventDate.getMonth() + 1).padStart(2, "0");
      const day = String(eventDate.getDate()).padStart(2, "0");

      return [`${year}-${month}-${day}`];
    }
  }

  return [];
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

async function fetchAllRows(
  fetchRange: (
    from: number,
    to: number
  ) => PromiseLike<{ data: unknown[] | null; error: unknown }>
): Promise<unknown[]> {
  const rows: unknown[] = [];
  const requestSize = 1000;

  while (true) {
    const { data, error } = await fetchRange(
      rows.length,
      rows.length + requestSize - 1
    );

    if (error) {
      throw error;
    }

    if (!data || data.length === 0) {
      break;
    }

    rows.push(...data);

    if (data.length < requestSize) {
      break;
    }
  }

  return rows;
}

function PageHero({
  page,
  accent,
  onShare,
}: {
  page: ELOPage;
  accent: string;
  onShare: () => void;
}) {
  const textColour = getReadableTextColour(accent);

  return (
    <section
      className="elo-page-hero"
      style={{
        backgroundColor: accent,
      }}
    >
      <svg
        className="elo-page-hero-shards"
        viewBox="0 0 400 190"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <polygon
          points="0,0 108,0 65,82 0,109"
          fill="#FFFFFF"
          fillOpacity="0.08"
        />
        <polygon
          points="108,0 228,0 167,76 65,82"
          fill="#000000"
          fillOpacity="0.07"
        />
        <polygon
          points="228,0 330,0 279,94 167,76"
          fill="#FFFFFF"
          fillOpacity="0.11"
        />
        <polygon
          points="330,0 400,0 400,81 279,94"
          fill="#000000"
          fillOpacity="0.08"
        />
        <polygon
          points="0,109 65,82 130,190 0,190"
          fill="#000000"
          fillOpacity="0.05"
        />
        <polygon
          points="65,82 167,76 220,190 130,190"
          fill="#FFFFFF"
          fillOpacity="0.07"
        />
        <polygon
          points="167,76 279,94 322,190 220,190"
          fill="#000000"
          fillOpacity="0.09"
        />
        <polygon
          points="279,94 400,81 400,190 322,190"
          fill="#FFFFFF"
          fillOpacity="0.08"
        />
      </svg>

      <button
        type="button"
        className="elo-page-share"
        onClick={onShare}
        aria-label="Share Page"
      >
        <Share2 size={21} />
      </button>

      {page.logo_url && (
        <div className="elo-page-logo-outer">
          <div className="elo-page-logo-inner">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={page.logo_url} alt={`${page.name} logo`} />
          </div>
        </div>
      )}

      <div className="elo-page-hero-content">
        <div
          className="elo-page-hero-eyebrow"
          style={{ color: textColour }}
        >
          <span>OFFICIAL ELO PAGE</span>

          {page.is_local_partner === true && (
            <>
              <i
                style={{
                  backgroundColor: textColour,
                }}
              />
              <CheckCircle2 size={14} />
              <span>LOCAL PARTNER</span>
            </>
          )}
        </div>

        <h1
          style={{
            color: textColour,
          }}
        >
          {page.name}
        </h1>
      </div>
    </section>
  );
}

function BrandedCalendar({
  accent,
  posts,
  onOpenPost,
}: {
  accent: string;
  posts: FeedPost[];
  onOpenPost: (id: string) => void;
}) {
  const today = useMemo(() => new Date(), []);
  const [currentDate, setCurrentDate] = useState(
    new Date(today.getFullYear(), today.getMonth(), 1)
  );
  const [selectedDay, setSelectedDay] = useState(today.getDate());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthName = currentDate.toLocaleString("en-GB", {
    month: "long",
  });
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();
  const mondayOffset = firstDay === 0 ? 6 : firstDay - 1;
  const textColour = getReadableTextColour(accent);

  const calendarPosts = useMemo(
    () =>
      posts.filter(
        (post) => post.type === "event" || post.type === "deal"
      ),
    [posts]
  );

  const calendarDays = useMemo(() => {
    const cells: (number | null)[] = [];

    for (let index = 0; index < mondayOffset; index += 1) {
      cells.push(null);
    }

    for (let day = 1; day <= daysInMonth; day += 1) {
      cells.push(day);
    }

    while (cells.length % 7 !== 0) {
      cells.push(null);
    }

    return cells;
  }, [daysInMonth, mondayOffset]);

  function dateString(day: number) {
    return `${year}-${String(month + 1).padStart(2, "0")}-${String(
      day
    ).padStart(2, "0")}`;
  }

  function isPast(day: number) {
    const date = new Date(year, month, day);
    const startToday = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate()
    );

    return date < startToday;
  }

  function isToday(day: number) {
    return (
      day === today.getDate() &&
      month === today.getMonth() &&
      year === today.getFullYear()
    );
  }

  function postsForDay(day: number) {
    if (isPast(day)) {
      return [];
    }

    const target = dateString(day);

    return calendarPosts.filter((post) =>
      datesForPost(post).includes(target)
    );
  }

  function canGoPrevious() {
    const displayed = new Date(year, month, 1);
    const current = new Date(
      today.getFullYear(),
      today.getMonth(),
      1
    );

    return displayed > current;
  }

  function previousMonth() {
    if (!canGoPrevious()) {
      return;
    }

    const previous = new Date(year, month - 1, 1);
    setCurrentDate(previous);

    if (
      previous.getFullYear() === today.getFullYear() &&
      previous.getMonth() === today.getMonth()
    ) {
      setSelectedDay(today.getDate());
    } else {
      setSelectedDay(1);
    }
  }

  function nextMonth() {
    setCurrentDate(new Date(year, month + 1, 1));
    setSelectedDay(1);
  }

  const selectedPosts = postsForDay(selectedDay);
  const previousAvailable = canGoPrevious();

  return (
    <section className="elo-page-calendar-section">
      <div
        className="elo-page-calendar-brand"
        style={{
          backgroundColor: accent,
          color: textColour,
        }}
      >
        <div>
          <span>LOCAL PARTNER</span>
          <strong>Calendar</strong>
        </div>

        <CalendarDays size={25} />
      </div>

      <div className="elo-page-calendar-card">
        <div className="elo-page-month-header">
          <button
            type="button"
            className="elo-page-calendar-arrow"
            disabled={!previousAvailable}
            onClick={previousMonth}
            aria-label="Previous month"
          >
            <ChevronLeft size={21} />
          </button>

          <div className="elo-page-month-centre">
            <strong>{monthName}</strong>
            <span>{year}</span>
          </div>

          <button
            type="button"
            className="elo-page-calendar-arrow"
            onClick={nextMonth}
            aria-label="Next month"
          >
            <ChevronRight size={21} />
          </button>
        </div>

        <div className="elo-page-week-row">
          {DAYS.map((day, index) => (
            <span key={`${day}-${index}`}>{day}</span>
          ))}
        </div>

        <div className="elo-page-calendar-grid">
          {calendarDays.map((day, index) => {
            if (!day) {
              return (
                <span
                  key={`empty-${index}`}
                  className="elo-page-day elo-page-empty-day"
                />
              );
            }

            const past = isPast(day);
            const dayPosts = postsForDay(day);
            const hasEvent = dayPosts.some(
              (post) => post.type === "event"
            );
            const hasDeal = dayPosts.some(
              (post) => post.type === "deal"
            );
            const selected = selectedDay === day && !past;
            const todayCell = isToday(day);

            return (
              <button
                type="button"
                key={day}
                className={`elo-page-day ${
                  past ? "is-past" : ""
                } ${todayCell && !selected ? "is-today" : ""}`}
                disabled={past}
                onClick={() => setSelectedDay(day)}
                style={
                  selected
                    ? {
                        backgroundColor: accent,
                        color: textColour,
                      }
                    : todayCell
                      ? {
                          color: accent,
                        }
                      : undefined
                }
              >
                <strong>{day}</strong>

                {!past && (
                  <span className="elo-page-dots">
                    {hasEvent && (
                      <i
                        style={{
                          backgroundColor: selected
                            ? textColour
                            : accent,
                        }}
                      />
                    )}

                    {hasDeal && (
                      <i
                        style={{
                          backgroundColor: selected
                            ? textColour
                            : "#E49B28",
                        }}
                      />
                    )}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="elo-page-selected-header">
        <div>
          <span>{isToday(selectedDay) ? "TODAY" : "SELECTED DATE"}</span>
          <strong>
            {selectedDay} {monthName}
          </strong>
        </div>

        <em
          style={{
            backgroundColor: hexToRgba(accent, 0.08),
            color: accent,
          }}
        >
          {selectedPosts.length} {selectedPosts.length === 1 ? "post" : "posts"}
        </em>
      </div>

      {selectedPosts.length === 0 ? (
        <div className="elo-page-calendar-empty">
          <CalendarDays size={26} color={accent} />
          <strong>Nothing here yet</strong>
          <span>Events and Deals on this date will appear here.</span>
        </div>
      ) : (
        <div className="elo-page-calendar-post-list">
          {selectedPosts.map((post) => {
            const isDeal = post.type === "deal";

            return (
              <button
                key={post.id}
                type="button"
                className="elo-page-calendar-post"
                onClick={() => onOpenPost(post.id)}
              >
                <span
                  className="elo-page-calendar-post-icon"
                  style={{
                    backgroundColor: isDeal
                      ? "#FFF3DF"
                      : hexToRgba(accent, 0.08),
                    color: isDeal ? "#965A00" : accent,
                  }}
                >
                  {isDeal ? <Gift size={20} /> : <CalendarDays size={20} />}
                </span>

                <span className="elo-page-calendar-post-copy">
                  <small
                    style={{
                      color: isDeal ? "#965A00" : accent,
                    }}
                  >
                    {isDeal ? "DEAL" : "EVENT"}
                  </small>
                  <strong>{post.title}</strong>
                </span>

                <ChevronRight size={18} color="#98A19E" />
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}

function BrandedMenu({
  accent,
  title,
  items,
}: {
  accent: string;
  title: string;
  items: PartnerMenuItem[];
}) {
  const textColour = getReadableTextColour(accent);

  if (items.length === 0) {
    return null;
  }

  return (
    <section className="elo-page-menu-section">
      <div
        className="elo-page-menu-header"
        style={{
          backgroundColor: accent,
          color: textColour,
        }}
      >
        <div>
          <span>LOCAL PARTNER</span>
          <strong>{title}</strong>
        </div>

        <List size={25} />
      </div>

      <div className="elo-page-menu-body">
        {items.map((item, index) => {
          const Icon = MENU_ICONS[item.icon] ?? BriefcaseBusiness;

          return (
            <div
              key={item.id}
              className={`elo-page-menu-row ${
                index === items.length - 1 ? "is-last" : ""
              }`}
            >
              <span
                className="elo-page-menu-icon"
                style={{
                  backgroundColor: hexToRgba(accent, 0.08),
                  color: accent,
                }}
              >
                <Icon size={21} />
              </span>

              <span className="elo-page-menu-copy">
                <strong>{item.title}</strong>
                {item.description && <small>{item.description}</small>}
              </span>

              {item.price && (
                <em style={{ color: accent }}>{item.price}</em>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default function PageViewPage() {
  const params = useParams<{ slug?: string | string[] }>();
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const rawSlug = params?.slug;
  const pageKey = Array.isArray(rawSlug) ? rawSlug[0] : rawSlug;

  const [page, setPage] = useState<ELOPage | null>(null);
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [galleryIndex, setGalleryIndex] = useState<number | null>(null);
  const [shareNotice, setShareNotice] = useState(false);

  const loadPage = useCallback(async () => {
    if (!pageKey) {
      setPage(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setLoadError(null);

    try {
      const pageSelect = `
        id,
        name,
        slug,
        description,
        logo_url,
        brand_color,
        website,
        layout,
        showcase_images,
        is_local_partner,
        status,
        is_public
      `;

      let pageResult = await supabase
        .from("groups")
        .select(pageSelect)
        .eq("slug", pageKey)
        .maybeSingle();

      if (!pageResult.data && !pageResult.error && isUuid(pageKey)) {
        pageResult = await supabase
          .from("groups")
          .select(pageSelect)
          .eq("id", pageKey)
          .maybeSingle();
      }

      if (pageResult.error) {
        throw pageResult.error;
      }

      const loadedPage = pageResult.data as ELOPage | null;

      if (!loadedPage) {
        setPage(null);
        return;
      }

      const status = loadedPage.status?.trim().toLowerCase();

      if (status !== "approved" || loadedPage.is_public === false) {
        setPage(null);
        return;
      }

      const hidePlaces =
        loadedPage.slug?.trim().toLowerCase() === "east-lothian-online" ||
        loadedPage.name.trim().toLowerCase() === "east lothian online";

      const [rawPosts, rawPlaces] = await Promise.all([
        fetchAllRows((from, to) =>
          supabase
            .from("posts")
            .select(`
              id,
              group_id,
              title,
              content,
              image_url,
              created_at,
              type,
              expires_at,
              event_start,
              event_end,
              deal_price,
              metadata
            `)
            .eq("group_id", loadedPage.id)
            .order("created_at", { ascending: false })
            .order("id", { ascending: true })
            .range(from, to)
        ),
        hidePlaces
          ? Promise.resolve([] as unknown[])
          : fetchAllRows((from, to) =>
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
                  slug,
                  images,
                  is_active,
                  opening_hours,
                  is_24_7,
                  metadata
                `)
                .eq("page_id", loadedPage.id)
                .order("title", { ascending: true })
                .order("id", { ascending: true })
                .range(from, to)
            ),
      ]);

      const pageAccent = normaliseHex(loadedPage.brand_color);
      const groupInfo: GroupInfo = {
        id: loadedPage.id,
        name: loadedPage.name,
        is_local_partner: loadedPage.is_local_partner === true,
        brand_color: pageAccent,
      };

      const typedPosts = rawPosts as FeedPost[];
      const typedPlaces = rawPlaces as Place[];

      const enrichedPosts = typedPosts
        .map(
          (item): FeedPost => ({
            ...item,
            group: groupInfo,
          })
        )
        .filter(isPostActive)
        .filter((item) => item.type !== "alert");

      const enrichedPlaces = typedPlaces.map(
        (item): Place => ({
          ...item,
          group: groupInfo,
        })
      );

      setPage(loadedPage);
      setPosts(enrichedPosts);
      setPlaces(enrichedPlaces);
    } catch (error) {
      console.error("Page load error:", error);
      setPage(null);
      setLoadError(
        error instanceof Error
          ? error.message
          : "This Page could not be loaded."
      );
    } finally {
      setLoading(false);
    }
  }, [pageKey, supabase]);

  useEffect(() => {
    void loadPage();
  }, [loadPage]);

  const accent = useMemo(
    () => normaliseHex(page?.brand_color),
    [page?.brand_color]
  );

  const linkColour = useMemo(
    () => getAccessibleLinkColour(accent),
    [accent]
  );

  const isPartner = page?.is_local_partner === true;
  const partnerFeatures = page?.layout?.partner_features;
  const brandedCalendar =
    isPartner && (partnerFeatures?.branded_calendar ?? true);
  const menuEnabled = isPartner && (partnerFeatures?.menu_enabled ?? true);
  const menuTitle = partnerFeatures?.menu_title?.trim() || "Menu & Services";

  const menuItems = useMemo(
    () => normaliseMenuItems(partnerFeatures?.menu_items),
    [partnerFeatures?.menu_items]
  );

  const website = normaliseWebsite(page?.website);

  const facebook = normaliseSocial(
    page?.layout?.socials?.facebook ?? page?.layout?.facebook,
    "facebook"
  );

  const instagram = normaliseSocial(
    page?.layout?.socials?.instagram ?? page?.layout?.instagram,
    "instagram"
  );

  const photos = useMemo(
    () => normaliseImages(page?.showcase_images, isPartner ? 20 : 3),
    [page?.showcase_images, isPartner]
  );

  async function sharePage() {
    if (!page) {
      return;
    }

    const pageSlug = page.slug?.trim() || page.id;
    const shareUrl = `https://eastlothian.online/pages/${encodeURIComponent(
      pageSlug
    )}`;

    try {
      if (navigator.share) {
        await navigator.share({
          title: `${page.name} on East Lothian Online`,
          text: `${page.name} on East Lothian Online`,
          url: shareUrl,
        });
      } else {
        await navigator.clipboard.writeText(shareUrl);
        setShareNotice(true);
        window.setTimeout(() => setShareNotice(false), 2200);
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }

      console.error("Unable to share Page:", error);
    }
  }

  if (loading) {
    return (
      <div className="elo-page-root">
        <SiteHeader />

        <main className="elo-page-loading">
          <LoaderCircle className="elo-page-spinner" size={31} />
          <span>Loading Page...</span>
        </main>

        <style>{styles}</style>
      </div>
    );
  }

  if (!page || loadError) {
    return (
      <div className="elo-page-root">
        <SiteHeader />

        <main className="elo-page-unavailable">
          <Store size={34} color="#005744" />
          <h1>Page unavailable</h1>
          <p>This ELO Page isn&apos;t available right now.</p>
        </main>

        <style>{styles}</style>
      </div>
    );
  }

  const hasLinks = Boolean(website || instagram || facebook);
  const selectedPhoto = galleryIndex !== null ? photos[galleryIndex] : null;

  return (
    <div className="elo-page-root">
      <SiteHeader />

      <main className="elo-page-main">
        <PageHero
          page={page}
          accent={accent}
          onShare={() => void sharePage()}
        />

        {shareNotice && (
          <div className="elo-page-share-notice">Page link copied.</div>
        )}

        {hasLinks && (
          <nav className="elo-page-links" aria-label={`${page.name} links`}>
            {website && (
              <a
                href={website}
                target="_blank"
                rel="noreferrer"
                style={{ color: linkColour }}
              >
                <Globe2 size={21} />
                <span>Website</span>
              </a>
            )}

            {instagram && (
              <a
                href={instagram}
                target="_blank"
                rel="noreferrer"
                style={{ color: linkColour }}
              >
                <FaInstagram size={20} />
                <span>Instagram</span>
              </a>
            )}

            {facebook && (
              <a
                href={facebook}
                target="_blank"
                rel="noreferrer"
                style={{ color: linkColour }}
              >
                <FaFacebook size={20} />
                <span>Facebook</span>
              </a>
            )}
          </nav>
        )}

        {page.description && (
          <section className="elo-page-section elo-page-about">
            <span className="elo-page-section-label">ABOUT</span>
            <p>{page.description}</p>
          </section>
        )}

        {brandedCalendar && (
          <BrandedCalendar
            accent={accent}
            posts={posts}
            onOpenPost={(postId) =>
              router.push(`/posts/${encodeURIComponent(postId)}`)
            }
          />
        )}

        {menuEnabled && menuItems.length > 0 && (
          <BrandedMenu
            accent={accent}
            title={menuTitle}
            items={menuItems}
          />
        )}

        {photos.length > 0 && (
          <section className="elo-page-section elo-page-gallery-section">
            <div className="elo-page-section-heading">
              <div>
                {isPartner && (
                  <span
                    className="elo-page-gallery-partner"
                    style={{ color: accent }}
                  >
                    LOCAL PARTNER
                  </span>
                )}

                <h2>{isPartner ? "Gallery" : "Photos"}</h2>
              </div>

              <span>{photos.length}</span>
            </div>

            <div
              className="elo-page-gallery-grid"
              style={{
                gridTemplateColumns: `repeat(${GALLERY_COLUMNS}, minmax(0, 1fr))`,
                gap: GALLERY_GAP,
              }}
            >
              {photos.map((url, index) => (
                <button
                  key={`${url}-${index}`}
                  type="button"
                  className="elo-page-gallery-thumb"
                  onClick={() => setGalleryIndex(index)}
                  style={
                    isPartner
                      ? {
                          borderColor: accent,
                          borderWidth: 2,
                        }
                      : undefined
                  }
                  aria-label={`Open image ${index + 1}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="" />
                </button>
              ))}
            </div>

            <span className="elo-page-gallery-hint">
              Tap an image to open it.
            </span>
          </section>
        )}

        {places.length > 0 && (
          <section className="elo-page-feed-section">
            <div className="elo-page-feed-heading">
              <h2>Our places</h2>
              <span>{places.length}</span>
            </div>

            <div className="elo-page-card-list">
              {places.map((place) => (
                <WebPlaceCard key={place.id} place={place} />
              ))}
            </div>
          </section>
        )}

        <section className="elo-page-feed-section">
          <div className="elo-page-latest-heading">
            <span>LATEST</span>
            <h2>From {page.name}</h2>
          </div>

          {posts.length === 0 ? (
            <div className="elo-page-empty-posts">
              <Newspaper size={27} color="#84908C" />
              <strong>Nothing new right now</strong>
              <span>Check back soon for updates from {page.name}.</span>
            </div>
          ) : (
            <div className="elo-page-card-list">
              {posts.map((post) => (
                <WebFeedPostCard
                  key={post.id}
                  post={post}
                  accent={accent}
                />
              ))}
            </div>
          )}
        </section>

        <div className="elo-page-official-footer">
          <ShieldCheck size={19} />
          <span>
            This is the official {page.name} Page on East Lothian Online.
          </span>
        </div>
      </main>

      {galleryIndex !== null && selectedPhoto && (
        <div
          className="elo-page-gallery-modal"
          role="dialog"
          aria-modal="true"
          aria-label="Image gallery"
          onMouseDown={(event) => {
            if (event.currentTarget === event.target) {
              setGalleryIndex(null);
            }
          }}
        >
          <button
            type="button"
            className="elo-page-gallery-close"
            onClick={() => setGalleryIndex(null)}
            aria-label="Close gallery"
          >
            <X size={26} />
          </button>

          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="elo-page-gallery-full"
            src={selectedPhoto}
            alt=""
          />

          <div className="elo-page-gallery-controls">
            <button
              type="button"
              disabled={galleryIndex === 0}
              onClick={() =>
                setGalleryIndex((current) =>
                  current === null ? null : Math.max(0, current - 1)
                )
              }
              aria-label="Previous image"
            >
              <ChevronLeft size={24} />
            </button>

            <span>
              {galleryIndex + 1} / {photos.length}
            </span>

            <button
              type="button"
              disabled={galleryIndex === photos.length - 1}
              onClick={() =>
                setGalleryIndex((current) =>
                  current === null
                    ? null
                    : Math.min(photos.length - 1, current + 1)
                )
              }
              aria-label="Next image"
            >
              <ChevronRight size={24} />
            </button>
          </div>
        </div>
      )}

      <WebFeedStyles />
      <style>{styles}</style>
    </div>
  );
}

const styles = `
  .elo-page-root {
    min-height: 100dvh;
    background: #F4F5F4;
    color: #14221E;
    font-family: var(--font-geist-sans), Arial, sans-serif;
  }

  .elo-page-root *,
  .elo-page-root *::before,
  .elo-page-root *::after {
    box-sizing: border-box;
  }

  .elo-page-root button,
  .elo-page-root input,
  .elo-page-root textarea {
    font: inherit;
  }

  .elo-page-main {
    width: 100%;
    max-width: 760px;
    margin: 0 auto;
    padding-bottom: 130px;
  }

  .elo-page-loading,
  .elo-page-unavailable {
    width: 100%;
    max-width: 760px;
    min-height: 62vh;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 30px;
    text-align: center;
  }

  .elo-page-loading {
    gap: 11px;
    color: #68736F;
    font-size: 13px;
    font-weight: 700;
  }

  .elo-page-spinner {
    color: #005744;
    animation: elo-page-spin .8s linear infinite;
  }

  .elo-page-unavailable h1 {
    margin: 12px 0 0;
    color: #14221E;
    font-size: 20px;
    font-weight: 900;
  }

  .elo-page-unavailable p {
    margin: 5px 0 0;
    color: #78827E;
    font-size: 13px;
    line-height: 20px;
  }

  .elo-page-hero {
    position: relative;
    min-height: 190px;
    overflow: hidden;
    display: flex;
    align-items: flex-end;
  }

  .elo-page-hero-shards {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
  }

  .elo-page-share {
    position: absolute;
    z-index: 5;
    top: 16px;
    left: 16px;
    width: 44px;
    height: 44px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1px solid rgba(0,0,0,.08);
    border-radius: 50%;
    background: rgba(255,255,255,.95);
    color: #173C33;
    cursor: pointer;
    box-shadow: 0 2px 7px rgba(0,0,0,.08);
  }

  .elo-page-logo-outer {
    position: absolute;
    z-index: 5;
    top: 14px;
    right: 16px;
    width: 68px;
    height: 68px;
    padding: 4px;
    border-radius: 50%;
    background: #FFFFFF;
    box-shadow: 0 2px 8px rgba(0,0,0,.14);
  }

  .elo-page-logo-inner {
    width: 100%;
    height: 100%;
    overflow: hidden;
    border-radius: 50%;
    background: #FFFFFF;
  }

  .elo-page-logo-inner img {
    width: 100%;
    height: 100%;
    display: block;
    object-fit: contain;
  }

  .elo-page-hero-content {
    position: relative;
    z-index: 2;
    width: 100%;
    padding: 92px 18px 23px;
  }

  .elo-page-hero-eyebrow {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 5px;
    margin-bottom: 8px;
    font-size: 8px;
    font-weight: 900;
    letter-spacing: 1.1px;
    opacity: .76;
  }

  .elo-page-hero-eyebrow i {
    width: 3px;
    height: 3px;
    margin: 0 2px;
    border-radius: 50%;
    opacity: .55;
  }

  .elo-page-hero-content h1 {
    max-width: calc(100% - 70px);
    margin: 0;
    font-size: 30px;
    line-height: 34px;
    font-weight: 900;
    letter-spacing: -.7px;
    overflow-wrap: anywhere;
  }

  .elo-page-share-notice {
    margin: 10px 16px 0;
    padding: 9px 12px;
    border-radius: 12px;
    background: #E7F2EE;
    color: #005744;
    font-size: 11px;
    font-weight: 800;
    text-align: center;
  }

  .elo-page-links {
    min-height: 55px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-wrap: wrap;
    padding: 0 10px;
    border-bottom: 1px solid #D9DFDC;
  }

  .elo-page-links a {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 15px 12px;
    text-decoration: none;
    font-size: 11px;
    font-weight: 800;
  }

  .elo-page-section {
    padding: 24px 18px;
    border-bottom: 1px solid #D9DFDC;
  }

  .elo-page-section-label {
    display: block;
    margin-bottom: 9px;
    color: #78827E;
    font-size: 8px;
    font-weight: 900;
    letter-spacing: 1.2px;
  }

  .elo-page-about p {
    margin: 0;
    color: #35423E;
    font-size: 15px;
    line-height: 23px;
    white-space: pre-wrap;
  }

  .elo-page-calendar-section {
    margin: 22px 16px 0;
  }

  .elo-page-calendar-brand {
    min-height: 76px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 16px;
    border-radius: 20px 20px 0 0;
  }

  .elo-page-calendar-brand span,
  .elo-page-menu-header span {
    display: block;
    font-size: 8px;
    font-weight: 900;
    letter-spacing: 1.1px;
    opacity: .74;
  }

  .elo-page-calendar-brand strong,
  .elo-page-menu-header strong {
    display: block;
    margin-top: 2px;
    font-size: 22px;
    line-height: 26px;
    font-weight: 900;
  }

  .elo-page-calendar-card {
    padding: 16px;
    border: 1px solid #E4E4E4;
    border-top: 0;
    border-radius: 0 0 20px 20px;
    background: #FFFFFF;
  }

  .elo-page-month-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 18px;
  }

  .elo-page-calendar-arrow {
    width: 42px;
    height: 42px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 0;
    border-radius: 12px;
    background: #F4F5F4;
    color: #111111;
    cursor: pointer;
  }

  .elo-page-calendar-arrow:disabled {
    opacity: .5;
    color: #C5C5C5;
    cursor: default;
  }

  .elo-page-month-centre {
    text-align: center;
  }

  .elo-page-month-centre strong {
    display: block;
    color: #111111;
    font-size: 20px;
    font-weight: 800;
  }

  .elo-page-month-centre span {
    display: block;
    margin-top: 2px;
    color: #858585;
    font-size: 12px;
    font-weight: 600;
  }

  .elo-page-week-row {
    display: grid;
    grid-template-columns: repeat(7, minmax(0, 1fr));
    margin-bottom: 7px;
  }

  .elo-page-week-row span {
    text-align: center;
    color: #909090;
    font-size: 11px;
    font-weight: 800;
  }

  .elo-page-calendar-grid {
    display: grid;
    grid-template-columns: repeat(7, minmax(0, 1fr));
    border-top: 1px solid #E5E5E5;
    border-left: 1px solid #E5E5E5;
  }

  .elo-page-day {
    position: relative;
    min-width: 0;
    height: 52px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    border: 0;
    border-right: 1px solid #E5E5E5;
    border-bottom: 1px solid #E5E5E5;
    background: #FFFFFF;
    color: #222222;
    cursor: pointer;
  }

  .elo-page-empty-day {
    background: #FAFAFA;
  }

  .elo-page-day.is-past {
    color: #D0D0D0;
    cursor: default;
  }

  .elo-page-day.is-today {
    background: #E8F4F0;
    font-weight: 900;
  }

  .elo-page-day strong {
    font-size: 14px;
    font-weight: 700;
  }

  .elo-page-dots {
    display: flex;
    gap: 3px;
    height: 4px;
    margin-top: 4px;
  }

  .elo-page-dots i {
    width: 4px;
    height: 4px;
    border-radius: 50%;
  }

  .elo-page-selected-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin: 18px 0 10px;
  }

  .elo-page-selected-header > div span {
    display: block;
    color: #999999;
    font-size: 9px;
    font-weight: 800;
    letter-spacing: 1px;
  }

  .elo-page-selected-header > div strong {
    display: block;
    margin-top: 3px;
    color: #111111;
    font-size: 19px;
    font-weight: 800;
  }

  .elo-page-selected-header em {
    flex: 0 0 auto;
    padding: 7px 10px;
    border-radius: 10px;
    font-size: 11px;
    font-style: normal;
    font-weight: 800;
  }

  .elo-page-calendar-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 22px;
    border: 1px solid #E7E7E7;
    border-radius: 17px;
    background: #FFFFFF;
    text-align: center;
  }

  .elo-page-calendar-empty strong {
    margin-top: 9px;
    color: #111111;
    font-size: 15px;
    font-weight: 800;
  }

  .elo-page-calendar-empty span {
    margin-top: 5px;
    color: #777777;
    font-size: 11px;
    line-height: 17px;
  }

  .elo-page-calendar-post-list {
    display: grid;
    gap: 9px;
  }

  .elo-page-calendar-post {
    width: 100%;
    min-height: 72px;
    display: flex;
    align-items: center;
    padding: 11px;
    border: 1px solid #E5E5E5;
    border-radius: 16px;
    background: #FFFFFF;
    color: inherit;
    text-align: left;
    cursor: pointer;
  }

  .elo-page-calendar-post-icon {
    width: 44px;
    height: 44px;
    flex: 0 0 44px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 13px;
  }

  .elo-page-calendar-post-copy {
    min-width: 0;
    flex: 1;
    margin: 0 11px;
  }

  .elo-page-calendar-post-copy small {
    display: block;
    margin-bottom: 3px;
    font-size: 8px;
    font-weight: 900;
    letter-spacing: .9px;
  }

  .elo-page-calendar-post-copy strong {
    display: block;
    color: #18231F;
    font-size: 13px;
    line-height: 17px;
    font-weight: 900;
  }

  .elo-page-menu-section {
    margin: 22px 16px 0;
    overflow: hidden;
    border: 1px solid #E1E6E4;
    border-radius: 20px;
    background: #FFFFFF;
  }

  .elo-page-menu-header {
    min-height: 82px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 16px;
  }

  .elo-page-menu-body {
    padding: 0 15px;
  }

  .elo-page-menu-row {
    min-height: 72px;
    display: flex;
    align-items: center;
    gap: 11px;
    padding: 14px 0;
    border-bottom: 1px solid #E2E6E4;
  }

  .elo-page-menu-row.is-last {
    border-bottom: 0;
  }

  .elo-page-menu-icon {
    width: 44px;
    height: 44px;
    flex: 0 0 44px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 13px;
  }

  .elo-page-menu-copy {
    min-width: 0;
    flex: 1;
  }

  .elo-page-menu-copy strong {
    display: block;
    color: #16221E;
    font-size: 14px;
    font-weight: 900;
  }

  .elo-page-menu-copy small {
    display: block;
    margin-top: 4px;
    color: #74807C;
    font-size: 11px;
    line-height: 16px;
    font-weight: 600;
  }

  .elo-page-menu-row em {
    max-width: 100px;
    flex: 0 0 auto;
    text-align: right;
    font-size: 13px;
    font-style: normal;
    font-weight: 900;
  }

  .elo-page-section-heading,
  .elo-page-feed-heading {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 14px;
  }

  .elo-page-section-heading h2,
  .elo-page-feed-heading h2 {
    margin: 0;
    color: #14221E;
    font-size: 20px;
    font-weight: 900;
    letter-spacing: -.35px;
  }

  .elo-page-section-heading > span,
  .elo-page-feed-heading > span {
    color: #84908C;
    font-size: 11px;
    font-weight: 800;
  }

  .elo-page-gallery-partner {
    display: block;
    margin-bottom: 3px;
    font-size: 8px;
    font-weight: 900;
    letter-spacing: 1.1px;
  }

  .elo-page-gallery-grid {
    display: grid;
  }

  .elo-page-gallery-thumb {
    width: 100%;
    aspect-ratio: 1 / 1;
    overflow: hidden;
    padding: 0;
    border: 1px solid #E2E6E4;
    border-radius: 13px;
    background: #E2E6E4;
    cursor: pointer;
  }

  .elo-page-gallery-thumb img {
    width: 100%;
    height: 100%;
    display: block;
    object-fit: cover;
  }

  .elo-page-gallery-hint {
    display: block;
    margin-top: 9px;
    color: #8A9490;
    font-size: 9px;
    font-weight: 700;
  }

  .elo-page-feed-section {
    padding: 24px 16px 0;
  }

  .elo-page-card-list {
    display: grid;
    gap: 0;
  }

  .elo-page-latest-heading {
    margin: 0 2px 15px;
  }

  .elo-page-latest-heading > span {
    display: block;
    margin-bottom: 4px;
    color: #78827E;
    font-size: 8px;
    font-weight: 900;
    letter-spacing: 1.2px;
  }

  .elo-page-latest-heading h2 {
    margin: 0;
    color: #14221E;
    font-size: 22px;
    line-height: 27px;
    font-weight: 900;
    letter-spacing: -.4px;
  }

  .elo-page-empty-posts {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 38px 22px;
    margin-bottom: 18px;
    text-align: center;
  }

  .elo-page-empty-posts strong {
    margin-top: 10px;
    color: #263833;
    font-size: 16px;
    font-weight: 900;
  }

  .elo-page-empty-posts span {
    margin-top: 5px;
    color: #78827E;
    font-size: 12px;
    line-height: 19px;
  }

  .elo-page-official-footer {
    display: flex;
    align-items: flex-start;
    gap: 9px;
    margin: 15px 18px 0;
    padding-top: 18px;
    border-top: 1px solid #D9DFDC;
    color: #68736F;
  }

  .elo-page-official-footer svg {
    flex: 0 0 auto;
  }

  .elo-page-official-footer span {
    flex: 1;
    font-size: 11px;
    line-height: 17px;
    font-weight: 600;
  }

  .elo-page-gallery-modal {
    position: fixed;
    z-index: 2000;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0,0,0,.96);
  }

  .elo-page-gallery-close {
    position: absolute;
    z-index: 2;
    top: max(18px, env(safe-area-inset-top));
    right: 18px;
    width: 44px;
    height: 44px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 0;
    border-radius: 50%;
    background: rgba(255,255,255,.12);
    color: #FFFFFF;
    cursor: pointer;
  }

  .elo-page-gallery-full {
    width: 100%;
    height: 76vh;
    display: block;
    object-fit: contain;
  }

  .elo-page-gallery-controls {
    position: absolute;
    left: 24px;
    right: 24px;
    bottom: max(30px, env(safe-area-inset-bottom));
    display: flex;
    align-items: center;
    justify-content: space-between;
    color: #FFFFFF;
  }

  .elo-page-gallery-controls button {
    width: 46px;
    height: 46px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 0;
    border-radius: 50%;
    background: rgba(255,255,255,.13);
    color: #FFFFFF;
    cursor: pointer;
  }

  .elo-page-gallery-controls button:disabled {
    opacity: .25;
    cursor: default;
  }

  .elo-page-gallery-controls span {
    font-size: 12px;
    font-weight: 900;
  }

  @keyframes elo-page-spin {
    to {
      transform: rotate(360deg);
    }
  }

  @media (min-width: 761px) {
    .elo-page-main {
      border-left: 1px solid #E1E5E3;
      border-right: 1px solid #E1E5E3;
    }
  }

  @media (max-width: 480px) {
    .elo-page-hero-content h1 {
      font-size: 28px;
      line-height: 32px;
    }

    .elo-page-calendar-card {
      padding: 12px;
    }

    .elo-page-day {
      height: 48px;
    }

    .elo-page-links a {
      padding-left: 9px;
      padding-right: 9px;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .elo-page-spinner {
      animation: none;
    }
  }
`;

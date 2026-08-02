import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  CalendarDays,
  Clock3,
  MapPin,
  Navigation,
  Tag,
} from "lucide-react";

import Footer from "@/components/Footer";
import SiteHeader from "@/components/SiteHeader";
import { createClient } from "@/lib/supabase/client";

export const dynamic = "force-dynamic";

function formatDate(value?: string | null) {
  if (!value) return "";

  return new Date(value).toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function getTypeLabel(type?: string, publicType?: string | null) {
  if (publicType === "popup") return "Pop-Up";
  if (publicType === "update") return "Update";
  if (publicType === "alert") return "Alert";
  if (publicType === "deal" || type === "deal") return "Deal";
  if (publicType === "event" || type === "event") return "Event";
  if (type === "alert") return "Alert";
  return "Post";
}

function formatTime(value?: string | null) {
  if (!value) return "";
  const [hours, minutes] = value.split(":");
  const date = new Date();
  date.setHours(Number(hours), Number(minutes), 0, 0);
  return date.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getDealDisplay(metadata: any) {
  switch (metadata?.deal_kind) {
    case "price":
      return typeof metadata.deal_price === "number"
        ? `£${Number.isInteger(metadata.deal_price) ? metadata.deal_price : metadata.deal_price.toFixed(2)}`
        : "Deal";
    case "percent":
      return typeof metadata.discount_percent === "number"
        ? `${metadata.discount_percent}% OFF`
        : "Discount";
    case "multibuy":
    case "buy_x_get_y":
      return typeof metadata.buy_quantity === "number" &&
        typeof metadata.pay_quantity === "number"
        ? `${metadata.buy_quantity} FOR ${metadata.pay_quantity}`
        : "Multi-buy";
    case "free":
      return "FREE";
    default:
      return "SPECIAL DEAL";
  }
}

function safeBrandColor(value?: string | null) {
  if (!value) return "#047857";
  if (/^#[0-9A-Fa-f]{6}$/.test(value)) return value;

  return "#047857";
}

function getSafeHref(value: string) {
  if (value.startsWith("http://") || value.startsWith("https://")) {
    return value;
  }

  return `https://${value}`;
}

function stripTrailingPunctuation(value: string) {
  return value.replace(/[),.!?:;]+$/, "");
}

function getUpcomingPostDate(post: any, today: Date) {
  const activeDates = Array.isArray(post.metadata?.active_dates)
    ? post.metadata.active_dates
        .filter((date: unknown): date is string => typeof date === "string")
        .sort(
          (a: string, b: string) =>
            new Date(a).getTime() - new Date(b).getTime(),
        )
    : [];

  const possibleDates =
    activeDates.length > 0
      ? activeDates
      : post.event_start
        ? [post.event_start]
        : [];

  return possibleDates.find((date: string) => {
    const eventDate = new Date(date);
    eventDate.setHours(0, 0, 0, 0);

    return eventDate.getTime() >= today.getTime();
  });
}

function renderContentWithLinks(content: string) {
  const urlRegex =
    /(https?:\/\/[^\s]+|www\.[^\s]+|[a-zA-Z0-9-]+\.[a-zA-Z]{2,}[^\s]*)/g;

  return content.split(urlRegex).map((part, index) => {
    if (!part) return null;

    const cleanValue = stripTrailingPunctuation(part);
    const trailingCharacters = part.slice(cleanValue.length);

    const isLink =
      cleanValue.startsWith("http://") ||
      cleanValue.startsWith("https://") ||
      cleanValue.startsWith("www.") ||
      /^[a-zA-Z0-9-]+\.[a-zA-Z]{2,}/.test(cleanValue);

    if (!isLink) {
      return <span key={`${part}-${index}`}>{part}</span>;
    }

    return (
      <span key={`${part}-${index}`}>
        <a
          href={getSafeHref(cleanValue)}
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-emerald-700 underline decoration-emerald-300 decoration-2 underline-offset-4 transition hover:text-emerald-900"
        >
          {cleanValue}
        </a>

        {trailingCharacters}
      </span>
    );
  });
}

type PostPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function PostPage({ params }: PostPageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: post, error } = await supabase
    .from("posts")
    .select(
      `
        *,
        groups(
          name,
          slug,
          brand_color
        )
      `,
    )
    .eq("id", id)
    .maybeSingle();

  if (error || !post) {
    notFound();
  }

  const pageName = post.groups?.name ?? "Atlas";
  const pageHref = post.groups?.slug ? `/pages/${post.groups.slug}` : "/";
  const brandColor = safeBrandColor(post.groups?.brand_color);
  const publicType = post.metadata?.public_type ?? null;
  const typeLabel = getTypeLabel(post.type, publicType);
  const isDeal = publicType === "deal" || post.type === "deal";
  const isPopup = publicType === "popup";
  const isAlert = publicType === "alert" || post.type === "alert";
  const isUpdate = publicType === "update" && !isAlert;
  const dealDisplay = getDealDisplay(post.metadata);
  const location = post.metadata?.location;
  const popupAddress = post.metadata?.popup_address ?? location ?? "";
  const popupStart = formatTime(post.metadata?.popup_start_time);
  const popupEnd = formatTime(post.metadata?.popup_end_time);
  const popupHours =
    popupStart && popupEnd ? `${popupStart} – ${popupEnd}` : popupStart || popupEnd;
  const endDate = post.expires_at ?? post.event_end;
  const activeDates = Array.isArray(post.metadata?.active_dates)
    ? post.metadata.active_dates
        .filter((date: unknown): date is string => typeof date === "string")
        .sort(
          (a: string, b: string) =>
            new Date(a).getTime() - new Date(b).getTime(),
        )
    : [];

  const eventDates =
    activeDates.length > 0
      ? activeDates
      : post.event_start
        ? [post.event_start]
        : [];

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { data: recommendationCandidates } = await supabase
    .from("posts")
    .select(
      `
        id,
        title,
        content,
        image_url,
        type,
        event_start,
        event_end,
        expires_at,
        metadata,
        groups(
          name,
          brand_color
        )
      `,
    )
    .neq("id", id)
    .eq("type", "event")
    .limit(30);

  const recommendedPosts = (recommendationCandidates ?? [])
    .map((recommendedPost: any) => ({
      ...recommendedPost,
      upcomingDate: getUpcomingPostDate(recommendedPost, today),
    }))
    .filter((recommendedPost: any) => Boolean(recommendedPost.upcomingDate))
    .sort(() => Math.random() - 0.5)
    .slice(0, 3);

  const upcomingDates = eventDates.filter((date: string) => {
    const eventDate = new Date(date);
    eventDate.setHours(0, 0, 0, 0);

    return eventDate.getTime() >= today.getTime();
  });

  const primaryUpcomingDate = upcomingDates[0];
  const additionalUpcomingDates = upcomingDates.slice(1);
  const showAdditionalDates =
    upcomingDates.length > 1 && additionalUpcomingDates.length > 0;

  return (
    <div className="min-h-screen bg-white text-slate-950">
      <SiteHeader />

      <main>
        <section
          className="border-b border-slate-200"
          style={{
            background: `linear-gradient(180deg, ${brandColor}12 0%, #ffffff 100%)`,
          }}
        >
          <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 transition hover:text-slate-950"
            >
              <ArrowLeft size={17} />
              Back home
            </Link>

            <div className="mt-8 max-w-4xl">
              <div className="flex flex-wrap items-center gap-3">
                <Link
                  href={pageHref}
                  className="inline-flex items-center rounded-lg px-3 py-1.5 text-sm font-semibold text-white transition hover:opacity-90"
                  style={{ backgroundColor: brandColor }}
                >
                  {pageName}
                </Link>

                <span className="inline-flex items-center rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700">
                  {typeLabel}
                </span>
              </div>

              <h1 className="mt-6 max-w-4xl text-4xl font-black leading-[1.04] tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
                {post.title}
              </h1>

              {post.content && (
                <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-600">
                  Posted by{" "}
                  <Link
                    href={pageHref}
                    className="font-semibold text-slate-700 underline decoration-slate-300 underline-offset-4 transition hover:text-emerald-700"
                  >
                    {pageName}
                  </Link>
                </p>
              )}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
          <article className="min-w-0">
            {(eventDates.length > 0 || location || isDeal || isPopup || isAlert || isUpdate) && (
              <div className="mb-8">
                {isDeal ? (
                  <div
                    className="relative overflow-hidden rounded-[2rem] p-6 shadow-xl sm:p-8"
                    style={{ backgroundColor: brandColor, color: "#ffffff" }}
                  >
                    <div className="absolute -left-5 top-1/2 h-10 w-10 -translate-y-1/2 rounded-full bg-white" />
                    <div className="absolute -right-5 top-1/2 h-10 w-10 -translate-y-1/2 rounded-full bg-white" />
                    <div className="relative grid gap-6 sm:grid-cols-[auto_1fr] sm:items-center sm:gap-10">
                      <div className="min-w-[9rem] text-center sm:border-r sm:border-dashed sm:border-white/30 sm:pr-10">
                        <p className="text-xs font-black uppercase tracking-[0.2em] opacity-70">Your deal</p>
                        <p className="mt-3 text-5xl font-black leading-none tracking-[-0.06em] sm:text-6xl">
                          {dealDisplay}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-black uppercase tracking-[0.16em] opacity-65">Available now</p>
                        <p className="mt-2 text-xl font-black leading-7">{post.title}</p>
                        {endDate ? (
                          <p className="mt-3 text-sm font-semibold opacity-70">
                            Available until {formatDate(endDate)}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ) : null}

                {isPopup ? (
                  <div className="overflow-hidden rounded-[2rem] border border-rose-200 bg-gradient-to-br from-rose-50 to-white shadow-sm">
                    <div className="p-6 sm:p-8">
                      <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                        <p className="text-xs font-black uppercase tracking-[0.18em] text-rose-700">Here today</p>
                      </div>
                      <h2 className="mt-3 text-2xl font-black tracking-tight text-slate-950">
                        Find this Pop-Up
                      </h2>
                      <div className="mt-5 grid gap-3 sm:grid-cols-2">
                        <div className="flex items-start gap-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
                          <Clock3 className="mt-0.5 h-6 w-6 shrink-0 text-rose-600" />
                          <div>
                            <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">Today</p>
                            <p className="mt-1 font-black text-slate-950">{popupHours || "Times unavailable"}</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-4 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
                          <MapPin className="mt-0.5 h-6 w-6 shrink-0 text-rose-600" />
                          <div>
                            <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">Location</p>
                            <p className="mt-1 font-black leading-6 text-slate-950">{popupAddress || "Location unavailable"}</p>
                          </div>
                        </div>
                      </div>
                      {popupAddress ? (
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(popupAddress)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-sm font-black text-white transition hover:bg-rose-700"
                        >
                          <Navigation className="h-4 w-4" />
                          Get directions
                        </a>
                      ) : null}
                    </div>
                  </div>
                ) : null}

                {!isDeal && !isPopup ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {post.type === "event" && primaryUpcomingDate ? (
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 sm:col-span-2">
                        <div className="flex items-start gap-4">
                          <CalendarDays size={22} className="mt-0.5 shrink-0" style={{ color: brandColor }} />
                          <div>
                            <p className="text-xs font-bold uppercase tracking-[0.15em] text-slate-400">Event date</p>
                            <p className="mt-2 font-bold leading-6 text-slate-950">{formatDate(primaryUpcomingDate)}</p>
                          </div>
                        </div>
                      </div>
                    ) : null}

                    {location ? (
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                        <div className="flex items-start gap-4">
                          <MapPin size={22} className="mt-0.5 shrink-0" style={{ color: brandColor }} />
                          <div>
                            <p className="text-xs font-bold uppercase tracking-[0.15em] text-slate-400">Location</p>
                            <p className="mt-2 font-bold leading-6 text-slate-950">{location}</p>
                          </div>
                        </div>
                      </div>
                    ) : null}

                    {isAlert ? (
                      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
                        <div className="flex items-start gap-4">
                          <AlertTriangle size={22} className="mt-0.5 shrink-0 text-amber-700" />
                          <div>
                            <p className="text-xs font-bold uppercase tracking-[0.15em] text-amber-700">Important today</p>
                            <p className="mt-2 font-bold leading-6 text-slate-950">
                              {post.expires_at ? `Active until ${formatDate(post.expires_at)}` : "Current alert"}
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            )}

            {post.content && (
              <div className="whitespace-pre-wrap text-lg leading-8 text-slate-700">
                {renderContentWithLinks(post.content)}
              </div>
            )}


            {post.type === "event" && showAdditionalDates && (
              <div className="mt-10 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                <div className="border-b border-slate-200 bg-white px-5 py-4 sm:px-6">
                  <p className="text-lg font-black tracking-tight text-slate-950">
                    Can&apos;t make this one?
                  </p>

                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    This event is also happening on these upcoming dates.
                  </p>
                </div>

                <div className="grid gap-3 p-4 sm:grid-cols-2 sm:p-5">
                  {additionalUpcomingDates.map((date: string) => (
                    <div
                      key={date}
                      className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3"
                    >
                      <CalendarDays
                        size={20}
                        className="shrink-0"
                        style={{ color: brandColor }}
                      />

                      <p className="font-bold leading-6 text-slate-950">
                        {formatDate(date)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {post.image_url && (
              <div className="mt-10 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                <Image
                  src={post.image_url}
                  alt={post.title}
                  width={1400}
                  height={1000}
                  className="h-auto max-h-[720px] w-full object-contain"
                  loading="lazy"
                />
              </div>
            )}

            {recommendedPosts.length > 0 && (
              <section className="mt-12 border-t border-slate-200 pt-10">
                <div>
                  <p className="text-sm font-bold uppercase tracking-[0.15em] text-emerald-700">
                    You may also like this
                  </p>

                  <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
                    More upcoming events & deals
                  </h2>
                </div>

                <div className="mt-6 grid gap-5 md:grid-cols-3">
                  {recommendedPosts.map((recommendedPost: any) => {
                    const recommendedBrandColor = safeBrandColor(
                      recommendedPost.groups?.brand_color,
                    );

                    return (
                      <Link
                        key={recommendedPost.id}
                        href={`/posts/${recommendedPost.id}`}
                        className="group overflow-hidden rounded-2xl border border-slate-200 bg-white transition hover:-translate-y-1 hover:border-slate-300 hover:shadow-lg"
                      >
                        {recommendedPost.image_url && (
                          <div className="relative aspect-[16/10] overflow-hidden bg-slate-100">
                            <Image
                              src={recommendedPost.image_url}
                              alt={recommendedPost.title}
                              fill
                              sizes="(max-width: 768px) 100vw, 33vw"
                              className="object-cover transition duration-300 group-hover:scale-105"
                              loading="lazy"
                            />
                          </div>
                        )}

                        <div className="p-5">
                          <div className="flex items-center gap-2 text-sm font-semibold text-slate-500">
                            <CalendarDays
                              size={17}
                              style={{ color: recommendedBrandColor }}
                            />
                            {formatDate(recommendedPost.upcomingDate)}
                          </div>

                          <h3 className="mt-3 text-lg font-black leading-6 text-slate-950 transition group-hover:text-emerald-700">
                            {recommendedPost.title}
                          </h3>

                          {recommendedPost.groups?.name && (
                            <p className="mt-3 text-sm font-semibold text-slate-500">
                              Posted by {recommendedPost.groups.name}
                            </p>
                          )}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </section>
            )}
          </article>
        </section>
      </main>

      <Footer />
    </div>
  );
}
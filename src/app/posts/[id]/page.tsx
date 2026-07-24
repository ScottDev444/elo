import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  CalendarDays,
  MapPin,
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

function getTypeLabel(type?: string) {
  if (type === "event") return "Event";
  if (type === "deal") return "Deal";
  if (type === "update") return "Alert";

  return "Post";
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
  const pageHref = "/";
  const brandColor = safeBrandColor(post.groups?.brand_color);
  const typeLabel = getTypeLabel(post.type);
  const location = post.metadata?.location;
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
                  Posted by {pageName}
                </p>
              )}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
          <article className="min-w-0">
            {(eventDates.length > 0 ||
              location ||
              post.type === "deal" ||
              post.type === "update") && (
              <div className="mb-8 grid gap-3 sm:grid-cols-2">
                {post.type === "event" && primaryUpcomingDate && (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 sm:col-span-2">
                    <div className="flex items-start gap-4">
                      <CalendarDays
                        size={22}
                        className="mt-0.5 shrink-0"
                        style={{ color: brandColor }}
                      />

                      <div>
                        <p className="text-xs font-bold uppercase tracking-[0.15em] text-slate-400">
                          Event date
                        </p>

                        <p className="mt-2 font-bold leading-6 text-slate-950">
                          {formatDate(primaryUpcomingDate)}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {location && (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                    <div className="flex items-start gap-4">
                      <MapPin
                        size={22}
                        className="mt-0.5 shrink-0"
                        style={{ color: brandColor }}
                      />

                      <div>
                        <p className="text-xs font-bold uppercase tracking-[0.15em] text-slate-400">
                          Location
                        </p>

                        <p className="mt-2 font-bold leading-6 text-slate-950">
                          {location}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {post.type === "deal" && (
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
                    <div className="flex items-start gap-4">
                      <Tag size={22} className="mt-0.5 shrink-0 text-emerald-700" />

                      <div>
                        <p className="text-xs font-bold uppercase tracking-[0.15em] text-emerald-700">
                          Deal
                        </p>

                        <p className="mt-2 font-bold text-slate-950">
                          {endDate
                            ? `Available until ${formatDate(endDate)}`
                            : "Available now"}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {post.type === "update" && (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
                    <div className="flex items-start gap-4">
                      <AlertTriangle
                        size={22}
                        className="mt-0.5 shrink-0 text-amber-700"
                      />

                      <div>
                        <p className="text-xs font-bold uppercase tracking-[0.15em] text-amber-700">
                          Local alert
                        </p>

                        <p className="mt-2 font-bold leading-6 text-slate-950">
                          {post.expires_at
                            ? `Active until ${formatDate(post.expires_at)}`
                            : "Important local update"}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {post.image_url && (
              <div className="mb-8 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                <Image
                  src={post.image_url}
                  alt={post.title}
                  width={1400}
                  height={1000}
                  className="h-auto max-h-[720px] w-full object-contain"
                  priority
                />
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

            {recommendedPosts.length > 0 && (
              <section className="mt-12 border-t border-slate-200 pt-10">
                <div>
                  <p className="text-sm font-bold uppercase tracking-[0.15em] text-emerald-700">
                    You may also like this
                  </p>

                  <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
                    More upcoming events
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
import type React from "react";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import PostCard from "@/components/PostCard";
import EditPageButton from "@/components/EditPageButton";

type DayKey = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

type OpeningHours = Record<
  DayKey,
  {
    closed: boolean;
    open: string;
    close: string;
  }
>;

type CTAButton = {
  label: "Phone" | "Email" | "Website";
  href: string;
};

type ShowcaseImage = {
  url?: string;
};

type ServiceItem = {
  text?: string;
  icon?: string;
};

type Group = {
  id: string;
  user_id?: string | null;
  name: string;
  slug: string;
  description?: string | null;
  logo_url?: string | null;
  brand_color?: string | null;
  page_type?: "business" | "service" | "organisation" | null;
  address?: string | null;
  opening_hours?: OpeningHours | null;
  cta_buttons?: CTAButton[] | null;
  showcase_images?: ShowcaseImage[] | null;
  status?: "draft" | "pending" | "approved" | null;
  services?: ServiceItem[] | null;
  is_public?: boolean | null;
};

type Post = {
  id: string;
  title: string;
  content?: string | null;
  type?: "general" | "deal" | "event" | "photo" | "alert" | null;
  image_url?: string | null;
  metadata?: any;
  created_at?: string;
  group_id?: string;
  event_start?: string | null;
  event_end?: string | null;
  expires_at?: string | null;
};

const days: { key: DayKey; label: string; short: string }[] = [
  { key: "mon", label: "Monday", short: "Mon" },
  { key: "tue", label: "Tuesday", short: "Tue" },
  { key: "wed", label: "Wednesday", short: "Wed" },
  { key: "thu", label: "Thursday", short: "Thu" },
  { key: "fri", label: "Friday", short: "Fri" },
  { key: "sat", label: "Saturday", short: "Sat" },
  { key: "sun", label: "Sunday", short: "Sun" },
];

function safeArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function toDateKey(date: Date) {
  return date.toLocaleDateString("en-CA");
}

function isPostActive(post: Post) {
  const today = toDateKey(new Date());

  if (post.expires_at && post.expires_at.slice(0, 10) < today) return false;

  if (post.type === "event" || post.type === "deal") {
    const activeDates = safeArray<string>(post.metadata?.active_dates)
      .filter((date) => typeof date === "string")
      .map((date) => date.slice(0, 10));

    if (activeDates.length) {
      return activeDates.some((date) => date >= today);
    }

    const end = post.event_end || post.event_start;
    if (end && end.slice(0, 10) < today) return false;
  }

  return true;
}

function normaliseOpeningHours(value: unknown): OpeningHours | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;

  const source = value as Record<string, any>;

  return {
    mon: {
      closed: !!source.mon?.closed,
      open: source.mon?.open || "09:00",
      close: source.mon?.close || "17:00",
    },
    tue: {
      closed: !!source.tue?.closed,
      open: source.tue?.open || "09:00",
      close: source.tue?.close || "17:00",
    },
    wed: {
      closed: !!source.wed?.closed,
      open: source.wed?.open || "09:00",
      close: source.wed?.close || "17:00",
    },
    thu: {
      closed: !!source.thu?.closed,
      open: source.thu?.open || "09:00",
      close: source.thu?.close || "17:00",
    },
    fri: {
      closed: !!source.fri?.closed,
      open: source.fri?.open || "09:00",
      close: source.fri?.close || "17:00",
    },
    sat: {
      closed: !!source.sat?.closed,
      open: source.sat?.open || "09:00",
      close: source.sat?.close || "17:00",
    },
    sun: {
      closed: !!source.sun?.closed,
      open: source.sun?.open || "09:00",
      close: source.sun?.close || "17:00",
    },
  };
}

function normaliseCTAButtons(value: unknown) {
  return safeArray<CTAButton>(value)
    .map((item) => ({
      label: item?.label,
      href: typeof item?.href === "string" ? item.href.trim() : "",
    }))
    .filter(
      (item): item is { label: "Phone" | "Email" | "Website"; href: string } =>
        (item.label === "Phone" ||
          item.label === "Email" ||
          item.label === "Website") &&
        !!item.href
    );
}

function normaliseShowcaseImages(value: unknown) {
  return safeArray<ShowcaseImage>(value)
    .filter(
      (item): item is { url: string } =>
        typeof item?.url === "string" && !!item.url.trim()
    )
    .slice(0, 3);
}

function normaliseServices(value: unknown) {
  return safeArray<ServiceItem>(value)
    .filter(
      (item): item is { text: string; icon: string } =>
        typeof item?.text === "string" &&
        !!item.text.trim() &&
        typeof item?.icon === "string" &&
        !!item.icon.trim()
    )
    .slice(0, 10);
}

function buildCTAHref(label: string, value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";

  if (label === "Phone") {
    const phoneOnly = trimmed.replace(/[^\d+]/g, "");
    return phoneOnly ? `tel:${phoneOnly}` : "";
  }

  if (label === "Email") return `mailto:${trimmed.replace(/^mailto:/i, "")}`;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;

  return `https://${trimmed}`;
}

function safeBrandColor(color?: string | null) {
  if (!color) return "#15803d";
  return /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(color)
    ? color
    : "#15803d";
}

function getTypeCopy(pageType: Group["page_type"]) {
  if (pageType === "business") {
    return {
      aboutTitle: "About this business",
      showOpeningHours: true,
      showLocation: true,
      showShowcase: true,
      showServices: false,
    };
  }

  if (pageType === "service") {
    return {
      aboutTitle: "About this service",
      showOpeningHours: false,
      showLocation: false,
      showShowcase: false,
      showServices: true,
    };
  }

  return {
    aboutTitle: "About this organisation",
    showOpeningHours: false,
    showLocation: false,
    showShowcase: true,
    showServices: false,
  };
}

function PageSection({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[2rem] bg-white p-5 shadow-sm md:p-7">
      <p className="mb-2 text-xs font-black uppercase tracking-[0.2em] text-gray-400">
        {eyebrow}
      </p>

      {title ? (
        <h2 className="break-words text-2xl font-black tracking-tight text-gray-950 md:text-3xl">
          {title}
        </h2>
      ) : null}

      <div className={title ? "mt-4" : ""}>{children}</div>
    </section>
  );
}

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: group } = await supabase
    .from("groups")
    .select(
      `
        id,
        user_id,
        name,
        slug,
        description,
        logo_url,
        brand_color,
        page_type,
        address,
        opening_hours,
        cta_buttons,
        showcase_images,
        status,
        services,
        is_public
      `
    )
    .eq("slug", slug)
    .single<Group>();

  if (!group) return notFound();

  const { data: posts } = await supabase
    .from("posts")
    .select(
      `
        id,
        title,
        content,
        type,
        image_url,
        metadata,
        created_at,
        group_id,
        event_start,
        event_end,
        expires_at
      `
    )
    .eq("group_id", group.id)
    .order("created_at", { ascending: false });

  const activePosts = ((posts || []) as Post[]).filter(isPostActive);

  const typeCopy = getTypeCopy(group.page_type);
  const brandColor = safeBrandColor(group.brand_color);
  const openingHours = normaliseOpeningHours(group.opening_hours);

  const ctas = normaliseCTAButtons(group.cta_buttons)
    .map((button) => ({
      label: button.label,
      href: buildCTAHref(button.label, button.href),
    }))
    .filter((button) => button.href);

  const showcaseImages = normaliseShowcaseImages(group.showcase_images);
  const services = normaliseServices(group.services);

  const dealPosts: Post[] = [];
  const otherPosts: Post[] = [];

  for (const post of activePosts) {
    if (post.type === "deal") dealPosts.push(post);
    else otherPosts.push(post);
  }

  const contentPosts =
    group.page_type === "business" ? [...dealPosts, ...otherPosts] : activePosts;

  return (
      <main className="min-h-screen bg-[#f7f7f7]">
        <section
          className="relative overflow-hidden px-4 py-12 text-white md:px-8 md:py-16"
          style={{
            background: `linear-gradient(135deg, ${brandColor} 0%, ${brandColor}dd 45%, #111827 100%)`,
          }}
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(255,255,255,0.24),transparent_28%),radial-gradient(circle_at_80%_20%,rgba(255,255,255,0.14),transparent_30%)]" />

          <div className="relative z-10 mx-auto flex max-w-7xl flex-col gap-7 md:flex-row md:items-end md:justify-between">
            <div className="min-w-0">
              {group.logo_url ? (
                <img
                  src={group.logo_url}
                  alt={`${group.name} logo`}
                  loading="eager"
                  decoding="async"
                  className="mb-5 h-20 w-20 rounded-[1.5rem] border border-white/30 bg-white object-cover shadow-xl md:h-24 md:w-24"
                />
              ) : null}

              <h1 className="max-w-5xl break-words text-4xl font-black tracking-tight md:text-7xl">
                {group.name}
              </h1>
            </div>

            {ctas.length ? (
              <div className="flex flex-wrap gap-2 md:justify-end">
                {ctas.map((button) => (
                  <a
                    key={`${button.label}-${button.href}`}
                    href={button.href}
                    target={button.label === "Website" ? "_blank" : undefined}
                    rel={button.label === "Website" ? "noreferrer" : undefined}
                    className="rounded-full bg-white px-4 py-2.5 text-sm font-black text-gray-950 shadow-sm transition hover:scale-[1.02]"
                  >
                    {button.label}
                  </a>
                ))}
              </div>
            ) : null}
          </div>
        </section>

        <div className="mx-auto max-w-7xl space-y-5 px-4 py-5 md:px-6 md:py-7">
          <EditPageButton slug={group.slug} groupUserId={group.user_id} />

          <PageSection eyebrow="About" title={typeCopy.aboutTitle}>
            <p className="whitespace-pre-line break-words text-sm leading-7 text-gray-600 md:text-base">
              {group.description ||
                "This page shares useful local information across East Lothian."}
            </p>
          </PageSection>

          {typeCopy.showLocation && group.address ? (
            <PageSection eyebrow="Location">
              <p className="whitespace-pre-line break-words text-sm leading-7 text-gray-700 md:text-base">
                {group.address}
              </p>
            </PageSection>
          ) : null}

          {typeCopy.showOpeningHours && openingHours ? (
            <PageSection eyebrow="Opening hours">
              <div className="grid grid-cols-1 gap-2 md:grid-cols-7">
                {days.map((day) => (
                  <div
                    key={day.key}
                    className="rounded-2xl bg-gray-50 p-3 text-center"
                  >
                    <p className="text-sm font-black text-gray-950">
                      <span className="md:hidden">{day.label}</span>
                      <span className="hidden md:inline">{day.short}</span>
                    </p>

                    <p className="mt-1 text-xs leading-5 text-gray-500">
                      {openingHours[day.key].closed
                        ? "Closed"
                        : `${openingHours[day.key].open} – ${openingHours[day.key].close}`}
                    </p>
                  </div>
                ))}
              </div>
            </PageSection>
          ) : null}

          {typeCopy.showShowcase && showcaseImages.length ? (
            <PageSection eyebrow="Showcase">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                {showcaseImages.map((image, index) => (
                  <div
                    key={index}
                    className="aspect-square overflow-hidden rounded-[1.5rem] bg-gray-100"
                  >
                    <img
                      src={image.url}
                      alt={`${group.name} showcase ${index + 1}`}
                      loading="lazy"
                      decoding="async"
                      className="h-full w-full object-cover"
                    />
                  </div>
                ))}
              </div>
            </PageSection>
          ) : null}

          {typeCopy.showServices && services.length ? (
            <PageSection eyebrow="Services">
              <div className="flex flex-wrap gap-2">
                {services.map((service, index) => (
                  <div
                    key={index}
                    className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-4 py-2 text-sm font-bold text-gray-800"
                  >
                    <span>{service.icon}</span>
                    <span>{service.text}</span>
                  </div>
                ))}
              </div>
            </PageSection>
          ) : null}

          <section className="pt-4">
            <div className="mb-4">
              <p className="mb-1 text-xs font-black uppercase tracking-[0.2em] text-gray-400">
                Content
              </p>

              <h2 className="break-words text-3xl font-black tracking-tight text-gray-950">
                Latest from {group.name}
              </h2>
            </div>

            {!contentPosts.length ? (
              <div className="rounded-[2rem] bg-white px-5 py-14 text-center shadow-sm">
                <h3 className="text-xl font-black text-gray-950">
                  No active posts
                </h3>

                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-gray-500">
                  This page has no live posts right now. Check back soon.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {contentPosts.map((post) => (
                  <PostCard
                    key={post.id}
                    id={post.id}
                    title={post.title}
                    pageName={group.name}
                    imageUrl={post.image_url}
                    timeLabel={
                      post.event_start
                        ? new Date(post.event_start).toLocaleDateString(
                            "en-GB",
                            {
                              day: "numeric",
                              month: "short",
                            }
                          )
                        : undefined
                    }
                  />
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
  );
}
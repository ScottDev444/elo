import type React from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ExternalLink,
  Globe2,
} from "lucide-react";
import { FaFacebookF, FaInstagram } from "react-icons/fa";

import { createClient } from "@/lib/supabase/server";
import SiteHeader from "@/components/SiteHeader";
import Footer from "@/components/Footer";

type ShowcaseImage = {
  url?: string;
};

type LayoutData = {
  socials?: {
    facebook?: string | null;
    instagram?: string | null;
  };
  facebook?: string | null;
  instagram?: string | null;
};

type Group = {
  id: string;
  user_id?: string | null;
  name: string;
  slug: string;
  description?: string | null;
  logo_url?: string | null;
  cover_url?: string | null;
  brand_color?: string | null;
  website?: string | null;
  layout?: LayoutData | null;
  showcase_images?: unknown;
  status?: "draft" | "pending" | "approved" | null;
  is_public?: boolean | null;
};

type Post = {
  id: string;
  title: string;
  content?: string | null;
  type?: "general" | "deal" | "event" | "photo" | "alert" | null;
  image_url?: string | null;
  metadata?: Record<string, unknown> | null;
  created_at?: string | null;
  group_id?: string | null;
  event_start?: string | null;
  event_end?: string | null;
  expires_at?: string | null;
};

type Place = {
  id: string;
  page_id: string;
  title: string;
  description?: string | null;
  location_name?: string | null;
  address?: string | null;
  postcode?: string | null;
  slug?: string | null;
  images?: unknown;
  is_active?: boolean | null;
};

function safeArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function normaliseImages(value: unknown) {
  return safeArray<unknown>(value)
    .map((item) => {
      if (typeof item === "string") return item.trim();

      if (item && typeof item === "object" && !Array.isArray(item)) {
        const record = item as Record<string, unknown>;
        const possibleUrl =
          record.url ??
          record.image_url ??
          record.src ??
          record.publicUrl;

        return typeof possibleUrl === "string"
          ? possibleUrl.trim()
          : "";
      }

      return "";
    })
    .filter((url): url is string => Boolean(url));
}

function toDateKey(date: Date) {
  return date.toLocaleDateString("en-CA");
}

function isPostActive(post: Post) {
  const today = toDateKey(new Date());

  if (post.expires_at && post.expires_at.slice(0, 10) < today) {
    return false;
  }

  if (post.type === "event" || post.type === "deal") {
    const activeDates = safeArray<string>(
      post.metadata?.active_dates,
    )
      .filter((date) => typeof date === "string")
      .map((date) => date.slice(0, 10));

    if (activeDates.length) {
      return activeDates.some((date) => date >= today);
    }

    const end = post.event_end || post.event_start;

    if (end && end.slice(0, 10) < today) {
      return false;
    }
  }

  return true;
}

function safeBrandColor(color?: string | null) {
  if (!color) return "#15803d";

  return /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(color)
    ? color
    : "#15803d";
}

function getReadableTextColour(hex: string) {
  const cleaned = hex.replace("#", "");

  if (!/^[0-9a-fA-F]{6}$/.test(cleaned)) {
    return "#ffffff";
  }

  const red = Number.parseInt(cleaned.slice(0, 2), 16);
  const green = Number.parseInt(cleaned.slice(2, 4), 16);
  const blue = Number.parseInt(cleaned.slice(4, 6), 16);

  const luminance =
    (0.299 * red + 0.587 * green + 0.114 * blue) / 255;

  return luminance > 0.62 ? "#111111" : "#ffffff";
}

function normaliseExternalUrl(value?: string | null) {
  const cleaned = value?.trim();

  if (!cleaned) return null;

  return /^https?:\/\//i.test(cleaned)
    ? cleaned
    : `https://${cleaned}`;
}

function normaliseSocialUrl(
  value: string | null | undefined,
  platform: "facebook" | "instagram",
) {
  const cleaned = value?.trim();

  if (!cleaned) return null;

  if (/^https?:\/\//i.test(cleaned)) {
    return cleaned;
  }

  const handle = cleaned
    .replace(/^@/, "")
    .replace(/^facebook\.com\//i, "")
    .replace(/^instagram\.com\//i, "");

  return platform === "facebook"
    ? `https://facebook.com/${handle}`
    : `https://instagram.com/${handle}`;
}

function isEastLothianOnline(group: Group) {
  return (
    group.name.trim().toLowerCase() === "east lothian online" ||
    group.slug.trim().toLowerCase() === "east-lothian-online"
  );
}

function formatPostDate(post: Post) {
  const value = post.event_start ?? post.created_at;

  if (!value) return undefined;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return undefined;

  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
}


export default async function PublicBrandPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();

  const pageSelect = `
    id,
    user_id,
    name,
    slug,
    description,
    logo_url,
    cover_url,
    brand_color,
    website,
    layout,
    showcase_images,
    status,
    is_public
  `;

  const slugLookup = await supabase
    .from("groups")
    .select(pageSelect)
    .ilike("slug", slug.trim())
    .limit(1);

  if (slugLookup.error) {
    console.error("Slug lookup failed:", slugLookup.error);
  }

  let group = (slugLookup.data?.[0] ?? null) as Group | null;

  if (!group) {
    const expectedName = slug
      .replace(/-/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    const nameLookup = await supabase
      .from("groups")
      .select(pageSelect)
      .ilike("name", expectedName)
      .limit(1);

    if (nameLookup.error) {
      console.error("Name lookup failed:", nameLookup.error);
    }

    group = (nameLookup.data?.[0] ?? null) as Group | null;
  }

  if (
    !group ||
    group.status?.trim().toLowerCase() !== "approved" ||
    group.is_public === false
  ) {
    return (
      <>
        <SiteHeader />
        <main className="flex min-h-[70vh] items-center justify-center bg-[#f1f3f5] px-4 py-10 sm:px-5">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 text-center shadow-sm sm:p-8">
            <h1 className="text-3xl font-black tracking-[-0.04em] text-emerald-700">
              Page not found.
            </h1>
            <p className="mt-3 leading-7 text-gray-600">
              This page does not exist, has not been approved, or is not currently public.
            </p>
            <Link
              href="/"
              className="mt-7 inline-flex items-center gap-2 font-black text-emerald-700"
            >
              Back home
            </Link>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  const postsQuery = supabase
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
      `,
    )
    .eq("group_id", group.id)
    .order("created_at", { ascending: false });

  const placesQuery = isEastLothianOnline(group)
    ? Promise.resolve({ data: [] as Place[], error: null })
    : supabase
        .from("places")
        .select(
          `
            id,
            page_id,
            title,
            description,
            location_name,
            address,
            postcode,
            slug,
            images,
            is_active
          `,
        )
        .eq("page_id", group.id)
        .eq("is_active", true)
        .order("title", { ascending: true });

  const [postsResult, placesResult] = await Promise.all([
    postsQuery,
    placesQuery,
  ]);

  if (postsResult.error) {
    console.error("Failed to load page posts:", postsResult.error);
  }

  if (placesResult.error) {
    console.error("Failed to load page places:", placesResult.error);
  }

  const posts = ((postsResult.data ?? []) as Post[]).filter(
    isPostActive,
  );

  const places = (placesResult.data ?? []) as Place[];

  const brandColor = safeBrandColor(group.brand_color);
  const brandTextColor = getReadableTextColour(brandColor);
  const showcaseImages = normaliseImages(group.showcase_images);

  const website = normaliseExternalUrl(group.website);
  const facebook = normaliseSocialUrl(
    group.layout?.socials?.facebook ??
      group.layout?.facebook,
    "facebook",
  );
  const instagram = normaliseSocialUrl(
    group.layout?.socials?.instagram ??
      group.layout?.instagram,
    "instagram",
  );

  return (
    <>
      <SiteHeader />
      <main className="min-h-screen overflow-x-hidden bg-[#f1f3f5] text-gray-950">
      <section
        className="relative h-36 overflow-hidden sm:h-44 md:h-64"
        style={{ backgroundColor: brandColor }}
      >
        {group.cover_url ? (
          <Image
            src={group.cover_url}
            alt=""
            fill
            priority
            unoptimized
            className="object-cover"
          />
        ) : null}

        <div className="absolute inset-0 bg-gradient-to-b from-black/5 to-black/15" />
      </section>

      <div className="w-full"> </div>
        <section className="relative bg-white px-4 pb-8 sm:px-5 md:-mt-10 md:rounded-t-[2rem] md:px-8">
          <div className="-mt-14 sm:-mt-16 md:-mt-20">
            <div
              className="relative h-28 w-28 overflow-hidden rounded-[1.5rem] border-[5px] border-white shadow-md sm:h-32 sm:w-32 md:h-40 md:w-40 md:rounded-[2rem]"
              style={{ backgroundColor: brandColor }}
            >
              {group.logo_url ? (
                <Image
                  src={group.logo_url}
                  alt={`${group.name} logo`}
                  fill
                  priority
                  unoptimized
                  className="bg-white object-contain p-3"
                />
              ) : (
                <div
                  className="flex h-full w-full items-center justify-center text-4xl font-black"
                  style={{ color: brandTextColor }}
                >
                  {group.name.slice(0, 1).toUpperCase()}
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 max-w-4xl">
            <h1 className="break-words text-[2rem] font-black leading-[1.02] tracking-[-0.045em] sm:text-4xl md:text-5xl">
              {group.name}
            </h1>

            {group.description ? (
              <p className="mt-4 whitespace-pre-line text-[15px] leading-7 text-gray-600 md:text-base">
                {group.description}
              </p>
            ) : null}
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            {website ? (
              <a
                href={website}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-5 text-sm font-black"
                style={{
                  backgroundColor: brandColor,
                  color: brandTextColor,
                }}
              >
                <Globe2 className="h-4 w-4" />
                Visit website
                <ExternalLink className="h-4 w-4" />
              </a>
            ) : null}

            {facebook ? (
              <a
                href={facebook}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-5 text-sm font-black text-gray-900 transition hover:bg-gray-50"
              >
                <FaFacebookF className="h-4 w-4" />
                Facebook
              </a>
            ) : null}

            {instagram ? (
              <a
                href={instagram}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-5 text-sm font-black text-gray-900 transition hover:bg-gray-50"
              >
                <FaInstagram className="h-4 w-4" />
                Instagram
              </a>
            ) : null}
          </div>
        </section>


        <div className="w-full py-4 sm:py-6">
          {showcaseImages.length ? (
            <section className="w-full bg-white px-4 py-6 sm:px-6 md:px-8">
              <div className="mx-auto w-full max-w-7xl">
                <h2 className="mb-5 text-2xl font-black">Photos</h2>

                <div className="space-y-6">
                  {showcaseImages.map((url, index) => (
                    <div
                      key={`${url}-${index}`}
                      className="overflow-hidden rounded-3xl bg-gray-100"
                    >
                      <Image
                        src={url}
                        alt={`${group.name} ${index + 1}`}
                        width={1600}
                        height={1200}
                        unoptimized
                        className="h-auto w-full"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </section>
          ) : null}

          
        </div>
      </main>
      <Footer />
    </>
  );
}
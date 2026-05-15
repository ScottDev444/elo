import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, CalendarDays, MapPin, Tag } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import SavePostButton from "@/components/SavePostButton";
import BackButton from "@/components/BackButton";

export const dynamic = "force-dynamic";

function formatDate(value?: string | null) {
  if (!value) return "";

  return new Date(value).toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function getTypeLabel(type?: string) {
  if (type === "event") return "Event";
  if (type === "deal") return "Deal";
  if (type === "update") return "Alert";
  return "Post";
}

function safeBrandColor(value?: string | null) {
  if (!value) return "#111827";
  if (/^#[0-9A-Fa-f]{6}$/.test(value)) return value;
  return "#111827";
}

function getSafeHref(value: string) {
  if (value.startsWith("http://") || value.startsWith("https://")) {
    return value;
  }

  return `https://${value}`;
}

function renderContentWithLinks(content: string) {
  const urlRegex =
    /(https?:\/\/[^\s]+|www\.[^\s]+|[a-zA-Z0-9-]+\.[a-zA-Z]{2,}[^\s]*)/g;

  return content.split(urlRegex).map((part, index) => {
    if (!part) return null;

    const isLink =
      part.startsWith("http://") ||
      part.startsWith("https://") ||
      part.startsWith("www.") ||
      /^[a-zA-Z0-9-]+\.[a-zA-Z]{2,}/.test(part);

    if (isLink) {
      return (
        <a
          key={index}
          href={getSafeHref(part)}
          target="_blank"
          rel="noopener noreferrer"
          className="font-bold text-emerald-700 underline decoration-2 underline-offset-4 hover:text-emerald-800"
        >
          {part}
        </a>
      );
    }

    return <span key={index}>{part}</span>;
  });
}

export default async function PostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

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
    `
    )
    .eq("id", id)
    .maybeSingle();

  if (error || !post) notFound();

  const pageName = post.groups?.name ?? "East Lothian";
  const pageSlug = post.groups?.slug;
  const pageHref = pageSlug ? `/${pageSlug}` : "/";
  const brandColor = safeBrandColor(post.groups?.brand_color);
  const typeLabel = getTypeLabel(post.type);

  return (
    <main
      className="min-h-screen p-5 md:p-8"
      style={{
        background: `linear-gradient(180deg, ${brandColor}14 0%, #ffffff 34%)`,
      }}
    >
      <div className="mx-auto max-w-3xl">
        <BackButton />

        <article className="overflow-hidden rounded-[2rem] bg-white shadow-sm ring-1 ring-black/5">
          <div className="p-5 md:p-7">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <Link
                href={pageHref}
                className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold text-white"
                style={{ backgroundColor: brandColor }}
              >
                Posted by {pageName}
              </Link>

              <span className="rounded-full bg-neutral-100 px-3 py-1.5 text-xs font-bold text-neutral-700">
                {typeLabel}
              </span>
            </div>

            <h1 className="text-4xl font-black leading-tight tracking-tight text-black md:text-6xl">
              {post.title}
            </h1>

            <section className="mt-6 grid gap-3">
              {post.type === "event" && (
                <>
                  <div className="flex items-center gap-3 rounded-3xl bg-neutral-50 p-4">
                    <CalendarDays size={22} style={{ color: brandColor }} />

                    <div>
                      <p className="text-xs font-medium text-neutral-500">
                        Event date
                      </p>

                      <p className="text-sm font-bold text-black">
                        {formatDate(post.event_start)}
                      </p>
                    </div>
                  </div>

                  {post.metadata?.location && (
                    <div className="flex items-center gap-3 rounded-3xl bg-neutral-50 p-4">
                      <MapPin size={22} style={{ color: brandColor }} />

                      <div>
                        <p className="text-xs font-medium text-neutral-500">
                          Location
                        </p>

                        <p className="text-sm font-bold text-black">
                          {post.metadata.location}
                        </p>
                      </div>
                    </div>
                  )}
                </>
              )}

              {post.type === "deal" && (
                <>
                  <div className="flex items-center gap-3 rounded-3xl bg-emerald-50 p-4">
                    <Tag size={22} className="text-emerald-700" />

                    <div>
                      <p className="text-xs font-medium text-emerald-700">
                        Deal
                      </p>

                      <p className="text-sm font-bold text-black">
                        Available now
                      </p>
                    </div>
                  </div>

                  {(post.expires_at || post.event_end) && (
                    <div className="flex items-center gap-3 rounded-3xl bg-neutral-50 p-4">
                      <CalendarDays size={22} style={{ color: brandColor }} />

                      <div>
                        <p className="text-xs font-medium text-neutral-500">
                          Ends
                        </p>

                        <p className="text-sm font-bold text-black">
                          {formatDate(post.expires_at ?? post.event_end)}
                        </p>
                      </div>
                    </div>
                  )}
                </>
              )}

              {post.type === "update" && (
                <>
                  <div className="flex items-center gap-3 rounded-3xl bg-amber-50 p-4">
                    <AlertTriangle size={22} className="text-amber-700" />

                    <div>
                      <p className="text-xs font-medium text-amber-700">
                        Alert
                      </p>

                      <p className="text-sm font-bold text-black">
                        Important local update
                      </p>
                    </div>
                  </div>

                  {post.expires_at && (
                    <div className="flex items-center gap-3 rounded-3xl bg-neutral-50 p-4">
                      <CalendarDays size={22} style={{ color: brandColor }} />

                      <div>
                        <p className="text-xs font-medium text-neutral-500">
                          Active until
                        </p>

                        <p className="text-sm font-bold text-black">
                          {formatDate(post.expires_at)}
                        </p>
                      </div>
                    </div>
                  )}
                </>
              )}
            </section>

            <div className="mt-6">
              {user ? (
                <SavePostButton postId={post.id} brandColor={brandColor} />
              ) : (
                <Link
                  href="/auth"
                  className="inline-flex w-full items-center justify-center rounded-2xl px-5 py-4 text-sm font-black text-white shadow-sm transition-opacity hover:opacity-90"
                  style={{ backgroundColor: brandColor }}
                >
                  Sign in to add to my calendar
                </Link>
              )}
            </div>

            {post.content && (
              <section className="mt-8 rounded-[2rem] bg-neutral-50 p-6">
                <div className="whitespace-pre-wrap text-lg leading-8 text-neutral-800">
                  {renderContentWithLinks(post.content)}
                </div>
              </section>
            )}
          </div>

          {post.image_url && (
            <div className="border-t border-neutral-100 bg-neutral-50 p-4 md:p-6">
              <Image
                src={post.image_url}
                alt={post.title}
                width={1200}
                height={900}
                className="h-auto w-full rounded-[1.5rem] object-contain"
                priority
              />
            </div>
          )}
        </article>
      </div>
    </main>
  );
}
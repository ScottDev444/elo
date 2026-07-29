"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ExternalLink,
  Globe2,
  LoaderCircle,
  MapPin,
  Navigation,
  Phone,
  Store,
} from "lucide-react";

import Header from "@/components/SiteHeader";
import Footer from "@/components/Footer";
import { createClient } from "@/lib/supabase/client";

type Place = {
  id: string;
  page_id: string | null;
  title: string;
  description: string | null;
  location_name: string | null;
  address: string | null;
  postcode: string | null;
  tags: string[] | null;
  slug: string | null;
  is_active: boolean | null;
  images: string[] | null;
};

type PageDetails = {
  id: string;
  name: string;
  slug: string | null;
  logo_url: string | null;
  brand_color: string | null;
  is_local_partner: boolean | null;
  phone: string | null;
  website: string | null;
};

function safeBrandColour(value: string | null) {
  return value && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value)
    ? value
    : "#15803d";
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

  const red = Number.parseInt(fullHex.slice(0, 2), 16);
  const green = Number.parseInt(fullHex.slice(2, 4), 16);
  const blue = Number.parseInt(fullHex.slice(4, 6), 16);

  const luminance =
    (0.299 * red + 0.587 * green + 0.114 * blue) / 255;

  return luminance > 0.62 ? "#111111" : "#ffffff";
}

function buildMapsUrl(place: Place) {
  const query = [
    place.title,
    place.address,
    place.location_name,
    place.postcode,
  ]
    .filter(Boolean)
    .join(", ");

  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    query,
  )}`;
}

export default function PlacePage() {
  const params = useParams<{ slug: string }>();
  const supabase = useMemo(() => createClient(), []);

  const [place, setPlace] = useState<Place | null>(null);
  const [page, setPage] = useState<PageDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadPlace() {
      setLoading(true);
      setError("");
      setNotFound(false);

      try {
        const slug = decodeURIComponent(params.slug);

        const placeSelect = `
          id,
          page_id,
          title,
          description,
          location_name,
          address,
          postcode,
          tags,
          slug,
          is_active,
          images
        `;

        let placeData: Place | null = null;

        const { data: slugMatch, error: slugError } = await supabase
          .from("places")
          .select(placeSelect)
          .eq("slug", slug)
          .eq("is_active", true)
          .maybeSingle();

        if (slugError) {
          throw slugError;
        }

        placeData = (slugMatch as Place | null) ?? null;

        const isUuid =
          /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
            slug,
          );

        if (!placeData && isUuid) {
          const { data: idMatch, error: idError } = await supabase
            .from("places")
            .select(placeSelect)
            .eq("id", slug)
            .eq("is_active", true)
            .maybeSingle();

          if (idError) {
            throw idError;
          }

          placeData = (idMatch as Place | null) ?? null;
        }

        if (!placeData) {
          if (!cancelled) {
            setNotFound(true);
            setLoading(false);
          }

          return;
        }

        const loadedPlace = placeData as Place;

        if (!cancelled) {
          setPlace(loadedPlace);
        }

        if (loadedPlace.page_id) {
          const { data: pageData, error: pageError } = await supabase
            .from("groups")
            .select(`
              id,
              name,
              slug,
              logo_url,
              brand_color,
              is_local_partner,
              phone,
              website
            `)
            .eq("id", loadedPlace.page_id)
            .maybeSingle();

          if (pageError) {
            throw pageError;
          }

          if (!cancelled) {
            setPage((pageData as PageDetails | null) ?? null);
          }
        }
      } catch (caughtError) {
        console.error("Failed to load place:", caughtError);

        if (!cancelled) {
          setError(
            caughtError instanceof Error
              ? caughtError.message
              : "This Place could not be loaded.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadPlace();

    return () => {
      cancelled = true;
    };
  }, [params.slug, supabase]);

  if (loading) {
    return (
      <>
        <Header />

        <main className="grid min-h-[70vh] place-items-center bg-slate-50 px-4">
          <div className="flex items-center gap-3 text-sm font-black text-slate-500">
            <LoaderCircle className="h-5 w-5 animate-spin" />
            Loading Place
          </div>
        </main>

        <Footer />
      </>
    );
  }

  if (notFound || !place) {
    return (
      <>
        <Header />

        <main className="grid min-h-[70vh] place-items-center bg-slate-50 px-4 py-16">
          <section className="w-full max-w-xl rounded-3xl border border-slate-200 bg-white px-6 py-14 text-center shadow-sm">
            <div className="mx-auto grid h-20 w-20 place-items-center rounded-3xl bg-slate-100 text-slate-500">
              <Store className="h-9 w-9" />
            </div>

            <h1 className="mt-7 text-4xl font-black tracking-[-0.04em] text-emerald-700">
              Place not found
            </h1>

            <p className="mt-4 text-slate-600">
              This Place may have been removed or made unavailable.
            </p>

            <Link
              href="/places"
              className="mt-7 inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 text-sm font-black text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Places
            </Link>
          </section>
        </main>

        <Footer />
      </>
    );
  }

  const brandColour = safeBrandColour(page?.brand_color ?? null);
  const brandTextColour = getReadableTextColour(brandColour);
  const image = place.images?.find(Boolean) ?? null;
  const fullAddress = [
    place.address,
    place.location_name,
    place.postcode,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <>
      <Header />

      <main className="min-h-screen bg-slate-50 text-slate-950">
        <section
          className="relative overflow-hidden px-4 py-12 sm:px-6 sm:py-16 lg:px-8"
          style={{
            backgroundColor: brandColour,
            color: brandTextColour,
          }}
        >
          {image ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={image}
                alt=""
                className="absolute inset-0 h-full w-full object-cover opacity-25"
              />

              <div className="absolute inset-0 bg-black/25" />
            </>
          ) : null}

          <div className="relative mx-auto max-w-6xl">
            <Link
              href="/places"
              className="inline-flex items-center gap-2 text-sm font-black opacity-80 transition hover:opacity-100"
            >
              <ArrowLeft className="h-4 w-4" />
              All Places
            </Link>

            <div className="mt-10 flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-3xl">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="rounded-lg bg-white/15 px-3 py-1 text-xs font-black uppercase tracking-[0.12em] backdrop-blur-sm">
                    Place
                  </span>

                  {page?.is_local_partner ? (
                    <span className="rounded-lg bg-amber-300 px-3 py-1 text-xs font-black text-slate-950">
                      Local Partner
                    </span>
                  ) : null}
                </div>

                <h1 className="mt-5 text-4xl font-black tracking-[-0.05em] sm:text-6xl">
                  {place.title}
                </h1>

                {fullAddress ? (
                  <p className="mt-5 flex items-start gap-2 text-lg font-bold opacity-85">
                    <MapPin className="mt-1 h-5 w-5 shrink-0" />
                    {fullAddress}
                  </p>
                ) : null}
              </div>

              {page ? (
                <Link
                  href={`/page/${page.slug ?? page.id}`}
                  className="flex w-fit items-center gap-3 rounded-2xl bg-white/15 px-4 py-3 backdrop-blur-md transition hover:bg-white/20"
                >
                  <div className="grid h-11 w-11 place-items-center overflow-hidden rounded-xl bg-white/15 font-black">
                    {page.logo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={page.logo_url}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      page.name.slice(0, 1).toUpperCase()
                    )}
                  </div>

                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.12em] opacity-70">
                      Part of
                    </p>
                    <p className="font-black">{page.name}</p>
                  </div>
                </Link>
              ) : null}
            </div>
          </div>
        </section>

        <section className="px-4 py-10 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-6xl">
            <div className="flex flex-wrap gap-3">
              {fullAddress ? (
                <a
                  href={buildMapsUrl(place)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-14 items-center gap-3 rounded-xl bg-slate-950 px-5 py-3 text-sm font-black text-white transition hover:bg-slate-800"
                >
                  <Navigation className="h-5 w-5 shrink-0" />
                  Get directions
                </a>
              ) : null}

              {page?.website &&
              page.name.trim().toLowerCase() !== "east lothian online" ? (
                <a
                  href={
                    page.website.startsWith("http")
                      ? page.website
                      : `https://${page.website}`
                  }
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-14 items-center gap-3 rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-black transition hover:bg-slate-100"
                >
                  <Globe2 className="h-5 w-5 text-emerald-700" />
                  Website
                  <ExternalLink className="h-4 w-4 text-slate-400" />
                </a>
              ) : null}

              {page?.phone ? (
                <a
                  href={`tel:${page.phone}`}
                  className="inline-flex min-h-14 items-center gap-3 rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-black transition hover:bg-slate-100"
                >
                  <Phone className="h-5 w-5 text-emerald-700" />
                  {page.phone}
                </a>
              ) : null}
            </div>

            <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
              <h2 className="text-2xl font-black tracking-[-0.03em]">
                About
              </h2>

              <p className="mt-5 whitespace-pre-line text-lg leading-8 text-slate-600">
                {place.description || "No description has been added yet."}
              </p>

              {place.tags?.length ? (
                <div className="mt-8 flex flex-wrap gap-2">
                  {place.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-lg bg-emerald-50 px-3 py-2 text-sm font-black text-emerald-700"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </section>

        {place.images?.length ? (
          <section className="px-4 pb-12 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-6xl">
              <h2 className="text-2xl font-black tracking-[-0.03em]">
                Photos
              </h2>

              <div className="mt-6 space-y-6">
                {place.images
                  .filter((photo): photo is string => Boolean(photo))
                  .map((photo, index) => (
                    <div
                      key={`${photo}-${index}`}
                      className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={photo}
                        alt={`${place.title} photo ${index + 1}`}
                        className="block h-auto w-full"
                      />
                    </div>
                  ))}
              </div>
            </div>
          </section>
        ) : null}

        {error ? (
          <div className="mx-auto max-w-6xl px-4 pb-10 text-sm font-bold text-red-700">
            {error}
          </div>
        ) : null}
      </main>

      <Footer />
    </>
  );
}
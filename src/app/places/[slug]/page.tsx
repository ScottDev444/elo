"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Info,
  LoaderCircle,
  MapPin,
  Navigation,
  Store,
  X,
} from "lucide-react";
import {
  useParams,
  useRouter,
} from "next/navigation";

import SiteHeader from "@/components/SiteHeader";
import { createClient } from "@/lib/supabase/client";

type OpeningDay = {
  open?: string;
  close?: string;
  closed?: boolean;
  is24h?: boolean;
  is_24_7?: boolean;
};

type OpeningHours =
  Record<
    string,
    OpeningDay
  >;

type PlaceRow = {
  id: string;
  page_id: string | null;
  slug: string | null;
  title: string;
  description: string | null;
  location_name: string | null;
  address: string | null;
  postcode: string | null;
  images: unknown;
  is_active: boolean;
  opening_hours:
    | OpeningHours
    | null;
  is_24_7:
    | boolean
    | null;
  metadata:
    | {
        open_24_7?:
          | boolean
          | null;
      }
    | null;
};

type OwnerPage = {
  id: string;
  name: string;
  slug: string | null;
  brand_color:
    | string
    | null;
  is_local_partner:
    | boolean
    | null;
  logo_url:
    | string
    | null;
};

const DAY_ROWS = [
  ["monday", "Monday"],
  ["tuesday", "Tuesday"],
  ["wednesday", "Wednesday"],
  ["thursday", "Thursday"],
  ["friday", "Friday"],
  ["saturday", "Saturday"],
  ["sunday", "Sunday"],
] as const;

function normaliseHex(
  value:
    | string
    | null
    | undefined
) {
  const clean =
    value?.trim();

  if (
    clean &&
    /^#[0-9A-Fa-f]{6}$/.test(
      clean
    )
  ) {
    return clean;
  }

  return "#005744";
}

function getReadableTextColour(
  hex: string
) {
  const clean =
    normaliseHex(hex)
      .replace("#", "");

  const red =
    Number.parseInt(
      clean.slice(0, 2),
      16
    );

  const green =
    Number.parseInt(
      clean.slice(2, 4),
      16
    );

  const blue =
    Number.parseInt(
      clean.slice(4, 6),
      16
    );

  const luminance =
    (
      0.299 * red +
      0.587 * green +
      0.114 * blue
    ) / 255;

  return luminance > 0.62
    ? "#111111"
    : "#FFFFFF";
}

function hexToRgba(
  hex: string,
  alpha: number
) {
  const clean =
    normaliseHex(hex)
      .replace("#", "");

  const red =
    Number.parseInt(
      clean.slice(0, 2),
      16
    );

  const green =
    Number.parseInt(
      clean.slice(2, 4),
      16
    );

  const blue =
    Number.parseInt(
      clean.slice(4, 6),
      16
    );

  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

function normaliseImages(
  value: unknown
) {
  if (
    !Array.isArray(value)
  ) {
    return [];
  }

  return value
    .map(
      (
        item
      ): string | null => {
        if (
          typeof item ===
          "string"
        ) {
          return (
            item.trim() ||
            null
          );
        }

        if (
          item &&
          typeof item ===
            "object" &&
          !Array.isArray(item)
        ) {
          const record =
            item as Record<
              string,
              unknown
            >;

          const possible =
            record.url ??
            record.image_url ??
            record.src ??
            record.publicUrl;

          return typeof possible ===
            "string"
            ? possible.trim() ||
                null
            : null;
        }

        return null;
      }
    )
    .filter(
      (
        item
      ): item is string =>
        Boolean(item)
    );
}

function normalisePlaceTwentyFourSeven(
  value: unknown,
  openingHours: unknown,
  metadata?:
    | {
        open_24_7?:
          | boolean
          | null;
      }
    | null
) {
  if (
    metadata
      ?.open_24_7 ===
    true
  ) {
    return true;
  }

  const directFlag =
    value === true ||
    value === 1 ||
    (
      typeof value ===
        "string" &&
      [
        "true",
        "1",
        "yes",
      ].includes(
        value
          .trim()
          .toLowerCase()
      )
    );

  if (directFlag) {
    return true;
  }

  if (
    openingHours &&
    typeof openingHours ===
      "object" &&
    !Array.isArray(
      openingHours
    ) &&
    Object.keys(
      openingHours as Record<
        string,
        unknown
      >
    ).length === 0
  ) {
    return true;
  }

  return (
    typeof openingHours ===
      "string" &&
    openingHours.trim() ===
      "{}"
  );
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

  return days[
    new Date().getDay()
  ];
}

function timeToMinutes(
  value:
    | string
    | undefined
) {
  if (!value) {
    return null;
  }

  const match =
    value.match(
      /^(\d{1,2}):(\d{2})/
    );

  if (!match) {
    return null;
  }

  const hours =
    Number(match[1]);

  const minutes =
    Number(match[2]);

  if (
    !Number.isFinite(hours) ||
    !Number.isFinite(minutes)
  ) {
    return null;
  }

  return (
    hours * 60 +
    minutes
  );
}

function dayLabel(
  day:
    | OpeningDay
    | undefined,
  is247 = false
) {
  if (is247) {
    return "24 hours";
  }

  if (
    !day ||
    day.closed
  ) {
    return "Closed";
  }

  if (
    day.is24h ||
    day.is_24_7
  ) {
    return "24 hours";
  }

  if (
    day.open &&
    day.close
  ) {
    return `${day.open} – ${day.close}`;
  }

  return "Hours unavailable";
}

function getOpenState(
  place:
    | PlaceRow
    | null
) {
  if (!place) {
    return {
      state:
        "unknown" as const,
      label:
        "Hours unavailable",
    };
  }

  if (
    place.is_24_7
  ) {
    return {
      state:
        "open" as const,
      label:
        "Open 24/7",
    };
  }

  const today =
    place.opening_hours?.[
      getTodayKey()
    ];

  if (!today) {
    return {
      state:
        "unknown" as const,
      label:
        "Hours unavailable",
    };
  }

  if (today.closed) {
    return {
      state:
        "closed" as const,
      label:
        "Closed today",
    };
  }

  if (
    today.is24h ||
    today.is_24_7
  ) {
    return {
      state:
        "open" as const,
      label:
        "Open 24 hours",
    };
  }

  const open =
    timeToMinutes(
      today.open
    );

  const close =
    timeToMinutes(
      today.close
    );

  if (
    open === null ||
    close === null
  ) {
    return {
      state:
        "unknown" as const,
      label:
        dayLabel(today),
    };
  }

  const now =
    new Date();

  const current =
    now.getHours() *
      60 +
    now.getMinutes();

  const isOpen =
    close >= open
      ? current >= open &&
        current <= close
      : current >= open ||
        current <= close;

  return {
    state:
      isOpen
        ? "open" as const
        : "closed" as const,

    label:
      isOpen
        ? `Open now · until ${today.close}`
        : `Closed · ${today.open} – ${today.close}`,
  };
}

function looksLikeUuid(
  value: string
) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

function readableError(
  error: unknown,
  fallback =
    "Unable to load Place."
) {
  if (
    error instanceof Error
  ) {
    return (
      error.message ||
      fallback
    );
  }

  if (
    error &&
    typeof error ===
      "object"
  ) {
    const record =
      error as Record<
        string,
        unknown
      >;

    const parts = [
      typeof record.message ===
      "string"
        ? record.message
        : null,
      typeof record.details ===
      "string"
        ? record.details
        : null,
      typeof record.code ===
      "string"
        ? `Code: ${record.code}`
        : null,
    ].filter(Boolean);

    if (
      parts.length > 0
    ) {
      return parts.join(
        " · "
      );
    }
  }

  return fallback;
}

export default function PlaceViewPage() {
  const router =
    useRouter();

  const params =
    useParams<{
      slug?:
        | string
        | string[];
    }>();

  const rawSlug =
    params.slug;

  const routeValue =
    Array.isArray(
      rawSlug
    )
      ? rawSlug[0]
      : rawSlug;

  const supabase =
    useMemo(
      () => createClient(),
      []
    );

  const [
    place,
    setPlace,
  ] =
    useState<
      PlaceRow | null
    >(null);

  const [
    owner,
    setOwner,
  ] =
    useState<
      OwnerPage | null
    >(null);

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    loadError,
    setLoadError,
  ] =
    useState<
      string | null
    >(null);

  const [
    galleryIndex,
    setGalleryIndex,
  ] =
    useState<
      number | null
    >(null);

  const loadPlace =
    useCallback(
      async () => {
        if (!routeValue) {
          setPlace(null);
          setOwner(null);
          setLoadError(
            "No Place was selected."
          );
          setLoading(false);

          return;
        }

        setLoading(true);
        setLoadError(null);

        try {
          let query =
            supabase
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
                images,
                is_active,
                opening_hours,
                is_24_7,
                metadata
              `)
              .eq(
                "is_active",
                true
              );

          query =
            looksLikeUuid(
              routeValue
            )
              ? query.eq(
                  "id",
                  routeValue
                )
              : query.eq(
                  "slug",
                  routeValue
                );

          const {
            data,
            error,
          } =
            await query
              .limit(1)
              .maybeSingle();

          if (error) {
            throw error;
          }

          if (!data) {
            setPlace(null);
            setOwner(null);

            return;
          }

          const loaded =
            data as PlaceRow;

          const loadedIs247 =
            normalisePlaceTwentyFourSeven(
              loaded.is_24_7,
              loaded.opening_hours,
              loaded.metadata
            );

          const normalisedLoaded:
            PlaceRow = {
              ...loaded,
              is_24_7:
                loadedIs247,
              opening_hours:
                loadedIs247
                  ? {}
                  : loaded.opening_hours,
            };

          setPlace(
            normalisedLoaded
          );

          if (
            loaded.page_id
          ) {
            const {
              data:
                ownerData,
              error:
                ownerError,
            } =
              await supabase
                .from(
                  "groups"
                )
                .select(`
                  id,
                  name,
                  slug,
                  brand_color,
                  is_local_partner,
                  logo_url
                `)
                .eq(
                  "id",
                  loaded.page_id
                )
                .maybeSingle();

            if (ownerError) {
              console.error(
                "Place owner error:",
                readableError(
                  ownerError
                ),
                ownerError
              );

              setOwner(null);
            } else {
              setOwner(
                (
                  ownerData ??
                  null
                ) as
                  | OwnerPage
                  | null
              );
            }
          } else {
            setOwner(null);
          }
        } catch (error) {
          const message =
            readableError(error);

          console.error(
            "Place screen error:",
            message,
            error
          );

          setPlace(null);
          setOwner(null);
          setLoadError(
            message
          );
        } finally {
          setLoading(false);
        }
      },
      [
        routeValue,
        supabase,
      ]
    );

  useEffect(() => {
    void loadPlace();
  }, [
    loadPlace,
  ]);

  const accent =
    normaliseHex(
      owner
        ?.brand_color
    );

  const textOnAccent =
    getReadableTextColour(
      accent
    );

  const photos =
    useMemo(
      () =>
        normaliseImages(
          place?.images
        ),
      [
        place?.images,
      ]
    );

  const openState =
    useMemo(
      () =>
        getOpenState(
          place
        ),
      [
        place,
      ]
    );

  const locationText =
    [
      place
        ?.location_name,
      place
        ?.address,
      place
        ?.postcode,
    ]
      .filter(Boolean)
      .join(", ");

  const selectedPhoto =
    galleryIndex !== null
      ? photos[
          galleryIndex
        ]
      : null;

  useEffect(() => {
    if (
      galleryIndex === null
    ) {
      return;
    }

    function handleKeyDown(
      event: KeyboardEvent
    ) {
      if (
        event.key ===
        "Escape"
      ) {
        setGalleryIndex(
          null
        );
        return;
      }

      if (
        event.key ===
        "ArrowLeft"
      ) {
        setGalleryIndex(
          (current) =>
            current === null
              ? null
              : Math.max(
                  0,
                  current - 1
                )
        );
      }

      if (
        event.key ===
        "ArrowRight"
      ) {
        setGalleryIndex(
          (current) =>
            current === null
              ? null
              : Math.min(
                  photos.length - 1,
                  current + 1
                )
        );
      }
    }

    window.addEventListener(
      "keydown",
      handleKeyDown
    );

    return () => {
      window.removeEventListener(
        "keydown",
        handleKeyDown
      );
    };
  }, [
    galleryIndex,
    photos.length,
  ]);

  function openDirections() {
    if (!locationText) {
      return;
    }

    const query =
      encodeURIComponent(
        locationText
      );

    window.open(
      `https://www.google.com/maps/search/?api=1&query=${query}`,
      "_blank",
      "noopener,noreferrer"
    );
  }

  function openOwnerPage() {
    if (!owner) {
      return;
    }

    router.push(
      `/pages/${encodeURIComponent(
        owner.slug ||
          owner.id
      )}`
    );
  }

  if (loading) {
    return (
      <main className="elo-place-view-page">
        <SiteHeader />

        <div className="elo-place-view-loading">
          <LoaderCircle
            size={31}
            className="elo-place-view-spin"
          />

          <span>
            Loading Place...
          </span>
        </div>

        <style>{styles}</style>
      </main>
    );
  }

  if (!place) {
    return (
      <main className="elo-place-view-page">
        <SiteHeader />

        <div className="elo-place-view-unavailable">
          <MapPin
            size={36}
          />

          <h1>
            Place unavailable
          </h1>

          <p>
            {loadError ||
              "This Place isn't available right now."}
          </p>
        </div>

        <style>{styles}</style>
      </main>
    );
  }

  const heroOpenLabel =
    openState.state ===
      "open"
      ? openState.label
      : openState.state ===
          "closed"
        ? "Closed now"
        : openState.label;

  return (
    <main className="elo-place-view-page">
      <SiteHeader />

      <section className="elo-place-view-shell">
        <button
          type="button"
          className={`elo-place-view-hero ${
            photos[0]
              ? "is-clickable"
              : ""
          }`}
          style={{
            backgroundColor:
              accent,
          }}
          onClick={() => {
            if (
              photos.length > 0
            ) {
              setGalleryIndex(
                0
              );
            }
          }}
          aria-label={
            photos.length > 0
              ? `View ${photos.length} Place photo${photos.length === 1 ? "" : "s"}`
              : undefined
          }
        >
          {photos[0] ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={
                photos[0]
              }
              alt=""
              className="elo-place-view-hero-image"
            />
          ) : (
            <div
              className="elo-place-view-hero-fallback"
              style={{
                backgroundColor:
                  accent,
              }}
            >
              <Store
                size={68}
              />
            </div>
          )}

          <div className="elo-place-view-hero-overlay" />

          <div className="elo-place-view-hero-top">
            <span className="elo-place-view-place-pill">
              <MapPin
                size={12}
              />

              <span>
                PLACE
              </span>
            </span>

            {owner
              ?.is_local_partner && (
              <span className="elo-place-view-partner-badge">
                <CheckCircle2
                  size={13}
                />

                <span>
                  LOCAL PARTNER
                </span>
              </span>
            )}
          </div>

          <div
            className="elo-place-view-open-panel"
            style={{
              backgroundColor:
                accent,
              color:
                textOnAccent,
            }}
          >
            <i
              style={{
                backgroundColor:
                  openState.state ===
                  "open"
                    ? "#7DFFD0"
                    : openState.state ===
                        "closed"
                      ? "#FFC1BC"
                      : "#FFFFFF",
              }}
            />

            <span>
              {heroOpenLabel}
            </span>
          </div>

          <div className="elo-place-view-hero-bottom">
            <div className="elo-place-view-hero-eyebrow">
              SOMEWHERE TO GO
            </div>

            <h1>
              {place.title}
            </h1>

            {place.location_name && (
              <div className="elo-place-view-hero-location">
                <Navigation
                  size={15}
                />

                <span>
                  {place.location_name}
                </span>
              </div>
            )}

            {photos.length > 0 && (
              <div className="elo-place-view-hero-footer">
                <span>
                  {photos.length ===
                  1
                    ? "View photo"
                    : `View ${photos.length} photos`}
                </span>

                <span className="elo-place-view-hero-arrow">
                  <ChevronRight
                    size={17}
                  />
                </span>
              </div>
            )}
          </div>
        </button>

        {place.description && (
          <section className="elo-place-view-section">
            <div className="elo-place-view-section-eyebrow">
              ABOUT
            </div>

            <h2>
              About this Place
            </h2>

            <p className="elo-place-view-description">
              {place.description}
            </p>
          </section>
        )}

        {locationText && (
          <section className="elo-place-view-section">
            <div className="elo-place-view-section-eyebrow">
              LOCATION
            </div>

            <div className="elo-place-view-location-card">
              <div
                className="elo-place-view-location-icon"
                style={{
                  backgroundColor:
                    hexToRgba(
                      accent,
                      0.11
                    ),
                  color:
                    accent,
                }}
              >
                <MapPin
                  size={23}
                />
              </div>

              <div className="elo-place-view-location-body">
                <strong>
                  {place.location_name ??
                    "Location"}
                </strong>

                <span>
                  {[
                    place.address,
                    place.postcode,
                  ]
                    .filter(Boolean)
                    .join(", ") ||
                    place.location_name}
                </span>
              </div>
            </div>

            <button
              type="button"
              className="elo-place-view-directions"
              style={{
                backgroundColor:
                  accent,
                color:
                  textOnAccent,
              }}
              onClick={
                openDirections
              }
            >
              <Navigation
                size={19}
              />

              <span>
                Get directions
              </span>
            </button>
          </section>
        )}

        <section className="elo-place-view-section">
          <div className="elo-place-view-hours-title-row">
            <div>
              <div className="elo-place-view-section-eyebrow">
                OPENING HOURS
              </div>

              <h2>
                When to visit
              </h2>
            </div>

            <span
              className="elo-place-view-open-badge"
              style={{
                backgroundColor:
                  openState.state ===
                  "open"
                    ? "#E5F6ED"
                    : openState.state ===
                        "closed"
                      ? "#FDEBE9"
                      : "#ECEFED",
                color:
                  openState.state ===
                  "open"
                    ? "#126A46"
                    : openState.state ===
                        "closed"
                      ? "#9D2118"
                      : "#68736F",
              }}
            >
              <i
                style={{
                  backgroundColor:
                    openState.state ===
                    "open"
                      ? "#168254"
                      : openState.state ===
                          "closed"
                        ? "#B42318"
                        : "#76817D",
                }}
              />

              <span>
                {openState.state ===
                "open"
                  ? "OPEN"
                  : openState.state ===
                      "closed"
                    ? "CLOSED"
                    : "HOURS"}
              </span>
            </span>
          </div>

          {place.is_24_7 ? (
            <div
              className="elo-place-view-all-day"
              style={{
                backgroundColor:
                  hexToRgba(
                    accent,
                    0.09
                  ),
              }}
            >
              <Clock3
                size={23}
                color={accent}
              />

              <div>
                <strong>
                  Open 24 hours
                </strong>

                <span>
                  This Place is listed as open 24/7.
                </span>
              </div>
            </div>
          ) : (
            <div className="elo-place-view-hours-list">
              {DAY_ROWS.map(
                ([
                  key,
                  label,
                ]) => {
                  const today =
                    key ===
                    getTodayKey();

                  return (
                    <div
                      key={key}
                      className="elo-place-view-hours-row"
                      style={
                        today
                          ? {
                              backgroundColor:
                                hexToRgba(
                                  accent,
                                  0.07
                                ),
                            }
                          : undefined
                      }
                    >
                      <span
                        className="elo-place-view-hours-day"
                        style={
                          today
                            ? {
                                color:
                                  accent,
                              }
                            : undefined
                        }
                      >
                        {label}
                      </span>

                      <span
                        className="elo-place-view-hours-value"
                        style={
                          today
                            ? {
                                color:
                                  accent,
                                fontWeight:
                                  900,
                              }
                            : undefined
                        }
                      >
                        {dayLabel(
                          place
                            .opening_hours?.[
                            key
                          ]
                        )}
                      </span>
                    </div>
                  );
                }
              )}
            </div>
          )}
        </section>

        {photos.length > 1 && (
          <section className="elo-place-view-section">
            <div className="elo-place-view-gallery-header">
              <div>
                <div className="elo-place-view-section-eyebrow">
                  PHOTOS
                </div>

                <h2>
                  Gallery
                </h2>
              </div>

              <span>
                {photos.length}
              </span>
            </div>

            <div className="elo-place-view-gallery-grid">
              {photos.map(
                (
                  image,
                  index
                ) => (
                  <button
                    key={`${image}-${index}`}
                    type="button"
                    className="elo-place-view-gallery-tile"
                    onClick={() =>
                      setGalleryIndex(
                        index
                      )
                    }
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={image}
                      alt=""
                    />
                  </button>
                )
              )}
            </div>
          </section>
        )}

        {owner && (
          <section className="elo-place-view-section">
            <div className="elo-place-view-section-eyebrow">
              LISTED BY
            </div>

            <button
              type="button"
              className="elo-place-view-owner-card"
              onClick={
                openOwnerPage
              }
            >
              {owner.logo_url ? (
                <span className="elo-place-view-owner-logo-wrap">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={
                      owner.logo_url
                    }
                    alt=""
                  />
                </span>
              ) : (
                <span
                  className="elo-place-view-owner-logo-fallback"
                  style={{
                    backgroundColor:
                      hexToRgba(
                        accent,
                        0.1
                      ),
                    color:
                      accent,
                  }}
                >
                  <Store
                    size={22}
                  />
                </span>
              )}

              <span className="elo-place-view-owner-body">
                <span className="elo-place-view-owner-name-row">
                  <strong>
                    {owner.name}
                  </strong>

                  {owner.is_local_partner && (
                    <CheckCircle2
                      size={17}
                      color={
                        accent
                      }
                    />
                  )}
                </span>

                <span
                  className="elo-place-view-owner-link"
                  style={{
                    color:
                      accent,
                  }}
                >
                  View ELO Page
                </span>
              </span>

              <ChevronRight
                size={20}
              />
            </button>
          </section>
        )}

        <div className="elo-place-view-footer-note">
          <Info
            size={18}
          />

          <p>
            Opening hours and Place information are provided by the organisation listing this Place.
          </p>
        </div>
      </section>

      {galleryIndex !== null && (
        <div
          className="elo-place-view-gallery-modal"
          role="dialog"
          aria-modal="true"
          aria-label="Place photo gallery"
          onMouseDown={(event) => {
            if (
              event.currentTarget ===
              event.target
            ) {
              setGalleryIndex(
                null
              );
            }
          }}
        >
          <button
            type="button"
            className="elo-place-view-gallery-close"
            onClick={() =>
              setGalleryIndex(
                null
              )
            }
            aria-label="Close gallery"
          >
            <X
              size={27}
            />
          </button>

          {selectedPhoto && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={
                selectedPhoto
              }
              alt=""
              className="elo-place-view-gallery-modal-image"
            />
          )}

          <div className="elo-place-view-gallery-controls">
            <button
              type="button"
              disabled={
                galleryIndex ===
                0
              }
              onClick={() =>
                setGalleryIndex(
                  (current) =>
                    current ===
                    null
                      ? null
                      : Math.max(
                          0,
                          current - 1
                        )
                )
              }
              aria-label="Previous photo"
            >
              <ChevronLeft
                size={25}
              />
            </button>

            <span>
              {galleryIndex + 1} / {photos.length}
            </span>

            <button
              type="button"
              disabled={
                galleryIndex ===
                photos.length - 1
              }
              onClick={() =>
                setGalleryIndex(
                  (current) =>
                    current ===
                    null
                      ? null
                      : Math.min(
                          photos.length - 1,
                          current + 1
                        )
                )
              }
              aria-label="Next photo"
            >
              <ChevronRight
                size={25}
              />
            </button>
          </div>
        </div>
      )}

      <style>{styles}</style>
    </main>
  );
}

const styles = `
  .elo-place-view-page {
    min-height: 100dvh;
    background: #F4F5F4;
    color: #17221F;
    font-family: var(--font-geist-sans), Arial, sans-serif;
  }

  .elo-place-view-page *,
  .elo-place-view-page *::before,
  .elo-place-view-page *::after {
    box-sizing: border-box;
  }

  .elo-place-view-page button {
    font: inherit;
  }

  .elo-place-view-shell {
    width: 100%;
    max-width: 760px;
    margin: 0 auto;
    padding-bottom: 130px;
  }

  .elo-place-view-loading {
    min-height: 68vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 10px;
    color: #005744;
  }

  .elo-place-view-loading span {
    color: #74807C;
    font-size: 12px;
    font-weight: 700;
  }

  .elo-place-view-unavailable {
    min-height: 68vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 28px;
    color: #005744;
    text-align: center;
  }

  .elo-place-view-unavailable h1 {
    margin: 11px 0 0;
    color: #16231F;
    font-size: 21px;
    font-weight: 900;
  }

  .elo-place-view-unavailable p {
    max-width: 350px;
    margin: 5px 0 0;
    color: #76817D;
    font-size: 13px;
    line-height: 19px;
  }

  .elo-place-view-hero {
    position: relative;
    width: 100%;
    height: 350px;
    display: block;
    overflow: hidden;
    border: 0;
    border-radius: 0;
    padding: 0;
    background: #111111;
    text-align: left;
  }

  .elo-place-view-hero.is-clickable {
    cursor: pointer;
  }

  .elo-place-view-hero-image,
  .elo-place-view-hero-fallback {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
  }

  .elo-place-view-hero-image {
    display: block;
    object-fit: cover;
  }

  .elo-place-view-hero-fallback {
    display: flex;
    align-items: center;
    justify-content: center;
    color: rgba(255,255,255,.72);
  }

  .elo-place-view-hero-overlay {
    position: absolute;
    inset: 0;
    background: rgba(0,0,0,.36);
  }

  .elo-place-view-hero-top {
    position: absolute;
    top: 16px;
    left: 16px;
    right: 16px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
  }

  .elo-place-view-place-pill,
  .elo-place-view-partner-badge {
    min-height: 28px;
    display: inline-flex;
    align-items: center;
    gap: 5px;
    border-radius: 4px;
    padding: 0 9px;
  }

  .elo-place-view-place-pill {
    background: #FFFFFF;
    color: #005744;
  }

  .elo-place-view-place-pill span {
    font-size: 9px;
    font-weight: 900;
    letter-spacing: 1px;
  }

  .elo-place-view-partner-badge {
    background: rgba(0,0,0,.52);
    color: #FFFFFF;
  }

  .elo-place-view-partner-badge span {
    font-size: 8px;
    font-weight: 900;
    letter-spacing: .45px;
  }

  .elo-place-view-open-panel {
    position: absolute;
    top: 60px;
    right: 0;
    max-width: 78%;
    min-height: 37px;
    display: flex;
    align-items: center;
    gap: 7px;
    border-radius: 6px 0 0 6px;
    padding: 0 15px 0 11px;
  }

  .elo-place-view-open-panel i {
    width: 7px;
    height: 7px;
    flex: 0 0 7px;
    border-radius: 50%;
  }

  .elo-place-view-open-panel span {
    overflow: hidden;
    font-size: 11px;
    font-weight: 900;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .elo-place-view-hero-bottom {
    position: absolute;
    left: 18px;
    right: 18px;
    bottom: 18px;
  }

  .elo-place-view-hero-eyebrow {
    margin-bottom: 6px;
    color: rgba(255,255,255,.72);
    font-size: 9px;
    font-weight: 900;
    letter-spacing: 1.4px;
  }

  .elo-place-view-hero-bottom h1 {
    max-width: 94%;
    margin: 0;
    color: #FFFFFF;
    font-size: 36px;
    line-height: 39px;
    font-weight: 900;
    letter-spacing: -.8px;
  }

  .elo-place-view-hero-location {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-top: 8px;
    color: rgba(255,255,255,.82);
  }

  .elo-place-view-hero-location span {
    overflow: hidden;
    font-size: 12px;
    font-weight: 700;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .elo-place-view-hero-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-top: 16px;
    color: #FFFFFF;
  }

  .elo-place-view-hero-footer > span:first-child {
    font-size: 12px;
    font-weight: 800;
  }

  .elo-place-view-hero-arrow {
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    background: #FFFFFF;
    color: #111111;
  }

  .elo-place-view-section {
    border-bottom: 1px solid #D9DFDC;
    padding: 25px 18px;
  }

  .elo-place-view-section-eyebrow {
    margin-bottom: 5px;
    color: #84908C;
    font-size: 8px;
    font-weight: 900;
    letter-spacing: 1.2px;
  }

  .elo-place-view-section h2 {
    margin: 0;
    color: #16231F;
    font-size: 21px;
    line-height: 26px;
    font-weight: 900;
    letter-spacing: -.35px;
  }

  .elo-place-view-description {
    margin: 12px 0 0;
    color: #40504A;
    font-size: 15px;
    line-height: 23px;
  }

  .elo-place-view-location-card {
    min-height: 82px;
    display: flex;
    align-items: center;
    margin-top: 14px;
    border: 1px solid #E1E6E4;
    border-radius: 17px;
    background: #FFFFFF;
    padding: 13px;
  }

  .elo-place-view-location-icon {
    width: 48px;
    height: 48px;
    flex: 0 0 48px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 15px;
  }

  .elo-place-view-location-body {
    min-width: 0;
    flex: 1;
    display: flex;
    flex-direction: column;
    margin-left: 12px;
  }

  .elo-place-view-location-body strong {
    color: #1B2925;
    font-size: 14px;
    font-weight: 900;
  }

  .elo-place-view-location-body span {
    margin-top: 4px;
    color: #74807C;
    font-size: 11px;
    line-height: 16px;
    font-weight: 600;
  }

  .elo-place-view-directions {
    width: 100%;
    height: 52px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    margin-top: 10px;
    border: 0;
    border-radius: 15px;
    cursor: pointer;
  }

  .elo-place-view-directions span {
    font-size: 12px;
    font-weight: 900;
  }

  .elo-place-view-hours-title-row {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 12px;
  }

  .elo-place-view-open-badge {
    min-height: 31px;
    display: flex;
    align-items: center;
    gap: 5px;
    border-radius: 10px;
    padding: 0 9px;
  }

  .elo-place-view-open-badge i {
    width: 6px;
    height: 6px;
    border-radius: 50%;
  }

  .elo-place-view-open-badge span {
    font-size: 8px;
    font-weight: 900;
    letter-spacing: .7px;
  }

  .elo-place-view-all-day {
    min-height: 74px;
    display: flex;
    align-items: center;
    margin-top: 15px;
    border-radius: 16px;
    padding: 14px;
  }

  .elo-place-view-all-day > div {
    display: flex;
    flex-direction: column;
    margin-left: 11px;
  }

  .elo-place-view-all-day strong {
    color: #17241F;
    font-size: 14px;
    font-weight: 900;
  }

  .elo-place-view-all-day span {
    margin-top: 3px;
    color: #74807C;
    font-size: 10px;
    font-weight: 600;
  }

  .elo-place-view-hours-list {
    overflow: hidden;
    margin-top: 14px;
    border: 1px solid #E1E6E4;
    border-radius: 17px;
    background: #FFFFFF;
  }

  .elo-place-view-hours-row {
    min-height: 48px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 14px;
    border-bottom: 1px solid #E5E9E7;
    padding: 0 14px;
  }

  .elo-place-view-hours-row:last-child {
    border-bottom: 0;
  }

  .elo-place-view-hours-day {
    color: #35443F;
    font-size: 12px;
    font-weight: 800;
  }

  .elo-place-view-hours-value {
    flex: 1;
    color: #68736F;
    font-size: 11px;
    font-weight: 700;
    text-align: right;
  }

  .elo-place-view-gallery-header {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    margin-bottom: 14px;
  }

  .elo-place-view-gallery-header > span {
    color: #84908C;
    font-size: 11px;
    font-weight: 800;
  }

  .elo-place-view-gallery-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 8px;
  }

  .elo-place-view-gallery-tile {
    aspect-ratio: 1;
    overflow: hidden;
    border: 0;
    border-radius: 14px;
    background: #E2E6E4;
    padding: 0;
    cursor: pointer;
  }

  .elo-place-view-gallery-tile img {
    width: 100%;
    height: 100%;
    display: block;
    object-fit: cover;
  }

  .elo-place-view-owner-card {
    width: 100%;
    min-height: 82px;
    display: flex;
    align-items: center;
    margin-top: 13px;
    border: 1px solid #E1E6E4;
    border-radius: 17px;
    background: #FFFFFF;
    padding: 12px;
    text-align: left;
    cursor: pointer;
  }

  .elo-place-view-owner-logo-wrap,
  .elo-place-view-owner-logo-fallback {
    width: 54px;
    height: 54px;
    flex: 0 0 54px;
    overflow: hidden;
    border-radius: 50%;
  }

  .elo-place-view-owner-logo-wrap {
    border: 1px solid #E3E7E5;
    background: #FFFFFF;
  }

  .elo-place-view-owner-logo-wrap img {
    width: 100%;
    height: 100%;
    display: block;
    object-fit: contain;
    background: #FFFFFF;
  }

  .elo-place-view-owner-logo-fallback {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .elo-place-view-owner-body {
    min-width: 0;
    flex: 1;
    display: flex;
    flex-direction: column;
    margin: 0 12px;
  }

  .elo-place-view-owner-name-row {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .elo-place-view-owner-name-row strong {
    overflow: hidden;
    color: #17241F;
    font-size: 14px;
    line-height: 18px;
    font-weight: 900;
    text-overflow: ellipsis;
  }

  .elo-place-view-owner-link {
    margin-top: 4px;
    font-size: 10px;
    font-weight: 900;
  }

  .elo-place-view-owner-card > svg {
    flex: 0 0 auto;
    color: #A1AAA6;
  }

  .elo-place-view-footer-note {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    margin: 18px 18px 0;
    color: #7E8985;
  }

  .elo-place-view-footer-note svg {
    flex: 0 0 auto;
  }

  .elo-place-view-footer-note p {
    margin: 0;
    color: #7E8985;
    font-size: 10px;
    line-height: 16px;
    font-weight: 600;
  }

  .elo-place-view-gallery-modal {
    position: fixed;
    z-index: 2400;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0,0,0,.96);
    padding: 72px 24px 100px;
  }

  .elo-place-view-gallery-close {
    position: absolute;
    z-index: 2;
    top: 22px;
    right: 22px;
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

  .elo-place-view-gallery-modal-image {
    width: min(100%, 1000px);
    height: 76vh;
    display: block;
    object-fit: contain;
  }

  .elo-place-view-gallery-controls {
    position: absolute;
    left: 24px;
    right: 24px;
    bottom: 34px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 20px;
  }

  .elo-place-view-gallery-controls button {
    width: 48px;
    height: 48px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 0;
    border-radius: 50%;
    background: rgba(255,255,255,.12);
    color: #FFFFFF;
    cursor: pointer;
  }

  .elo-place-view-gallery-controls button:disabled {
    opacity: .28;
    cursor: default;
  }

  .elo-place-view-gallery-controls span {
    min-width: 72px;
    color: #FFFFFF;
    font-size: 12px;
    font-weight: 800;
    text-align: center;
  }

  .elo-place-view-page button:focus {
    outline: none;
  }

  .elo-place-view-page button:focus-visible {
    outline: 2px solid #9EAEA7;
    outline-offset: 2px;
  }

  .elo-place-view-spin {
    animation: elo-place-view-spin .8s linear infinite;
  }

  @keyframes elo-place-view-spin {
    to {
      transform: rotate(360deg);
    }
  }

  @media (max-width: 520px) {
    .elo-place-view-hero-bottom h1 {
      font-size: 32px;
      line-height: 35px;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .elo-place-view-spin {
      animation: none;
    }
  }
`;

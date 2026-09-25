"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  ChevronDown,
  Clock3,
  ImagePlus,
  Layers3,
  LoaderCircle,
  MapPin,
  Store,
  X,
} from "lucide-react";

import SiteHeader from "@/components/SiteHeader";
import { createClient } from "@/lib/supabase/client";

const IMAGE_BUCKET = "place-images";
const MAX_IMAGES = 3;

const DAYS = [
  { key: "monday", label: "Monday" },
  { key: "tuesday", label: "Tuesday" },
  { key: "wednesday", label: "Wednesday" },
  { key: "thursday", label: "Thursday" },
  { key: "friday", label: "Friday" },
  { key: "saturday", label: "Saturday" },
  { key: "sunday", label: "Sunday" },
] as const;

type DayKey =
  (typeof DAYS)[number]["key"];

type DayHours = {
  open: string;
  close: string;
  closed: boolean;
};

type OpeningHours =
  Record<DayKey, DayHours>;

type SelectedImage = {
  id: string;
  file: File;
  previewUrl: string;
  mimeType: string;
  extension: string;
};

type OwnerPage = {
  id: string;
  name: string;
  brand_color: string | null;
  status: string | null;
  place_enabled: boolean | null;
};

const DEFAULT_OPENING_HOURS: OpeningHours = {
  monday: {
    open: "09:00",
    close: "17:00",
    closed: false,
  },
  tuesday: {
    open: "09:00",
    close: "17:00",
    closed: false,
  },
  wednesday: {
    open: "09:00",
    close: "17:00",
    closed: false,
  },
  thursday: {
    open: "09:00",
    close: "17:00",
    closed: false,
  },
  friday: {
    open: "09:00",
    close: "17:00",
    closed: false,
  },
  saturday: {
    open: "09:00",
    close: "17:00",
    closed: true,
  },
  sunday: {
    open: "09:00",
    close: "17:00",
    closed: true,
  },
};

const TIME_OPTIONS = Array.from(
  { length: 96 },
  (_, index) => {
    const minutes =
      index * 15;

    const hour =
      Math.floor(
        minutes / 60
      );

    const minute =
      minutes % 60;

    return `${String(hour).padStart(
      2,
      "0"
    )}:${String(minute).padStart(
      2,
      "0"
    )}`;
  }
);

function timeToMinutes(
  value: string
) {
  const [
    hour,
    minute,
  ] =
    value
      .split(":")
      .map(Number);

  return (
    hour * 60 +
    minute
  );
}

function validTime(
  value: string
) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(
    value.trim()
  );
}

function openingHoursInOrder(
  open: string,
  close: string
) {
  if (
    !validTime(open) ||
    !validTime(close)
  ) {
    return false;
  }

  return (
    timeToMinutes(close) >
    timeToMinutes(open)
  );
}

function makeUuid() {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }

  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(
    /[xy]/g,
    (char) => {
      const random =
        Math.floor(
          Math.random() * 16
        );

      const value =
        char === "x"
          ? random
          : (random & 0x3) | 0x8;

      return value.toString(16);
    }
  );
}

function createSlug(
  value: string
) {
  return value
    .toLowerCase()
    .trim()
    .replace(
      /['’]/g,
      ""
    )
    .replace(
      /[^a-z0-9]+/g,
      "-"
    )
    .replace(
      /^-+|-+$/g,
      ""
    )
    .slice(0, 70);
}

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

function fileExtension(
  file: File
) {
  const fromName =
    file.name
      .split(".")
      .pop()
      ?.toLowerCase()
      .replace(
        /[^a-z0-9]/g,
        ""
      );

  if (fromName) {
    if (fromName === "jpeg") {
      return "jpg";
    }

    if (
      fromName === "jpg" ||
      fromName === "png" ||
      fromName === "webp"
    ) {
      return fromName;
    }
  }

  if (
    file.type === "image/png"
  ) {
    return "png";
  }

  if (
    file.type === "image/webp"
  ) {
    return "webp";
  }

  return "jpg";
}

function FieldLabel({
  children,
  optional = false,
}: {
  children: ReactNode;
  optional?: boolean;
}) {
  return (
    <div className="elo-create-place-label-row">
      <label>
        {children}
      </label>

      {optional && (
        <span>
          OPTIONAL
        </span>
      )}
    </div>
  );
}

export default function CreatePlacePage() {
  const router =
    useRouter();

  const supabase =
    useMemo(
      () => createClient(),
      []
    );

  const fileInputRef =
    useRef<HTMLInputElement | null>(
      null
    );

  const [
    loadingAccess,
    setLoadingAccess,
  ] =
    useState(true);

  const [
    ownerPage,
    setOwnerPage,
  ] =
    useState<
      OwnerPage | null
    >(null);

  const [
    title,
    setTitle,
  ] =
    useState("");

  const [
    description,
    setDescription,
  ] =
    useState("");

  const [
    town,
    setTown,
  ] =
    useState("");

  const [
    address,
    setAddress,
  ] =
    useState("");

  const [
    postcode,
    setPostcode,
  ] =
    useState("");

  const [
    open247,
    setOpen247,
  ] =
    useState(false);

  const [
    openingHours,
    setOpeningHours,
  ] =
    useState<OpeningHours>(
      DEFAULT_OPENING_HOURS
    );

  const [
    images,
    setImages,
  ] =
    useState<SelectedImage[]>(
      []
    );

  const [
    submitting,
    setSubmitting,
  ] =
    useState(false);

  const [
    errorMessage,
    setErrorMessage,
  ] =
    useState<
      string | null
    >(null);

  useEffect(() => {
    let active = true;

    async function loadAccess() {
      setLoadingAccess(true);

      try {
        const {
          data:
            sessionData,
          error:
            sessionError,
        } =
          await supabase
            .auth
            .getSession();

        if (
          sessionError
        ) {
          throw sessionError;
        }

        const user =
          sessionData
            .session
            ?.user;

        if (!user) {
          throw new Error(
            "You need to be signed in."
          );
        }

        const {
          data,
          error,
        } =
          await supabase
            .from("groups")
            .select(
              "id, name, brand_color, status, place_enabled"
            )
            .eq(
              "user_id",
              user.id
            )
            .eq(
              "status",
              "approved"
            )
            .eq(
              "place_enabled",
              true
            )
            .order(
              "created_at",
              {
                ascending:
                  true,
              }
            )
            .limit(1)
            .maybeSingle();

        if (error) {
          throw error;
        }

        if (!active) {
          return;
        }

        setOwnerPage(
          (
            data ??
            null
          ) as
            | OwnerPage
            | null
        );
      } catch (error) {
        console.error(
          "Create Place access error:",
          error
        );

        if (active) {
          setOwnerPage(null);

          setErrorMessage(
            error instanceof Error
              ? error.message
              : "Place access could not be checked."
          );
        }
      } finally {
        if (active) {
          setLoadingAccess(false);
        }
      }
    }

    void loadAccess();

    return () => {
      active = false;
    };
  }, [
    supabase,
  ]);

  useEffect(() => {
    return () => {
      images.forEach(
        (image) =>
          URL.revokeObjectURL(
            image.previewUrl
          )
      );
    };
  }, [
    images,
  ]);

  const accent =
    normaliseHex(
      ownerPage
        ?.brand_color
    );

  const remainingImages =
    MAX_IMAGES -
    images.length;

  const formReady =
    useMemo(
      () =>
        Boolean(
          title.trim() &&
          town.trim() &&
          address.trim() &&
          postcode.trim() &&
          images.length > 0
        ),
      [
        title,
        town,
        address,
        postcode,
        images.length,
      ]
    );

  function updateHours(
    day: DayKey,
    update:
      Partial<DayHours>
  ) {
    setOpeningHours(
      (current) => ({
        ...current,
        [day]: {
          ...current[day],
          ...update,
        },
      })
    );
  }

  function chooseImages(
    event:
      ChangeEvent<HTMLInputElement>
  ) {
    const selectedFiles =
      Array.from(
        event.target.files ??
        []
      );

    event.target.value = "";

    if (
      selectedFiles.length === 0 ||
      remainingImages <= 0
    ) {
      return;
    }

    const accepted =
      selectedFiles
        .filter(
          (file) =>
            file.type ===
              "image/jpeg" ||
            file.type ===
              "image/png" ||
            file.type ===
              "image/webp"
        )
        .slice(
          0,
          remainingImages
        );

    if (
      accepted.length === 0
    ) {
      setErrorMessage(
        "Choose JPG, PNG or WebP images."
      );

      return;
    }

    const next =
      accepted.map(
        (
          file
        ): SelectedImage => ({
          id: makeUuid(),
          file,
          previewUrl:
            URL.createObjectURL(
              file
            ),
          mimeType:
            file.type ||
            "image/jpeg",
          extension:
            fileExtension(
              file
            ),
        })
      );

    setImages(
      (current) => [
        ...current,
        ...next,
      ]
    );

    setErrorMessage(null);
  }

  function removeImage(
    imageId: string
  ) {
    setImages(
      (current) => {
        const removed =
          current.find(
            (item) =>
              item.id ===
              imageId
          );

        if (removed) {
          URL.revokeObjectURL(
            removed.previewUrl
          );
        }

        return current.filter(
          (item) =>
            item.id !==
            imageId
        );
      }
    );
  }

  async function uploadImage(
    image: SelectedImage,
    userId: string,
    placeId: string
  ) {
    const path =
      `${userId}/${placeId}/${makeUuid()}.${image.extension}`;

    const {
      error,
    } =
      await supabase
        .storage
        .from(
          IMAGE_BUCKET
        )
        .upload(
          path,
          image.file,
          {
            contentType:
              image.mimeType,
            cacheControl:
              "31536000",
            upsert: false,
          }
        );

    if (error) {
      throw new Error(
        `Image upload failed: ${error.message}`
      );
    }

    const {
      data,
    } =
      supabase
        .storage
        .from(
          IMAGE_BUCKET
        )
        .getPublicUrl(
          path
        );

    return {
      path,
      url:
        data.publicUrl,
    };
  }

  function validateHours() {
    if (open247) {
      return true;
    }

    for (
      const day of DAYS
    ) {
      const hours =
        openingHours[
          day.key
        ];

      if (
        hours.closed
      ) {
        continue;
      }

      if (
        !validTime(
          hours.open
        ) ||
        !validTime(
          hours.close
        )
      ) {
        setErrorMessage(
          `${day.label} needs times in 24-hour HH:MM format.`
        );

        return false;
      }

      if (
        !openingHoursInOrder(
          hours.open,
          hours.close
        )
      ) {
        setErrorMessage(
          `${day.label} must close after it opens.`
        );

        return false;
      }
    }

    return true;
  }

  async function createPlace() {
    if (submitting) {
      return;
    }

    setErrorMessage(null);

    if (!ownerPage) {
      setErrorMessage(
        "Places are not enabled for your Page."
      );

      return;
    }

    const cleanTitle =
      title.trim();

    const cleanTown =
      town.trim();

    const cleanAddress =
      address.trim();

    const cleanPostcode =
      postcode
        .trim()
        .toUpperCase();

    if (!cleanTitle) {
      setErrorMessage(
        "Add the name of this Place."
      );

      return;
    }

    if (!cleanTown) {
      setErrorMessage(
        "Add the town or village this Place is in."
      );

      return;
    }

    if (
      !cleanAddress ||
      !cleanPostcode
    ) {
      setErrorMessage(
        "Add the full address and postcode."
      );

      return;
    }

    if (
      images.length === 0
    ) {
      setErrorMessage(
        "Add at least one image of this Place."
      );

      return;
    }

    if (
      !validateHours()
    ) {
      return;
    }

    setSubmitting(true);

    let createdPlaceId:
      string | null =
        null;

    const uploadedPaths:
      string[] = [];

    try {
      const {
        data:
          sessionData,
        error:
          sessionError,
      } =
        await supabase
          .auth
          .getSession();

      if (
        sessionError
      ) {
        throw sessionError;
      }

      const user =
        sessionData
          .session
          ?.user;

      if (!user) {
        throw new Error(
          "You need to be signed in."
        );
      }

      const {
        data:
          eligiblePage,
        error:
          pageError,
      } =
        await supabase
          .from(
            "groups"
          )
          .select(
            "id, status, place_enabled"
          )
          .eq(
            "id",
            ownerPage.id
          )
          .eq(
            "user_id",
            user.id
          )
          .eq(
            "status",
            "approved"
          )
          .eq(
            "place_enabled",
            true
          )
          .maybeSingle();

      if (
        pageError
      ) {
        throw pageError;
      }

      if (
        !eligiblePage
      ) {
        throw new Error(
          "Places are not enabled for this Page."
        );
      }

      const slug =
        `${
          createSlug(
            cleanTitle
          ) ||
          "place"
        }-${makeUuid().slice(
          0,
          8
        )}`;

      const {
        data:
          createdPlace,
        error:
          createError,
      } =
        await supabase
          .from(
            "places"
          )
          .insert({
            page_id:
              ownerPage.id,
            title:
              cleanTitle,
            description:
              description
                .trim() ||
              null,
            location_name:
              cleanTown,
            address:
              cleanAddress,
            postcode:
              cleanPostcode,
            images: [],
            is_24_7:
              open247,
            opening_hours:
              open247
                ? {}
                : openingHours,
            metadata: {},
            is_active:
              true,
            slug,
          })
          .select(
            "id"
          )
          .single();

      if (
        createError
      ) {
        throw createError;
      }

      createdPlaceId =
        createdPlace.id;

      const imageUrls:
        string[] = [];

      for (
        const image of
        images
      ) {
        const uploaded =
          await uploadImage(
            image,
            user.id,
            createdPlace.id
          );

        uploadedPaths.push(
          uploaded.path
        );

        imageUrls.push(
          uploaded.url
        );
      }

      const {
        error:
          updateError,
      } =
        await supabase
          .from(
            "places"
          )
          .update({
            images:
              imageUrls,
          })
          .eq(
            "id",
            createdPlace.id
          )
          .eq(
            "page_id",
            ownerPage.id
          );

      if (
        updateError
      ) {
        throw updateError;
      }

      createdPlaceId =
        null;

      uploadedPaths.splice(
        0,
        uploadedPaths.length
      );

      router.push(
        `/places/${encodeURIComponent(
          slug
        )}`
      );

      router.refresh();
    } catch (error) {
      if (
        uploadedPaths.length >
        0
      ) {
        await supabase
          .storage
          .from(
            IMAGE_BUCKET
          )
          .remove(
            uploadedPaths
          );
      }

      if (
        createdPlaceId
      ) {
        await supabase
          .from(
            "places"
          )
          .delete()
          .eq(
            "id",
            createdPlaceId
          );
      }

      console.error(
        "Unable to create Place:",
        error
      );

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to create Place. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (
    loadingAccess
  ) {
    return (
      <main className="elo-create-place-page">
        <SiteHeader />

        <div className="elo-create-place-loading">
          <LoaderCircle
            size={31}
            className="elo-create-place-spin"
          />

          <span>
            Checking Place access...
          </span>
        </div>

        <style>{styles}</style>
      </main>
    );
  }

  if (!ownerPage) {
    return (
      <main className="elo-create-place-page">
        <SiteHeader />

        <div className="elo-create-place-unavailable">
          <div className="elo-create-place-unavailable-icon">
            <MapPin
              size={31}
            />
          </div>

          <h1>
            Places aren&apos;t enabled
          </h1>

          <p>
            This tool is only available to approved Pages with Places enabled.
          </p>
        </div>

        <style>{styles}</style>
      </main>
    );
  }

  return (
    <main className="elo-create-place-page">
      <SiteHeader />

      <section className="elo-create-place-shell">
        <header className="elo-create-place-intro">
          <div className="elo-create-place-eyebrow">
            CREATE PLACE
          </div>

          <h1>
            Add somewhere to go.
          </h1>

          <p>
            Add a shop, venue, branch, attraction or other physical location belonging to your Page.
          </p>
        </header>

        <div
          className="elo-create-place-owner-card"
          style={{
            borderColor:
              accent,
          }}
        >
          <div
            className="elo-create-place-owner-icon"
            style={{
              backgroundColor:
                accent,
            }}
          >
            <Store
              size={20}
            />
          </div>

          <div className="elo-create-place-owner-text">
            <span>
              CREATING FOR
            </span>

            <strong>
              {ownerPage.name}
            </strong>
          </div>

          <CheckCircle2
            size={20}
            color={accent}
          />
        </div>

        <div className="elo-create-place-unlimited">
          <Layers3
            size={20}
          />

          <p>
            You can create as many Places as your organisation needs — useful for multiple branches or locations.
          </p>
        </div>

        {errorMessage && (
          <div
            className="elo-create-place-error"
            role="alert"
          >
            <span>
              {errorMessage}
            </span>

            <button
              type="button"
              onClick={() =>
                setErrorMessage(
                  null
                )
              }
              aria-label="Dismiss error"
            >
              <X size={16} />
            </button>
          </div>
        )}

        <div className="elo-create-place-form">
          <section className="elo-create-place-field">
            <FieldLabel>
              Place name
            </FieldLabel>

            <input
              value={title}
              onChange={(event) =>
                setTitle(
                  event.target.value
                )
              }
              placeholder="e.g. Haddington High Street"
              maxLength={120}
              disabled={submitting}
            />
          </section>

          <section className="elo-create-place-field">
            <FieldLabel optional>
              Description
            </FieldLabel>

            <textarea
              value={description}
              onChange={(event) =>
                setDescription(
                  event.target.value
                )
              }
              placeholder="What can people find here?"
              maxLength={1200}
              disabled={submitting}
            />
          </section>

          <section className="elo-create-place-field">
            <FieldLabel>
              Town or village
            </FieldLabel>

            <div className="elo-create-place-icon-input">
              <MapPin
                size={20}
              />

              <input
                value={town}
                onChange={(event) =>
                  setTown(
                    event.target.value
                  )
                }
                placeholder="Haddington"
                disabled={submitting}
              />
            </div>
          </section>

          <section className="elo-create-place-field">
            <FieldLabel>
              Address
            </FieldLabel>

            <input
              value={address}
              onChange={(event) =>
                setAddress(
                  event.target.value
                )
              }
              placeholder="Full street address"
              disabled={submitting}
            />

            <input
              className="elo-create-place-postcode"
              value={postcode}
              onChange={(event) =>
                setPostcode(
                  event.target.value
                    .toUpperCase()
                )
              }
              placeholder="Postcode"
              maxLength={9}
              autoCapitalize="characters"
              disabled={submitting}
            />
          </section>

          <section className="elo-create-place-field">
            <div className="elo-create-place-hours-heading">
              <div>
                <FieldLabel>
                  Opening hours
                </FieldLabel>

                <p>
                  Choose opening and closing times in 15-minute steps.
                </p>
              </div>
            </div>

            <label className="elo-create-place-open247">
              <span className="elo-create-place-open247-icon">
                <Clock3
                  size={21}
                />
              </span>

              <span className="elo-create-place-open247-copy">
                <strong>
                  Open 24/7
                </strong>

                <small>
                  Ignore individual opening hours.
                </small>
              </span>

              <span className="elo-create-place-switch">
                <input
                  type="checkbox"
                  checked={open247}
                  onChange={(event) =>
                    setOpen247(
                      event.target.checked
                    )
                  }
                  disabled={submitting}
                />

                <i />
              </span>
            </label>

            {!open247 && (
              <div className="elo-create-place-days">
                {DAYS.map(
                  (day) => {
                    const hours =
                      openingHours[
                        day.key
                      ];

                    const openOptions =
                      TIME_OPTIONS.filter(
                        (value) =>
                          timeToMinutes(
                            value
                          ) <
                          timeToMinutes(
                            hours.close
                          )
                      );

                    const closeOptions =
                      TIME_OPTIONS.filter(
                        (value) =>
                          timeToMinutes(
                            value
                          ) >
                          timeToMinutes(
                            hours.open
                          )
                      );

                    return (
                      <div
                        key={
                          day.key
                        }
                        className="elo-create-place-day-card"
                      >
                        <div className="elo-create-place-day-top">
                          <strong>
                            {day.label}
                          </strong>

                          <button
                            type="button"
                            className={
                              hours.closed
                                ? "is-closed"
                                : ""
                            }
                            onClick={() =>
                              updateHours(
                                day.key,
                                {
                                  closed:
                                    !hours.closed,
                                }
                              )
                            }
                            disabled={submitting}
                          >
                            {hours.closed
                              ? "Closed"
                              : "Open"}
                          </button>
                        </div>

                        {!hours.closed && (
                          <div className="elo-create-place-time-row">
                            <label>
                              <span>
                                OPENS
                              </span>

                              <div className="elo-create-place-select-wrap">
                                <select
                                  value={
                                    hours.open
                                  }
                                  onChange={(event) =>
                                    updateHours(
                                      day.key,
                                      {
                                        open:
                                          event.target.value,
                                      }
                                    )
                                  }
                                  disabled={submitting}
                                >
                                  {openOptions.map(
                                    (value) => (
                                      <option
                                        key={
                                          value
                                        }
                                        value={
                                          value
                                        }
                                      >
                                        {value}
                                      </option>
                                    )
                                  )}
                                </select>

                                <ChevronDown
                                  size={15}
                                />
                              </div>
                            </label>

                            <i />

                            <label>
                              <span>
                                CLOSES
                              </span>

                              <div className="elo-create-place-select-wrap">
                                <select
                                  value={
                                    hours.close
                                  }
                                  onChange={(event) =>
                                    updateHours(
                                      day.key,
                                      {
                                        close:
                                          event.target.value,
                                      }
                                    )
                                  }
                                  disabled={submitting}
                                >
                                  {closeOptions.map(
                                    (value) => (
                                      <option
                                        key={
                                          value
                                        }
                                        value={
                                          value
                                        }
                                      >
                                        {value}
                                      </option>
                                    )
                                  )}
                                </select>

                                <ChevronDown
                                  size={15}
                                />
                              </div>
                            </label>
                          </div>
                        )}
                      </div>
                    );
                  }
                )}
              </div>
            )}
          </section>

          <section className="elo-create-place-field">
            <div className="elo-create-place-gallery-heading">
              <div>
                <FieldLabel>
                  Photos
                </FieldLabel>

                <p>
                  Add at least one photo, up to three.
                </p>
              </div>

              <span>
                {images.length}/{MAX_IMAGES}
              </span>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              className="elo-create-place-file-input"
              onChange={chooseImages}
            />

            <div className="elo-create-place-gallery">
              {images.map(
                (image) => (
                  <div
                    key={
                      image.id
                    }
                    className="elo-create-place-gallery-tile"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={
                        image.previewUrl
                      }
                      alt=""
                    />

                    <button
                      type="button"
                      onClick={() =>
                        removeImage(
                          image.id
                        )
                      }
                      disabled={submitting}
                      aria-label="Remove image"
                    >
                      <X
                        size={18}
                      />
                    </button>
                  </div>
                )
              )}

              {remainingImages > 0 && (
                <button
                  type="button"
                  className="elo-create-place-add-image"
                  onClick={() =>
                    fileInputRef.current
                      ?.click()
                  }
                  disabled={submitting}
                >
                  <ImagePlus
                    size={25}
                  />

                  <span>
                    Add photos
                  </span>
                </button>
              )}
            </div>
          </section>

          <button
            type="button"
            className="elo-create-place-submit"
            disabled={
              submitting ||
              !formReady
            }
            onClick={() =>
              void createPlace()
            }
          >
            {submitting ? (
              <LoaderCircle
                size={20}
                className="elo-create-place-spin"
              />
            ) : (
              <MapPin
                size={20}
              />
            )}

            <span>
              {submitting
                ? "Creating Place..."
                : "Create Place"}
            </span>
          </button>

          <p className="elo-create-place-submit-note">
            Places go live immediately under your approved ELO Page.
          </p>
        </div>
      </section>

      <style>{styles}</style>
    </main>
  );
}

const styles = `
  .elo-create-place-page {
    min-height: 100dvh;
    background: #F4F5F4;
    color: #17221F;
    font-family: var(--font-geist-sans), Arial, sans-serif;
  }

  .elo-create-place-page *,
  .elo-create-place-page *::before,
  .elo-create-place-page *::after {
    box-sizing: border-box;
  }

  .elo-create-place-page button,
  .elo-create-place-page input,
  .elo-create-place-page textarea,
  .elo-create-place-page select {
    font: inherit;
  }

  .elo-create-place-shell {
    width: 100%;
    max-width: 760px;
    margin: 0 auto;
    padding-bottom: 135px;
  }

  .elo-create-place-loading {
    min-height: 68vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 10px;
    color: #005744;
  }

  .elo-create-place-loading span {
    color: #74807C;
    font-size: 11px;
    font-weight: 700;
  }

  .elo-create-place-unavailable {
    min-height: 68vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 28px;
    text-align: center;
  }

  .elo-create-place-unavailable-icon {
    width: 64px;
    height: 64px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 20px;
    background: #E6F1ED;
    color: #005744;
  }

  .elo-create-place-unavailable h1 {
    margin: 14px 0 0;
    color: #192722;
    font-size: 22px;
    font-weight: 900;
  }

  .elo-create-place-unavailable p {
    max-width: 310px;
    margin: 6px 0 0;
    color: #74807C;
    font-size: 13px;
    line-height: 20px;
  }

  .elo-create-place-intro {
    padding: 24px 18px 18px;
  }

  .elo-create-place-eyebrow {
    margin-bottom: 7px;
    color: #005744;
    font-size: 9px;
    font-weight: 900;
    letter-spacing: 1.3px;
  }

  .elo-create-place-intro h1 {
    margin: 0;
    color: #111614;
    font-size: 29px;
    line-height: 34px;
    font-weight: 900;
    letter-spacing: -.7px;
  }

  .elo-create-place-intro p {
    margin: 8px 0 0;
    color: #68736F;
    font-size: 14px;
    line-height: 21px;
  }

  .elo-create-place-owner-card {
    min-height: 72px;
    display: flex;
    align-items: center;
    margin: 0 18px 12px;
    border: 1px solid;
    border-radius: 16px;
    background: #FFFFFF;
    padding: 12px;
  }

  .elo-create-place-owner-icon {
    width: 44px;
    height: 44px;
    flex: 0 0 44px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 13px;
    color: #FFFFFF;
  }

  .elo-create-place-owner-text {
    min-width: 0;
    flex: 1;
    display: flex;
    flex-direction: column;
    margin: 0 11px;
  }

  .elo-create-place-owner-text span {
    color: #8A9591;
    font-size: 7px;
    font-weight: 900;
    letter-spacing: 1px;
  }

  .elo-create-place-owner-text strong {
    overflow: hidden;
    margin-top: 3px;
    color: #1C2925;
    font-size: 14px;
    font-weight: 900;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .elo-create-place-unlimited {
    display: flex;
    align-items: flex-start;
    gap: 9px;
    margin: 0 18px 8px;
    border-radius: 15px;
    background: #EAF4F0;
    padding: 13px;
    color: #005744;
  }

  .elo-create-place-unlimited svg {
    flex: 0 0 auto;
  }

  .elo-create-place-unlimited p {
    flex: 1;
    margin: 0;
    color: #45675C;
    font-size: 11px;
    line-height: 17px;
    font-weight: 600;
  }

  .elo-create-place-error {
    display: flex;
    align-items: center;
    gap: 10px;
    margin: 12px 18px 0;
    border-radius: 13px;
    background: #FDECEA;
    padding: 10px 11px 10px 13px;
    color: #A52B21;
    font-size: 11px;
    line-height: 17px;
    font-weight: 700;
  }

  .elo-create-place-error > span {
    flex: 1;
  }

  .elo-create-place-error button {
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 0;
    border-radius: 8px;
    background: transparent;
    color: inherit;
    cursor: pointer;
  }

  .elo-create-place-form {
    padding: 0 18px;
  }

  .elo-create-place-field {
    padding: 20px 0;
    border-bottom: 1px solid #D6DDDA;
  }

  .elo-create-place-label-row {
    min-height: 20px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 9px;
  }

  .elo-create-place-label-row label {
    color: #1C2925;
    font-size: 13px;
    font-weight: 900;
  }

  .elo-create-place-label-row span {
    color: #97A09D;
    font-size: 7px;
    font-weight: 900;
    letter-spacing: 1px;
  }

  .elo-create-place-field > input,
  .elo-create-place-field > textarea {
    width: 100%;
    min-height: 54px;
    border: 1px solid #D5DCDA;
    border-radius: 14px;
    outline: none;
    background: #FFFFFF;
    padding: 0 15px;
    color: #17221F;
    font-size: 14px;
    font-weight: 600;
  }

  .elo-create-place-field > textarea {
    min-height: 132px;
    resize: vertical;
    padding-top: 14px;
    padding-bottom: 14px;
    line-height: 21px;
  }

  .elo-create-place-field > input:focus,
  .elo-create-place-field > textarea:focus,
  .elo-create-place-icon-input:focus-within,
  .elo-create-place-select-wrap:focus-within {
    border-color: #9FACAA;
  }

  .elo-create-place-postcode {
    margin-top: 9px;
  }

  .elo-create-place-icon-input {
    min-height: 54px;
    display: flex;
    align-items: center;
    gap: 9px;
    border: 1px solid #D5DCDA;
    border-radius: 14px;
    background: #FFFFFF;
    padding: 0 14px;
    color: #68736F;
  }

  .elo-create-place-icon-input input {
    min-width: 0;
    flex: 1;
    min-height: 52px;
    border: 0;
    outline: 0;
    background: transparent;
    color: #17221F;
    font-size: 14px;
    font-weight: 600;
  }

  .elo-create-place-hours-heading p,
  .elo-create-place-gallery-heading p {
    margin: -5px 0 0;
    color: #8A9591;
    font-size: 10px;
    line-height: 15px;
  }

  .elo-create-place-open247 {
    min-height: 72px;
    display: flex;
    align-items: center;
    margin-top: 14px;
    border: 1px solid #D5DCDA;
    border-radius: 16px;
    background: #FFFFFF;
    padding: 12px;
    cursor: pointer;
  }

  .elo-create-place-open247-icon {
    width: 42px;
    height: 42px;
    flex: 0 0 42px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 13px;
    background: #E8F2EE;
    color: #005744;
  }

  .elo-create-place-open247-copy {
    min-width: 0;
    flex: 1;
    display: flex;
    flex-direction: column;
    margin: 0 10px;
  }

  .elo-create-place-open247-copy strong {
    color: #1B2824;
    font-size: 13px;
    font-weight: 900;
  }

  .elo-create-place-open247-copy small {
    margin-top: 3px;
    color: #89938F;
    font-size: 10px;
  }

  .elo-create-place-switch {
    position: relative;
    width: 46px;
    height: 27px;
    flex: 0 0 46px;
  }

  .elo-create-place-switch input {
    position: absolute;
    opacity: 0;
    pointer-events: none;
  }

  .elo-create-place-switch i {
    position: absolute;
    inset: 0;
    border-radius: 999px;
    background: #D3DAD7;
    transition: background 120ms ease;
  }

  .elo-create-place-switch i::after {
    content: "";
    position: absolute;
    top: 3px;
    left: 3px;
    width: 21px;
    height: 21px;
    border-radius: 50%;
    background: #FFFFFF;
    box-shadow: 0 1px 3px rgba(0,0,0,.15);
    transition: transform 120ms ease;
  }

  .elo-create-place-switch input:checked + i {
    background: #82B8A8;
  }

  .elo-create-place-switch input:checked + i::after {
    transform: translateX(19px);
    background: #005744;
  }

  .elo-create-place-days {
    display: grid;
    gap: 9px;
    margin-top: 12px;
  }

  .elo-create-place-day-card {
    border: 1px solid #DDE3E0;
    border-radius: 15px;
    background: #FFFFFF;
    padding: 12px;
  }

  .elo-create-place-day-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .elo-create-place-day-top > strong {
    color: #23302C;
    font-size: 12px;
    font-weight: 900;
  }

  .elo-create-place-day-top button {
    min-width: 62px;
    min-height: 30px;
    border: 0;
    border-radius: 9px;
    background: #E8F2EE;
    padding: 0 10px;
    color: #005744;
    font-size: 9px;
    font-weight: 900;
    cursor: pointer;
  }

  .elo-create-place-day-top button.is-closed {
    background: #F0F1F0;
    color: #7F8985;
  }

  .elo-create-place-time-row {
    display: flex;
    align-items: flex-end;
    gap: 8px;
    margin-top: 11px;
  }

  .elo-create-place-time-row > label {
    min-width: 0;
    flex: 1;
  }

  .elo-create-place-time-row > label > span {
    display: block;
    margin-bottom: 5px;
    color: #929C98;
    font-size: 7px;
    font-weight: 900;
    letter-spacing: .8px;
  }

  .elo-create-place-time-row > i {
    width: 10px;
    height: 1px;
    flex: 0 0 10px;
    margin-bottom: 22px;
    background: #9AA39F;
  }

  .elo-create-place-select-wrap {
    position: relative;
    height: 45px;
    display: flex;
    align-items: center;
    border: 1px solid #D9DFDC;
    border-radius: 11px;
    background: #F8F9F8;
  }

  .elo-create-place-select-wrap select {
    width: 100%;
    height: 100%;
    appearance: none;
    border: 0;
    outline: 0;
    background: transparent;
    padding: 0 34px 0 12px;
    color: #1B2824;
    font-size: 13px;
    font-weight: 800;
    cursor: pointer;
  }

  .elo-create-place-select-wrap svg {
    position: absolute;
    right: 11px;
    pointer-events: none;
    color: #6E7974;
  }

  .elo-create-place-gallery-heading {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
  }

  .elo-create-place-gallery-heading > span {
    margin-top: 2px;
    color: #84908C;
    font-size: 10px;
    font-weight: 800;
  }

  .elo-create-place-file-input {
    display: none;
  }

  .elo-create-place-gallery {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 9px;
    margin-top: 10px;
  }

  .elo-create-place-gallery-tile,
  .elo-create-place-add-image {
    position: relative;
    aspect-ratio: 1;
    overflow: hidden;
    border-radius: 14px;
  }

  .elo-create-place-gallery-tile {
    background: #E5EAE7;
  }

  .elo-create-place-gallery-tile img {
    width: 100%;
    height: 100%;
    display: block;
    object-fit: cover;
  }

  .elo-create-place-gallery-tile button {
    position: absolute;
    top: 6px;
    right: 6px;
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 0;
    border-radius: 50%;
    background: rgba(0,0,0,.72);
    color: #FFFFFF;
    cursor: pointer;
  }

  .elo-create-place-add-image {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    border: 1px dashed #A7B4AF;
    background: #F8F9F8;
    color: #005744;
    cursor: pointer;
  }

  .elo-create-place-add-image span {
    margin-top: 5px;
    font-size: 9px;
    font-weight: 900;
  }

  .elo-create-place-submit {
    width: 100%;
    height: 57px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 9px;
    margin-top: 26px;
    border: 0;
    border-radius: 15px;
    background: #005744;
    color: #FFFFFF;
    font-size: 13px;
    font-weight: 900;
    cursor: pointer;
  }

  .elo-create-place-submit:disabled {
    opacity: .55;
    cursor: not-allowed;
  }

  .elo-create-place-submit-note {
    margin: 10px 0 0;
    color: #8B9692;
    font-size: 10px;
    text-align: center;
  }

  .elo-create-place-page button:focus {
    outline: none;
  }

  .elo-create-place-page button:focus-visible {
    outline: 2px solid #9EAEA7;
    outline-offset: 2px;
  }

  .elo-create-place-spin {
    animation: elo-create-place-spin .8s linear infinite;
  }

  @keyframes elo-create-place-spin {
    to {
      transform: rotate(360deg);
    }
  }

  @media (max-width: 520px) {
    .elo-create-place-gallery {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }
  }

  @media (max-width: 390px) {
    .elo-create-place-time-row {
      align-items: stretch;
      flex-direction: column;
    }

    .elo-create-place-time-row > i {
      display: none;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .elo-create-place-spin {
      animation: none;
    }

    .elo-create-place-switch i,
    .elo-create-place-switch i::after {
      transition: none;
    }
  }
`;
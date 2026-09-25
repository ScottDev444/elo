"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type ReactNode,
} from "react";
import {
  AlertTriangle,
  Check,
  ChevronDown,
  Clock3,
  Eye,
  ImagePlus,
  LoaderCircle,
  Trash2,
  X,
} from "lucide-react";
import {
  useParams,
  useRouter,
} from "next/navigation";

import SiteHeader from "@/components/SiteHeader";
import { createClient } from "@/lib/supabase/client";

const IMAGE_BUCKET = "place-images";
const MAX_IMAGES = 3;

const DAYS = [
  ["monday", "Monday"],
  ["tuesday", "Tuesday"],
  ["wednesday", "Wednesday"],
  ["thursday", "Thursday"],
  ["friday", "Friday"],
  ["saturday", "Saturday"],
  ["sunday", "Sunday"],
] as const;

type DayKey =
  (typeof DAYS)[number][0];

type DayHours = {
  open: string;
  close: string;
  closed: boolean;
};

type OpeningHours =
  Record<DayKey, DayHours>;

type NewImage = {
  id: string;
  file: File;
  previewUrl: string;
  mimeType: string;
  extension: string;
};

type PlaceRow = {
  id: string;
  page_id: string | null;
  title: string;
  description: string | null;
  location_name: string | null;
  address: string | null;
  postcode: string | null;
  images: unknown;
  is_24_7: boolean | null;
  opening_hours: unknown;
  is_active: boolean;
  slug: string | null;
};

const DEFAULT_HOURS: OpeningHours = {
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

const TIME_OPTIONS =
  Array.from(
    {
      length: 96,
    },
    (_, index) => {
      const minutes =
        index * 15;

      const hour =
        Math.floor(
          minutes / 60
        );

      const minute =
        minutes % 60;

      return `${String(
        hour
      ).padStart(
        2,
        "0"
      )}:${String(
        minute
      ).padStart(
        2,
        "0"
      )}`;
    }
  );

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
          !item ||
          typeof item !==
            "object" ||
          Array.isArray(item)
        ) {
          return null;
        }

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
    )
    .filter(
      (
        item
      ): item is string =>
        Boolean(item)
    );
}

function normaliseHours(
  value: unknown
): OpeningHours {
  if (
    !value ||
    typeof value !==
      "object" ||
    Array.isArray(value)
  ) {
    return {
      ...DEFAULT_HOURS,
    };
  }

  const source =
    value as Record<
      string,
      unknown
    >;

  const output =
    {
      ...DEFAULT_HOURS,
    } as OpeningHours;

  for (
    const [key] of DAYS
  ) {
    const raw =
      source[key];

    if (
      !raw ||
      typeof raw !==
        "object" ||
      Array.isArray(raw)
    ) {
      continue;
    }

    const day =
      raw as Record<
        string,
        unknown
      >;

    output[key] = {
      open:
        typeof day.open ===
        "string"
          ? day.open
          : DEFAULT_HOURS[
              key
            ].open,
      close:
        typeof day.close ===
        "string"
          ? day.close
          : DEFAULT_HOURS[
              key
            ].close,
      closed:
        day.closed === true,
    };
  }

  return output;
}

function validTime(
  value: string
) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(
    value.trim()
  );
}

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

function storagePathFromPublicUrl(
  url: string
) {
  const marker =
    `/storage/v1/object/public/${IMAGE_BUCKET}/`;

  const index =
    url.indexOf(
      marker
    );

  if (index === -1) {
    return null;
  }

  try {
    return decodeURIComponent(
      url.slice(
        index +
          marker.length
      )
    );
  } catch {
    return url.slice(
      index +
        marker.length
    );
  }
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

  if (
    fromName === "png" ||
    fromName === "webp" ||
    fromName === "jpg"
  ) {
    return fromName;
  }

  if (
    fromName === "jpeg"
  ) {
    return "jpg";
  }

  if (
    file.type ===
    "image/png"
  ) {
    return "png";
  }

  if (
    file.type ===
    "image/webp"
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
    <div className="elo-edit-place-label-row">
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

export default function EditPlacePage() {
  const router =
    useRouter();

  const params =
    useParams<{
      id?:
        | string
        | string[];
    }>();

  const placeId =
    Array.isArray(
      params.id
    )
      ? params.id[0]
      : params.id;

  const supabase =
    useMemo(
      () => createClient(),
      []
    );

  const fileInputRef =
    useRef<HTMLInputElement | null>(
      null
    );

  const newImagesRef =
    useRef<NewImage[]>(
      []
    );

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
    pageId,
    setPageId,
  ] =
    useState<
      string | null
    >(null);

  const [
    slug,
    setSlug,
  ] =
    useState<
      string | null
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
      DEFAULT_HOURS
    );

  const [
    isActive,
    setIsActive,
  ] =
    useState(true);

  const [
    originalImages,
    setOriginalImages,
  ] =
    useState<string[]>(
      []
    );

  const [
    keptImages,
    setKeptImages,
  ] =
    useState<string[]>(
      []
    );

  const [
    newImages,
    setNewImages,
  ] =
    useState<NewImage[]>(
      []
    );

  const [
    saving,
    setSaving,
  ] =
    useState(false);

  const [
    formError,
    setFormError,
  ] =
    useState<
      string | null
    >(null);

  const [
    saveMessage,
    setSaveMessage,
  ] =
    useState<
      string | null
    >(null);

  const [
    deleteOpen,
    setDeleteOpen,
  ] =
    useState(false);

  const [
    deleteText,
    setDeleteText,
  ] =
    useState("");

  const [
    deleting,
    setDeleting,
  ] =
    useState(false);

  useEffect(() => {
    newImagesRef.current =
      newImages;
  }, [
    newImages,
  ]);

  useEffect(() => {
    return () => {
      newImagesRef.current.forEach(
        (image) =>
          URL.revokeObjectURL(
            image.previewUrl
          )
      );
    };
  }, []);

  useEffect(() => {
    let active = true;

    async function loadPlace() {
      setLoading(true);
      setLoadError(null);

      try {
        if (!placeId) {
          throw new Error(
            "No Place was selected."
          );
        }

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
          router.replace(
            `/log-in?next=${encodeURIComponent(
              `/edit-place/${placeId}`
            )}`
          );

          return;
        }

        const {
          data:
            pageData,
          error:
            pageError,
        } =
          await supabase
            .from("groups")
            .select("id")
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

        if (
          pageError
        ) {
          throw pageError;
        }

        if (!pageData) {
          throw new Error(
            "Places are not enabled for your Page."
          );
        }

        const {
          data,
          error,
        } =
          await supabase
            .from("places")
            .select(`
              id,
              page_id,
              title,
              description,
              location_name,
              address,
              postcode,
              images,
              is_24_7,
              opening_hours,
              is_active,
              slug
            `)
            .eq(
              "id",
              placeId
            )
            .eq(
              "page_id",
              pageData.id
            )
            .maybeSingle();

        if (error) {
          throw error;
        }

        if (!data) {
          throw new Error(
            "That Place could not be found."
          );
        }

        if (!active) {
          return;
        }

        const place =
          data as PlaceRow;

        const images =
          normaliseImages(
            place.images
          );

        setPageId(
          pageData.id
        );

        setSlug(
          place.slug
        );

        setTitle(
          place.title ??
            ""
        );

        setDescription(
          place.description ??
            ""
        );

        setTown(
          place.location_name ??
            ""
        );

        setAddress(
          place.address ??
            ""
        );

        setPostcode(
          place.postcode ??
            ""
        );

        setOpen247(
          place.is_24_7 ===
            true
        );

        setOpeningHours(
          normaliseHours(
            place.opening_hours
          )
        );

        setIsActive(
          place.is_active !==
            false
        );

        setOriginalImages(
          images
        );

        setKeptImages(
          images
        );

        setNewImages(
          []
        );
      } catch (error) {
        console.error(
          "Edit Place load error:",
          error
        );

        if (active) {
          setLoadError(
            error instanceof
            Error
              ? error.message
              : "Unable to open Place."
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadPlace();

    return () => {
      active = false;
    };
  }, [
    placeId,
    router,
    supabase,
  ]);

  const totalImages =
    keptImages.length +
    newImages.length;

  const remainingImages =
    MAX_IMAGES -
    totalImages;

  const canDelete =
    deleteText.trim() ===
    "DELETE";

  const formReady =
    useMemo(
      () =>
        Boolean(
          title.trim() &&
          town.trim() &&
          address.trim() &&
          postcode.trim() &&
          totalImages > 0
        ),
      [
        title,
        town,
        address,
        postcode,
        totalImages,
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

  function handleImagesSelected(
    event:
      ChangeEvent<HTMLInputElement>
  ) {
    const selectedFiles =
      Array.from(
        event.target.files ??
          []
      );

    event.target.value =
      "";

    if (
      selectedFiles.length ===
        0 ||
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
      setFormError(
        "Choose JPG, PNG or WebP images."
      );

      return;
    }

    const next =
      accepted.map(
        (
          file
        ): NewImage => ({
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

    setNewImages(
      (current) => [
        ...current,
        ...next,
      ]
    );

    setFormError(null);
    setSaveMessage(null);
  }

  function removeNewImage(
    id: string
  ) {
    setNewImages(
      (current) => {
        const removed =
          current.find(
            (image) =>
              image.id ===
              id
          );

        if (removed) {
          URL.revokeObjectURL(
            removed.previewUrl
          );
        }

        return current.filter(
          (image) =>
            image.id !==
            id
        );
      }
    );
  }

  async function uploadImage(
    image: NewImage,
    userId: string,
    targetPlaceId: string
  ) {
    const path =
      `${userId}/${targetPlaceId}/${makeUuid()}.${image.extension}`;

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
      const [
        key,
        label,
      ] of DAYS
    ) {
      const hours =
        openingHours[
          key
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
        setFormError(
          `${label} needs times in 24-hour HH:MM format.`
        );

        return false;
      }

      if (
        !openingHoursInOrder(
          hours.open,
          hours.close
        )
      ) {
        setFormError(
          `${label} must close after it opens.`
        );

        return false;
      }
    }

    return true;
  }

  async function savePlace() {
    if (
      saving ||
      !placeId ||
      !pageId
    ) {
      return;
    }

    setFormError(null);
    setSaveMessage(null);

    if (!title.trim()) {
      setFormError(
        "Add the name of this Place."
      );

      return;
    }

    if (!town.trim()) {
      setFormError(
        "Add the town or village."
      );

      return;
    }

    if (
      !address.trim() ||
      !postcode.trim()
    ) {
      setFormError(
        "Add the full address and postcode."
      );

      return;
    }

    if (
      totalImages === 0
    ) {
      setFormError(
        "Keep or add at least one Place photo."
      );

      return;
    }

    if (
      !validateHours()
    ) {
      return;
    }

    setSaving(true);

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
          allowedPage,
        error:
          pageError,
      } =
        await supabase
          .from("groups")
          .select(
            "id, status, place_enabled"
          )
          .eq(
            "id",
            pageId
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

      if (!allowedPage) {
        throw new Error(
          "Places are not enabled for your Page."
        );
      }

      const uploadedUrls:
        string[] = [];

      for (
        const image of
        newImages
      ) {
        const uploaded =
          await uploadImage(
            image,
            user.id,
            placeId
          );

        uploadedPaths.push(
          uploaded.path
        );

        uploadedUrls.push(
          uploaded.url
        );
      }

      const finalImages = [
        ...keptImages,
        ...uploadedUrls,
      ];

      const {
        error,
      } =
        await supabase
          .from("places")
          .update({
            title:
              title.trim(),
            description:
              description
                .trim() ||
              null,
            location_name:
              town.trim(),
            address:
              address.trim(),
            postcode:
              postcode
                .trim()
                .toUpperCase(),
            images:
              finalImages,
            is_24_7:
              open247,
            opening_hours:
              open247
                ? {}
                : openingHours,
            is_active:
              isActive,
          })
          .eq(
            "id",
            placeId
          )
          .eq(
            "page_id",
            pageId
          );

      if (error) {
        throw error;
      }

      const removedUrls =
        originalImages.filter(
          (url) =>
            !keptImages.includes(
              url
            )
        );

      const removedPaths =
        removedUrls
          .map(
            storagePathFromPublicUrl
          )
          .filter(
            (
              path
            ): path is string =>
              Boolean(path)
          );

      if (
        removedPaths.length >
        0
      ) {
        const {
          error:
            removeError,
        } =
          await supabase
            .storage
            .from(
              IMAGE_BUCKET
            )
            .remove(
              removedPaths
            );

        if (
          removeError
        ) {
          console.warn(
            "Old Place image cleanup failed:",
            removeError
          );
        }
      }

      newImages.forEach(
        (image) =>
          URL.revokeObjectURL(
            image.previewUrl
          )
      );

      setOriginalImages(
        finalImages
      );

      setKeptImages(
        finalImages
      );

      setNewImages(
        []
      );

      setSaveMessage(
        "Your changes are now live on ELO."
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

      console.error(
        "Unable to update Place:",
        error
      );

      setFormError(
        error instanceof Error
          ? error.message
          : "Unable to update Place. Please try again."
      );
    } finally {
      setSaving(false);
    }
  }

  async function deletePlace() {
    if (
      !canDelete ||
      deleting ||
      !placeId ||
      !pageId
    ) {
      return;
    }

    setDeleting(true);
    setFormError(null);

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
          allowedPage,
        error:
          pageError,
      } =
        await supabase
          .from("groups")
          .select("id")
          .eq(
            "id",
            pageId
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

      if (!allowedPage) {
        throw new Error(
          "You do not have permission to delete this Place."
        );
      }

      const {
        error,
      } =
        await supabase
          .from("places")
          .delete()
          .eq(
            "id",
            placeId
          )
          .eq(
            "page_id",
            pageId
          );

      if (error) {
        throw error;
      }

      const allPaths =
        originalImages
          .map(
            storagePathFromPublicUrl
          )
          .filter(
            (
              path
            ): path is string =>
              Boolean(path)
          );

      if (
        allPaths.length >
        0
      ) {
        const {
          error:
            removeError,
        } =
          await supabase
            .storage
            .from(
              IMAGE_BUCKET
            )
            .remove(
              allPaths
            );

        if (
          removeError
        ) {
          console.warn(
            "Deleted Place image cleanup failed:",
            removeError
          );
        }
      }

      newImages.forEach(
        (image) =>
          URL.revokeObjectURL(
            image.previewUrl
          )
      );

      setDeleteOpen(false);
      setDeleteText("");

      router.push("/");
      router.refresh();
    } catch (error) {
      console.error(
        "Unable to delete Place:",
        error
      );

      setDeleteOpen(false);

      setFormError(
        error instanceof Error
          ? error.message
          : "Unable to delete Place. Please try again."
      );
    } finally {
      setDeleting(false);
    }
  }

  function viewPlace() {
    if (!placeId) {
      return;
    }

    router.push(
      `/places/${encodeURIComponent(
        slug || placeId
      )}`
    );
  }

  if (loading) {
    return (
      <main className="elo-edit-place-page">
        <SiteHeader />

        <div className="elo-edit-place-loading">
          <LoaderCircle
            size={31}
            className="elo-edit-place-spin"
          />

          <span>
            Loading Place...
          </span>
        </div>

        <style>{styles}</style>
      </main>
    );
  }

  if (loadError) {
    return (
      <main className="elo-edit-place-page">
        <SiteHeader />

        <div className="elo-edit-place-unavailable">
          <div className="elo-edit-place-unavailable-icon">
            <AlertTriangle
              size={30}
            />
          </div>

          <h1>
            Unable to open Place
          </h1>

          <p>
            {loadError}
          </p>

          <button
            type="button"
            onClick={() =>
              router.back()
            }
          >
            Back
          </button>
        </div>

        <style>{styles}</style>
      </main>
    );
  }

  return (
    <main className="elo-edit-place-page">
      <SiteHeader />

      <section className="elo-edit-place-shell">
        <header className="elo-edit-place-intro">
          <div className="elo-edit-place-eyebrow">
            EDIT PLACE
          </div>

          <h1>
            {title ||
              "Edit Place"}
          </h1>

          <p>
            Update this location. Changes appear on ELO immediately.
          </p>

          <button
            type="button"
            className="elo-edit-place-view-live"
            onClick={viewPlace}
          >
            <Eye
              size={17}
            />

            <span>
              View live Place
            </span>
          </button>
        </header>

        {formError && (
          <div
            className="elo-edit-place-error"
            role="alert"
          >
            <span>
              {formError}
            </span>

            <button
              type="button"
              aria-label="Dismiss error"
              onClick={() =>
                setFormError(
                  null
                )
              }
            >
              <X
                size={16}
              />
            </button>
          </div>
        )}

        {saveMessage && (
          <div
            className="elo-edit-place-success"
            role="status"
          >
            <Check
              size={16}
            />

            <span>
              {saveMessage}
            </span>
          </div>
        )}

        <div className="elo-edit-place-form">
          <section className="elo-edit-place-field">
            <FieldLabel>
              Place name
            </FieldLabel>

            <input
              value={title}
              onChange={(event) => {
                setTitle(
                  event.target.value
                );

                setSaveMessage(
                  null
                );
              }}
              placeholder="Place name"
              disabled={saving}
            />
          </section>

          <section className="elo-edit-place-field">
            <FieldLabel optional>
              Description
            </FieldLabel>

            <textarea
              value={description}
              onChange={(event) => {
                setDescription(
                  event.target.value
                );

                setSaveMessage(
                  null
                );
              }}
              placeholder="What can people find here?"
              disabled={saving}
            />
          </section>

          <section className="elo-edit-place-field">
            <FieldLabel>
              Town or village
            </FieldLabel>

            <input
              value={town}
              onChange={(event) => {
                setTown(
                  event.target.value
                );

                setSaveMessage(
                  null
                );
              }}
              placeholder="Haddington"
              disabled={saving}
            />
          </section>

          <section className="elo-edit-place-field">
            <FieldLabel>
              Address
            </FieldLabel>

            <input
              value={address}
              onChange={(event) => {
                setAddress(
                  event.target.value
                );

                setSaveMessage(
                  null
                );
              }}
              placeholder="Full street address"
              disabled={saving}
            />

            <input
              className="elo-edit-place-second-input"
              value={postcode}
              onChange={(event) => {
                setPostcode(
                  event.target.value
                    .toUpperCase()
                );

                setSaveMessage(
                  null
                );
              }}
              placeholder="Postcode"
              maxLength={9}
              disabled={saving}
            />
          </section>

          <section className="elo-edit-place-field">
            <FieldLabel>
              Visibility
            </FieldLabel>

            <label className="elo-edit-place-switch-row">
              <span className="elo-edit-place-switch-icon">
                <Eye
                  size={20}
                />
              </span>

              <span className="elo-edit-place-switch-copy">
                <strong>
                  Visible on ELO
                </strong>

                <small>
                  Turn this off to temporarily hide the Place without deleting it.
                </small>
              </span>

              <span className="elo-edit-place-switch">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(event) => {
                    setIsActive(
                      event.target.checked
                    );

                    setSaveMessage(
                      null
                    );
                  }}
                  disabled={saving}
                />

                <i />
              </span>
            </label>
          </section>

          <section className="elo-edit-place-field">
            <FieldLabel>
              Opening hours
            </FieldLabel>

            <label className="elo-edit-place-switch-row">
              <span className="elo-edit-place-switch-icon">
                <Clock3
                  size={20}
                />
              </span>

              <span className="elo-edit-place-switch-copy">
                <strong>
                  Open 24/7
                </strong>

                <small>
                  Ignore individual opening hours.
                </small>
              </span>

              <span className="elo-edit-place-switch">
                <input
                  type="checkbox"
                  checked={open247}
                  onChange={(event) => {
                    setOpen247(
                      event.target.checked
                    );

                    setSaveMessage(
                      null
                    );
                  }}
                  disabled={saving}
                />

                <i />
              </span>
            </label>

            {!open247 && (
              <div className="elo-edit-place-days">
                {DAYS.map(
                  ([
                    key,
                    label,
                  ]) => {
                    const hours =
                      openingHours[
                        key
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
                          key
                        }
                        className="elo-edit-place-day-card"
                      >
                        <div className="elo-edit-place-day-top">
                          <strong>
                            {label}
                          </strong>

                          <button
                            type="button"
                            className={
                              hours.closed
                                ? "is-closed"
                                : ""
                            }
                            onClick={() => {
                              updateHours(
                                key,
                                {
                                  closed:
                                    !hours.closed,
                                }
                              );

                              setSaveMessage(
                                null
                              );
                            }}
                            disabled={saving}
                          >
                            {hours.closed
                              ? "Closed"
                              : "Open"}
                          </button>
                        </div>

                        {!hours.closed && (
                          <div className="elo-edit-place-time-row">
                            <label>
                              <span>
                                OPENS
                              </span>

                              <div className="elo-edit-place-select-wrap">
                                <select
                                  value={
                                    hours.open
                                  }
                                  onChange={(event) => {
                                    updateHours(
                                      key,
                                      {
                                        open:
                                          event.target.value,
                                      }
                                    );

                                    setSaveMessage(
                                      null
                                    );
                                  }}
                                  disabled={saving}
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

                              <div className="elo-edit-place-select-wrap">
                                <select
                                  value={
                                    hours.close
                                  }
                                  onChange={(event) => {
                                    updateHours(
                                      key,
                                      {
                                        close:
                                          event.target.value,
                                      }
                                    );

                                    setSaveMessage(
                                      null
                                    );
                                  }}
                                  disabled={saving}
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

          <section className="elo-edit-place-field">
            <div className="elo-edit-place-gallery-heading">
              <div>
                <FieldLabel>
                  Photos
                </FieldLabel>

                <p>
                  Keep at least one, up to three.
                </p>
              </div>

              <span>
                {totalImages}/{MAX_IMAGES}
              </span>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              className="elo-edit-place-file-input"
              onChange={
                handleImagesSelected
              }
            />

            <div className="elo-edit-place-gallery">
              {keptImages.map(
                (url) => (
                  <div
                    key={
                      url
                    }
                    className="elo-edit-place-gallery-tile"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={url}
                      alt=""
                    />

                    <button
                      type="button"
                      aria-label="Remove existing photo"
                      disabled={saving}
                      onClick={() => {
                        setKeptImages(
                          (current) =>
                            current.filter(
                              (item) =>
                                item !==
                                url
                            )
                        );

                        setSaveMessage(
                          null
                        );
                      }}
                    >
                      <X
                        size={18}
                      />
                    </button>
                  </div>
                )
              )}

              {newImages.map(
                (image) => (
                  <div
                    key={
                      image.id
                    }
                    className="elo-edit-place-gallery-tile"
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
                      aria-label="Remove new photo"
                      disabled={saving}
                      onClick={() => {
                        removeNewImage(
                          image.id
                        );

                        setSaveMessage(
                          null
                        );
                      }}
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
                  className="elo-edit-place-add-image"
                  disabled={saving}
                  onClick={() =>
                    fileInputRef.current
                      ?.click()
                  }
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
            className="elo-edit-place-save"
            disabled={
              saving ||
              !formReady
            }
            onClick={() =>
              void savePlace()
            }
          >
            {saving ? (
              <LoaderCircle
                size={20}
                className="elo-edit-place-spin"
              />
            ) : (
              <Check
                size={20}
              />
            )}

            <span>
              {saving
                ? "Saving..."
                : "Save Place"}
            </span>
          </button>

          <section className="elo-edit-place-danger">
            <div className="elo-edit-place-danger-eyebrow">
              DANGER ZONE
            </div>

            <h2>
              Delete this Place
            </h2>

            <p>
              This permanently removes the Place from ELO. This cannot be undone.
            </p>

            <button
              type="button"
              onClick={() => {
                setDeleteText(
                  ""
                );

                setDeleteOpen(
                  true
                );
              }}
            >
              <Trash2
                size={18}
              />

              <span>
                Delete Place
              </span>
            </button>
          </section>
        </div>
      </section>

      {deleteOpen && (
        <div
          className="elo-edit-place-modal-root"
          onMouseDown={(event) => {
            if (
              event.currentTarget ===
                event.target &&
              !deleting
            ) {
              setDeleteOpen(
                false
              );
            }
          }}
        >
          <div
            className="elo-edit-place-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="elo-edit-place-delete-title"
          >
            <div className="elo-edit-place-modal-icon">
              <AlertTriangle
                size={27}
              />
            </div>

            <h2
              id="elo-edit-place-delete-title"
            >
              Delete {title}?
            </h2>

            <p>
              Type DELETE below to permanently remove this Place.
            </p>

            <input
              value={deleteText}
              onChange={(event) =>
                setDeleteText(
                  event.target.value
                    .toUpperCase()
                )
              }
              placeholder="DELETE"
              autoComplete="off"
              spellCheck={false}
              disabled={deleting}
            />

            <button
              type="button"
              className="elo-edit-place-confirm-delete"
              disabled={
                !canDelete ||
                deleting
              }
              onClick={() =>
                void deletePlace()
              }
            >
              {deleting ? (
                <LoaderCircle
                  size={18}
                  className="elo-edit-place-spin"
                />
              ) : (
                <Trash2
                  size={18}
                />
              )}

              <span>
                {deleting
                  ? "Deleting..."
                  : "Delete permanently"}
              </span>
            </button>

            <button
              type="button"
              className="elo-edit-place-cancel-delete"
              disabled={
                deleting
              }
              onClick={() =>
                setDeleteOpen(
                  false
                )
              }
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <style>{styles}</style>
    </main>
  );
}

const styles = `
  .elo-edit-place-page {
    min-height: 100dvh;
    background: #F4F5F4;
    color: #17221F;
    font-family: var(--font-geist-sans), Arial, sans-serif;
  }

  .elo-edit-place-page *,
  .elo-edit-place-page *::before,
  .elo-edit-place-page *::after {
    box-sizing: border-box;
  }

  .elo-edit-place-page button,
  .elo-edit-place-page input,
  .elo-edit-place-page textarea,
  .elo-edit-place-page select {
    font: inherit;
  }

  .elo-edit-place-shell {
    width: 100%;
    max-width: 760px;
    margin: 0 auto;
    padding-bottom: 130px;
  }

  .elo-edit-place-loading {
    min-height: 68vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 10px;
    color: #005744;
  }

  .elo-edit-place-loading span {
    color: #74807C;
    font-size: 11px;
    font-weight: 700;
  }

  .elo-edit-place-unavailable {
    min-height: 68vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 28px;
    text-align: center;
  }

  .elo-edit-place-unavailable-icon {
    width: 64px;
    height: 64px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 20px;
    background: #FDECEA;
    color: #B42318;
  }

  .elo-edit-place-unavailable h1 {
    margin: 14px 0 0;
    color: #192722;
    font-size: 22px;
    font-weight: 900;
  }

  .elo-edit-place-unavailable p {
    max-width: 330px;
    margin: 6px 0 0;
    color: #74807C;
    font-size: 13px;
    line-height: 20px;
  }

  .elo-edit-place-unavailable button {
    min-height: 44px;
    margin-top: 16px;
    border: 0;
    border-radius: 12px;
    background: #005744;
    padding: 0 18px;
    color: #FFFFFF;
    font-size: 11px;
    font-weight: 900;
    cursor: pointer;
  }

  .elo-edit-place-intro {
    padding: 24px 18px 4px;
  }

  .elo-edit-place-eyebrow {
    margin-bottom: 7px;
    color: #005744;
    font-size: 9px;
    font-weight: 900;
    letter-spacing: 1.2px;
  }

  .elo-edit-place-intro h1 {
    margin: 0;
    color: #111614;
    font-size: 29px;
    line-height: 34px;
    font-weight: 900;
    letter-spacing: -.7px;
  }

  .elo-edit-place-intro > p {
    margin: 8px 0 0;
    color: #68736F;
    font-size: 13px;
    line-height: 20px;
  }

  .elo-edit-place-view-live {
    min-height: 40px;
    display: flex;
    align-items: center;
    gap: 6px;
    margin-top: 14px;
    border: 1px solid #C7D8D1;
    border-radius: 11px;
    background: #F7FAF9;
    padding: 0 13px;
    color: #005744;
    cursor: pointer;
  }

  .elo-edit-place-view-live span {
    font-size: 10px;
    font-weight: 900;
  }

  .elo-edit-place-error,
  .elo-edit-place-success {
    display: flex;
    align-items: center;
    gap: 9px;
    margin: 14px 18px 0;
    border-radius: 13px;
    padding: 11px 12px;
    font-size: 11px;
    line-height: 17px;
    font-weight: 700;
  }

  .elo-edit-place-error {
    background: #FDECEA;
    color: #A52B21;
  }

  .elo-edit-place-success {
    background: #E7F3EE;
    color: #005744;
  }

  .elo-edit-place-error > span,
  .elo-edit-place-success > span {
    flex: 1;
  }

  .elo-edit-place-error button {
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

  .elo-edit-place-form {
    padding: 0 18px;
  }

  .elo-edit-place-field {
    padding: 20px 0;
    border-bottom: 1px solid #D6DDDA;
  }

  .elo-edit-place-label-row {
    min-height: 20px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 9px;
  }

  .elo-edit-place-label-row label {
    color: #1C2925;
    font-size: 13px;
    font-weight: 900;
  }

  .elo-edit-place-label-row span {
    color: #97A09D;
    font-size: 7px;
    font-weight: 900;
    letter-spacing: 1px;
  }

  .elo-edit-place-field > input,
  .elo-edit-place-field > textarea {
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

  .elo-edit-place-field > textarea {
    min-height: 132px;
    resize: vertical;
    padding-top: 14px;
    padding-bottom: 14px;
    line-height: 21px;
  }

  .elo-edit-place-field > input:focus,
  .elo-edit-place-field > textarea:focus,
  .elo-edit-place-select-wrap:focus-within {
    border-color: #9FACAA;
  }

  .elo-edit-place-second-input {
    margin-top: 9px;
  }

  .elo-edit-place-switch-row {
    min-height: 72px;
    display: flex;
    align-items: center;
    border: 1px solid #D5DCDA;
    border-radius: 16px;
    background: #FFFFFF;
    padding: 12px;
    cursor: pointer;
  }

  .elo-edit-place-switch-icon {
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

  .elo-edit-place-switch-copy {
    min-width: 0;
    flex: 1;
    display: flex;
    flex-direction: column;
    margin: 0 10px;
  }

  .elo-edit-place-switch-copy strong {
    color: #1B2824;
    font-size: 13px;
    font-weight: 900;
  }

  .elo-edit-place-switch-copy small {
    margin-top: 3px;
    color: #89938F;
    font-size: 10px;
    line-height: 14px;
  }

  .elo-edit-place-switch {
    position: relative;
    width: 46px;
    height: 27px;
    flex: 0 0 46px;
  }

  .elo-edit-place-switch input {
    position: absolute;
    opacity: 0;
    pointer-events: none;
  }

  .elo-edit-place-switch i {
    position: absolute;
    inset: 0;
    border-radius: 999px;
    background: #D3DAD7;
    transition: background 120ms ease;
  }

  .elo-edit-place-switch i::after {
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

  .elo-edit-place-switch input:checked + i {
    background: #82B8A8;
  }

  .elo-edit-place-switch input:checked + i::after {
    transform: translateX(19px);
    background: #005744;
  }

  .elo-edit-place-days {
    display: grid;
    gap: 9px;
    margin-top: 12px;
  }

  .elo-edit-place-day-card {
    border: 1px solid #DDE3E0;
    border-radius: 15px;
    background: #FFFFFF;
    padding: 12px;
  }

  .elo-edit-place-day-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .elo-edit-place-day-top strong {
    color: #23302C;
    font-size: 12px;
    font-weight: 900;
  }

  .elo-edit-place-day-top button {
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

  .elo-edit-place-day-top button.is-closed {
    background: #F0F1F0;
    color: #7F8985;
  }

  .elo-edit-place-time-row {
    display: flex;
    align-items: flex-end;
    gap: 8px;
    margin-top: 11px;
  }

  .elo-edit-place-time-row > label {
    min-width: 0;
    flex: 1;
  }

  .elo-edit-place-time-row > label > span {
    display: block;
    margin-bottom: 5px;
    color: #929C98;
    font-size: 7px;
    font-weight: 900;
    letter-spacing: .8px;
  }

  .elo-edit-place-time-row > i {
    width: 10px;
    height: 1px;
    flex: 0 0 10px;
    margin-bottom: 22px;
    background: #9AA39F;
  }

  .elo-edit-place-select-wrap {
    position: relative;
    height: 45px;
    display: flex;
    align-items: center;
    border: 1px solid #D9DFDC;
    border-radius: 11px;
    background: #F8F9F8;
  }

  .elo-edit-place-select-wrap select {
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

  .elo-edit-place-select-wrap svg {
    position: absolute;
    right: 11px;
    pointer-events: none;
    color: #6E7974;
  }

  .elo-edit-place-gallery-heading {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
  }

  .elo-edit-place-gallery-heading p {
    margin: -5px 0 10px;
    color: #8A9591;
    font-size: 10px;
  }

  .elo-edit-place-gallery-heading > span {
    margin-top: 2px;
    color: #84908C;
    font-size: 10px;
    font-weight: 800;
  }

  .elo-edit-place-file-input {
    display: none;
  }

  .elo-edit-place-gallery {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 9px;
  }

  .elo-edit-place-gallery-tile,
  .elo-edit-place-add-image {
    position: relative;
    aspect-ratio: 1;
    overflow: hidden;
    border-radius: 14px;
  }

  .elo-edit-place-gallery-tile {
    background: #E5EAE7;
  }

  .elo-edit-place-gallery-tile img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .elo-edit-place-gallery-tile button {
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

  .elo-edit-place-add-image {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    border: 1px dashed #A7B4AF;
    background: #F8F9F8;
    color: #005744;
    cursor: pointer;
  }

  .elo-edit-place-add-image span {
    margin-top: 5px;
    font-size: 9px;
    font-weight: 900;
  }

  .elo-edit-place-save {
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

  .elo-edit-place-save:disabled {
    opacity: .65;
    cursor: not-allowed;
  }

  .elo-edit-place-danger {
    margin-top: 28px;
    border: 1px solid #F0C7C3;
    border-radius: 17px;
    background: #FFF8F7;
    padding: 16px;
  }

  .elo-edit-place-danger-eyebrow {
    color: #B42318;
    font-size: 8px;
    font-weight: 900;
    letter-spacing: 1.1px;
  }

  .elo-edit-place-danger h2 {
    margin: 5px 0 0;
    color: #5B1D18;
    font-size: 16px;
    font-weight: 900;
  }

  .elo-edit-place-danger p {
    margin: 5px 0 0;
    color: #8F5C57;
    font-size: 11px;
    line-height: 17px;
  }

  .elo-edit-place-danger > button {
    width: 100%;
    height: 46px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    margin-top: 14px;
    border: 1px solid #E8B7B2;
    border-radius: 12px;
    background: #FFFFFF;
    color: #B42318;
    font-size: 11px;
    font-weight: 900;
    cursor: pointer;
  }

  .elo-edit-place-modal-root {
    position: fixed;
    z-index: 2200;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 22px;
    background: rgba(0,0,0,.52);
  }

  .elo-edit-place-modal {
    width: 100%;
    max-width: 410px;
    border-radius: 22px;
    background: #FFFFFF;
    padding: 20px;
    box-shadow: 0 25px 75px rgba(0,0,0,.22);
  }

  .elo-edit-place-modal-icon {
    width: 52px;
    height: 52px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 16px;
    background: #FDECEA;
    color: #B42318;
  }

  .elo-edit-place-modal h2 {
    margin: 14px 0 0;
    color: #241816;
    font-size: 20px;
    line-height: 25px;
    font-weight: 900;
  }

  .elo-edit-place-modal > p {
    margin: 7px 0 0;
    color: #776A67;
    font-size: 12px;
    line-height: 18px;
  }

  .elo-edit-place-modal > input {
    width: 100%;
    height: 52px;
    margin-top: 16px;
    border: 1px solid #E1B7B2;
    border-radius: 13px;
    outline: none;
    background: #FFF9F8;
    padding: 0 14px;
    color: #B42318;
    font-size: 14px;
    font-weight: 900;
    letter-spacing: 1px;
  }

  .elo-edit-place-confirm-delete {
    width: 100%;
    height: 50px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    margin-top: 12px;
    border: 0;
    border-radius: 13px;
    background: #B42318;
    color: #FFFFFF;
    font-size: 11px;
    font-weight: 900;
    cursor: pointer;
  }

  .elo-edit-place-confirm-delete:disabled {
    opacity: .35;
    cursor: not-allowed;
  }

  .elo-edit-place-cancel-delete {
    width: 100%;
    height: 46px;
    margin-top: 7px;
    border: 0;
    background: transparent;
    color: #57635F;
    font-size: 11px;
    font-weight: 900;
    cursor: pointer;
  }

  .elo-edit-place-page button:focus {
    outline: none;
  }

  .elo-edit-place-page button:focus-visible {
    outline: 2px solid #9EAEA7;
    outline-offset: 2px;
  }

  .elo-edit-place-spin {
    animation: elo-edit-place-spin .8s linear infinite;
  }

  @keyframes elo-edit-place-spin {
    to {
      transform: rotate(360deg);
    }
  }

  @media (max-width: 390px) {
    .elo-edit-place-time-row {
      align-items: stretch;
      flex-direction: column;
    }

    .elo-edit-place-time-row > i {
      display: none;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .elo-edit-place-spin {
      animation: none;
    }

    .elo-edit-place-switch i,
    .elo-edit-place-switch i::after {
      transition: none;
    }
  }
`;

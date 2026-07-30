"use client";

import {
  ChangeEvent,
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Check,
  ImagePlus,
  LoaderCircle,
  Trash2,
} from "lucide-react";

import SiteHeader from "@/components/SiteHeader";
import Footer from "@/components/Footer";
import { createClient } from "@/lib/supabase/client";

const IMAGE_BUCKET = "post-images";
const MAX_IMAGES = 3;
const MAX_IMAGE_SIZE = 8 * 1024 * 1024;

const DAYS = [
  { key: "monday", label: "Monday" },
  { key: "tuesday", label: "Tuesday" },
  { key: "wednesday", label: "Wednesday" },
  { key: "thursday", label: "Thursday" },
  { key: "friday", label: "Friday" },
  { key: "saturday", label: "Saturday" },
  { key: "sunday", label: "Sunday" },
] as const;

type DayKey = (typeof DAYS)[number]["key"];

type DayHours = {
  open: string;
  close: string;
  closed: boolean;
};

type OpeningHours = Record<DayKey, DayHours>;

type PageOption = {
  id: string;
  name: string;
  status: string | null;
  place_enabled: boolean | null;
};

type NewImageItem = {
  id: string;
  file: File;
  previewUrl: string;
};

type ExistingImageItem = {
  id: string;
  url: string;
};

type PlaceRow = {
  id: string;
  page_id: string;
  title: string | null;
  description: string | null;
  address: string | null;
  images: unknown;
  opening_hours: unknown;
  metadata: unknown;
  slug: string | null;
  is_active: boolean | null;
};

const DEFAULT_OPENING_HOURS: OpeningHours = {
  monday: { open: "09:00", close: "17:00", closed: false },
  tuesday: { open: "09:00", close: "17:00", closed: false },
  wednesday: { open: "09:00", close: "17:00", closed: false },
  thursday: { open: "09:00", close: "17:00", closed: false },
  friday: { open: "09:00", close: "17:00", closed: false },
  saturday: { open: "09:00", close: "17:00", closed: true },
  sunday: { open: "09:00", close: "17:00", closed: true },
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}

function isTrue(value: unknown) {
  return (
    value === true ||
    value === "true" ||
    value === 1 ||
    value === "1"
  );
}

function normaliseOpeningHours(value: unknown): OpeningHours {
  if (!isRecord(value)) {
    return DEFAULT_OPENING_HOURS;
  }

  const result = { ...DEFAULT_OPENING_HOURS };

  for (const day of DAYS) {
    const rawDay = value[day.key];

    if (!isRecord(rawDay)) {
      continue;
    }

    result[day.key] = {
      open:
        typeof rawDay.open === "string"
          ? rawDay.open
          : DEFAULT_OPENING_HOURS[day.key].open,
      close:
        typeof rawDay.close === "string"
          ? rawDay.close
          : DEFAULT_OPENING_HOURS[day.key].close,
      closed: isTrue(rawDay.closed),
    };
  }

  return result;
}

function normaliseImageUrls(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(
    (item): item is string =>
      typeof item === "string" &&
      /^https?:\/\//i.test(item.trim()),
  );
}

function getSafeExtension(file: File) {
  const extensions: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
    "image/avif": "avif",
  };

  if (extensions[file.type]) {
    return extensions[file.type];
  }

  const extension = file.name
    .split(".")
    .pop()
    ?.toLowerCase()
    .replace(/[^a-z0-9]/g, "");

  return extension || "jpg";
}

function getUniqueFiles(
  files: File[],
  currentImages: NewImageItem[],
) {
  const existing = new Set(
    currentImages.map(
      ({ file }) =>
        `${file.name}-${file.size}-${file.lastModified}`,
    ),
  );

  return files.filter((file) => {
    const key = `${file.name}-${file.size}-${file.lastModified}`;

    if (existing.has(key)) {
      return false;
    }

    existing.add(key);
    return true;
  });
}

function getStoragePathFromPublicUrl(url: string) {
  try {
    const parsed = new URL(url);
    const marker = `/storage/v1/object/public/${IMAGE_BUCKET}/`;
    const markerIndex = parsed.pathname.indexOf(marker);

    if (markerIndex === -1) {
      return null;
    }

    return decodeURIComponent(
      parsed.pathname.slice(markerIndex + marker.length),
    );
  } catch {
    return null;
  }
}

export default function EditPlacePage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const placeId = params.id;

  const [pages, setPages] = useState<PageOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const [pageId, setPageId] = useState("");
  const [slug, setSlug] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [address, setAddress] = useState("");

  const [openTwentyFourSeven, setOpenTwentyFourSeven] =
    useState(false);

  const [openingHours, setOpeningHours] =
    useState<OpeningHours>(DEFAULT_OPENING_HOURS);

  const [existingImages, setExistingImages] = useState<
    ExistingImageItem[]
  >([]);
  const [originalImageUrls, setOriginalImageUrls] = useState<
    string[]
  >([]);
  const [newImages, setNewImages] = useState<NewImageItem[]>(
    [],
  );
  const [imageError, setImageError] = useState("");

  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const totalImageCount =
    existingImages.length + newImages.length;
  const remainingImageSlots = MAX_IMAGES - totalImageCount;

  const selectedPage = useMemo(
    () => pages.find((page) => page.id === pageId) ?? null,
    [pageId, pages],
  );

  useEffect(() => {
    let active = true;

    async function loadPlace() {
      setLoading(true);
      setFormError("");

      try {
        const supabase = createClient();

        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
          router.replace(
            `/log-in?next=/account/places/${placeId}/edit`,
          );
          return;
        }

        const { data: userProfile, error: profileError } =
          await supabase
            .from("users")
            .select("role")
            .eq("id", user.id)
            .maybeSingle();

        if (profileError) {
          throw profileError;
        }

        const admin = userProfile?.role === "admin";

        let pagesQuery = supabase
          .from("groups")
          .select("id, name, status, place_enabled")
          .eq("status", "approved")
          .order("name", { ascending: true });

        if (!admin) {
          pagesQuery = pagesQuery.eq("user_id", user.id);
        }

        const [
          { data: pageData, error: pagesError },
          { data: placeData, error: placeError },
        ] = await Promise.all([
          pagesQuery,
          supabase
            .from("places")
            .select(
              "id, page_id, title, description, address, images, opening_hours, metadata, slug, is_active",
            )
            .eq("id", placeId)
            .maybeSingle<PlaceRow>(),
        ]);

        if (pagesError) {
          throw pagesError;
        }

        if (placeError) {
          throw placeError;
        }

        if (!placeData) {
          throw new Error("This Place could not be found.");
        }

        const availablePages = ((pageData ?? []) as Array<{
          id: string;
          name: string | null;
          status: string | null;
          place_enabled: boolean | null;
        }>)
          .filter((page) => page.place_enabled !== false)
          .map((page) => ({
            id: page.id,
            name: page.name?.trim() || "Untitled Page",
            status: page.status,
            place_enabled: page.place_enabled,
          }));

        const canAccessPlace = availablePages.some(
          (page) => page.id === placeData.page_id,
        );

        if (!canAccessPlace) {
          throw new Error(
            "You do not have permission to edit this Place.",
          );
        }

        const imageUrls = normaliseImageUrls(
          placeData.images,
        );

        if (!active) {
          return;
        }

        setIsAdmin(admin);
        setPages(availablePages);
        setPageId(placeData.page_id);
        setSlug(placeData.slug ?? "");
        setTitle(placeData.title ?? "");
        setDescription(placeData.description ?? "");
        setAddress(placeData.address ?? "");
        setOpeningHours(
          normaliseOpeningHours(placeData.opening_hours),
        );
        setOpenTwentyFourSeven(
          isRecord(placeData.metadata) &&
            isTrue(placeData.metadata.open_24_7),
        );
        setOriginalImageUrls(imageUrls);
        setExistingImages(
          imageUrls.map((url) => ({
            id: crypto.randomUUID(),
            url,
          })),
        );
      } catch (error) {
        console.error("Failed to load Place:", error);

        if (active) {
          setFormError(
            error instanceof Error
              ? error.message
              : "We couldn't load this Place.",
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
  }, [placeId, router]);

  useEffect(() => {
    return () => {
      newImages.forEach(({ previewUrl }) => {
        URL.revokeObjectURL(previewUrl);
      });
    };
  }, [newImages]);

  function updateDayHours(
    day: DayKey,
    update: Partial<DayHours>,
  ) {
    setOpeningHours((current) => ({
      ...current,
      [day]: {
        ...current[day],
        ...update,
      },
    }));
  }

  function handleImagesSelected(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const selectedFiles = Array.from(
      event.target.files ?? [],
    );

    event.target.value = "";
    setImageError("");

    if (selectedFiles.length === 0) {
      return;
    }

    const uniqueFiles = getUniqueFiles(
      selectedFiles,
      newImages,
    );

    const validFiles: File[] = [];

    for (const file of uniqueFiles) {
      if (!file.type.startsWith("image/")) {
        setImageError(`"${file.name}" is not an image.`);
        continue;
      }

      if (file.size > MAX_IMAGE_SIZE) {
        setImageError(
          `"${file.name}" is larger than 8MB.`,
        );
        continue;
      }

      validFiles.push(file);
    }

    const filesToAdd = validFiles.slice(
      0,
      remainingImageSlots,
    );

    if (validFiles.length > remainingImageSlots) {
      setImageError(
        `You can keep up to ${MAX_IMAGES} images.`,
      );
    }

    setNewImages((current) => [
      ...current,
      ...filesToAdd.map((file) => ({
        id: crypto.randomUUID(),
        file,
        previewUrl: URL.createObjectURL(file),
      })),
    ]);
  }

  function removeExistingImage(imageId: string) {
    setExistingImages((current) =>
      current.filter((item) => item.id !== imageId),
    );
  }

  function removeNewImage(imageId: string) {
    setNewImages((current) => {
      const image = current.find(
        (item) => item.id === imageId,
      );

      if (image) {
        URL.revokeObjectURL(image.previewUrl);
      }

      return current.filter(
        (item) => item.id !== imageId,
      );
    });
  }

  async function uploadNewImages(
    userId: string,
  ) {
    const supabase = createClient();
    const urls: string[] = [];
    const paths: string[] = [];

    try {
      for (const image of newImages) {
        const extension = getSafeExtension(image.file);
        const path = `${userId}/${placeId}/${crypto.randomUUID()}.${extension}`;

        const { error } = await supabase.storage
          .from(IMAGE_BUCKET)
          .upload(path, image.file, {
            cacheControl: "31536000",
            upsert: false,
            contentType: image.file.type || undefined,
          });

        if (error) {
          throw error;
        }

        paths.push(path);

        const { data } = supabase.storage
          .from(IMAGE_BUCKET)
          .getPublicUrl(path);

        if (!data.publicUrl) {
          throw new Error(
            "The image uploaded but its public URL could not be created.",
          );
        }

        urls.push(data.publicUrl);
      }

      return { urls, paths };
    } catch (error) {
      if (paths.length > 0) {
        await supabase.storage
          .from(IMAGE_BUCKET)
          .remove(paths);
      }

      throw error;
    }
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (saving) {
      return;
    }

    setFormError("");
    setImageError("");

    const cleanTitle = title.trim();
    const cleanDescription = description.trim();
    const cleanAddress = address.trim();

    if (!pageId) {
      setFormError("Choose the Page this Place belongs to.");
      return;
    }

    if (!cleanTitle) {
      setFormError("Add the name of the Place.");
      return;
    }

    if (!cleanAddress) {
      setFormError("Add the full address.");
      return;
    }

    if (totalImageCount === 0) {
      setFormError("Keep or add at least one image.");
      return;
    }

    setSaving(true);

    const supabase = createClient();
    let uploadedPaths: string[] = [];

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        router.replace(
          `/log-in?next=/account/places/${placeId}/edit`,
        );
        return;
      }

      const { data: userProfile, error: profileError } =
        await supabase
          .from("users")
          .select("role")
          .eq("id", user.id)
          .maybeSingle();

      if (profileError) {
        throw profileError;
      }

      const admin = userProfile?.role === "admin";

      let pageQuery = supabase
        .from("groups")
        .select("id, status, place_enabled")
        .eq("id", pageId)
        .eq("status", "approved");

      if (!admin) {
        pageQuery = pageQuery.eq("user_id", user.id);
      }

      const { data: allowedPage, error: pageError } =
        await pageQuery.maybeSingle();

      if (pageError) {
        throw pageError;
      }

      if (!allowedPage) {
        throw new Error(
          "You do not have access to that approved Page.",
        );
      }

      if (allowedPage.place_enabled === false) {
        throw new Error(
          "Places are not enabled for that Page.",
        );
      }

      let placeAccessQuery = supabase
        .from("places")
        .select("id")
        .eq("id", placeId);

      if (!admin) {
        placeAccessQuery = placeAccessQuery.eq(
          "page_id",
          pageId,
        );
      }

      const { data: editablePlace, error: accessError } =
        await placeAccessQuery.maybeSingle();

      if (accessError) {
        throw accessError;
      }

      if (!editablePlace) {
        throw new Error(
          "You do not have permission to edit this Place.",
        );
      }

      const uploaded = await uploadNewImages(user.id);
      uploadedPaths = uploaded.paths;

      const retainedUrls = existingImages.map(
        (image) => image.url,
      );
      const finalImageUrls = [
        ...retainedUrls,
        ...uploaded.urls,
      ];

      const { error: updateError } = await supabase
        .from("places")
        .update({
          page_id: pageId,
          title: cleanTitle,
          description: cleanDescription || null,
          address: cleanAddress,
          images: finalImageUrls,
          opening_hours: openTwentyFourSeven
            ? null
            : openingHours,
          metadata: {
            open_24_7: openTwentyFourSeven,
          },
        })
        .eq("id", placeId);

      if (updateError) {
        throw updateError;
      }

      const removedUrls = originalImageUrls.filter(
        (url) => !retainedUrls.includes(url),
      );
      const removedPaths = removedUrls
        .map(getStoragePathFromPublicUrl)
        .filter((path): path is string => Boolean(path));

      if (removedPaths.length > 0) {
        const { error: removeError } =
          await supabase.storage
            .from(IMAGE_BUCKET)
            .remove(removedPaths);

        if (removeError) {
          console.error(
            "Place saved, but removed images could not be deleted:",
            removeError,
          );
        }
      }

      router.push(
        slug ? `/places/${slug}` : `/places/${placeId}`,
      );
      router.refresh();
    } catch (error) {
      console.error("Failed to update Place:", error);

      if (uploadedPaths.length > 0) {
        await supabase.storage
          .from(IMAGE_BUCKET)
          .remove(uploadedPaths);
      }

      setFormError(
        error instanceof Error
          ? error.message
          : "We couldn't save this Place.",
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <>
        <SiteHeader />

        <main className="flex min-h-[60vh] items-center justify-center bg-white">
          <LoaderCircle className="h-8 w-8 animate-spin text-emerald-700" />
        </main>

        <Footer />
      </>
    );
  }

  return (
    <>
      <SiteHeader />

      <main className="bg-white text-black">
        <section className="border-b border-black/10">
          <div className="mx-auto w-full max-w-5xl px-5 py-12 sm:px-8 sm:py-16">
            <Link
              href="/account"
              className="inline-flex items-center gap-2 text-sm font-black text-black/55 transition hover:text-emerald-700"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to account
            </Link>

            <p className="mt-10 text-sm font-black uppercase tracking-[0.18em] text-emerald-700">
              Edit Place
            </p>

            <h1 className="mt-4 text-5xl font-black leading-[0.95] tracking-[-0.055em] sm:text-6xl">
              Edit your Place.
            </h1>

            <p className="mt-5 max-w-2xl text-lg leading-8 text-black/55">
              Keep your Place accurate so people always know
              what to expect before they visit.
            </p>
          </div>
        </section>

        <form
          suppressHydrationWarning
          autoComplete="off"
          onSubmit={handleSubmit}
          className="mx-auto w-full max-w-3xl space-y-8 px-5 py-12 sm:px-8 sm:py-16"
        >
          <section>
            <h2 className="text-xl font-black">
              A Place is somewhere people can walk into
            </h2>

            <p className="mt-2 text-sm leading-6 text-black/50">
              Places are physical locations people can visit
              without arranging an appointment first.
            </p>

            <div className="mt-5 rounded-2xl bg-emerald-50 px-5 py-5">
              <p className="font-black text-emerald-950">
                Seasonal displays get rewarded.
              </p>

              <p className="mt-2 text-sm leading-6 text-emerald-900/70">
                Places that create full Easter, Gala,
                Halloween and Christmas displays can receive
                better reach, featured placement across East
                Lothian Online, and seasonal community prizes.
              </p>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                {
                  name: "Easter",
                  emoji: "🌸",
                  className:
                    "border-yellow-200 bg-gradient-to-br from-yellow-50 to-amber-50",
                  accent: "bg-yellow-400",
                },
                {
                  name: "Gala",
                  emoji: "🎉",
                  className:
                    "border-pink-200 bg-gradient-to-r from-pink-50 via-yellow-50 to-sky-50",
                  accent:
                    "bg-gradient-to-r from-pink-500 via-yellow-400 to-sky-500",
                },
                {
                  name: "Halloween",
                  emoji: "🎃",
                  className:
                    "border-orange-200 bg-gradient-to-br from-orange-50 to-orange-100",
                  accent: "bg-orange-500",
                },
                {
                  name: "Christmas",
                  emoji: "🎄",
                  className:
                    "border-red-200 bg-gradient-to-br from-red-50 to-rose-50",
                  accent: "bg-red-600",
                },
              ].map((season) => (
                <div
                  key={season.name}
                  className={[
                    "relative overflow-hidden rounded-2xl border px-4 py-7 text-center transition hover:-translate-y-0.5 hover:shadow-md",
                    season.className,
                  ].join(" ")}
                >
                  <span
                    className={[
                      "absolute inset-x-0 top-0 h-1",
                      season.accent,
                    ].join(" ")}
                  />

                  <div className="text-4xl">
                    {season.emoji}
                  </div>

                  <p className="mt-3 text-lg font-black">
                    {season.name}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {formError ? (
            <p className="rounded-2xl bg-red-50 px-5 py-4 text-sm font-bold leading-6 text-red-800">
              {formError}
            </p>
          ) : null}

          {pages.length > 0 &&
          (pages.length > 1 || isAdmin) ? (
            <section className="border-t border-black/10 pt-8">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <h2 className="text-xl font-black">
                    Place Page
                  </h2>

                  <p className="mt-2 text-sm leading-6 text-black/50">
                    Change which Page this Place belongs to.
                  </p>
                </div>

                {isAdmin ? (
                  <span className="rounded-xl bg-black/[0.05] px-3 py-2 text-xs font-black uppercase tracking-[0.1em] text-black/55">
                    Admin
                  </span>
                ) : null}
              </div>

              <select
                id="page"
                value={pageId}
                onChange={(event) =>
                  setPageId(event.target.value)
                }
                className="mt-4 h-14 w-full rounded-2xl border border-black/15 bg-white px-5 font-semibold outline-none transition focus:border-emerald-700 focus:ring-4 focus:ring-emerald-100"
              >
                {pages.map((page) => (
                  <option
                    key={page.id}
                    value={page.id}
                  >
                    {page.name}
                  </option>
                ))}
              </select>
            </section>
          ) : null}

          <section className="border-t border-black/10 pt-8">
            <h2 className="text-xl font-black">
              Place details
            </h2>

            <label
              htmlFor="title"
              className="mt-5 block text-sm font-black"
            >
              Place name
            </label>

            <input
              suppressHydrationWarning
              id="title"
              name="place-name"
              autoComplete="off"
              value={title}
              onChange={(event) =>
                setTitle(event.target.value)
              }
              maxLength={100}
              placeholder="The name people know you by"
              className="mt-3 h-14 w-full rounded-2xl border border-black/15 px-5 font-semibold outline-none transition focus:border-emerald-700 focus:ring-4 focus:ring-emerald-100"
            />

            <label
              htmlFor="description"
              className="mt-6 block text-sm font-black"
            >
              Description
            </label>

            <textarea
              suppressHydrationWarning
              id="description"
              name="place-description"
              autoComplete="off"
              value={description}
              onChange={(event) =>
                setDescription(event.target.value)
              }
              rows={8}
              placeholder="Tell people what the Place is like, what they can visit for, and anything useful to know before they arrive."
              className="mt-3 w-full resize-y rounded-2xl border border-black/15 px-5 py-4 font-semibold leading-7 outline-none transition focus:border-emerald-700 focus:ring-4 focus:ring-emerald-100"
            />

            <label
              htmlFor="address"
              className="mt-6 block text-sm font-black"
            >
              Full address
            </label>

            <textarea
              suppressHydrationWarning
              id="address"
              name="place-address"
              autoComplete="off"
              value={address}
              onChange={(event) =>
                setAddress(event.target.value)
              }
              rows={3}
              placeholder="Building or venue, street, town or village, and postcode"
              className="mt-3 w-full resize-y rounded-2xl border border-black/15 px-5 py-4 font-semibold leading-7 outline-none transition focus:border-emerald-700 focus:ring-4 focus:ring-emerald-100"
            />

            <p className="mt-3 text-sm leading-6 text-black/45">
              Include everything someone needs to find the
              Place, including the postcode.
            </p>
          </section>

          <section className="border-t border-black/10 pt-8">
            <h2 className="text-xl font-black">
              Images
            </h2>

            <p className="mt-2 text-sm leading-6 text-black/50">
              Keep up to three clear images. The first is the
              main image and the others are used as backups.
            </p>

            <div className="mt-5 grid gap-4 sm:grid-cols-3">
              {existingImages.map((image, index) => (
                <div
                  key={image.id}
                  className="relative aspect-[4/3] overflow-hidden rounded-3xl border border-black/10 bg-black/[0.03]"
                >
                  <Image
                    src={image.url}
                    alt={`Place image ${index + 1}`}
                    fill
                    unoptimized
                    className="object-cover"
                  />

                  <div className="absolute inset-x-3 bottom-3 rounded-2xl bg-black/70 px-3 py-2 text-center text-xs font-black text-white">
                    {index === 0
                      ? "Main image"
                      : `Backup image ${index}`}
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      removeExistingImage(image.id)
                    }
                    aria-label={`Remove image ${index + 1}`}
                    className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-xl bg-white text-red-700 shadow-lg transition hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}

              {newImages.map((image, index) => {
                const position =
                  existingImages.length + index;

                return (
                  <div
                    key={image.id}
                    className="relative aspect-[4/3] overflow-hidden rounded-3xl border border-black/10 bg-black/[0.03]"
                  >
                    <Image
                      src={image.previewUrl}
                      alt={`New Place image ${index + 1}`}
                      fill
                      unoptimized
                      className="object-cover"
                    />

                    <div className="absolute inset-x-3 bottom-3 rounded-2xl bg-black/70 px-3 py-2 text-center text-xs font-black text-white">
                      {position === 0
                        ? "Main image"
                        : `Backup image ${position}`}
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        removeNewImage(image.id)
                      }
                      aria-label={`Remove new image ${index + 1}`}
                      className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-xl bg-white text-red-700 shadow-lg transition hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                );
              })}

              {remainingImageSlots > 0 ? (
                <label className="flex aspect-[4/3] cursor-pointer flex-col items-center justify-center rounded-3xl border border-black/10 bg-black/[0.03] text-center transition hover:bg-black/[0.055]">
                  <ImagePlus className="h-8 w-8 text-black/40" />

                  <p className="mt-2 text-sm font-black text-black/50">
                    Add image
                  </p>

                  <p className="mt-1 text-xs text-black/35">
                    {remainingImageSlots} remaining
                  </p>

                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImagesSelected}
                    className="hidden"
                  />
                </label>
              ) : null}
            </div>

            {imageError ? (
              <p className="mt-4 rounded-2xl bg-red-50 px-5 py-4 text-sm font-bold leading-6 text-red-800">
                {imageError}
              </p>
            ) : null}
          </section>

          <section className="border-t border-black/10 pt-8">
            <h2 className="text-xl font-black">
              Opening hours
            </h2>

            <p className="mt-2 text-sm leading-6 text-black/50">
              Accurate hours help us show the Place when it
              is open and useful.
            </p>

            <label className="mt-5 flex cursor-pointer items-start gap-4 rounded-2xl bg-emerald-50 px-5 py-5">
              <input
                type="checkbox"
                checked={openTwentyFourSeven}
                onChange={(event) =>
                  setOpenTwentyFourSeven(
                    event.target.checked,
                  )
                }
                className="mt-1 h-5 w-5 shrink-0 accent-emerald-700"
              />

              <div>
                <p className="font-black text-emerald-950">
                  Open 24 hours a day
                </p>

                <p className="mt-1 text-sm leading-6 text-emerald-900/70">
                  Turn this on only when people can visit at
                  any time.
                </p>
              </div>
            </label>

            {!openTwentyFourSeven ? (
              <div className="mt-5 overflow-hidden rounded-3xl border border-black/10">
                {DAYS.map((day, index) => {
                  const hours = openingHours[day.key];

                  return (
                    <div
                      key={day.key}
                      className={[
                        "grid gap-4 px-5 py-5 sm:grid-cols-[1fr_auto_auto_auto] sm:items-center",
                        index !== 0
                          ? "border-t border-black/10"
                          : "",
                      ].join(" ")}
                    >
                      <p className="font-black">
                        {day.label}
                      </p>

                      <label className="flex items-center gap-2 text-sm font-semibold">
                        <input
                          type="checkbox"
                          checked={hours.closed}
                          onChange={(event) =>
                            updateDayHours(day.key, {
                              closed:
                                event.target.checked,
                            })
                          }
                          className="h-5 w-5 accent-emerald-700"
                        />
                        Closed
                      </label>

                      <input
                        suppressHydrationWarning
                        type="time"
                        value={hours.open}
                        disabled={hours.closed}
                        onChange={(event) =>
                          updateDayHours(day.key, {
                            open: event.target.value,
                          })
                        }
                        aria-label={`${day.label} opening time`}
                        className="h-12 rounded-xl border border-black/15 bg-white px-4 font-semibold outline-none transition disabled:opacity-35 focus:border-emerald-700 focus:ring-4 focus:ring-emerald-100"
                      />

                      <input
                        suppressHydrationWarning
                        type="time"
                        value={hours.close}
                        disabled={hours.closed}
                        onChange={(event) =>
                          updateDayHours(day.key, {
                            close: event.target.value,
                          })
                        }
                        aria-label={`${day.label} closing time`}
                        className="h-12 rounded-xl border border-black/15 bg-white px-4 font-semibold outline-none transition disabled:opacity-35 focus:border-emerald-700 focus:ring-4 focus:ring-emerald-100"
                      />
                    </div>
                  );
                })}
              </div>
            ) : null}
          </section>

          <section className="flex flex-col-reverse gap-3 border-t border-black/10 pt-8 sm:flex-row">
            <Link
              href={slug ? `/places/${slug}` : "/account"}
              className="inline-flex h-14 items-center justify-center rounded-2xl border border-black/15 px-6 text-sm font-black uppercase tracking-[0.12em] transition hover:bg-black/[0.03]"
            >
              Cancel
            </Link>

            <button
              type="submit"
              disabled={saving || pages.length === 0}
              className="inline-flex h-14 flex-1 items-center justify-center gap-3 rounded-2xl bg-emerald-700 px-6 text-sm font-black uppercase tracking-[0.12em] text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? (
                <LoaderCircle className="h-5 w-5 animate-spin" />
              ) : (
                <Check className="h-5 w-5" />
              )}

              {saving
                ? "Saving Changes..."
                : "Save Changes"}
            </button>
          </section>

          {selectedPage ? (
            <p className="text-center text-sm leading-6 text-black/40">
              This Place belongs to{" "}
              <span className="font-black">
                {selectedPage.name}
              </span>
              .
            </p>
          ) : null}
        </form>
      </main>

      <Footer />
    </>
  );
}
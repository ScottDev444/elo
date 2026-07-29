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
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Check,
  Clock3,
  ImagePlus,
  LoaderCircle,
  MapPin,
  Plus,
  Trash2,
} from "lucide-react";

import SiteHeader from "@/components/SiteHeader";
import Footer from "@/components/Footer";
import { createClient } from "@/lib/supabase/client";

const IMAGE_BUCKET = "place-images";
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

type ImageItem = {
  id: string;
  file: File;
  previewUrl: string;
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

function createSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70);
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
  currentImages: ImageItem[],
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

export default function CreatePlacePage() {
  const router = useRouter();

  const [pages, setPages] = useState<PageOption[]>([]);
  const [loadingPages, setLoadingPages] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const [pageId, setPageId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [address, setAddress] = useState("");

  const [openTwentyFourSeven, setOpenTwentyFourSeven] =
    useState(false);

  const [openingHours, setOpeningHours] =
    useState<OpeningHours>(DEFAULT_OPENING_HOURS);

  const [images, setImages] = useState<ImageItem[]>([]);
  const [imageError, setImageError] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const remainingImageSlots = MAX_IMAGES - images.length;

  const selectedPage = useMemo(
    () => pages.find((page) => page.id === pageId) ?? null,
    [pageId, pages],
  );

  useEffect(() => {
    const supabase = createClient();

    async function loadPages() {
      setLoadingPages(true);
      setFormError("");

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        router.replace(
          "/log-in?next=/account/create-place",
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
        console.error(
          "Failed to load user role:",
          profileError,
        );
        setFormError(profileError.message);
        setLoadingPages(false);
        return;
      }

      const isAdminUser =
        userProfile?.role === "admin";

      setIsAdmin(isAdminUser);

      let pagesQuery = supabase
        .from("groups")
        .select("id, name, status, place_enabled")
        .eq("status", "approved")
        .order("name", { ascending: true });

      if (!isAdminUser) {
        pagesQuery = pagesQuery.eq(
          "user_id",
          user.id,
        );
      }

      const { data, error } = await pagesQuery;

      if (error) {
        console.error("Failed to load pages:", error);
        setFormError(error.message);
        setLoadingPages(false);
        return;
      }

      const availablePages = ((data ?? []) as Array<{
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

      setPages(availablePages);

      if (availablePages.length > 0) {
        const defaultPage = isAdminUser
          ? availablePages.find(
              (page) =>
                page.name.trim().toLowerCase() ===
                "east lothian online",
            ) ?? availablePages[0]
          : availablePages[0];

        setPageId(defaultPage.id);
      }

      setLoadingPages(false);
    }

    void loadPages();
  }, [router]);

  useEffect(() => {
    return () => {
      images.forEach(({ previewUrl }) => {
        URL.revokeObjectURL(previewUrl);
      });
    };
  }, [images]);

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
      images,
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
        `You can add up to ${MAX_IMAGES} images.`,
      );
    }

    setImages((current) => [
      ...current,
      ...filesToAdd.map((file) => ({
        id: crypto.randomUUID(),
        file,
        previewUrl: URL.createObjectURL(file),
      })),
    ]);
  }

  function removeImage(imageId: string) {
    setImages((current) => {
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

  async function uploadImages(
    userId: string,
    placeId: string,
  ) {
    const supabase = createClient();
    const urls: string[] = [];
    const paths: string[] = [];

    try {
      for (const image of images) {
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

    if (submitting) {
      return;
    }

    setFormError("");
    setImageError("");

    const cleanTitle = title.trim();
    const cleanDescription = description.trim();
    const cleanAddress = address.trim();

    if (!pageId) {
      setFormError("Choose the page this Place belongs to.");
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

    if (images.length === 0) {
      setFormError("Add at least one image.");
      return;
    }

    setSubmitting(true);

    const supabase = createClient();
    let createdPlaceId: string | null = null;
    let uploadedPaths: string[] = [];

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        router.replace(
          "/log-in?next=/account/create-place",
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

      const isAdmin = userProfile?.role === "admin";

      let pageQuery = supabase
        .from("groups")
        .select("id, status, place_enabled")
        .eq("id", pageId)
        .eq("status", "approved");

      if (!isAdmin) {
        pageQuery = pageQuery.eq(
          "user_id",
          user.id,
        );
      }

      const { data: ownedPage, error: pageError } =
        await pageQuery.maybeSingle();

      if (pageError) {
        throw pageError;
      }

      if (!ownedPage) {
        throw new Error(
          "You do not have access to that approved page.",
        );
      }

      if (ownedPage.place_enabled === false) {
        throw new Error(
          "Places are not enabled for that page.",
        );
      }

      const slug = `${
        createSlug(cleanTitle) || "place"
      }-${crypto.randomUUID().slice(0, 8)}`;

      const { data: createdPlace, error: createError } =
        await supabase
          .from("places")
          .insert({
            page_id: pageId,
            title: cleanTitle,
            description: cleanDescription || null,
            location_name: null,
            address: cleanAddress,
            postcode: null,
            images: [],
            opening_hours: openTwentyFourSeven
              ? null
              : openingHours,
            metadata: {
              open_24_7: openTwentyFourSeven,
            },
            is_active: true,
            slug,
          })
          .select("id")
          .single();

      if (createError) {
        throw createError;
      }

      createdPlaceId = createdPlace.id;

      const uploaded = await uploadImages(
        user.id,
        createdPlace.id,
      );

      uploadedPaths = uploaded.paths;

      const { error: updateError } = await supabase
        .from("places")
        .update({
          images: uploaded.urls,
        })
        .eq("id", createdPlace.id)
        .eq("page_id", pageId);

      if (updateError) {
        throw updateError;
      }

      router.push(`/places/${slug}`);
      router.refresh();
    } catch (error) {
      console.error("Failed to create Place:", error);

      if (uploadedPaths.length > 0) {
        await supabase.storage
          .from(IMAGE_BUCKET)
          .remove(uploadedPaths);
      }

      if (createdPlaceId) {
        await supabase
          .from("places")
          .delete()
          .eq("id", createdPlaceId);
      }

      setFormError(
        error instanceof Error
          ? error.message
          : "We couldn't create this Place.",
      );
    } finally {
      setSubmitting(false);
    }
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
              Create Place
            </p>

            <h1 className="mt-4 text-5xl font-black leading-[0.95] tracking-[-0.055em] sm:text-6xl">
              Add a new Place.
            </h1>

            <p className="mt-5 max-w-2xl text-lg leading-8 text-black/55">
              Help people discover a local shop, café, pub,
              venue, attraction or public space they can
              walk into and enjoy.
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

          {!loadingPages &&
          pages.length > 0 &&
          (pages.length > 1 || isAdmin) ? (
            <section className="border-t border-black/10 pt-8">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <h2 className="text-xl font-black">
                    Add Place as
                  </h2>

                  <p className="mt-2 text-sm leading-6 text-black/50">
                    Your Page is selected automatically. You
                    can change it here.
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

              {isAdmin ? (
                <p className="mt-3 text-sm leading-6 text-black/45">
                  Admin accounts can add a Place for any
                  approved Page. East Lothian Online is
                  selected by default.
                </p>
              ) : null}
            </section>
          ) : null}

          {loadingPages ? (
            <section className="border-t border-black/10 pt-8">
              <div className="flex h-14 items-center rounded-2xl border border-black/10 px-5">
                <LoaderCircle className="h-5 w-5 animate-spin text-emerald-700" />
              </div>
            </section>
          ) : pages.length === 0 ? (
            <section className="border-t border-black/10 pt-8">
              <div className="rounded-2xl bg-amber-50 px-5 py-5">
                <p className="font-black text-amber-950">
                  You do not have an approved Page.
                </p>

                <p className="mt-2 text-sm leading-6 text-amber-900/70">
                  Once one of your Pages is approved, you
                  will be able to add its Place here.
                </p>
              </div>
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
              Add up to three clear images. The first is the
              main image and the others are used as backups.
            </p>

            <div className="mt-5 grid gap-4 sm:grid-cols-3">
              {images.map((image, index) => (
                <div
                  key={image.id}
                  className="relative aspect-[4/3] overflow-hidden rounded-3xl border border-black/10 bg-black/[0.03]"
                >
                  <Image
                    src={image.previewUrl}
                    alt={`Place preview ${index + 1}`}
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
                      removeImage(image.id)
                    }
                    aria-label={`Remove image ${index + 1}`}
                    className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-xl bg-white text-red-700 shadow-lg transition hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}

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
              href="/account"
              className="inline-flex h-14 items-center justify-center rounded-2xl border border-black/15 px-6 text-sm font-black uppercase tracking-[0.12em] transition hover:bg-black/[0.03]"
            >
              Cancel
            </Link>

            <button
              type="submit"
              disabled={
                submitting ||
                loadingPages ||
                pages.length === 0
              }
              className="inline-flex h-14 flex-1 items-center justify-center gap-3 rounded-2xl bg-emerald-700 px-6 text-sm font-black uppercase tracking-[0.12em] text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? (
                <LoaderCircle className="h-5 w-5 animate-spin" />
              ) : (
                <Check className="h-5 w-5" />
              )}

              {submitting
                ? "Adding Place..."
                : "Add Place"}
            </button>
          </section>

          {selectedPage ? (
            <p className="text-center text-sm leading-6 text-black/40">
              This Place will be added to{" "}
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
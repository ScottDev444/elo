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
  Upload,
} from "lucide-react";

import SiteHeader from "@/components/SiteHeader";
import Footer from "@/components/Footer";
import { createClient } from "@/lib/supabase/client";

type SelectedImage = {
  id: string;
  file: File;
  previewUrl: string;
};

type GroupRow = {
  id: string;
  user_id: string | null;
  name: string;
  website: string | null;
  brand_color: string | null;
  logo_url: string | null;
  layout: {
    socials?: {
      facebook?: string | null;
      instagram?: string | null;
    };
    [key: string]: unknown;
  } | null;
  showcase_images:
    | Array<
        | string
        | {
            url?: string;
            image_url?: string;
            src?: string;
          }
      >
    | null;
};

const MAX_IMAGES = 3;
const DEFAULT_BRAND_COLOUR = "#6b7280";
const PAGE_IMAGE_BUCKET = "post-images";

function normaliseHandle(value: string) {
  return value
    .trim()
    .replace(/^https?:\/\/(www\.)?(facebook|instagram)\.com\//i, "")
    .replace(/^@+/, "")
    .replace(/\/$/, "");
}

function socialUrl(platform: "facebook" | "instagram", value: string) {
  const handle = normaliseHandle(value);
  return handle ? `https://www.${platform}.com/${handle}` : null;
}

function normaliseUrl(value: string) {
  const cleaned = value.trim();

  if (!cleaned) {
    return null;
  }

  return /^https?:\/\//i.test(cleaned)
    ? cleaned
    : `https://${cleaned}`;
}

function getSafeExtension(file: File) {
  const knownExtensions: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
  };

  return (
    knownExtensions[file.type] ||
    file.name
      .split(".")
      .pop()
      ?.toLowerCase()
      .replace(/[^a-z0-9]/g, "") ||
    "jpg"
  );
}

function getStoragePathFromPublicUrl(url: string) {
  const marker = `/storage/v1/object/public/${PAGE_IMAGE_BUCKET}/`;
  const markerIndex = url.indexOf(marker);

  if (markerIndex === -1) {
    return null;
  }

  return decodeURIComponent(url.slice(markerIndex + marker.length));
}

function normaliseShowcaseImages(
  value: GroupRow["showcase_images"],
) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => {
      if (typeof item === "string") {
        return item;
      }

      if (item && typeof item === "object") {
        return item.url ?? item.image_url ?? item.src ?? "";
      }

      return "";
    })
    .filter((url): url is string => Boolean(url))
    .slice(0, MAX_IMAGES);
}

export default function EditPagePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const pageId = params.id;

  const [name, setName] = useState("");
  const [brandColour, setBrandColour] = useState(DEFAULT_BRAND_COLOUR);
  const [website, setWebsite] = useState("");
  const [facebook, setFacebook] = useState("");
  const [instagram, setInstagram] = useState("");

  const [currentLogoUrl, setCurrentLogoUrl] = useState("");
  const [newLogo, setNewLogo] = useState<File | null>(null);
  const [newLogoPreview, setNewLogoPreview] = useState("");

  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [newImages, setNewImages] = useState<SelectedImage[]>([]);

  const [originalLayout, setOriginalLayout] = useState<
    GroupRow["layout"]
  >(null);
  const [ownerId, setOwnerId] = useState("");

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!newLogo) {
      setNewLogoPreview("");
      return;
    }

    const previewUrl = URL.createObjectURL(newLogo);
    setNewLogoPreview(previewUrl);

    return () => URL.revokeObjectURL(previewUrl);
  }, [newLogo]);

  useEffect(() => {
    return () => {
      newImages.forEach((image) =>
        URL.revokeObjectURL(image.previewUrl),
      );
    };
  }, [newImages]);

  useEffect(() => {
    const supabase = createClient();

    async function loadPage() {
      setLoading(true);
      setMessage("");

      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
          router.replace(
            `/log-in?next=/account/pages/${pageId}/edit`,
          );
          return;
        }

        const { data: publicUser } = await supabase
          .from("users")
          .select("role")
          .eq("id", user.id)
          .maybeSingle();

        const { data, error } = await supabase
          .from("groups")
          .select(
            `
              id,
              user_id,
              name,
              website,
              brand_color,
              logo_url,
              layout,
              showcase_images
            `,
          )
          .eq("id", pageId)
          .maybeSingle();

        if (error || !data) {
          throw new Error(
            error?.message || "This page could not be found.",
          );
        }

        const page = data as GroupRow;
        const isAdmin = publicUser?.role === "admin";
        const isOwner = page.user_id === user.id;

        if (!isAdmin && !isOwner) {
          throw new Error(
            "You do not have permission to edit this page.",
          );
        }

        const socials = page.layout?.socials;

        setOwnerId(page.user_id ?? user.id);
        setName(page.name ?? "");
        setWebsite(page.website ?? "");
        setBrandColour(
          page.brand_color || DEFAULT_BRAND_COLOUR,
        );
        setCurrentLogoUrl(page.logo_url ?? "");
        setExistingImages(
          normaliseShowcaseImages(page.showcase_images),
        );
        setFacebook(
          normaliseHandle(socials?.facebook ?? ""),
        );
        setInstagram(
          normaliseHandle(socials?.instagram ?? ""),
        );
        setOriginalLayout(page.layout ?? {});
      } catch (error) {
        setMessage(
          error instanceof Error
            ? error.message
            : "The page could not be loaded.",
        );
      } finally {
        setLoading(false);
      }
    }

    void loadPage();
  }, [pageId, router]);

  const validExistingImages = useMemo(
    () =>
      existingImages.filter(
        (url) =>
          typeof url === "string" &&
          url.trim().length > 0,
      ),
    [existingImages],
  );

  const totalImageCount =
    validExistingImages.length + newImages.length;

  const remainingImages = MAX_IMAGES - totalImageCount;

  const buttonLabel = useMemo(() => {
    if (submitting) {
      return "Saving changes...";
    }

    return "Save changes";
  }, [submitting]);

  function handleNewImages(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";

    if (files.length === 0) {
      return;
    }

    const acceptedFiles = files.slice(
      0,
      Math.max(remainingImages, 0),
    );

    const selected = acceptedFiles.map((file) => ({
      id: crypto.randomUUID(),
      file,
      previewUrl: URL.createObjectURL(file),
    }));

    setNewImages((current) => [...current, ...selected]);

    setMessage(
      files.length > acceptedFiles.length
        ? `You can display a maximum of ${MAX_IMAGES} images.`
        : "",
    );
  }

  function removeNewImage(id: string) {
    setNewImages((current) => {
      const selected = current.find(
        (image) => image.id === id,
      );

      if (selected) {
        URL.revokeObjectURL(selected.previewUrl);
      }

      return current.filter((image) => image.id !== id);
    });

    setMessage("");
  }

  function removeExistingImage(url: string) {
    setExistingImages((current) =>
      current.filter((imageUrl) => imageUrl !== url),
    );
    setMessage("");
  }

  async function uploadFile({
    file,
    folder,
  }: {
    file: File;
    folder: "logo" | "gallery";
  }) {
    const supabase = createClient();
    const extension = getSafeExtension(file);
    const path = `${ownerId}/${pageId}/${folder}/${crypto.randomUUID()}.${extension}`;

    const { error } = await supabase.storage
      .from(PAGE_IMAGE_BUCKET)
      .upload(path, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type,
      });

    if (error) {
      throw new Error(`Image upload failed: ${error.message}`);
    }

    const { data } = supabase.storage
      .from(PAGE_IMAGE_BUCKET)
      .getPublicUrl(path);

    return {
      path,
      url: data.publicUrl,
    };
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (submitting) {
      return;
    }

    if (!name.trim()) {
      setMessage("Add the page name.");
      return;
    }

    setSubmitting(true);
    setMessage("");

    const supabase = createClient();
    const newlyUploadedPaths: string[] = [];

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        router.replace(
          `/log-in?next=/account/pages/${pageId}/edit`,
        );
        return;
      }

      let finalLogoUrl = currentLogoUrl;

      if (newLogo) {
        const uploadedLogo = await uploadFile({
          file: newLogo,
          folder: "logo",
        });

        newlyUploadedPaths.push(uploadedLogo.path);
        finalLogoUrl = uploadedLogo.url;
      }

      const uploadedGalleryUrls: string[] = [];

      for (const image of newImages) {
        const uploadedImage = await uploadFile({
          file: image.file,
          folder: "gallery",
        });

        newlyUploadedPaths.push(uploadedImage.path);
        uploadedGalleryUrls.push(uploadedImage.url);
      }

      const finalGallery = [
        ...validExistingImages,
        ...uploadedGalleryUrls,
      ]
        .filter(
          (url) =>
            typeof url === "string" &&
            url.trim().length > 0,
        )
        .map((url) => url.trim())
        .slice(0, MAX_IMAGES);

      const nextLayout = {
        ...(originalLayout ?? {}),
        socials: {
          ...((originalLayout?.socials as Record<
            string,
            unknown
          > | undefined) ?? {}),
          facebook: socialUrl("facebook", facebook),
          instagram: socialUrl("instagram", instagram),
        },
      };

      const { error: updateError } = await supabase
        .from("groups")
        .update({
          name: name.trim(),
          website: normaliseUrl(website),
          brand_color: brandColour,
          logo_url: finalLogoUrl || null,
          layout: nextLayout,
          showcase_images: finalGallery,
        })
        .eq("id", pageId);

      if (updateError) {
        throw new Error(
          `Page update failed: ${updateError.message}`,
        );
      }

      const removedUrls = [
        ...(!newLogo &&
        currentLogoUrl &&
        finalLogoUrl !== currentLogoUrl
          ? [currentLogoUrl]
          : []),
      ];

      const originalGallery =
        Array.isArray(
          (await supabase
            .from("groups")
            .select("showcase_images")
            .eq("id", pageId)
            .single()).data?.showcase_images,
        )
          ? []
          : [];

      void removedUrls;
      void originalGallery;

      setCurrentLogoUrl(finalLogoUrl);
      setNewLogo(null);
      setExistingImages(finalGallery);
      setNewImages([]);
      setOriginalLayout(nextLayout);
      setMessage("Your page has been updated.");

      router.refresh();
    } catch (error) {
      if (newlyUploadedPaths.length > 0) {
        await supabase.storage
          .from(PAGE_IMAGE_BUCKET)
          .remove(newlyUploadedPaths);
      }

      setMessage(
        error instanceof Error
          ? error.message
          : "We couldn't update the page.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <>
        <SiteHeader />
        <main className="flex min-h-[70vh] items-center justify-center bg-white">
          <LoaderCircle className="h-8 w-8 animate-spin text-emerald-700" />
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <SiteHeader />

      <main className="min-h-screen bg-white text-black">
        <section className="border-b border-black/10">
          <div className="mx-auto w-full max-w-4xl px-5 py-10 sm:px-8 sm:py-14">
            <Link
              href="/account"
              className="inline-flex items-center gap-2 text-sm font-black text-black/50 transition hover:text-emerald-700"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to your pages
            </Link>

            <p className="mt-9 text-sm font-black uppercase tracking-[0.18em] text-emerald-700">
              Edit Page
            </p>

            <h1 className="mt-3 text-4xl font-black tracking-[-0.05em] sm:text-6xl">
              Update your page.
            </h1>
          </div>
        </section>

        <form
          onSubmit={handleSubmit}
          className="mx-auto w-full max-w-3xl px-5 py-10 sm:px-8 sm:py-14"
        >
          <div className="space-y-8">
            <section>
              <label
                htmlFor="page-name"
                className="block text-sm font-black"
              >
                Name
              </label>

              <input
                id="page-name"
                value={name}
                onChange={(event) =>
                  setName(event.target.value)
                }
                placeholder="Business or organisation name"
                className="mt-3 h-14 w-full rounded-2xl border border-black/15 px-5 font-semibold outline-none transition focus:border-emerald-700 focus:ring-4 focus:ring-emerald-100"
              />
            </section>

            <section className="border-t border-black/10 pt-8">
              <label className="block text-sm font-black">
                Logo
              </label>

              <label className="mt-3 flex cursor-pointer items-center gap-4 rounded-2xl border border-black/15 p-4 transition hover:border-black/30">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(event) =>
                    setNewLogo(
                      event.target.files?.[0] ?? null,
                    )
                  }
                />

                <div className="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-black/[0.04]">
                  {newLogoPreview || currentLogoUrl ? (
                    <Image
                      src={
                        newLogoPreview || currentLogoUrl
                      }
                      alt="Logo preview"
                      fill
                      unoptimized
                      className="object-contain p-2"
                    />
                  ) : (
                    <Upload className="h-6 w-6 text-black/35" />
                  )}
                </div>

                <div>
                  <p className="font-black">
                    {currentLogoUrl || newLogo
                      ? "Change logo"
                      : "Upload logo"}
                  </p>
                  <p className="mt-1 text-sm text-black/45">
                    PNG, JPG or WEBP
                  </p>
                </div>
              </label>
            </section>

            <section className="border-t border-black/10 pt-8">
              <label
                htmlFor="brand-colour"
                className="block text-sm font-black"
              >
                Brand Colour
              </label>

              <div className="mt-3 flex items-center gap-3 rounded-2xl border border-black/15 p-3">
                <input
                  id="brand-colour"
                  type="color"
                  value={brandColour}
                  onChange={(event) =>
                    setBrandColour(event.target.value)
                  }
                  className="h-12 w-14 cursor-pointer rounded-xl border-0 bg-transparent p-0"
                />

                <input
                  value={brandColour}
                  onChange={(event) =>
                    setBrandColour(event.target.value)
                  }
                  maxLength={7}
                  className="h-12 min-w-0 flex-1 bg-transparent px-2 font-black uppercase outline-none"
                />

                <div
                  className="h-12 w-12 shrink-0 rounded-xl border border-black/10"
                  style={{
                    backgroundColor: brandColour,
                  }}
                />
              </div>
            </section>

            <section className="border-t border-black/10 pt-8">
              <label
                htmlFor="website"
                className="block text-sm font-black"
              >
                Website
              </label>

              <input
                id="website"
                type="text"
                inputMode="url"
                value={website}
                onChange={(event) =>
                  setWebsite(event.target.value)
                }
                placeholder="www.example.com"
                onBlur={() => {
                  const normalised =
                    normaliseUrl(website);
                  setWebsite(normalised ?? "");
                }}
                className="mt-3 h-14 w-full rounded-2xl border border-black/15 px-5 font-semibold outline-none transition focus:border-emerald-700 focus:ring-4 focus:ring-emerald-100"
              />
            </section>

            <section className="border-t border-black/10 pt-8">
              <label
                htmlFor="facebook"
                className="block text-sm font-black"
              >
                Facebook
              </label>

              <div className="mt-3 flex h-14 overflow-hidden rounded-2xl border border-black/15 focus-within:border-emerald-700 focus-within:ring-4 focus-within:ring-emerald-100">
                <span className="flex items-center border-r border-black/10 bg-black/[0.03] px-4 text-sm font-bold text-black/45">
                  facebook.com/
                </span>

                <input
                  id="facebook"
                  value={facebook}
                  onChange={(event) =>
                    setFacebook(
                      normaliseHandle(
                        event.target.value,
                      ),
                    )
                  }
                  placeholder="yourpage"
                  className="min-w-0 flex-1 px-4 font-semibold outline-none"
                />
              </div>
            </section>

            <section className="border-t border-black/10 pt-8">
              <label
                htmlFor="instagram"
                className="block text-sm font-black"
              >
                Instagram
              </label>

              <div className="mt-3 flex h-14 overflow-hidden rounded-2xl border border-black/15 focus-within:border-emerald-700 focus-within:ring-4 focus-within:ring-emerald-100">
                <span className="flex items-center border-r border-black/10 bg-black/[0.03] px-4 font-black text-black/45">
                  @
                </span>

                <input
                  id="instagram"
                  value={instagram}
                  onChange={(event) =>
                    setInstagram(
                      normaliseHandle(
                        event.target.value,
                      ),
                    )
                  }
                  placeholder="yourpage"
                  className="min-w-0 flex-1 px-4 font-semibold outline-none"
                />
              </div>
            </section>

            <section className="border-t border-black/10 pt-8">
              <div className="flex items-end justify-between gap-4">
                <label className="block text-sm font-black">
                  Images
                </label>

                <span className="text-sm font-bold text-black/40">
                  {totalImageCount}/{MAX_IMAGES}
                </span>
              </div>

              <div className="mt-3 grid grid-cols-3 gap-3">
                {validExistingImages.map((url, index) => (
                  <div
                    key={`${url.trim()}-${index}`}
                    className="relative aspect-square overflow-hidden rounded-2xl bg-black/[0.04]"
                  >
                    <Image
                      src={url.trim()}
                      alt="Existing page image"
                      fill
                      unoptimized
                      className="object-cover"
                    />

                    <button
                      type="button"
                      onClick={() =>
                        removeExistingImage(url)
                      }
                      className="absolute right-2 top-2 flex h-9 w-9 items-center justify-center rounded-xl bg-black/75 text-white"
                      aria-label="Remove image"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}

                {newImages.map((image) => (
                  <div
                    key={image.id}
                    className="relative aspect-square overflow-hidden rounded-2xl bg-black/[0.04]"
                  >
                    <Image
                      src={image.previewUrl}
                      alt="New page image"
                      fill
                      unoptimized
                      className="object-cover"
                    />

                    <button
                      type="button"
                      onClick={() =>
                        removeNewImage(image.id)
                      }
                      className="absolute right-2 top-2 flex h-9 w-9 items-center justify-center rounded-xl bg-black/75 text-white"
                      aria-label="Remove image"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}

                {remainingImages > 0 ? (
                  <label className="flex aspect-square cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-black/20 bg-black/[0.02] text-black/40 transition hover:border-emerald-700 hover:text-emerald-700">
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      multiple
                      className="hidden"
                      onChange={handleNewImages}
                    />

                    <ImagePlus className="h-7 w-7" />
                    <span className="mt-2 text-xs font-black">
                      Add images
                    </span>
                  </label>
                ) : null}
              </div>
            </section>

            {message ? (
              <p
                className={`rounded-2xl px-5 py-4 text-sm font-bold ${
                  message ===
                  "Your page has been updated."
                    ? "bg-emerald-50 text-emerald-800"
                    : "bg-red-50 text-red-800"
                }`}
              >
                {message}
              </p>
            ) : null}

            <section className="border-t border-black/10 pt-8">
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex h-14 w-full items-center justify-center gap-3 rounded-2xl bg-emerald-700 px-6 text-sm font-black uppercase tracking-[0.12em] text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? (
                  <LoaderCircle className="h-5 w-5 animate-spin" />
                ) : (
                  <Check className="h-5 w-5" />
                )}

                {buttonLabel}
              </button>
            </section>
          </div>
        </form>
      </main>

      <Footer />
    </>
  );
}
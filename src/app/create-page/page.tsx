"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Check,
  ImagePlus,
  LoaderCircle,
  LockKeyhole,
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

function createSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70);
}

function normaliseUrl(value: string) {
  const cleaned = value.trim();
  if (!cleaned) return null;
  return /^https?:\/\//i.test(cleaned) ? cleaned : `https://${cleaned}`;
}

function getSafeExtension(file: File) {
  const knownExtensions: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
  };

  return (
    knownExtensions[file.type] ||
    file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") ||
    "jpg"
  );
}

type AccessState = "checking" | "allowed" | "denied";

export default function CreatePagePage() {
  const router = useRouter();
  const [access, setAccess] = useState<AccessState>("checking");
  const [name, setName] = useState("");
  const [logo, setLogo] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState("");
  const [brandColour, setBrandColour] = useState(DEFAULT_BRAND_COLOUR);
  const [website, setWebsite] = useState("");
  const [facebook, setFacebook] = useState("");
  const [instagram, setInstagram] = useState("");
  const [images, setImages] = useState<SelectedImage[]>([]);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function checkAccess() {
      try {
        const supabase = createClient();

        const {
          data: { user },
          error,
        } = await supabase.auth.getUser();

        if (cancelled) return;

        if (error || !user) {
          setAccess("denied");
          return;
        }

        setAccess("allowed");
      } catch (error) {
        console.error("Failed to verify account access:", error);

        if (!cancelled) {
          setAccess("denied");
        }
      }
    }

    void checkAccess();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!logo) {
      setLogoPreview("");
      return;
    }

    const previewUrl = URL.createObjectURL(logo);
    setLogoPreview(previewUrl);

    return () => URL.revokeObjectURL(previewUrl);
  }, [logo]);

  useEffect(() => {
    return () => {
      images.forEach((image) => URL.revokeObjectURL(image.previewUrl));
    };
  }, [images]);

  const remainingImages = MAX_IMAGES - images.length;

  const buttonLabel = useMemo(() => {
    if (submitting) return "Creating page...";
    return "Create page";
  }, [submitting]);

  function handleImageUpload(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";

    if (files.length === 0) return;

    const availableFiles = files.slice(0, remainingImages);
    const nextImages = availableFiles.map((file) => ({
      id: crypto.randomUUID(),
      file,
      previewUrl: URL.createObjectURL(file),
    }));

    setImages((current) => [...current, ...nextImages]);
    setMessage(
      files.length > availableFiles.length
        ? `You can upload a maximum of ${MAX_IMAGES} images.`
        : "",
    );
  }

  function removeImage(id: string) {
    setImages((current) => {
      const image = current.find((item) => item.id === id);
      if (image) URL.revokeObjectURL(image.previewUrl);
      return current.filter((item) => item.id !== id);
    });
    setMessage("");
  }

  async function uploadFile({
    file,
    userId,
    pageId,
    folder,
  }: {
    file: File;
    userId: string;
    pageId: string;
    folder: "logo" | "gallery";
  }) {
    const supabase = createClient();
    const extension = getSafeExtension(file);
    const path = `${userId}/${pageId}/${folder}/${crypto.randomUUID()}.${extension}`;

    const { error } = await supabase.storage
      .from(PAGE_IMAGE_BUCKET)
      .upload(path, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type,
      });

    if (error) {
      throw new Error(
        `Image upload failed: ${error.message || "Check the post-images bucket and its storage policies."}`,
      );
    }

    const { data } = supabase.storage
      .from(PAGE_IMAGE_BUCKET)
      .getPublicUrl(path);

    return { path, url: data.publicUrl };
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

    setMessage("");

    if (!name.trim()) {
      setMessage("Add the page name.");
      return;
    }

    if (!logo) {
      setMessage("Add a logo.");
      return;
    }

    setSubmitting(true);

    const supabase = createClient();
    let createdPageId: string | null = null;
    const uploadedPaths: string[] = [];

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError || !user) {
        router.replace("/log-in?next=/create-page");
        return;
      }

      const baseSlug = createSlug(name);
      const slug = `${baseSlug || "page"}-${crypto.randomUUID().slice(0, 8)}`;
      const cleanWebsite = normaliseUrl(website);

      const pageId = crypto.randomUUID();

      const initialLayout = {
        socials: {
          facebook: socialUrl("facebook", facebook),
          instagram: socialUrl("instagram", instagram),
        },
      };

      const { error: createError } = await supabase
        .from("groups")
        .insert({
          id: pageId,
          user_id: user.id,
          name: name.trim(),
          slug,
          website: cleanWebsite,
          brand_color: brandColour,
          logo_url: null,
          layout: initialLayout,
          showcase_images: [],
          is_public: true,
          status: "pending",
          submitted_at: new Date().toISOString(),
          place_enabled: false,
        });

      if (createError) {
        throw new Error(
          `Database insert failed: ${createError.message || createError.code || "Unknown Supabase error"}`,
        );
      }

      createdPageId = pageId;

      const uploadedLogo = await uploadFile({
        file: logo,
        userId: user.id,
        pageId,
        folder: "logo",
      });
      uploadedPaths.push(uploadedLogo.path);

      const galleryUrls: string[] = [];
      for (const image of images) {
        const uploadedImage = await uploadFile({
          file: image.file,
          userId: user.id,
          pageId,
          folder: "gallery",
        });
        uploadedPaths.push(uploadedImage.path);
        galleryUrls.push(uploadedImage.url);
      }

      const { error: updateError } = await supabase
        .from("groups")
        .update({
          logo_url: uploadedLogo.url,
          website: cleanWebsite,
          brand_color: brandColour,
          layout: initialLayout,
          showcase_images: galleryUrls,
        })
        .eq("id", pageId)
        .eq("user_id", user.id);

      if (updateError) {
        throw new Error(
          `Page image update failed: ${updateError.message || updateError.code || "Unknown Supabase error"}`,
        );
      }

      router.push("/account");
      router.refresh();
    } catch (error) {
      const errorMessage =
        error && typeof error === "object" && "message" in error
          ? String(error.message)
          : error && typeof error === "object"
            ? JSON.stringify(error, Object.getOwnPropertyNames(error))
            : String(error);

      console.error("Failed to create page:", errorMessage, error);

      if (uploadedPaths.length > 0) {
        await supabase.storage.from(PAGE_IMAGE_BUCKET).remove(uploadedPaths);
      }

      if (createdPageId) {
        await supabase.from("groups").delete().eq("id", createdPageId);
      }

      setMessage(errorMessage || "We couldn't create the page.");
    } finally {
      setSubmitting(false);
    }
  }

  if (access === "checking") {
    return (
      <>
        <SiteHeader />

        <main className="grid min-h-[70vh] place-items-center bg-white px-4">
          <div className="flex items-center gap-3 text-sm font-black text-black/50">
            <LoaderCircle className="h-6 w-6 animate-spin" />
            Checking your account
          </div>
        </main>

        <Footer />
      </>
    );
  }

  if (access === "denied") {
    return (
      <>
        <SiteHeader />

        <main className="grid min-h-[70vh] place-items-center bg-white px-4 py-16">
          <section className="w-full max-w-xl rounded-3xl border border-black/10 bg-white px-6 py-14 text-center shadow-sm sm:px-10">
            <div className="mx-auto grid h-24 w-24 place-items-center rounded-3xl bg-emerald-100 text-emerald-700">
              <LockKeyhole className="h-12 w-12" />
            </div>

            <h1 className="mt-8 text-4xl font-black tracking-[-0.04em] text-emerald-700 sm:text-5xl">
              Account required
            </h1>

            <p className="mx-auto mt-5 max-w-md text-lg leading-8 text-black/55">
              You must be signed in before you can create a page.
            </p>

            <Link
              href="/log-in?next=/create-page"
              className="mt-7 inline-flex h-12 items-center justify-center rounded-xl bg-emerald-700 px-6 text-sm font-black text-white transition hover:bg-emerald-800"
            >
              Sign in
            </Link>
          </section>
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
              Back to account
            </Link>

            <p className="mt-9 text-sm font-black uppercase tracking-[0.18em] text-emerald-700">
              Create Page
            </p>

            <h1 className="mt-3 text-4xl font-black tracking-[-0.05em] sm:text-6xl">
              Build your page.
            </h1>
          </div>
        </section>

        <form
          onSubmit={handleSubmit}
          className="mx-auto w-full max-w-3xl px-5 py-10 sm:px-8 sm:py-14"
        >
          <div className="space-y-8">
            <section>
              <label htmlFor="page-name" className="block text-sm font-black">
                Name
              </label>
              <input
                id="page-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Business or organisation name"
                className="mt-3 h-14 w-full rounded-2xl border border-black/15 px-5 font-semibold outline-none transition focus:border-emerald-700 focus:ring-4 focus:ring-emerald-100"
              />
            </section>

            <section className="border-t border-black/10 pt-8">
              <label className="block text-sm font-black">Logo</label>

              <label className="mt-3 flex cursor-pointer items-center gap-4 rounded-2xl border border-black/15 p-4 transition hover:border-black/30">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(event) => setLogo(event.target.files?.[0] ?? null)}
                />

                <div className="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-black/[0.04]">
                  {logoPreview ? (
                    <Image
                      src={logoPreview}
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
                    {logo ? "Change logo" : "Upload logo"}
                  </p>
                  <p className="mt-1 text-sm text-black/45">PNG, JPG or WEBP</p>
                </div>
              </label>
            </section>

            <section className="border-t border-black/10 pt-8">
              <label htmlFor="brand-colour" className="block text-sm font-black">
                Brand Colour
              </label>

              <div className="mt-3 flex items-center gap-3 rounded-2xl border border-black/15 p-3">
                <input
                  id="brand-colour"
                  type="color"
                  value={brandColour}
                  onChange={(event) => setBrandColour(event.target.value)}
                  className="h-12 w-14 cursor-pointer rounded-xl border-0 bg-transparent p-0"
                />
                <input
                  value={brandColour}
                  onChange={(event) => setBrandColour(event.target.value)}
                  maxLength={7}
                  className="h-12 min-w-0 flex-1 bg-transparent px-2 font-black uppercase outline-none"
                />
                <div
                  className="h-12 w-12 shrink-0 rounded-xl border border-black/10"
                  style={{ backgroundColor: brandColour }}
                />
              </div>
            </section>

            <section className="border-t border-black/10 pt-8">
              <label htmlFor="website" className="block text-sm font-black">
                Website
              </label>
              <input
                id="website"
                type="text"
                inputMode="url"
                value={website}
                onChange={(event) => setWebsite(event.target.value)}
                placeholder="www.example.com"
                onBlur={() => {
                  const normalised = normaliseUrl(website);
                  setWebsite(normalised ?? "");
                }}
                className="mt-3 h-14 w-full rounded-2xl border border-black/15 px-5 font-semibold outline-none transition focus:border-emerald-700 focus:ring-4 focus:ring-emerald-100"
              />
            </section>

            <section className="border-t border-black/10 pt-8">
              <label htmlFor="facebook" className="block text-sm font-black">
                Facebook
              </label>
              <div className="mt-3 flex h-14 overflow-hidden rounded-2xl border border-black/15 focus-within:border-emerald-700 focus-within:ring-4 focus-within:ring-emerald-100">
                <span className="flex items-center border-r border-black/10 bg-black/[0.03] px-4 text-sm font-bold text-black/45">
                  facebook.com/
                </span>
                <input
                  id="facebook"
                  value={facebook}
                  onChange={(event) => setFacebook(normaliseHandle(event.target.value))}
                  placeholder="yourpage"
                  className="min-w-0 flex-1 px-4 font-semibold outline-none"
                />
              </div>
            </section>

            <section className="border-t border-black/10 pt-8">
              <label htmlFor="instagram" className="block text-sm font-black">
                Instagram
              </label>
              <div className="mt-3 flex h-14 overflow-hidden rounded-2xl border border-black/15 focus-within:border-emerald-700 focus-within:ring-4 focus-within:ring-emerald-100">
                <span className="flex items-center border-r border-black/10 bg-black/[0.03] px-4 font-black text-black/45">
                  @
                </span>
                <input
                  id="instagram"
                  value={instagram}
                  onChange={(event) => setInstagram(normaliseHandle(event.target.value))}
                  placeholder="yourpage"
                  className="min-w-0 flex-1 px-4 font-semibold outline-none"
                />
              </div>
            </section>

            <section className="border-t border-black/10 pt-8">
              <div className="flex items-end justify-between gap-4">
                <label className="block text-sm font-black">Images</label>
                <span className="text-sm font-bold text-black/40">
                  {images.length}/{MAX_IMAGES}
                </span>
              </div>

              <div className="mt-3 grid grid-cols-3 gap-3">
                {images.map((image) => (
                  <div
                    key={image.id}
                    className="group relative aspect-square overflow-hidden rounded-2xl bg-black/[0.04]"
                  >
                    <Image
                      src={image.previewUrl}
                      alt="Selected page image"
                      fill
                      unoptimized
                      className="object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(image.id)}
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
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={handleImageUpload}
                    />
                    <ImagePlus className="h-7 w-7" />
                    <span className="mt-2 text-xs font-black">Add images</span>
                  </label>
                ) : null}
              </div>
            </section>

            {message ? (
              <p
                className={`rounded-2xl px-5 py-4 text-sm font-bold ${
                  message === "Page details are ready to submit."
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
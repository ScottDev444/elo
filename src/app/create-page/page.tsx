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
  CheckCircle2,
  ChevronRight,
  Globe2,
  ImagePlus,
  LoaderCircle,
  Send,
  ShieldCheck,
  X,
} from "lucide-react";
import { FaFacebook, FaInstagram } from "react-icons/fa";
import { useRouter } from "next/navigation";

import SiteHeader from "@/components/SiteHeader";
import { createClient } from "@/lib/supabase/client";

const MAX_IMAGES = 3;
const PAGE_IMAGE_BUCKET = "post-images";
const DEFAULT_BRAND_COLOUR = "#005744";

type SelectedImage = {
  id: string;
  file: File;
  previewUrl: string;
  mimeType: string;
  extension: string;
};

function makeUuid() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(
    /[xy]/g,
    (char) => {
      const random = Math.floor(Math.random() * 16);
      const value = char === "x" ? random : (random & 0x3) | 0x8;
      return value.toString(16);
    }
  );
}

function normaliseHex(value: string | null | undefined) {
  const clean = value?.trim();

  if (clean && /^#[0-9A-Fa-f]{6}$/.test(clean)) {
    return clean.toUpperCase();
  }

  return DEFAULT_BRAND_COLOUR;
}

function getReadableTextColour(hex: string) {
  const clean = normaliseHex(hex).replace("#", "");

  const red = Number.parseInt(clean.slice(0, 2), 16);
  const green = Number.parseInt(clean.slice(2, 4), 16);
  const blue = Number.parseInt(clean.slice(4, 6), 16);

  const luminance =
    (0.299 * red + 0.587 * green + 0.114 * blue) / 255;

  return luminance > 0.62 ? "#111111" : "#FFFFFF";
}

function normaliseUrl(value: string) {
  const clean = value.trim();

  if (!clean) {
    return null;
  }

  return /^https?:\/\//i.test(clean)
    ? clean
    : `https://${clean}`;
}

function normaliseHandle(value: string) {
  return value
    .trim()
    .replace(
      /^https?:\/\/(www\.)?(facebook|instagram)\.com\//i,
      ""
    )
    .replace(/^@+/, "")
    .replace(/\/$/, "");
}

function socialUrl(
  platform: "facebook" | "instagram",
  value: string
) {
  const handle = normaliseHandle(value);

  if (!handle) {
    return null;
  }

  return `https://www.${platform}.com/${handle}`;
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

function fileExtension(file: File) {
  const fromName = file.name
    .split(".")
    .pop()
    ?.toLowerCase()
    .replace(/[^a-z0-9]/g, "");

  if (fromName === "png" || fromName === "webp" || fromName === "jpg") {
    return fromName;
  }

  if (fromName === "jpeg") {
    return "jpg";
  }

  if (file.type === "image/png") {
    return "png";
  }

  if (file.type === "image/webp") {
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
    <div className="elo-page-label-row">
      <label>{children}</label>

      {optional && <span>OPTIONAL</span>}
    </div>
  );
}

function PageHeaderPreview({
  name,
  logoUrl,
  accent,
}: {
  name: string;
  logoUrl: string;
  accent: string;
}) {
  const textColour = getReadableTextColour(accent);

  return (
    <div
      className="elo-page-preview"
      style={{
        backgroundColor: accent,
      }}
    >
      <svg
        className="elo-page-preview-shards"
        viewBox="0 0 400 190"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <polygon points="0,0 108,0 65,82 0,109" fill="#FFFFFF" fillOpacity=".08" />
        <polygon points="108,0 228,0 167,76 65,82" fill="#000000" fillOpacity=".07" />
        <polygon points="228,0 330,0 279,94 167,76" fill="#FFFFFF" fillOpacity=".11" />
        <polygon points="330,0 400,0 400,81 279,94" fill="#000000" fillOpacity=".08" />
        <polygon points="0,109 65,82 130,190 0,190" fill="#000000" fillOpacity=".05" />
        <polygon points="65,82 167,76 220,190 130,190" fill="#FFFFFF" fillOpacity=".07" />
        <polygon points="167,76 279,94 322,190 220,190" fill="#000000" fillOpacity=".09" />
        <polygon points="279,94 400,81 400,190 322,190" fill="#FFFFFF" fillOpacity=".08" />
      </svg>

      <div className="elo-page-preview-share">
        <span>↗</span>
      </div>

      {logoUrl && (
        <div className="elo-page-preview-logo-outer">
          <div className="elo-page-preview-logo-inner">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logoUrl} alt="" />
          </div>
        </div>
      )}

      <div className="elo-page-preview-content">
        <div
          className="elo-page-preview-eyebrow"
          style={{ color: textColour }}
        >
          OFFICIAL ELO PAGE
        </div>

        <div
          className="elo-page-preview-name"
          style={{ color: textColour }}
        >
          {name.trim() || "Your Page"}
        </div>
      </div>
    </div>
  );
}

export default function CreatePagePage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const logoInputRef = useRef<HTMLInputElement | null>(null);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [brandColour, setBrandColour] = useState(DEFAULT_BRAND_COLOUR);
  const [website, setWebsite] = useState("");
  const [facebook, setFacebook] = useState("");
  const [instagram, setInstagram] = useState("");

  const [logo, setLogo] = useState<SelectedImage | null>(null);
  const [images, setImages] = useState<SelectedImage[]>([]);

  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successOpen, setSuccessOpen] = useState(false);

  const logoRef = useRef<SelectedImage | null>(null);
  const imagesRef = useRef<SelectedImage[]>([]);

  useEffect(() => {
    logoRef.current = logo;
  }, [logo]);

  useEffect(() => {
    imagesRef.current = images;
  }, [images]);

  useEffect(() => {
    return () => {
      if (logoRef.current) {
        URL.revokeObjectURL(logoRef.current.previewUrl);
      }

      imagesRef.current.forEach((image) =>
        URL.revokeObjectURL(image.previewUrl)
      );
    };
  }, []);

  const remainingImages = MAX_IMAGES - images.length;
  const buttonLabel = submitting
    ? "Creating Page..."
    : "Submit Page for review";

  function toSelectedImage(file: File): SelectedImage {
    return {
      id: makeUuid(),
      file,
      previewUrl: URL.createObjectURL(file),
      mimeType: file.type || "image/jpeg",
      extension: fileExtension(file),
    };
  }

  function chooseLogo(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    event.target.value = "";

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setErrorMessage("Choose an image file for your logo.");
      return;
    }

    if (logo) {
      URL.revokeObjectURL(logo.previewUrl);
    }

    setLogo(toSelectedImage(file));
    setErrorMessage(null);
  }

  function chooseGalleryImages(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";

    if (files.length === 0 || remainingImages <= 0) {
      return;
    }

    const accepted = files
      .filter((file) => file.type.startsWith("image/"))
      .slice(0, remainingImages)
      .map(toSelectedImage);

    setImages((current) => [...current, ...accepted]);
    setErrorMessage(null);
  }

  function removeGalleryImage(id: string) {
    setImages((current) => {
      const removed = current.find((item) => item.id === id);

      if (removed) {
        URL.revokeObjectURL(removed.previewUrl);
      }

      return current.filter((item) => item.id !== id);
    });
  }

  async function uploadImage(
    image: SelectedImage,
    userId: string,
    pageId: string,
    folder: "logo" | "gallery"
  ) {
    const path =
      `${userId}/${pageId}/${folder}/${makeUuid()}.${image.extension}`;

    const { error } = await supabase.storage
      .from(PAGE_IMAGE_BUCKET)
      .upload(path, image.file, {
        contentType: image.mimeType,
        cacheControl: "3600",
        upsert: false,
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

  async function createPage() {
    if (submitting) {
      return;
    }

    const cleanName = name.trim();

    if (!cleanName) {
      setErrorMessage(
        "Add the name of your business, organisation or community group."
      );
      return;
    }

    if (!logo) {
      setErrorMessage("Add a logo before submitting your Page.");
      return;
    }

    const validBrandColour = normaliseHex(brandColour);
    setBrandColour(validBrandColour);
    setSubmitting(true);
    setErrorMessage(null);

    const uploadedPaths: string[] = [];
    let createdPageId: string | null = null;

    try {
      const {
        data: sessionData,
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        throw sessionError;
      }

      const user = sessionData.session?.user;

      if (!user) {
        router.replace(
          `/log-in?next=${encodeURIComponent("/create-page")}`
        );
        return;
      }

      const {
        data: existingPage,
        error: existingError,
      } = await supabase
        .from("groups")
        .select("id")
        .eq("user_id", user.id)
        .order("created_at", {
          ascending: true,
        })
        .limit(1)
        .maybeSingle();

      if (existingError) {
        throw existingError;
      }

      if (existingPage) {
        throw new Error(
          "Each account can currently have one ELO Page."
        );
      }

      const pageId = makeUuid();
      createdPageId = pageId;

      const baseSlug = createSlug(cleanName);
      const slug =
        `${baseSlug || "page"}-${makeUuid().slice(0, 8)}`;

      const initialLayout = {
        socials: {
          facebook: socialUrl("facebook", facebook),
          instagram: socialUrl("instagram", instagram),
        },
      };

      const {
        error: createError,
      } = await supabase
        .from("groups")
        .insert({
          id: pageId,
          user_id: user.id,
          name: cleanName,
          description: description.trim() || null,
          slug,
          website: normaliseUrl(website),
          brand_color: validBrandColour,
          logo_url: null,
          layout: initialLayout,
          showcase_images: [],
          is_public: true,
          is_local_partner: false,
          status: "pending",
          submitted_at: new Date().toISOString(),
          place_enabled: false,
        });

      if (createError) {
        throw new Error(
          `Page creation failed: ${createError.message}`
        );
      }

      const uploadedLogo = await uploadImage(
        logo,
        user.id,
        pageId,
        "logo"
      );

      uploadedPaths.push(uploadedLogo.path);

      const galleryUrls: string[] = [];

      for (const image of images) {
        const uploaded = await uploadImage(
          image,
          user.id,
          pageId,
          "gallery"
        );

        uploadedPaths.push(uploaded.path);
        galleryUrls.push(uploaded.url);
      }

      const {
        error: updateError,
      } = await supabase
        .from("groups")
        .update({
          logo_url: uploadedLogo.url,
          showcase_images: galleryUrls,
        })
        .eq("id", pageId)
        .eq("user_id", user.id);

      if (updateError) {
        throw new Error(
          `Page image update failed: ${updateError.message}`
        );
      }

      createdPageId = null;
      uploadedPaths.splice(0, uploadedPaths.length);
      setSuccessOpen(true);
    } catch (error) {
      if (uploadedPaths.length > 0) {
        await supabase.storage
          .from(PAGE_IMAGE_BUCKET)
          .remove(uploadedPaths);
      }

      if (createdPageId) {
        await supabase
          .from("groups")
          .delete()
          .eq("id", createdPageId);
      }

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to create Page. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="elo-page-editor-page">
      <SiteHeader />

      <section className="elo-page-editor-shell">
        <header className="elo-page-editor-intro">
          <div className="elo-page-editor-eyebrow">
            CREATE PAGE
          </div>

          <h1>Put your organisation on ELO.</h1>

          <p>
            Create one official Page for your local business, organisation or community group.
          </p>
        </header>

        <div className="elo-page-review-notice">
          <div className="elo-page-review-icon">
            <ShieldCheck size={22} />
          </div>

          <div>
            <strong>Every Page is reviewed</strong>

            <p>
              Your Page will be submitted for manual approval before it appears publicly on ELO.
            </p>
          </div>
        </div>

        {errorMessage && (
          <div className="elo-page-editor-error" role="alert">
            <span>{errorMessage}</span>

            <button
              type="button"
              onClick={() => setErrorMessage(null)}
              aria-label="Dismiss error"
            >
              <X size={16} />
            </button>
          </div>
        )}

        <section className="elo-page-preview-section">
          <div className="elo-page-preview-label">
            PAGE HEADER PREVIEW
          </div>

          <PageHeaderPreview
            name={name}
            logoUrl={logo?.previewUrl ?? ""}
            accent={normaliseHex(brandColour)}
          />
        </section>

        <div className="elo-page-editor-form">
          <section className="elo-page-editor-field">
            <FieldLabel>Page name</FieldLabel>

            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Business or organisation name"
              maxLength={100}
              disabled={submitting}
            />
          </section>

          <section className="elo-page-editor-field">
            <FieldLabel optional>About</FieldLabel>

            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Tell East Lothian what you do..."
              maxLength={1000}
              disabled={submitting}
            />

            <div className="elo-page-character-count">
              {description.length}/1000
            </div>
          </section>

          <section className="elo-page-editor-field">
            <FieldLabel>Logo</FieldLabel>

            <input
              ref={logoInputRef}
              type="file"
              accept="image/*"
              className="elo-page-hidden-input"
              onChange={chooseLogo}
            />

            <button
              type="button"
              className="elo-page-logo-picker"
              onClick={() => logoInputRef.current?.click()}
              disabled={submitting}
            >
              <span className="elo-page-logo-preview">
                {logo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={logo.previewUrl} alt="" />
                ) : (
                  <ImagePlus size={27} />
                )}
              </span>

              <span className="elo-page-logo-copy">
                <strong>
                  {logo ? "Change logo" : "Choose logo"}
                </strong>

                <small>
                  Required · square images work best
                </small>
              </span>

              <ChevronRight size={18} />
            </button>
          </section>

          <section className="elo-page-editor-field">
            <FieldLabel>Brand colour</FieldLabel>

            <div className="elo-page-colour-card">
              <input
                type="color"
                value={normaliseHex(brandColour)}
                onChange={(event) =>
                  setBrandColour(event.target.value.toUpperCase())
                }
                disabled={submitting}
              />

              <div>
                <strong>{normaliseHex(brandColour)}</strong>

                <span>
                  Choose the colour used across your Page.
                </span>
              </div>
            </div>
          </section>

          <section className="elo-page-editor-field">
            <FieldLabel optional>Website</FieldLabel>

            <div className="elo-page-icon-input">
              <Globe2 size={19} />

              <input
                value={website}
                onChange={(event) => setWebsite(event.target.value)}
                placeholder="www.example.com"
                disabled={submitting}
              />
            </div>
          </section>

          <section className="elo-page-editor-field">
            <FieldLabel optional>Facebook</FieldLabel>

            <div className="elo-page-icon-input">
              <FaFacebook size={18} />

              <input
                value={facebook}
                onChange={(event) =>
                  setFacebook(normaliseHandle(event.target.value))
                }
                placeholder="yourpage"
                disabled={submitting}
              />
            </div>
          </section>

          <section className="elo-page-editor-field">
            <FieldLabel optional>Instagram</FieldLabel>

            <div className="elo-page-icon-input">
              <FaInstagram size={18} />

              <span className="elo-page-handle-prefix">@</span>

              <input
                value={instagram}
                onChange={(event) =>
                  setInstagram(normaliseHandle(event.target.value))
                }
                placeholder="yourpage"
                disabled={submitting}
              />
            </div>
          </section>

          <section className="elo-page-editor-field">
            <div className="elo-page-gallery-heading">
              <div>
                <FieldLabel optional>Page photos</FieldLabel>
              </div>

              <span>{images.length}/{MAX_IMAGES}</span>
            </div>

            <input
              ref={galleryInputRef}
              type="file"
              multiple
              accept="image/*"
              className="elo-page-hidden-input"
              onChange={chooseGalleryImages}
            />

            <div className="elo-page-gallery">
              {images.map((image) => (
                <div key={image.id} className="elo-page-gallery-tile">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={image.previewUrl} alt="" />

                  <button
                    type="button"
                    aria-label="Remove photo"
                    onClick={() => removeGalleryImage(image.id)}
                  >
                    <X size={17} />
                  </button>
                </div>
              ))}

              {remainingImages > 0 && (
                <button
                  type="button"
                  className="elo-page-add-photo"
                  onClick={() =>
                    galleryInputRef.current?.click()
                  }
                  disabled={submitting}
                >
                  <ImagePlus size={25} />
                  <span>Add photos</span>
                </button>
              )}
            </div>

            <p className="elo-page-gallery-help">
              Add up to three images. You can change these later.
            </p>
          </section>

          <button
            type="button"
            className="elo-page-submit-button"
            onClick={() => void createPage()}
            disabled={submitting}
          >
            {submitting ? (
              <LoaderCircle
                size={19}
                className="elo-page-spin"
              />
            ) : (
              <Send size={19} />
            )}

            <span>{buttonLabel}</span>
          </button>
        </div>
      </section>

      {successOpen && (
        <div className="elo-page-modal-root">
          <div
            className="elo-page-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="elo-page-created-title"
          >
            <div className="elo-page-modal-icon">
              <CheckCircle2 size={27} />
            </div>

            <h2 id="elo-page-created-title">
              Thanks for creating your ELO Page
            </h2>

            <p>
              We manually review every Page before it goes live. Your Page is now under review and will appear in your Account while we check it.
            </p>

            <button
              type="button"
              onClick={() => {
                setSuccessOpen(false);
                router.push("/account");
                router.refresh();
              }}
            >
              Done
            </button>
          </div>
        </div>
      )}

      <style>{styles}</style>
    </main>
  );
}

const styles = `
  .elo-page-editor-page {
    min-height: 100dvh;
    background: #F4F5F4;
    color: #17221F;
    font-family: var(--font-geist-sans), Arial, sans-serif;
  }

  .elo-page-editor-page *,
  .elo-page-editor-page *::before,
  .elo-page-editor-page *::after {
    box-sizing: border-box;
  }

  .elo-page-editor-page button,
  .elo-page-editor-page input,
  .elo-page-editor-page textarea {
    font: inherit;
  }

  .elo-page-editor-shell {
    width: 100%;
    max-width: 760px;
    margin: 0 auto;
    padding-bottom: 130px;
  }

  .elo-page-editor-intro {
    padding: 24px 18px 22px;
  }

  .elo-page-editor-eyebrow {
    margin-bottom: 7px;
    color: #005744;
    font-size: 9px;
    font-weight: 900;
    letter-spacing: 1.3px;
  }

  .elo-page-editor-intro h1 {
    margin: 0;
    color: #111614;
    font-size: 29px;
    line-height: 34px;
    font-weight: 900;
    letter-spacing: -.7px;
  }

  .elo-page-editor-intro p {
    margin: 8px 0 0;
    color: #68736F;
    font-size: 14px;
    line-height: 21px;
  }

  .elo-page-review-notice {
    display: flex;
    align-items: flex-start;
    gap: 11px;
    margin: 0 18px 16px;
    border-radius: 17px;
    background: #EAF4F0;
    padding: 14px;
  }

  .elo-page-review-icon {
    width: 42px;
    height: 42px;
    flex: 0 0 42px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 13px;
    background: #FFFFFF;
    color: #005744;
  }

  .elo-page-review-notice strong {
    color: #1F3F35;
    font-size: 12px;
    font-weight: 900;
  }

  .elo-page-review-notice p {
    margin: 3px 0 0;
    color: #587268;
    font-size: 10px;
    line-height: 15px;
  }

  .elo-page-editor-error {
    display: flex;
    align-items: center;
    gap: 10px;
    margin: 0 18px 14px;
    border-radius: 13px;
    background: #FDECEA;
    padding: 11px 12px;
    color: #A52B21;
    font-size: 11px;
    line-height: 17px;
    font-weight: 700;
  }

  .elo-page-editor-error span {
    flex: 1;
  }

  .elo-page-editor-error button {
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

  .elo-page-preview-section {
    margin-bottom: 12px;
  }

  .elo-page-preview-label {
    margin: 0 18px 7px;
    color: #84908C;
    font-size: 8px;
    font-weight: 900;
    letter-spacing: 1.2px;
  }

  .elo-page-preview {
    position: relative;
    min-height: 190px;
    overflow: hidden;
  }

  .elo-page-preview-shards {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
  }

  .elo-page-preview-share {
    position: absolute;
    z-index: 5;
    top: 16px;
    left: 16px;
    width: 44px;
    height: 44px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1px solid rgba(0,0,0,.08);
    border-radius: 50%;
    background: rgba(255,255,255,.95);
    color: #173C33;
    font-size: 20px;
  }

  .elo-page-preview-logo-outer {
    position: absolute;
    z-index: 5;
    top: 14px;
    right: 16px;
    width: 68px;
    height: 68px;
    border-radius: 50%;
    background: #FFFFFF;
    padding: 4px;
    box-shadow: 0 2px 6px rgba(0,0,0,.14);
  }

  .elo-page-preview-logo-inner {
    width: 100%;
    height: 100%;
    overflow: hidden;
    border-radius: 50%;
    background: #FFFFFF;
  }

  .elo-page-preview-logo-inner img {
    width: 100%;
    height: 100%;
    display: block;
    object-fit: contain;
  }

  .elo-page-preview-content {
    position: relative;
    z-index: 2;
    padding: 92px 18px 23px;
  }

  .elo-page-preview-eyebrow {
    margin-bottom: 8px;
    font-size: 8px;
    font-weight: 900;
    letter-spacing: 1.1px;
    opacity: .76;
  }

  .elo-page-preview-name {
    max-width: 85%;
    font-size: 30px;
    line-height: 34px;
    font-weight: 900;
    letter-spacing: -.7px;
  }

  .elo-page-editor-form {
    padding: 12px 18px 0;
  }

  .elo-page-editor-field {
    padding: 20px 0;
    border-bottom: 1px solid #D6DDDA;
  }

  .elo-page-label-row {
    min-height: 20px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 9px;
  }

  .elo-page-label-row label {
    color: #1C2925;
    font-size: 13px;
    font-weight: 900;
  }

  .elo-page-label-row span {
    color: #97A09D;
    font-size: 7px;
    font-weight: 900;
    letter-spacing: 1px;
  }

  .elo-page-editor-field > input,
  .elo-page-editor-field > textarea {
    width: 100%;
    min-height: 54px;
    border: 1px solid #D5DCDA;
    border-radius: 14px;
    outline: none;
    background: #FFFFFF;
    padding: 0 15px;
    color: #17221F;
    font-size: 15px;
    font-weight: 600;
  }

  .elo-page-editor-field > textarea {
    min-height: 135px;
    resize: vertical;
    padding-top: 14px;
    padding-bottom: 14px;
    line-height: 21px;
  }

  .elo-page-editor-field > input:focus,
  .elo-page-editor-field > textarea:focus,
  .elo-page-icon-input:focus-within {
    border-color: #9EACA7;
  }

  .elo-page-character-count {
    margin-top: 6px;
    color: #9AA39F;
    font-size: 9px;
    font-weight: 700;
    text-align: right;
  }

  .elo-page-hidden-input {
    display: none;
  }

  .elo-page-logo-picker {
    width: 100%;
    min-height: 92px;
    display: flex;
    align-items: center;
    gap: 12px;
    border: 1px solid #D5DCDA;
    border-radius: 16px;
    background: #FFFFFF;
    padding: 12px;
    text-align: left;
    cursor: pointer;
  }

  .elo-page-logo-preview {
    width: 66px;
    height: 66px;
    flex: 0 0 66px;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    border-radius: 14px;
    background: #EEF1EF;
    color: #83908B;
  }

  .elo-page-logo-preview img {
    width: 100%;
    height: 100%;
    display: block;
    object-fit: contain;
    background: #FFFFFF;
  }

  .elo-page-logo-copy {
    min-width: 0;
    flex: 1;
    display: flex;
    flex-direction: column;
  }

  .elo-page-logo-copy strong {
    color: #1B2824;
    font-size: 14px;
    font-weight: 900;
  }

  .elo-page-logo-copy small {
    margin-top: 3px;
    color: #84908C;
    font-size: 11px;
  }

  .elo-page-colour-card {
    display: flex;
    align-items: center;
    gap: 13px;
    border: 1px solid #D5DCDA;
    border-radius: 16px;
    background: #FFFFFF;
    padding: 14px;
  }

  .elo-page-colour-card input[type="color"] {
    width: 62px;
    height: 52px;
    flex: 0 0 62px;
    border: 0;
    border-radius: 11px;
    background: transparent;
    padding: 0;
    cursor: pointer;
  }

  .elo-page-colour-card > div {
    display: flex;
    flex-direction: column;
  }

  .elo-page-colour-card strong {
    color: #26332E;
    font-size: 12px;
    font-weight: 900;
  }

  .elo-page-colour-card span {
    margin-top: 3px;
    color: #84908C;
    font-size: 10px;
  }

  .elo-page-icon-input {
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

  .elo-page-icon-input input {
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

  .elo-page-handle-prefix {
    margin-right: -5px;
    color: #68736F;
    font-size: 14px;
    font-weight: 700;
  }

  .elo-page-gallery-heading {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
  }

  .elo-page-gallery-heading > span {
    margin-top: 2px;
    color: #84908C;
    font-size: 10px;
    font-weight: 800;
  }

  .elo-page-gallery {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 9px;
  }

  .elo-page-gallery-tile,
  .elo-page-add-photo {
    position: relative;
    aspect-ratio: 1;
    overflow: hidden;
    border-radius: 14px;
  }

  .elo-page-gallery-tile {
    background: #E5EAE7;
  }

  .elo-page-gallery-tile img {
    width: 100%;
    height: 100%;
    display: block;
    object-fit: cover;
  }

  .elo-page-gallery-tile button {
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

  .elo-page-add-photo {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    border: 1px dashed #A7B4AF;
    background: #F8F9F8;
    color: #005744;
    cursor: pointer;
  }

  .elo-page-add-photo span {
    margin-top: 5px;
    font-size: 9px;
    font-weight: 900;
  }

  .elo-page-gallery-help {
    margin: 9px 0 0;
    color: #8A9591;
    font-size: 10px;
    line-height: 15px;
  }

  .elo-page-submit-button {
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

  .elo-page-submit-button:disabled {
    opacity: .55;
    cursor: wait;
  }

  .elo-page-modal-root {
    position: fixed;
    z-index: 2200;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 22px;
    background: rgba(0,0,0,.5);
  }

  .elo-page-modal {
    width: 100%;
    max-width: 430px;
    border-radius: 22px;
    background: #FFFFFF;
    padding: 22px;
    box-shadow: 0 24px 70px rgba(0,0,0,.2);
  }

  .elo-page-modal-icon {
    width: 52px;
    height: 52px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 16px;
    background: #E7F3EE;
    color: #005744;
  }

  .elo-page-modal h2 {
    margin: 14px 0 0;
    color: #17221F;
    font-size: 21px;
    line-height: 26px;
    font-weight: 900;
  }

  .elo-page-modal p {
    margin: 7px 0 0;
    color: #6E7974;
    font-size: 12px;
    line-height: 19px;
  }

  .elo-page-modal button {
    width: 100%;
    height: 49px;
    margin-top: 18px;
    border: 0;
    border-radius: 13px;
    background: #005744;
    color: #FFFFFF;
    font-size: 11px;
    font-weight: 900;
    cursor: pointer;
  }

  .elo-page-spin {
    animation: elo-page-spin .8s linear infinite;
  }

  @keyframes elo-page-spin {
    to { transform: rotate(360deg); }
  }

  @media (prefers-reduced-motion: reduce) {
    .elo-page-spin {
      animation: none;
    }
  }
`;

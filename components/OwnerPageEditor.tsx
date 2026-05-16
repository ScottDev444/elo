"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import PostCard from "@/components/PostCard";
import { supabase } from "@/lib/supabase";

type PageType = "business" | "service" | "organisation";
type PageStatus = "draft" | "pending" | "approved";
type DayKey = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

type OpeningHours = Record<
  DayKey,
  {
    closed: boolean;
    open: string;
    close: string;
  }
>;

type CTAButton = {
  label: "Phone" | "Email" | "Website";
  href: string;
};

type ShowcaseImage = {
  url: string;
};

type ServiceItem = {
  text: string;
  icon: string;
};

type Group = {
  id: string;
  user_id?: string | null;
  name: string;
  slug: string;
  description?: string | null;
  logo_url?: string | null;
  brand_color?: string | null;
  page_type?: PageType | null;
  status?: PageStatus | null;
  opening_hours?: OpeningHours | null;
  address?: string | null;
  cta_buttons?: CTAButton[] | null;
  showcase_images?: ShowcaseImage[] | null;
  services?: ServiceItem[] | null;
};

type Post = {
  id: string;
  title: string;
  content?: string | null;
  type?: string | null;
  image_url?: string | null;
  metadata?: any;
  created_at?: string;
  group_id?: string;
  groups?: any;
};

type Props = {
  initialGroup: Group;
  initialPosts: Post[];
};

const defaultBrandColor = "#15803d";
const maxImageSizeBytes = 8 * 1024 * 1024;

const days: { key: DayKey; label: string; short: string }[] = [
  { key: "mon", label: "Monday", short: "Mon" },
  { key: "tue", label: "Tuesday", short: "Tue" },
  { key: "wed", label: "Wednesday", short: "Wed" },
  { key: "thu", label: "Thursday", short: "Thu" },
  { key: "fri", label: "Friday", short: "Fri" },
  { key: "sat", label: "Saturday", short: "Sat" },
  { key: "sun", label: "Sunday", short: "Sun" },
];

const pageTypes: { value: PageType; label: string; text: string }[] = [
  { value: "business", label: "Business", text: "Cafés, shops, venues, places." },
  {
    value: "organisation",
    label: "Organisation",
    text: "Clubs, charities, churches, groups.",
  },
  { value: "service", label: "Service", text: "Trades, freelancers, local services." },
];

const brandColours = [
  "#15803d",
  "#166534",
  "#0f766e",
  "#0369a1",
  "#2563eb",
  "#7c3aed",
  "#be185d",
  "#b91c1c",
  "#ea580c",
  "#ca8a04",
  "#374151",
  "#111827",
];

const serviceIcons = [
  "🛠️",
  "🔧",
  "⚡",
  "🚿",
  "🏠",
  "🪚",
  "🎨",
  "🧹",
  "💻",
  "📷",
  "✂️",
  "🚗",
  "💅",
  "🐶",
  "✨",
];

const defaultCTAButtons: CTAButton[] = [
  { label: "Phone", href: "" },
  { label: "Email", href: "" },
  { label: "Website", href: "" },
];

const defaultShowcaseImages: ShowcaseImage[] = [
  { url: "" },
  { url: "" },
  { url: "" },
];

function getDefaultOpeningHours(): OpeningHours {
  return {
    mon: { closed: false, open: "09:00", close: "17:00" },
    tue: { closed: false, open: "09:00", close: "17:00" },
    wed: { closed: false, open: "09:00", close: "17:00" },
    thu: { closed: false, open: "09:00", close: "17:00" },
    fri: { closed: false, open: "09:00", close: "17:00" },
    sat: { closed: false, open: "09:00", close: "17:00" },
    sun: { closed: true, open: "09:00", close: "17:00" },
  };
}

function normaliseOpeningHours(value: unknown): OpeningHours {
  const fallback = getDefaultOpeningHours();
  if (!value || typeof value !== "object" || Array.isArray(value)) return fallback;

  const source = value as Record<string, any>;

  return {
    mon: {
      closed: !!source.mon?.closed,
      open: source.mon?.open || "09:00",
      close: source.mon?.close || "17:00",
    },
    tue: {
      closed: !!source.tue?.closed,
      open: source.tue?.open || "09:00",
      close: source.tue?.close || "17:00",
    },
    wed: {
      closed: !!source.wed?.closed,
      open: source.wed?.open || "09:00",
      close: source.wed?.close || "17:00",
    },
    thu: {
      closed: !!source.thu?.closed,
      open: source.thu?.open || "09:00",
      close: source.thu?.close || "17:00",
    },
    fri: {
      closed: !!source.fri?.closed,
      open: source.fri?.open || "09:00",
      close: source.fri?.close || "17:00",
    },
    sat: {
      closed: !!source.sat?.closed,
      open: source.sat?.open || "09:00",
      close: source.sat?.close || "17:00",
    },
    sun: {
      closed: !!source.sun?.closed,
      open: source.sun?.open || "09:00",
      close: source.sun?.close || "17:00",
    },
  };
}

function normaliseCTAButtons(value: unknown): CTAButton[] {
  if (!Array.isArray(value)) return defaultCTAButtons;

  return defaultCTAButtons.map((button) => {
    const found = value.find(
      (item) =>
        typeof item?.label === "string" &&
        item.label.toLowerCase() === button.label.toLowerCase()
    );

    return {
      label: button.label,
      href: typeof found?.href === "string" ? found.href : "",
    };
  });
}

function normaliseShowcaseImages(value: unknown): ShowcaseImage[] {
  if (!Array.isArray(value)) return defaultShowcaseImages;

  const items = value
    .map((item) => ({
      url:
        typeof item === "string"
          ? item
          : typeof item?.url === "string"
          ? item.url
          : "",
    }))
    .slice(0, 3);

  while (items.length < 3) items.push({ url: "" });
  return items;
}

function normaliseServices(value: unknown): ServiceItem[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => ({
      text: typeof item?.text === "string" ? item.text : "",
      icon: typeof item?.icon === "string" ? item.icon : "🛠️",
    }))
    .filter((item) => item.text.trim())
    .slice(0, 10);
}

function sanitiseSlug(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function safeBrandColor(value: string) {
  return /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(value)
    ? value
    : defaultBrandColor;
}

function sanitisePhoneInput(value: string) {
  return value.replace(/[^\d+\s()-]/g, "");
}

function buildCTAHref(label: CTAButton["label"], value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";

  if (label === "Phone") {
    const phoneOnly = trimmed.replace(/[^\d+]/g, "");
    return phoneOnly ? `tel:${phoneOnly}` : "";
  }

  if (label === "Email") return `mailto:${trimmed.replace(/^mailto:/i, "")}`;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;

  return `https://${trimmed}`;
}

function getTypeCopy(pageType: PageType) {
  if (pageType === "business") {
    return {
      title: "Business page",
      about: "About this business",
      showOpeningHours: true,
      showLocation: true,
      showShowcase: true,
      showServices: false,
    };
  }

  if (pageType === "service") {
    return {
      title: "Service page",
      about: "About this service",
      showOpeningHours: false,
      showLocation: false,
      showShowcase: false,
      showServices: true,
    };
  }

  return {
    title: "Organisation page",
    about: "About this organisation",
    showOpeningHours: false,
    showLocation: false,
    showShowcase: true,
    showServices: false,
  };
}

async function fileToDataUrl(file: File) {
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () =>
      resolve(typeof reader.result === "string" ? reader.result : "");
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function compressImage(file: File, maxWidth: number, quality: number) {
  if (!file.type.startsWith("image/")) throw new Error("Please upload an image file.");
  if (file.size > maxImageSizeBytes) throw new Error("Image is too big. Max 8MB.");

  const dataUrl = await fileToDataUrl(file);

  return await new Promise<string>((resolve, reject) => {
    const image = new Image();

    image.onload = () => {
      const scale = Math.min(1, maxWidth / image.width);
      const canvas = document.createElement("canvas");

      canvas.width = Math.max(1, Math.round(image.width * scale));
      canvas.height = Math.max(1, Math.round(image.height * scale));

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Could not process image."));
        return;
      }

      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };

    image.onerror = () => reject(new Error("Could not process image."));
    image.src = dataUrl;
  });
}

function Card({
  title,
  text,
  children,
}: {
  title: string;
  text?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[2rem] border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-5">
        <h3 className="text-base font-black tracking-tight text-gray-950">
          {title}
        </h3>
        {text ? <p className="mt-1 text-sm leading-6 text-gray-500">{text}</p> : null}
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <label className="block space-y-2">
      <span className="block text-sm font-bold text-gray-900">{label}</span>
      {children}
      {hint ? <span className="block text-xs leading-5 text-gray-500">{hint}</span> : null}
    </label>
  );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-950 outline-none transition focus:border-gray-950 focus:bg-white focus:ring-4 focus:ring-gray-100 disabled:cursor-not-allowed disabled:opacity-60 ${
        props.className || ""
      }`}
    />
  );
}

function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm leading-6 text-gray-950 outline-none transition focus:border-gray-950 focus:bg-white focus:ring-4 focus:ring-gray-100 disabled:cursor-not-allowed disabled:opacity-60 ${
        props.className || ""
      }`}
    />
  );
}

function UploadBox({
  title,
  imageUrl,
  onChange,
  onRemove,
  disabled,
  square = false,
}: {
  title: string;
  imageUrl?: string;
  onChange: (file?: File | null) => void;
  onRemove?: () => void;
  disabled?: boolean;
  square?: boolean;
}) {
  return (
    <div className="rounded-[1.5rem] border border-dashed border-gray-300 bg-gray-50 p-3">
      <label className={disabled ? "cursor-not-allowed" : "cursor-pointer"}>
        <input
          type="file"
          accept="image/*"
          disabled={disabled}
          className="hidden"
          onChange={(e) => {
            onChange(e.target.files?.[0]);
            e.target.value = "";
          }}
        />

        <div
          className={`flex items-center justify-center overflow-hidden rounded-[1.25rem] bg-white ${
            square ? "aspect-square" : "min-h-[170px]"
          }`}
        >
          {imageUrl ? (
            <img src={imageUrl} alt={title} className="h-full w-full object-cover" />
          ) : (
            <div className="text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 text-xl">
                ↑
              </div>
              <p className="mt-3 text-sm font-bold text-gray-900">{title}</p>
              <p className="mt-1 text-xs text-gray-500">Upload image</p>
            </div>
          )}
        </div>
      </label>

      {imageUrl && onRemove ? (
        <button
          type="button"
          onClick={onRemove}
          disabled={disabled}
          className="mt-3 text-sm font-bold text-red-600 disabled:opacity-50"
        >
          Remove
        </button>
      ) : null}
    </div>
  );
}

export default function OwnerPageEditor({ initialGroup, initialPosts }: Props) {
  const status: PageStatus = initialGroup.status || "draft";
  const isDraft = status === "draft";
  const isPending = status === "pending";
  const isApproved = status === "approved";
  const canEdit = !isPending;
  const canEditPageType = isDraft;

  const [pageType, setPageType] = useState<PageType>(
    initialGroup.page_type || "organisation"
  );
  const [name, setName] = useState(initialGroup.name || "");
  const [slug, setSlug] = useState(sanitiseSlug(initialGroup.slug || ""));
  const [description, setDescription] = useState(initialGroup.description || "");
  const [logoUrl, setLogoUrl] = useState(initialGroup.logo_url || "");
  const [brandColor, setBrandColor] = useState(
    safeBrandColor(initialGroup.brand_color || defaultBrandColor)
  );
  const [address, setAddress] = useState(initialGroup.address || "");
  const [openingHours, setOpeningHours] = useState<OpeningHours>(
    normaliseOpeningHours(initialGroup.opening_hours)
  );
  const [ctaButtons, setCtaButtons] = useState<CTAButton[]>(
    normaliseCTAButtons(initialGroup.cta_buttons)
  );
  const [showcaseImages, setShowcaseImages] = useState<ShowcaseImage[]>(
    normaliseShowcaseImages(initialGroup.showcase_images)
  );
  const [services, setServices] = useState<ServiceItem[]>(
    normaliseServices(initialGroup.services)
  );
  const [aboutOpen, setAboutOpen] = useState(true);

  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDiscarding, setIsDiscarding] = useState(false);
  const [showPartnerPopup, setShowPartnerPopup] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const snapshotRef = useRef(
    JSON.stringify({
      pageType: initialGroup.page_type || "organisation",
      name: initialGroup.name || "",
      slug: sanitiseSlug(initialGroup.slug || ""),
      description: initialGroup.description || "",
      logoUrl: initialGroup.logo_url || "",
      brandColor: safeBrandColor(initialGroup.brand_color || defaultBrandColor),
      address: initialGroup.address || "",
      openingHours: normaliseOpeningHours(initialGroup.opening_hours),
      ctaButtons: normaliseCTAButtons(initialGroup.cta_buttons),
      showcaseImages: normaliseShowcaseImages(initialGroup.showcase_images),
      services: normaliseServices(initialGroup.services),
    })
  );

  const typeCopy = useMemo(() => getTypeCopy(pageType), [pageType]);

  const dirty = useMemo(() => {
    return (
      snapshotRef.current !==
      JSON.stringify({
        pageType,
        name,
        slug,
        description,
        logoUrl,
        brandColor,
        address,
        openingHours,
        ctaButtons,
        showcaseImages,
        services,
      })
    );
  }, [
    pageType,
    name,
    slug,
    description,
    logoUrl,
    brandColor,
    address,
    openingHours,
    ctaButtons,
    showcaseImages,
    services,
  ]);

  const previewCTAButtons = useMemo(
    () =>
      ctaButtons
        .map((button) => ({
          label: button.label,
          href: buildCTAHref(button.label, button.href),
        }))
        .filter((button) => button.href),
    [ctaButtons]
  );

  const orderedPosts = useMemo(() => {
    if (pageType !== "business") return initialPosts;

    const deals: Post[] = [];
    const rest: Post[] = [];

    for (const post of initialPosts) {
      if (post.type === "deal") deals.push(post);
      else rest.push(post);
    }

    return [...deals, ...rest];
  }, [initialPosts, pageType]);

  const filledShowcaseImages = showcaseImages.filter((image) => image.url.trim());
  const visibleServices = services.filter((service) => service.text.trim());

  function updateCTA(index: number, value: string) {
    if (!canEdit) return;

    setCtaButtons((prev) =>
      prev.map((button, i) =>
        i === index
          ? {
              ...button,
              href: button.label === "Phone" ? sanitisePhoneInput(value) : value,
            }
          : button
      )
    );
  }

  function updateDay(day: DayKey, field: "open" | "close", value: string) {
    if (!canEdit) return;

    setOpeningHours((prev) => ({
      ...prev,
      [day]: {
        ...prev[day],
        [field]: value,
      },
    }));
  }

  function toggleClosed(day: DayKey) {
    if (!canEdit) return;

    setOpeningHours((prev) => ({
      ...prev,
      [day]: {
        ...prev[day],
        closed: !prev[day].closed,
      },
    }));
  }

  async function handleLogoUpload(file?: File | null) {
    if (!file || !canEdit) return;

    try {
      setError("");
      const dataUrl = await compressImage(file, 800, 0.82);
      setLogoUrl(dataUrl);
    } catch (err: any) {
      setError(err?.message || "Could not upload image.");
    }
  }

  async function handleShowcaseUpload(index: number, file?: File | null) {
    if (!file || !canEdit) return;

    try {
      setError("");
      const dataUrl = await compressImage(file, 1400, 0.78);

      setShowcaseImages((prev) =>
        prev.map((image, i) => (i === index ? { url: dataUrl } : image))
      );
    } catch (err: any) {
      setError(err?.message || "Could not upload image.");
    }
  }

  function addService() {
    if (!canEdit || services.length >= 10) return;
    setServices((prev) => [...prev, { icon: "🛠️", text: "" }]);
  }

  function updateService(index: number, field: "icon" | "text", value: string) {
    if (!canEdit) return;

    setServices((prev) =>
      prev.map((service, i) =>
        i === index ? { ...service, [field]: value } : service
      )
    );
  }

  function removeService(index: number) {
    if (!canEdit) return;
    setServices((prev) => prev.filter((_, i) => i !== index));
  }

  async function savePage(options?: { quiet?: boolean }) {
    if (!canEdit || isSaving) return null;

    setIsSaving(true);
    if (!options?.quiet) {
      setMessage("");
      setError("");
    }

    try {
      const cleanSlug = sanitiseSlug(slug);

      if (!name.trim()) throw new Error("Page name is required.");
      if (!cleanSlug) throw new Error("Slug is required.");

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) throw new Error("You need to be signed in to save this page.");

      const payload = {
        page_type: canEditPageType
          ? pageType
          : initialGroup.page_type || pageType || "organisation",
        name: name.trim(),
        slug: cleanSlug,
        description: description.trim(),
        logo_url: logoUrl,
        brand_color: safeBrandColor(brandColor),
        address: pageType === "business" ? address.trim() : "",
        opening_hours: pageType === "business" ? openingHours : null,
        cta_buttons: ctaButtons
          .map((button) => ({ ...button, href: button.href.trim() }))
          .filter((button) => button.href),
        showcase_images:
          pageType === "business" || pageType === "organisation"
            ? showcaseImages.filter((image) => image.url.trim()).slice(0, 3)
            : [],
        services:
          pageType === "service"
            ? services.filter((service) => service.text.trim()).slice(0, 10)
            : [],
      };

      const { data, error } = await supabase
        .from("groups")
        .update(payload)
        .eq("id", initialGroup.id)
        .eq("user_id", user.id)
        .select("id")
        .maybeSingle();

      if (error) throw new Error(error.message);
      if (!data) throw new Error("No page was updated. Check this account owns the page.");

      setSlug(cleanSlug);
      setBrandColor(payload.brand_color);

      snapshotRef.current = JSON.stringify({
        pageType: payload.page_type,
        name: payload.name,
        slug: cleanSlug,
        description: payload.description,
        logoUrl,
        brandColor: payload.brand_color,
        address,
        openingHours,
        ctaButtons,
        showcaseImages,
        services,
      });

      if (!options?.quiet) setMessage("Saved.");
      return cleanSlug;
    } catch (err: any) {
      setError(err?.message || "Something went wrong.");
      return null;
    } finally {
      setIsSaving(false);
    }
  }

  async function submitForApproval() {
    if (!isDraft || isSubmitting || isSaving || isDiscarding) return;

    setIsSubmitting(true);
    setMessage("Saving...");
    setError("");

    try {
      const cleanSlug = await savePage({ quiet: true });
      if (!cleanSlug) throw new Error("Could not save page before submitting.");

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) throw new Error("You need to be signed in to submit this page.");

      const { data, error } = await supabase
        .from("groups")
        .update({ status: "pending" })
        .eq("id", initialGroup.id)
        .eq("user_id", user.id)
        .select("id")
        .maybeSingle();

      if (error) throw new Error(error.message);
      if (!data) throw new Error("No page was submitted. Check this account owns the page.");

      setMessage("Submitted for review.");
      setShowPartnerPopup(true);
      setIsSubmitting(false);
    } catch (err: any) {
      setError(err?.message || "Something went wrong.");
      setMessage("");
      setIsSubmitting(false);
    }
  }

  async function discardPage() {
    if (!isDraft || isDiscarding || isSaving || isSubmitting) return;
    if (!window.confirm("Discard this page? This cannot be undone.")) return;

    setIsDiscarding(true);
    setMessage("");
    setError("");

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) throw new Error("You need to be signed in to discard this page.");

      const { data, error } = await supabase
        .from("groups")
        .delete()
        .eq("id", initialGroup.id)
        .eq("user_id", user.id)
        .select("id")
        .maybeSingle();

      if (error) throw new Error(error.message);
      if (!data) throw new Error("No page was discarded. Check this account owns the page.");

      window.location.href = "/";
    } catch (err: any) {
      setError(err?.message || "Something went wrong.");
      setIsDiscarding(false);
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-5 md:px-6 md:py-8">
      {showPartnerPopup ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/50 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-[2rem] bg-white p-6 text-center shadow-2xl">
            <h2 className="text-2xl font-black tracking-tight text-gray-950">
              Upgrade and become a Local Partner 💚
            </h2>

            <div className="mt-6 space-y-3 text-left">
              <div className="rounded-2xl bg-gray-50 px-4 py-3 text-sm font-black text-gray-900">
                Boosted Visibility 🚀
              </div>
              <div className="rounded-2xl bg-gray-50 px-4 py-3 text-sm font-black text-gray-900">
                Local Insights 📈
              </div>
              <div className="rounded-2xl bg-gray-50 px-4 py-3 text-sm font-black text-gray-900">
                Support Local 🌳
              </div>
              <div className="rounded-2xl bg-gray-50 px-4 py-3 text-sm font-black text-gray-900">
                Early Bird Price £9.99 🐣
              </div>
            </div>

            <div className="mt-6 grid gap-3">
              <button
                type="button"
                onClick={() => {
                  window.location.href = "/partner";
                }}
                className="rounded-full px-5 py-3 text-sm font-black text-white"
                style={{ backgroundColor: brandColor }}
              >
                Let’s do this 🤝
              </button>
              <button
                type="button"
                onClick={() => setShowPartnerPopup(false)}
                className="rounded-full border border-gray-200 bg-white px-5 py-3 text-sm font-black text-gray-700"
              >
                No thanks, I'll stick with free 👋
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="mb-5 flex flex-col gap-4 rounded-[2rem] border border-gray-200 bg-white p-5 shadow-sm md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.22em] text-gray-400">
            Page builder
          </p>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-gray-950 md:text-3xl">
            {typeCopy.title}
          </h1>
          <p className="mt-1 text-sm leading-6 text-gray-500">
            Design your page with our easy-to-use builder.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {isApproved ? (
            <Link
              href="/create-post"
              className="rounded-full bg-gray-950 px-4 py-2.5 text-sm font-bold text-white"
            >
              Create Post
            </Link>
          ) : null}

          {isDraft ? (
            <button
              type="button"
              onClick={discardPage}
              disabled={isDiscarding || isSaving || isSubmitting}
              className="rounded-full border border-red-200 bg-white px-4 py-2.5 text-sm font-bold text-red-600 disabled:opacity-50"
            >
              {isDiscarding ? "Discarding..." : "Discard"}
            </button>
          ) : null}

          {canEdit ? (
            <button
              type="button"
              onClick={() => savePage()}
              disabled={isSaving || isSubmitting || isDiscarding}
              className="rounded-full bg-gray-950 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
            >
              {isSaving ? "Saving..." : "Save"}
            </button>
          ) : null}

          {isDraft ? (
            <button
              type="button"
              onClick={submitForApproval}
              disabled={isSubmitting || isSaving || isDiscarding}
              className="rounded-full px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
              style={{ backgroundColor: brandColor }}
            >
              {isSubmitting ? "Submitting..." : "Submit"}
            </button>
          ) : null}
        </div>
      </div>

      <div className="mb-5 flex flex-wrap gap-2">
        <span className="rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-bold text-gray-600">
          {status === "draft"
            ? "Draft"
            : status === "pending"
            ? "Pending review"
            : "Approved"}
        </span>

        {dirty && canEdit ? (
          <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-800">
            Unsaved changes
          </span>
        ) : null}

        {message ? (
          <span className="rounded-full bg-green-700 px-3 py-1 text-xs font-bold text-white">
            {message}
          </span>
        ) : null}

        {error ? (
          <span className="rounded-full bg-red-600 px-3 py-1 text-xs font-bold text-white">
            {error}
          </span>
        ) : null}
      </div>

      <div className="grid gap-5 lg:grid-cols-[420px_minmax(0,1fr)]">
        <div className="space-y-5">
          <Card title="Basics">
            {!isApproved ? (
              <Field label="Page type">
                <div className="grid gap-2">
                  {pageTypes.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      disabled={!canEditPageType}
                      onClick={() => canEditPageType && setPageType(option.value)}
                      className={`rounded-2xl border p-4 text-left transition ${
                        pageType === option.value
                          ? "border-gray-950 bg-gray-950 text-white"
                          : "border-gray-200 bg-gray-50 text-gray-950"
                      } disabled:opacity-60`}
                    >
                      <div className="text-sm font-black">{option.label}</div>
                      <div
                        className={`mt-1 text-xs leading-5 ${
                          pageType === option.value ? "text-white/70" : "text-gray-500"
                        }`}
                      >
                        {option.text}
                      </div>
                    </button>
                  ))}
                </div>
              </Field>
            ) : null}

            <Field label="Name">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={!canEdit}
                placeholder="Page name"
                maxLength={80}
              />
            </Field>

            <Field label="Public link" hint="Lowercase letters, numbers and hyphens only.">
              <div className="overflow-hidden rounded-2xl border border-gray-200 bg-gray-50">
                <div className="border-b border-gray-200 px-4 py-2 text-xs font-bold text-gray-400">
                  eastlothian.online/
                </div>
                <input
                  value={slug}
                  onChange={(e) => setSlug(sanitiseSlug(e.target.value))}
                  disabled={!canEdit}
                  placeholder="your-page"
                  className="w-full bg-transparent px-4 py-3 text-sm text-gray-950 outline-none disabled:opacity-60"
                />
              </div>
            </Field>
          </Card>

          <Card title="Brand">
            <Field label="Brand colour">
              <div className="flex gap-3">
                <input
                  type="color"
                  value={brandColor}
                  disabled={!canEdit}
                  onChange={(e) => setBrandColor(e.target.value)}
                  className="h-12 w-16 rounded-xl border border-gray-200 bg-white p-1"
                />
                <Input
                  value={brandColor}
                  disabled={!canEdit}
                  onChange={(e) => setBrandColor(e.target.value)}
                />
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {brandColours.map((colour) => (
                  <button
                    key={colour}
                    type="button"
                    disabled={!canEdit}
                    onClick={() => setBrandColor(colour)}
                    className="h-9 w-9 rounded-full border border-gray-200 shadow-sm"
                    style={{ backgroundColor: colour }}
                    aria-label={colour}
                  />
                ))}
              </div>
            </Field>

            <Field label="Logo">
              <UploadBox
                title="Logo"
                imageUrl={logoUrl}
                onChange={handleLogoUpload}
                onRemove={() => setLogoUrl("")}
                disabled={!canEdit}
              />
            </Field>
          </Card>

          <Card title="Contact buttons" text="Only filled-in buttons will show publicly.">
            {ctaButtons.map((button, index) => (
              <Field key={button.label} label={button.label}>
                <Input
                  value={button.href}
                  disabled={!canEdit}
                  onChange={(e) => updateCTA(index, e.target.value)}
                  placeholder={
                    button.label === "Phone"
                      ? "0131 123 4567"
                      : button.label === "Email"
                      ? "hello@example.com"
                      : "website.com"
                  }
                />
              </Field>
            ))}
          </Card>

          {typeCopy.showLocation ? (
            <Card title="Location">
              <Field label="Address">
                <Textarea
                  rows={4}
                  value={address}
                  disabled={!canEdit}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Street, town, postcode"
                  maxLength={220}
                />
              </Field>
            </Card>
          ) : null}

          <Card title="About">
            <Field label="About us">
              <Textarea
                rows={6}
                value={description}
                disabled={!canEdit}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Tell people what this page is for."
                maxLength={700}
              />
            </Field>
          </Card>

          {typeCopy.showOpeningHours ? (
            <Card title="Opening hours">
              <div className="space-y-3">
                {days.map((day) => (
                  <div
                    key={day.key}
                    className="rounded-2xl border border-gray-200 bg-gray-50 p-3"
                  >
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <p className="text-sm font-black text-gray-950">{day.label}</p>
                      <button
                        type="button"
                        onClick={() => toggleClosed(day.key)}
                        disabled={!canEdit}
                        className="rounded-full bg-white px-3 py-1 text-xs font-bold text-gray-700 shadow-sm"
                      >
                        {openingHours[day.key].closed ? "Tap to open" : "Tap to close"}
                      </button>
                    </div>

                    {!openingHours[day.key].closed ? (
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          type="time"
                          value={openingHours[day.key].open}
                          disabled={!canEdit}
                          onChange={(e) => updateDay(day.key, "open", e.target.value)}
                        />
                        <Input
                          type="time"
                          value={openingHours[day.key].close}
                          disabled={!canEdit}
                          onChange={(e) => updateDay(day.key, "close", e.target.value)}
                        />
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">Closed</p>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          ) : null}

          {typeCopy.showShowcase ? (
            <Card title="Showcase images" text="Up to three images. Square works best.">
              <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
                {showcaseImages.map((image, index) => (
                  <UploadBox
                    key={index}
                    title={`Image ${index + 1}`}
                    imageUrl={image.url}
                    onChange={(file) => handleShowcaseUpload(index, file)}
                    onRemove={() =>
                      setShowcaseImages((prev) =>
                        prev.map((item, i) => (i === index ? { url: "" } : item))
                      )
                    }
                    disabled={!canEdit}
                    square
                  />
                ))}
              </div>
            </Card>
          ) : null}

          {typeCopy.showServices ? (
            <Card title="Services">
              <button
                type="button"
                onClick={addService}
                disabled={!canEdit || services.length >= 10}
                className="rounded-full bg-gray-950 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
              >
                Add service
              </button>

              <div className="space-y-3">
                {services.map((service, index) => (
                  <div
                    key={index}
                    className="rounded-2xl border border-gray-200 bg-gray-50 p-3"
                  >
                    <div className="mb-3 flex items-center justify-between">
                      <p className="text-sm font-black text-gray-900">
                        Service {index + 1}
                      </p>
                      <button
                        type="button"
                        onClick={() => removeService(index)}
                        className="text-xs font-bold text-red-600"
                      >
                        Remove
                      </button>
                    </div>

                    <div className="grid gap-2">
                      <select
                        value={service.icon}
                        disabled={!canEdit}
                        onChange={(e) => updateService(index, "icon", e.target.value)}
                        className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none"
                      >
                        {serviceIcons.map((icon) => (
                          <option key={icon} value={icon}>
                            {icon}
                          </option>
                        ))}
                      </select>

                      <Input
                        value={service.text}
                        disabled={!canEdit}
                        onChange={(e) => updateService(index, "text", e.target.value)}
                        placeholder="Service description"
                        maxLength={100}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          ) : null}

          {canEdit ? (
            <div className="sticky bottom-4 rounded-[1.5rem] border border-gray-200 bg-white/95 p-3 shadow-xl backdrop-blur">
              <button
                type="button"
                onClick={() => savePage()}
                disabled={isSaving || isSubmitting || isDiscarding}
                className="w-full rounded-full bg-gray-950 px-5 py-3 text-sm font-black text-white disabled:opacity-50"
              >
                {isSaving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          ) : null}
        </div>

        <div className="space-y-5 lg:sticky lg:top-5">
          <div className="rounded-[2rem] border border-gray-200 bg-white p-3 shadow-sm">
            <p className="text-center text-xs font-black uppercase tracking-[0.2em] text-gray-400">
              Live preview
            </p>
          </div>

          <div className="overflow-hidden rounded-[2rem] border border-gray-200 bg-white shadow-sm">
            <section
              className="relative overflow-hidden px-5 py-10 text-white md:px-8 md:py-12"
              style={{
                background: `linear-gradient(135deg, ${brandColor} 0%, ${brandColor}dd 45%, #111827 100%)`,
              }}
            >
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,rgba(255,255,255,0.24),transparent_28%),radial-gradient(circle_at_80%_20%,rgba(255,255,255,0.14),transparent_30%)]" />

              <div className="relative z-10 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
                <div className="min-w-0">
                  {logoUrl ? (
                    <img
                      src={logoUrl}
                      alt={`${name} logo`}
                      className="mb-5 h-20 w-20 rounded-[1.5rem] border border-white/30 bg-white object-cover shadow-lg"
                    />
                  ) : null}

                  <p className="mb-2 text-xs font-black uppercase tracking-[0.24em] text-white/70">
                    East Lothian Online
                  </p>
                  <h1 className="break-words text-4xl font-black tracking-tight md:text-6xl">
                    {name || "Your Page"}
                  </h1>
                </div>

                {previewCTAButtons.length ? (
                  <div className="flex flex-wrap gap-2">
                    {previewCTAButtons.map((button) => (
                      <a
                        key={`${button.label}-${button.href}`}
                        href={button.href}
                        target={button.label === "Website" ? "_blank" : undefined}
                        rel={button.label === "Website" ? "noreferrer" : undefined}
                        className="rounded-full bg-white px-4 py-2.5 text-sm font-black text-gray-950"
                      >
                        {button.label}
                      </a>
                    ))}
                  </div>
                ) : null}
              </div>
            </section>

            <div className="space-y-5 bg-[#f7f7f7] p-4 md:p-5">
              <section className="rounded-[2rem] bg-white p-5 shadow-sm">
                <button
                  type="button"
                  onClick={() => setAboutOpen((prev) => !prev)}
                  className="flex w-full items-start justify-between gap-4 text-left"
                >
                  <div>
                    <p className="mb-2 text-xs font-black uppercase tracking-[0.2em] text-gray-400">
                      About
                    </p>
                    <h2 className="text-2xl font-black tracking-tight text-gray-950">
                      {typeCopy.about}
                    </h2>
                  </div>
                  <span className={`text-2xl transition ${aboutOpen ? "rotate-180" : ""}`}>
                    ↓
                  </span>
                </button>

                {aboutOpen ? (
                  <p className="mt-4 whitespace-pre-line text-sm leading-7 text-gray-600">
                    {description ||
                      "This page shares useful local information across East Lothian."}
                  </p>
                ) : null}
              </section>

              {typeCopy.showLocation && address ? (
                <section className="rounded-[2rem] bg-white p-5 shadow-sm">
                  <p className="mb-2 text-xs font-black uppercase tracking-[0.2em] text-gray-400">
                    Location
                  </p>
                  <p className="whitespace-pre-line text-sm leading-7 text-gray-700">
                    {address}
                  </p>
                </section>
              ) : null}

              {typeCopy.showOpeningHours ? (
                <section className="rounded-[2rem] bg-white p-5 shadow-sm">
                  <p className="mb-4 text-xs font-black uppercase tracking-[0.2em] text-gray-400">
                    Opening hours
                  </p>
                  <div className="grid gap-2 md:grid-cols-7">
                    {days.map((day) => (
                      <div
                        key={day.key}
                        className="rounded-2xl bg-gray-50 p-3 text-center"
                      >
                        <p className="text-sm font-black text-gray-950">
                          <span className="md:hidden">{day.label}</span>
                          <span className="hidden md:inline">{day.short}</span>
                        </p>
                        <p className="mt-1 text-xs leading-5 text-gray-500">
                          {openingHours[day.key].closed
                            ? "Closed"
                            : `${openingHours[day.key].open} – ${openingHours[day.key].close}`}
                        </p>
                      </div>
                    ))}
                  </div>
                </section>
              ) : null}

              {typeCopy.showShowcase && filledShowcaseImages.length ? (
                <section className="rounded-[2rem] bg-white p-5 shadow-sm">
                  <p className="mb-4 text-xs font-black uppercase tracking-[0.2em] text-gray-400">
                    Showcase
                  </p>
                  <div className="grid gap-3 md:grid-cols-3">
                    {filledShowcaseImages.map((image, index) => (
                      <div
                        key={index}
                        className="aspect-square overflow-hidden rounded-[1.5rem] bg-gray-100"
                      >
                        <img
                          src={image.url}
                          alt={`${name} showcase ${index + 1}`}
                          className="h-full w-full object-cover"
                        />
                      </div>
                    ))}
                  </div>
                </section>
              ) : null}

              {typeCopy.showServices && visibleServices.length ? (
                <section className="rounded-[2rem] bg-white p-5 shadow-sm">
                  <p className="mb-4 text-xs font-black uppercase tracking-[0.2em] text-gray-400">
                    Services
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {visibleServices.map((service, index) => (
                      <div
                        key={index}
                        className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-4 py-2 text-sm font-bold text-gray-800"
                      >
                        <span>{service.icon}</span>
                        <span>{service.text}</span>
                      </div>
                    ))}
                  </div>
                </section>
              ) : null}

              <section>
                <div className="mb-4">
                  <p className="mb-1 text-xs font-black uppercase tracking-[0.2em] text-gray-400">
                    Content
                  </p>
                  <h2 className="text-2xl font-black tracking-tight text-gray-950">
                    Latest from {name || "your page"}
                  </h2>
                </div>

                {!orderedPosts.length ? (
                  <div className="rounded-[2rem] bg-white px-5 py-12 text-center shadow-sm">
                    <h3 className="text-xl font-black text-gray-950">No posts yet</h3>
                    <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-gray-500">
                      {isApproved
                        ? "Add your first event, deal or update."
                        : "Submit your page first, then you can start posting."}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {orderedPosts.map((post) => (
                      <PostCard key={post.id} {...(post as any)} />
                    ))}
                  </div>
                )}
              </section>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  ImagePlus,
  LoaderCircle,
  Lock,
  Megaphone,
  PoundSterling,
  MapPin,
  Newspaper,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";

import SiteHeader from "@/components/SiteHeader";
import Footer from "@/components/Footer";
import { createClient } from "@/lib/supabase/client";

type PostType = "event" | "deal" | "alert" | "update" | "popup" | "advert";
type DealKind = "price" | "free" | "percent" | "multibuy";

type PostMetadata = {
  active_dates?: unknown;
  public_type?: string | null;
  alert_icon?: string | null;
  deal_kind?: string | null;
  deal_price?: number | null;
  discount_percent?: number | null;
  buy_quantity?: number | null;
  pay_quantity?: number | null;
  image_urls?: string[];
  popup_address?: string | null;
  popup_start_time?: string | null;
  popup_end_time?: string | null;
  advert_cta?: string | null;
  advert_url?: string | null;
  [key: string]: unknown;
};

type DatabasePage = {
  id: string;
  name: string | null;
  user_id: string;
  is_local_partner?: boolean | null;
};

type UserRow = {
  role: string | null;
};

function normaliseDate(date: Date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function dateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function monthLabel(date: Date) {
  return date.toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
  });
}

export default function CreatePostPage() {
  const router = useRouter();

  const [pages, setPages] = useState<DatabasePage[]>([]);
  const [groupId, setGroupId] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [loadingPages, setLoadingPages] = useState(true);

  const [type, setType] = useState<PostType>("event");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [monthDate, setMonthDate] = useState(() =>
    normaliseDate(new Date()),
  );

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState("");
  const [updateImages, setUpdateImages] = useState<File[]>([]);
  const [updatePreviews, setUpdatePreviews] = useState<string[]>([]);
  const [popupAddress, setPopupAddress] = useState("");
  const [popupStartTime, setPopupStartTime] = useState(() => {
    const now = new Date();
    const hour = now.getMinutes() === 0 ? now.getHours() : (now.getHours() + 1) % 24;
    return `${String(hour).padStart(2, "0")}:00`;
  });
  const [popupEndTime, setPopupEndTime] = useState(() => {
    const now = new Date();
    const startHour = now.getMinutes() === 0 ? now.getHours() : (now.getHours() + 1) % 24;
    return `${String((startHour + 1) % 24).padStart(2, "0")}:00`;
  });
  const [advertCta, setAdvertCta] = useState("BUY NOW");
  const [advertUrl, setAdvertUrl] = useState("");
  const [existingAdvertId, setExistingAdvertId] = useState<string | null>(null);

  const [dealKind, setDealKind] = useState<DealKind>("price");
  const [dealPrice, setDealPrice] = useState("");
  const [discountPercent, setDiscountPercent] = useState("");
  const [buyQuantity, setBuyQuantity] = useState("");
  const [payQuantity, setPayQuantity] = useState("");

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!imageFile) {
      setImagePreview("");
      return;
    }

    const previewUrl = URL.createObjectURL(imageFile);
    setImagePreview(previewUrl);

    return () => {
      URL.revokeObjectURL(previewUrl);
    };
  }, [imageFile]);

  useEffect(() => {
    const urls = updateImages.map((file) => URL.createObjectURL(file));
    setUpdatePreviews(urls);

    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [updateImages]);

  useEffect(() => {
    let active = true;

    async function loadPages() {
      setLoadingPages(true);
      setMessage("");

      try {
        const supabase = createClient();

        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
          router.replace("/log-in?next=/create");
          return;
        }

        const { data: userRow, error: roleError } = await supabase
          .from("users")
          .select("role")
          .eq("id", user.id)
          .maybeSingle<UserRow>();

        if (roleError) {
          throw roleError;
        }

        const admin = userRow?.role?.toLowerCase() === "admin";

        let pagesQuery = supabase
          .from("groups")
          .select("id, name, user_id, is_local_partner")
          .eq("status", "approved")
          .order("name", { ascending: true });

        if (!admin) {
          pagesQuery = pagesQuery.eq("user_id", user.id);
        }

        const { data: pageData, error: pagesError } = await pagesQuery;

        if (pagesError) {
          throw pagesError;
        }

        if (!active) {
          return;
        }

        const loadedPages = ((pageData ?? []) as DatabasePage[]).map(
          (page) => ({
            ...page,
            name: page.name?.trim() || "Untitled Page",
          }),
        );

        setIsAdmin(admin);
        setPages(loadedPages);

        if (admin) {
          const eastLothianOnline = loadedPages.find(
            (page) =>
              page.name?.trim().toLowerCase() ===
              "east lothian online",
          );

          setGroupId(
            eastLothianOnline?.id ?? loadedPages[0]?.id ?? "",
          );
        } else {
          setGroupId(loadedPages[0]?.id ?? "");
        }
      } catch (error) {
        console.error("Failed to load posting Pages:", error);

        if (active) {
          setMessage(
            error instanceof Error
              ? error.message
              : "We couldn't load the Pages you can post from.",
          );
        }
      } finally {
        if (active) {
          setLoadingPages(false);
        }
      }
    }

    void loadPages();

    return () => {
      active = false;
    };
  }, [router]);

  useEffect(() => {
    let active = true;

    async function loadExistingAdvert() {
      if (!groupId) {
        setExistingAdvertId(null);
        return;
      }

      const supabase = createClient();
      const { data, error } = await supabase
        .from("posts")
        .select("id, image_url, metadata")
        .eq("group_id", groupId)
        .eq("type", "advert")
        .limit(1)
        .maybeSingle();

      if (!active) return;

      if (error) {
        console.error("Failed to check existing advert:", error);
        setExistingAdvertId(null);
        return;
      }

      setExistingAdvertId(data?.id ?? null);
    }

    void loadExistingAdvert();

    return () => {
      active = false;
    };
  }, [groupId]);

  const selectedPostingPage = pages.find((page) => page.id === groupId);
  const hasPremiumPostingAccess =
    isAdmin || selectedPostingPage?.is_local_partner === true;

  const today = normaliseDate(new Date());

  const calendarDays = useMemo(() => {
    const year = monthDate.getFullYear();
    const month = monthDate.getMonth();

    const firstDay = new Date(year, month, 1);
    const startDay = (firstDay.getDay() + 6) % 7;

    const start = normaliseDate(new Date(firstDay));
    start.setDate(firstDay.getDate() - startDay);

    return Array.from({ length: 42 }, (_, index) => {
      const date = normaliseDate(new Date(start));
      date.setDate(start.getDate() + index);
      return date;
    });
  }, [monthDate]);

  function toggleDate(date: Date) {
    if (date < today) {
      return;
    }

    const key = dateKey(date);

    setSelectedDates((current) =>
      current.includes(key)
        ? current.filter((item) => item !== key)
        : [...current, key].sort(),
    );
  }

  function removeDate(date: string) {
    setSelectedDates((current) =>
      current.filter((item) => item !== date),
    );
  }

  function goPreviousMonth() {
    const next = new Date(monthDate);
    next.setMonth(next.getMonth() - 1);
    setMonthDate(normaliseDate(next));
  }

  function goNextMonth() {
    const next = new Date(monthDate);
    next.setMonth(next.getMonth() + 1);
    setMonthDate(normaliseDate(next));
  }

  function validateDeal() {
    if (type !== "deal") {
      return true;
    }

    if (dealKind === "price" && !dealPrice.trim()) {
      setMessage("Add the deal price.");
      return false;
    }

    if (dealKind === "percent" && !discountPercent.trim()) {
      setMessage("Add the percentage off.");
      return false;
    }

    if (
      dealKind === "multibuy" &&
      (!buyQuantity.trim() || !payQuantity.trim())
    ) {
      setMessage("Add the multibuy numbers.");
      return false;
    }

    return true;
  }

  async function uploadFile(file: File) {
    const supabase = createClient();
    const fileExtension = file.name.split(".").pop() || "jpg";
    const fileName = `${crypto.randomUUID()}.${fileExtension}`;

    const { error: uploadError } = await supabase.storage
      .from("post-images")
      .upload(fileName, file);

    if (uploadError) throw uploadError;

    const { data } = supabase.storage
      .from("post-images")
      .getPublicUrl(fileName);

    return data.publicUrl;
  }

  async function uploadImage() {
    return imageFile ? uploadFile(imageFile) : null;
  }

  async function createPost() {
    setMessage("");

    if (!groupId) {
      setMessage("Choose the Page you want to post from.");
      return;
    }

    if (type !== "advert" && !title.trim()) {
      setMessage("Add a title.");
      return;
    }

    if ((type === "event" || type === "deal") && selectedDates.length === 0) {
      setMessage("Select at least one date.");
      return;
    }

    if (type === "popup" && (!popupAddress.trim() || !popupStartTime || !popupEndTime)) {
      setMessage("Add the Pop-Up address, start time and end time.");
      return;
    }

    if (type === "advert" && existingAdvertId) {
      router.push(`/posts/${existingAdvertId}/edit`);
      return;
    }

    if (type === "advert" && (!imageFile || !advertUrl.trim())) {
      setMessage("Add a banner image and CTA link.");
      return;
    }

    if (!validateDeal()) {
      return;
    }

    if (
      (type === "update" || type === "popup" || type === "advert") &&
      !hasPremiumPostingAccess
    ) {
      setMessage("Update, Pop-Up and Advert posts are for Local Partners and admins.");
      return;
    }

    setSaving(true);

    try {
      const supabase = createClient();

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        router.replace("/log-in?next=/create");
        return;
      }

      const { data: userRow, error: roleError } = await supabase
        .from("users")
        .select("role")
        .eq("id", user.id)
        .maybeSingle<UserRow>();

      if (roleError) {
        throw roleError;
      }

      const admin = userRow?.role?.toLowerCase() === "admin";

      let pageQuery = supabase
        .from("groups")
        .select("id, user_id, is_local_partner")
        .eq("id", groupId)
        .eq("status", "approved");

      if (!admin) {
        pageQuery = pageQuery.eq("user_id", user.id);
      }

      const { data: selectedPage, error: pageError } =
        await pageQuery.maybeSingle<Pick<DatabasePage, "id" | "user_id" | "is_local_partner">>();

      if (pageError) {
        throw pageError;
      }

      if (!selectedPage) {
        throw new Error(
          "You do not have permission to post from that Page.",
        );
      }

      if (
        (type === "update" || type === "popup" || type === "advert") &&
        !admin &&
        selectedPage.is_local_partner !== true
      ) {
        throw new Error(
          "Update, Pop-Up and Advert posts are for Local Partners and admins.",
        );
      }

      const updateImageUrls =
        type === "update"
          ? await Promise.all(updateImages.slice(0, 3).map(uploadFile))
          : [];

      const imageUrl =
        type === "alert" || type === "update" ? null : await uploadImage();

      const metadata: PostMetadata = {
        active_dates:
          type === "event" || type === "deal"
            ? selectedDates
            : type === "popup"
              ? [dateKey(new Date())]
              : [],
        public_type: type,
        alert_icon: type === "alert" ? "alert" : null,
        deal_kind: type === "deal" ? dealKind : null,
        deal_price:
          type === "deal" && dealKind === "price"
            ? Number(dealPrice)
            : null,
        discount_percent:
          type === "deal" && dealKind === "percent"
            ? Number(discountPercent)
            : null,
        buy_quantity:
          type === "deal" && dealKind === "multibuy"
            ? Number(buyQuantity)
            : null,
        pay_quantity:
          type === "deal" && dealKind === "multibuy"
            ? Number(payQuantity)
            : null,
        image_urls: type === "update" ? updateImageUrls : [],
        popup_address: type === "popup" ? popupAddress.trim() : null,
        popup_start_time: type === "popup" ? popupStartTime : null,
        popup_end_time: type === "popup" ? popupEndTime : null,
        advert_cta: type === "advert" ? advertCta : null,
        advert_url:
          type === "advert"
            ? /^https?:\/\//i.test(advertUrl.trim())
              ? advertUrl.trim()
              : `https://${advertUrl.trim()}`
            : null,
      };

      const { data: createdPost, error: insertError } = await supabase
        .from("posts")
        .insert({
          user_id: selectedPage.user_id,
          group_id: selectedPage.id,
          type,
          title: type === "advert" ? "Advert" : title.trim(),
          content: type === "advert" ? "" : body.trim(),
          image_url: imageUrl,
          event_start:
            type === "event" || type === "deal"
              ? selectedDates[0] ?? null
              : type === "popup"
                ? dateKey(new Date())
                : null,
          event_end:
            type === "event" || type === "deal"
              ? selectedDates[selectedDates.length - 1] ?? null
              : type === "popup"
                ? dateKey(new Date())
                : null,
          expires_at:
            type === "alert" || type === "update"
              ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
              : type === "popup"
                ? (() => {
                    const expiry = new Date();
                    const [hours, minutes] = popupEndTime.split(":").map(Number);
                    expiry.setHours(hours, minutes, 0, 0);
                    return expiry.toISOString();
                  })()
                : null,
          metadata,
        })
        .select("id")
        .single();

      if (insertError) {
        console.error("Supabase post insert failed:", {
          message: insertError.message,
          code: insertError.code,
          details: insertError.details,
          hint: insertError.hint,
          type,
          metadata,
        });

        throw new Error(
          [
            insertError.message,
            insertError.details,
            insertError.hint,
            insertError.code ? `Code: ${insertError.code}` : "",
          ]
            .filter(Boolean)
            .join(" — "),
        );
      }

      router.push(`/posts/${createdPost.id}`);
      router.refresh();
    } catch (error) {
      console.error("Failed to create post:", error);

      const errorMessage =
        error && typeof error === "object" && "message" in error
          ? String(error.message)
          : error instanceof Error
            ? error.message
            : "We couldn't publish this post.";

      setMessage(errorMessage);
    } finally {
      setSaving(false);
    }
  }

  const displayedImage = imagePreview || null;

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
              Create Post
            </p>

            <h1 className="mt-4 text-5xl font-black leading-[0.95] tracking-[-0.055em] sm:text-6xl">
              Create a new post.
            </h1>

            <p className="mt-5 max-w-2xl text-lg leading-8 text-black/55">
              Share something with people across East Lothian.
            </p>
          </div>
        </section>

        <div className="mx-auto w-full max-w-3xl space-y-8 px-5 py-12 sm:px-8 sm:py-16">
          <section>
            <div className="flex items-end justify-between gap-4">
              <div>
                <h2 className="text-xl font-black">Post as</h2>

                <p className="mt-2 text-sm leading-6 text-black/50">
                  Choose the Page this post will appear from.
                </p>
              </div>

              {isAdmin ? (
                <span className="rounded-xl bg-black/[0.05] px-3 py-2 text-xs font-black uppercase tracking-[0.1em] text-black/55">
                  Admin
                </span>
              ) : null}
            </div>

            {loadingPages ? (
              <div className="mt-4 flex h-14 items-center rounded-2xl border border-black/10 px-5">
                <LoaderCircle className="h-5 w-5 animate-spin text-emerald-700" />
              </div>
            ) : pages.length === 0 ? (
              <div className="mt-4 rounded-2xl bg-amber-50 px-5 py-5">
                <p className="font-black text-amber-950">
                  You do not have an approved Page to post from.
                </p>

                <p className="mt-2 text-sm leading-6 text-amber-900/70">
                  Once one of your Pages is approved, it will appear here.
                </p>
              </div>
            ) : (
              <select
                value={groupId}
                onChange={(event) => setGroupId(event.target.value)}
                className="mt-4 h-14 w-full rounded-2xl border border-black/15 bg-white px-5 font-semibold outline-none transition focus:border-emerald-700 focus:ring-4 focus:ring-emerald-100"
              >
                {pages.map((page) => (
                  <option key={page.id} value={page.id}>
                    {page.name}
                  </option>
                ))}
              </select>
            )}

            {isAdmin ? (
              <p className="mt-3 text-sm leading-6 text-black/45">
                Admin accounts can publish from any approved Page. East
                Lothian Online is selected by default.
              </p>
            ) : null}
          </section>

          <section className="border-t border-black/10 pt-8">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-black/40">
                  Format
                </p>
                <h2 className="mt-1 text-2xl font-black tracking-[-0.03em]">
                  What are you sharing?
                </h2>
                <p className="mt-2 text-sm leading-6 text-black/50">
                  Choose the one that best fits what you want to share.
                </p>
              </div>
              <Sparkles className="hidden h-6 w-6 text-emerald-700 sm:block" />
            </div>

            <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {[
                {
                  value: "event",
                  label: "Event",
                  description: "Let people know what’s on and when it’s happening.",
                  icon: CalendarDays,
                  premium: false,
                  activeClass: "border-blue-600 bg-blue-50 text-blue-950 ring-blue-100",
                  iconClass: "bg-blue-600 text-white",
                },
                {
                  value: "deal",
                  label: "Deal",
                  description: "Share a special offer, discount or something free.",
                  icon: PoundSterling,
                  premium: false,
                  activeClass: "border-emerald-600 bg-emerald-50 text-emerald-950 ring-emerald-100",
                  iconClass: "bg-emerald-600 text-white",
                },
                {
                  value: "alert",
                  label: "Alert",
                  description: "Let people know about important changes today, like a closed kitchen, changed hours or something being sold out.",
                  icon: AlertTriangle,
                  premium: false,
                  activeClass: "border-amber-500 bg-amber-50 text-amber-950 ring-amber-100",
                  iconClass: "bg-amber-500 text-white",
                },
                {
                  value: "update",
                  label: "Update",
                  description: "Got more to say? Share news, announcements or what you’ve been up to, with up to three images.",
                  icon: Newspaper,
                  premium: true,
                  activeClass: "border-violet-600 bg-violet-50 text-violet-950 ring-violet-100",
                  iconClass: "bg-violet-700 text-white",
                },
                {
                  value: "popup",
                  label: "Pop-Up",
                  description: "Popping up somewhere today? Tell people where to find you and when you’ll be there.",
                  icon: MapPin,
                  premium: true,
                  activeClass: "border-rose-600 bg-rose-50 text-rose-950 ring-rose-100",
                  iconClass: "bg-rose-600 text-white",
                },
                {
                  value: "advert",
                  label: "Advert",
                  description: "Promote your business with a banner that stays in the feed and links straight where you want people to go.",
                  icon: Megaphone,
                  premium: true,
                  activeClass: "border-slate-800 bg-slate-50 text-slate-950 ring-slate-200",
                  iconClass: "bg-slate-900 text-white",
                },
              ].map((item) => {
                const Icon = item.icon;
                const active = type === item.value;
                const locked = item.premium && !hasPremiumPostingAccess;

                return (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => {
                      if (locked) {
                        setMessage("LOCAL_PARTNER_UPSELL");
                        return;
                      }

                      setMessage("");
                      setType(item.value as PostType);
                    }}
                    className={[
                      "group relative flex min-h-32 items-start gap-4 rounded-3xl border p-5 text-left transition duration-200",
                      active
                        ? `${item.activeClass} ring-4`
                        : locked
                          ? "border-black/[0.08] bg-black/[0.025] text-black/40"
                          : "border-black/10 bg-white hover:-translate-y-0.5 hover:border-black/20 hover:shadow-lg hover:shadow-black/[0.05]",
                    ].join(" ")}
                  >
                    <div
                      className={[
                        "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl shadow-sm",
                        locked
                          ? "bg-black/[0.06] text-black/35"
                          : item.iconClass,
                      ].join(" ")}
                    >
                      {locked ? (
                        <Lock className="h-5 w-5" />
                      ) : (
                        <Icon className="h-5 w-5" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-base font-black tracking-[-0.02em]">
                          {item.label}
                        </span>

                        {active ? (
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-current/10">
                            <Check className="h-3.5 w-3.5" />
                          </span>
                        ) : null}
                      </div>

                      <p className="mt-1.5 text-sm font-medium leading-5 opacity-60">
                        {item.description}
                      </p>

                      {item.premium ? (
                        <span className="mt-3 inline-flex rounded-lg bg-black/[0.06] px-2 py-1 text-[10px] font-black uppercase tracking-[0.12em]">
                          {locked ? "Local Partner · Locked" : "Local Partner"}
                        </span>
                      ) : (
                        <span className="mt-3 inline-flex text-[10px] font-black uppercase tracking-[0.12em] opacity-40">
                          Available to everyone
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {message === "LOCAL_PARTNER_UPSELL" && !hasPremiumPostingAccess ? (
              <div className="mt-5 overflow-hidden rounded-3xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white">
                <div className="p-6 sm:p-7">
                  <div className="flex items-start gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-700 text-white">
                      <Lock className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.14em] text-emerald-700">
                        Local Partner
                      </p>
                      <h3 className="mt-1 text-2xl font-black tracking-[-0.035em] text-emerald-950">
                        Unlock every format.
                      </h3>
                    </div>
                  </div>

                  <p className="mt-4 max-w-xl leading-7 text-emerald-950/65">
                    For £9.99 a month you can use every post type without limits,
                    access analytics and local trends, and receive higher feed priority.
                  </p>

                  <Link
                    href="/localpartner"
                    className="mt-5 inline-flex min-h-12 items-center justify-center rounded-xl bg-emerald-700 px-5 text-sm font-black text-white transition hover:bg-emerald-800"
                  >
                    Explore Local Partnership
                  </Link>
                </div>
              </div>
            ) : null}
          </section>

          {type !== "advert" ? (
            <section
              className={[
                "overflow-hidden rounded-[2rem] border shadow-sm",
                type === "event"
                  ? "border-blue-200 bg-gradient-to-b from-blue-50/80 to-white"
                  : type === "deal"
                    ? "border-emerald-200 bg-gradient-to-b from-emerald-50/80 to-white"
                    : type === "alert"
                      ? "border-amber-200 bg-gradient-to-b from-amber-50/90 to-white"
                      : type === "update"
                        ? "border-violet-200 bg-gradient-to-b from-violet-50/80 to-white"
                        : "border-rose-200 bg-gradient-to-b from-rose-50/80 to-white",
              ].join(" ")}
            >
              <div
                className={[
                  "border-b px-6 py-5 sm:px-8",
                  type === "event"
                    ? "border-blue-100"
                    : type === "deal"
                      ? "border-emerald-100"
                      : type === "alert"
                        ? "border-amber-100"
                        : type === "update"
                          ? "border-violet-100"
                          : "border-rose-100",
                ].join(" ")}
              >
                <p
                  className={[
                    "text-xs font-black uppercase tracking-[0.16em]",
                    type === "event"
                      ? "text-blue-700"
                      : type === "deal"
                        ? "text-emerald-700"
                        : type === "alert"
                          ? "text-amber-700"
                          : type === "update"
                            ? "text-violet-700"
                            : "text-rose-700",
                  ].join(" ")}
                >
                  {type === "event"
                    ? "Event notice"
                    : type === "deal"
                      ? "Local offer"
                      : type === "alert"
                        ? "Important notice"
                        : type === "update"
                          ? "Long-form notice"
                          : "Temporary place"}
                </p>

                <h2 className="mt-1 text-2xl font-black tracking-[-0.035em] text-black">
                  {type === "event"
                    ? "Share an event"
                    : type === "deal"
                      ? "Share a deal"
                      : type === "alert"
                        ? "Post an alert"
                        : type === "update"
                          ? "Share an update"
                          : "Create a Pop-Up"}
                </h2>

                <p className="mt-2 text-sm leading-6 text-black/50">
                  {type === "event"
                    ? "Tell people what’s happening, then choose the date or dates."
                    : type === "deal"
                      ? "Tell people about your offer, then add the price or discount."
                      : type === "alert"
                        ? "Use this for important changes today — like your kitchen being closed, closing early or something being sold out."
                        : type === "update"
                          ? "Share something worth talking about — news, announcements, progress or anything that needs a little more space."
                          : "Tell people what you’re bringing, then add where and when they can find you."}
                </p>
              </div>

              <div className="p-6 sm:p-8">
                <label htmlFor="post-title" className="block text-sm font-black">
                  Title
                </label>

                <input
                  id="post-title"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder={
                    type === "alert"
                      ? "Kitchen closed today, closing early, sold out..."
                      : type === "popup"
                        ? "What's popping up?"
                        : "What's happening?"
                  }
                  className={[
                    "mt-3 h-14 w-full rounded-2xl border bg-white px-5 font-semibold outline-none transition",
                    type === "event"
                      ? "border-blue-200 focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
                      : type === "deal"
                        ? "border-emerald-200 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
                        : type === "alert"
                          ? "border-amber-200 focus:border-amber-500 focus:ring-4 focus:ring-amber-100"
                          : type === "update"
                            ? "border-violet-200 focus:border-violet-600 focus:ring-4 focus:ring-violet-100"
                            : "border-rose-200 focus:border-rose-600 focus:ring-4 focus:ring-rose-100",
                  ].join(" ")}
                />

                <label htmlFor="post-details" className="mt-6 block text-sm font-black">
                  Details
                </label>

                <textarea
                  id="post-details"
                  value={body}
                  onChange={(event) => setBody(event.target.value)}
                  rows={type === "update" ? 10 : 7}
                  placeholder={
                    type === "alert"
                      ? "Explain what has changed and anything customers need to know..."
                      : "Add the key details..."
                  }
                  className={[
                    "mt-3 w-full resize-none rounded-2xl border bg-white px-5 py-4 font-semibold leading-7 outline-none transition",
                    type === "event"
                      ? "border-blue-200 focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
                      : type === "deal"
                        ? "border-emerald-200 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
                        : type === "alert"
                          ? "border-amber-200 focus:border-amber-500 focus:ring-4 focus:ring-amber-100"
                          : type === "update"
                            ? "min-h-64 border-violet-200 focus:border-violet-600 focus:ring-4 focus:ring-violet-100"
                            : "border-rose-200 focus:border-rose-600 focus:ring-4 focus:ring-rose-100",
                  ].join(" ")}
                />
              </div>
            </section>
          ) : null}

          {type === "deal" ? (
            <section className="border-t border-black/10 pt-8">
              <h2 className="text-xl font-black">Deal</h2>

              <label
                htmlFor="deal-kind"
                className="mt-5 block text-sm font-black"
              >
                Deal type
              </label>

              <select
                id="deal-kind"
                value={dealKind}
                onChange={(event) =>
                  setDealKind(event.target.value as DealKind)
                }
                className="mt-3 h-14 w-full rounded-2xl border border-black/15 bg-white px-5 font-semibold outline-none transition focus:border-emerald-700 focus:ring-4 focus:ring-emerald-100"
              >
                <option value="price">Price deal</option>
                <option value="free">Free</option>
                <option value="percent">Percentage off</option>
                <option value="multibuy">Multibuy</option>
              </select>

              {dealKind === "price" ? (
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={dealPrice}
                  onChange={(event) =>
                    setDealPrice(event.target.value)
                  }
                  placeholder="5.00"
                  className="mt-4 h-14 w-full rounded-2xl border border-black/15 px-5 font-semibold outline-none transition focus:border-emerald-700 focus:ring-4 focus:ring-emerald-100"
                />
              ) : null}

              {dealKind === "percent" ? (
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={discountPercent}
                  onChange={(event) =>
                    setDiscountPercent(event.target.value)
                  }
                  placeholder="20"
                  className="mt-4 h-14 w-full rounded-2xl border border-black/15 px-5 font-semibold outline-none transition focus:border-emerald-700 focus:ring-4 focus:ring-emerald-100"
                />
              ) : null}

              {dealKind === "multibuy" ? (
                <div className="mt-4 grid grid-cols-2 gap-4">
                  <input
                    type="number"
                    min="1"
                    value={buyQuantity}
                    onChange={(event) =>
                      setBuyQuantity(event.target.value)
                    }
                    placeholder="Buy 2"
                    className="h-14 rounded-2xl border border-black/15 px-5 font-semibold outline-none transition focus:border-emerald-700 focus:ring-4 focus:ring-emerald-100"
                  />

                  <input
                    type="number"
                    min="1"
                    value={payQuantity}
                    onChange={(event) =>
                      setPayQuantity(event.target.value)
                    }
                    placeholder="Pay for 1"
                    className="h-14 rounded-2xl border border-black/15 px-5 font-semibold outline-none transition focus:border-emerald-700 focus:ring-4 focus:ring-emerald-100"
                  />
                </div>
              ) : null}

              {dealKind === "free" ? (
                <p className="mt-4 rounded-2xl bg-emerald-50 px-5 py-4 text-sm font-bold text-emerald-800">
                  This post will show as free.
                </p>
              ) : null}
            </section>
          ) : null}

          {type === "popup" ? (
            <section className="border-t border-black/10 pt-8">
              <h2 className="text-xl font-black">Pop-Up details</h2>
              <p className="mt-2 text-sm leading-6 text-black/50">
                Pop-Ups are for today only and disappear after the end time.
              </p>
              <label className="mt-5 block text-sm font-black">Address</label>
              <input
                value={popupAddress}
                onChange={(event) => setPopupAddress(event.target.value)}
                placeholder="Where is the Pop-Up?"
                className="mt-3 h-14 w-full rounded-2xl border border-black/15 px-5 font-semibold outline-none transition focus:border-emerald-700 focus:ring-4 focus:ring-emerald-100"
              />
              <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-black">Starts</label>
                  <input type="time" step="3600" value={popupStartTime} onChange={(event) => setPopupStartTime(event.target.value)}
                    className="mt-3 h-14 w-full rounded-2xl border border-black/15 px-5 font-semibold outline-none transition focus:border-emerald-700 focus:ring-4 focus:ring-emerald-100" />
                </div>
                <div>
                  <label className="block text-sm font-black">Ends</label>
                  <input type="time" step="3600" value={popupEndTime} onChange={(event) => setPopupEndTime(event.target.value)}
                    className="mt-3 h-14 w-full rounded-2xl border border-black/15 px-5 font-semibold outline-none transition focus:border-emerald-700 focus:ring-4 focus:ring-emerald-100" />
                </div>
              </div>
            </section>
          ) : null}

          {type === "advert" ? (
            <section className="overflow-hidden rounded-[2rem] border border-slate-300 bg-gradient-to-b from-slate-100 to-white shadow-sm">
              <div className="border-b border-slate-200 px-6 py-5 sm:px-8">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-600">
                  Evergreen promotion
                </p>
                <h2 className="mt-1 text-2xl font-black tracking-[-0.035em] text-black">
                  Build your advert
                </h2>
                <p className="mt-2 text-sm leading-6 text-black/50">
                  Upload your banner, choose a button and send people straight to your website, booking page or wherever you want.
                </p>
              </div>
              <div className="p-6 sm:p-8">
              {existingAdvertId ? (
                <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-6">
                  <h2 className="text-xl font-black text-emerald-950">
                    This Page already has an advert.
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-emerald-950/70">
                    Each Page can have one evergreen advert. Edit the existing advert instead.
                  </p>
                  <Link
                    href={`/posts/${existingAdvertId}/edit`}
                    className="mt-5 inline-flex min-h-12 items-center justify-center rounded-xl bg-emerald-700 px-5 text-sm font-black text-white"
                  >
                    Edit advert
                  </Link>
                </div>
              ) : (
                <>
              <h2 className="text-xl font-black">Advert action</h2>
              <label className="mt-5 block text-sm font-black">CTA</label>
              <select value={advertCta} onChange={(event) => setAdvertCta(event.target.value)}
                className="mt-3 h-14 w-full rounded-2xl border border-black/15 bg-white px-5 font-semibold outline-none transition focus:border-emerald-700 focus:ring-4 focus:ring-emerald-100">
                <option>BUY NOW</option>
                <option>BOOK NOW</option>
                <option>LEARN MORE</option>
                <option>VIEW WEBSITE</option>
                <option>GET TICKETS</option>
                <option>ORDER NOW</option>
                <option>CONTACT US</option>
              </select>
              <label className="mt-5 block text-sm font-black">CTA link</label>
              <input type="url" value={advertUrl} onChange={(event) => setAdvertUrl(event.target.value)}
                placeholder="https://..."
                className="mt-3 h-14 w-full rounded-2xl border border-black/15 px-5 font-semibold outline-none transition focus:border-emerald-700 focus:ring-4 focus:ring-emerald-100" />
                </>
              )}
              </div>
            </section>
          ) : null}

          {type === "event" || type === "deal" ? (
            <section className="border-t border-black/10 pt-8">
              <h2 className="text-xl font-black">Dates</h2>

              <div className="-mx-5 mt-5 bg-black/[0.035] px-2 py-5 sm:mx-0 sm:rounded-3xl sm:p-5">
                <div className="flex items-center justify-between gap-4">
                  <button
                    type="button"
                    onClick={goPreviousMonth}
                    className="flex h-11 w-11 items-center justify-center rounded-xl bg-white transition hover:bg-black/5"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>

                  <h3 className="text-lg font-black">
                    {monthLabel(monthDate)}
                  </h3>

                  <button
                    type="button"
                    onClick={goNextMonth}
                    className="flex h-11 w-11 items-center justify-center rounded-xl bg-white transition hover:bg-black/5"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </div>

                <div className="mt-5 grid grid-cols-7 gap-1 text-center text-xs font-black text-black/35 sm:gap-2">
                  <span>Mon</span>
                  <span>Tue</span>
                  <span>Wed</span>
                  <span>Thu</span>
                  <span>Fri</span>
                  <span>Sat</span>
                  <span>Sun</span>
                </div>

                <div className="mt-3 grid grid-cols-7 gap-1.5 sm:gap-2">
                  {calendarDays.map((date) => {
                    const key = dateKey(date);
                    const isCurrentMonth =
                      date.getMonth() === monthDate.getMonth();
                    const isSelected = selectedDates.includes(key);
                    const isPast = date < today;

                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => toggleDate(date)}
                        disabled={isPast}
                        className={[
                          "flex min-h-12 w-full items-center justify-center rounded-xl text-sm font-black transition sm:aspect-square sm:min-h-0 sm:rounded-2xl",
                          isSelected
                            ? "bg-emerald-700 text-white"
                            : "bg-white hover:bg-emerald-50",
                          !isCurrentMonth && !isSelected
                            ? "text-black/25"
                            : "",
                          isPast && !isSelected
                            ? "cursor-not-allowed text-black/20"
                            : "",
                        ].join(" ")}
                      >
                        {date.getDate()}
                      </button>
                    );
                  })}
                </div>
              </div>

              {selectedDates.length > 0 ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  {selectedDates.map((date) => (
                    <button
                      key={date}
                      type="button"
                      onClick={() => removeDate(date)}
                      className="inline-flex items-center gap-2 rounded-xl bg-emerald-100 px-3 py-2 text-sm font-black text-emerald-900"
                    >
                      {date}
                      <X className="h-4 w-4" />
                    </button>
                  ))}
                </div>
              ) : null}
            </section>
          ) : type === "alert" ? (
            <section className="border-t border-black/10 pt-8">
              <div className="flex items-start gap-4 rounded-2xl bg-amber-50 px-5 py-5">
                <Megaphone className="mt-0.5 h-6 w-6 shrink-0 text-amber-700" />
                <div>
                  <h2 className="font-black text-amber-950">Alerts last for 24 hours.</h2>
                  <p className="mt-1 text-sm leading-6 text-amber-900/70">
                    This alert will automatically expire 24 hours after it is published.
                  </p>
                </div>
              </div>
            </section>
          ) : type === "update" ? (
            <section className="border-t border-black/10 pt-8">
              <p className="rounded-2xl bg-emerald-50 px-5 py-4 text-sm font-bold text-emerald-800">
                Updates are long-form posts, can include up to 3 images, and stay on the feed for 24 hours.
              </p>
            </section>
          ) : type === "advert" ? (
            <section className="border-t border-black/10 pt-8">
              <p className="rounded-2xl bg-emerald-50 px-5 py-4 text-sm font-bold text-emerald-800">
                Adverts are evergreen and remain available until removed.
              </p>
            </section>
          ) : null}

          {type === "update" ? (
            <section className="border-t border-black/10 pt-8">
              <h2 className="text-xl font-black">Images</h2>
              <p className="mt-2 text-sm leading-6 text-black/50">Add up to 3 images.</p>
              <label className="mt-5 flex min-h-32 cursor-pointer items-center justify-center rounded-3xl border border-dashed border-black/15 bg-black/[0.025]">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(event) => {
                    const chosen = Array.from(event.target.files ?? []);
                    setUpdateImages((current) => [...current, ...chosen].slice(0, 3));
                    event.currentTarget.value = "";
                  }}
                  className="hidden"
                />
                <div className="text-center text-black/40">
                  <ImagePlus className="mx-auto h-8 w-8" />
                  <p className="mt-2 text-sm font-black">Choose up to 3 images</p>
                </div>
              </label>
              {updatePreviews.length ? (
                <div className="mt-4 grid grid-cols-3 gap-3">
                  {updatePreviews.map((preview, index) => (
                    <div key={preview} className="relative aspect-square overflow-hidden rounded-2xl bg-black/[0.03]">
                      <Image src={preview} alt={`Update image ${index + 1}`} fill unoptimized className="object-cover" />
                      <button
                        type="button"
                        onClick={() =>
                          setUpdateImages((current) =>
                            current.filter((_, imageIndex) => imageIndex !== index),
                          )
                        }
                        className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/70 text-white"
                        aria-label={`Remove image ${index + 1}`}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}
            </section>
          ) : type !== "alert" && !(type === "advert" && existingAdvertId) ? (
            <section className="border-t border-black/10 pt-8">
              <h2 className="text-xl font-black">{type === "advert" ? "Banner image" : "Image"}</h2>
              {type === "advert" ? (
                <p className="mt-2 text-sm leading-6 text-black/50">
                  Use a wide 4:1 banner. Recommended 1200 × 300px. Minimum 800 × 200px. Maximum 2400 × 600px.
                </p>
              ) : null}
              <label className={[
                "relative mt-5 flex cursor-pointer items-center justify-center overflow-hidden border border-black/10 bg-black/[0.03]",
                type === "advert"
                  ? "aspect-[4/1]"
                  : "aspect-[16/10] rounded-3xl",
              ].join(" ")}>
                <input type="file" accept="image/*" onChange={(event) => setImageFile(event.target.files?.[0] ?? null)} className="hidden" />
                {displayedImage ? (
                  <>
                    <Image src={displayedImage} alt="Post image" fill unoptimized className="object-cover" />
                    <div className="absolute inset-x-4 bottom-4 rounded-2xl bg-black/70 px-4 py-3 text-center text-sm font-black text-white">
                      Tap to replace image
                    </div>
                  </>
                ) : (
                  <div className="text-center text-black/40">
                    <ImagePlus className="mx-auto h-8 w-8" />
                    <p className="mt-2 text-sm font-black">{type === "advert" ? "Add banner" : "Add image"}</p>
                  </div>
                )}
              </label>
              {displayedImage ? (
                <button type="button" onClick={() => setImageFile(null)}
                  className="mt-4 inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-red-200 px-4 text-sm font-black text-red-700 transition hover:bg-red-50">
                  <Trash2 className="h-4 w-4" /> Remove image
                </button>
              ) : null}
            </section>
          ) : null}

          {message && message !== "LOCAL_PARTNER_UPSELL" ? (
            <p className="rounded-2xl bg-red-50 px-5 py-4 text-sm font-bold leading-6 text-red-800">
              {message}
            </p>
          ) : null}

          <section className="flex flex-col-reverse items-stretch gap-3 border-t border-black/10 pt-8 sm:flex-row sm:items-center">
            <Link
              href="/account"
              className="inline-flex h-11 items-center justify-center rounded-xl border border-black/15 px-4 text-xs font-black uppercase tracking-[0.1em] transition hover:bg-black/[0.03] sm:w-auto"
            >
              Cancel
            </Link>

            <button
              type="button"
              onClick={() => void createPost()}
              disabled={saving || loadingPages || pages.length === 0}
              className="inline-flex min-h-16 flex-1 items-center justify-center gap-3 rounded-2xl bg-emerald-700 px-8 text-base font-black uppercase tracking-[0.12em] text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? (
                <LoaderCircle className="h-5 w-5 animate-spin" />
              ) : (
                <Check className="h-5 w-5" />
              )}

              {saving ? "Publishing..." : "Publish post"}
            </button>
          </section>
        </div>
      </main>

      <Footer />
    </>
  );
}
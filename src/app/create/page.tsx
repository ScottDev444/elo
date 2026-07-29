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
  Megaphone,
  PoundSterling,
  Trash2,
  X,
} from "lucide-react";

import SiteHeader from "@/components/SiteHeader";
import Footer from "@/components/Footer";
import { createClient } from "@/lib/supabase/client";

type PostType = "event" | "deal" | "alert";
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
  [key: string]: unknown;
};

type DatabasePage = {
  id: string;
  name: string | null;
  user_id: string;
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
          .select("id, name, user_id")
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

  async function uploadImage() {
    if (!imageFile) {
      return null;
    }

    const supabase = createClient();
    const fileExtension = imageFile.name.split(".").pop() || "jpg";
    const fileName = `${crypto.randomUUID()}.${fileExtension}`;

    const { error: uploadError } = await supabase.storage
      .from("post-images")
      .upload(fileName, imageFile);

    if (uploadError) {
      throw uploadError;
    }

    const { data } = supabase.storage
      .from("post-images")
      .getPublicUrl(fileName);

    return data.publicUrl;
  }

  async function createPost() {
    setMessage("");

    if (!groupId) {
      setMessage("Choose the Page you want to post from.");
      return;
    }

    if (!title.trim()) {
      setMessage("Add a title.");
      return;
    }

    if (type !== "alert" && selectedDates.length === 0) {
      setMessage("Select at least one date.");
      return;
    }

    if (!validateDeal()) {
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
        .select("id, user_id")
        .eq("id", groupId)
        .eq("status", "approved");

      if (!admin) {
        pageQuery = pageQuery.eq("user_id", user.id);
      }

      const { data: selectedPage, error: pageError } =
        await pageQuery.maybeSingle<Pick<DatabasePage, "id" | "user_id">>();

      if (pageError) {
        throw pageError;
      }

      if (!selectedPage) {
        throw new Error(
          "You do not have permission to post from that Page.",
        );
      }

      const imageUrl =
        type === "alert" ? null : await uploadImage();

      const metadata: PostMetadata = {
        active_dates: type === "alert" ? [] : selectedDates,
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
      };

      const { data: createdPost, error: insertError } = await supabase
        .from("posts")
        .insert({
          user_id: selectedPage.user_id,
          group_id: selectedPage.id,
          type: type === "alert" ? "update" : type,
          title: title.trim(),
          content: body.trim(),
          image_url: imageUrl,
          event_start:
            type === "alert" ? null : selectedDates[0] ?? null,
          event_end:
            type === "alert"
              ? null
              : selectedDates[selectedDates.length - 1] ?? null,
          expires_at:
            type === "alert"
              ? new Date(
                  Date.now() + 24 * 60 * 60 * 1000,
                ).toISOString()
              : null,
          metadata,
        })
        .select("id")
        .single();

      if (insertError) {
        throw insertError;
      }

      router.push(`/posts/${createdPost.id}`);
      router.refresh();
    } catch (error) {
      console.error("Failed to create post:", error);

      setMessage(
        error instanceof Error
          ? error.message
          : "We couldn't publish this post.",
      );
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
              Share an event, deal or alert with people across East Lothian.
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
            <h2 className="text-xl font-black">Post type</h2>

            <div className="mt-4 grid grid-cols-3 gap-3">
              {[
                {
                  value: "event",
                  label: "Event",
                  icon: CalendarDays,
                },
                {
                  value: "deal",
                  label: "Deal",
                  icon: PoundSterling,
                },
                {
                  value: "alert",
                  label: "Alert",
                  icon: AlertTriangle,
                },
              ].map((item) => {
                const Icon = item.icon;
                const active = type === item.value;

                return (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() =>
                      setType(item.value as PostType)
                    }
                    className={[
                      "flex min-h-28 flex-col items-center justify-center rounded-2xl border p-4 text-center transition",
                      active
                        ? "border-emerald-700 bg-emerald-700 text-white"
                        : "border-black/10 bg-white hover:border-black/25",
                    ].join(" ")}
                  >
                    <Icon className="h-6 w-6" />
                    <span className="mt-2 text-sm font-black">
                      {item.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="border-t border-black/10 pt-8">
            <label
              htmlFor="post-title"
              className="block text-sm font-black"
            >
              Title
            </label>

            <input
              id="post-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder={
                type === "alert"
                  ? "Closed today, roadworks, sold out..."
                  : "What's happening?"
              }
              className="mt-3 h-14 w-full rounded-2xl border border-black/15 px-5 font-semibold outline-none transition focus:border-emerald-700 focus:ring-4 focus:ring-emerald-100"
            />

            <label
              htmlFor="post-details"
              className="mt-6 block text-sm font-black"
            >
              Details
            </label>

            <textarea
              id="post-details"
              value={body}
              onChange={(event) => setBody(event.target.value)}
              rows={7}
              placeholder="Add the key details..."
              className="mt-3 w-full resize-none rounded-2xl border border-black/15 px-5 py-4 font-semibold leading-7 outline-none transition focus:border-emerald-700 focus:ring-4 focus:ring-emerald-100"
            />
          </section>

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

          {type !== "alert" ? (
            <section className="border-t border-black/10 pt-8">
              <h2 className="text-xl font-black">Dates</h2>

              <div className="mt-5 rounded-3xl bg-black/[0.035] p-4 sm:p-5">
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

                <div className="mt-3 grid grid-cols-7 gap-1 sm:gap-2">
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
                          "flex aspect-square items-center justify-center rounded-xl text-xs font-black transition sm:rounded-2xl sm:text-sm",
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
          ) : (
            <section className="border-t border-black/10 pt-8">
              <div className="flex items-start gap-4 rounded-2xl bg-amber-50 px-5 py-5">
                <Megaphone className="mt-0.5 h-6 w-6 shrink-0 text-amber-700" />

                <div>
                  <h2 className="font-black text-amber-950">
                    Alerts last for 24 hours.
                  </h2>

                  <p className="mt-1 text-sm leading-6 text-amber-900/70">
                    This alert will automatically expire 24 hours after it is published.
                  </p>
                </div>
              </div>
            </section>
          )}

          {type !== "alert" ? (
            <section className="border-t border-black/10 pt-8">
              <h2 className="text-xl font-black">Image</h2>

              <label className="relative mt-5 flex aspect-[16/10] cursor-pointer items-center justify-center overflow-hidden rounded-3xl border border-black/10 bg-black/[0.03]">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(event) => {
                    setImageFile(event.target.files?.[0] ?? null);
                  }}
                  className="hidden"
                />

                {displayedImage ? (
                  <>
                    <Image
                      src={displayedImage}
                      alt="Post image"
                      fill
                      unoptimized
                      className="object-cover"
                    />

                    <div className="absolute inset-x-4 bottom-4 rounded-2xl bg-black/70 px-4 py-3 text-center text-sm font-black text-white">
                      Tap to replace image
                    </div>
                  </>
                ) : (
                  <div className="text-center text-black/40">
                    <ImagePlus className="mx-auto h-8 w-8" />
                    <p className="mt-2 text-sm font-black">Add image</p>
                  </div>
                )}
              </label>

              {displayedImage ? (
                <button
                  type="button"
                  onClick={() => {
                    setImageFile(null);
                  }}
                  className="mt-4 inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-red-200 px-4 text-sm font-black text-red-700 transition hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4" />
                  Remove image
                </button>
              ) : null}
            </section>
          ) : null}

          {message ? (
            <p className="rounded-2xl bg-red-50 px-5 py-4 text-sm font-bold leading-6 text-red-800">
              {message}
            </p>
          ) : null}

          <section className="flex flex-col-reverse gap-3 border-t border-black/10 pt-8 sm:flex-row">
            <Link
              href="/account"
              className="inline-flex h-14 items-center justify-center rounded-2xl border border-black/15 px-6 text-sm font-black uppercase tracking-[0.12em] transition hover:bg-black/[0.03]"
            >
              Cancel
            </Link>

            <button
              type="button"
              onClick={() => void createPost()}
              disabled={saving || loadingPages || pages.length === 0}
              className="inline-flex h-14 flex-1 items-center justify-center gap-3 rounded-2xl bg-emerald-700 px-6 text-sm font-black uppercase tracking-[0.12em] text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
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
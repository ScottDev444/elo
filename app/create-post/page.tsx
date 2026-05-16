"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ImagePlus,
  Megaphone,
  PoundSterling,
  X,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

type PageOption = {
  id: string;
  name: string;
};

type PostType = "event" | "deal" | "alert";
type DealKind = "price" | "free" | "percent" | "multibuy";

function normaliseDate(date: Date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function dateKey(date: Date) {
  return date.toLocaleDateString("en-CA");
}

function monthLabel(date: Date) {
  return date.toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
  });
}

export default function CreatePostPage() {
  const router = useRouter();

  const [pages, setPages] = useState<PageOption[]>([]);
  const [groupId, setGroupId] = useState("");
  const [type, setType] = useState<PostType>("event");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [monthDate, setMonthDate] = useState(() => normaliseDate(new Date()));
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState("");

  const [dealKind, setDealKind] = useState<DealKind>("price");
  const [dealPrice, setDealPrice] = useState("");
  const [discountPercent, setDiscountPercent] = useState("");
  const [buyQuantity, setBuyQuantity] = useState("");
  const [payQuantity, setPayQuantity] = useState("");

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!imageFile) {
      setImagePreview("");
      return;
    }

    const previewUrl = URL.createObjectURL(imageFile);
    setImagePreview(previewUrl);

    return () => URL.revokeObjectURL(previewUrl);
  }, [imageFile]);

  useEffect(() => {
    async function loadPages() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/auth");
        return;
      }

      const { data: profile } = await supabase
        .from("users")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      let query = supabase
        .from("groups")
        .select("id, name")
        .eq("status", "approved")
        .order("name");

      if (profile?.role !== "admin") {
        query = query.eq("user_id", user.id);
      }

      const { data, error } = await query;

      if (error) {
        setMessage(error.message);
        return;
      }

      const loadedPages = data ?? [];
      setPages(loadedPages);

      if (loadedPages.length > 0) {
        const eloPage = loadedPages.find(
          (page) => page.name.toLowerCase() === "east lothian online"
        );

        if (profile?.role === "admin" && eloPage) {
          setGroupId(eloPage.id);
        } else {
          setGroupId(loadedPages[0].id);
        }
      }
    }

    loadPages();
  }, [router]);

  const today = normaliseDate(new Date());

  const calendarDays = useMemo(() => {
    const year = monthDate.getFullYear();
    const month = monthDate.getMonth();

    const firstDay = new Date(year, month, 1);
    const startDay = (firstDay.getDay() + 6) % 7;

    const start = normaliseDate(new Date(firstDay));
    start.setDate(firstDay.getDate() - startDay);

    return Array.from({ length: 42 }).map((_, index) => {
      const date = normaliseDate(new Date(start));
      date.setDate(start.getDate() + index);
      return date;
    });
  }, [monthDate]);

  function toggleDate(date: Date) {
    const key = dateKey(date);
    if (date < today) return;

    setSelectedDates((current) =>
      current.includes(key)
        ? current.filter((item) => item !== key)
        : [...current, key].sort()
    );
  }

  function removeDate(date: string) {
    setSelectedDates((current) => current.filter((item) => item !== date));
  }

  function goPreviousMonth() {
    const next = new Date(monthDate);
    next.setMonth(monthDate.getMonth() - 1);
    setMonthDate(normaliseDate(next));
  }

  function goNextMonth() {
    const next = new Date(monthDate);
    next.setMonth(monthDate.getMonth() + 1);
    setMonthDate(normaliseDate(next));
  }

  async function uploadImage() {
    if (!imageFile) return null;

    const fileExt = imageFile.name.split(".").pop();
    const fileName = `${crypto.randomUUID()}.${fileExt}`;

    const { error } = await supabase.storage
      .from("post-images")
      .upload(fileName, imageFile);

    if (error) throw new Error(error.message);

    const { data } = supabase.storage
      .from("post-images")
      .getPublicUrl(fileName);

    return data.publicUrl;
  }

  function validateDeal() {
    if (type !== "deal") return true;

    if (dealKind === "price" && !dealPrice.trim()) {
      setMessage("Add the deal price.");
      return false;
    }

    if (dealKind === "percent" && !discountPercent.trim()) {
      setMessage("Add the percentage off.");
      return false;
    }

    if (dealKind === "multibuy" && (!buyQuantity.trim() || !payQuantity.trim())) {
      setMessage("Add the multibuy numbers.");
      return false;
    }

    return true;
  }

  async function handleSubmit() {
    setMessage("");

    if (!groupId) {
      setMessage("Choose a page first.");
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

    if (!validateDeal()) return;

    try {
      setLoading(true);

      const imageUrl = type === "alert" ? null : await uploadImage();

      const expiresAt =
        type === "alert"
          ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
          : null;

      const { error } = await supabase.from("posts").insert({
        group_id: groupId,
        type: type === "alert" ? "update" : type,
        title: title.trim(),
        content: body.trim(),
        image_url: imageUrl,
        event_start: selectedDates[0] ?? null,
        event_end: selectedDates[selectedDates.length - 1] ?? null,
        expires_at: expiresAt,
        metadata: {
          active_dates: type === "alert" ? [] : selectedDates,
          public_type: type,
          alert_icon: type === "alert" ? "alert" : null,
          deal_kind: type === "deal" ? dealKind : null,
          deal_price:
            type === "deal" && dealKind === "price" ? Number(dealPrice) : null,
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
        },
      });

      if (error) throw new Error(error.message);

      router.push("/");
      router.refresh();
    } catch (error: any) {
      setMessage(error.message ?? "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-white p-6">
      <section className="rounded-[2rem] bg-emerald-800 p-6 text-white shadow-xl">
        <p className="mb-2 text-xs font-bold uppercase tracking-[0.25em] text-emerald-100/70">
          Create Post
        </p>

        <h1 className="text-4xl font-black leading-none">
          Share something local.
        </h1>

        <p className="mt-3 text-sm text-white/80">
          Add an event, deal or quick local alert.
        </p>
      </section>

      <div className="mx-auto mt-8 max-w-2xl space-y-6">
        <section className="rounded-[2rem] bg-neutral-50 p-4">
          <label className="mb-2 block text-sm font-bold text-black">
            Post from
          </label>

          <select
            value={groupId}
            onChange={(e) => setGroupId(e.target.value)}
            className="w-full rounded-2xl bg-white p-4 font-semibold text-black outline-none"
          >
            {pages.map((page) => (
              <option key={page.id} value={page.id}>
                {page.name}
              </option>
            ))}
          </select>
        </section>

        <section className="grid grid-cols-3 gap-3">
          {[
            { value: "event", label: "Event", icon: CalendarDays },
            { value: "deal", label: "Deal", icon: PoundSterling },
            { value: "alert", label: "Alert", icon: AlertTriangle },
          ].map((item) => {
            const Icon = item.icon;
            const active = type === item.value;

            return (
              <button
                key={item.value}
                type="button"
                onClick={() => setType(item.value as PostType)}
                className={`rounded-[1.5rem] p-4 text-center transition ${
                  active
                    ? "bg-emerald-800 text-white"
                    : "bg-neutral-100 text-black"
                }`}
              >
                <Icon className="mx-auto mb-2" size={24} />
                <span className="text-sm font-black">{item.label}</span>
              </button>
            );
          })}
        </section>

        <section className="rounded-[2rem] bg-neutral-50 p-4">
          <label className="mb-2 block text-sm font-bold text-black">
            Title
          </label>

          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={
              type === "alert"
                ? "Closed today, roadworks, sold out..."
                : "What’s happening?"
            }
            className="w-full rounded-2xl bg-white p-4 font-semibold text-black outline-none"
          />

          <label className="mb-2 mt-4 block text-sm font-bold text-black">
            Details
          </label>

          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Add the key details..."
            rows={5}
            className="w-full resize-none rounded-2xl bg-white p-4 font-semibold text-black outline-none"
          />
        </section>

        {type === "deal" && (
          <section className="rounded-[2rem] bg-neutral-50 p-4">
            <label className="mb-2 block text-sm font-bold text-black">
              Deal type
            </label>

            <select
              value={dealKind}
              onChange={(e) => setDealKind(e.target.value as DealKind)}
              className="w-full rounded-2xl bg-white p-4 font-semibold text-black outline-none"
            >
              <option value="price">Price deal</option>
              <option value="free">Free</option>
              <option value="percent">Percentage off</option>
              <option value="multibuy">X for X</option>
            </select>

            {dealKind === "price" && (
              <input
                type="number"
                min="0"
                step="0.01"
                value={dealPrice}
                onChange={(e) => setDealPrice(e.target.value)}
                placeholder="5.00"
                className="mt-3 w-full rounded-2xl bg-white p-4 font-semibold text-black outline-none"
              />
            )}

            {dealKind === "percent" && (
              <input
                type="number"
                min="1"
                max="100"
                value={discountPercent}
                onChange={(e) => setDiscountPercent(e.target.value)}
                placeholder="20"
                className="mt-3 w-full rounded-2xl bg-white p-4 font-semibold text-black outline-none"
              />
            )}

            {dealKind === "multibuy" && (
              <div className="mt-3 grid grid-cols-2 gap-3">
                <input
                  type="number"
                  min="1"
                  value={buyQuantity}
                  onChange={(e) => setBuyQuantity(e.target.value)}
                  placeholder="Buy 2"
                  className="rounded-2xl bg-white p-4 font-semibold text-black outline-none"
                />

                <input
                  type="number"
                  min="1"
                  value={payQuantity}
                  onChange={(e) => setPayQuantity(e.target.value)}
                  placeholder="Pay for 1"
                  className="rounded-2xl bg-white p-4 font-semibold text-black outline-none"
                />
              </div>
            )}

            {dealKind === "free" && (
              <p className="mt-3 rounded-2xl bg-emerald-100 p-4 text-sm font-bold text-emerald-900">
                This will show as a free deal.
              </p>
            )}
          </section>
        )}

        {type !== "alert" && (
          <>
            <section className="rounded-[2rem] bg-neutral-50 p-4">
              <div className="mb-3 flex items-center justify-between">
                <button
                  type="button"
                  onClick={goPreviousMonth}
                  className="rounded-2xl bg-white p-3 text-black shadow-sm"
                >
                  <ChevronLeft size={20} />
                </button>

                <h2 className="text-xl font-black text-black">
                  {monthLabel(monthDate)}
                </h2>

                <button
                  type="button"
                  onClick={goNextMonth}
                  className="rounded-2xl bg-white p-3 text-black shadow-sm"
                >
                  <ChevronRight size={20} />
                </button>
              </div>

              <div className="grid grid-cols-7 gap-2 text-center text-xs font-bold text-neutral-400">
                <span>Mon</span>
                <span>Tue</span>
                <span>Wed</span>
                <span>Thu</span>
                <span>Fri</span>
                <span>Sat</span>
                <span>Sun</span>
              </div>

              <div className="mt-3 grid grid-cols-7 gap-2">
                {calendarDays.map((date) => {
                  const key = dateKey(date);
                  const isPast = date < today;
                  const isCurrentMonth =
                    date.getMonth() === monthDate.getMonth();
                  const isSelected = selectedDates.includes(key);

                  return (
                    <button
                      key={key}
                      type="button"
                      disabled={isPast}
                      onClick={() => toggleDate(date)}
                      className={[
                        "relative flex aspect-square items-center justify-center rounded-2xl text-sm font-bold transition",
                        isPast
                          ? "cursor-not-allowed bg-neutral-100 text-neutral-300"
                          : "bg-white text-black shadow-sm hover:bg-emerald-50",
                        !isCurrentMonth && !isPast ? "text-neutral-300" : "",
                        isSelected
                          ? "bg-emerald-100 text-emerald-900 ring-2 ring-emerald-700 hover:bg-emerald-100"
                          : "",
                      ].join(" ")}
                    >
                      {date.getDate()}
                    </button>
                  );
                })}
              </div>

              {selectedDates.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {selectedDates.map((date) => (
                    <button
                      key={date}
                      type="button"
                      onClick={() => removeDate(date)}
                      className="flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-2 text-sm font-bold text-emerald-900"
                    >
                      {date}
                      <X size={14} />
                    </button>
                  ))}
                </div>
              )}
            </section>

            <section className="rounded-[2rem] bg-neutral-50 p-4">
              <label className="mb-3 block text-sm font-bold text-black">
                Image
              </label>

              <label className="relative flex aspect-square cursor-pointer items-center justify-center overflow-hidden rounded-[2rem] bg-white text-neutral-400">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
                  className="hidden"
                />

                {imagePreview ? (
                  <>
                    <img
                      src={imagePreview}
                      alt="Post preview"
                      className="h-full w-full object-cover"
                    />

                    <div className="absolute inset-x-4 bottom-4 rounded-2xl bg-black/60 px-4 py-3 text-center text-sm font-black text-white backdrop-blur">
                      Tap to change image
                    </div>
                  </>
                ) : (
                  <div className="text-center">
                    <ImagePlus className="mx-auto mb-2" size={32} />
                    <p className="text-sm font-bold">Add image</p>
                  </div>
                )}
              </label>

              {imageFile && (
                <button
                  type="button"
                  onClick={() => setImageFile(null)}
                  className="mt-3 rounded-full bg-red-50 px-4 py-2 text-sm font-bold text-red-700"
                >
                  Remove image
                </button>
              )}
            </section>
          </>
        )}

        {type === "alert" && (
          <section className="rounded-[2rem] bg-yellow-50 p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-yellow-100 p-3 text-yellow-700">
                <Megaphone size={24} />
              </div>

              <div>
                <p className="font-black text-black">Alerts last 24 hours.</p>

                <p className="text-sm text-neutral-500">
                  No image or date needed. Saved as update behind the scenes.
                </p>
              </div>
            </div>
          </section>
        )}

        {message && (
          <p className="rounded-2xl bg-red-50 p-4 text-sm font-bold text-red-700">
            {message}
          </p>
        )}

        <button
          type="button"
          onClick={handleSubmit}
          disabled={loading}
          className="w-full rounded-[2rem] bg-emerald-800 p-5 text-lg font-black text-white disabled:opacity-50"
        >
          {loading ? "Posting..." : "Post"}
        </button>
      </div>
    </main>
  );
}
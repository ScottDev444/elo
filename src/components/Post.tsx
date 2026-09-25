"use client";

import {
  ArrowLeft,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Clock3,
  FileText,
  Image as ImageIcon,
  Link2,
  LoaderCircle,
  LockKeyhole,
  MapPin,
  Plus,
  Radio,
  Send,
  ShieldCheck,
  Store,
  Tag,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";

import SiteHeader from "@/components/SiteHeader";
import { createClient } from "@/lib/supabase/client";

const POST_IMAGE_BUCKET = "post-images";
const ELO_PAGE_NAME = "east lothian online";
const ELO_PAGE_SLUG = "east-lothian-online";
const WEEKDAYS = ["M", "T", "W", "T", "F", "S", "S"];

const TIME_OPTIONS = Array.from({ length: 96 }, (_, index) => {
  const minutes = index * 15;
  const hour = Math.floor(minutes / 60);
  const minute = minutes % 60;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
});

type PostType = "event" | "deal" | "alert" | "update" | "popup" | "advert";
type DealKind = "price" | "percent" | "multibuy";

type GroupInfo = {
  id: string;
  user_id: string | null;
  name: string;
  slug: string | null;
  brand_color: string | null;
  is_local_partner: boolean | null;
};

type ExistingAdvert = {
  id: string;
  image_url: string | null;
  metadata: {
    advert_url?: string | null;
    [key: string]: unknown;
  } | null;
};

type SelectedImage = {
  id: string;
  url: string;
  file: File | null;
  mimeType: string;
  extension: string;
  width: number;
  height: number;
  existing?: boolean;
};

type PostOption = {
  id: PostType;
  title: string;
  description: string;
  partnerOnly?: boolean;
};

const POST_OPTIONS: PostOption[] = [
  {
    id: "event",
    title: "Event",
    description: "Choose the exact days it is happening.",
  },
  {
    id: "deal",
    title: "Deal",
    description: "Add an offer and choose the days it applies.",
  },
  {
    id: "alert",
    title: "Alert",
    description: "A short operational notice, such as closing early.",
  },
  {
    id: "update",
    title: "Update",
    description: "A longer post from your organisation.",
    partnerOnly: true,
  },
  {
    id: "popup",
    title: "Pop-Up",
    description: "A temporary place on one day, from one time to another.",
    partnerOnly: true,
  },
  {
    id: "advert",
    title: "Advert",
    description: "Your evergreen advert across ELO.",
    partnerOnly: true,
  },
];

function normaliseDate(value: Date) {
  const next = new Date(value);
  next.setHours(0, 0, 0, 0);
  return next;
}

function firstOfMonth(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), 1);
}

function dateKey(value: Date) {
  return [
    value.getFullYear(),
    String(value.getMonth() + 1).padStart(2, "0"),
    String(value.getDate()).padStart(2, "0"),
  ].join("-");
}

function formatSelectedDate(value: string) {
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function normaliseUrl(value: string) {
  const clean = value.trim();
  if (!clean) return "";
  return /^https?:\/\//i.test(clean) ? clean : `https://${clean}`;
}

function isValidTime(value: string) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value.trim());
}

function isEloPage(group: GroupInfo | null) {
  if (!group) return false;

  return (
    group.name.trim().toLowerCase() === ELO_PAGE_NAME ||
    group.slug?.trim().toLowerCase() === ELO_PAGE_SLUG
  );
}

function optionIcon(type: PostType, locked = false) {
  if (locked) return <LockKeyhole size={20} />;

  switch (type) {
    case "event":
      return <CalendarDays size={20} />;
    case "deal":
      return <Tag size={20} />;
    case "alert":
      return <CircleAlert size={20} />;
    case "update":
      return <FileText size={20} />;
    case "popup":
      return <MapPin size={20} />;
    case "advert":
      return <Radio size={20} />;
  }
}

function CalendarPicker({
  monthDate,
  setMonthDate,
  selectedDates,
  onToggle,
  single = false,
}: {
  monthDate: Date;
  setMonthDate: React.Dispatch<React.SetStateAction<Date>>;
  selectedDates: string[];
  onToggle: (date: Date) => void;
  single?: boolean;
}) {
  const today = useMemo(() => normaliseDate(new Date()), []);
  const maxDate = useMemo(() => {
    const date = normaliseDate(new Date());
    date.setFullYear(date.getFullYear() + 2);
    return date;
  }, []);

  const calendarDays = useMemo(() => {
    const first = firstOfMonth(monthDate);
    const mondayOffset = (first.getDay() + 6) % 7;
    const start = new Date(first);
    start.setDate(first.getDate() - mondayOffset);

    return Array.from({ length: 42 }, (_, index) => {
      const date = normaliseDate(start);
      date.setDate(start.getDate() + index);
      return date;
    });
  }, [monthDate]);

  const previousMonth = new Date(
    monthDate.getFullYear(),
    monthDate.getMonth() - 1,
    1
  );
  const nextMonth = new Date(
    monthDate.getFullYear(),
    monthDate.getMonth() + 1,
    1
  );

  const canGoBack = previousMonth >= firstOfMonth(today);
  const canGoForward = nextMonth <= firstOfMonth(maxDate);

  const monthLabel = new Intl.DateTimeFormat("en-GB", {
    month: "long",
    year: "numeric",
  }).format(monthDate);

  return (
    <div className="elo-post-calendar">
      <div className="elo-post-calendar-header">
        <button
          type="button"
          className="elo-post-calendar-arrow"
          disabled={!canGoBack}
          onClick={() => setMonthDate(previousMonth)}
          aria-label="Previous month"
        >
          <ChevronLeft size={19} />
        </button>

        <strong>{monthLabel}</strong>

        <button
          type="button"
          className="elo-post-calendar-arrow"
          disabled={!canGoForward}
          onClick={() => setMonthDate(nextMonth)}
          aria-label="Next month"
        >
          <ChevronRight size={19} />
        </button>
      </div>

      <div className="elo-post-weekdays" aria-hidden="true">
        {WEEKDAYS.map((day, index) => (
          <span key={`${day}-${index}`}>{day}</span>
        ))}
      </div>

      <div className="elo-post-days">
        {calendarDays.map((date) => {
          const key = dateKey(date);
          const selected = selectedDates.includes(key);
          const outside = date.getMonth() !== monthDate.getMonth();
          const disabled = date < today || date > maxDate;

          return (
            <button
              type="button"
              key={key}
              className={[
                "elo-post-day",
                selected ? "is-selected" : "",
                outside ? "is-outside" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              disabled={disabled}
              onClick={() => onToggle(date)}
              aria-pressed={selected}
            >
              {date.getDate()}
            </button>
          );
        })}
      </div>

      <div className="elo-post-calendar-footer">
        <span>{single ? "Choose one day" : "Tap every day this applies"}</span>
        <span>Up to 2 years ahead</span>
      </div>
    </div>
  );
}

export default function PostPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [group, setGroup] = useState<GroupInfo | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [selectedType, setSelectedType] = useState<PostType | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [alertText, setAlertText] = useState("");
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [monthDate, setMonthDate] = useState(() => firstOfMonth(new Date()));

  const [dealKind, setDealKind] = useState<DealKind>("price");
  const [dealPrice, setDealPrice] = useState("");
  const [discountPercent, setDiscountPercent] = useState("");
  const [buyQuantity, setBuyQuantity] = useState("");
  const [payQuantity, setPayQuantity] = useState("");

  const [popupAddress, setPopupAddress] = useState("");
  const [popupStartTime, setPopupStartTime] = useState("");
  const [popupEndTime, setPopupEndTime] = useState("");

  const [advertUrl, setAdvertUrl] = useState("");
  const [existingAdvert, setExistingAdvert] = useState<ExistingAdvert | null>(
    null
  );

  const [images, setImages] = useState<SelectedImage[]>([]);
  const [publishing, setPublishing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const currentOption =
    POST_OPTIONS.find((option) => option.id === selectedType) ?? null;

  const hasPremiumAccess = Boolean(
    group &&
      (group.is_local_partner === true || isEloPage(group) || isAdmin)
  );

  async function loadPage(showLoader = true) {
    if (showLoader) setLoading(true);
    setError(null);

    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) throw sessionError;

      const user = session?.user;

      if (!user) {
        setGroup(null);
        setExistingAdvert(null);
        setIsAdmin(false);
        return;
      }

      const [groupResult, roleResult] = await Promise.all([
        supabase
          .from("groups")
          .select(
            "id,user_id,name,slug,brand_color,is_local_partner,status,created_at"
          )
          .eq("user_id", user.id)
          .eq("status", "approved")
          .order("created_at", { ascending: true })
          .limit(1)
          .maybeSingle(),
        supabase.from("users").select("role").eq("id", user.id).maybeSingle(),
      ]);

      if (groupResult.error) throw groupResult.error;

      const loadedGroup = groupResult.data as GroupInfo | null;
      setGroup(loadedGroup);
      setIsAdmin(
        roleResult.data?.role?.trim().toLowerCase() === "admin"
      );

      if (!loadedGroup) {
        setExistingAdvert(null);
        return;
      }

      const { data: advertData, error: advertError } = await supabase
        .from("posts")
        .select("id,image_url,metadata")
        .eq("group_id", loadedGroup.id)
        .eq("type", "advert")
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (advertError) throw advertError;
      setExistingAdvert((advertData as ExistingAdvert | null) ?? null);
    } catch (caught) {
      console.error("Post page load error:", caught);
      setError(
        caught instanceof Error ? caught.message : "The post page could not be loaded."
      );
    } finally {
      if (showLoader) setLoading(false);
    }
  }

  useEffect(() => {
    void loadPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function cleanupImages(items: SelectedImage[]) {
    for (const image of items) {
      if (image.file && image.url.startsWith("blob:")) {
        URL.revokeObjectURL(image.url);
      }
    }
  }

  function resetComposer() {
    cleanupImages(images);
    setSelectedType(null);
    setTitle("");
    setBody("");
    setAlertText("");
    setSelectedDates([]);
    setMonthDate(firstOfMonth(new Date()));
    setDealKind("price");
    setDealPrice("");
    setDiscountPercent("");
    setBuyQuantity("");
    setPayQuantity("");
    setPopupAddress("");
    setPopupStartTime("");
    setPopupEndTime("");
    setAdvertUrl("");
    setImages([]);
    setError(null);
    setMessage(null);
  }

  async function refresh() {
    if (refreshing) return;
    setRefreshing(true);

    try {
      await loadPage(false);
      setMessage("Refreshed.");
    } finally {
      setRefreshing(false);
    }
  }

  function openPartnership() {
    if (!group) return;
    router.push(`/partnership?pageId=${encodeURIComponent(group.id)}`);
  }

  async function chooseType(option: PostOption) {
    if (option.partnerOnly && !hasPremiumAccess) {
      setError(`${option.title} is available to Local Partners.`);
      return;
    }

    cleanupImages(images);
    setTitle("");
    setBody("");
    setAlertText("");
    setSelectedDates([]);
    setMonthDate(firstOfMonth(new Date()));
    setDealKind("price");
    setDealPrice("");
    setDiscountPercent("");
    setBuyQuantity("");
    setPayQuantity("");
    setPopupAddress("");
    setPopupStartTime("");
    setPopupEndTime("");
    setAdvertUrl("");
    setImages([]);
    setError(null);
    setMessage(null);
    setSelectedType(option.id);

    if (option.id === "advert" && existingAdvert) {
      setAdvertUrl(existingAdvert.metadata?.advert_url?.trim() ?? "");

      if (existingAdvert.image_url) {
        const url = existingAdvert.image_url;
        const image = new window.Image();

        image.onload = () => {
          setImages([
            {
              id: `existing-${existingAdvert.id}`,
              url,
              file: null,
              mimeType: "image/jpeg",
              extension: "jpg",
              width: image.naturalWidth,
              height: image.naturalHeight,
              existing: true,
            },
          ]);
        };

        image.onerror = () => {
          setImages([
            {
              id: `existing-${existingAdvert.id}`,
              url,
              file: null,
              mimeType: "image/jpeg",
              extension: "jpg",
              width: 0,
              height: 0,
              existing: true,
            },
          ]);
        };

        image.src = url;
      }
    }
  }

  function toggleMultiDate(date: Date) {
    const key = dateKey(date);

    setSelectedDates((current) =>
      current.includes(key)
        ? current.filter((item) => item !== key)
        : [...current, key].sort()
    );
  }

  function setSingleDate(date: Date) {
    setSelectedDates([dateKey(date)]);
  }

  async function readImageDimensions(file: File) {
    return await new Promise<{ width: number; height: number }>((resolve) => {
      const url = URL.createObjectURL(file);
      const image = new window.Image();

      image.onload = () => {
        resolve({
          width: image.naturalWidth,
          height: image.naturalHeight,
        });
        URL.revokeObjectURL(url);
      };

      image.onerror = () => {
        resolve({ width: 0, height: 0 });
        URL.revokeObjectURL(url);
      };

      image.src = url;
    });
  }

  async function addFiles(files: FileList | null, maxImages: number) {
    if (!files) return;

    const remaining = Math.max(0, maxImages - images.length);
    if (remaining === 0) return;

    const selectedFiles = Array.from(files)
      .filter((file) => file.type.startsWith("image/"))
      .slice(0, remaining);

    const nextImages: SelectedImage[] = [];

    for (const file of selectedFiles) {
      const { width, height } = await readImageDimensions(file);
      const extension =
        file.type === "image/png"
          ? "png"
          : file.type === "image/webp"
            ? "webp"
            : "jpg";

      nextImages.push({
        id: crypto.randomUUID(),
        url: URL.createObjectURL(file),
        file,
        mimeType: file.type || "image/jpeg",
        extension,
        width,
        height,
      });
    }

    if (maxImages === 1) {
      cleanupImages(images);
      setImages(nextImages.slice(0, 1));
    } else {
      setImages((current) => [...current, ...nextImages].slice(0, maxImages));
    }
  }

  function removeImage(id: string) {
    setImages((current) => {
      const removed = current.find((item) => item.id === id);

      if (removed?.file && removed.url.startsWith("blob:")) {
        URL.revokeObjectURL(removed.url);
      }

      return current.filter((item) => item.id !== id);
    });
  }

  async function uploadImage(
    image: SelectedImage,
    userId: string,
    groupId: string
  ) {
    if (image.existing || !image.file) return image.url;

    const path = `${userId}/${groupId}/posts/${crypto.randomUUID()}.${image.extension}`;

    const { error: uploadError } = await supabase.storage
      .from(POST_IMAGE_BUCKET)
      .upload(path, image.file, {
        contentType: image.mimeType,
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      throw new Error(`Image upload failed: ${uploadError.message}`);
    }

    return supabase.storage.from(POST_IMAGE_BUCKET).getPublicUrl(path).data
      .publicUrl;
  }

  function validate() {
    if (!selectedType) return "Choose a post type.";

    if (currentOption?.partnerOnly && !hasPremiumAccess) {
      return "This post type is for Local Partners.";
    }

    if (selectedType === "alert") {
      if (!alertText.trim()) return "Add the alert.";
      if (alertText.trim().length > 160) return "Keep alerts to one short line.";
      return null;
    }

    if (selectedType === "advert") {
      if (images.length === 0) return "Add an advert image.";
      if (!advertUrl.trim()) return "Add the advert destination.";
      return null;
    }

    if (!title.trim()) return "Add a title.";

    if (
      (selectedType === "event" || selectedType === "deal") &&
      selectedDates.length === 0
    ) {
      return "Select at least one day.";
    }

    if (selectedType === "deal") {
      if (dealKind === "price") {
        const value = Number(dealPrice);
        if (!Number.isFinite(value) || value <= 0) {
          return "Add a valid deal price.";
        }
      }

      if (dealKind === "percent") {
        const value = Number(discountPercent);
        if (!Number.isFinite(value) || value <= 0 || value > 100) {
          return "Add a percentage between 1 and 100.";
        }
      }

      if (dealKind === "multibuy") {
        const buy = Number(buyQuantity);
        const pay = Number(payQuantity);

        if (
          !Number.isInteger(buy) ||
          !Number.isInteger(pay) ||
          buy <= 1 ||
          pay <= 0 ||
          pay >= buy
        ) {
          return "The pay quantity must be lower than the buy quantity.";
        }
      }
    }

    if (selectedType === "update" && !body.trim()) {
      return "Write the update.";
    }

    if (selectedType === "popup") {
      if (selectedDates.length !== 1) return "Choose the Pop-Up day.";
      if (!popupAddress.trim()) return "Add the Pop-Up address.";

      if (!isValidTime(popupStartTime) || !isValidTime(popupEndTime)) {
        return "Choose a start and end time.";
      }

      if (popupEndTime <= popupStartTime) {
        return "The Pop-Up must end after it starts.";
      }
    }

    return null;
  }

  async function publishPost() {
    if (publishing) return;

    const validationError = validate();

    if (validationError) {
      setError(validationError);
      return;
    }

    if (!selectedType || !group) return;

    setPublishing(true);
    setError(null);
    setMessage(null);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const user = session?.user;
      if (!user) throw new Error("You need to sign in again before posting.");

      const [liveGroupResult, liveRoleResult] = await Promise.all([
        supabase
          .from("groups")
          .select("id,user_id,name,slug,is_local_partner")
          .eq("id", group.id)
          .eq("user_id", user.id)
          .eq("status", "approved")
          .maybeSingle(),
        supabase.from("users").select("role").eq("id", user.id).maybeSingle(),
      ]);

      if (liveGroupResult.error) throw liveGroupResult.error;

      const liveGroup = liveGroupResult.data as GroupInfo | null;
      if (!liveGroup) {
        throw new Error("You do not have permission to post from this Page.");
      }

      const liveIsAdmin =
        liveRoleResult.data?.role?.trim().toLowerCase() === "admin";

      const livePremiumAccess =
        liveGroup.is_local_partner === true ||
        isEloPage(liveGroup) ||
        liveIsAdmin;

      if (currentOption?.partnerOnly && !livePremiumAccess) {
        throw new Error(
          `${currentOption.title} is available to Local Partners.`
        );
      }

      let liveAdvertId: string | null = null;

      if (selectedType === "advert") {
        const { data: liveAdvert, error: advertError } = await supabase
          .from("posts")
          .select("id")
          .eq("group_id", liveGroup.id)
          .eq("type", "advert")
          .order("created_at", { ascending: true })
          .limit(1)
          .maybeSingle();

        if (advertError) throw advertError;
        liveAdvertId = liveAdvert?.id ?? null;
      }

      const maxImages = selectedType === "update" ? 3 : 1;

      const uploadedUrls =
        selectedType === "alert"
          ? []
          : await Promise.all(
              images
                .slice(0, maxImages)
                .map((image) => uploadImage(image, user.id, liveGroup.id))
            );

      const publicTitle =
        selectedType === "alert"
          ? alertText.trim()
          : selectedType === "advert"
            ? "Advert"
            : title.trim();

      const publicBody =
        selectedType === "alert" || selectedType === "advert"
          ? ""
          : body.trim();

      const activeDates =
        selectedType === "event" ||
        selectedType === "deal" ||
        selectedType === "popup"
          ? selectedDates
          : [];

      const metadata = {
        active_dates: activeDates,
        public_type: selectedType,
        alert_icon: selectedType === "alert" ? "alert" : null,
        deal_kind: selectedType === "deal" ? dealKind : null,
        deal_price:
          selectedType === "deal" && dealKind === "price"
            ? Number(dealPrice)
            : null,
        discount_percent:
          selectedType === "deal" && dealKind === "percent"
            ? Number(discountPercent)
            : null,
        buy_quantity:
          selectedType === "deal" && dealKind === "multibuy"
            ? Number(buyQuantity)
            : null,
        pay_quantity:
          selectedType === "deal" && dealKind === "multibuy"
            ? Number(payQuantity)
            : null,
        image_urls: selectedType === "update" ? uploadedUrls : [],
        popup_address:
          selectedType === "popup" ? popupAddress.trim() : null,
        popup_start_time:
          selectedType === "popup" ? popupStartTime.trim() : null,
        popup_end_time:
          selectedType === "popup" ? popupEndTime.trim() : null,
        advert_cta: selectedType === "advert" ? "Open" : null,
        advert_url:
          selectedType === "advert" ? normaliseUrl(advertUrl) : null,
      };

      let expiresAt: string | null = null;

      if (selectedType === "alert" || selectedType === "update") {
        expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      }

      if (selectedType === "popup") {
        expiresAt = new Date(
          `${selectedDates[0]}T${popupEndTime.trim()}:00`
        ).toISOString();
      }

      const postPayload = {
        user_id: liveGroup.user_id ?? user.id,
        group_id: liveGroup.id,
        type: selectedType,
        title: publicTitle,
        content: publicBody,
        image_url:
          selectedType === "alert" || selectedType === "update"
            ? null
            : uploadedUrls[0] ?? null,
        event_start: activeDates[0] ?? null,
        event_end: activeDates[activeDates.length - 1] ?? null,
        expires_at: expiresAt,
        metadata,
      };

      let createdPost: { id: string } | null = null;

      if (selectedType === "advert" && liveAdvertId) {
        const { data, error: updateError } = await supabase
          .from("posts")
          .update(postPayload)
          .eq("id", liveAdvertId)
          .eq("group_id", liveGroup.id)
          .select("id")
          .single();

        if (updateError) throw updateError;
        createdPost = data;
      } else {
        const { data, error: insertError } = await supabase
          .from("posts")
          .insert(postPayload)
          .select("id")
          .single();

        if (insertError) throw insertError;
        createdPost = data;
      }

      if (!createdPost) throw new Error("The post could not be saved.");

      const publishedType = selectedType;

      if (publishedType === "advert") {
        setExistingAdvert({
          id: createdPost.id,
          image_url: uploadedUrls[0] ?? null,
          metadata,
        });
      }

      cleanupImages(images);
      setImages([]);
      setSelectedType(null);
      setTitle("");
      setBody("");
      setAlertText("");
      setSelectedDates([]);
      setDealKind("price");
      setDealPrice("");
      setDiscountPercent("");
      setBuyQuantity("");
      setPayQuantity("");
      setPopupAddress("");
      setPopupStartTime("");
      setPopupEndTime("");
      setAdvertUrl("");
      setMessage(
        publishedType === "advert" && existingAdvert
          ? "Advert saved."
          : "Published. Your post is now live on ELO."
      );
    } catch (caught) {
      console.error("Publish post error:", caught);
      setError(
        caught instanceof Error ? caught.message : "The post could not be published."
      );
    } finally {
      setPublishing(false);
    }
  }

  function PhotoPicker({
    maxImages,
    required = false,
    label = "Photo",
  }: {
    maxImages: number;
    required?: boolean;
    label?: string;
  }) {
    return (
      <div className="elo-post-media">
        <div className="elo-post-inline-heading">
          <strong>{label}</strong>
          {!required && <span>OPTIONAL</span>}
        </div>

        {images.length > 0 ? (
          <div className="elo-post-photo-row">
            {images.map((image) => (
              <div key={image.id} className="elo-post-photo-wrap">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={image.url} alt="" className="elo-post-photo" />
                <button
                  type="button"
                  className="elo-post-remove-photo"
                  onClick={() => removeImage(image.id)}
                  aria-label="Remove photo"
                >
                  <X size={15} />
                </button>
              </div>
            ))}

            {images.length < maxImages && (
              <label className="elo-post-add-photo">
                <Plus size={22} />
                <input
                  type="file"
                  accept="image/*"
                  multiple={maxImages > 1}
                  hidden
                  onChange={(event) => {
                    void addFiles(event.target.files, maxImages);
                    event.currentTarget.value = "";
                  }}
                />
              </label>
            )}
          </div>
        ) : (
          <label className="elo-post-photo-button">
            <ImageIcon size={20} />
            <span>Add {label.toLowerCase()}</span>
            <input
              type="file"
              accept="image/*"
              multiple={maxImages > 1}
              hidden
              onChange={(event) => {
                void addFiles(event.target.files, maxImages);
                event.currentTarget.value = "";
              }}
            />
          </label>
        )}
      </div>
    );
  }

  function ComposerHeader(titleText: string, subtitleText?: string) {
    return (
      <div className="elo-post-composer-top">
        <button
          type="button"
          className="elo-post-back"
          onClick={resetComposer}
          aria-label="Back to post types"
        >
          <ArrowLeft size={20} />
        </button>

        <div>
          <span className="elo-post-composer-type">
            {currentOption?.title.toUpperCase()}
          </span>
          <h1>{titleText}</h1>
          {subtitleText && <p>{subtitleText}</p>}
        </div>
      </div>
    );
  }

  function StandardEditor({
    bodyPlaceholder,
    longForm = false,
    photoMax = 1,
  }: {
    bodyPlaceholder: string;
    longForm?: boolean;
    photoMax?: number;
  }) {
    return (
      <>
        <input
          className="elo-post-headline"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Title"
          maxLength={120}
        />
        <div className="elo-post-divider" />
        <textarea
          className={`elo-post-body-editor ${longForm ? "is-long" : ""}`}
          value={body}
          onChange={(event) => setBody(event.target.value)}
          placeholder={bodyPlaceholder}
          maxLength={longForm ? 8000 : 4000}
        />
        {PhotoPicker({
          maxImages: photoMax,
          label: photoMax > 1 ? "Photos" : "Photo",
        })}
      </>
    );
  }

  function DateSection({ single = false }: { single?: boolean }) {
    return (
      <section className="elo-post-section">
        <div className="elo-post-section-line">
          <div>
            <span>WHEN</span>
            <h2>{single ? "Pop-Up date" : "Dates"}</h2>
          </div>

          {selectedDates.length > 0 && (
            <strong>
              {single
                ? formatSelectedDate(selectedDates[0])
                : `${selectedDates.length} selected`}
            </strong>
          )}
        </div>

        <div className="elo-post-section-card">
          <CalendarPicker
            monthDate={monthDate}
            setMonthDate={setMonthDate}
            selectedDates={selectedDates}
            onToggle={single ? setSingleDate : toggleMultiDate}
            single={single}
          />

          {selectedDates.length > 0 && (
            <div className="elo-post-selected-summary">
              <CalendarDays size={16} />
              <span>
                {single
                  ? formatSelectedDate(selectedDates[0])
                  : selectedDates.length <= 3
                    ? selectedDates.map(formatSelectedDate).join(" · ")
                    : `${selectedDates.length} dates selected`}
              </span>
              <button type="button" onClick={() => setSelectedDates([])}>
                Clear
              </button>
            </div>
          )}
        </div>
      </section>
    );
  }

  function renderChooser() {
    return (
      <>
        <header className="elo-post-intro">
          <span>CREATE</span>
          <h1>New post</h1>
          <p>Choose what you want to publish.</p>
        </header>

        <div className="elo-post-posting-as">
          <span
            className="elo-post-page-colour"
            style={{ background: group?.brand_color || "#005744" }}
          />
          <div>
            <span>POSTING AS</span>
            <strong>{group?.name}</strong>
          </div>

          {hasPremiumAccess && (
            <b>
              {isEloPage(group) || isAdmin ? "ELO" : "PARTNER"}
            </b>
          )}
        </div>

        {!hasPremiumAccess && group && (
          <button
            type="button"
            className="elo-post-partnership"
            onClick={openPartnership}
          >
            <span className="elo-post-partnership-icon">
              <ShieldCheck size={20} />
            </span>

            <span className="elo-post-partnership-copy">
              <span>
                <strong>Unlock Partnership</strong>
                <b>£19.99/mo</b>
              </span>
              <small>
                More post types, analytics, Local Trends and your own feed
                advert.
              </small>
            </span>

            <ChevronRight size={18} />
          </button>
        )}

        <div className="elo-post-type-list">
          {POST_OPTIONS.map((option, index) => {
            const locked = Boolean(
              option.partnerOnly && !hasPremiumAccess
            );

            return (
              <button
                key={option.id}
                type="button"
                className={`elo-post-type-row ${
                  index < POST_OPTIONS.length - 1 ? "has-border" : ""
                }`}
                onClick={() => void chooseType(option)}
              >
                <span
                  className={`elo-post-type-icon ${
                    locked ? "is-locked" : ""
                  }`}
                >
                  {optionIcon(option.id, locked)}
                </span>

                <span className="elo-post-type-copy">
                  <span className="elo-post-type-title">
                    <strong className={locked ? "is-locked" : ""}>
                      {option.id === "advert" && existingAdvert
                        ? "Edit Advert"
                        : option.title}
                    </strong>

                    {option.partnerOnly && (
                      <b className={hasPremiumAccess ? "is-active" : ""}>
                        {hasPremiumAccess ? "AVAILABLE" : "PARTNER"}
                      </b>
                    )}
                  </span>

                  <small>
                    {option.id === "advert" && existingAdvert
                      ? "Replace the banner or change where it opens."
                      : option.description}
                  </small>
                </span>

                <ChevronRight size={18} />
              </button>
            );
          })}
        </div>
      </>
    );
  }

  function renderEvent() {
    return (
      <>
        {ComposerHeader(
          "Create an event",
          "Write it once, then choose every date it runs."
        )}

        <div className="elo-post-editor-card">
          {StandardEditor({
            bodyPlaceholder: "What should people know about the event?",
          })}
        </div>

        {DateSection({})}
      </>
    );
  }

  function renderDeal() {
    return (
      <>
        {ComposerHeader(
          "Create a deal",
          "Add the offer, then choose every day it applies."
        )}

        <div className="elo-post-editor-card">
          {StandardEditor({
            bodyPlaceholder: "Add any useful details about the deal.",
          })}
        </div>

        <section className="elo-post-section">
          <div className="elo-post-section-line">
            <div>
              <span>OFFER</span>
              <h2>Deal value</h2>
            </div>
          </div>

          <div className="elo-post-section-card">
            <div className="elo-post-deal-switch">
              {(
                [
                  ["price", "Price"],
                  ["percent", "% off"],
                  ["multibuy", "Multi-buy"],
                ] as const
              ).map(([value, label]) => (
                <button
                  type="button"
                  key={value}
                  className={dealKind === value ? "is-active" : ""}
                  onClick={() => setDealKind(value)}
                >
                  {label}
                </button>
              ))}
            </div>

            {dealKind === "price" && (
              <>
                <div className="elo-post-value-row">
                  <b>£</b>
                  <input
                    inputMode="decimal"
                    value={dealPrice}
                    onChange={(event) => setDealPrice(event.target.value)}
                    placeholder="0.00"
                  />
                </div>
                <small className="elo-post-example">
                  Example: £4.99
                </small>
              </>
            )}

            {dealKind === "percent" && (
              <div className="elo-post-value-row">
                <input
                  inputMode="numeric"
                  value={discountPercent}
                  onChange={(event) =>
                    setDiscountPercent(event.target.value)
                  }
                  placeholder="20"
                />
                <b>% OFF</b>
              </div>
            )}

            {dealKind === "multibuy" && (
              <div className="elo-post-multibuy">
                <label>
                  <span>BUY</span>
                  <input
                    inputMode="numeric"
                    value={buyQuantity}
                    onChange={(event) => setBuyQuantity(event.target.value)}
                    placeholder="2"
                  />
                </label>
                <b>FOR</b>
                <label>
                  <span>PAY FOR</span>
                  <input
                    inputMode="numeric"
                    value={payQuantity}
                    onChange={(event) => setPayQuantity(event.target.value)}
                    placeholder="1"
                  />
                </label>
              </div>
            )}
          </div>
        </section>

        {DateSection({})}
      </>
    );
  }

  function renderAlert() {
    return (
      <>
        {ComposerHeader(
          "Create an alert",
          "Keep it short and operational. Alerts stay live for 24 hours."
        )}

        <div className="elo-post-editor-card">
          <div className="elo-post-alert-composer">
            <span>
              <CircleAlert size={20} />
            </span>
            <input
              value={alertText}
              onChange={(event) => setAlertText(event.target.value)}
              maxLength={160}
              placeholder="e.g. Closing at 3pm today"
            />
          </div>

          <div className="elo-post-alert-counter">
            {alertText.length}/160
          </div>
        </div>

        <p className="elo-post-quiet-note">
          Alerts are designed for short operational notices and disappear
          automatically after 24 hours.
        </p>
      </>
    );
  }

  function renderUpdate() {
    return (
      <>
        {ComposerHeader(
          "Create an update",
          "Share a longer update from your organisation."
        )}

        <div className="elo-post-editor-card elo-post-update-card">
          {StandardEditor({
            bodyPlaceholder: "Write your update...",
            longForm: true,
            photoMax: 3,
          })}
        </div>

        <p className="elo-post-quiet-note">
          Updates remain in today&apos;s feed for 24 hours.
        </p>
      </>
    );
  }

  function renderPopup() {
    return (
      <>
        {ComposerHeader(
          "Create a Pop-Up",
          "Add the temporary location, date and opening times."
        )}

        <div className="elo-post-editor-card">
          <input
            className="elo-post-headline"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Pop-Up title"
            maxLength={120}
          />

          <div className="elo-post-divider" />

          <div className="elo-post-location-row">
            <MapPin size={18} />
            <input
              value={popupAddress}
              onChange={(event) => setPopupAddress(event.target.value)}
              placeholder="Address"
            />
          </div>

          <textarea
            className="elo-post-popup-description"
            value={body}
            onChange={(event) => setBody(event.target.value)}
            placeholder="What should people know about the Pop-Up?"
            maxLength={4000}
          />

          {PhotoPicker({ maxImages: 1 })}
        </div>

        {DateSection({ single: true })}

        <section className="elo-post-section">
          <div className="elo-post-section-line">
            <div>
              <span>TIME</span>
              <h2>Opening times</h2>
            </div>
          </div>

          <div className="elo-post-section-card">
            <div className="elo-post-time-range">
              <label>
                <span>FROM</span>
                <div>
                  <Clock3 size={16} />
                  <select
                    value={popupStartTime}
                    onChange={(event) => {
                      const value = event.target.value;
                      setPopupStartTime(value);
                      if (popupEndTime && popupEndTime <= value) {
                        setPopupEndTime("");
                      }
                    }}
                  >
                    <option value="">Select</option>
                    {TIME_OPTIONS.map((time) => (
                      <option key={time} value={time}>
                        {time}
                      </option>
                    ))}
                  </select>
                </div>
              </label>

              <span>→</span>

              <label>
                <span>TO</span>
                <div>
                  <Clock3 size={16} />
                  <select
                    value={popupEndTime}
                    onChange={(event) => setPopupEndTime(event.target.value)}
                  >
                    <option value="">Select</option>
                    {TIME_OPTIONS.filter(
                      (time) => !popupStartTime || time > popupStartTime
                    ).map((time) => (
                      <option key={time} value={time}>
                        {time}
                      </option>
                    ))}
                  </select>
                </div>
              </label>
            </div>

            <p className="elo-post-time-hint">
              Times are selected in 15-minute intervals.
            </p>
          </div>
        </section>
      </>
    );
  }

  function renderAdvert() {
    const image = images[0] ?? null;
    const aspect =
      image && image.height > 0 ? image.width / image.height : null;
    const aspectGood = aspect !== null && aspect >= 2.9 && aspect <= 3.6;
    const resolutionGood = Boolean(
      image && image.width >= 975 && image.height >= 300
    );
    const imageGood = Boolean(image && aspectGood && resolutionGood);

    return (
      <>
        {ComposerHeader(
          existingAdvert ? "Edit your advert" : "Create your advert",
          "Your advert appears as a wide image-only banner in the feed."
        )}

        <div className="elo-post-editor-card elo-post-advert-card">
          <div className="elo-post-banner-heading">
            <div>
              <span>BANNER IMAGE</span>
              <strong>Wide, horizontal artwork</strong>
            </div>
            <b>3.25 : 1</b>
          </div>

          <p className="elo-post-banner-guide">
            Recommended 1300 × 400 px. Use wide artwork designed to stay clear
            and readable in the ELO feed.
          </p>

          {image ? (
            <>
              <div className="elo-post-banner-preview">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={image.url} alt="Advert preview" />
                <button
                  type="button"
                  onClick={() => removeImage(image.id)}
                  aria-label="Remove advert image"
                >
                  <X size={16} />
                </button>
                <span>FEED BANNER</span>
              </div>

              <div
                className={`elo-post-banner-quality ${
                  imageGood ? "is-good" : "is-warning"
                }`}
              >
                <CircleAlert size={17} />
                <div>
                  <strong>
                    {imageGood
                      ? "Good banner fit"
                      : "This image may not fit the banner well"}
                  </strong>
                  <p>
                    {imageGood
                      ? `${image.width} × ${image.height} px · good proportions for the ELO feed`
                      : `${image.width} × ${image.height} px · best results are around 1300 × 400 px (3.25:1)`}
                  </p>
                </div>
              </div>

              <label className="elo-post-replace-banner">
                <ImageIcon size={17} />
                <span>Choose a different banner</span>
                <input
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={(event) => {
                    void addFiles(event.target.files, 1);
                    event.currentTarget.value = "";
                  }}
                />
              </label>
            </>
          ) : (
            <label className="elo-post-banner-empty">
              <span className="elo-post-banner-empty-icon">
                <ImageIcon size={22} />
              </span>
              <span>
                <strong>Add banner artwork</strong>
                <small>Best size: 1300 × 400 px</small>
              </span>
              <ChevronRight size={18} />
              <input
                type="file"
                accept="image/*"
                hidden
                onChange={(event) => {
                  void addFiles(event.target.files, 1);
                  event.currentTarget.value = "";
                }}
              />
            </label>
          )}

          <div className="elo-post-divider is-wide" />

          <div className="elo-post-destination-heading">
            <Link2 size={18} />
            <strong>Where should the banner open?</strong>
          </div>

          <input
            className="elo-post-url"
            value={advertUrl}
            onChange={(event) => setAdvertUrl(event.target.value)}
            placeholder="https://yourwebsite.co.uk"
            inputMode="url"
          />
        </div>

        <p className="elo-post-quiet-note">
          Each Page can have one active evergreen advert.
        </p>
      </>
    );
  }

  function renderComposer() {
    if (!selectedType) return renderChooser();

    let editor: ReactNode = null;

    if (selectedType === "event") editor = renderEvent();
    if (selectedType === "deal") editor = renderDeal();
    if (selectedType === "alert") editor = renderAlert();
    if (selectedType === "update") editor = renderUpdate();
    if (selectedType === "popup") editor = renderPopup();
    if (selectedType === "advert") editor = renderAdvert();

    return (
      <>
        {editor}

        <button
          type="button"
          className="elo-post-publish"
          disabled={publishing}
          onClick={() => void publishPost()}
        >
          {publishing ? (
            <LoaderCircle size={18} className="elo-post-spin" />
          ) : (
            <Send size={18} />
          )}

          <span>
            {publishing
              ? selectedType === "advert" && existingAdvert
                ? "Saving…"
                : "Publishing…"
              : selectedType === "advert" && existingAdvert
                ? "Save advert"
                : "Publish"}
          </span>
        </button>
      </>
    );
  }

  return (
    <div className="elo-post-page">
      <SiteHeader />

      <main className="elo-post-main">
        {error && (
          <div className="elo-post-message is-error" role="alert">
            <span>{error}</span>
            <button type="button" onClick={() => setError(null)}>
              <X size={17} />
            </button>
          </div>
        )}

        {message && (
          <div className="elo-post-message" role="status">
            <span>{message}</span>
            <button type="button" onClick={() => setMessage(null)}>
              <X size={17} />
            </button>
          </div>
        )}

        {loading ? (
          <div className="elo-post-loading">
            <LoaderCircle size={30} className="elo-post-spin" />
            <span>Loading…</span>
          </div>
        ) : !group ? (
          <div className="elo-post-no-page">
            <span>
              <Store size={27} />
            </span>
            <h1>No approved Page</h1>
            <p>You need an approved ELO Page before you can publish.</p>
          </div>
        ) : (
          <>
            <div className="elo-post-refresh-row">
              <button
                type="button"
                disabled={refreshing}
                onClick={() => void refresh()}
              >
                {refreshing ? (
                  <LoaderCircle size={16} className="elo-post-spin" />
                ) : (
                  "Refresh"
                )}
              </button>
            </div>

            {renderComposer()}
          </>
        )}
      </main>

      <style>{`
        .elo-post-page {
          min-height: 100dvh;
          background: #F4F5F4;
          color: #111111;
          font-family: var(--font-geist-sans), Arial, sans-serif;
        }

        .elo-post-page *,
        .elo-post-page *::before,
        .elo-post-page *::after {
          box-sizing: border-box;
        }

        .elo-post-page button,
        .elo-post-page input,
        .elo-post-page textarea,
        .elo-post-page select {
          font: inherit;
        }

        .elo-post-page button {
          cursor: pointer;
        }

        .elo-post-page button:disabled {
          cursor: not-allowed;
          opacity: .55;
        }

        .elo-post-page button:focus-visible {
          outline: 2px solid rgba(0, 87, 68, .35);
          outline-offset: 2px;
        }

        .elo-post-page input:focus,
        .elo-post-page textarea:focus,
        .elo-post-page select:focus,
        .elo-post-page label:focus-within {
          outline: none;
          box-shadow: none;
        }

        .elo-post-main {
          width: 100%;
          max-width: 760px;
          margin: 0 auto;
          padding: 0 17px 130px;
        }

        .elo-post-refresh-row {
          height: 0;
          position: relative;
          z-index: 2;
        }

        .elo-post-refresh-row > button {
          position: absolute;
          right: 0;
          top: 15px;
          border: 0;
          background: transparent;
          color: #80908A;
          font-size: 10px;
          font-weight: 800;
          padding: 8px;
        }

        .elo-post-intro {
          padding: 23px 0 17px;
        }

        .elo-post-intro > span {
          color: #008564;
          font-size: 9px;
          font-weight: 900;
          letter-spacing: 1.35px;
        }

        .elo-post-intro h1,
        .elo-post-composer-top h1 {
          margin: 3px 0 0;
          color: #173C33;
          font-size: 30px;
          line-height: 35px;
          font-weight: 900;
          letter-spacing: -.9px;
        }

        .elo-post-intro p {
          margin: 4px 0 0;
          color: #78827E;
          font-size: 13px;
          font-weight: 600;
        }

        .elo-post-posting-as {
          min-height: 62px;
          display: flex;
          align-items: center;
          background: #FFFFFF;
          border: 1px solid #E1E6E3;
          border-radius: 16px;
          padding: 0 13px;
          margin-bottom: 15px;
        }

        .elo-post-page-colour {
          width: 6px;
          height: 35px;
          flex: 0 0 6px;
          border-radius: 4px;
          margin-right: 11px;
        }

        .elo-post-posting-as > div {
          min-width: 0;
          flex: 1;
        }

        .elo-post-posting-as > div span {
          display: block;
          color: #98A19D;
          font-size: 7px;
          font-weight: 900;
          letter-spacing: .9px;
        }

        .elo-post-posting-as > div strong {
          display: block;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          color: #18241F;
          font-size: 14px;
          font-weight: 900;
          margin-top: 2px;
        }

        .elo-post-posting-as > b {
          padding: 5px 8px;
          border-radius: 8px;
          background: #E6F1ED;
          color: #005744;
          font-size: 7px;
          font-weight: 900;
          letter-spacing: .6px;
        }

        .elo-post-partnership {
          width: 100%;
          min-height: 74px;
          display: flex;
          align-items: center;
          gap: 11px;
          border: 1px solid #D8E8E2;
          border-radius: 16px;
          background: #EAF4F0;
          padding: 12px;
          margin-bottom: 15px;
          text-align: left;
          color: #47776B;
        }

        .elo-post-partnership-icon {
          width: 40px;
          height: 40px;
          flex: 0 0 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 12px;
          color: white;
          background: #005744;
        }

        .elo-post-partnership-copy {
          flex: 1;
          min-width: 0;
        }

        .elo-post-partnership-copy > span {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .elo-post-partnership-copy strong {
          color: #173C33;
          font-size: 12.5px;
          font-weight: 900;
        }

        .elo-post-partnership-copy b {
          padding: 3px 6px;
          border-radius: 7px;
          background: #FFFFFF;
          color: #005744;
          font-size: 8px;
          font-weight: 900;
        }

        .elo-post-partnership-copy small {
          display: block;
          color: #58726A;
          font-size: 9px;
          line-height: 13px;
          font-weight: 700;
          margin-top: 3px;
        }

        .elo-post-type-list {
          overflow: hidden;
          background: #FFFFFF;
          border: 1px solid #E1E6E3;
          border-radius: 19px;
        }

        .elo-post-type-row {
          width: 100%;
          min-height: 76px;
          display: flex;
          align-items: center;
          gap: 12px;
          border: 0;
          background: #FFFFFF;
          padding: 11px 14px;
          color: #A2AAA6;
          text-align: left;
        }

        .elo-post-type-row:hover {
          background: #FAFBFA;
        }

        .elo-post-type-row.has-border {
          border-bottom: 1px solid #EEF1EF;
        }

        .elo-post-type-icon {
          width: 40px;
          height: 40px;
          flex: 0 0 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 12px;
          background: #E7F1ED;
          color: #005744;
        }

        .elo-post-type-icon.is-locked {
          background: #F0F1F0;
          color: #8F9894;
        }

        .elo-post-type-copy {
          flex: 1;
          min-width: 0;
        }

        .elo-post-type-title {
          display: flex;
          align-items: center;
          gap: 7px;
        }

        .elo-post-type-title strong {
          color: #1C2722;
          font-size: 14px;
          font-weight: 900;
        }

        .elo-post-type-title strong.is-locked {
          color: #7F8884;
        }

        .elo-post-type-title b {
          padding: 3px 6px;
          border-radius: 5px;
          background: #F0F2F1;
          color: #929A96;
          font-size: 6px;
          font-weight: 900;
          letter-spacing: .6px;
        }

        .elo-post-type-title b.is-active {
          color: #005744;
          background: #E5F0EC;
        }

        .elo-post-type-copy small {
          display: block;
          color: #7C8581;
          font-size: 10.5px;
          line-height: 15px;
          font-weight: 600;
          margin-top: 3px;
          padding-right: 4px;
        }

        .elo-post-composer-top {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 22px 0 18px;
        }

        .elo-post-back {
          width: 42px;
          height: 42px;
          flex: 0 0 42px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid #E0E5E2;
          border-radius: 13px;
          background: #FFFFFF;
          color: #173C33;
          margin-top: 1px;
        }

        .elo-post-composer-top > div {
          flex: 1;
        }

        .elo-post-composer-type {
          display: block;
          color: #008564;
          font-size: 8px;
          font-weight: 900;
          letter-spacing: 1.1px;
        }

        .elo-post-composer-top h1 {
          font-size: 27px;
          line-height: 31px;
          letter-spacing: -.7px;
        }

        .elo-post-composer-top p {
          max-width: 420px;
          margin: 4px 0 0;
          color: #75807B;
          font-size: 11.5px;
          line-height: 17px;
          font-weight: 600;
        }

        .elo-post-editor-card,
        .elo-post-section-card {
          background: #FFFFFF;
          border: 1px solid #E0E5E2;
          border-radius: 20px;
          padding: 16px;
        }

        .elo-post-update-card {
          min-height: 420px;
        }

        .elo-post-headline {
          width: 100%;
          border: 0;
          outline: 0;
          background: transparent;
          color: #17231F;
          font-size: 23px;
          line-height: 29px;
          font-weight: 900;
          letter-spacing: -.45px;
          padding: 2px 0;
        }

        .elo-post-headline::placeholder,
        .elo-post-body-editor::placeholder,
        .elo-post-popup-description::placeholder,
        .elo-post-location-row input::placeholder,
        .elo-post-url::placeholder {
          color: #9BA49F;
        }

        .elo-post-divider {
          height: 1px;
          background: #EEF1EF;
          margin: 13px 0;
        }

        .elo-post-divider.is-wide {
          margin: 16px 0;
        }

        .elo-post-body-editor {
          width: 100%;
          min-height: 105px;
          resize: vertical;
          border: 0;
          outline: 0;
          background: transparent;
          color: #45524D;
          font-size: 13px;
          line-height: 20px;
          font-weight: 500;
          padding: 0;
        }

        .elo-post-body-editor.is-long {
          min-height: 270px;
          font-size: 14px;
          line-height: 22px;
        }

        .elo-post-media {
          margin-top: 17px;
        }

        .elo-post-inline-heading {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 8px;
        }

        .elo-post-inline-heading strong {
          color: #4C5954;
          font-size: 10px;
          font-weight: 900;
        }

        .elo-post-inline-heading span {
          color: #A0A8A4;
          font-size: 7px;
          font-weight: 900;
          letter-spacing: .6px;
        }

        .elo-post-photo-button,
        .elo-post-add-photo {
          min-height: 52px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          border: 1px dashed #B8CAC3;
          border-radius: 13px;
          background: #F5F9F7;
          color: #005744;
          font-size: 10.5px;
          font-weight: 900;
          cursor: pointer;
        }

        .elo-post-photo-row {
          display: flex;
          gap: 9px;
          overflow-x: auto;
        }

        .elo-post-photo-wrap,
        .elo-post-add-photo {
          position: relative;
          width: 92px;
          height: 92px;
          flex: 0 0 92px;
          overflow: hidden;
          border-radius: 13px;
        }

        .elo-post-photo {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .elo-post-remove-photo {
          position: absolute;
          top: 6px;
          right: 6px;
          width: 26px;
          height: 26px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 0;
          border-radius: 50%;
          background: rgba(15,24,20,.78);
          color: #FFFFFF;
        }

        .elo-post-section {
          margin-top: 18px;
        }

        .elo-post-section-line {
          min-height: 45px;
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 12px;
          padding: 0 2px 9px;
        }

        .elo-post-section-line span {
          display: block;
          color: #008564;
          font-size: 8px;
          font-weight: 900;
          letter-spacing: 1px;
        }

        .elo-post-section-line h2 {
          margin: 3px 0 0;
          color: #173C33;
          font-size: 18px;
          font-weight: 900;
        }

        .elo-post-section-line > strong {
          color: #008564;
          font-size: 9px;
          font-weight: 900;
          margin-bottom: 2px;
        }

        .elo-post-calendar {
          width: 100%;
        }

        .elo-post-calendar-header {
          min-height: 46px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 6px;
        }

        .elo-post-calendar-header strong {
          color: #173C33;
          font-size: 14px;
          font-weight: 900;
        }

        .elo-post-calendar-arrow {
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 0;
          border-radius: 11px;
          background: #F3F5F4;
          color: #173C33;
        }

        .elo-post-weekdays,
        .elo-post-days {
          display: grid;
          grid-template-columns: repeat(7, minmax(0, 1fr));
        }

        .elo-post-weekdays {
          margin-bottom: 4px;
        }

        .elo-post-weekdays span {
          text-align: center;
          color: #98A19D;
          font-size: 8px;
          font-weight: 900;
        }

        .elo-post-day {
          aspect-ratio: 1 / 1;
          width: min(42px, 100%);
          justify-self: center;
          border: 0;
          border-radius: 50%;
          background: transparent;
          color: #394640;
          font-size: 11px;
          font-weight: 800;
        }

        .elo-post-day.is-outside {
          color: #B4BBB7;
        }

        .elo-post-day.is-selected {
          background: #005744;
          color: #FFFFFF;
        }

        .elo-post-calendar-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-top: 8px;
          padding-top: 11px;
          border-top: 1px solid #EFF1F0;
          color: #707B76;
          font-size: 9.5px;
          font-weight: 700;
        }

        .elo-post-calendar-footer span:last-child {
          color: #9AA29E;
          font-size: 8px;
        }

        .elo-post-selected-summary {
          display: flex;
          align-items: center;
          gap: 7px;
          margin-top: 10px;
          padding: 9px 10px;
          border-radius: 11px;
          background: #EEF6F3;
          color: #446159;
          font-size: 9.5px;
          font-weight: 700;
        }

        .elo-post-selected-summary > span {
          flex: 1;
        }

        .elo-post-selected-summary button {
          border: 0;
          background: transparent;
          color: #005744;
          font-size: 9px;
          font-weight: 900;
        }

        .elo-post-deal-switch {
          display: flex;
          gap: 4px;
          padding: 4px;
          border-radius: 12px;
          background: #F0F3F1;
          margin-top: 8px;
        }

        .elo-post-deal-switch button {
          flex: 1;
          min-height: 37px;
          border: 0;
          border-radius: 9px;
          background: transparent;
          color: #79837F;
          font-size: 9.5px;
          font-weight: 800;
        }

        .elo-post-deal-switch button.is-active {
          background: #FFFFFF;
          color: #005744;
          font-weight: 900;
        }

        .elo-post-value-row {
          min-height: 72px;
          display: flex;
          align-items: center;
          margin-top: 12px;
          padding: 0 16px;
          border-radius: 14px;
          background: #F7F9F8;
        }

        .elo-post-value-row input {
          width: 100%;
          min-width: 0;
          height: 54px;
          border: 0;
          outline: 0;
          background: transparent;
          color: #173C33;
          font-size: 29px;
          font-weight: 900;
        }

        .elo-post-value-row b {
          color: #173C33;
          font-size: 27px;
          font-weight: 900;
          margin-right: 7px;
          white-space: nowrap;
        }

        .elo-post-value-row input + b {
          color: #60716B;
          font-size: 11px;
          margin-right: 0;
        }

        .elo-post-example {
          display: block;
          color: #929C97;
          font-size: 9px;
          font-weight: 700;
          margin: 6px 0 0 4px;
        }

        .elo-post-multibuy {
          display: flex;
          align-items: center;
          gap: 9px;
          margin-top: 12px;
        }

        .elo-post-multibuy label {
          flex: 1;
          min-height: 88px;
          padding: 12px;
          border-radius: 14px;
          background: #F7F9F8;
        }

        .elo-post-multibuy label span {
          display: block;
          color: #929C97;
          font-size: 7px;
          font-weight: 900;
          letter-spacing: .7px;
        }

        .elo-post-multibuy input {
          width: 100%;
          border: 0;
          outline: 0;
          background: transparent;
          color: #173C33;
          font-size: 27px;
          font-weight: 900;
          padding: 3px 0 0;
        }

        .elo-post-multibuy > b {
          color: #8A9590;
          font-size: 8px;
          font-weight: 900;
        }

        .elo-post-alert-composer {
          min-height: 72px;
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 0 13px;
          border: 1px solid #F1C9C5;
          border-radius: 17px;
          background: #FFF7F6;
        }

        .elo-post-alert-composer > span {
          width: 38px;
          height: 38px;
          flex: 0 0 38px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 12px;
          background: #FCE6E3;
          color: #B42318;
        }

        .elo-post-alert-composer input {
          flex: 1;
          min-width: 0;
          height: 44px;
          border: 0;
          outline: 0;
          background: transparent;
          color: #6E2420;
          font-size: 13.5px;
          font-weight: 800;
        }

        .elo-post-alert-counter {
          color: #9A817E;
          font-size: 8.5px;
          font-weight: 700;
          text-align: right;
          margin: 7px 3px 0 0;
        }

        .elo-post-quiet-note {
          margin: 10px 14px 0;
          color: #8C9691;
          font-size: 9px;
          line-height: 14px;
          text-align: center;
          font-weight: 600;
        }

        .elo-post-location-row {
          display: flex;
          align-items: center;
          gap: 9px;
          color: #005744;
        }

        .elo-post-location-row input {
          flex: 1;
          height: 44px;
          border: 0;
          outline: 0;
          background: transparent;
          color: #263630;
          font-size: 13px;
          font-weight: 700;
        }

        .elo-post-popup-description {
          width: 100%;
          min-height: 86px;
          resize: vertical;
          border: 0;
          outline: 0;
          background: transparent;
          color: #5C6964;
          font-size: 12px;
          line-height: 18px;
          font-weight: 500;
          padding: 0;
          margin-top: 15px;
        }

        .elo-post-time-range {
          display: flex;
          align-items: center;
          gap: 9px;
          margin-top: 8px;
        }

        .elo-post-time-range > label {
          flex: 1;
          min-width: 0;
          min-height: 74px;
          padding: 10px 13px;
          border-radius: 14px;
          background: #F6F8F7;
        }

        .elo-post-time-range > label > span {
          display: block;
          color: #8F9994;
          font-size: 7px;
          font-weight: 900;
          letter-spacing: .7px;
        }

        .elo-post-time-range > label > div {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #7B8983;
          margin-top: 5px;
        }

        .elo-post-time-range select {
          flex: 1;
          min-width: 0;
          border: 0;
          outline: 0;
          background: transparent;
          color: #173C33;
          font-size: 18px;
          font-weight: 900;
        }

        .elo-post-time-range > span {
          color: #80908A;
        }

        .elo-post-time-hint {
          margin: 8px 0 0;
          color: #8D9792;
          font-size: 8.5px;
          line-height: 13px;
          font-weight: 600;
          text-align: center;
        }

        .elo-post-advert-card {
          padding-top: 15px;
        }

        .elo-post-banner-heading {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
        }

        .elo-post-banner-heading > div span {
          display: block;
          color: #008564;
          font-size: 7px;
          font-weight: 900;
          letter-spacing: 1px;
        }

        .elo-post-banner-heading > div strong {
          display: block;
          color: #1A2721;
          font-size: 16px;
          font-weight: 900;
          margin-top: 3px;
        }

        .elo-post-banner-heading > b {
          padding: 5px 8px;
          border-radius: 8px;
          background: #E7F1ED;
          color: #005744;
          font-size: 9px;
          font-weight: 900;
        }

        .elo-post-banner-guide {
          max-width: 520px;
          margin: 7px 0 13px;
          color: #78837E;
          font-size: 10.5px;
          line-height: 16px;
          font-weight: 600;
        }

        .elo-post-banner-preview,
        .elo-post-banner-empty {
          width: 100%;
          aspect-ratio: 3.25 / 1;
          overflow: hidden;
          border-radius: 13px;
        }

        .elo-post-banner-preview {
          position: relative;
          background: #E8ECEA;
        }

        .elo-post-banner-preview img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .elo-post-banner-preview button {
          position: absolute;
          top: 7px;
          right: 7px;
          width: 27px;
          height: 27px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 0;
          border-radius: 50%;
          background: rgba(15,24,20,.78);
          color: #FFFFFF;
        }

        .elo-post-banner-preview > span {
          position: absolute;
          left: 7px;
          bottom: 7px;
          padding: 4px 7px;
          border-radius: 6px;
          background: rgba(255,255,255,.92);
          color: #005744;
          font-size: 6px;
          font-weight: 900;
          letter-spacing: .65px;
        }

        .elo-post-banner-quality {
          display: flex;
          align-items: flex-start;
          gap: 8px;
          margin-top: 10px;
          padding: 9px 11px;
          border: 1px solid;
          border-radius: 12px;
        }

        .elo-post-banner-quality.is-good {
          background: #ECF6F2;
          border-color: #CEE5DC;
          color: #00664F;
        }

        .elo-post-banner-quality.is-warning {
          background: #FFF6E8;
          border-color: #F1D9AE;
          color: #8A5000;
        }

        .elo-post-banner-quality strong {
          display: block;
          font-size: 9.5px;
          font-weight: 900;
        }

        .elo-post-banner-quality p {
          margin: 2px 0 0;
          color: #69746F;
          font-size: 8.5px;
          line-height: 13px;
          font-weight: 600;
        }

        .elo-post-replace-banner {
          min-height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          color: #005744;
          font-size: 9.5px;
          font-weight: 900;
          cursor: pointer;
          margin-top: 8px;
        }

        .elo-post-banner-empty {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 0 14px;
          border: 1px dashed #B7C9C2;
          background: #F5F9F7;
          color: #89938F;
          cursor: pointer;
        }

        .elo-post-banner-empty-icon {
          width: 38px;
          height: 38px;
          flex: 0 0 38px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 12px;
          background: #E4F0EB;
          color: #005744;
        }

        .elo-post-banner-empty > span:nth-child(2) {
          flex: 1;
          min-width: 0;
        }

        .elo-post-banner-empty strong {
          display: block;
          color: #264138;
          font-size: 10.5px;
          font-weight: 900;
        }

        .elo-post-banner-empty small {
          display: block;
          color: #83908A;
          font-size: 8.5px;
          font-weight: 600;
          margin-top: 2px;
        }

        .elo-post-destination-heading {
          display: flex;
          align-items: center;
          gap: 7px;
          color: #005744;
          margin-bottom: 8px;
        }

        .elo-post-destination-heading strong {
          color: #34443E;
          font-size: 10.5px;
          font-weight: 900;
        }

        .elo-post-url {
          width: 100%;
          height: 48px;
          border: 0;
          outline: 0;
          border-radius: 12px;
          background: #F5F7F6;
          color: #20312A;
          font-size: 12px;
          font-weight: 700;
          padding: 0 12px;
        }

        .elo-post-publish {
          width: 100%;
          height: 53px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          border: 0;
          border-radius: 15px;
          background: #005744;
          color: #FFFFFF;
          font-size: 13px;
          font-weight: 900;
          margin-top: 20px;
        }

        .elo-post-loading {
          min-height: 55vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 9px;
          color: #005744;
          font-size: 12px;
          font-weight: 700;
        }

        .elo-post-spin {
          animation: elo-post-spin .8s linear infinite;
        }

        @keyframes elo-post-spin {
          to { transform: rotate(360deg); }
        }

        .elo-post-no-page {
          margin-top: 26px;
          padding: 28px;
          display: flex;
          flex-direction: column;
          align-items: center;
          border: 1px solid #E0E5E2;
          border-radius: 20px;
          background: #FFFFFF;
          text-align: center;
        }

        .elo-post-no-page > span {
          width: 58px;
          height: 58px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 18px;
          background: #E7F1ED;
          color: #005744;
        }

        .elo-post-no-page h1 {
          margin: 13px 0 0;
          color: #1A2721;
          font-size: 17px;
          font-weight: 900;
        }

        .elo-post-no-page p {
          max-width: 270px;
          margin: 5px 0 0;
          color: #7A8580;
          font-size: 11.5px;
          line-height: 17px;
          font-weight: 600;
        }

        .elo-post-message {
          position: relative;
          display: flex;
          align-items: center;
          gap: 10px;
          margin-top: 14px;
          padding: 12px 13px;
          border-radius: 13px;
          background: #E8F4F0;
          color: #005744;
          font-size: 12px;
          font-weight: 700;
        }

        .elo-post-message.is-error {
          background: #FFE9E7;
          color: #B42318;
        }

        .elo-post-message span {
          flex: 1;
        }

        .elo-post-message button {
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 0;
          border-radius: 8px;
          background: transparent;
          color: inherit;
        }

        @media (max-width: 460px) {
          .elo-post-main {
            padding-left: 12px;
            padding-right: 12px;
          }

          .elo-post-calendar-footer {
            align-items: flex-start;
            flex-direction: column;
            gap: 4px;
          }

          .elo-post-time-range {
            gap: 6px;
          }

          .elo-post-time-range > label {
            padding-left: 10px;
            padding-right: 10px;
          }

          .elo-post-time-range select {
            font-size: 15px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .elo-post-spin {
            animation: none;
          }
        }
      `}</style>
    </div>
  );
}

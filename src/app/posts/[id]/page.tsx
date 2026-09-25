"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  Bookmark,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Flag,
  Globe2,
  LoaderCircle,
  MoreHorizontal,
  Pencil,
  Share2,
  Store,
  Trash2,
  X,
} from "lucide-react";
import { FaFacebook, FaInstagram } from "react-icons/fa";
import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import SiteHeader from "@/components/SiteHeader";
import {
  WebFeedPostCard,
  WebFeedStyles,
  type FeedPost,
} from "@/components/WebFeedItems";
import { createClient } from "@/lib/supabase/client";

const WEBSITE_URL = "https://eastlothian.online";

type PostMetadata = {
  active_dates?: string[];
  public_type?: string;
  deal_kind?: string | null;
  deal_price?: number | string | null;
  discount_percent?: number | null;
  buy_quantity?: number | null;
  pay_quantity?: number | null;
  image_urls?: string[];
  popup_address?: string | null;
  popup_start_time?: string | null;
  popup_end_time?: string | null;
  advert_url?: string | null;
  advert_cta?: string | null;
  [key: string]: unknown;
};

type ExtraGroupInfo = {
  id: string;
  user_id: string | null;
  name: string | null;
  slug: string | null;
  brand_color: string | null;
  is_local_partner: boolean | null;
  website: string | null;
  layout:
    | {
        socials?: {
          facebook?: string | null;
          instagram?: string | null;
        } | null;
        facebook?: string | null;
        instagram?: string | null;
      }
    | null;
};

type Post = {
  id: string;
  group_id: string | null;
  title: string;
  content: string | null;
  image_url: string | null;
  created_at: string;
  type: string;
  expires_at: string | null;
  event_start: string | null;
  event_end: string | null;
  deal_price: string | number | null;
  metadata: PostMetadata | null;
  group: ExtraGroupInfo | null;
};

function formatEventDate(value: string | null) {
  if (!value) return null;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(date);
}

function getDealValue(post: Post) {
  const metadataValue = post.metadata?.deal_price;

  if (metadataValue !== null && metadataValue !== undefined) {
    const number = Number(metadataValue);

    if (Number.isFinite(number)) {
      return Number.isInteger(number)
        ? `£${number}`
        : `£${number.toFixed(2)}`;
    }

    const text = String(metadataValue).trim();
    if (text) return text;
  }

  const direct = post.deal_price;

  if (direct !== null && direct !== undefined) {
    const text = String(direct).trim();

    if (/^\d+([.,]\d+)?$/.test(text)) {
      return `£${text}`;
    }

    if (text) return text;
  }

  if (
    post.metadata?.deal_kind === "percent" &&
    typeof post.metadata.discount_percent === "number"
  ) {
    return `${post.metadata.discount_percent}% OFF`;
  }

  if (
    (post.metadata?.deal_kind === "multibuy" ||
      post.metadata?.deal_kind === "buy_x_get_y") &&
    typeof post.metadata.buy_quantity === "number" &&
    typeof post.metadata.pay_quantity === "number"
  ) {
    return `${post.metadata.buy_quantity} FOR ${post.metadata.pay_quantity}`;
  }

  return null;
}

function getAccessibleLinkColour(hex: string) {
  const clean = hex.replace("#", "").trim();

  if (!/^[0-9A-Fa-f]{6}$/.test(clean)) {
    return "#005744";
  }

  const red = Number.parseInt(clean.slice(0, 2), 16);
  const green = Number.parseInt(clean.slice(2, 4), 16);
  const blue = Number.parseInt(clean.slice(4, 6), 16);

  const luminance = (0.299 * red + 0.587 * green + 0.114 * blue) / 255;

  if (luminance < 0.62) {
    return `#${clean}`;
  }

  const darken = (value: number) =>
    Math.max(0, Math.round(value * 0.52))
      .toString(16)
      .padStart(2, "0");

  return `#${darken(red)}${darken(green)}${darken(blue)}`;
}

function getReadableTextColour(hex: string) {
  const clean = hex.replace("#", "").trim();

  if (!/^[0-9A-Fa-f]{6}$/.test(clean)) {
    return "#FFFFFF";
  }

  const red = Number.parseInt(clean.slice(0, 2), 16);
  const green = Number.parseInt(clean.slice(2, 4), 16);
  const blue = Number.parseInt(clean.slice(4, 6), 16);

  const toLinear = (value: number) => {
    const channel = value / 255;

    return channel <= 0.03928
      ? channel / 12.92
      : Math.pow((channel + 0.055) / 1.055, 2.4);
  };

  const luminance =
    0.2126 * toLinear(red) +
    0.7152 * toLinear(green) +
    0.0722 * toLinear(blue);

  const whiteContrast = 1.05 / (luminance + 0.05);
  const darkContrast = (luminance + 0.05) / 0.05;

  return whiteContrast >= darkContrast ? "#FFFFFF" : "#111614";
}

function withAlpha(hex: string, alpha: number) {
  const clean = hex.replace("#", "");

  if (!/^[0-9A-Fa-f]{6}$/.test(clean)) {
    return `rgba(255,255,255,${alpha})`;
  }

  const red = Number.parseInt(clean.slice(0, 2), 16);
  const green = Number.parseInt(clean.slice(2, 4), 16);
  const blue = Number.parseInt(clean.slice(4, 6), 16);

  return `rgba(${red},${green},${blue},${alpha})`;
}

function normaliseWebsite(value: string | null | undefined) {
  const clean = value?.trim();

  if (!clean) return null;

  return /^https?:\/\//i.test(clean) ? clean : `https://${clean}`;
}

function normaliseSocial(
  value: string | null | undefined,
  network: "facebook" | "instagram"
) {
  const clean = value?.trim();

  if (!clean) return null;

  if (/^https?:\/\//i.test(clean)) {
    return clean;
  }

  let handle = clean.replace(/^@/, "").replace(/^www\./i, "");

  if (network === "facebook") {
    handle = handle.replace(/^facebook\.com\//i, "");
    return `https://www.facebook.com/${handle}`;
  }

  handle = handle.replace(/^instagram\.com\//i, "");
  return `https://www.instagram.com/${handle}`;
}

type TextLinkPart = {
  text: string;
  url?: string;
};

function splitTextLinks(text: string): TextLinkPart[] {
  const pattern =
    /(^|[\s(<\[{])((?:https?:\/\/|www\.)[^\s<>"'“”‘’]+|(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,63}(?::\d{1,5})?(?:[/?#][^\s<>"'“”‘’]*)?)/gi;

  const parts: TextLinkPart[] = [];
  let cursor = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    const start = match.index + match[1].length;
    let label = match[2];

    while (label.length > 0) {
      if (/[.,!?;:]$/.test(label)) {
        label = label.slice(0, -1);
        continue;
      }

      const closing = label.slice(-1);
      const opening =
        closing === ")"
          ? "("
          : closing === "]"
            ? "["
            : closing === "}"
              ? "{"
              : "";

      if (
        opening &&
        label.split(closing).length > label.split(opening).length
      ) {
        label = label.slice(0, -1);
        continue;
      }

      break;
    }

    const url = /^https?:\/\//i.test(label)
      ? label
      : `https://${label}`;

    try {
      const parsed = new URL(url);

      if (
        !parsed.hostname ||
        parsed.username ||
        parsed.password ||
        (parsed.protocol !== "http:" && parsed.protocol !== "https:")
      ) {
        continue;
      }
    } catch {
      continue;
    }

    if (start > cursor) {
      parts.push({
        text: text.slice(cursor, start),
      });
    }

    parts.push({
      text: label,
      url,
    });

    cursor = start + label.length;
  }

  if (cursor < text.length) {
    parts.push({
      text: text.slice(cursor),
    });
  }

  return parts;
}

function LinkedText({
  text,
  colour,
  className,
}: {
  text: string;
  colour: string;
  className: string;
}) {
  return (
    <div className={className}>
      {splitTextLinks(text).map((part, index) =>
        part.url ? (
          <a
            key={`${part.url}-${index}`}
            href={part.url}
            target="_blank"
            rel="noreferrer"
            style={{
              color: colour,
              textDecoration: "underline",
            }}
          >
            {part.text}
          </a>
        ) : (
          <Fragment key={`text-${index}`}>{part.text}</Fragment>
        )
      )}
    </div>
  );
}

function getUpdateImageUrls(post: Post | null) {
  if (!post || post.type !== "update") {
    return [];
  }

  const urls = post.metadata?.image_urls;

  if (!Array.isArray(urls)) {
    return [];
  }

  return urls
    .filter(
      (value): value is string =>
        typeof value === "string" && value.trim().length > 0
    )
    .map((value) => value.trim())
    .slice(0, 3);
}

function shuffle<T>(values: T[]) {
  const result = [...values];

  for (let index = result.length - 1; index > 0; index -= 1) {
    const random = Math.floor(Math.random() * (index + 1));

    [result[index], result[random]] = [
      result[random],
      result[index],
    ];
  }

  return result;
}

function BrandShard({
  accent,
  name,
  partner,
}: {
  accent: string;
  name: string;
  partner: boolean;
}) {
  const textColour = getReadableTextColour(accent);
  const mutedTextColour = withAlpha(textColour, 0.72);

  return (
    <section
      className="elo-post-view-brand"
      style={{
        backgroundColor: accent,
      }}
    >
      <svg
        className="elo-post-view-brand-shards"
        viewBox="0 0 400 92"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <polygon
          points="0,0 108,0 69,44 0,61"
          fill="#FFFFFF"
          fillOpacity="0.08"
        />
        <polygon
          points="108,0 214,0 165,40 69,44"
          fill="#000000"
          fillOpacity="0.06"
        />
        <polygon
          points="214,0 318,0 275,53 165,40"
          fill="#FFFFFF"
          fillOpacity="0.11"
        />
        <polygon
          points="318,0 400,0 400,42 275,53"
          fill="#000000"
          fillOpacity="0.07"
        />
        <polygon
          points="0,61 69,44 118,92 0,92"
          fill="#000000"
          fillOpacity="0.05"
        />
        <polygon
          points="69,44 165,40 206,92 118,92"
          fill="#FFFFFF"
          fillOpacity="0.07"
        />
        <polygon
          points="165,40 275,53 312,92 206,92"
          fill="#000000"
          fillOpacity="0.08"
        />
        <polygon
          points="275,53 400,42 400,92 312,92"
          fill="#FFFFFF"
          fillOpacity="0.07"
        />
      </svg>

      <div className="elo-post-view-brand-content">
        {partner && (
          <span
            className="elo-post-view-partner-label"
            style={{
              color: mutedTextColour,
            }}
          >
            LOCAL PARTNER
          </span>
        )}

        <div className="elo-post-view-brand-name-row">
          <h1
            style={{
              color: textColour,
            }}
          >
            {name}
          </h1>

          {partner && (
            <CheckCircle2
              size={18}
              style={{
                color: textColour,
              }}
            />
          )}
        </div>
      </div>
    </section>
  );
}

function ModalShell({
  children,
  onClose,
}: {
  children: ReactNode;
  onClose: () => void;
}) {
  return (
    <div
      className="elo-post-view-modal-root"
      role="presentation"
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) {
          onClose();
        }
      }}
    >
      <div className="elo-post-view-modal-sheet">
        <div className="elo-post-view-sheet-handle" />
        {children}
      </div>
    </div>
  );
}

export default function PostViewPage() {
  const params = useParams<{ id?: string | string[] }>();
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const rawId = params?.id;
  const postId = Array.isArray(rawId) ? rawId[0] : rawId;

  const [post, setPost] = useState<Post | null>(null);
  const [recommendations, setRecommendations] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  const [currentUserId, setCurrentUserId] = useState<string | null>(
    null
  );
  const [isSaved, setIsSaved] = useState(false);
  const [savingBookmark, setSavingBookmark] = useState(false);

  const [actionMenuOpen, setActionMenuOpen] = useState(false);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [deleting, setDeleting] = useState(false);

  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reporting, setReporting] = useState(false);

  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  const [notice, setNotice] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(
    null
  );

  const fetchGroups = useCallback(
    async (ids: string[]) => {
      if (ids.length === 0) {
        return new Map<string, ExtraGroupInfo>();
      }

      const { data, error } = await supabase
        .from("groups")
        .select(`
          id,
          user_id,
          name,
          slug,
          brand_color,
          is_local_partner,
          website,
          layout
        `)
        .in("id", ids);

      if (error) {
        console.error("Group load error:", error);
        return new Map<string, ExtraGroupInfo>();
      }

      return new Map(
        (data ?? []).map((group) => [
          group.id,
          group as ExtraGroupInfo,
        ])
      );
    },
    [supabase]
  );

  const loadRecommendations = useCallback(
    async (currentPostId: string) => {
      const now = new Date().toISOString();

      const [eventResult, dealResult] = await Promise.all([
        supabase
          .from("posts")
          .select(`
            id,
            group_id,
            title,
            content,
            image_url,
            created_at,
            type,
            expires_at,
            event_start,
            event_end,
            deal_price,
            metadata
          `)
          .eq("type", "event")
          .gte("event_start", now)
          .neq("id", currentPostId)
          .order("event_start", {
            ascending: true,
          })
          .limit(15),

        supabase
          .from("posts")
          .select(`
            id,
            group_id,
            title,
            content,
            image_url,
            created_at,
            type,
            expires_at,
            event_start,
            event_end,
            deal_price,
            metadata
          `)
          .eq("type", "deal")
          .neq("id", currentPostId)
          .order("created_at", {
            ascending: false,
          })
          .limit(15),
      ]);

      if (eventResult.error) {
        console.error(
          "Recommendation events:",
          eventResult.error
        );
      }

      if (dealResult.error) {
        console.error(
          "Recommendation deals:",
          dealResult.error
        );
      }

      const validDeals = (dealResult.data ?? []).filter(
        (deal) =>
          !deal.expires_at ||
          new Date(deal.expires_at).getTime() > Date.now()
      );

      const candidates = shuffle([
        ...(eventResult.data ?? []),
        ...validDeals,
      ]).slice(0, 3);

      const groupIds = Array.from(
        new Set(
          candidates
            .map((item) => item.group_id)
            .filter((id): id is string => Boolean(id))
        )
      );

      const groups = await fetchGroups(groupIds);

      setRecommendations(
        candidates.map(
          (item): Post => ({
            ...(item as Omit<Post, "group">),
            group: item.group_id
              ? groups.get(item.group_id) ?? null
              : null,
          })
        )
      );
    },
    [fetchGroups, supabase]
  );

  const loadScreen = useCallback(async () => {
    if (!postId) {
      setPost(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      const { data: postRow, error } = await supabase
        .from("posts")
        .select(`
          id,
          group_id,
          title,
          content,
          image_url,
          created_at,
          type,
          expires_at,
          event_start,
          event_end,
          deal_price,
          metadata
        `)
        .eq("id", postId)
        .maybeSingle();

      if (error || !postRow) {
        if (error) {
          console.error("Post view error:", error);
        }

        setPost(null);
        return;
      }

      const groups = await fetchGroups(
        postRow.group_id ? [postRow.group_id] : []
      );

      setPost({
        ...(postRow as Omit<Post, "group">),
        group: postRow.group_id
          ? groups.get(postRow.group_id) ?? null
          : null,
      });

      await loadRecommendations(postRow.id);
    } catch (caught) {
      console.error("Post view load error:", caught);

      setErrorMessage(
        caught instanceof Error
          ? caught.message
          : "This post could not be loaded."
      );
    } finally {
      setLoading(false);
    }
  }, [fetchGroups, loadRecommendations, postId, supabase]);

  useEffect(() => {
    void loadScreen();
  }, [loadScreen]);

  useEffect(() => {
    let active = true;

    void supabase.auth.getSession().then(({ data }) => {
      if (active) {
        setCurrentUserId(data.session?.user.id ?? null);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active) {
        setCurrentUserId(session?.user.id ?? null);
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  useEffect(() => {
    let active = true;

    async function loadSavedState() {
      if (!currentUserId || !postId) {
        if (active) {
          setIsSaved(false);
        }

        return;
      }

      const { data, error } = await supabase
        .from("saved")
        .select("id")
        .eq("user_id", currentUserId)
        .eq("post_id", postId)
        .limit(1)
        .maybeSingle();

      if (!active) {
        return;
      }

      if (error) {
        console.error("Saved state error:", error);
        setIsSaved(false);
        return;
      }

      setIsSaved(Boolean(data));
    }

    void loadSavedState();

    return () => {
      active = false;
    };
  }, [currentUserId, postId, supabase]);

  async function sharePost() {
    if (!post) return;

    const organisation = post.group?.name?.trim();

    const shareUrl =
      typeof window !== "undefined"
        ? window.location.href
        : `${WEBSITE_URL}/posts/${encodeURIComponent(post.id)}`;

    const message = [
      post.title.trim(),
      organisation ? `From ${organisation}` : null,
      "Shared from East Lothian Online",
      shareUrl,
    ]
      .filter(Boolean)
      .join("\n");

    try {
      if (navigator.share) {
        await navigator.share({
          title: post.title,
          text: message,
          url: shareUrl,
        });
      } else {
        await navigator.clipboard.writeText(shareUrl);
        setNotice("Post link copied.");
      }
    } catch (caught) {
      if (
        caught instanceof DOMException &&
        caught.name === "AbortError"
      ) {
        return;
      }

      console.error("Share post error:", caught);
      setErrorMessage("Unable to share this post.");
    }
  }

  async function savePost() {
    if (!post || savingBookmark) return;

    setSavingBookmark(true);
    setErrorMessage(null);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const user = session?.user;

      if (!user) {
        router.push(
          `/log-in?next=${encodeURIComponent(
            `/posts/${post.id}`
          )}`
        );
        return;
      }

      const { data: existing, error: existingError } =
        await supabase
          .from("saved")
          .select("id")
          .eq("user_id", user.id)
          .eq("post_id", post.id)
          .limit(1)
          .maybeSingle();

      if (existingError) throw existingError;

      if (existing) {
        const { error: deleteError } = await supabase
          .from("saved")
          .delete()
          .eq("id", existing.id);

        if (deleteError) throw deleteError;

        setIsSaved(false);
        setNotice("Removed from Saved.");
        return;
      }

      const { error } = await supabase.from("saved").insert({
        user_id: user.id,
        post_id: post.id,
      });

      if (error) throw error;

      setIsSaved(true);
      setNotice("Saved.");
    } catch (caught) {
      console.error("Save post error:", caught);

      setErrorMessage(
        caught instanceof Error
          ? caught.message
          : "Unable to update Saved."
      );
    } finally {
      setSavingBookmark(false);
    }
  }

  function openEditPost() {
    if (!post) return;

    setActionMenuOpen(false);
    setEditTitle(post.title ?? "");
    setEditContent(post.content ?? "");
    setEditModalOpen(true);
  }

  async function saveEdit() {
    if (!post || savingEdit) return;

    const cleanTitle = editTitle.trim();

    if (!cleanTitle) {
      setErrorMessage("The post needs a title.");
      return;
    }

    setSavingEdit(true);
    setErrorMessage(null);

    try {
      const { error } = await supabase.rpc(
        "elo_update_own_post_text",
        {
          p_post_id: post.id,
          p_title: cleanTitle,
          p_content: editContent.trim() || null,
        }
      );

      if (error) throw error;

      setPost((current) =>
        current
          ? {
              ...current,
              title: cleanTitle,
              content: editContent.trim() || null,
            }
          : current
      );

      setEditModalOpen(false);
      setNotice("Post updated.");
    } catch (caught) {
      console.error("Edit post error:", caught);

      setErrorMessage(
        caught instanceof Error
          ? caught.message
          : "Unable to edit post."
      );
    } finally {
      setSavingEdit(false);
    }
  }

  function openDeletePost() {
    setActionMenuOpen(false);
    setDeleteConfirmation("");
    setDeleteModalOpen(true);
  }

  async function deletePost() {
    if (
      !post ||
      deleting ||
      deleteConfirmation !== "DELETE"
    ) {
      return;
    }

    setDeleting(true);
    setErrorMessage(null);

    try {
      const { error } = await supabase.rpc(
        "elo_delete_own_post",
        {
          p_post_id: post.id,
        }
      );

      if (error) throw error;

      setDeleteModalOpen(false);
      router.push("/");
      router.refresh();
    } catch (caught) {
      console.error("Delete post error:", caught);

      setErrorMessage(
        caught instanceof Error
          ? caught.message
          : "Unable to delete post."
      );
    } finally {
      setDeleting(false);
    }
  }

  async function openReportPost() {
    setActionMenuOpen(false);

    const { data } = await supabase.auth.getSession();

    if (!data.session?.user) {
      if (post) {
        router.push(
          `/log-in?next=${encodeURIComponent(
            `/posts/${post.id}`
          )}`
        );
      }

      return;
    }

    setReportReason("");
    setReportModalOpen(true);
  }

  async function submitReport() {
    if (!post || reporting) return;

    const cleanReason = reportReason.trim();

    if (cleanReason.length < 3) {
      setErrorMessage("Please add a short reason for the report.");
      return;
    }

    setReporting(true);
    setErrorMessage(null);

    try {
      const { error } = await supabase.rpc("elo_report_post", {
        p_post_id: post.id,
        p_reason: cleanReason,
      });

      if (error) throw error;

      setReportModalOpen(false);
      setReportReason("");
      setNotice(
        "Report sent. ELO aims to review reports within 48 hours."
      );
    } catch (caught) {
      console.error("Report post error:", caught);

      setErrorMessage(
        caught instanceof Error
          ? caught.message
          : "Unable to send report."
      );
    } finally {
      setReporting(false);
    }
  }

  if (loading) {
    return (
      <div className="elo-post-view-page">
        <SiteHeader />

        <main className="elo-post-view-loading">
          <LoaderCircle
            size={31}
            className="elo-post-view-spin"
          />
        </main>

        <style>{sharedStyles}</style>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="elo-post-view-page">
        <SiteHeader />

        <main className="elo-post-view-not-found">
          <span>Post unavailable</span>
        </main>

        <style>{sharedStyles}</style>
      </div>
    );
  }

  const accent = post.group?.brand_color ?? "#005744";
  const linkColour = getAccessibleLinkColour(accent);

  const eventStart = formatEventDate(post.event_start);
  const eventEnd = formatEventDate(post.event_end);
  const sameDayEvent =
    eventStart && eventEnd && eventStart === eventEnd;

  const dealValue = getDealValue(post);
  const updateImages = getUpdateImageUrls(post);

  const website = normaliseWebsite(post.group?.website);

  const facebook = normaliseSocial(
    post.group?.layout?.socials?.facebook ??
      post.group?.layout?.facebook,
    "facebook"
  );

  const instagram = normaliseSocial(
    post.group?.layout?.socials?.instagram ??
      post.group?.layout?.instagram,
    "instagram"
  );

  const hasLinks = Boolean(website || instagram || facebook);

  const isOwner = Boolean(
    currentUserId &&
      post.group?.user_id &&
      currentUserId === post.group.user_id
  );

  return (
    <div className="elo-post-view-page">
      <SiteHeader />

      <main className="elo-post-view-main">
        <BrandShard
          accent={accent}
          name={post.group?.name ?? "East Lothian"}
          partner={post.group?.is_local_partner === true}
        />

        {post.group && (
          <section className="elo-post-view-page-area">
            <Link
              href={`/pages/${encodeURIComponent(
                post.group.slug || post.group.id
              )}`}
              className="elo-post-view-page-button"
              style={{
                borderColor: linkColour,
                color: linkColour,
              }}
            >
              <span>
                <Store size={21} />
                <strong>View ELO Page</strong>
              </span>

              <ChevronRight size={18} />
            </Link>

            {hasLinks && (
              <div className="elo-post-view-socials">
                {website && (
                  <a
                    href={website}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      color: linkColour,
                    }}
                  >
                    <Globe2 size={20} />
                    Website
                  </a>
                )}

                {instagram && (
                  <a
                    href={instagram}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      color: linkColour,
                    }}
                  >
                    <FaInstagram size={20} />
                    Instagram
                  </a>
                )}

                {facebook && (
                  <a
                    href={facebook}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      color: linkColour,
                    }}
                  >
                    <FaFacebook size={20} />
                    Facebook
                  </a>
                )}
              </div>
            )}
          </section>
        )}

        {errorMessage && (
          <div
            className="elo-post-view-message is-error"
            role="alert"
          >
            <span>{errorMessage}</span>

            <button
              type="button"
              onClick={() => setErrorMessage(null)}
              aria-label="Dismiss error"
            >
              <X size={17} />
            </button>
          </div>
        )}

        {notice && (
          <div
            className="elo-post-view-message"
            role="status"
          >
            <span>{notice}</span>

            <button
              type="button"
              onClick={() => setNotice(null)}
              aria-label="Dismiss message"
            >
              <X size={17} />
            </button>
          </div>
        )}

        <article className="elo-post-view-post">
          <div className="elo-post-view-post-top">
            <div className="elo-post-view-meta">
              <span
                className="elo-post-view-type"
                style={{
                  color: linkColour,
                }}
              >
                {post.type.toUpperCase()}
              </span>

              {eventStart && (
                <span
                  className="elo-post-view-date"
                  style={{
                    color: linkColour,
                  }}
                >
                  <CalendarDays size={14} />

                  {eventStart}
                  {eventEnd && !sameDayEvent
                    ? ` – ${eventEnd}`
                    : ""}
                </span>
              )}
            </div>

            <div className="elo-post-view-actions">
              <button
                type="button"
                disabled={savingBookmark}
                onClick={() => void savePost()}
                aria-label={
                  isSaved
                    ? "Remove from Saved"
                    : "Save post"
                }
              >
                {savingBookmark ? (
                  <LoaderCircle
                    size={19}
                    className="elo-post-view-spin"
                  />
                ) : (
                  <Bookmark
                    size={21}
                    fill={isSaved ? "currentColor" : "none"}
                  />
                )}
              </button>

              <button
                type="button"
                onClick={() => void sharePost()}
                aria-label="Share post"
              >
                <Share2 size={21} />
              </button>

              <button
                type="button"
                onClick={() => setActionMenuOpen(true)}
                aria-label="Post options"
              >
                <MoreHorizontal size={22} />
              </button>
            </div>
          </div>

          <LinkedText
            className="elo-post-view-title"
            text={post.title}
            colour={linkColour}
          />

          {post.content ? (
            <LinkedText
              className="elo-post-view-content"
              text={post.content}
              colour={linkColour}
            />
          ) : null}

          {post.type === "deal" && dealValue ? (
            <div
              className="elo-post-view-deal"
              style={{
                borderColor: linkColour,
                color: linkColour,
              }}
            >
              {dealValue}
            </div>
          ) : null}

          {updateImages.length > 0 && (
            <div className="elo-post-view-update-images">
              {updateImages.map((url) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={url}
                  src={url}
                  alt=""
                />
              ))}
            </div>
          )}

          {post.image_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              className="elo-post-view-image"
              src={post.image_url}
              alt={post.title}
            />
          )}
        </article>

        {recommendations.length > 0 && (
          <section className="elo-post-view-recommendations">
            <h2>You may also like</h2>

            <div className="elo-post-view-recommendation-list">
              {recommendations.map((item) => (
                <WebFeedPostCard
                  key={item.id}
                  post={
                    {
                      ...item,
                      group: item.group
                        ? {
                            id: item.group.id,
                            name:
                              item.group.name ??
                              "East Lothian",
                            is_local_partner:
                              item.group.is_local_partner === true,
                            brand_color:
                              item.group.brand_color,
                          }
                        : null,
                    } as unknown as FeedPost
                  }
                />
              ))}
            </div>
          </section>
        )}
      </main>

      {actionMenuOpen && (
        <ModalShell
          onClose={() => setActionMenuOpen(false)}
        >
          <h2 className="elo-post-view-sheet-title">
            Post options
          </h2>

          {isOwner ? (
            <>
              <button
                type="button"
                className="elo-post-view-sheet-action"
                onClick={openEditPost}
              >
                <span className="elo-post-view-sheet-icon">
                  <Pencil size={21} />
                </span>

                <span>
                  <strong>Edit post</strong>
                  <small>
                    Change the title or description.
                  </small>
                </span>
              </button>

              <button
                type="button"
                className="elo-post-view-sheet-action is-danger"
                onClick={openDeletePost}
              >
                <span className="elo-post-view-sheet-icon">
                  <Trash2 size={21} />
                </span>

                <span>
                  <strong>Delete post</strong>
                  <small>
                    Permanently remove it from ELO.
                  </small>
                </span>
              </button>
            </>
          ) : (
            <button
              type="button"
              className="elo-post-view-sheet-action is-report"
              onClick={() => void openReportPost()}
            >
              <span className="elo-post-view-sheet-icon">
                <Flag size={21} />
              </span>

              <span>
                <strong>Report post</strong>
                <small>
                  Send this post to ELO for review.
                </small>
              </span>
            </button>
          )}

          <button
            type="button"
            className="elo-post-view-sheet-cancel"
            onClick={() => setActionMenuOpen(false)}
          >
            Cancel
          </button>
        </ModalShell>
      )}

      {editModalOpen && (
        <ModalShell
          onClose={() => {
            if (!savingEdit) {
              setEditModalOpen(false);
            }
          }}
        >
          <h2 className="elo-post-view-form-title">
            Edit post
          </h2>

          <label className="elo-post-view-form-label">
            Title
          </label>

          <input
            className="elo-post-view-input"
            value={editTitle}
            onChange={(event) =>
              setEditTitle(event.target.value)
            }
            placeholder="Post title"
            maxLength={160}
          />

          <label className="elo-post-view-form-label">
            Description
          </label>

          <textarea
            className="elo-post-view-input elo-post-view-textarea"
            value={editContent}
            onChange={(event) =>
              setEditContent(event.target.value)
            }
            placeholder="Post description"
            maxLength={5000}
          />

          <p className="elo-post-view-form-hint">
            Event dates, deal values and images stay unchanged.
          </p>

          <div className="elo-post-view-form-buttons">
            <button
              type="button"
              className="elo-post-view-secondary"
              disabled={savingEdit}
              onClick={() => setEditModalOpen(false)}
            >
              Cancel
            </button>

            <button
              type="button"
              className="elo-post-view-primary"
              disabled={savingEdit}
              onClick={() => void saveEdit()}
            >
              {savingEdit ? (
                <LoaderCircle
                  size={18}
                  className="elo-post-view-spin"
                />
              ) : (
                "Save changes"
              )}
            </button>
          </div>
        </ModalShell>
      )}

      {deleteModalOpen && (
        <ModalShell
          onClose={() => {
            if (!deleting) {
              setDeleteModalOpen(false);
            }
          }}
        >
          <span className="elo-post-view-danger-icon">
            <Trash2 size={26} />
          </span>

          <h2 className="elo-post-view-form-title">
            Delete this post?
          </h2>

          <p className="elo-post-view-form-body">
            This cannot be undone. Type DELETE below to
            permanently remove it.
          </p>

          <input
            className="elo-post-view-input elo-post-view-delete-input"
            value={deleteConfirmation}
            onChange={(event) =>
              setDeleteConfirmation(
                event.target.value.toUpperCase()
              )
            }
            placeholder="DELETE"
            autoCapitalize="characters"
            autoComplete="off"
          />

          <div className="elo-post-view-form-buttons">
            <button
              type="button"
              className="elo-post-view-secondary"
              disabled={deleting}
              onClick={() => setDeleteModalOpen(false)}
            >
              Cancel
            </button>

            <button
              type="button"
              className="elo-post-view-delete"
              disabled={
                deleting ||
                deleteConfirmation !== "DELETE"
              }
              onClick={() => void deletePost()}
            >
              {deleting ? (
                <LoaderCircle
                  size={18}
                  className="elo-post-view-spin"
                />
              ) : (
                "Delete forever"
              )}
            </button>
          </div>
        </ModalShell>
      )}

      {reportModalOpen && (
        <ModalShell
          onClose={() => {
            if (!reporting) {
              setReportModalOpen(false);
            }
          }}
        >
          <span className="elo-post-view-report-icon">
            <Flag size={25} />
          </span>

          <h2 className="elo-post-view-form-title">
            Report this post
          </h2>

          <p className="elo-post-view-form-body">
            Tell us why this post should be reviewed. We aim
            to review reports within 48 hours.
          </p>

          <textarea
            className="elo-post-view-input elo-post-view-textarea"
            value={reportReason}
            onChange={(event) =>
              setReportReason(event.target.value)
            }
            placeholder="What is wrong with this post?"
            maxLength={1000}
          />

          <div className="elo-post-view-form-buttons">
            <button
              type="button"
              className="elo-post-view-secondary"
              disabled={reporting}
              onClick={() => setReportModalOpen(false)}
            >
              Cancel
            </button>

            <button
              type="button"
              className="elo-post-view-primary"
              disabled={
                reporting ||
                reportReason.trim().length < 3
              }
              onClick={() => void submitReport()}
            >
              {reporting ? (
                <LoaderCircle
                  size={18}
                  className="elo-post-view-spin"
                />
              ) : (
                "Send report"
              )}
            </button>
          </div>
        </ModalShell>
      )}

      <WebFeedStyles />

      <style>{sharedStyles}</style>
    </div>
  );
}

const sharedStyles = `
  .elo-post-view-page {
    min-height: 100dvh;
    background: #F4F5F4;
    color: #111614;
    font-family: var(--font-geist-sans), Arial, sans-serif;
  }

  .elo-post-view-page *,
  .elo-post-view-page *::before,
  .elo-post-view-page *::after {
    box-sizing: border-box;
  }

  .elo-post-view-page button,
  .elo-post-view-page input,
  .elo-post-view-page textarea {
    font: inherit;
  }

  .elo-post-view-main {
    width: 100%;
    max-width: 760px;
    margin: 0 auto;
    padding-bottom: 130px;
  }

  .elo-post-view-loading,
  .elo-post-view-not-found {
    min-height: 65vh;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #68736F;
    font-size: 15px;
    font-weight: 700;
  }

  .elo-post-view-brand {
    position: relative;
    min-height: 92px;
    overflow: hidden;
    display: flex;
    align-items: center;
  }

  .elo-post-view-brand-shards {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
  }

  .elo-post-view-brand-content {
    position: relative;
    z-index: 1;
    width: 100%;
    padding: 15px 18px;
  }

  .elo-post-view-partner-label {
    display: block;
    margin-bottom: 4px;
    font-size: 8px;
    font-weight: 900;
    letter-spacing: 1.1px;
  }

  .elo-post-view-brand-name-row {
    display: flex;
    align-items: center;
    gap: 7px;
  }

  .elo-post-view-brand-name-row h1 {
    flex: 1;
    min-width: 0;
    margin: 0;
    font-size: 21px;
    line-height: 24px;
    font-weight: 900;
    letter-spacing: -.35px;
  }

  .elo-post-view-page-area {
    padding: 14px 16px 3px;
  }

  .elo-post-view-page-button {
    height: 54px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    border: 1.5px solid;
    border-radius: 14px;
    background: #F4F5F4;
    padding: 0 15px;
    text-decoration: none;
  }

  .elo-post-view-page-button > span {
    display: flex;
    align-items: center;
    gap: 9px;
  }

  .elo-post-view-page-button strong {
    font-size: 14px;
    font-weight: 900;
  }

  .elo-post-view-socials {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-wrap: wrap;
    gap: 4px;
    padding-top: 6px;
  }

  .elo-post-view-socials a {
    display: flex;
    align-items: center;
    gap: 5px;
    padding: 9px;
    text-decoration: none;
    font-size: 10px;
    font-weight: 800;
  }

  .elo-post-view-message {
    margin: 12px 16px 0;
    min-height: 45px;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 9px 11px 9px 13px;
    border-radius: 13px;
    background: #E8F4F0;
    color: #005744;
    font-size: 11px;
    font-weight: 700;
  }

  .elo-post-view-message.is-error {
    background: #FFE9E7;
    color: #B42318;
  }

  .elo-post-view-message span {
    flex: 1;
  }

  .elo-post-view-message button {
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

  .elo-post-view-post {
    background: #F4F5F4;
    padding: 20px 0 26px;
  }

  .elo-post-view-post-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 9px;
    padding: 0 18px;
  }

  .elo-post-view-meta {
    min-width: 0;
    flex: 1;
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 9px;
  }

  .elo-post-view-type {
    font-size: 9px;
    font-weight: 900;
    letter-spacing: 1.05px;
  }

  .elo-post-view-date {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 10px;
    font-weight: 800;
  }

  .elo-post-view-actions {
    display: flex;
    align-items: center;
    gap: 7px;
  }

  .elo-post-view-actions button {
    width: 38px;
    height: 38px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1px solid #D8E0DC;
    border-radius: 50%;
    background: #FFFFFF;
    color: #173C33;
    cursor: pointer;
  }

  .elo-post-view-actions button:disabled {
    opacity: .55;
    cursor: wait;
  }

  .elo-post-view-title {
    padding: 0 18px;
    color: #111614;
    font-size: 25px;
    line-height: 31px;
    font-weight: 900;
    letter-spacing: -.45px;
    white-space: pre-wrap;
  }

  .elo-post-view-content {
    margin-top: 11px;
    padding: 0 18px;
    color: #414A46;
    font-size: 15px;
    line-height: 23px;
    white-space: pre-wrap;
  }

  .elo-post-view-deal {
    width: fit-content;
    margin: 18px 18px 0;
    border: 2px solid;
    border-radius: 10px;
    padding: 8px 14px;
    font-size: 18px;
    font-weight: 900;
  }

  .elo-post-view-update-images {
    width: 100%;
    margin-top: 20px;
  }

  .elo-post-view-update-images img {
    display: block;
    width: 100%;
    height: auto;
    object-fit: cover;
  }

  .elo-post-view-update-images img + img {
    margin-top: 8px;
  }

  .elo-post-view-image {
    display: block;
    width: 100%;
    height: auto;
    margin-top: 20px;
    background: #E7EBE9;
    object-fit: contain;
  }

  .elo-post-view-recommendations {
    padding: 18px 16px 0;
  }

  .elo-post-view-recommendations > h2 {
    margin: 0 0 12px;
    color: #173C33;
    font-size: 18px;
    font-weight: 900;
  }

  .elo-post-view-recommendation-list {
    display: grid;
    gap: 13px;
  }

  .elo-post-view-modal-root {
    position: fixed;
    z-index: 1500;
    inset: 0;
    display: flex;
    align-items: flex-end;
    justify-content: center;
    background: rgba(7,22,17,.38);
    padding-top: 40px;
  }

  .elo-post-view-modal-sheet {
    width: 100%;
    max-width: 760px;
    max-height: calc(100dvh - 40px);
    overflow-y: auto;
    border-radius: 26px 26px 0 0;
    background: #F4F5F4;
    padding: 11px 18px max(20px, env(safe-area-inset-bottom));
    box-shadow: 0 -12px 44px rgba(0,0,0,.12);
  }

  .elo-post-view-sheet-handle {
    width: 42px;
    height: 5px;
    margin: 0 auto 14px;
    border-radius: 3px;
    background: #C5CECA;
  }

  .elo-post-view-sheet-title {
    margin: 0 4px 10px;
    color: #173C33;
    font-size: 20px;
    font-weight: 900;
  }

  .elo-post-view-sheet-action {
    width: 100%;
    min-height: 72px;
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 9px;
    padding: 11px 13px;
    border: 1px solid #E0E6E3;
    border-radius: 17px;
    background: #FFFFFF;
    color: #17241F;
    text-align: left;
    cursor: pointer;
  }

  .elo-post-view-sheet-action > span:last-child {
    flex: 1;
    min-width: 0;
  }

  .elo-post-view-sheet-action strong {
    display: block;
    color: #17241F;
    font-size: 14px;
    font-weight: 900;
  }

  .elo-post-view-sheet-action small {
    display: block;
    margin-top: 2px;
    color: #74807B;
    font-size: 10px;
    line-height: 15px;
    font-weight: 600;
  }

  .elo-post-view-sheet-icon {
    width: 43px;
    height: 43px;
    flex: 0 0 43px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 14px;
    background: #E5F0EC;
    color: #005744;
  }

  .elo-post-view-sheet-action.is-danger .elo-post-view-sheet-icon {
    background: #FDEAE7;
    color: #B42318;
  }

  .elo-post-view-sheet-action.is-danger strong {
    color: #B42318;
  }

  .elo-post-view-sheet-action.is-report .elo-post-view-sheet-icon {
    background: #FFF1D8;
    color: #A15C00;
  }

  .elo-post-view-sheet-cancel {
    width: 100%;
    height: 48px;
    border: 0;
    background: transparent;
    color: #59645F;
    font-size: 13px;
    font-weight: 800;
    cursor: pointer;
  }

  .elo-post-view-form-title {
    margin: 0;
    color: #173C33;
    font-size: 22px;
    line-height: 27px;
    font-weight: 900;
    letter-spacing: -.35px;
  }

  .elo-post-view-form-body {
    margin: 7px 0 14px;
    color: #68736F;
    font-size: 12px;
    line-height: 18px;
    font-weight: 600;
  }

  .elo-post-view-form-label {
    display: block;
    margin: 13px 0 6px;
    color: #45514C;
    font-size: 10px;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: .8px;
  }

  .elo-post-view-input {
    width: 100%;
    min-height: 50px;
    border: 1px solid #D7DFDB;
    border-radius: 14px;
    outline: none;
    background: #FFFFFF;
    padding: 0 14px;
    color: #17241F;
    font-size: 14px;
    font-weight: 600;
  }

  .elo-post-view-input:focus {
    border-color: #A9B7B1;
  }

  .elo-post-view-textarea {
    min-height: 116px;
    resize: vertical;
    padding-top: 13px;
    padding-bottom: 13px;
  }

  .elo-post-view-delete-input {
    margin-top: 2px;
    text-align: center;
    letter-spacing: 2px;
    font-weight: 900;
  }

  .elo-post-view-form-hint {
    margin: 8px 0 0;
    color: #85908C;
    font-size: 10px;
    line-height: 15px;
    font-weight: 600;
  }

  .elo-post-view-form-buttons {
    display: flex;
    gap: 10px;
    margin-top: 17px;
  }

  .elo-post-view-form-buttons button {
    height: 50px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 14px;
    font-size: 12px;
    font-weight: 900;
    cursor: pointer;
  }

  .elo-post-view-form-buttons button:disabled {
    opacity: .42;
    cursor: not-allowed;
  }

  .elo-post-view-secondary {
    flex: 1;
    border: 1px solid #CFD8D4;
    background: #FFFFFF;
    color: #44504B;
  }

  .elo-post-view-primary {
    flex: 1.25;
    border: 0;
    background: #005744;
    color: #FFFFFF;
  }

  .elo-post-view-delete {
    flex: 1.25;
    border: 0;
    background: #B42318;
    color: #FFFFFF;
  }

  .elo-post-view-danger-icon,
  .elo-post-view-report-icon {
    width: 52px;
    height: 52px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 12px;
    border-radius: 17px;
  }

  .elo-post-view-danger-icon {
    background: #FDEAE7;
    color: #B42318;
  }

  .elo-post-view-report-icon {
    background: #FFF1D8;
    color: #8A4E00;
  }

  .elo-post-view-spin {
    animation: elo-post-view-spin .8s linear infinite;
  }

  @keyframes elo-post-view-spin {
    to {
      transform: rotate(360deg);
    }
  }

  @media (max-width: 480px) {
    .elo-post-view-post-top {
      align-items: flex-start;
    }

    .elo-post-view-actions {
      gap: 5px;
    }

    .elo-post-view-actions button {
      width: 36px;
      height: 36px;
    }

    .elo-post-view-form-buttons {
      gap: 8px;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .elo-post-view-spin {
      animation: none;
    }
  }
`;

"use client";

import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  BarChart3,
  Building2,
  Check,
  ChevronDown,
  ChevronUp,
  CircleAlert,
  Clock3,
  FileText,
  LoaderCircle,
  LockKeyhole,
  LogOut,
  MapPin,
  Pencil,
  Plus,
  Trash2,
  TrendingUp,
} from "lucide-react";

import SiteHeader from "@/components/SiteHeader";
import Footer from "@/components/Footer";
import Analytics from "@/components/Analytics";
import Trends from "@/components/Trends";
import { createClient } from "@/lib/supabase/client";

type PageStatus = "approved" | "pending" | "rejected";

type DatabasePage = {
  id: string;
  name: string | null;
  slug: string | null;
  status: string | null;
  place_enabled: boolean | null;
  is_local_partner: boolean | null;
};

type DatabasePlace = {
  id: string;
  page_id: string;
  title: string | null;
  location_name: string | null;
  address: string | null;
  postcode: string | null;
  slug: string | null;
};

type PostMetadata = {
  public_type?: string | null;
  active_dates?: unknown;
  location?: string | null;
};

type DatabasePost = {
  id: string;
  group_id: string | null;
  title: string | null;
  content: string | null;
  type: string | null;
  created_at: string | null;
  event_start: string | null;
  expires_at: string | null;
  metadata: PostMetadata | null;
};

type ManagedPage = {
  id: string;
  name: string;
  slug: string | null;
  status: PageStatus;
  placeEnabled: boolean;
  isLocalPartner: boolean;
  places: DatabasePlace[];
};

type ManagedPost = DatabasePost & {
  pageName: string | null;
};

type LazyRenderProps = {
  children: ReactNode;
  minHeight?: number;
  rootMargin?: string;
};

function LazyRender({
  children,
  minHeight = 180,
  rootMargin = "500px 0px",
}: LazyRenderProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    const element = containerRef.current;

    if (!element || shouldRender) return;

    if (!("IntersectionObserver" in window)) {
      setShouldRender(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setShouldRender(true);
        observer.disconnect();
      },
      { rootMargin },
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, [rootMargin, shouldRender]);

  return (
    <div
      ref={containerRef}
      style={shouldRender ? undefined : { minHeight }}
    >
      {shouldRender ? children : null}
    </div>
  );
}

const statusStyles: Record<
  PageStatus,
  {
    label: string;
    icon: typeof Check;
    className: string;
  }
> = {
  approved: {
    label: "Approved",
    icon: Check,
    className: "bg-emerald-100 text-emerald-800",
  },
  pending: {
    label: "Pending approval",
    icon: Clock3,
    className: "bg-amber-100 text-amber-800",
  },
  rejected: {
    label: "Rejected",
    icon: CircleAlert,
    className: "bg-red-100 text-red-800",
  },
};

function normaliseStatus(status: string | null): PageStatus {
  if (status === "approved" || status === "rejected") return status;
  return "pending";
}

function getPlaceLocation(place: DatabasePlace) {
  return (
    place.location_name ||
    place.address ||
    place.postcode ||
    "East Lothian"
  );
}

function formatPostType(post: DatabasePost) {
  const rawType = post.metadata?.public_type || post.type || "post";

  return rawType
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDate(value: string | null) {
  if (!value) return "Date unavailable";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Date unavailable";

  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

function getPostSummary(post: DatabasePost) {
  const summary = post.content?.replace(/\s+/g, " ").trim();

  if (!summary) return "No description has been added.";
  if (summary.length <= 150) return summary;

  return `${summary.slice(0, 150).trimEnd()}…`;
}

export default function AccountPage() {
  const router = useRouter();

  const [pages, setPages] = useState<ManagedPage[]>([]);
  const [posts, setPosts] = useState<ManagedPost[]>([]);
  const [expandedPageId, setExpandedPageId] = useState<string | null>(null);
  const [partnerTool, setPartnerTool] = useState<
    "analytics" | "trends" | null
  >(null);

  const [loading, setLoading] = useState(true);
  const [deletingPageId, setDeletingPageId] = useState<string | null>(null);
  const [deletingPostId, setDeletingPostId] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);
  const [pageError, setPageError] = useState("");

  const loadAccount = useCallback(async () => {
    setLoading(true);
    setPageError("");

    try {
      const supabase = createClient();

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        router.replace("/log-in?next=/account");
        return;
      }

      const [pagesResult, postsResult] = await Promise.all([
        supabase
          .from("groups")
          .select("id, name, slug, status, place_enabled, is_local_partner")
          .eq("user_id", user.id)
          .order("name", { ascending: true }),

        supabase
          .from("posts")
          .select(
            `
              id,
              group_id,
              title,
              content,
              type,
              created_at,
              event_start,
              expires_at,
              metadata
            `,
          )
          .eq("user_id", user.id)
          .order("created_at", { ascending: false }),
      ]);

      if (pagesResult.error) throw pagesResult.error;
      if (postsResult.error) throw postsResult.error;

      const databasePages = (pagesResult.data ?? []) as DatabasePage[];
      const databasePosts = (postsResult.data ?? []) as DatabasePost[];
      const pageIds = databasePages.map((page) => page.id);

      let places: DatabasePlace[] = [];

      if (pageIds.length > 0) {
        const { data: placeData, error: placesError } = await supabase
          .from("places")
          .select(
            "id, page_id, title, location_name, address, postcode, slug",
          )
          .in("page_id", pageIds)
          .order("title", { ascending: true });

        if (placesError) throw placesError;

        places = (placeData ?? []) as DatabasePlace[];
      }

      const pageNames = new Map(
        databasePages.map((page) => [
          page.id,
          page.name?.trim() || "Untitled Page",
        ]),
      );

      const loadedPages = databasePages.map<ManagedPage>((page) => ({
        id: page.id,
        name: page.name?.trim() || "Untitled Page",
        slug: page.slug,
        status: normaliseStatus(page.status),
        placeEnabled: page.place_enabled ?? true,
        isLocalPartner: page.is_local_partner === true,
        places: places.filter((place) => place.page_id === page.id),
      }));

      const loadedPosts = databasePosts.map<ManagedPost>((post) => ({
        ...post,
        pageName: post.group_id
          ? pageNames.get(post.group_id) ?? null
          : null,
      }));

      setPages(loadedPages);
      setPosts(loadedPosts);

      setExpandedPageId((current) => {
        if (
          current &&
          loadedPages.some((page) => page.id === current)
        ) {
          return current;
        }

        return loadedPages[0]?.id ?? null;
      });
    } catch (error) {
      console.error("Failed to load account:", error);

      setPageError(
        error instanceof Error
          ? error.message
          : "We couldn't load your account.",
      );
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void loadAccount();
  }, [loadAccount]);

  const pageCountLabel = useMemo(
    () => (pages.length === 1 ? "1 page" : `${pages.length} pages`),
    [pages.length],
  );

  const postCountLabel = useMemo(
    () => (posts.length === 1 ? "1 post" : `${posts.length} posts`),
    [posts.length],
  );

  const hasLocalPartnerPage = useMemo(
    () => pages.some((page) => page.isLocalPartner),
    [pages],
  );

  function togglePage(pageId: string) {
    setExpandedPageId((current) =>
      current === pageId ? null : pageId,
    );
  }

  async function deletePage(pageId: string) {
    const page = pages.find((item) => item.id === pageId);

    if (!page || page.status === "approved" || deletingPageId) return;

    const confirmed = window.confirm(
      `Delete "${page.name}"? This cannot be undone.`,
    );

    if (!confirmed) return;

    setDeletingPageId(pageId);
    setPageError("");

    try {
      const supabase = createClient();

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        router.replace("/log-in?next=/account");
        return;
      }

      const { data: ownedPage, error: ownershipError } = await supabase
        .from("groups")
        .select("id, status")
        .eq("id", pageId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (ownershipError) throw ownershipError;
      if (!ownedPage) throw new Error("That page could not be found.");

      if (ownedPage.status === "approved") {
        throw new Error("Approved pages cannot be deleted.");
      }

      const { data: deletedPage, error: pageDeleteError } =
        await supabase
          .from("groups")
          .delete()
          .eq("id", pageId)
          .eq("user_id", user.id)
          .neq("status", "approved")
          .select("id")
          .maybeSingle();

      if (pageDeleteError) {
        throw new Error(`Page deletion failed: ${pageDeleteError.message}`);
      }

      if (!deletedPage) {
        throw new Error(
          "The page was not deleted. Check the delete policy on the groups table.",
        );
      }

      setPages((current) =>
        current.filter((item) => item.id !== pageId),
      );

      setPosts((current) =>
        current.filter((post) => post.group_id !== pageId),
      );

      if (expandedPageId === pageId) {
        setExpandedPageId(null);
      }

      router.refresh();
    } catch (error) {
      console.error("Failed to delete page:", error);

      setPageError(
        error instanceof Error
          ? error.message
          : "We couldn't delete that page.",
      );
    } finally {
      setDeletingPageId(null);
    }
  }

  async function deletePost(postId: string) {
    const post = posts.find((item) => item.id === postId);

    if (!post || deletingPostId) return;

    const confirmed = window.confirm(
      `Delete "${post.title || "Untitled Post"}"? This cannot be undone.`,
    );

    if (!confirmed) return;

    setDeletingPostId(postId);
    setPageError("");

    try {
      const supabase = createClient();

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        router.replace("/log-in?next=/account");
        return;
      }

      const { error } = await supabase
        .from("posts")
        .delete()
        .eq("id", postId)
        .eq("user_id", user.id);

      if (error) throw error;

      setPosts((current) =>
        current.filter((item) => item.id !== postId),
      );
    } catch (error) {
      console.error("Failed to delete post:", error);

      setPageError(
        error instanceof Error
          ? error.message
          : "We couldn't delete that post.",
      );
    } finally {
      setDeletingPostId(null);
    }
  }

  async function signOut() {
    if (signingOut) return;

    setSigningOut(true);
    setPageError("");

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signOut();

      if (error) throw error;

      router.replace("/");
      router.refresh();
    } catch (error) {
      console.error("Failed to sign out:", error);

      setPageError(
        error instanceof Error
          ? error.message
          : "We couldn't sign you out.",
      );

      setSigningOut(false);
    }
  }

  return (
    <>
      <SiteHeader />

      <main className="bg-white text-black">
        <section className="border-b border-black/10">
          <div className="mx-auto w-full max-w-7xl px-5 py-14 sm:px-8 sm:py-16 lg:px-12 lg:py-20">
            <p className="text-sm font-black uppercase tracking-[0.18em] text-emerald-700">
              East Lothian Online
            </p>

            <div className="mt-4 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h1 className="text-5xl font-black leading-[0.95] tracking-[-0.055em] sm:text-6xl">
                  Your account.
                </h1>

                <p className="mt-5 max-w-2xl text-lg leading-8 text-black/60">
                  Manage your pages, places and posts.
                </p>
              </div>

              <Link
                href="/create-page"
                className="inline-flex h-14 items-center justify-center gap-3 rounded-2xl bg-emerald-700 px-6 text-sm font-black uppercase tracking-[0.12em] text-white transition hover:bg-emerald-800"
              >
                <Plus className="h-5 w-5" />
                Create a new page
              </Link>
            </div>
          </div>
        </section>

        <section className="border-b border-black/10 bg-emerald-50/40">
          <div className="mx-auto w-full max-w-7xl px-5 py-10 sm:px-8 lg:px-12">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.18em] text-emerald-700">
                Partner tools
              </p>

              <h2 className="mt-3 text-3xl font-black tracking-[-0.04em] sm:text-4xl">
                Analytics &amp; Local Trends
              </h2>

              <p className="mt-3 max-w-2xl leading-7 text-black/55">
                Explore how your posts perform and what people are searching
                for across East Lothian Online.
              </p>
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <button
                type="button"
                onClick={() =>
                  setPartnerTool((current) =>
                    current === "analytics" ? null : "analytics",
                  )
                }
                className="flex items-center justify-between rounded-2xl border border-black/10 bg-white p-5 text-left transition hover:border-emerald-300"
              >
                <div className="flex items-center gap-4">
                  <div className="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-100 text-emerald-700">
                    <BarChart3 className="h-6 w-6" />
                  </div>

                  <div>
                    <p className="font-black">Analytics</p>
                    <p className="mt-1 text-sm text-black/45">
                      Views, clicks and conversion rate
                    </p>
                  </div>
                </div>

                {!hasLocalPartnerPage ? (
                  <LockKeyhole className="h-5 w-5 text-black/35" />
                ) : partnerTool === "analytics" ? (
                  <ChevronUp className="h-5 w-5" />
                ) : (
                  <ChevronDown className="h-5 w-5" />
                )}
              </button>

              <button
                type="button"
                onClick={() =>
                  setPartnerTool((current) =>
                    current === "trends" ? null : "trends",
                  )
                }
                className="flex items-center justify-between rounded-2xl border border-black/10 bg-white p-5 text-left transition hover:border-emerald-300"
              >
                <div className="flex items-center gap-4">
                  <div className="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-100 text-emerald-700">
                    <TrendingUp className="h-6 w-6" />
                  </div>

                  <div>
                    <p className="font-black">Local Trends</p>
                    <p className="mt-1 text-sm text-black/45">
                      Popular and rising searches
                    </p>
                  </div>
                </div>

                {!hasLocalPartnerPage ? (
                  <LockKeyhole className="h-5 w-5 text-black/35" />
                ) : partnerTool === "trends" ? (
                  <ChevronUp className="h-5 w-5" />
                ) : (
                  <ChevronDown className="h-5 w-5" />
                )}
              </button>
            </div>

            {!hasLocalPartnerPage && partnerTool ? (
              <div className="mt-5 rounded-3xl border border-emerald-200 bg-white px-6 py-10 text-center">
                <LockKeyhole className="mx-auto h-10 w-10 text-emerald-700" />

                <h3 className="mt-5 text-2xl font-black">
                  Local Partner feature
                </h3>

                <p className="mx-auto mt-3 max-w-lg leading-7 text-black/55">
                  Analytics and Local Trends are available to Local Partners.
                </p>

                <Link
                  href="/localpartner"
                  className="mt-6 inline-flex h-12 items-center justify-center rounded-xl bg-emerald-700 px-6 text-sm font-black text-white transition hover:bg-emerald-800"
                >
                  Learn about Local Partnership
                </Link>
              </div>
            ) : null}

            {hasLocalPartnerPage && partnerTool === "analytics" ? (
              <div className="mt-6 overflow-hidden rounded-3xl border border-black/10 bg-white">
                <Analytics />
              </div>
            ) : null}

            {hasLocalPartnerPage && partnerTool === "trends" ? (
              <div className="mt-6 overflow-hidden rounded-3xl border border-black/10 bg-white">
                <Trends />
              </div>
            ) : null}
          </div>
        </section>

        <section className="border-b border-black/10">
          <div className="mx-auto w-full max-w-7xl px-5 py-14 sm:px-8 lg:px-12 lg:py-20">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-3xl font-black tracking-[-0.04em] sm:text-4xl">
                  Your Pages
                </h2>

                <p className="mt-3 max-w-2xl text-base leading-7 text-black/55">
                  Each page can have one or more Places for different physical
                  locations.
                </p>
              </div>

              {!loading ? (
                <p className="text-sm font-bold text-black/45">
                  {pageCountLabel}
                </p>
              ) : null}
            </div>

            {pageError ? (
              <div className="mt-8 rounded-2xl bg-red-50 px-5 py-4 text-sm font-semibold leading-6 text-red-800">
                {pageError}
              </div>
            ) : null}

            {loading ? (
              <div className="flex min-h-72 items-center justify-center">
                <LoaderCircle className="h-7 w-7 animate-spin text-emerald-700" />
              </div>
            ) : (
              <div className="mt-10 border-t border-black/10">
                {pages.length === 0 ? (
                  <div className="py-16 text-center">
                    <Building2 className="mx-auto h-10 w-10 text-black/25" />

                    <h3 className="mt-5 text-2xl font-black">
                      You don&apos;t have any pages yet.
                    </h3>

                    <p className="mx-auto mt-3 max-w-md leading-7 text-black/55">
                      Create a page for your business, organisation, group or
                      venue.
                    </p>

                    <Link
                      href="/create-page"
                      className="mt-7 inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-emerald-700 px-5 text-sm font-black text-white transition hover:bg-emerald-800"
                    >
                      <Plus className="h-4 w-4" />
                      Create your first page
                    </Link>
                  </div>
                ) : (
                  pages.map((page) => {
                    const status = statusStyles[page.status];
                    const StatusIcon = status.icon;
                    const isExpanded = expandedPageId === page.id;
                    const publicPageHref = page.slug
                      ? `/page/${page.slug}`
                      : `/page/${page.id}`;

                    return (
                      <LazyRender
                        key={page.id}
                        minHeight={170}
                        rootMargin="600px 0px"
                      >
                        <article className="border-b border-black/10">
                          <div className="py-7 sm:py-8">
                            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                              <button
                                type="button"
                                onClick={() => togglePage(page.id)}
                                className="flex min-w-0 flex-1 items-start gap-4 text-left"
                              >
                                <div className="mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-black/[0.04]">
                                  <Building2 className="h-5 w-5" />
                                </div>

                                <div className="min-w-0">
                                  <div className="flex flex-wrap items-center gap-3">
                                    <h3 className="truncate text-2xl font-black tracking-[-0.03em]">
                                      {page.name}
                                    </h3>

                                    {page.isLocalPartner ? (
                                      <span className="rounded-full bg-emerald-700 px-3 py-1 text-xs font-black text-white">
                                        Local Partner
                                      </span>
                                    ) : null}

                                    <span
                                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-black ${status.className}`}
                                    >
                                      <StatusIcon className="h-3.5 w-3.5" />
                                      {status.label}
                                    </span>
                                  </div>

                                  <p className="mt-2 text-sm font-semibold text-black/45">
                                    {page.places.length === 1
                                      ? "1 Place"
                                      : `${page.places.length} Places`}
                                  </p>
                                </div>
                              </button>

                              <div className="flex flex-wrap items-center gap-3 sm:pl-15 lg:pl-0">
                                {page.status === "approved" ? (
                                  <>
                                    <Link
                                      href={publicPageHref}
                                      className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-black/15 px-4 text-sm font-bold transition hover:border-black/30 hover:bg-black/[0.03]"
                                    >
                                      View public page
                                      <ArrowRight className="h-4 w-4" />
                                    </Link>

                                    <Link
                                      href={`/account/pages/${page.id}/edit`}
                                      className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-black px-4 text-sm font-bold text-white transition hover:bg-black/80"
                                    >
                                      <Pencil className="h-4 w-4" />
                                      Edit page
                                    </Link>
                                  </>
                                ) : page.status === "pending" ? (
                                  <>
                                    <Link
                                      href={`/account/pages/${page.id}/edit`}
                                      className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-black/15 px-4 text-sm font-bold transition hover:border-black/30 hover:bg-black/[0.03]"
                                    >
                                      <Pencil className="h-4 w-4" />
                                      Edit
                                    </Link>

                                    <button
                                      type="button"
                                      onClick={() => void deletePage(page.id)}
                                      disabled={deletingPageId === page.id}
                                      className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-red-200 px-4 text-sm font-bold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                      {deletingPageId === page.id ? (
                                        <LoaderCircle className="h-4 w-4 animate-spin" />
                                      ) : (
                                        <Trash2 className="h-4 w-4" />
                                      )}
                                      Delete
                                    </button>
                                  </>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => void deletePage(page.id)}
                                    disabled={deletingPageId === page.id}
                                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-red-200 px-4 text-sm font-bold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                                  >
                                    {deletingPageId === page.id ? (
                                      <LoaderCircle className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <Trash2 className="h-4 w-4" />
                                    )}
                                    Delete
                                  </button>
                                )}

                                <button
                                  type="button"
                                  onClick={() => togglePage(page.id)}
                                  aria-label={
                                    isExpanded
                                      ? `Hide ${page.name} places`
                                      : `Show ${page.name} places`
                                  }
                                  className="flex h-11 w-11 items-center justify-center rounded-xl border border-black/15 transition hover:border-black/30 hover:bg-black/[0.03]"
                                >
                                  {isExpanded ? (
                                    <ChevronUp className="h-5 w-5" />
                                  ) : (
                                    <ChevronDown className="h-5 w-5" />
                                  )}
                                </button>
                              </div>
                            </div>

                            {page.status === "pending" ? (
                              <div className="mt-5 rounded-2xl bg-amber-50 px-4 py-4 text-sm leading-6 text-amber-900 sm:ml-15">
                                Your page is awaiting review. You can still edit
                                or delete it while it is pending.
                              </div>
                            ) : null}

                            {page.status === "rejected" ? (
                              <div className="mt-5 rounded-2xl bg-red-50 px-4 py-4 text-sm leading-6 text-red-800 sm:ml-15">
                                This page was not approved and can only be deleted.
                              </div>
                            ) : null}

                            {isExpanded ? (
                              <div className="mt-8 border-t border-black/10 pt-7 sm:ml-15">
                                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                  <div>
                                    <h4 className="text-lg font-black">
                                      Places
                                    </h4>

                                    <p className="mt-1 text-sm leading-6 text-black/50">
                                      Physical locations connected to this page.
                                    </p>
                                  </div>

                                  {page.status === "approved" &&
                                  page.placeEnabled ? (
                                    <Link
                                      href="/account/create-place"
                                      className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-black/15 px-4 text-sm font-bold transition hover:border-black/30 hover:bg-black/[0.03]"
                                    >
                                      <Plus className="h-4 w-4" />
                                      Add Place
                                    </Link>
                                  ) : null}
                                </div>

                                {page.places.length > 0 ? (
                                  <div className="mt-5 divide-y divide-black/10 border-y border-black/10">
                                    {page.places.map((place) => (
                                      <div
                                        key={place.id}
                                        className="flex flex-col gap-4 py-4 sm:flex-row sm:items-center sm:justify-between"
                                      >
                                        <div className="flex items-start gap-3">
                                          <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" />

                                          <div>
                                            <p className="font-black">
                                              {place.title || "Untitled Place"}
                                            </p>

                                            <p className="mt-1 text-sm text-black/45">
                                              {getPlaceLocation(place)}
                                            </p>
                                          </div>
                                        </div>

                                        {page.status === "approved" ? (
                                          <Link
                                            href={`/account/edit-place/${place.id}`}
                                            className="inline-flex items-center gap-2 text-sm font-black text-black transition hover:text-emerald-700"
                                          >
                                            Manage Place
                                            <ArrowRight className="h-4 w-4" />
                                          </Link>
                                        ) : (
                                          <span className="text-sm font-semibold text-black/35">
                                            Available after approval
                                          </span>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="mt-5 border-y border-black/10 py-7">
                                    <p className="text-sm leading-6 text-black/50">
                                      No Places have been added to this page yet.
                                    </p>
                                  </div>
                                )}
                              </div>
                            ) : null}
                          </div>
                        </article>
                      </LazyRender>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </section>

        <section>
          <div className="mx-auto w-full max-w-7xl px-5 py-14 sm:px-8 lg:px-12 lg:py-20">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-3xl font-black tracking-[-0.04em] sm:text-4xl">
                  Your Posts
                </h2>

                <p className="mt-3 max-w-2xl text-base leading-7 text-black/55">
                  Edit or remove anything you have published.
                </p>
              </div>

              {!loading ? (
                <p className="text-sm font-bold text-black/45">
                  {postCountLabel}
                </p>
              ) : null}
            </div>

            {loading ? (
              <div className="flex min-h-72 items-center justify-center">
                <LoaderCircle className="h-7 w-7 animate-spin text-emerald-700" />
              </div>
            ) : posts.length === 0 ? (
              <div className="mt-10 border-y border-black/10 py-16 text-center">
                <FileText className="mx-auto h-10 w-10 text-black/25" />

                <h3 className="mt-5 text-2xl font-black">
                  You haven&apos;t created any posts yet.
                </h3>

                <p className="mx-auto mt-3 max-w-md leading-7 text-black/55">
                  Posts you create for your Pages will appear here.
                </p>
              </div>
            ) : (
              <div className="mt-10 divide-y divide-black/10 border-y border-black/10">
                {posts.map((post) => (
                  <LazyRender
                    key={post.id}
                    minHeight={190}
                    rootMargin="700px 0px"
                  >
                    <article className="flex flex-col gap-6 py-7 lg:flex-row lg:items-center lg:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-3">
                          <Link
                            href={`/posts/${post.id}`}
                            className="text-2xl font-black tracking-[-0.03em] transition hover:text-emerald-700"
                          >
                            {post.title || "Untitled Post"}
                          </Link>

                          <span className="rounded-full bg-black/[0.05] px-3 py-1 text-xs font-black text-black/60">
                            {formatPostType(post)}
                          </span>
                        </div>

                        <p className="mt-2 text-sm font-semibold text-black/45">
                          {post.pageName ? `${post.pageName} · ` : ""}
                          Published {formatDate(post.created_at)}
                        </p>

                        <p className="mt-4 max-w-3xl text-sm leading-6 text-black/55">
                          {getPostSummary(post)}
                        </p>
                      </div>

                      <div className="flex shrink-0 flex-wrap items-center gap-3">
                        <Link
                          href={`/posts/${post.id}/edit`}
                          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-black/15 px-4 text-sm font-bold transition hover:border-black/30 hover:bg-black/[0.03]"
                        >
                          <Pencil className="h-4 w-4" />
                          Edit
                        </Link>

                        <button
                          type="button"
                          onClick={() => void deletePost(post.id)}
                          disabled={deletingPostId === post.id}
                          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-red-200 px-4 text-sm font-bold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {deletingPostId === post.id ? (
                            <LoaderCircle className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                          Delete
                        </button>
                      </div>
                    </article>
                  </LazyRender>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="border-t border-black/10">
          <div className="mx-auto w-full max-w-7xl px-5 py-12 sm:px-8 lg:px-12">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-xl font-black tracking-[-0.03em]">
                  Finished for now?
                </h2>

                <p className="mt-2 text-sm leading-6 text-black/50">
                  Sign out of your East Lothian Online account on this device.
                </p>
              </div>

              <button
                type="button"
                onClick={() => void signOut()}
                disabled={signingOut}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-red-200 px-5 text-sm font-black text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {signingOut ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  <LogOut className="h-4 w-4" />
                )}

                {signingOut ? "Signing out..." : "Sign out"}
              </button>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
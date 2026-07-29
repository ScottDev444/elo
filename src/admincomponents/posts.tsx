"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  CalendarX2,
  ChevronDown,
  ExternalLink,
  FileText,
  LoaderCircle,
  RefreshCw,
  Search,
  Trash2,
  X,
} from "lucide-react";

import { createClient } from "@/lib/supabase/client";

type PostMetadata = {
  public_type?: string | null;
  active_dates?: unknown;
  date?: unknown;
  dates?: unknown;
  start_date?: unknown;
  end_date?: unknown;
  event_date?: unknown;
};

type DatabasePost = {
  id: string;
  group_id: string | null;
  user_id: string | null;
  title: string | null;
  content: string | null;
  type: string | null;
  created_at: string | null;
  event_start: string | null;
  event_end: string | null;
  expires_at: string | null;
  metadata: PostMetadata | null;
};

type AdminPost = DatabasePost & {
  pageName: string | null;
};

const PAGE_SIZE = 20;
const EXPIRED_BATCH_SIZE = 100;

const POST_SELECT = `
  id,
  group_id,
  user_id,
  title,
  content,
  type,
  created_at,
  event_start,
  event_end,
  expires_at,
  metadata
`;

function todayKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function parseDateKey(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  const directMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);

  if (directMatch) {
    return `${directMatch[1]}-${directMatch[2]}-${directMatch[3]}`;
  }

  const parsed = new Date(trimmed);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function collectMetadataDates(metadata: PostMetadata | null) {
  if (!metadata) {
    return [];
  }

  const possibleValues: unknown[] = [
    metadata.active_dates,
    metadata.dates,
    metadata.date,
    metadata.start_date,
    metadata.end_date,
    metadata.event_date,
  ];

  return Array.from(
    new Set(
      possibleValues
        .flatMap((value) => (Array.isArray(value) ? value : [value]))
        .map(parseDateKey)
        .filter((value): value is string => Boolean(value)),
    ),
  ).sort();
}

function getAllPostDates(post: DatabasePost) {
  return Array.from(
    new Set(
      [
        ...collectMetadataDates(post.metadata),
        parseDateKey(post.event_start),
        parseDateKey(post.event_end),
        parseDateKey(post.expires_at),
      ].filter((value): value is string => Boolean(value)),
    ),
  ).sort();
}

function isExpiredPost(post: DatabasePost) {
  const dates = getAllPostDates(post);

  if (dates.length === 0) {
    return false;
  }

  return !dates.some((date) => date >= todayKey());
}

function getLatestPostDate(post: DatabasePost) {
  const dates = getAllPostDates(post);
  return dates.at(-1) ?? null;
}

function getPostType(post: DatabasePost) {
  const rawType = post.metadata?.public_type || post.type || "post";

  return rawType
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDate(value: string | null) {
  if (!value) {
    return "No date";
  }

  const parsed = new Date(`${value.slice(0, 10)}T12:00:00`);

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(parsed);
}

function getSummary(content: string | null) {
  const cleaned = content?.replace(/\s+/g, " ").trim();

  if (!cleaned) {
    return "No description.";
  }

  return cleaned.length > 150
    ? `${cleaned.slice(0, 150).trimEnd()}…`
    : cleaned;
}

async function addPageNames(posts: DatabasePost[]) {
  const groupIds = Array.from(
    new Set(
      posts
        .map((post) => post.group_id)
        .filter((id): id is string => Boolean(id)),
    ),
  );

  if (groupIds.length === 0) {
    return posts.map<AdminPost>((post) => ({
      ...post,
      pageName: null,
    }));
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from("groups")
    .select("id, name")
    .in("id", groupIds);

  if (error) {
    throw error;
  }

  const names = new Map(
    (data ?? []).map((group) => [
      group.id as string,
      typeof group.name === "string" ? group.name : "Untitled Page",
    ]),
  );

  return posts.map<AdminPost>((post) => ({
    ...post,
    pageName: post.group_id ? names.get(post.group_id) ?? null : null,
  }));
}

export default function Posts() {
  const [posts, setPosts] = useState<AdminPost[]>([]);
  const [expiredPosts, setExpiredPosts] = useState<AdminPost[]>([]);
  const [search, setSearch] = useState("");
  const [submittedSearch, setSubmittedSearch] = useState("");

  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadingExpired, setLoadingExpired] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [expiredOpen, setExpiredOpen] = useState(true);

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const verifyAdmin = useCallback(async () => {
    const supabase = createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      throw new Error("You must be signed in.");
    }

    const { data: profile, error: profileError } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      throw profileError;
    }

    if (profile?.role !== "admin") {
      throw new Error("Administrator access is required.");
    }
  }, []);

  const loadPosts = useCallback(
    async (reset: boolean) => {
      reset ? setLoading(true) : setLoadingMore(true);
      setError("");

      try {
        await verifyAdmin();

        const supabase = createClient();
        const start = reset ? 0 : posts.length;
        const end = start + PAGE_SIZE - 1;

        let query = supabase
          .from("posts")
          .select(POST_SELECT)
          .order("created_at", { ascending: false })
          .range(start, end);

        if (submittedSearch.trim()) {
          const term = submittedSearch.trim().replace(/[%_,()]/g, " ");
          query = query.or(
            `title.ilike.%${term}%,content.ilike.%${term}%,type.ilike.%${term}%`,
          );
        }

        const { data, error: loadError } = await query;

        if (loadError) {
          throw loadError;
        }

        const rawPosts = (data ?? []) as DatabasePost[];
        const namedPosts = await addPageNames(rawPosts);

        setPosts((current) => (reset ? namedPosts : [...current, ...namedPosts]));
        setHasMore(rawPosts.length === PAGE_SIZE);
      } catch (caughtError) {
        console.error("Failed to load admin posts:", caughtError);
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "Posts could not be loaded.",
        );
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [posts.length, submittedSearch, verifyAdmin],
  );

  const loadExpiredPosts = useCallback(async () => {
    setLoadingExpired(true);

    try {
      await verifyAdmin();

      const supabase = createClient();
      const found: DatabasePost[] = [];
      let start = 0;

      while (true) {
        const { data, error: loadError } = await supabase
          .from("posts")
          .select(POST_SELECT)
          .order("created_at", { ascending: false })
          .range(start, start + EXPIRED_BATCH_SIZE - 1);

        if (loadError) {
          throw loadError;
        }

        const batch = (data ?? []) as DatabasePost[];
        found.push(...batch.filter(isExpiredPost));

        if (batch.length < EXPIRED_BATCH_SIZE) {
          break;
        }

        start += EXPIRED_BATCH_SIZE;
      }

      const namedPosts = await addPageNames(found);

      namedPosts.sort((a, b) =>
        (getLatestPostDate(a) ?? "").localeCompare(getLatestPostDate(b) ?? ""),
      );

      setExpiredPosts(namedPosts);
    } catch (caughtError) {
      console.error("Failed to find expired posts:", caughtError);
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Expired posts could not be checked.",
      );
    } finally {
      setLoadingExpired(false);
    }
  }, [verifyAdmin]);

  useEffect(() => {
    void loadPosts(true);
  }, [submittedSearch]);

  useEffect(() => {
    void loadExpiredPosts();
  }, [loadExpiredPosts]);

  async function deletePost(post: AdminPost) {
    if (deletingId) {
      return;
    }

    const confirmed = window.confirm(
      `Delete "${post.title || "Untitled Post"}"? This cannot be undone.`,
    );

    if (!confirmed) {
      return;
    }

    setDeletingId(post.id);
    setError("");

    try {
      await verifyAdmin();

      const supabase = createClient();
      const { data, error: deleteError } = await supabase
        .from("posts")
        .delete()
        .eq("id", post.id)
        .select("id")
        .maybeSingle();

      if (deleteError) {
        throw deleteError;
      }

      if (!data) {
        throw new Error(
          "The post was not deleted. Check the posts DELETE policy for administrators.",
        );
      }

      setPosts((current) => current.filter((item) => item.id !== post.id));
      setExpiredPosts((current) =>
        current.filter((item) => item.id !== post.id),
      );
    } catch (caughtError) {
      console.error("Failed to delete post:", caughtError);
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "The post could not be deleted.",
      );
    } finally {
      setDeletingId(null);
    }
  }

  function submitSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPosts([]);
    setHasMore(true);
    setSubmittedSearch(search);
  }

  function clearSearch() {
    setSearch("");
    setPosts([]);
    setHasMore(true);
    setSubmittedSearch("");
  }

  const visibleExpiredPosts = useMemo(
    () =>
      expiredPosts.filter((post) => {
        if (!submittedSearch.trim()) {
          return true;
        }

        const haystack = [
          post.title,
          post.content,
          post.type,
          post.metadata?.public_type,
          post.pageName,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return haystack.includes(submittedSearch.trim().toLowerCase());
      }),
    [expiredPosts, submittedSearch],
  );

  return (
    <section className="min-h-screen bg-slate-50 px-4 py-8 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-6 border-b border-slate-200 pb-8 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.18em] text-emerald-700">
              Admin
            </p>

            <h1 className="mt-2 text-4xl font-black tracking-[-0.04em] sm:text-5xl">
              Posts
            </h1>

            <p className="mt-3 max-w-2xl leading-7 text-slate-600">
              Search, review and permanently remove posts across East Lothian Online.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              void loadPosts(true);
              void loadExpiredPosts();
            }}
            disabled={loading || loadingExpired}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 text-sm font-black transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw
              className={`h-4 w-4 ${
                loading || loadingExpired ? "animate-spin" : ""
              }`}
            />
            Refresh
          </button>
        </div>

        {error ? (
          <div className="mt-6 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-5 text-sm font-semibold text-red-800">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
            <p>{error}</p>
          </div>
        ) : null}

        <section className="mt-8 overflow-hidden rounded-3xl border border-amber-200 bg-white shadow-sm">
          <button
            type="button"
            onClick={() => setExpiredOpen((current) => !current)}
            className="flex w-full items-center justify-between gap-4 bg-amber-50 px-5 py-5 text-left sm:px-7"
          >
            <div className="flex items-center gap-4">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-amber-100 text-amber-800">
                <CalendarX2 className="h-5 w-5" />
              </div>

              <div>
                <h2 className="text-lg font-black">Recommended for deletion</h2>
                <p className="mt-1 text-sm font-semibold text-amber-900/65">
                  {loadingExpired
                    ? "Checking dated posts…"
                    : `${visibleExpiredPosts.length} expired ${
                        visibleExpiredPosts.length === 1 ? "post" : "posts"
                      } found`}
                </p>
              </div>
            </div>

            <ChevronDown
              className={`h-5 w-5 shrink-0 transition ${
                expiredOpen ? "rotate-180" : ""
              }`}
            />
          </button>

          {expiredOpen ? (
            <div className="divide-y divide-slate-200">
              {loadingExpired ? (
                <div className="flex min-h-40 items-center justify-center gap-3 text-sm font-bold text-slate-500">
                  <LoaderCircle className="h-5 w-5 animate-spin" />
                  Checking every dated post
                </div>
              ) : visibleExpiredPosts.length === 0 ? (
                <div className="px-6 py-12 text-center">
                  <p className="font-black">Nothing looks expired.</p>
                  <p className="mt-2 text-sm text-slate-500">
                    Undated evergreen posts are never recommended automatically.
                  </p>
                </div>
              ) : (
                visibleExpiredPosts.map((post) => (
                  <PostRow
                    key={`expired-${post.id}`}
                    post={post}
                    expired
                    deleting={deletingId === post.id}
                    onDelete={deletePost}
                  />
                ))
              )}
            </div>
          ) : null}
        </section>

        <form
          onSubmit={submitSearch}
          className="mt-8 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:flex-row"
        >
          <label className="relative flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search post title, content or type"
              className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 pl-12 pr-11 text-sm font-semibold outline-none transition focus:border-emerald-600 focus:bg-white"
            />

            {search ? (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg text-slate-500 hover:bg-slate-200"
                aria-label="Clear search field"
              >
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </label>

          <button
            type="submit"
            className="h-12 rounded-xl bg-emerald-700 px-6 text-sm font-black text-white transition hover:bg-emerald-800"
          >
            Search
          </button>

          {submittedSearch ? (
            <button
              type="button"
              onClick={clearSearch}
              className="h-12 rounded-xl border border-slate-300 px-5 text-sm font-black hover:bg-slate-50"
            >
              Show all
            </button>
          ) : null}
        </form>

        <section className="mt-6 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-5 sm:px-7">
            <h2 className="text-xl font-black">
              {submittedSearch ? `Results for “${submittedSearch}”` : "All posts"}
            </h2>

            <p className="mt-1 text-sm font-semibold text-slate-500">
              Loaded {posts.length} {posts.length === 1 ? "post" : "posts"}
            </p>
          </div>

          {loading ? (
            <div className="flex min-h-64 items-center justify-center gap-3 text-sm font-bold text-slate-500">
              <LoaderCircle className="h-5 w-5 animate-spin" />
              Loading posts
            </div>
          ) : posts.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <FileText className="mx-auto h-10 w-10 text-slate-300" />
              <p className="mt-4 font-black">No posts found.</p>
            </div>
          ) : (
            <>
              <div className="divide-y divide-slate-200">
                {posts.map((post) => (
                  <PostRow
                    key={post.id}
                    post={post}
                    expired={isExpiredPost(post)}
                    deleting={deletingId === post.id}
                    onDelete={deletePost}
                  />
                ))}
              </div>

              {hasMore ? (
                <div className="border-t border-slate-200 p-5 text-center">
                  <button
                    type="button"
                    onClick={() => void loadPosts(false)}
                    disabled={loadingMore}
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-slate-950 px-6 text-sm font-black text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {loadingMore ? (
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                    Load more
                  </button>
                </div>
              ) : (
                <div className="border-t border-slate-200 px-5 py-4 text-center text-sm font-bold text-slate-400">
                  All posts loaded
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </section>
  );
}

type PostRowProps = {
  post: AdminPost;
  expired: boolean;
  deleting: boolean;
  onDelete: (post: AdminPost) => Promise<void>;
};

function PostRow({ post, expired, deleting, onDelete }: PostRowProps) {
  const latestDate = getLatestPostDate(post);

  return (
    <article className="flex flex-col gap-5 px-5 py-6 sm:px-7 lg:flex-row lg:items-center lg:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-black text-slate-600">
            {getPostType(post)}
          </span>

          {expired ? (
            <span className="rounded-lg bg-amber-100 px-2.5 py-1 text-xs font-black text-amber-800">
              Expired
            </span>
          ) : null}
        </div>

        <h3 className="mt-3 break-words text-xl font-black tracking-[-0.025em]">
          {post.title?.trim() || "Untitled Post"}
        </h3>

        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          {getSummary(post.content)}
        </p>

        <p className="mt-3 text-xs font-bold text-slate-400">
          {post.pageName || "No page"} · Posted {formatDate(post.created_at)}
          {latestDate ? ` · Last date ${formatDate(latestDate)}` : ""}
        </p>
      </div>

      <div className="flex shrink-0 flex-wrap gap-3">
        <Link
          href={`/posts/${post.id}`}
          target="_blank"
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 px-4 text-sm font-black transition hover:bg-slate-50"
        >
          View
          <ExternalLink className="h-4 w-4" />
        </Link>

        <button
          type="button"
          onClick={() => void onDelete(post)}
          disabled={deleting}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 text-sm font-black text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {deleting ? (
            <LoaderCircle className="h-4 w-4 animate-spin" />
          ) : (
            <Trash2 className="h-4 w-4" />
          )}
          Delete
        </button>
      </div>
    </article>
  );
}
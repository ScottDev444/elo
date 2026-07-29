"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArchiveX,
  ChevronDown,
  ExternalLink,
  Eye,
  EyeOff,
  FileClock,
  LoaderCircle,
  RefreshCw,
  Search,
  Trash2,
  X,
} from "lucide-react";

import { createClient } from "@/lib/supabase/client";

type DatabasePage = {
  id: string;
  name: string;
  slug: string | null;
  description: string | null;
  logo_url: string | null;
  brand_color: string | null;
  status: string | null;
  is_public: boolean | null;
  created_at: string | null;
  submitted_at: string | null;
  approved_at: string | null;
  user_id: string | null;
  is_local_partner: boolean | null;
};

const PAGE_SIZE = 20;
const STALE_DRAFT_DAYS = 30;
const STALE_BATCH_SIZE = 100;

const PAGE_SELECT = `
  id,
  name,
  slug,
  description,
  logo_url,
  brand_color,
  status,
  is_public,
  created_at,
  submitted_at,
  approved_at,
  user_id,
  is_local_partner
`;

function formatDate(value: string | null) {
  if (!value) return "Unknown";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function getAgeInDays(value: string | null) {
  if (!value) return 0;

  const created = new Date(value);

  if (Number.isNaN(created.getTime())) return 0;

  const difference = Date.now() - created.getTime();
  return Math.floor(difference / 86_400_000);
}

function isStaleDraft(page: DatabasePage) {
  const status = page.status?.toLowerCase().trim() || "draft";

  if (status === "pending") return false;
  if (status !== "draft") return false;

  return getAgeInDays(page.created_at) >= STALE_DRAFT_DAYS;
}

function cleanSummary(value: string | null) {
  const cleaned = value?.replace(/\s+/g, " ").trim();

  if (!cleaned) return "No description.";

  return cleaned.length > 150
    ? `${cleaned.slice(0, 150).trimEnd()}…`
    : cleaned;
}

export default function Pages() {
  const [pages, setPages] = useState<DatabasePage[]>([]);
  const [staleDrafts, setStaleDrafts] = useState<DatabasePage[]>([]);

  const [search, setSearch] = useState("");
  const [submittedSearch, setSubmittedSearch] = useState("");

  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadingStale, setLoadingStale] = useState(true);
  const [hasMore, setHasMore] = useState(true);

  const [staleOpen, setStaleOpen] = useState(true);

  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DatabasePage | null>(null);
  const [deleteText, setDeleteText] = useState("");
  const [deleting, setDeleting] = useState(false);

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

    if (profileError) throw profileError;

    if (profile?.role !== "admin") {
      throw new Error("Administrator access is required.");
    }
  }, []);

  const loadPages = useCallback(
    async (reset: boolean) => {
      reset ? setLoading(true) : setLoadingMore(true);
      setError("");

      try {
        await verifyAdmin();

        const supabase = createClient();
        const start = reset ? 0 : pages.length;
        const end = start + PAGE_SIZE - 1;

        let query = supabase
          .from("groups")
          .select(PAGE_SELECT)
          .order("created_at", { ascending: false })
          .range(start, end);

        if (submittedSearch.trim()) {
          const term = submittedSearch.trim().replace(/[%_,()]/g, " ");

          query = query.or(
            `name.ilike.%${term}%,description.ilike.%${term}%,slug.ilike.%${term}%,status.ilike.%${term}%`,
          );
        }

        const { data, error: loadError } = await query;

        if (loadError) throw loadError;

        const loaded = (data ?? []) as DatabasePage[];

        setPages((current) => (reset ? loaded : [...current, ...loaded]));
        setHasMore(loaded.length === PAGE_SIZE);
      } catch (caughtError) {
        console.error("Failed to load admin pages:", caughtError);
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "Pages could not be loaded.",
        );
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [pages.length, submittedSearch, verifyAdmin],
  );

  const loadStaleDrafts = useCallback(async () => {
    setLoadingStale(true);

    try {
      await verifyAdmin();

      const supabase = createClient();
      const found: DatabasePage[] = [];
      let start = 0;

      while (true) {
        const { data, error: loadError } = await supabase
          .from("groups")
          .select(PAGE_SELECT)
          .order("created_at", { ascending: true })
          .range(start, start + STALE_BATCH_SIZE - 1);

        if (loadError) throw loadError;

        const batch = (data ?? []) as DatabasePage[];
        found.push(...batch.filter(isStaleDraft));

        if (batch.length < STALE_BATCH_SIZE) break;

        start += STALE_BATCH_SIZE;
      }

      setStaleDrafts(found);
    } catch (caughtError) {
      console.error("Failed to check stale drafts:", caughtError);
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Stale draft pages could not be checked.",
      );
    } finally {
      setLoadingStale(false);
    }
  }, [verifyAdmin]);

  useEffect(() => {
    void loadPages(true);
  }, [submittedSearch]);

  useEffect(() => {
    void loadStaleDrafts();
  }, [loadStaleDrafts]);

  async function toggleVisibility(page: DatabasePage) {
    if (updatingId) return;

    setUpdatingId(page.id);
    setError("");

    try {
      await verifyAdmin();

      const supabase = createClient();
      const nextValue = !page.is_public;

      const { data, error: updateError } = await supabase
        .from("groups")
        .update({ is_public: nextValue })
        .eq("id", page.id)
        .select(PAGE_SELECT)
        .maybeSingle();

      if (updateError) throw updateError;

      if (!data) {
        throw new Error(
          "The page was not updated. Check the groups UPDATE policy for administrators.",
        );
      }

      const updatedPage = data as DatabasePage;

      setPages((current) =>
        current.map((item) => (item.id === page.id ? updatedPage : item)),
      );

      setStaleDrafts((current) =>
        current.map((item) => (item.id === page.id ? updatedPage : item)),
      );
    } catch (caughtError) {
      console.error("Failed to update page visibility:", caughtError);
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Page visibility could not be updated.",
      );
    } finally {
      setUpdatingId(null);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget || deleteText !== "DELETE" || deleting) return;

    setDeleting(true);
    setError("");

    try {
      await verifyAdmin();

      const supabase = createClient();

      const { data, error: deleteError } = await supabase
        .from("groups")
        .delete()
        .eq("id", deleteTarget.id)
        .select("id")
        .maybeSingle();

      if (deleteError) throw deleteError;

      if (!data) {
        throw new Error(
          "The page was not deleted. Check the groups DELETE policy for administrators.",
        );
      }

      setPages((current) =>
        current.filter((item) => item.id !== deleteTarget.id),
      );

      setStaleDrafts((current) =>
        current.filter((item) => item.id !== deleteTarget.id),
      );

      closeDeleteModal();
    } catch (caughtError) {
      console.error("Failed to delete page:", caughtError);
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "The page could not be deleted.",
      );
    } finally {
      setDeleting(false);
    }
  }

  function openDeleteModal(page: DatabasePage) {
    setDeleteTarget(page);
    setDeleteText("");
  }

  function closeDeleteModal() {
    if (deleting) return;

    setDeleteTarget(null);
    setDeleteText("");
  }

  function submitSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPages([]);
    setHasMore(true);
    setSubmittedSearch(search);
  }

  function clearSearch() {
    setSearch("");
    setPages([]);
    setHasMore(true);
    setSubmittedSearch("");
  }

  const visibleStaleDrafts = useMemo(() => {
    const term = submittedSearch.trim().toLowerCase();

    if (!term) return staleDrafts;

    return staleDrafts.filter((page) =>
      [page.name, page.description, page.slug, page.status]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(term),
    );
  }, [staleDrafts, submittedSearch]);

  return (
    <section className="min-h-screen bg-slate-50 px-4 py-8 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-6 border-b border-slate-200 pb-8 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.18em] text-emerald-700">
              Admin
            </p>

            <h1 className="mt-2 text-4xl font-black tracking-[-0.04em] sm:text-5xl">
              Pages
            </h1>

            <p className="mt-3 max-w-2xl leading-7 text-slate-600">
              Review every page, control visibility and remove abandoned drafts.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              void loadPages(true);
              void loadStaleDrafts();
            }}
            disabled={loading || loadingStale}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 text-sm font-black transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw
              className={`h-4 w-4 ${
                loading || loadingStale ? "animate-spin" : ""
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
            onClick={() => setStaleOpen((current) => !current)}
            className="flex w-full items-center justify-between gap-4 bg-amber-50 px-5 py-5 text-left sm:px-7"
          >
            <div className="flex items-center gap-4">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-amber-100 text-amber-800">
                <FileClock className="h-5 w-5" />
              </div>

              <div>
                <h2 className="text-lg font-black">Recommended for deletion</h2>
                <p className="mt-1 text-sm font-semibold text-amber-900/65">
                  {loadingStale
                    ? "Checking old drafts…"
                    : `${visibleStaleDrafts.length} stale ${
                        visibleStaleDrafts.length === 1 ? "draft" : "drafts"
                      } older than ${STALE_DRAFT_DAYS} days`}
                </p>
              </div>
            </div>

            <ChevronDown
              className={`h-5 w-5 shrink-0 transition ${
                staleOpen ? "rotate-180" : ""
              }`}
            />
          </button>

          {staleOpen ? (
            <div className="divide-y divide-slate-200">
              {loadingStale ? (
                <div className="flex min-h-40 items-center justify-center gap-3 text-sm font-bold text-slate-500">
                  <LoaderCircle className="h-5 w-5 animate-spin" />
                  Checking draft pages
                </div>
              ) : visibleStaleDrafts.length === 0 ? (
                <div className="px-6 py-12 text-center">
                  <p className="font-black">No abandoned drafts found.</p>
                  <p className="mt-2 text-sm text-slate-500">
                    Pending pages are never included here.
                  </p>
                </div>
              ) : (
                visibleStaleDrafts.map((page) => (
                  <PageRow
                    key={`stale-${page.id}`}
                    page={page}
                    stale
                    updating={updatingId === page.id}
                    onToggleVisibility={toggleVisibility}
                    onDelete={openDeleteModal}
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
              placeholder="Search page name, description, slug or status"
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
              {submittedSearch ? `Results for “${submittedSearch}”` : "All pages"}
            </h2>

            <p className="mt-1 text-sm font-semibold text-slate-500">
              Loaded {pages.length} {pages.length === 1 ? "page" : "pages"}
            </p>
          </div>

          {loading ? (
            <div className="flex min-h-64 items-center justify-center gap-3 text-sm font-bold text-slate-500">
              <LoaderCircle className="h-5 w-5 animate-spin" />
              Loading pages
            </div>
          ) : pages.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <ArchiveX className="mx-auto h-10 w-10 text-slate-300" />
              <p className="mt-4 font-black">No pages found.</p>
            </div>
          ) : (
            <>
              <div className="divide-y divide-slate-200">
                {pages.map((page) => (
                  <PageRow
                    key={page.id}
                    page={page}
                    stale={isStaleDraft(page)}
                    updating={updatingId === page.id}
                    onToggleVisibility={toggleVisibility}
                    onDelete={openDeleteModal}
                  />
                ))}
              </div>

              {hasMore ? (
                <div className="border-t border-slate-200 p-5 text-center">
                  <button
                    type="button"
                    onClick={() => void loadPages(false)}
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
                  All pages loaded
                </div>
              )}
            </>
          )}
        </section>
      </div>

      {deleteTarget ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeDeleteModal();
          }}
        >
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl sm:p-8">
            <div className="flex items-start justify-between gap-4">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-red-100 text-red-700">
                <Trash2 className="h-5 w-5" />
              </div>

              <button
                type="button"
                onClick={closeDeleteModal}
                disabled={deleting}
                className="grid h-10 w-10 place-items-center rounded-xl text-slate-500 hover:bg-slate-100 disabled:opacity-50"
                aria-label="Close delete confirmation"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <h2 className="mt-6 text-2xl font-black tracking-[-0.03em]">
              Delete {deleteTarget.name}?
            </h2>

            <p className="mt-3 leading-7 text-slate-600">
              This permanently deletes the page. Type{" "}
              <strong className="text-slate-950">DELETE</strong> to confirm.
            </p>

            <input
              autoFocus
              value={deleteText}
              onChange={(event) => setDeleteText(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && deleteText === "DELETE") {
                  void confirmDelete();
                }
              }}
              placeholder="DELETE"
              className="mt-6 h-12 w-full rounded-xl border border-slate-300 px-4 font-black outline-none transition focus:border-red-500"
            />

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeDeleteModal}
                disabled={deleting}
                className="h-12 rounded-xl border border-slate-300 px-5 text-sm font-black hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() => void confirmDelete()}
                disabled={deleteText !== "DELETE" || deleting}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-red-600 px-5 text-sm font-black text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {deleting ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                Delete permanently
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

type PageRowProps = {
  page: DatabasePage;
  stale: boolean;
  updating: boolean;
  onToggleVisibility: (page: DatabasePage) => Promise<void>;
  onDelete: (page: DatabasePage) => void;
};

function PageRow({
  page,
  stale,
  updating,
  onToggleVisibility,
  onDelete,
}: PageRowProps) {
  const status = page.status?.trim() || "draft";
  const age = getAgeInDays(page.created_at);

  return (
    <article className="flex flex-col gap-5 px-5 py-6 sm:px-7 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex min-w-0 items-start gap-4">
        <div
          className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 font-black text-white"
          style={{ backgroundColor: page.brand_color || "#64748b" }}
        >
          {page.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={page.logo_url}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            page.name.slice(0, 1).toUpperCase()
          )}
        </div>

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-black capitalize text-slate-600">
              {status}
            </span>

            <span
              className={`rounded-lg px-2.5 py-1 text-xs font-black ${
                page.is_public
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-slate-200 text-slate-700"
              }`}
            >
              {page.is_public ? "Public" : "Private"}
            </span>

            {page.is_local_partner ? (
              <span className="rounded-lg bg-violet-100 px-2.5 py-1 text-xs font-black text-violet-800">
                Local Partner
              </span>
            ) : null}

            {stale ? (
              <span className="rounded-lg bg-amber-100 px-2.5 py-1 text-xs font-black text-amber-800">
                Stale draft
              </span>
            ) : null}
          </div>

          <h3 className="mt-3 break-words text-xl font-black tracking-[-0.025em]">
            {page.name}
          </h3>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            {cleanSummary(page.description)}
          </p>

          <p className="mt-3 text-xs font-bold text-slate-400">
            Created {formatDate(page.created_at)} · {age} days old
            {page.slug ? ` · /${page.slug}` : ""}
          </p>
        </div>
      </div>

      <div className="flex shrink-0 flex-wrap gap-3">
        {page.slug ? (
          <Link
            href={`/pages/${page.slug}`}
            target="_blank"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 px-4 text-sm font-black transition hover:bg-slate-50"
          >
            View
            <ExternalLink className="h-4 w-4" />
          </Link>
        ) : null}

        <button
          type="button"
          onClick={() => void onToggleVisibility(page)}
          disabled={updating}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 px-4 text-sm font-black transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {updating ? (
            <LoaderCircle className="h-4 w-4 animate-spin" />
          ) : page.is_public ? (
            <EyeOff className="h-4 w-4" />
          ) : (
            <Eye className="h-4 w-4" />
          )}
          Make {page.is_public ? "private" : "public"}
        </button>

        <button
          type="button"
          onClick={() => onDelete(page)}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 text-sm font-black text-red-700 transition hover:bg-red-100"
        >
          <Trash2 className="h-4 w-4" />
          Delete
        </button>
      </div>
    </article>
  );
}
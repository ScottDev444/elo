"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  LoaderCircle,
  MapPin,
  RefreshCw,
  Search,
  ShieldCheck,
  X,
} from "lucide-react";

import { createClient } from "@/lib/supabase/client";

type FeaturePage = {
  id: string;
  name: string;
  slug: string | null;
  logo_url: string | null;
  brand_color: string | null;
  status: string | null;
  is_local_partner: boolean | null;
  place_enabled: boolean | null;
  created_at: string | null;
};

const PAGE_SIZE = 20;

const PAGE_SELECT = `
  id,
  name,
  slug,
  logo_url,
  brand_color,
  status,
  is_local_partner,
  place_enabled,
  created_at
`;

export default function Features() {
  const [pages, setPages] = useState<FeaturePage[]>([]);
  const [search, setSearch] = useState("");
  const [submittedSearch, setSubmittedSearch] = useState("");

  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [updatingKey, setUpdatingKey] = useState<string | null>(null);
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
          .eq("status", "approved")
          .order("name", { ascending: true })
          .range(start, end);

        if (submittedSearch.trim()) {
          const term = submittedSearch.trim().replace(/[%_,()]/g, " ");

          query = query.or(
            `name.ilike.%${term}%,slug.ilike.%${term}%`,
          );
        }

        const { data, error: loadError } = await query;

        if (loadError) throw loadError;

        const loaded = (data ?? []) as FeaturePage[];

        setPages((current) => (reset ? loaded : [...current, ...loaded]));
        setHasMore(loaded.length === PAGE_SIZE);
      } catch (caughtError) {
        console.error("Failed to load feature access:", caughtError);
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "Approved pages could not be loaded.",
        );
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [pages.length, submittedSearch, verifyAdmin],
  );

  useEffect(() => {
    void loadPages(true);
  }, [submittedSearch]);

  async function toggleFeature(
    page: FeaturePage,
    field: "is_local_partner" | "place_enabled",
  ) {
    const key = `${page.id}:${field}`;

    if (updatingKey) return;

    setUpdatingKey(key);
    setError("");

    try {
      await verifyAdmin();

      const supabase = createClient();
      const nextValue = !Boolean(page[field]);

      const { data, error: updateError } = await supabase
        .from("groups")
        .update({ [field]: nextValue })
        .eq("id", page.id)
        .eq("status", "approved")
        .select(PAGE_SELECT)
        .maybeSingle();

      if (updateError) throw updateError;

      if (!data) {
        throw new Error(
          "The page was not updated. Check the groups UPDATE policy for administrators.",
        );
      }

      const updated = data as FeaturePage;

      setPages((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      );
    } catch (caughtError) {
      console.error(`Failed to update ${field}:`, caughtError);
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "The feature could not be updated.",
      );
    } finally {
      setUpdatingKey(null);
    }
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

  return (
    <section className="min-h-screen bg-slate-50 px-4 py-8 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-6 border-b border-slate-200 pb-8 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.18em] text-emerald-700">
              Admin
            </p>

            <h1 className="mt-2 text-4xl font-black tracking-[-0.04em] sm:text-5xl">
              Features
            </h1>

            <p className="mt-3 max-w-2xl leading-7 text-slate-600">
              Control Local Partner and Place access for approved pages.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void loadPages(true)}
            disabled={loading}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 text-sm font-black transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw
              className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
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

        <form
          onSubmit={submitSearch}
          className="mt-8 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:flex-row"
        >
          <label className="relative flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />

            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search approved pages"
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
              {submittedSearch ? `Results for “${submittedSearch}”` : "Approved pages"}
            </h2>

            <p className="mt-1 text-sm font-semibold text-slate-500">
              Loaded {pages.length} {pages.length === 1 ? "page" : "pages"}
            </p>
          </div>

          {loading ? (
            <div className="flex min-h-64 items-center justify-center gap-3 text-sm font-bold text-slate-500">
              <LoaderCircle className="h-5 w-5 animate-spin" />
              Loading approved pages
            </div>
          ) : pages.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <CheckCircle2 className="mx-auto h-10 w-10 text-slate-300" />
              <p className="mt-4 font-black">No approved pages found.</p>
            </div>
          ) : (
            <>
              <div className="divide-y divide-slate-200">
                {pages.map((page) => (
                  <FeatureRow
                    key={page.id}
                    page={page}
                    updatingKey={updatingKey}
                    onToggle={toggleFeature}
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
                  All approved pages loaded
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </section>
  );
}

type FeatureRowProps = {
  page: FeaturePage;
  updatingKey: string | null;
  onToggle: (
    page: FeaturePage,
    field: "is_local_partner" | "place_enabled",
  ) => Promise<void>;
};

function FeatureRow({
  page,
  updatingKey,
  onToggle,
}: FeatureRowProps) {
  const partnerKey = `${page.id}:is_local_partner`;
  const placeKey = `${page.id}:place_enabled`;

  return (
    <article className="flex flex-col gap-5 px-5 py-6 sm:px-7 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex min-w-0 items-center gap-4">
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
            <span className="rounded-lg bg-emerald-100 px-2.5 py-1 text-xs font-black text-emerald-800">
              Approved
            </span>

            {page.is_local_partner ? (
              <span className="rounded-lg bg-violet-100 px-2.5 py-1 text-xs font-black text-violet-800">
                Local Partner
              </span>
            ) : null}

            {page.place_enabled ? (
              <span className="rounded-lg bg-blue-100 px-2.5 py-1 text-xs font-black text-blue-800">
                Place enabled
              </span>
            ) : null}
          </div>

          <h3 className="mt-3 break-words text-xl font-black tracking-[-0.025em]">
            {page.name}
          </h3>

          <p className="mt-2 text-sm font-semibold text-slate-500">
            {page.slug ? `/${page.slug}` : "No slug"}
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:min-w-[430px]">
        <FeatureToggle
          icon={<ShieldCheck className="h-5 w-5" />}
          title="Local Partner"
          description="Partner features and benefits"
          enabled={Boolean(page.is_local_partner)}
          loading={updatingKey === partnerKey}
          disabled={Boolean(updatingKey)}
          onClick={() => void onToggle(page, "is_local_partner")}
        />

        <FeatureToggle
          icon={<MapPin className="h-5 w-5" />}
          title="Place access"
          description="Allows Place creation and editing"
          enabled={Boolean(page.place_enabled)}
          loading={updatingKey === placeKey}
          disabled={Boolean(updatingKey)}
          onClick={() => void onToggle(page, "place_enabled")}
        />
      </div>
    </article>
  );
}

type FeatureToggleProps = {
  icon: React.ReactNode;
  title: string;
  description: string;
  enabled: boolean;
  loading: boolean;
  disabled: boolean;
  onClick: () => void;
};

function FeatureToggle({
  icon,
  title,
  description,
  enabled,
  loading,
  disabled,
  onClick,
}: FeatureToggleProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center justify-between gap-4 rounded-2xl border p-4 text-left transition disabled:cursor-not-allowed disabled:opacity-60 ${
        enabled
          ? "border-emerald-200 bg-emerald-50"
          : "border-slate-200 bg-slate-50 hover:bg-slate-100"
      }`}
    >
      <div className="flex min-w-0 items-center gap-3">
        <div
          className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${
            enabled
              ? "bg-emerald-100 text-emerald-700"
              : "bg-white text-slate-500"
          }`}
        >
          {loading ? (
            <LoaderCircle className="h-5 w-5 animate-spin" />
          ) : (
            icon
          )}
        </div>

        <div className="min-w-0">
          <p className="font-black">{title}</p>
          <p className="mt-1 text-xs font-semibold text-slate-500">
            {description}
          </p>
        </div>
      </div>

      <span
        className={`relative h-7 w-12 shrink-0 rounded-full transition ${
          enabled ? "bg-emerald-600" : "bg-slate-300"
        }`}
      >
        <span
          className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow-sm transition ${
            enabled ? "left-6" : "left-1"
          }`}
        />
      </span>
    </button>
  );
}
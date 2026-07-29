"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  Eye,
  LoaderCircle,
  MousePointerClick,
  RefreshCw,
  TrendingUp,
} from "lucide-react";

import { createClient } from "@/lib/supabase/client";

type OwnedPage = {
  id: string;
  name: string;
  is_local_partner: boolean | null;
};

type OwnedPost = {
  id: string;
  group_id: string | null;
  title: string | null;
  created_at: string | null;
};

type AnalyticsRow = {
  post_id: string;
  event_type: "impression" | "conversion";
  created_at: string | null;
};

type PostPerformance = {
  id: string;
  title: string;
  createdAt: string | null;
  impressions: number;
  conversions: number;
  conversionRate: number;
};

function formatDate(value: string | null) {
  if (!value) return "Date unavailable";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Date unavailable";
  }

  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getConversionRate(
  impressions: number,
  conversions: number,
) {
  if (impressions <= 0) return 0;

  return (conversions / impressions) * 100;
}

export default function Analytics() {
  const [pages, setPages] = useState<OwnedPage[]>([]);
  const [posts, setPosts] = useState<OwnedPost[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsRow[]>([]);
  const [selectedPageId, setSelectedPageId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadAnalytics = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const supabase = createClient();

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        throw new Error("You must be signed in.");
      }

      const { data: pageData, error: pageError } = await supabase
        .from("groups")
        .select("id, name, is_local_partner")
        .eq("user_id", user.id)
        .eq("status", "approved")
        .order("name", { ascending: true });

      if (pageError) throw pageError;

      const ownedPages = (pageData ?? []) as OwnedPage[];
      const partnerPages = ownedPages.filter(
        (page) => page.is_local_partner === true,
      );

      setPages(partnerPages);

      const activePageId =
        selectedPageId &&
        partnerPages.some((page) => page.id === selectedPageId)
          ? selectedPageId
          : partnerPages[0]?.id ?? "";

      setSelectedPageId(activePageId);

      if (!activePageId) {
        setPosts([]);
        setAnalytics([]);
        return;
      }

      const { data: postData, error: postError } = await supabase
        .from("posts")
        .select("id, group_id, title, created_at")
        .eq("group_id", activePageId)
        .order("created_at", { ascending: false });

      if (postError) throw postError;

      const ownedPosts = (postData ?? []) as OwnedPost[];
      setPosts(ownedPosts);

      const postIds = ownedPosts.map((post) => post.id);

      if (postIds.length === 0) {
        setAnalytics([]);
        return;
      }

      const { data: analyticsData, error: analyticsError } =
        await supabase
          .from("post_analytics")
          .select("post_id, event_type, created_at")
          .in("post_id", postIds);

      if (analyticsError) throw analyticsError;

      setAnalytics((analyticsData ?? []) as AnalyticsRow[]);
    } catch (caughtError) {
      console.error("Failed to load analytics:", caughtError);

      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Analytics could not be loaded.",
      );
    } finally {
      setLoading(false);
    }
  }, [selectedPageId]);

  useEffect(() => {
    void loadAnalytics();
  }, [loadAnalytics]);

  const performance = useMemo<PostPerformance[]>(() => {
    const counts = new Map<
      string,
      {
        impressions: number;
        conversions: number;
      }
    >();

    for (const row of analytics) {
      const current = counts.get(row.post_id) ?? {
        impressions: 0,
        conversions: 0,
      };

      if (row.event_type === "impression") {
        current.impressions += 1;
      }

      if (row.event_type === "conversion") {
        current.conversions += 1;
      }

      counts.set(row.post_id, current);
    }

    return posts
      .map((post) => {
        const totals = counts.get(post.id) ?? {
          impressions: 0,
          conversions: 0,
        };

        return {
          id: post.id,
          title: post.title?.trim() || "Untitled Post",
          createdAt: post.created_at,
          impressions: totals.impressions,
          conversions: totals.conversions,
          conversionRate: getConversionRate(
            totals.impressions,
            totals.conversions,
          ),
        };
      })
      .sort((a, b) => {
        if (b.impressions !== a.impressions) {
          return b.impressions - a.impressions;
        }

        return b.conversions - a.conversions;
      });
  }, [analytics, posts]);

  const totals = useMemo(() => {
    const impressions = performance.reduce(
      (sum, post) => sum + post.impressions,
      0,
    );

    const conversions = performance.reduce(
      (sum, post) => sum + post.conversions,
      0,
    );

    return {
      impressions,
      conversions,
      conversionRate: getConversionRate(
        impressions,
        conversions,
      ),
    };
  }, [performance]);

  function handlePageChange(pageId: string) {
    setSelectedPageId(pageId);
  }

  return (
    <section className="bg-white px-5 py-12 text-black sm:px-8 lg:px-12 lg:py-16">
      <div className="mx-auto w-full max-w-7xl">
        <div className="flex flex-col gap-5 border-b border-black/10 pb-8 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.18em] text-emerald-700">
              Local Partner
            </p>

            <h2 className="mt-3 text-4xl font-black tracking-[-0.05em] sm:text-5xl">
              Analytics.
            </h2>

            <p className="mt-4 max-w-2xl leading-7 text-black/55">
              See how often your posts were seen and how many people opened
              them.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void loadAnalytics()}
            disabled={loading}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-black/15 px-5 text-sm font-black transition hover:bg-black/[0.03] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw
              className={`h-4 w-4 ${
                loading ? "animate-spin" : ""
              }`}
            />
            Refresh
          </button>
        </div>

        {error ? (
          <div className="mt-8 rounded-2xl bg-red-50 px-5 py-4 text-sm font-bold text-red-800">
            {error}
          </div>
        ) : null}

        {loading ? (
          <div className="flex min-h-72 items-center justify-center gap-3 text-sm font-black text-black/45">
            <LoaderCircle className="h-6 w-6 animate-spin text-emerald-700" />
            Loading analytics
          </div>
        ) : pages.length === 0 ? (
          <div className="mt-8 rounded-3xl border border-black/10 px-6 py-14 text-center">
            <BarChart3 className="mx-auto h-10 w-10 text-black/25" />

            <h3 className="mt-5 text-2xl font-black">
              No Local Partner Pages found.
            </h3>

            <p className="mx-auto mt-3 max-w-lg leading-7 text-black/50">
              Analytics are available for approved Pages with an active Local
              Partnership.
            </p>
          </div>
        ) : (
          <>
            <div className="mt-8 max-w-xl">
              <label
                htmlFor="analytics-page"
                className="block text-sm font-black"
              >
                Page
              </label>

              <select
                id="analytics-page"
                value={selectedPageId}
                onChange={(event) =>
                  handlePageChange(event.target.value)
                }
                className="mt-3 h-14 w-full rounded-2xl border border-black/15 bg-white px-4 font-bold outline-none transition focus:border-emerald-700 focus:ring-4 focus:ring-emerald-100"
              >
                {pages.map((page) => (
                  <option key={page.id} value={page.id}>
                    {page.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              <article className="rounded-3xl border border-black/10 p-6">
                <div className="flex items-center gap-3 text-emerald-700">
                  <Eye className="h-5 w-5" />
                  <p className="text-sm font-black uppercase tracking-[0.12em]">
                    Views
                  </p>
                </div>

                <p className="mt-5 text-4xl font-black tracking-[-0.05em]">
                  {totals.impressions.toLocaleString("en-GB")}
                </p>

                <p className="mt-2 text-sm text-black/45">
                  Times your posts were seen
                </p>
              </article>

              <article className="rounded-3xl border border-black/10 p-6">
                <div className="flex items-center gap-3 text-emerald-700">
                  <MousePointerClick className="h-5 w-5" />
                  <p className="text-sm font-black uppercase tracking-[0.12em]">
                    Clicks
                  </p>
                </div>

                <p className="mt-5 text-4xl font-black tracking-[-0.05em]">
                  {totals.conversions.toLocaleString("en-GB")}
                </p>

                <p className="mt-2 text-sm text-black/45">
                  Times a post was opened
                </p>
              </article>

              <article className="rounded-3xl border border-black/10 p-6">
                <div className="flex items-center gap-3 text-emerald-700">
                  <TrendingUp className="h-5 w-5" />
                  <p className="text-sm font-black uppercase tracking-[0.12em]">
                    Conversion
                  </p>
                </div>

                <p className="mt-5 text-4xl font-black tracking-[-0.05em]">
                  {totals.conversionRate.toFixed(1)}%
                </p>

                <p className="mt-2 text-sm text-black/45">
                  Views that became clicks
                </p>
              </article>
            </div>

            <section className="mt-12">
              <h3 className="text-2xl font-black tracking-[-0.03em]">
                Post performance
              </h3>

              {performance.length === 0 ? (
                <div className="mt-6 rounded-3xl border border-black/10 px-6 py-12 text-center text-black/45">
                  This Page has no posts yet.
                </div>
              ) : (
                <div className="mt-6 divide-y divide-black/10 border-y border-black/10">
                  {performance.map((post) => (
                    <article
                      key={post.id}
                      className="grid gap-5 py-6 md:grid-cols-[minmax(0,1fr)_auto]"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-lg font-black">
                          {post.title}
                        </p>

                        <p className="mt-2 text-sm text-black/45">
                          Published {formatDate(post.createdAt)}
                        </p>
                      </div>

                      <div className="grid grid-cols-3 gap-5 text-right sm:gap-8">
                        <div>
                          <p className="text-xs font-black uppercase tracking-[0.1em] text-black/35">
                            Views
                          </p>

                          <p className="mt-2 font-black">
                            {post.impressions.toLocaleString("en-GB")}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs font-black uppercase tracking-[0.1em] text-black/35">
                            Clicks
                          </p>

                          <p className="mt-2 font-black">
                            {post.conversions.toLocaleString("en-GB")}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs font-black uppercase tracking-[0.1em] text-black/35">
                            Rate
                          </p>

                          <p className="mt-2 font-black text-emerald-700">
                            {post.conversionRate.toFixed(1)}%
                          </p>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </section>
  );
}
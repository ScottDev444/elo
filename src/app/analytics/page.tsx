"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ComponentType,
} from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  BarChart3,
  ChevronRight,
  Eye,
  Layers3,
  LoaderCircle,
  MousePointerClick,
  RefreshCw,
  ShieldCheck,
  TrendingUp,
  Trophy,
  type LucideProps,
} from "lucide-react";

import SiteHeader from "@/components/SiteHeader";
import { createClient } from "@/lib/supabase/client";

type PageAccessRow = {
  id: string;
  name: string;
  slug: string | null;
  is_local_partner: boolean | null;
};

type PerformanceRow = {
  post_id: string;
  title: string;
  type: string;
  created_at: string;
  views: number;
  clicks: number;
  conversion_rate: number;
};

type AnalyticsPayload = {
  page_id: string;
  period_days: number;
  views: number;
  clicks: number;
  conversion_rate: number;
  posts_seen: number;
  previous_views: number;
  previous_clicks: number;
  previous_conversion_rate: number;
  performance: PerformanceRow[];
};

function isEastLothianOnlinePage(
  page: PageAccessRow | null
) {
  if (!page) {
    return false;
  }

  return (
    page.slug
      ?.trim()
      .toLowerCase() ===
      "east-lothian-online" ||
    page.name
      .trim()
      .toLowerCase() ===
      "east lothian online"
  );
}

function percentChange(
  current: number,
  previous: number
) {
  if (previous === 0) {
    return current > 0
      ? 100
      : 0;
  }

  return Math.round(
    ((current - previous) /
      previous) *
      100
  );
}

function formatDate(value: string) {
  const date = new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "";
  }

  return new Intl.DateTimeFormat(
    "en-GB",
    {
      day: "numeric",
      month: "short",
      year: "numeric",
    }
  ).format(date);
}

function formatNumber(value: number) {
  return value.toLocaleString(
    "en-GB"
  );
}

function typeLabel(value: string) {
  const clean =
    value
      .trim()
      .toLowerCase();

  if (clean === "event") {
    return "EVENT";
  }

  if (clean === "deal") {
    return "DEAL";
  }

  if (clean === "update") {
    return "UPDATE";
  }

  if (clean === "popup") {
    return "POP-UP";
  }

  if (clean === "alert") {
    return "ALERT";
  }

  if (clean === "advert") {
    return "ADVERT";
  }

  return clean.toUpperCase();
}

type StatCardProps = {
  icon: ComponentType<LucideProps>;
  label: string;
  value: string;
  helper: string;
  change?: number;
};

function StatCard({
  icon: Icon,
  label,
  value,
  helper,
  change,
}: StatCardProps) {
  const hasChange =
    typeof change === "number";

  const positive =
    (change ?? 0) >= 0;

  return (
    <div className="elo-analytics-stat-card">
      <div className="elo-analytics-stat-top">
        <div className="elo-analytics-stat-icon">
          <Icon
            size={20}
            strokeWidth={2.1}
          />
        </div>

        {hasChange && (
          <div
            className={`elo-analytics-change-badge ${
              positive
                ? "is-positive"
                : "is-negative"
            }`}
          >
            {positive ? (
              <ArrowUp
                size={11}
              />
            ) : (
              <ArrowDown
                size={11}
              />
            )}

            <span>
              {Math.abs(
                change ?? 0
              )}
              %
            </span>
          </div>
        )}
      </div>

      <div className="elo-analytics-stat-value">
        {value}
      </div>

      <div className="elo-analytics-stat-label">
        {label}
      </div>

      <div className="elo-analytics-stat-helper">
        {helper}
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  const router = useRouter();

  const supabase =
    useMemo(
      () => createClient(),
      []
    );

  const [
    pageId,
    setPageId,
  ] =
    useState<
      string | undefined
    >(undefined);

  const [
    queryReady,
    setQueryReady,
  ] =
    useState(false);

  const [
    periodDays,
    setPeriodDays,
  ] =
    useState<
      7 | 30 | 90
    >(30);

  const [
    page,
    setPage,
  ] =
    useState<
      PageAccessRow | null
    >(null);

  const [
    analytics,
    setAnalytics,
  ] =
    useState<
      AnalyticsPayload | null
    >(null);

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    refreshing,
    setRefreshing,
  ] =
    useState(false);

  const [
    denied,
    setDenied,
  ] =
    useState(false);

  const [
    error,
    setError,
  ] =
    useState<
      string | null
    >(null);

  useEffect(() => {
    const params =
      new URLSearchParams(
        window.location.search
      );

    const value =
      params
        .get("pageId")
        ?.trim();

    setPageId(
      value || undefined
    );

    setQueryReady(true);
  }, []);

  const loadAnalytics =
    useCallback(
      async (
        showLoader = true
      ) => {
        if (!queryReady) {
          return;
        }

        if (showLoader) {
          setLoading(true);
        }

        setDenied(false);
        setError(null);

        try {
          const {
            data: {
              session,
            },
            error:
              sessionError,
          } =
            await supabase
              .auth
              .getSession();

          if (
            sessionError
          ) {
            throw sessionError;
          }

          const user =
            session?.user;

          if (!user) {
            setDenied(true);
            setPage(null);
            setAnalytics(null);
            return;
          }

          let pageQuery =
            supabase
              .from("groups")
              .select(`
                id,
                name,
                slug,
                is_local_partner
              `)
              .eq(
                "user_id",
                user.id
              );

          if (pageId) {
            pageQuery =
              pageQuery.eq(
                "id",
                pageId
              );
          } else {
            pageQuery =
              pageQuery.order(
                "created_at",
                {
                  ascending:
                    true,
                }
              );
          }

          const {
            data:
              pageData,
            error:
              pageError,
          } =
            await pageQuery
              .limit(1)
              .maybeSingle();

          if (pageError) {
            throw pageError;
          }

          const ownedPage =
            (
              pageData ??
              null
            ) as
              | PageAccessRow
              | null;

          setPage(
            ownedPage
          );

          const allowed =
            ownedPage
              ?.is_local_partner ===
              true ||
            isEastLothianOnlinePage(
              ownedPage
            );

          if (
            !allowed ||
            !ownedPage
          ) {
            setDenied(true);
            setAnalytics(null);
            return;
          }

          const {
            data,
            error:
              analyticsError,
          } =
            await supabase.rpc(
              "elo_get_page_analytics",
              {
                p_page_id:
                  ownedPage.id,
                p_days:
                  periodDays,
              }
            );

          if (
            analyticsError
          ) {
            throw analyticsError;
          }

          const payload =
            (
              data ??
              null
            ) as
              | AnalyticsPayload
              | null;

          setAnalytics(
            payload
          );
        } catch (
          caught
        ) {
          console.error(
            "Analytics load error:",
            caught
          );

          setAnalytics(null);

          setError(
            caught instanceof
            Error
              ? caught.message
              : "Analytics could not be loaded."
          );
        } finally {
          if (showLoader) {
            setLoading(false);
          }
        }
      },
      [
        pageId,
        periodDays,
        queryReady,
        supabase,
      ]
    );

  useEffect(() => {
    if (!queryReady) {
      return;
    }

    void loadAnalytics();

    function handleFocus() {
      void loadAnalytics(
        false
      );
    }

    window.addEventListener(
      "focus",
      handleFocus
    );

    return () => {
      window.removeEventListener(
        "focus",
        handleFocus
      );
    };
  }, [
    loadAnalytics,
    queryReady,
  ]);

  async function refresh() {
    if (refreshing) {
      return;
    }

    setRefreshing(true);

    try {
      await loadAnalytics(
        false
      );
    } finally {
      setRefreshing(false);
    }
  }

  const data =
    analytics ?? {
      page_id:
        page?.id ?? "",
      period_days:
        periodDays,
      views: 0,
      clicks: 0,
      conversion_rate: 0,
      posts_seen: 0,
      previous_views: 0,
      previous_clicks: 0,
      previous_conversion_rate: 0,
      performance: [],
    };

  const viewChange =
    percentChange(
      data.views,
      data.previous_views
    );

  const clickChange =
    percentChange(
      data.clicks,
      data.previous_clicks
    );

  const bestPost =
    useMemo(
      () =>
        data.performance[0] ??
        null,
      [
        data.performance,
      ]
    );

  const maxViews =
    useMemo(
      () =>
        Math.max(
          1,
          ...data.performance.map(
            (item) =>
              item.views
          )
        ),
      [
        data.performance,
      ]
    );

  if (
    loading ||
    !queryReady
  ) {
    return (
      <main className="elo-analytics-page">
        <SiteHeader />

        <div className="elo-analytics-loading">
          <LoaderCircle
            size={31}
            className="elo-analytics-spin"
          />

          <span>
            Loading analytics...
          </span>
        </div>

        <style>{styles}</style>
      </main>
    );
  }

  if (denied) {
    return (
      <main className="elo-analytics-page">
        <SiteHeader />

        <div className="elo-analytics-denied">
          <div className="elo-analytics-denied-icon">
            <BarChart3
              size={30}
            />
          </div>

          <h1>
            Analytics
          </h1>

          <p>
            Analytics is included with Partnership.
          </p>

          {page && (
            <button
              type="button"
              className="elo-analytics-denied-button"
              onClick={() =>
                router.push(
                  `/partnership?pageId=${encodeURIComponent(
                    page.id
                  )}`
                )
              }
            >
              View Partnership
            </button>
          )}
        </div>

        <style>{styles}</style>
      </main>
    );
  }

  return (
    <main className="elo-analytics-page">
      <SiteHeader />

      <section className="elo-analytics-shell">
        <div className="elo-analytics-hero">
          <div className="elo-analytics-hero-top">
            <div className="elo-analytics-hero-icon">
              <BarChart3
                size={23}
              />
            </div>

            <div className="elo-analytics-live-badge">
              <i />

              <span>
                LIVE DATA
              </span>
            </div>
          </div>

          <div className="elo-analytics-hero-eyebrow">
            ANALYTICS
          </div>

          <h1>
            See what gets attention.
          </h1>

          <p>
            Views, opens and conversion across{" "}
            {page?.name ??
              "your Page"}
            .
          </p>
        </div>

        <div className="elo-analytics-period-row">
          <span>
            Showing
          </span>

          <div className="elo-analytics-period-actions">
            <div className="elo-analytics-period-toggle">
              {(
                [
                  7,
                  30,
                  90,
                ] as const
              ).map(
                (days) => (
                  <button
                    key={days}
                    type="button"
                    className={
                      periodDays ===
                      days
                        ? "is-active"
                        : ""
                    }
                    onClick={() =>
                      setPeriodDays(
                        days
                      )
                    }
                  >
                    {days}d
                  </button>
                )
              )}
            </div>

            <button
              type="button"
              className="elo-analytics-refresh"
              onClick={() =>
                void refresh()
              }
              disabled={
                refreshing
              }
              aria-label="Refresh analytics"
            >
              <RefreshCw
                size={15}
                className={
                  refreshing
                    ? "elo-analytics-spin"
                    : ""
                }
              />
            </button>
          </div>
        </div>

        {error ? (
          <div className="elo-analytics-error-card">
            <AlertCircle
              size={22}
            />

            <div>
              <strong>
                Could not load analytics
              </strong>

              <p>
                {error}
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="elo-analytics-stats-grid">
              <StatCard
                icon={Eye}
                label="Views"
                value={
                  formatNumber(
                    data.views
                  )
                }
                helper="Times your posts were seen"
                change={
                  viewChange
                }
              />

              <StatCard
                icon={
                  MousePointerClick
                }
                label="Clicks"
                value={
                  formatNumber(
                    data.clicks
                  )
                }
                helper="Times a post was opened"
                change={
                  clickChange
                }
              />

              <StatCard
                icon={TrendingUp}
                label="Conversion"
                value={`${data.conversion_rate.toFixed(
                  1
                )}%`}
                helper="Views that became clicks"
              />

              <StatCard
                icon={Layers3}
                label="Posts seen"
                value={
                  formatNumber(
                    data.posts_seen
                  )
                }
                helper="Different posts with activity"
              />
            </div>

            {bestPost && (
              <button
                type="button"
                className="elo-analytics-best-card"
                onClick={() =>
                  router.push(
                    `/posts/${encodeURIComponent(
                      bestPost.post_id
                    )}`
                  )
                }
              >
                <span className="elo-analytics-best-top">
                  <span className="elo-analytics-best-icon">
                    <Trophy
                      size={20}
                    />
                  </span>

                  <span className="elo-analytics-best-eyebrow">
                    TOP PERFORMER
                  </span>
                </span>

                <strong>
                  {bestPost.title}
                </strong>

                <span className="elo-analytics-best-stats">
                  <span>
                    {formatNumber(
                      bestPost.views
                    )}{" "}
                    views
                  </span>

                  <i />

                  <span>
                    {formatNumber(
                      bestPost.clicks
                    )}{" "}
                    clicks
                  </span>

                  <i />

                  <span>
                    {bestPost.conversion_rate.toFixed(
                      1
                    )}
                    %
                  </span>
                </span>
              </button>
            )}

            <section className="elo-analytics-performance">
              <div className="elo-analytics-section-eyebrow">
                POST PERFORMANCE
              </div>

              <h2>
                What people are opening.
              </h2>

              <p className="elo-analytics-section-intro">
                Ranked by views in the selected period.
              </p>

              {data.performance.length ===
              0 ? (
                <div className="elo-analytics-empty-card">
                  <BarChart3
                    size={25}
                  />

                  <strong>
                    No activity yet
                  </strong>

                  <p>
                    Post performance will appear here as people see and open your content.
                  </p>
                </div>
              ) : (
                <div className="elo-analytics-performance-list">
                  {data.performance.map(
                    (
                      item,
                      index
                    ) => {
                      const width =
                        Math.max(
                          3,
                          Math.round(
                            (
                              item.views /
                              maxViews
                            ) *
                              100
                          )
                        );

                      return (
                        <button
                          key={
                            item.post_id
                          }
                          type="button"
                          className={`elo-analytics-performance-row ${
                            index ===
                            data.performance.length -
                              1
                              ? "is-last"
                              : ""
                          }`}
                          onClick={() =>
                            router.push(
                              `/posts/${encodeURIComponent(
                                item.post_id
                              )}`
                            )
                          }
                        >
                          <span className="elo-analytics-performance-top">
                            <span className="elo-analytics-performance-copy">
                              <span className="elo-analytics-performance-meta">
                                <span className="elo-analytics-type-label">
                                  {typeLabel(
                                    item.type
                                  )}
                                </span>

                                <i>
                                  ·
                                </i>

                                <span>
                                  {formatDate(
                                    item.created_at
                                  )}
                                </span>
                              </span>

                              <strong>
                                {item.title}
                              </strong>
                            </span>

                            <ChevronRight
                              size={18}
                            />
                          </span>

                          <span className="elo-analytics-performance-track">
                            <span
                              style={{
                                width: `${width}%`,
                              }}
                            />
                          </span>

                          <span className="elo-analytics-performance-numbers">
                            <span>
                              {formatNumber(
                                item.views
                              )}{" "}
                              views
                            </span>

                            <span>
                              {formatNumber(
                                item.clicks
                              )}{" "}
                              clicks
                            </span>

                            <strong>
                              {item.conversion_rate.toFixed(
                                1
                              )}
                              %
                            </strong>
                          </span>
                        </button>
                      );
                    }
                  )}
                </div>
              )}
            </section>

            <div className="elo-analytics-note">
              <ShieldCheck
                size={17}
              />

              <p>
                Analytics are anonymous aggregates. They show activity around your posts, not who viewed them.
              </p>
            </div>
          </>
        )}
      </section>

      <style>{styles}</style>
    </main>
  );
}

const styles = `
  .elo-analytics-page {
    min-height: 100dvh;
    background: #F4F5F4;
    color: #173C33;
    font-family: var(--font-geist-sans), Arial, sans-serif;
  }

  .elo-analytics-page *,
  .elo-analytics-page *::before,
  .elo-analytics-page *::after {
    box-sizing: border-box;
  }

  .elo-analytics-page button {
    font: inherit;
  }

  .elo-analytics-shell {
    width: 100%;
    max-width: 760px;
    margin: 0 auto;
    padding: 4px 16px 120px;
  }

  .elo-analytics-loading {
    min-height: 68vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 11px;
    color: #005744;
  }

  .elo-analytics-loading span {
    color: #78827E;
    font-size: 11px;
    font-weight: 700;
  }

  .elo-analytics-denied {
    width: 100%;
    max-width: 560px;
    min-height: 68vh;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 28px;
    text-align: center;
  }

  .elo-analytics-denied-icon {
    width: 64px;
    height: 64px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 21px;
    background: #E5F0EC;
    color: #005744;
  }

  .elo-analytics-denied h1 {
    margin: 14px 0 0;
    color: #173C33;
    font-size: 23px;
    font-weight: 900;
  }

  .elo-analytics-denied p {
    margin: 6px 0 0;
    color: #74807B;
    font-size: 11px;
    line-height: 17px;
  }

  .elo-analytics-denied-button {
    min-height: 47px;
    margin-top: 18px;
    border: 0;
    border-radius: 14px;
    background: #005744;
    padding: 0 18px;
    color: #FFFFFF;
    font-size: 11px;
    font-weight: 900;
    cursor: pointer;
  }

  .elo-analytics-hero {
    overflow: hidden;
    border-radius: 24px;
    background: #005744;
    padding: 20px;
  }

  .elo-analytics-hero-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .elo-analytics-hero-icon {
    width: 46px;
    height: 46px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 15px;
    background: rgba(255,255,255,.14);
    color: #FFFFFF;
  }

  .elo-analytics-live-badge {
    min-height: 31px;
    display: flex;
    align-items: center;
    gap: 6px;
    border-radius: 10px;
    background: rgba(255,255,255,.12);
    padding: 0 10px;
  }

  .elo-analytics-live-badge i {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: #7DFFD0;
  }

  .elo-analytics-live-badge span {
    color: #FFFFFF;
    font-size: 8px;
    font-weight: 900;
    letter-spacing: .9px;
  }

  .elo-analytics-hero-eyebrow {
    margin-top: 18px;
    color: #91D4BF;
    font-size: 8px;
    font-weight: 900;
    letter-spacing: 1.15px;
  }

  .elo-analytics-hero h1 {
    margin: 6px 0 0;
    color: #FFFFFF;
    font-size: 30px;
    line-height: 34px;
    font-weight: 900;
    letter-spacing: -.75px;
  }

  .elo-analytics-hero > p {
    max-width: 420px;
    margin: 9px 0 0;
    color: rgba(255,255,255,.72);
    font-size: 12px;
    line-height: 18px;
    font-weight: 600;
  }

  .elo-analytics-period-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-top: 15px;
  }

  .elo-analytics-period-row > span {
    color: #78827E;
    font-size: 10px;
    font-weight: 800;
  }

  .elo-analytics-period-actions {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .elo-analytics-period-toggle {
    display: flex;
    border-radius: 12px;
    background: #E7EBE9;
    padding: 3px;
  }

  .elo-analytics-period-toggle button {
    min-height: 34px;
    border: 0;
    border-radius: 9px;
    background: transparent;
    padding: 0 12px;
    color: #75807B;
    font-size: 9px;
    font-weight: 900;
    cursor: pointer;
  }

  .elo-analytics-period-toggle button.is-active {
    background: #FFFFFF;
    color: #005744;
  }

  .elo-analytics-refresh {
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1px solid #D8E0DD;
    border-radius: 12px;
    background: #FFFFFF;
    color: #005744;
    cursor: pointer;
  }

  .elo-analytics-refresh:disabled {
    opacity: .55;
    cursor: wait;
  }

  .elo-analytics-error-card {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    margin-top: 18px;
    border: 1px solid #F0C8C3;
    border-radius: 17px;
    background: #FCEDEA;
    padding: 14px;
    color: #A6382F;
  }

  .elo-analytics-error-card svg {
    flex: 0 0 auto;
  }

  .elo-analytics-error-card strong {
    display: block;
    color: #8F3028;
    font-size: 12px;
    font-weight: 900;
  }

  .elo-analytics-error-card p {
    margin: 3px 0 0;
    color: #A0554E;
    font-size: 10px;
    line-height: 14px;
    font-weight: 600;
  }

  .elo-analytics-stats-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
    margin-top: 17px;
  }

  .elo-analytics-stat-card {
    min-height: 154px;
    border: 1px solid #E0E5E2;
    border-radius: 18px;
    background: #FFFFFF;
    padding: 14px;
  }

  .elo-analytics-stat-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .elo-analytics-stat-icon {
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 13px;
    background: #E5F0EC;
    color: #005744;
  }

  .elo-analytics-change-badge {
    min-height: 27px;
    display: flex;
    align-items: center;
    gap: 3px;
    border-radius: 9px;
    padding: 0 7px;
  }

  .elo-analytics-change-badge.is-positive {
    background: #E8F5EF;
    color: #11724E;
  }

  .elo-analytics-change-badge.is-negative {
    background: #FCEDEA;
    color: #A6382F;
  }

  .elo-analytics-change-badge span {
    font-size: 8px;
    font-weight: 900;
  }

  .elo-analytics-stat-value {
    margin-top: 14px;
    color: #17251F;
    font-size: 28px;
    line-height: 31px;
    font-weight: 900;
    letter-spacing: -.7px;
  }

  .elo-analytics-stat-label {
    margin-top: 4px;
    color: #38463F;
    font-size: 10px;
    font-weight: 900;
  }

  .elo-analytics-stat-helper {
    margin-top: 4px;
    color: #8A9490;
    font-size: 8.5px;
    line-height: 12px;
    font-weight: 600;
  }

  .elo-analytics-best-card {
    width: 100%;
    display: block;
    margin-top: 14px;
    border: 1px solid #C7DFD5;
    border-radius: 19px;
    background: #E7F3EE;
    padding: 16px;
    text-align: left;
    cursor: pointer;
  }

  .elo-analytics-best-top {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .elo-analytics-best-icon {
    width: 38px;
    height: 38px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 12px;
    background: #FFFFFF;
    color: #005744;
  }

  .elo-analytics-best-eyebrow {
    color: #005744;
    font-size: 8px;
    font-weight: 900;
    letter-spacing: 1px;
  }

  .elo-analytics-best-card > strong {
    display: block;
    margin-top: 12px;
    color: #173C33;
    font-size: 18px;
    line-height: 22px;
    font-weight: 900;
    letter-spacing: -.3px;
  }

  .elo-analytics-best-stats {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 7px;
    margin-top: 11px;
    color: #60746C;
    font-size: 10px;
    font-weight: 800;
  }

  .elo-analytics-best-stats i {
    width: 3px;
    height: 3px;
    border-radius: 50%;
    background: #8CA79C;
  }

  .elo-analytics-performance {
    margin-top: 27px;
  }

  .elo-analytics-section-eyebrow {
    color: #008564;
    font-size: 8px;
    font-weight: 900;
    letter-spacing: 1.05px;
  }

  .elo-analytics-performance h2 {
    margin: 4px 0 0;
    color: #173C33;
    font-size: 23px;
    line-height: 27px;
    font-weight: 900;
    letter-spacing: -.45px;
  }

  .elo-analytics-section-intro {
    margin: 5px 0 0;
    color: #7B8581;
    font-size: 11px;
    line-height: 16px;
    font-weight: 600;
  }

  .elo-analytics-empty-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    margin-top: 13px;
    border: 1px solid #E0E5E2;
    border-radius: 18px;
    background: #FFFFFF;
    padding: 24px;
    color: #9AA39F;
    text-align: center;
  }

  .elo-analytics-empty-card strong {
    margin-top: 9px;
    color: #4E5C56;
    font-size: 12px;
    font-weight: 900;
  }

  .elo-analytics-empty-card p {
    max-width: 320px;
    margin: 4px 0 0;
    color: #8B9490;
    font-size: 10px;
    line-height: 14px;
    font-weight: 600;
  }

  .elo-analytics-performance-list {
    overflow: hidden;
    margin-top: 13px;
    border: 1px solid #E0E5E2;
    border-radius: 19px;
    background: #FFFFFF;
  }

  .elo-analytics-performance-row {
    width: 100%;
    display: block;
    border: 0;
    border-bottom: 1px solid #E3E7E5;
    background: #FFFFFF;
    padding: 14px;
    text-align: left;
    cursor: pointer;
  }

  .elo-analytics-performance-row:hover {
    background: #FAFBFA;
  }

  .elo-analytics-performance-row.is-last {
    border-bottom: 0;
  }

  .elo-analytics-performance-top {
    display: flex;
    align-items: center;
  }

  .elo-analytics-performance-copy {
    min-width: 0;
    flex: 1;
    margin-right: 8px;
  }

  .elo-analytics-performance-meta {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
  }

  .elo-analytics-type-label {
    color: #008564;
    font-size: 8px;
    font-weight: 900;
    letter-spacing: .75px;
  }

  .elo-analytics-performance-meta i {
    margin: 0 5px;
    color: #A0A8A4;
    font-size: 8px;
    font-style: normal;
    font-weight: 900;
  }

  .elo-analytics-performance-meta span:last-child {
    color: #8D9692;
    font-size: 8px;
    font-weight: 700;
  }

  .elo-analytics-performance-copy > strong {
    display: block;
    margin-top: 4px;
    color: #28362F;
    font-size: 12px;
    line-height: 16px;
    font-weight: 900;
  }

  .elo-analytics-performance-top > svg {
    flex: 0 0 auto;
    color: #95A09B;
  }

  .elo-analytics-performance-track {
    height: 5px;
    display: block;
    overflow: hidden;
    margin-top: 11px;
    border-radius: 3px;
    background: #EDF0EE;
  }

  .elo-analytics-performance-track > span {
    height: 100%;
    display: block;
    border-radius: 3px;
    background: #005744;
  }

  .elo-analytics-performance-numbers {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    margin-top: 9px;
    color: #78827E;
    font-size: 9px;
    font-weight: 800;
  }

  .elo-analytics-performance-numbers strong {
    color: #005744;
    font-size: 9px;
    font-weight: 900;
  }

  .elo-analytics-note {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    margin-top: 15px;
    border-radius: 14px;
    background: #E9EDEA;
    padding: 12px;
    color: #71807A;
  }

  .elo-analytics-note svg {
    flex: 0 0 auto;
  }

  .elo-analytics-note p {
    margin: 0;
    color: #6E7974;
    font-size: 9px;
    line-height: 13px;
    font-weight: 600;
  }

  .elo-analytics-page button:focus {
    outline: none;
  }

  .elo-analytics-page button:focus-visible {
    outline: 2px solid #9EAEA7;
    outline-offset: 2px;
  }

  .elo-analytics-spin {
    animation: elo-analytics-spin .8s linear infinite;
  }

  @keyframes elo-analytics-spin {
    to {
      transform: rotate(360deg);
    }
  }

  @media (max-width: 520px) {
    .elo-analytics-stats-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  @media (max-width: 390px) {
    .elo-analytics-stats-grid {
      grid-template-columns: 1fr;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .elo-analytics-spin {
      animation: none;
    }
  }
`;
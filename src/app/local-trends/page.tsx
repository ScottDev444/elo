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
  CheckCircle2,
  Lightbulb,
  LoaderCircle,
  LockKeyhole,
  LogOut,
  RefreshCw,
  Search,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  type LucideProps,
} from "lucide-react";

import SiteHeader from "@/components/SiteHeader";
import { createClient } from "@/lib/supabase/client";

type SearchLogRow = {
  query: string | null;
  type: string | null;
  created_at: string;
};

type PageAccessRow = {
  id: string;
  name: string;
  slug: string | null;
  is_local_partner: boolean | null;
};

type TrendItem = {
  query: string;
  count: number;
  previousCount: number;
  change: number;
};

type TrendsData = {
  attempts: number;
  previousAttempts: number;
  selected: number;
  failed: number;
  abandoned: number;
  popular: TrendItem[];
  rising: TrendItem[];
  failedTerms: TrendItem[];
  selectedTerms: TrendItem[];
};

const PAGE_SIZE = 1000;
const MAX_ROWS = 10000;

const STOP_WORDS = new Set([
  "the",
  "and",
  "for",
  "with",
  "near",
  "near me",
  "east lothian",
]);

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

function normaliseQuery(
  value: string | null
) {
  if (!value) {
    return "";
  }

  return value
    .trim()
    .toLowerCase()
    .replace(
      /[^\p{L}\p{N}\s'-]/gu,
      ""
    )
    .replace(/\s+/g, " ");
}

function isUsefulQuery(
  query: string
) {
  if (query.length < 3) {
    return false;
  }

  if (
    STOP_WORDS.has(query)
  ) {
    return false;
  }

  if (
    /^(.)\1+$/.test(query)
  ) {
    return false;
  }

  return true;
}

function formatQuery(
  query: string
) {
  return query.replace(
    /\b\w/g,
    (letter) =>
      letter.toUpperCase()
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

function countMap(
  rows: SearchLogRow[]
) {
  const counts =
    new Map<
      string,
      number
    >();

  for (
    const row of rows
  ) {
    const query =
      normaliseQuery(
        row.query
      );

    if (
      !isUsefulQuery(
        query
      )
    ) {
      continue;
    }

    counts.set(
      query,
      (
        counts.get(
          query
        ) ??
        0
      ) + 1
    );
  }

  return counts;
}

function buildTrendItems(
  current: SearchLogRow[],
  previous: SearchLogRow[],
  limit = 8
) {
  const currentCounts =
    countMap(current);

  const previousCounts =
    countMap(previous);

  return [
    ...currentCounts.entries(),
  ]
    .map(
      ([
        query,
        count,
      ]) => {
        const previousCount =
          previousCounts.get(
            query
          ) ?? 0;

        return {
          query,
          count,
          previousCount,
          change:
            percentChange(
              count,
              previousCount
            ),
        };
      }
    )
    .sort(
      (a, b) => {
        if (
          b.count !==
          a.count
        ) {
          return (
            b.count -
            a.count
          );
        }

        return (
          b.change -
          a.change
        );
      }
    )
    .slice(
      0,
      limit
    );
}

function buildRising(
  current: SearchLogRow[],
  previous: SearchLogRow[],
  limit = 8
) {
  const currentCounts =
    countMap(current);

  const previousCounts =
    countMap(previous);

  return [
    ...currentCounts.entries(),
  ]
    .map(
      ([
        query,
        count,
      ]) => {
        const previousCount =
          previousCounts.get(
            query
          ) ?? 0;

        return {
          query,
          count,
          previousCount,
          change:
            percentChange(
              count,
              previousCount
            ),
        };
      }
    )
    .filter(
      (item) =>
        item.count >= 2 &&
        item.change > 0
    )
    .sort(
      (a, b) => {
        if (
          b.change !==
          a.change
        ) {
          return (
            b.change -
            a.change
          );
        }

        return (
          b.count -
          a.count
        );
      }
    )
    .slice(
      0,
      limit
    );
}

function getPeriodRows(
  rows: SearchLogRow[],
  start: Date,
  end: Date
) {
  return rows.filter(
    (row) => {
      const date =
        new Date(
          row.created_at
        );

      if (
        Number.isNaN(
          date.getTime()
        )
      ) {
        return false;
      }

      return (
        date >= start &&
        date < end
      );
    }
  );
}

function getRowsByTypes(
  rows: SearchLogRow[],
  types: string[]
) {
  const wanted =
    new Set(types);

  return rows.filter(
    (row) =>
      row.type &&
      wanted.has(
        row.type
          .trim()
          .toLowerCase()
      )
  );
}

type StatCardProps = {
  icon: ComponentType<LucideProps>;
  value: number;
  label: string;
  change?: number;
};

function StatCard({
  icon: Icon,
  value,
  label,
  change,
}: StatCardProps) {
  const showChange =
    typeof change === "number";

  const positive =
    (change ?? 0) >= 0;

  return (
    <div className="elo-trends-stat-card">
      <div className="elo-trends-stat-top">
        <div className="elo-trends-stat-icon">
          <Icon
            size={20}
          />
        </div>

        {showChange && (
          <div
            className={`elo-trends-change-badge ${
              positive
                ? "is-up"
                : "is-down"
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

      <div className="elo-trends-stat-value">
        {value}
      </div>

      <div className="elo-trends-stat-label">
        {label}
      </div>
    </div>
  );
}

type TrendSectionProps = {
  icon: ComponentType<LucideProps>;
  title: string;
  subtitle: string;
  items: TrendItem[];
  empty: string;
  showChange?: boolean;
  tone?:
    | "plain"
    | "amber"
    | "green";
};

function TrendSection({
  icon: Icon,
  title,
  subtitle,
  items,
  empty,
  showChange = false,
  tone = "plain",
}: TrendSectionProps) {
  return (
    <section
      className={`elo-trends-section is-${tone}`}
    >
      <div className="elo-trends-section-header">
        <div
          className={`elo-trends-section-icon is-${tone}`}
        >
          <Icon
            size={19}
          />
        </div>

        <div>
          <h2>
            {title}
          </h2>

          <p>
            {subtitle}
          </p>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="elo-trends-empty-list">
          {empty}
        </div>
      ) : (
        <div className="elo-trends-list">
          {items.map(
            (
              item,
              index
            ) => {
              const positive =
                item.change >= 0;

              return (
                <div
                  key={
                    item.query
                  }
                  className={`elo-trends-row ${
                    index ===
                    items.length - 1
                      ? "is-last"
                      : ""
                  }`}
                >
                  <div className="elo-trends-rank">
                    {index + 1}
                  </div>

                  <div className="elo-trends-row-copy">
                    <strong>
                      {formatQuery(
                        item.query
                      )}
                    </strong>

                    <span>
                      {item.count}{" "}
                      {item.count === 1
                        ? "search"
                        : "searches"}
                    </span>
                  </div>

                  {showChange && (
                    <div
                      className={`elo-trends-row-change ${
                        positive
                          ? "is-up"
                          : "is-down"
                      }`}
                    >
                      {positive ? (
                        <TrendingUp
                          size={13}
                        />
                      ) : (
                        <TrendingDown
                          size={13}
                        />
                      )}

                      <span>
                        {Math.abs(
                          item.change
                        )}
                        %
                      </span>
                    </div>
                  )}
                </div>
              );
            }
          )}
        </div>
      )}
    </section>
  );
}

export default function LocalTrendsPage() {
  const router =
    useRouter();

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
      7 | 30
    >(7);

  const [
    rows,
    setRows,
  ] =
    useState<
      SearchLogRow[]
    >([]);

  const [
    page,
    setPage,
  ] =
    useState<
      PageAccessRow | null
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
    error,
    setError,
  ] =
    useState<
      string | null
    >(null);

  const [
    denied,
    setDenied,
  ] =
    useState(false);

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

  const loadTrends =
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

        setError(null);
        setDenied(false);

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
            setRows([]);
            setPage(null);
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

          if (!allowed) {
            setDenied(true);
            setRows([]);
            return;
          }

          const start =
            new Date();

          start.setDate(
            start.getDate() -
              periodDays * 2
          );

          const loadedRows:
            SearchLogRow[] =
              [];

          let from = 0;

          while (
            loadedRows.length <
            MAX_ROWS
          ) {
            const to =
              Math.min(
                from +
                  PAGE_SIZE -
                  1,
                MAX_ROWS -
                  1
              );

            const {
              data,
              error:
                logsError,
            } =
              await supabase
                .from(
                  "search_logs"
                )
                .select(
                  "query, type, created_at"
                )
                .gte(
                  "created_at",
                  start.toISOString()
                )
                .order(
                  "created_at",
                  {
                    ascending:
                      false,
                  }
                )
                .range(
                  from,
                  to
                );

            if (
              logsError
            ) {
              throw logsError;
            }

            const batch =
              (
                data ??
                []
              ) as
                SearchLogRow[];

            loadedRows.push(
              ...batch
            );

            if (
              batch.length <
              PAGE_SIZE
            ) {
              break;
            }

            from +=
              PAGE_SIZE;
          }

          setRows(
            loadedRows
          );
        } catch (
          caught
        ) {
          console.error(
            "Local Trends load error:",
            caught
          );

          setRows([]);

          setError(
            caught instanceof
            Error
              ? caught.message
              : "Local Trends could not be loaded."
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

    void loadTrends();

    function handleFocus() {
      void loadTrends(
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
    loadTrends,
    queryReady,
  ]);

  async function refresh() {
    if (refreshing) {
      return;
    }

    setRefreshing(true);

    try {
      await loadTrends(
        false
      );
    } finally {
      setRefreshing(false);
    }
  }

  const trends =
    useMemo<
      TrendsData
    >(
      () => {
        const now =
          new Date();

        const currentStart =
          new Date(now);

        currentStart.setDate(
          currentStart.getDate() -
            periodDays
        );

        const previousStart =
          new Date(
            currentStart
          );

        previousStart.setDate(
          previousStart.getDate() -
            periodDays
        );

        const currentRows =
          getPeriodRows(
            rows,
            currentStart,
            now
          );

        const previousRows =
          getPeriodRows(
            rows,
            previousStart,
            currentStart
          );

        const currentAttempts =
          getRowsByTypes(
            currentRows,
            [
              "search",
              "failed",
            ]
          );

        const previousAttempts =
          getRowsByTypes(
            previousRows,
            [
              "search",
              "failed",
            ]
          );

        const currentSelected =
          getRowsByTypes(
            currentRows,
            [
              "selected",
            ]
          );

        const currentFailed =
          getRowsByTypes(
            currentRows,
            [
              "failed",
            ]
          );

        const currentAbandoned =
          getRowsByTypes(
            currentRows,
            [
              "abandoned",
            ]
          );

        const previousFailed =
          getRowsByTypes(
            previousRows,
            [
              "failed",
            ]
          );

        const previousSelected =
          getRowsByTypes(
            previousRows,
            [
              "selected",
            ]
          );

        return {
          attempts:
            currentAttempts.length,
          previousAttempts:
            previousAttempts.length,
          selected:
            currentSelected.length,
          failed:
            currentFailed.length,
          abandoned:
            currentAbandoned.length,
          popular:
            buildTrendItems(
              currentAttempts,
              previousAttempts
            ),
          rising:
            buildRising(
              currentAttempts,
              previousAttempts
            ),
          failedTerms:
            buildTrendItems(
              currentFailed,
              previousFailed
            ),
          selectedTerms:
            buildTrendItems(
              currentSelected,
              previousSelected
            ),
        };
      },
      [
        rows,
        periodDays,
      ]
    );

  const overallChange =
    percentChange(
      trends.attempts,
      trends.previousAttempts
    );

  if (
    loading ||
    !queryReady
  ) {
    return (
      <main className="elo-trends-page">
        <SiteHeader />

        <div className="elo-trends-loading">
          <LoaderCircle
            size={31}
            className="elo-trends-spin"
          />

          <span>
            Reading local searches...
          </span>
        </div>

        <style>{styles}</style>
      </main>
    );
  }

  if (denied) {
    return (
      <main className="elo-trends-page">
        <SiteHeader />

        <div className="elo-trends-denied">
          <div className="elo-trends-denied-icon">
            <LockKeyhole
              size={29}
            />
          </div>

          <h1>
            Local Trends
          </h1>

          <p>
            Local Trends is included with Partnership.
          </p>

          {page && (
            <button
              type="button"
              className="elo-trends-denied-button"
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
    <main className="elo-trends-page">
      <SiteHeader />

      <section className="elo-trends-shell">
        <div className="elo-trends-hero">
          <div className="elo-trends-hero-top">
            <div className="elo-trends-hero-icon">
              <TrendingUp
                size={23}
              />
            </div>

            <div className="elo-trends-live-badge">
              <i />

              <span>
                LIVE DATA
              </span>
            </div>
          </div>

          <div className="elo-trends-hero-eyebrow">
            LOCAL TRENDS
          </div>

          <h1>
            What East Lothian is searching for.
          </h1>

          <p>
            Anonymous search activity from across ELO, turned into useful demand signals.
          </p>
        </div>

        <div className="elo-trends-period-row">
          <span>
            Showing
          </span>

          <div className="elo-trends-period-actions">
            <div className="elo-trends-period-toggle">
              {(
                [
                  7,
                  30,
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
                    {days} days
                  </button>
                )
              )}
            </div>

            <button
              type="button"
              className="elo-trends-refresh"
              onClick={() =>
                void refresh()
              }
              disabled={
                refreshing
              }
              aria-label="Refresh Local Trends"
            >
              <RefreshCw
                size={15}
                className={
                  refreshing
                    ? "elo-trends-spin"
                    : ""
                }
              />
            </button>
          </div>
        </div>

        {error ? (
          <div className="elo-trends-error-card">
            <AlertCircle
              size={22}
            />

            <div>
              <strong>
                Could not load Local Trends
              </strong>

              <p>
                {error}
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="elo-trends-stats-grid">
              <StatCard
                icon={Search}
                value={
                  trends.attempts
                }
                label="Searches"
                change={
                  overallChange
                }
              />

              <StatCard
                icon={CheckCircle2}
                value={
                  trends.selected
                }
                label="Results chosen"
              />

              <StatCard
                icon={Lightbulb}
                value={
                  trends.failed
                }
                label="No result"
              />

              <StatCard
                icon={LogOut}
                value={
                  trends.abandoned
                }
                label="Abandoned"
              />
            </div>

            <TrendSection
              icon={Search}
              title="Popular searches"
              subtitle="What people are looking for most"
              items={
                trends.popular
              }
              empty="Not enough search data yet."
            />

            <TrendSection
              icon={TrendingUp}
              title="Rising searches"
              subtitle={`Growing compared with the previous ${periodDays} days`}
              items={
                trends.rising
              }
              empty="No clear rising searches yet."
              showChange
              tone="green"
            />

            <TrendSection
              icon={Lightbulb}
              title="Missing from ELO"
              subtitle="Searches that returned no result"
              items={
                trends.failedTerms
              }
              empty="No missing searches recorded in this period."
              tone="amber"
            />

            <TrendSection
              icon={CheckCircle2}
              title="People chose"
              subtitle="Searches that led to a selected result"
              items={
                trends.selectedTerms
              }
              empty="No selected searches recorded in this period."
            />

            <div className="elo-trends-privacy-note">
              <ShieldCheck
                size={17}
              />

              <p>
                Local Trends uses anonymous aggregate search activity. No individual user is identified.
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
  .elo-trends-page {
    min-height: 100dvh;
    background: #F4F5F4;
    color: #173C33;
    font-family: var(--font-geist-sans), Arial, sans-serif;
  }

  .elo-trends-page *,
  .elo-trends-page *::before,
  .elo-trends-page *::after {
    box-sizing: border-box;
  }

  .elo-trends-page button {
    font: inherit;
  }

  .elo-trends-shell {
    width: 100%;
    max-width: 760px;
    margin: 0 auto;
    padding: 4px 16px 120px;
  }

  .elo-trends-loading {
    min-height: 68vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 11px;
    color: #005744;
  }

  .elo-trends-loading span {
    color: #78827E;
    font-size: 11px;
    font-weight: 700;
  }

  .elo-trends-denied {
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

  .elo-trends-denied-icon {
    width: 64px;
    height: 64px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 21px;
    background: #E5F0EC;
    color: #005744;
  }

  .elo-trends-denied h1 {
    margin: 14px 0 0;
    color: #173C33;
    font-size: 23px;
    font-weight: 900;
  }

  .elo-trends-denied p {
    margin: 6px 0 0;
    color: #74807B;
    font-size: 11px;
    line-height: 17px;
  }

  .elo-trends-denied-button {
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

  .elo-trends-hero {
    overflow: hidden;
    border-radius: 24px;
    background: #005744;
    padding: 20px;
  }

  .elo-trends-hero-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .elo-trends-hero-icon {
    width: 46px;
    height: 46px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 15px;
    background: rgba(255,255,255,.14);
    color: #FFFFFF;
  }

  .elo-trends-live-badge {
    min-height: 31px;
    display: flex;
    align-items: center;
    gap: 6px;
    border-radius: 10px;
    background: rgba(255,255,255,.12);
    padding: 0 10px;
  }

  .elo-trends-live-badge i {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: #7DFFD0;
  }

  .elo-trends-live-badge span {
    color: #FFFFFF;
    font-size: 8px;
    font-weight: 900;
    letter-spacing: .9px;
  }

  .elo-trends-hero-eyebrow {
    margin-top: 18px;
    color: #91D4BF;
    font-size: 8px;
    font-weight: 900;
    letter-spacing: 1.15px;
  }

  .elo-trends-hero h1 {
    margin: 6px 0 0;
    color: #FFFFFF;
    font-size: 30px;
    line-height: 34px;
    font-weight: 900;
    letter-spacing: -.75px;
  }

  .elo-trends-hero > p {
    max-width: 430px;
    margin: 9px 0 0;
    color: rgba(255,255,255,.72);
    font-size: 12px;
    line-height: 18px;
    font-weight: 600;
  }

  .elo-trends-period-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-top: 15px;
  }

  .elo-trends-period-row > span {
    color: #78827E;
    font-size: 10px;
    font-weight: 800;
  }

  .elo-trends-period-actions {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .elo-trends-period-toggle {
    display: flex;
    border-radius: 12px;
    background: #E7EBE9;
    padding: 3px;
  }

  .elo-trends-period-toggle button {
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

  .elo-trends-period-toggle button.is-active {
    background: #FFFFFF;
    color: #005744;
  }

  .elo-trends-refresh {
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

  .elo-trends-refresh:disabled {
    opacity: .55;
    cursor: wait;
  }

  .elo-trends-error-card {
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

  .elo-trends-error-card svg {
    flex: 0 0 auto;
  }

  .elo-trends-error-card strong {
    display: block;
    color: #8F3028;
    font-size: 12px;
    font-weight: 900;
  }

  .elo-trends-error-card p {
    margin: 3px 0 0;
    color: #A0554E;
    font-size: 10px;
    line-height: 14px;
    font-weight: 600;
  }

  .elo-trends-stats-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
    margin-top: 17px;
  }

  .elo-trends-stat-card {
    min-height: 136px;
    border: 1px solid #E0E5E2;
    border-radius: 18px;
    background: #FFFFFF;
    padding: 14px;
  }

  .elo-trends-stat-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .elo-trends-stat-icon {
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 13px;
    background: #E5F0EC;
    color: #005744;
  }

  .elo-trends-change-badge {
    min-height: 27px;
    display: flex;
    align-items: center;
    gap: 3px;
    border-radius: 9px;
    padding: 0 7px;
  }

  .elo-trends-change-badge.is-up {
    background: #E8F5EF;
    color: #11724E;
  }

  .elo-trends-change-badge.is-down {
    background: #FCEDEA;
    color: #A6382F;
  }

  .elo-trends-change-badge span {
    font-size: 8px;
    font-weight: 900;
  }

  .elo-trends-stat-value {
    margin-top: 14px;
    color: #17251F;
    font-size: 29px;
    line-height: 32px;
    font-weight: 900;
    letter-spacing: -.7px;
  }

  .elo-trends-stat-label {
    margin-top: 4px;
    color: #7B8581;
    font-size: 9.5px;
    font-weight: 800;
  }

  .elo-trends-section {
    margin-top: 14px;
    border: 1px solid #E0E5E2;
    border-radius: 19px;
    background: #FFFFFF;
    padding: 14px;
  }

  .elo-trends-section.is-green {
    border-color: #CBE0D8;
    background: #F4FAF7;
  }

  .elo-trends-section.is-amber {
    border-color: #EBD8AF;
    background: #FFFAEF;
  }

  .elo-trends-section-header {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .elo-trends-section-icon {
    width: 40px;
    height: 40px;
    flex: 0 0 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 13px;
    background: #E5F0EC;
    color: #005744;
  }

  .elo-trends-section-icon.is-green {
    background: #005744;
    color: #FFFFFF;
  }

  .elo-trends-section-icon.is-amber {
    background: #FFF0CD;
    color: #8A5A00;
  }

  .elo-trends-section-header > div:last-child {
    min-width: 0;
    flex: 1;
  }

  .elo-trends-section-header h2 {
    margin: 0;
    color: #25342E;
    font-size: 13px;
    font-weight: 900;
  }

  .elo-trends-section-header p {
    margin: 2px 0 0;
    color: #808A86;
    font-size: 8.5px;
    line-height: 13px;
    font-weight: 600;
  }

  .elo-trends-empty-list {
    margin-top: 13px;
    border: 1px dashed #DCE2DF;
    border-radius: 13px;
    padding: 22px 12px;
    color: #8B9490;
    font-size: 9.5px;
    font-weight: 700;
    text-align: center;
  }

  .elo-trends-list {
    margin-top: 10px;
  }

  .elo-trends-row {
    min-height: 62px;
    display: flex;
    align-items: center;
    border-bottom: 1px solid #E3E7E5;
    padding: 9px 0;
  }

  .elo-trends-row.is-last {
    border-bottom: 0;
  }

  .elo-trends-rank {
    width: 34px;
    height: 34px;
    flex: 0 0 34px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 11px;
    background: #EFF2F0;
    color: #7C8682;
    font-size: 10px;
    font-weight: 900;
  }

  .elo-trends-row-copy {
    min-width: 0;
    flex: 1;
    margin: 0 8px 0 10px;
  }

  .elo-trends-row-copy strong {
    display: block;
    color: #27352F;
    font-size: 11.5px;
    line-height: 15px;
    font-weight: 900;
    overflow-wrap: anywhere;
  }

  .elo-trends-row-copy span {
    display: block;
    margin-top: 3px;
    color: #8B9490;
    font-size: 8.5px;
    font-weight: 700;
  }

  .elo-trends-row-change {
    min-height: 28px;
    flex: 0 0 auto;
    display: flex;
    align-items: center;
    gap: 3px;
    border-radius: 9px;
    padding: 0 7px;
  }

  .elo-trends-row-change.is-up {
    background: #E7F4EE;
    color: #11724E;
  }

  .elo-trends-row-change.is-down {
    background: #FCEDEA;
    color: #A6382F;
  }

  .elo-trends-row-change span {
    font-size: 8px;
    font-weight: 900;
  }

  .elo-trends-privacy-note {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    margin-top: 15px;
    border-radius: 14px;
    background: #E9EDEA;
    padding: 12px;
    color: #71807A;
  }

  .elo-trends-privacy-note svg {
    flex: 0 0 auto;
  }

  .elo-trends-privacy-note p {
    margin: 0;
    color: #6E7974;
    font-size: 9px;
    line-height: 13px;
    font-weight: 600;
  }

  .elo-trends-page button:focus {
    outline: none;
  }

  .elo-trends-page button:focus-visible {
    outline: 2px solid #9EAEA7;
    outline-offset: 2px;
  }

  .elo-trends-spin {
    animation: elo-trends-spin .8s linear infinite;
  }

  @keyframes elo-trends-spin {
    to {
      transform: rotate(360deg);
    }
  }

  @media (max-width: 390px) {
    .elo-trends-stats-grid {
      grid-template-columns: 1fr;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .elo-trends-spin {
      animation: none;
    }
  }
`;

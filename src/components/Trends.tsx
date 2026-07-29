"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowUpRight,
  BarChart3,
  LoaderCircle,
  RefreshCw,
  Search,
  ShieldAlert,
  TrendingUp,
} from "lucide-react";

import { createClient } from "@/lib/supabase/client";

type SearchLogRow = Record<string, unknown>;

type SearchItem = {
  term: string;
  count: number;
};

type RisingItem = SearchItem & {
  previousCount: number;
  increase: number;
};

function getTextValue(
  row: SearchLogRow,
  keys: string[],
): string {
  for (const key of keys) {
    const value = row[key];

    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return "";
}

function getDateValue(row: SearchLogRow): Date | null {
  const value =
    row.created_at ??
    row.searched_at ??
    row.timestamp ??
    row.date;

  if (typeof value !== "string") {
    return null;
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? null : date;
}

const BLOCKED_SEARCH_TERMS = [
  "nigger",
  "nigga",
  "faggot",
  "fag",
];

function normaliseForModeration(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function isBlockedSearchTerm(value: string) {
  const normalised = normaliseForModeration(value);

  return BLOCKED_SEARCH_TERMS.some((term) =>
    normalised.includes(
      normaliseForModeration(term),
    ),
  );
}

function getSearchTerm(row: SearchLogRow) {
  return getTextValue(row, [
    "query",
    "search_query",
    "search_term",
    "term",
    "search",
    "keyword",
  ]);
}

function normaliseTerm(value: string) {
  return value
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function displayTerm(value: string) {
  return value.replace(/\b\w/g, (letter) =>
    letter.toUpperCase(),
  );
}

function countTerms(rows: SearchLogRow[]) {
  const counts = new Map<string, number>();

  for (const row of rows) {
    const rawTerm = getSearchTerm(row);
    const term = normaliseTerm(rawTerm);

    if (
      term.length < 2 ||
      isBlockedSearchTerm(term)
    ) {
      continue;
    }

    counts.set(term, (counts.get(term) ?? 0) + 1);
  }

  return counts;
}

function toSortedItems(counts: Map<string, number>) {
  return Array.from(counts.entries())
    .map(([term, count]) => ({
      term,
      count,
    }))
    .sort((a, b) => {
      if (b.count !== a.count) {
        return b.count - a.count;
      }

      return a.term.localeCompare(b.term);
    });
}

export default function Trends() {
  const [rows, setRows] = useState<SearchLogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadTrends = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const supabase = createClient();

      const { data, error: loadError } = await supabase
        .from("search_logs")
        .select("*")
        .limit(5000);

      if (loadError) {
        throw loadError;
      }

      setRows((data ?? []) as SearchLogRow[]);
    } catch (caughtError) {
      console.error("Failed to load search trends:", caughtError);

      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Search trends could not be loaded.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadTrends();
  }, [loadTrends]);

  const trends = useMemo(() => {
    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    const sevenDaysAgo = new Date(now);
    const fourteenDaysAgo = new Date(now);

    thirtyDaysAgo.setDate(now.getDate() - 30);
    sevenDaysAgo.setDate(now.getDate() - 7);
    fourteenDaysAgo.setDate(now.getDate() - 14);

    const datedRows = rows.filter((row) => getDateValue(row));
    const hasDates = datedRows.length > 0;

    const recentThirtyDays = hasDates
      ? rows.filter((row) => {
          const date = getDateValue(row);
          return date && date >= thirtyDaysAgo;
        })
      : rows;

    const currentWeek = hasDates
      ? rows.filter((row) => {
          const date = getDateValue(row);
          return date && date >= sevenDaysAgo;
        })
      : rows;

    const previousWeek = hasDates
      ? rows.filter((row) => {
          const date = getDateValue(row);

          return (
            date &&
            date >= fourteenDaysAgo &&
            date < sevenDaysAgo
          );
        })
      : [];

    const thirtyDayCounts = countTerms(recentThirtyDays);
    const currentWeekCounts = countTerms(currentWeek);
    const previousWeekCounts = countTerms(previousWeek);

    const topSearches = toSortedItems(thirtyDayCounts).slice(
      0,
      10,
    );

    const risingSearches = Array.from(
      currentWeekCounts.entries(),
    )
      .map(([term, count]) => {
        const previousCount =
          previousWeekCounts.get(term) ?? 0;

        return {
          term,
          count,
          previousCount,
          increase: count - previousCount,
        };
      })
      .filter((item) => item.increase > 0)
      .sort((a, b) => {
        if (b.increase !== a.increase) {
          return b.increase - a.increase;
        }

        return b.count - a.count;
      })
      .slice(0, 6) as RisingItem[];

    const totalSearches = Array.from(
      thirtyDayCounts.values(),
    ).reduce((total, count) => total + count, 0);

    return {
      topSearches,
      risingSearches,
      totalSearches,
      uniqueSearches: thirtyDayCounts.size,
      hasDates,
    };
  }, [rows]);

  const highestCount = trends.topSearches[0]?.count ?? 1;

  return (
    <section className="bg-white px-5 py-12 text-black sm:px-8 lg:px-12 lg:py-16">
      <div className="mx-auto w-full max-w-7xl">
        <div className="flex flex-col gap-5 border-b border-black/10 pb-8 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.18em] text-emerald-700">
              Local Partner
            </p>

            <h2 className="mt-3 text-4xl font-black tracking-[-0.05em] sm:text-5xl">
              Local trends.
            </h2>

            <p className="mt-4 max-w-2xl leading-7 text-black/55">
              See what people are searching for across East
              Lothian Online.
            </p>

            <div className="mt-5 flex max-w-3xl items-start gap-3 rounded-2xl bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
              <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" />
              <p>
                Search terms are entered by visitors. ELO does not control or
                endorse what people search for. Clearly abusive terms are
                hidden from this view where possible.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => void loadTrends()}
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
            Loading local trends
          </div>
        ) : (
          <>
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <article className="rounded-3xl border border-black/10 p-6">
                <div className="flex items-center gap-3 text-emerald-700">
                  <BarChart3 className="h-5 w-5" />
                  <p className="text-sm font-black uppercase tracking-[0.12em]">
                    Searches
                  </p>
                </div>

                <p className="mt-5 text-4xl font-black tracking-[-0.05em]">
                  {trends.totalSearches.toLocaleString("en-GB")}
                </p>

                <p className="mt-2 text-sm text-black/45">
                  {trends.hasDates
                    ? "Recorded in the last 30 days"
                    : "Recorded searches"}
                </p>
              </article>

              <article className="rounded-3xl border border-black/10 p-6">
                <div className="flex items-center gap-3 text-emerald-700">
                  <Search className="h-5 w-5" />
                  <p className="text-sm font-black uppercase tracking-[0.12em]">
                    Unique searches
                  </p>
                </div>

                <p className="mt-5 text-4xl font-black tracking-[-0.05em]">
                  {trends.uniqueSearches.toLocaleString("en-GB")}
                </p>

                <p className="mt-2 text-sm text-black/45">
                  Different search terms
                </p>
              </article>
            </div>

            <div className="mt-10 grid gap-10 lg:grid-cols-[1.25fr_0.75fr]">
              <section>
                <div className="flex items-center gap-3">
                  <Search className="h-5 w-5 text-emerald-700" />

                  <h3 className="text-2xl font-black tracking-[-0.03em]">
                    Most searched
                  </h3>
                </div>

                {trends.topSearches.length ? (
                  <div className="mt-6 divide-y divide-black/10 border-y border-black/10">
                    {trends.topSearches.map(
                      (item: SearchItem, index) => (
                        <article
                          key={item.term}
                          className="py-5"
                        >
                          <div className="flex items-center justify-between gap-5">
                            <div className="flex min-w-0 items-center gap-4">
                              <span className="w-6 shrink-0 text-sm font-black text-black/30">
                                {index + 1}
                              </span>

                              <p className="truncate font-black">
                                {displayTerm(item.term)}
                              </p>
                            </div>

                            <span className="shrink-0 text-sm font-black text-emerald-700">
                              {item.count}{" "}
                              {item.count === 1
                                ? "search"
                                : "searches"}
                            </span>
                          </div>

                          <div className="mt-3 h-2 overflow-hidden rounded-full bg-black/[0.06]">
                            <div
                              className="h-full rounded-full bg-emerald-700"
                              style={{
                                width: `${Math.max(
                                  6,
                                  (item.count / highestCount) *
                                    100,
                                )}%`,
                              }}
                            />
                          </div>
                        </article>
                      ),
                    )}
                  </div>
                ) : (
                  <div className="mt-6 rounded-3xl border border-black/10 px-6 py-12 text-center text-black/45">
                    No search data has been recorded yet.
                  </div>
                )}
              </section>

              <section>
                <div className="flex items-center gap-3">
                  <TrendingUp className="h-5 w-5 text-emerald-700" />

                  <h3 className="text-2xl font-black tracking-[-0.03em]">
                    Rising searches
                  </h3>
                </div>

                {trends.risingSearches.length ? (
                  <div className="mt-6 space-y-3">
                    {trends.risingSearches.map(
                      (item: RisingItem) => (
                        <article
                          key={item.term}
                          className="rounded-2xl border border-black/10 p-5"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <p className="font-black">
                                {displayTerm(item.term)}
                              </p>

                              <p className="mt-2 text-sm text-black/45">
                                {item.count} searches this week
                              </p>
                            </div>

                            <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-100 px-2.5 py-1 text-xs font-black text-emerald-800">
                              <ArrowUpRight className="h-3.5 w-3.5" />
                              +{item.increase}
                            </span>
                          </div>
                        </article>
                      ),
                    )}
                  </div>
                ) : (
                  <div className="mt-6 rounded-3xl border border-black/10 px-6 py-12 text-center text-black/45">
                    More search history is needed to show
                    rising trends.
                  </div>
                )}
              </section>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
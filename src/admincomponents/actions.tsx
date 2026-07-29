"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  LoaderCircle,
  MessageSquareText,
  RefreshCw,
  XCircle,
} from "lucide-react";

import { createClient } from "@/lib/supabase/client";

type PendingPage = {
  id: string;
  name: string;
  slug: string | null;
  description: string | null;
  logo_url: string | null;
  brand_color: string | null;
  created_at: string | null;
  submitted_at: string | null;
  status: string | null;
  layout: Record<string, unknown> | null;
};

const PAGE_SELECT = `
  id,
  name,
  slug,
  description,
  logo_url,
  brand_color,
  created_at,
  submitted_at,
  status,
  layout
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

export default function Actions() {
  const [pages, setPages] = useState<PendingPage[]>([]);
  const [comments, setComments] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
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

    return user.id;
  }, []);

  const loadPendingPages = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      await verifyAdmin();

      const supabase = createClient();

      const { data, error: loadError } = await supabase
        .from("groups")
        .select(PAGE_SELECT)
        .eq("status", "pending")
        .order("submitted_at", { ascending: true });

      if (loadError) throw loadError;

      setPages((data ?? []) as PendingPage[]);
    } catch (caughtError) {
      console.error("Failed to load pending pages:", caughtError);

      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Pending pages could not be loaded.",
      );
    } finally {
      setLoading(false);
    }
  }, [verifyAdmin]);

  useEffect(() => {
    void loadPendingPages();
  }, [loadPendingPages]);

  async function reviewPage(
    page: PendingPage,
    decision: "approved" | "rejected",
  ) {
    if (updatingId) return;

    const comment = comments[page.id]?.trim() ?? "";

    if (decision === "rejected" && !comment) {
      setError("A rejection comment is required.");
      return;
    }

    setUpdatingId(page.id);
    setError("");

    try {
      const adminId = await verifyAdmin();
      const supabase = createClient();

      const currentLayout =
        page.layout &&
        typeof page.layout === "object" &&
        !Array.isArray(page.layout)
          ? page.layout
          : {};

      const nextLayout = {
        ...currentLayout,
        admin_review: {
          decision,
          comment: comment || null,
          reviewed_at: new Date().toISOString(),
          reviewed_by: adminId,
        },
      };

      const updatePayload =
        decision === "approved"
          ? {
              status: "approved",
              approved_at: new Date().toISOString(),
              is_public: true,
              layout: nextLayout,
            }
          : {
              status: "rejected",
              approved_at: null,
              is_public: false,
              layout: nextLayout,
            };

      const { data, error: updateError } = await supabase
        .from("groups")
        .update(updatePayload)
        .eq("id", page.id)
        .eq("status", "pending")
        .select(PAGE_SELECT)
        .maybeSingle();

      if (updateError) throw updateError;

      if (!data) {
        throw new Error(
          "The page was not updated. Check the groups UPDATE policy for administrators.",
        );
      }

      setPages((current) =>
        current.filter((item) => item.id !== page.id),
      );

      setComments((current) => {
        const next = { ...current };
        delete next[page.id];
        return next;
      });
    } catch (caughtError) {
      console.error("Failed to review page:", caughtError);

      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "The page review could not be saved.",
      );
    } finally {
      setUpdatingId(null);
    }
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
              Actions
            </h1>

            <p className="mt-3 max-w-2xl leading-7 text-slate-600">
              Review every pending page and leave feedback before approving or rejecting it.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void loadPendingPages()}
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

        <section className="mt-8 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 py-5 sm:px-7">
            <h2 className="text-xl font-black">Pending pages</h2>

            <p className="mt-1 text-sm font-semibold text-slate-500">
              {pages.length} awaiting review
            </p>
          </div>

          {loading ? (
            <div className="flex min-h-64 items-center justify-center gap-3 text-sm font-bold text-slate-500">
              <LoaderCircle className="h-5 w-5 animate-spin" />
              Loading pending pages
            </div>
          ) : pages.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-500" />
              <p className="mt-4 font-black">Nothing waiting for review.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-200">
              {pages.map((page) => {
                const updating = updatingId === page.id;

                return (
                  <article
                    key={page.id}
                    className="px-5 py-6 sm:px-7"
                  >
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                      <div className="flex min-w-0 items-start gap-4">
                        <div
                          className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 font-black text-white"
                          style={{
                            backgroundColor:
                              page.brand_color || "#64748b",
                          }}
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
                          <span className="rounded-lg bg-amber-100 px-2.5 py-1 text-xs font-black text-amber-800">
                            Pending
                          </span>

                          <h3 className="mt-3 break-words text-2xl font-black tracking-[-0.03em]">
                            {page.name}
                          </h3>

                          <p className="mt-2 max-w-3xl whitespace-pre-line leading-7 text-slate-600">
                            {page.description || "No description provided."}
                          </p>

                          <p className="mt-3 text-xs font-bold text-slate-400">
                            Submitted {formatDate(page.submitted_at)}
                            {page.slug ? ` · /${page.slug}` : ""}
                          </p>
                        </div>
                      </div>
                    </div>

                    <label className="mt-6 block">
                      <span className="flex items-center gap-2 text-sm font-black text-slate-700">
                        <MessageSquareText className="h-4 w-4" />
                        Review comment
                      </span>

                      <textarea
                        value={comments[page.id] ?? ""}
                        onChange={(event) =>
                          setComments((current) => ({
                            ...current,
                            [page.id]: event.target.value,
                          }))
                        }
                        placeholder="Add feedback for the page owner"
                        rows={4}
                        className="mt-3 w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 leading-7 outline-none transition focus:border-emerald-600 focus:bg-white"
                      />
                    </label>

                    <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:justify-end">
                      <button
                        type="button"
                        onClick={() =>
                          void reviewPage(page, "rejected")
                        }
                        disabled={updating}
                        className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-5 text-sm font-black text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {updating ? (
                          <LoaderCircle className="h-4 w-4 animate-spin" />
                        ) : (
                          <XCircle className="h-4 w-4" />
                        )}
                        Reject
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          void reviewPage(page, "approved")
                        }
                        disabled={updating}
                        className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 text-sm font-black text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {updating ? (
                          <LoaderCircle className="h-4 w-4 animate-spin" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4" />
                        )}
                        Approve
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </section>
  );
}
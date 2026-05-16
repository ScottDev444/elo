"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  User,
  CalendarDays,
  Plus,
  Search,
  House,
  X,
  AlertTriangle,
  ChevronRight,
  Store,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

type SearchPost = {
  id: string;
  title: string;
  type: string;
  groups?:
    | {
        name?: string;
        slug?: string | null;
        is_local_partner?: boolean | null;
        local_partner?: boolean | null;
        partner?: boolean | null;
      }
    | {
        name?: string;
        slug?: string | null;
        is_local_partner?: boolean | null;
        local_partner?: boolean | null;
        partner?: boolean | null;
      }[]
    | null;
};

type SearchPage = {
  id: string;
  name: string;
  slug: string;
  page_type?: string | null;
  is_local_partner?: boolean | null;
  local_partner?: boolean | null;
  partner?: boolean | null;
};

type SearchResult =
  | { kind: "page"; page: SearchPage }
  | { kind: "post"; post: SearchPost };

export default function QuickActionBar() {
  const [isMobile, setIsMobile] = useState(false);
  const [hasApprovedPage, setHasApprovedPage] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [posts, setPosts] = useState<SearchPost[]>([]);
  const [pages, setPages] = useState<SearchPage[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastSavedQuery, setLastSavedQuery] = useState("");

  useEffect(() => {
    function checkMobile() {
      setIsMobile(window.innerWidth < 768);
    }

    checkMobile();
    window.addEventListener("resize", checkMobile);

    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    if (!searchOpen) return;

    const previousOverflow = document.body.style.overflow;
    const previousPosition = document.body.style.position;
    const previousWidth = document.body.style.width;

    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.width = "100%";

    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.position = previousPosition;
      document.body.style.width = previousWidth;
    };
  }, [searchOpen]);

  useEffect(() => {
    async function checkApprovedPage() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { data } = await supabase
        .from("groups")
        .select("id")
        .eq("user_id", user.id)
        .eq("status", "approved")
        .limit(1)
        .maybeSingle();

      setHasApprovedPage(!!data);
    }

    checkApprovedPage();
  }, []);

  useEffect(() => {
    if (!searchOpen) return;

    const cleaned = query.trim();

    if (cleaned.length < 2) {
      setPosts([]);
      setPages([]);
      setLoading(false);
      return;
    }

    const timeout = setTimeout(async () => {
      setLoading(true);

      const [pageResult, postResult] = await Promise.all([
        supabase
          .from("groups")
          .select(
            "id, name, slug, page_type, is_local_partner, local_partner, partner",
          )
          .eq("status", "approved")
          .or(
            `name.ilike.%${cleaned}%,description.ilike.%${cleaned}%,page_type.ilike.%${cleaned}%`,
          )
          .limit(8),

        supabase
          .from("posts")
          .select(
            `
            id,
            title,
            type,
            groups(name, slug, is_local_partner, local_partner, partner)
          `,
          )
          .or(`title.ilike.%${cleaned}%,type.ilike.%${cleaned}%`)
          .limit(12),
      ]);

      setPages((pageResult.data ?? []) as SearchPage[]);
      setPosts((postResult.data ?? []) as SearchPost[]);
      setLoading(false);
    }, 250);

    return () => clearTimeout(timeout);
  }, [query, searchOpen]);

  useEffect(() => {
    const cleaned = query.trim();

    if (!searchOpen || cleaned.length <= 3) return;
    if (cleaned === lastSavedQuery) return;

    const timeout = setTimeout(async () => {
      await supabase.from("suggestions").insert({
        suggestion: cleaned,
      });

      setLastSavedQuery(cleaned);
    }, 1200);

    return () => clearTimeout(timeout);
  }, [query, searchOpen, lastSavedQuery]);

  const actions = [
    { label: "Account", href: "/account", icon: User },
    { label: "My Calendar", href: "/my-calendar", icon: CalendarDays },
    ...(hasApprovedPage
      ? [{ label: "Post", href: "/create-post", icon: Plus, highlight: true }]
      : []),
    { label: "Search", href: "#", icon: Search, search: true },
    { label: "Home", href: "/", icon: House },
  ];

  function getPostGroup(post: SearchPost) {
    return Array.isArray(post.groups) ? post.groups[0] : post.groups;
  }

  function isLocalPartner(
    value?: {
      is_local_partner?: boolean | null;
      local_partner?: boolean | null;
      partner?: boolean | null;
    } | null,
  ) {
    return !!(
      value?.is_local_partner ||
      value?.local_partner ||
      value?.partner
    );
  }

  function isEastLothianOnlinePost(post: SearchPost) {
    const group = getPostGroup(post);
    return (
      group?.slug === "east-lothian-online" ||
      group?.name?.trim().toLowerCase() === "east lothian online"
    );
  }

  function typeRank(result: SearchResult) {
    if (result.kind === "page") return 3;

    if (result.post.type === "update" || result.post.type === "alert") return 0;
    if (result.post.type === "deal") return 1;
    if (result.post.type === "event") return 2;

    return 4;
  }

  const results = useMemo<SearchResult[]>(() => {
    return [
      ...pages.map((page) => ({ kind: "page" as const, page })),
      ...posts.map((post) => ({ kind: "post" as const, post })),
    ].sort((a, b) => {
      const aIsEloPost = a.kind === "post" && isEastLothianOnlinePost(a.post);
      const bIsEloPost = b.kind === "post" && isEastLothianOnlinePost(b.post);

      if (aIsEloPost !== bIsEloPost) return aIsEloPost ? 1 : -1;

      const aPartner =
        a.kind === "page"
          ? isLocalPartner(a.page)
          : isLocalPartner(getPostGroup(a.post));
      const bPartner =
        b.kind === "page"
          ? isLocalPartner(b.page)
          : isLocalPartner(getPostGroup(b.post));

      if (aPartner !== bPartner) return aPartner ? -1 : 1;

      return typeRank(a) - typeRank(b);
    });
  }, [pages, posts]);

  const hasResults = results.length > 0;

  if (!isMobile) return null;

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around border-t border-neutral-200 bg-white px-4 py-3">
        {actions.map(({ label, href, icon: Icon, highlight, search }) =>
          search ? (
            <button
              key={label}
              type="button"
              aria-label={label}
              onClick={() => setSearchOpen(true)}
              className="flex h-10 w-10 items-center justify-center rounded-full transition hover:bg-neutral-100"
            >
              <Icon size={22} className="text-black" />
            </button>
          ) : (
            <Link
              key={label}
              href={href}
              aria-label={label}
              className={`flex h-10 w-10 items-center justify-center rounded-full transition ${
                highlight ? "bg-emerald-100" : "hover:bg-neutral-100"
              }`}
            >
              <Icon size={22} className="text-black" />
            </Link>
          ),
        )}
      </nav>

      {searchOpen && (
        <div className="fixed inset-0 z-[100] flex h-dvh flex-col overflow-hidden bg-white">
          <div className="flex items-center gap-3 border-b border-neutral-100 p-4">
            <div className="flex flex-1 items-center gap-3 rounded-2xl bg-neutral-100 px-4 py-3">
              <Search size={20} className="text-neutral-400" />

              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search East Lothian..."
                className="w-full bg-transparent text-base font-semibold text-black outline-none placeholder:text-neutral-400"
              />
            </div>

            <button
              type="button"
              onClick={() => {
                setSearchOpen(false);
                setQuery("");
              }}
              className="rounded-2xl bg-neutral-100 p-3 text-black"
            >
              <X size={20} />
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-5 pb-24">
            {query.trim().length < 2 ? (
              <div className="rounded-[2rem] bg-emerald-800 p-6 text-white">
                <p className="text-xs font-bold uppercase tracking-[0.25em] text-emerald-100/70">
                  Search
                </p>

                <h2 className="mt-2 text-3xl font-black leading-none">
                  Find local things fast.
                </h2>

                <p className="mt-3 text-sm text-white/80">
                  Search pages, alerts, events and deals.
                </p>
              </div>
            ) : loading ? (
              <p className="text-sm font-semibold text-neutral-500">
                Searching...
              </p>
            ) : hasResults ? (
              <div className="space-y-2">
                {results.map((result) => {
                  if (result.kind === "page") {
                    const page = result.page;

                    return (
                      <Link
                        key={`page-${page.id}`}
                        href={`/${page.slug}`}
                        onClick={() => setSearchOpen(false)}
                        className="flex items-center justify-between rounded-3xl bg-neutral-50 p-4"
                      >
                        <div className="flex items-center gap-3">
                          <div className="rounded-2xl bg-emerald-100 p-3 text-emerald-800">
                            <Store size={20} />
                          </div>

                          <div>
                            <p className="font-bold text-black">{page.name}</p>

                            <p className="text-xs text-neutral-500">
                              {isLocalPartner(page) ? "Local Partner · " : ""}
                              {page.page_type ?? "Page"}
                            </p>
                          </div>
                        </div>

                        <ChevronRight size={20} className="text-neutral-400" />
                      </Link>
                    );
                  }

                  const post = result.post;
                  const isAlert =
                    post.type === "update" || post.type === "alert";
                  const group = getPostGroup(post);
                  const groupName = group?.name ?? "East Lothian";

                  return (
                    <Link
                      key={`post-${post.id}`}
                      href={`/posts/${post.id}`}
                      onClick={() => setSearchOpen(false)}
                      className="flex items-center justify-between rounded-3xl bg-neutral-50 p-4"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`rounded-2xl p-3 ${
                            isAlert
                              ? "bg-yellow-100 text-yellow-700"
                              : "bg-emerald-100 text-emerald-800"
                          }`}
                        >
                          {isAlert ? (
                            <AlertTriangle size={20} />
                          ) : (
                            <CalendarDays size={20} />
                          )}
                        </div>

                        <div>
                          <p className="font-bold text-black">{post.title}</p>

                          <p className="text-xs text-neutral-500">
                            {isLocalPartner(group) ? "Local Partner · " : ""}
                            {groupName}
                          </p>
                        </div>
                      </div>

                      <ChevronRight size={20} className="text-neutral-400" />
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-[2rem] bg-neutral-100 p-6 text-center">
                <p className="text-2xl font-black text-black">
                  No results yet.
                </p>

                <p className="mt-2 text-sm text-neutral-500">
                  We’ll use searches like this to learn what East Lothian wants.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

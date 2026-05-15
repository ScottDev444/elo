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
  groups?: {
    name?: string;
  }[] | null;
};

type SearchPage = {
  id: string;
  name: string;
  slug: string;
  page_type?: string | null;
};

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
          .select("id, name, slug, page_type")
          .eq("status", "approved")
          .or(
            `name.ilike.%${cleaned}%,description.ilike.%${cleaned}%,page_type.ilike.%${cleaned}%`
          )
          .limit(8),

        supabase
          .from("posts")
          .select(`
            id,
            title,
            type,
            groups(name)
          `)
          .or(`title.ilike.%${cleaned}%,type.ilike.%${cleaned}%`)
          .limit(12),
      ]);

      const sortedPosts = ((postResult.data ?? []) as SearchPost[]).sort(
        (a, b) => {
          if (a.type === "update" && b.type !== "update") return -1;
          if (a.type !== "update" && b.type === "update") return 1;
          return 0;
        }
      );

      setPages((pageResult.data ?? []) as SearchPage[]);
      setPosts(sortedPosts);
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

  const hasResults = useMemo(() => {
    return pages.length > 0 || posts.length > 0;
  }, [pages, posts]);

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
          )
        )}
      </nav>

      {searchOpen && (
        <div className="fixed inset-0 z-[100] bg-white">
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

          <div className="p-5 pb-24">
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
              <div className="space-y-8">
                {pages.length > 0 && (
                  <section>
                    <h2 className="mb-3 text-2xl font-black text-black">
                      🏪 Pages
                    </h2>

                    <div className="space-y-2">
                      {pages.map((page) => (
                        <Link
                          key={page.id}
                          href={`/${page.slug}`}
                          onClick={() => setSearchOpen(false)}
                          className="flex items-center justify-between rounded-3xl bg-neutral-50 p-4"
                        >
                          <div className="flex items-center gap-3">
                            <div className="rounded-2xl bg-emerald-100 p-3 text-emerald-800">
                              <Store size={20} />
                            </div>

                            <div>
                              <p className="font-bold text-black">
                                {page.name}
                              </p>

                              <p className="text-xs text-neutral-500">
                                {page.page_type ?? "Page"}
                              </p>
                            </div>
                          </div>

                          <ChevronRight
                            size={20}
                            className="text-neutral-400"
                          />
                        </Link>
                      ))}
                    </div>
                  </section>
                )}

                {posts.length > 0 && (
                  <section>
                    <h2 className="mb-3 text-2xl font-black text-black">
                      ⚠️ Alerts, events & deals
                    </h2>

                    <div className="space-y-2">
                      {posts.map((post) => (
                        <Link
                          key={post.id}
                          href={`/posts/${post.id}`}
                          onClick={() => setSearchOpen(false)}
                          className="flex items-center justify-between rounded-3xl bg-neutral-50 p-4"
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`rounded-2xl p-3 ${
                                post.type === "update"
                                  ? "bg-yellow-100 text-yellow-700"
                                  : "bg-emerald-100 text-emerald-800"
                              }`}
                            >
                              {post.type === "update" ? (
                                <AlertTriangle size={20} />
                              ) : (
                                <CalendarDays size={20} />
                              )}
                            </div>

                            <div>
                              <p className="font-bold text-black">
                                {post.title}
                              </p>

                              <p className="text-xs text-neutral-500">
                                {post.groups?.[0]?.name ?? "East Lothian"}
                              </p>
                            </div>
                          </div>

                          <ChevronRight
                            size={20}
                            className="text-neutral-400"
                          />
                        </Link>
                      ))}
                    </div>
                  </section>
                )}
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
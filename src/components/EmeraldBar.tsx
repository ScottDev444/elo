"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  Bookmark,
  CalendarDays,
  CirclePlus,
  Home,
  Search,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type NavItem = {
  key: "feed" | "search" | "post" | "saved" | "calendar";
  label: string;
  href: string;
};

const ITEMS: NavItem[] = [
  {
    key: "feed",
    label: "Feed",
    href: "/",
  },
  {
    key: "search",
    label: "Search",
    href: "/search",
  },
  {
    key: "post",
    label: "Post",
    href: "/create",
  },
  {
    key: "saved",
    label: "Saved",
    href: "/saved",
  },
  {
    key: "calendar",
    label: "Calendar",
    href: "/calendar",
  },
];

function IconFor({
  item,
  active,
}: {
  item: NavItem["key"];
  active: boolean;
}) {
  const common = {
    size: item === "post" ? 29 : 24,
    strokeWidth: active ? 2.6 : 2.1,
  };

  if (item === "feed") {
    return <Home {...common} />;
  }

  if (item === "search") {
    return <Search {...common} />;
  }

  if (item === "post") {
    return <CirclePlus {...common} />;
  }

  if (item === "saved") {
    return <Bookmark {...common} />;
  }

  return <CalendarDays {...common} />;
}

function routeIsActive(pathname: string, item: NavItem) {
  if (item.href === "/") {
    return pathname === "/";
  }

  return (
    pathname === item.href ||
    pathname.startsWith(`${item.href}/`)
  );
}

export default function EmeraldBar() {
  const pathname = usePathname();
  const supabase = useMemo(() => createClient(), []);
  const [canPost, setCanPost] = useState(false);

  useEffect(() => {
    let active = true;

    async function checkPostAccess(userId?: string) {
      if (!userId) {
        if (active) {
          setCanPost(false);
        }

        return;
      }

      const { data, error } = await supabase
        .from("groups")
        .select("id")
        .eq("user_id", userId)
        .eq("status", "approved")
        .limit(1)
        .maybeSingle();

      if (!active) {
        return;
      }

      if (error) {
        console.error(
          "Emerald bar Page check failed:",
          error
        );

        setCanPost(false);
        return;
      }

      setCanPost(Boolean(data));
    }

    async function loadInitialAccess() {
      const { data, error } =
        await supabase.auth.getSession();

      if (!active) {
        return;
      }

      if (error) {
        console.error(
          "Emerald bar session check failed:",
          error
        );

        setCanPost(false);
        return;
      }

      await checkPostAccess(
        data.session?.user.id
      );
    }

    void loadInitialAccess();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        void checkPostAccess(
          session?.user.id
        );
      }
    );

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  const visibleItems = ITEMS.filter(
    (item) =>
      item.key !== "post" || canPost
  );

  return (
    <>
      <nav
        className="elo-emerald-bar-wrap"
        aria-label="Primary"
      >
        <div className="elo-emerald-bar">
          <svg
            className="elo-emerald-shards"
            width="100%"
            height="100%"
            viewBox="0 0 400 70"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <polygon
              points="0,0 70,0 42,38 0,50"
              fill="#006F57"
            />

            <polygon
              points="70,0 145,0 115,34 42,38"
              fill="#00906C"
            />

            <polygon
              points="145,0 220,0 185,44 115,34"
              fill="#007A5E"
            />

            <polygon
              points="220,0 300,0 270,34 185,44"
              fill="#009A72"
            />

            <polygon
              points="300,0 400,0 400,41 270,34"
              fill="#00745A"
            />

            <polygon
              points="0,50 42,38 90,70 0,70"
              fill="#008A68"
            />

            <polygon
              points="42,38 115,34 145,70 90,70"
              fill="#007258"
            />

            <polygon
              points="115,34 185,44 215,70 145,70"
              fill="#00946E"
            />

            <polygon
              points="185,44 270,34 300,70 215,70"
              fill="#007B5E"
            />

            <polygon
              points="270,34 400,41 400,70 300,70"
              fill="#008B68"
            />

            <polygon
              points="70,0 115,34 42,38"
              fill="#00A078"
            />

            <polygon
              points="220,0 270,34 185,44"
              fill="#008362"
            />
          </svg>

          <div className="elo-emerald-items">
            {visibleItems.map((item) => {
              const active =
                routeIsActive(
                  pathname,
                  item
                );

              return (
                <Link
                  key={item.key}
                  href={item.href}
                  className={`elo-emerald-item ${
                    active
                      ? "is-active"
                      : ""
                  }`}
                  aria-label={item.label}
                  aria-current={
                    active
                      ? "page"
                      : undefined
                  }
                >
                  <span className="elo-emerald-icon">
                    <IconFor
                      item={item.key}
                      active={active}
                    />

                    <span className="elo-emerald-active-line" />
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      </nav>

      <style>{`
        .elo-emerald-bar-wrap {
          position: fixed;
          z-index: 1000;
          left: 0;
          right: 0;
          bottom: max(
            8px,
            env(safe-area-inset-bottom)
          );
          padding: 0 18px;
          pointer-events: none;
        }

        .elo-emerald-bar {
          position: relative;
          width: 100%;
          max-width: 760px;
          height: 58px;
          margin: 0 auto;
          overflow: hidden;
          border-radius: 22px;
          background: #008564;
          box-shadow:
            0 5px 12px
            rgba(0, 0, 0, .18);
          pointer-events: auto;
        }

        .elo-emerald-shards {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
        }

        .elo-emerald-items {
          position: relative;
          z-index: 1;
          display: flex;
          width: 100%;
          height: 100%;
          align-items: center;
        }

        .elo-emerald-item {
          flex: 1 1 0;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #FFFFFF;
          text-decoration: none;
          -webkit-tap-highlight-color:
            transparent;
        }

        .elo-emerald-icon {
          position: relative;
          width: 42px;
          height: 42px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .elo-emerald-active-line {
          position: absolute;
          bottom: 1px;
          width: 19px;
          height: 3px;
          border-radius: 3px;
          background: transparent;
        }

        .elo-emerald-item.is-active
        .elo-emerald-active-line {
          background: #FFFFFF;
          box-shadow:
            0 0 5px
            rgba(255, 255, 255, .65);
        }

        .elo-emerald-item:hover {
          background:
            rgba(255, 255, 255, .055);
        }

        .elo-emerald-item:focus-visible {
          outline:
            2px solid #FFFFFF;
          outline-offset: -5px;
          border-radius: 14px;
        }

        @media (min-width: 900px) {
          .elo-emerald-bar-wrap {
            padding-left: 24px;
            padding-right: 24px;
          }
        }
      `}</style>
    </>
  );
}

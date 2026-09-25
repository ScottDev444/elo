"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

const NOTIFICATION_TYPES = [
  "page_approved",
  "partnership_active",
  "partnership_inactive",
  "support",
] as const;

const NOTIFICATION_LABELS: Record<string, string> = {
  page_approved: "Your page has been approved",
  partnership_active: "Your partnership is active",
  partnership_inactive: "Your partnership is inactive",
  support: "You have a support update",
};

type Notification = { id: string; type: string };

type SiteHeaderProps = {
  /** Supply your web notification modal here when available. */
  onOpenNotifications?: () => void;
};

function ShardButton({
  icon,
  unreadCount = 0,
}: {
  icon: "person" | "notifications";
  unreadCount?: number;
}) {
  const hasUnread = unreadCount > 0;
  return (
    <span style={{
      width: 50, height: 50, borderRadius: 25, position: "relative",
      display: "flex", alignItems: "center", justifyContent: "center",
      boxSizing: "border-box",
      background: hasUnread ? "#FFE9E7" : "transparent",
      border: hasUnread ? "1px solid #F4B4AE" : "none",
    }}>
      <span style={{
        width: 42, height: 42, borderRadius: 21, overflow: "hidden",
        position: "relative", display: "flex", alignItems: "center",
        justifyContent: "center",
      }}>
        <svg width="42" height="42" viewBox="0 0 42 42" aria-hidden="true"
          style={{ position: "absolute", inset: 0 }}>
          <polygon points="0,0 24,0 18,22 0,30" fill="#00906C" />
          <polygon points="24,0 42,0 42,15 18,22" fill="#00A078" />
          <polygon points="0,30 18,22 17,42 0,42" fill="#008A68" />
          <polygon points="18,22 42,15 42,42 17,42" fill="#006F57" />
        </svg>
        <svg width="20" height="20" viewBox="0 0 512 512" aria-hidden="true"
          fill="none" stroke="#FFFFFF" strokeWidth="32"
          strokeLinecap="round" strokeLinejoin="round"
          style={{ position: "relative" }}>
          {icon === "person" ? (
            <>
              <path d="M344 144c-3.9 52.87-44 96-88 96s-84.17-43.12-88-96c-4-55 35-96 88-96s92 42 88 96Z" />
              <path d="M256 304c-87 0-175.3 48-191.64 138.6C62.39 453.52 68.57 464 80 464h352c11.44 0 17.62-10.48 15.65-21.4C431.3 352 343 304 256 304Z" />
            </>
          ) : (
            <>
              <path d="M368 192c0-64-48-112-112-112S144 128 144 192c0 128-48 128-48 160h320c0-32-48-32-48-160Z"
                fill={hasUnread ? "#FFFFFF" : "none"} />
              <path d="M224 416a32 32 0 0 0 64 0M256 80V48" />
            </>
          )}
        </svg>
      </span>
      {hasUnread && (
        <span style={{
          position: "absolute", top: -3, right: -3, minWidth: 23, height: 23,
          borderRadius: 12, padding: "0 6px", boxSizing: "border-box",
          background: "#D92D20", border: "2.5px solid #F4F5F4",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 2px 4px rgba(138,28,20,0.25)",
          color: "#FFFFFF", fontSize: 9, lineHeight: "11px", fontWeight: 900,
        }}>{unreadCount > 99 ? "99+" : unreadCount}</span>
      )}
    </span>
  );
}

export default function SiteHeader({ onOpenNotifications }: SiteHeaderProps = {}) {
  const [userId, setUserId] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notificationStatus, setNotificationStatus] = useState<"loading" | "ready" | "error">("loading");
  const panelRef = useRef<HTMLDivElement>(null);
  const bellRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const supabase = createClient();
    let active = true;
    let authChanged = false;
    void supabase.auth.getUser().then(({ data }) => {
      if (active && !authChanged) setUserId(data.user?.id ?? null);
    }).catch(() => {});
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      authChanged = true;
      if (active) setUserId(session?.user.id ?? null);
    });
    return () => { active = false; subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    setNotificationsOpen(false);
    setNotifications([]);
    setUnreadCount(0);
    setNotificationStatus("loading");
    if (!userId) return;
    const supabase = createClient();
    let active = true;
    let loading = false;
    async function refresh() {
      if (loading) return;
      loading = true;
      try {
        // Matches ELOHeader: the app counts all rows of these four types.
        const { data, count, error } = await supabase.from("notifications")
          .select("id,type", { count: "exact" }).eq("user_id", userId)
          .in("type", [...NOTIFICATION_TYPES]).order("id").limit(100);
        if (!active) return;
        if (error) { setNotificationStatus("error"); return; }
        setNotifications(data ?? []);
        setUnreadCount(count ?? 0);
        setNotificationStatus("ready");
      } catch {
        if (active) setNotificationStatus("error");
      } finally { loading = false; }
    }
    void refresh();
    const interval = window.setInterval(() => void refresh(), 60_000);
    const onFocus = () => void refresh();
    window.addEventListener("focus", onFocus);
    return () => {
      active = false;
      window.clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, [userId]);

  useEffect(() => {
    if (!notificationsOpen) return;
    function onPointer(event: PointerEvent) {
      if (!panelRef.current?.contains(event.target as Node) &&
          !bellRef.current?.contains(event.target as Node)) setNotificationsOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setNotificationsOpen(false);
        bellRef.current?.focus();
      }
    }
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [notificationsOpen]);

  return (
    <header className="elo-header">
      <div className="elo-content">
        <Link href={userId ? "/account" : "/log-in"}
          className="elo-action elo-left" aria-label={userId ? "Your account" : "Log in"}>
          <ShardButton icon="person" />
        </Link>
        <Link href="/" className="elo-brand" aria-label="East Lothian Online homepage">
          <span className="elo-title">East Lothian Online</span>
          <span className="elo-subtitle">Your Community&apos;s Digital Home</span>
        </Link>
        {userId ? (
          <button ref={bellRef} type="button" className="elo-action elo-right"
            aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications"}
            aria-expanded={onOpenNotifications ? undefined : notificationsOpen}
            aria-controls={!onOpenNotifications && notificationsOpen ? "elo-notifications" : undefined}
            onClick={() => onOpenNotifications ? onOpenNotifications() : setNotificationsOpen(open => !open)}>
            <ShardButton icon="notifications" unreadCount={unreadCount} />
          </button>
        ) : (
          <Link href="/log-in" className="elo-action elo-right" aria-label="Sign in to view notifications">
            <ShardButton icon="notifications" />
          </Link>
        )}
        {userId && notificationsOpen && (
          <div ref={panelRef} id="elo-notifications" className="elo-notifications"
            role="region" aria-label="Notifications">
            <div className="elo-panel-heading">
              <strong>Notifications</strong>
              <button type="button" onClick={() => {
                setNotificationsOpen(false); bellRef.current?.focus();
              }}>Close</button>
            </div>
            {notificationStatus === "loading" ? <p>Loading notifications…</p>
              : notificationStatus === "error" ? <p>Notifications couldn’t load. Please try again shortly.</p>
              : notifications.length === 0 ? <p>You’re all caught up.</p>
              : notifications.map(item => (
                <Link key={item.id} href="/account" className="elo-notification"
                  onClick={() => setNotificationsOpen(false)}>
                  {NOTIFICATION_LABELS[item.type] ?? "Account update"}
                </Link>
              ))}
          </div>
        )}
      </div>
      <style>{`
        .elo-header {
          position: sticky; top: 0; z-index: 50; flex-shrink: 0;
          background: #F4F5F4; padding-top: env(safe-area-inset-top, 0px);
        }
        .elo-content {
          position: relative; height: 72px; padding: 0 18px;
          display: flex; align-items: center; justify-content: center;
          max-width: 1280px; margin: 0 auto; box-sizing: border-box;
        }
        .elo-header .elo-action {
          position: absolute; top: 11px; width: 50px; height: 50px;
          display: flex; align-items: center; justify-content: center;
          padding: 0; border: 0; background: transparent; cursor: pointer;
          border-radius: 25px; text-decoration: none;
        }
        .elo-header .elo-left { left: 12px; }
        .elo-header .elo-right { right: 12px; }
        .elo-header .elo-brand {
          display: flex; flex-direction: column; align-items: center;
          justify-content: center; padding: 0 60px; min-width: 0;
          text-decoration: none; text-align: center;
        }
        .elo-title {
          color: #005744; font-size: 18px; font-weight: 900;
          letter-spacing: -0.25px; line-height: 22px;
        }
        .elo-subtitle {
          color: #47776B; font-size: 10px; font-weight: 700;
          margin-top: 3px; line-height: 12px;
        }
        .elo-header .elo-action:active { opacity: 0.75; }
        .elo-header .elo-brand:active { opacity: 0.8; }
        .elo-header a:focus-visible, .elo-header button:focus-visible {
          outline: 2px solid #005744; outline-offset: 3px;
        }
        .elo-notifications {
          position: absolute; top: 70px; right: 12px;
          width: min(360px, calc(100vw - 24px)); max-height: min(480px, 70vh);
          overflow-y: auto; background: #F4F5F4; color: #005744;
          border: 1px solid #d9e3df; border-radius: 16px;
          box-shadow: 0 8px 28px rgba(0, 87, 68, 0.15); padding: 16px;
          box-sizing: border-box;
        }
        .elo-panel-heading { display: flex; justify-content: space-between; gap: 12px; }
        .elo-panel-heading button {
          background: transparent; border: 0; color: #005744; cursor: pointer;
          font: inherit; font-size: 12px;
        }
        .elo-notifications p { font-size: 14px; margin: 16px 0 0; }
        .elo-header .elo-notification {
          display: block; padding: 14px 0; border-bottom: 1px solid #d9e3df;
          color: #005744; font-size: 14px; text-decoration: none;
        }
        .elo-header .elo-notification:hover { text-decoration: underline; }
        @media (max-width: 359px) {
          .elo-header .elo-brand { padding: 0 48px; }
          .elo-title { font-size: 16px; }
          .elo-subtitle { font-size: 9px; }
        }
      `}</style>
    </header>
  );
}
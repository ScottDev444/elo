"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

import { createClient } from "@/lib/supabase/client";

const ALERT_ORANGE = "#E98A15";

type AlertGroup = {
  id: string;
  name: string | null;
  brand_color: string | null;
  is_local_partner: boolean | null;
};

type AlertPost = {
  id: string;
  group_id: string | null;
  title: string;
  content: string | null;
  created_at: string;
  expires_at: string | null;
  metadata: {
    public_type?: string | null;
    [key: string]: unknown;
  } | null;
  group: AlertGroup | null;
};

function normaliseHex(value?: string | null) {
  const clean = value?.trim();

  if (!clean) {
    return "#005744";
  }

  if (/^#[0-9A-Fa-f]{6}$/.test(clean)) {
    return clean;
  }

  if (/^#[0-9A-Fa-f]{3}$/.test(clean)) {
    return `#${clean
      .slice(1)
      .split("")
      .map((character) => character + character)
      .join("")}`;
  }

  return "#005744";
}

export default function AlertStrip() {
  const supabase = useMemo(() => createClient(), []);

  const [alerts, setAlerts] = useState<AlertPost[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadAlerts() {
      setLoading(true);

      try {
        const now = new Date().toISOString();

        const { data: postRows, error: postError } = await supabase
          .from("posts")
          .select(
            "id, group_id, title, content, created_at, expires_at, metadata"
          )
          .eq("type", "alert")
          .gt("expires_at", now)
          .order("created_at", {
            ascending: false,
          });

        if (postError) {
          throw postError;
        }

        const rows = postRows ?? [];

        const groupIds = Array.from(
          new Set(
            rows
              .map((post) => post.group_id)
              .filter((id): id is string => Boolean(id))
          )
        );

        let groups = new Map<string, AlertGroup>();

        if (groupIds.length > 0) {
          const { data: groupRows, error: groupError } =
            await supabase
              .from("groups")
              .select(
                "id, name, brand_color, is_local_partner"
              )
              .in("id", groupIds);

          if (groupError) {
            console.error(
              "Failed to load alert Pages:",
              groupError
            );
          } else {
            groups = new Map(
              (groupRows ?? []).map((group) => [
                group.id,
                group as AlertGroup,
              ])
            );
          }
        }

        if (!active) {
          return;
        }

        setAlerts(
          rows.map(
            (post): AlertPost => ({
              ...post,
              group: post.group_id
                ? groups.get(post.group_id) ?? null
                : null,
            })
          )
        );
      } catch (error) {
        console.error("Failed to load alerts:", error);

        if (active) {
          setAlerts([]);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadAlerts();

    return () => {
      active = false;
    };
  }, [supabase]);

  if (loading || alerts.length === 0) {
    return null;
  }

  const count = alerts.length;

  return (
    <section className="elo-alert-wrapper">
      <button
        type="button"
        className="elo-alert-strip"
        onClick={() => {
          if (count > 0) {
            setOpen((current) => !current);
          }
        }}
        aria-expanded={open}
        aria-controls="elo-today-alerts"
      >
        <svg
          className="elo-alert-shards"
          width="100%"
          height="100%"
          viewBox="0 0 400 60"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <polygon
            points="0,0 85,0 55,30 0,42"
            fill="#D7E7E1"
          />
          <polygon
            points="85,0 170,0 130,28 55,30"
            fill="#E7F0EC"
          />
          <polygon
            points="170,0 260,0 218,35 130,28"
            fill="#D1E2DB"
          />
          <polygon
            points="260,0 400,0 400,24 218,35"
            fill="#E4EEE9"
          />
          <polygon
            points="0,42 55,30 95,60 0,60"
            fill="#E3EDE9"
          />
          <polygon
            points="55,30 130,28 170,60 95,60"
            fill="#CFE1DA"
          />
          <polygon
            points="130,28 218,35 260,60 170,60"
            fill="#E8F1ED"
          />
          <polygon
            points="218,35 400,24 400,60 260,60"
            fill="#D6E6E0"
          />
        </svg>

        <AlertTriangle
          size={20}
          fill={ALERT_ORANGE}
          color={ALERT_ORANGE}
          strokeWidth={2}
          className="elo-alert-main-icon"
        />

        <span className="elo-alert-strip-copy">
          <strong>
            {count} {count === 1 ? "Alert" : "Alerts"} today
          </strong>

          <small>
            Tap to {open ? "close" : "view"}
          </small>
        </span>

        {open ? (
          <ChevronUp
            size={17}
            color="#005744"
            strokeWidth={2.5}
          />
        ) : (
          <ChevronDown
            size={17}
            color="#005744"
            strokeWidth={2.5}
          />
        )}
      </button>

      {open && count > 0 && (
        <div
          id="elo-today-alerts"
          className="elo-alert-dropdown"
        >
          {alerts.map((alert, index) => {
            const accent = normaliseHex(
              alert.group?.brand_color
            );

            return (
              <div
                key={alert.id}
                className={`elo-alert-item ${
                  index < count - 1
                    ? "has-border"
                    : ""
                }`}
              >
                <div className="elo-alert-top-row">
                  <AlertTriangle
                    size={14}
                    fill={ALERT_ORANGE}
                    color={ALERT_ORANGE}
                    strokeWidth={2}
                  />

                  <span
                    className="elo-alert-group"
                    style={{
                      color: accent,
                    }}
                  >
                    {alert.group?.name ??
                      "East Lothian Alert"}
                  </span>

                  {alert.group?.is_local_partner && (
                    <CheckCircle2
                      size={14}
                      fill={accent}
                      color={accent}
                      strokeWidth={2.25}
                    />
                  )}
                </div>

                <div className="elo-alert-title">
                  {alert.title}
                </div>

                {alert.content && (
                  <div className="elo-alert-content">
                    {alert.content}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <style>{`
        .elo-alert-wrapper {
          width: 100%;
          max-width: 760px;
          margin: 0 auto;
          padding: 0 16px 12px;
          background: #F4F5F4;
          font-family: var(--font-geist-sans), Arial, sans-serif;
        }

        .elo-alert-wrapper *,
        .elo-alert-wrapper *::before,
        .elo-alert-wrapper *::after {
          box-sizing: border-box;
        }

        .elo-alert-strip {
          position: relative;
          width: 100%;
          min-height: 58px;
          display: flex;
          align-items: center;
          gap: 11px;
          overflow: hidden;
          border: 1px solid #D6E2DD;
          border-radius: 16px;
          background: transparent;
          padding: 0 16px;
          text-align: left;
          cursor: pointer;
          color: inherit;
          font: inherit;
        }

        .elo-alert-strip:focus {
          outline: none;
        }

        .elo-alert-strip:focus-visible {
          outline: 2px solid #809B92;
          outline-offset: 2px;
        }

        .elo-alert-shards {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
        }

        .elo-alert-main-icon {
          position: relative;
          z-index: 1;
          flex: 0 0 auto;
        }

        .elo-alert-strip-copy {
          position: relative;
          z-index: 1;
          flex: 1;
          min-width: 0;
          display: block;
        }

        .elo-alert-strip-copy strong {
          display: block;
          color: #123C32;
          font-size: 13px;
          line-height: 17px;
          font-weight: 900;
        }

        .elo-alert-strip-copy small {
          display: block;
          margin-top: 1px;
          color: #638078;
          font-size: 10px;
          line-height: 13px;
          font-weight: 700;
        }

        .elo-alert-strip > svg:last-child {
          position: relative;
          z-index: 1;
          flex: 0 0 auto;
        }

        .elo-alert-dropdown {
          margin-top: 7px;
          overflow: hidden;
          border: 1px solid #DEE5E1;
          border-radius: 16px;
          background: #EBEFED;
          padding: 0 14px;
        }

        .elo-alert-item {
          padding: 14px 0;
        }

        .elo-alert-item.has-border {
          border-bottom: 1px solid #DDE4E0;
        }

        .elo-alert-top-row {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-bottom: 5px;
        }

        .elo-alert-top-row > svg {
          flex: 0 0 auto;
        }

        .elo-alert-group {
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: 11px;
          line-height: 14px;
          font-weight: 900;
        }

        .elo-alert-title {
          color: #173C33;
          font-size: 15px;
          line-height: 20px;
          font-weight: 900;
        }

        .elo-alert-content {
          margin-top: 4px;
          color: #68756F;
          font-size: 12px;
          line-height: 18px;
          font-weight: 400;
          white-space: pre-wrap;
        }
      `}</style>
    </section>
  );
}

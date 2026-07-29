"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

import { createClient } from "@/lib/supabase/client";

type AlertPost = {
  id: string;
  title: string;
  content: string | null;
  expires_at: string | null;
  metadata: {
    public_type?: string | null;
  } | null;
};

export default function AlertStrip() {
  const [alerts, setAlerts] = useState<AlertPost[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadAlerts() {
      try {
        const supabase = createClient();
        const now = new Date().toISOString();

        const { data, error } = await supabase
          .from("posts")
          .select("id, title, content, expires_at, metadata")
          .eq("type", "update")
          .eq("metadata->>public_type", "alert")
          .gt("expires_at", now)
          .order("created_at", { ascending: false });

        if (error) {
          throw error;
        }

        if (active) {
          setAlerts((data ?? []) as AlertPost[]);
        }
      } catch (error) {
        console.error("Failed to load alerts:", {
          message:
            error instanceof Error
              ? error.message
              : "Unknown error",
          error,
        });

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
  }, []);

  if (loading || alerts.length === 0) {
    return null;
  }

  return (
    <section className="border-b border-black/10 bg-white">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-controls="today-alerts"
        className="flex h-10 w-full items-center justify-between px-4 text-left transition hover:bg-black/[0.025]"
      >
        <div className="flex min-w-0 items-center gap-2">
          <AlertTriangle
            className="h-4 w-4 shrink-0 text-amber-500"
            strokeWidth={2.5}
          />

          <span className="truncate text-sm font-semibold text-black">
            {alerts.length} Alert
            {alerts.length === 1 ? "" : "s"} Today
          </span>
        </div>

        {open ? (
          <ChevronUp className="h-4 w-4 shrink-0 text-black/45" />
        ) : (
          <ChevronDown className="h-4 w-4 shrink-0 text-black/45" />
        )}
      </button>

      {open ? (
        <div
          id="today-alerts"
          className="border-t border-black/10"
        >
          {alerts.map((alert, index) => (
            <Link
              key={alert.id}
              href={`/posts/${alert.id}`}
              className={[
                "flex items-start gap-3 px-4 py-3 transition hover:bg-black/[0.025]",
                index !== alerts.length - 1
                  ? "border-b border-black/[0.06]"
                  : "",
              ].join(" ")}
            >
              <AlertTriangle
                className="mt-0.5 h-4 w-4 shrink-0 text-amber-500"
                strokeWidth={2.5}
              />

              <div className="min-w-0">
                <p className="text-sm font-semibold leading-5 text-black">
                  {alert.title}
                </p>

                {alert.content ? (
                  <p className="mt-0.5 line-clamp-2 text-sm leading-5 text-black/55">
                    {alert.content}
                  </p>
                ) : null}
              </div>
            </Link>
          ))}
        </div>
      ) : null}
    </section>
  );
}
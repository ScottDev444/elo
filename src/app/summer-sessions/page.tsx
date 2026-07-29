import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  MapPin,
  Music2,
  Sparkles,
  Sun,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type Group = {
  name: string | null;
  slug: string | null;
};

type MetadataDate =
  | string
  | {
      date?: string;
      start?: string;
    };

type SummerPost = {
  id: string;
  title: string | null;
  content: string | null;
  image_url: string | null;
  created_at: string;
  expires_at: string | null;
  event_start: string | null;
  event_end: string | null;
  metadata: {
    active_dates?: MetadataDate[];
  } | null;
  groups: Group[] | Group | null;
};

const MARQUEE_ITEMS = [
  "Live Music",
  "Cold Drinks",
  "Warm Nights",
  "Local Venues",
  "Summer Sessions",
];

function normaliseDate(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function getSelectedDates(post: SummerPost): MetadataDate[] {
  const dates = post.metadata?.active_dates ?? [];

  if (dates.length > 0) return dates;
  if (post.event_start) return [post.event_start];

  return [];
}

function selectedDateKey(value: MetadataDate): string {
  if (typeof value === "string") {
    return value.slice(0, 10);
  }

  if (value?.date) {
    return String(value.date).slice(0, 10);
  }

  if (value?.start) {
    return String(value.start).slice(0, 10);
  }

  return "";
}

function getGroup(post: SummerPost): Group | null {
  if (!post.groups) return null;

  if (Array.isArray(post.groups)) {
    return post.groups[0] ?? null;
  }

  return post.groups;
}

function getNextDateKey(post: SummerPost, today: Date): string {
  const dates = getSelectedDates(post)
    .map(selectedDateKey)
    .filter(Boolean)
    .sort();

  const futureDate = dates.find((key) => {
    const date = normaliseDate(new Date(`${key}T12:00:00`));
    return date >= today;
  });

  return futureDate ?? dates[0] ?? "";
}

function sortPosts(posts: SummerPost[], today: Date): SummerPost[] {
  return [...posts].sort((a, b) => {
    const aDate = getNextDateKey(a, today);
    const bDate = getNextDateKey(b, today);

    if (!aDate && !bDate) {
      return (
        new Date(b.created_at).getTime() -
        new Date(a.created_at).getTime()
      );
    }

    if (!aDate) return 1;
    if (!bDate) return -1;

    return aDate.localeCompare(bDate);
  });
}

function formatEventDate(post: SummerPost, today: Date): string {
  const key = getNextDateKey(post, today);

  if (!key) return "Date coming soon";

  const date = new Date(`${key}T12:00:00`);

  if (Number.isNaN(date.getTime())) {
    return "Date coming soon";
  }

  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "long",
  }).format(date);
}

function isExpired(post: SummerPost, today: Date): boolean {
  if (!post.expires_at) return false;

  return normaliseDate(new Date(post.expires_at)) < today;
}

function truncateText(text: string | null, maximum = 260): string {
  if (!text) return "";

  const cleaned = text.replace(/\s+/g, " ").trim();

  if (cleaned.length <= maximum) return cleaned;

  const shortened = cleaned.slice(0, maximum);
  const finalSpace = shortened.lastIndexOf(" ");

  return `${shortened.slice(0, finalSpace > 0 ? finalSpace : maximum)}…`;
}

async function getSummerSessionsPosts(): Promise<SummerPost[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("posts")
    .select(`
      id,
      title,
      content,
      image_url,
      created_at,
      expires_at,
      event_start,
      event_end,
      metadata,
      groups (
        name,
        slug
      )
    `)
    .or(
      "title.ilike.%Summer Sessions%,content.ilike.%Summer Sessions%"
    )
    .order("created_at", {
      ascending: false,
    })
    .limit(150);

  if (error) {
    console.error("Summer Sessions posts error:", error);
    return [];
  }

  const today = normaliseDate(new Date());
  const posts = (data ?? []) as SummerPost[];

  return sortPosts(
    posts.filter((post) => !isExpired(post, today)),
    today
  );
}

function MarqueeGroup({ hidden = false }: { hidden?: boolean }) {
  return (
    <div
      className="summer-marquee-group"
      aria-hidden={hidden ? "true" : undefined}
    >
      {MARQUEE_ITEMS.map((item) => (
        <div className="summer-marquee-item" key={`${item}-${hidden}`}>
          <Sun size={20} fill="currentColor" />
          <span>{item}</span>
        </div>
      ))}
    </div>
  );
}

export default async function SummerSessionsPage() {
  const posts = await getSummerSessionsPosts();
  const today = normaliseDate(new Date());

  return (
    <main
      style={{
        minHeight: "100vh",
        overflow: "hidden",
        backgroundColor: "#FFF4DD",
        color: "#10265B",
      }}
    >
      <section
        style={{
          position: "relative",
          overflow: "hidden",
          minHeight: "clamp(580px, 72vh, 760px)",
          background:
            "radial-gradient(circle at 8% 8%, #FFE33D 0, transparent 20%), radial-gradient(circle at 84% 10%, #FFD53A 0, transparent 24%), linear-gradient(145deg, #43CEF3 0%, #11B9E9 50%, #0874D5 100%)",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: "-100px",
            bottom: "-120px",
            width: "330px",
            height: "330px",
            borderRadius: "999px",
            backgroundColor: "#FF641E",
            opacity: 0.9,
          }}
        />

        <div
          style={{
            position: "absolute",
            right: "-160px",
            bottom: "-210px",
            width: "520px",
            height: "520px",
            borderRadius: "999px",
            backgroundColor: "#FFA51A",
            opacity: 0.82,
          }}
        />

        <div
          className="summer-hero-inner"
          style={{
            position: "relative",
            zIndex: 1,
            width: "100%",
            maxWidth: "1280px",
            margin: "0 auto",
          }}
        >
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "10px",
              width: "fit-content",
              border: "3px solid #10265B",
              borderRadius: "999px",
              backgroundColor: "#FFE33D",
              color: "#10265B",
              boxShadow: "5px 5px 0 #10265B",
              fontWeight: 900,
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              transform: "rotate(-1deg)",
            }}
            className="summer-badge"
          >
            <Sparkles size={18} />
            Live throughout August
          </div>

          <h1
            className="summer-title"
            style={{
              maxWidth: "980px",
              margin: 0,
              color: "#FFFFFF",
              fontWeight: 950,
              textTransform: "uppercase",
              letterSpacing: "-0.065em",
              textShadow: "6px 6px 0 #10265B",
            }}
          >
            <span style={{ display: "block" }}>Summer</span>

            <span style={{ display: "block" }}>
              Sessions
              <span style={{ color: "#FF641E" }}> ’26</span>
            </span>
          </h1>

          <p
            className="summer-subtitle"
            style={{
              maxWidth: "670px",
              marginBottom: 0,
              color: "#FFFFFF",
              fontWeight: 850,
              lineHeight: 1.3,
            }}
          >
            Live music, cold drinks and brilliant East Lothian nights.
          </p>

          <a
            href="#sessions"
            className="summer-primary-button"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "12px",
              width: "fit-content",
              border: "3px solid #10265B",
              borderRadius: "999px",
              backgroundColor: "#FF641E",
              color: "#FFFFFF",
              boxShadow: "6px 6px 0 #10265B",
              fontWeight: 900,
              textDecoration: "none",
            }}
          >
            Find your night
            <ArrowRight size={21} />
          </a>
        </div>
      </section>

      <section
        style={{
          overflow: "hidden",
          borderTop: "3px solid #10265B",
          borderBottom: "3px solid #10265B",
          backgroundColor: "#FF641E",
          color: "#FFFFFF",
        }}
      >
        <div className="summer-marquee-track">
          <MarqueeGroup />
          <MarqueeGroup hidden />
        </div>
      </section>

      <section
        className="summer-section-padding"
        style={{
          backgroundColor: "#FFF4DD",
        }}
      >
        <div
          className="summer-intro-grid"
          style={{
            width: "100%",
            maxWidth: "1280px",
            margin: "0 auto",
          }}
        >
          <div>
            <p
              style={{
                margin: 0,
                color: "#FF641E",
                fontSize: "0.8rem",
                fontWeight: 950,
                textTransform: "uppercase",
                letterSpacing: "0.24em",
              }}
            >
              East Lothian’s summer soundtrack
            </p>

            <h2
              className="summer-section-title"
              style={{
                marginBottom: 0,
                color: "#10265B",
                fontWeight: 950,
                letterSpacing: "-0.05em",
              }}
            >
              Bright nights.
              <br />
              Brilliant places.
            </h2>
          </div>

          <div
            className="summer-intro-box"
            style={{
              border: "3px solid #10265B",
              borderRadius: "28px",
              backgroundColor: "#45D2F5",
              color: "#10265B",
              boxShadow: "8px 8px 0 #10265B",
            }}
          >
            <p
              style={{
                margin: 0,
                fontWeight: 850,
                lineHeight: 1.55,
              }}
            >
              Summer Sessions brings live performances, independent
              venues and proper summer atmosphere together across East
              Lothian.
            </p>
          </div>
        </div>
      </section>

      <section
        id="sessions"
        className="summer-section-padding"
        style={{
          borderTop: "3px solid #10265B",
          borderBottom: "3px solid #10265B",
          backgroundColor: "#087FDB",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: "1280px",
            margin: "0 auto",
          }}
        >
          <div className="summer-sessions-heading">
            <div>
              <p
                style={{
                  margin: 0,
                  color: "#FFE33D",
                  fontSize: "0.8rem",
                  fontWeight: 950,
                  textTransform: "uppercase",
                  letterSpacing: "0.22em",
                }}
              >
                August 2026
              </p>

              <h2
                className="summer-sessions-title"
                style={{
                  marginBottom: 0,
                  color: "#FFFFFF",
                  fontWeight: 950,
                  textTransform: "uppercase",
                  letterSpacing: "-0.05em",
                }}
              >
                The Sessions
              </h2>
            </div>

            <div
              style={{
                width: "fit-content",
                border: "3px solid #10265B",
                borderRadius: "999px",
                padding: "11px 20px",
                backgroundColor: "#FF641E",
                color: "#FFFFFF",
                boxShadow: "5px 5px 0 #10265B",
                fontSize: "0.9rem",
                fontWeight: 900,
              }}
            >
              {posts.length} session{posts.length === 1 ? "" : "s"}
            </div>
          </div>

          {posts.length === 0 ? (
            <div
              className="summer-empty-state"
              style={{
                border: "3px solid #10265B",
                borderRadius: "30px",
                backgroundColor: "#FFE33D",
                color: "#10265B",
                boxShadow: "9px 9px 0 #10265B",
                textAlign: "center",
              }}
            >
              <Music2
                size={50}
                style={{
                  margin: "0 auto",
                }}
              />

              <h3
                style={{
                  margin: "20px 0 0",
                  fontSize: "1.8rem",
                  fontWeight: 950,
                }}
              >
                The line-up is warming up.
              </h3>

              <p
                style={{
                  margin: "10px 0 0",
                  fontWeight: 750,
                }}
              >
                New Summer Sessions will appear here automatically.
              </p>
            </div>
          ) : (
            <div className="summer-card-grid">
              {posts.map((post, index) => {
                const group = getGroup(post);
                const dateLabel = formatEventDate(post, today);
                const description = truncateText(post.content);

                const backgrounds = [
                  "#FF641E",
                  "#FFE33D",
                  "#45D2F5",
                ];

                const backgroundColor =
                  backgrounds[index % backgrounds.length];

                const textColor =
                  index % backgrounds.length === 0
                    ? "#FFFFFF"
                    : "#10265B";

                return (
                  <article
                    key={post.id}
                    className="summer-card"
                    style={{
                      border: "3px solid #10265B",
                      borderRadius: "30px",
                      overflow: "hidden",
                      backgroundColor,
                      color: textColor,
                      boxShadow: "8px 8px 0 #10265B",
                    }}
                  >
                    {post.image_url ? (
                      <div
                        className="summer-card-image"
                        style={{
                          borderBottom: "3px solid #10265B",
                          backgroundColor: "#FFFFFF",
                        }}
                      >
                        <img
                          src={post.image_url}
                          alt={post.title ?? "Summer Sessions"}
                          style={{
                            width: "100%",
                            height: "100%",
                            display: "block",
                            objectFit: "cover",
                          }}
                        />
                      </div>
                    ) : (
                      <div
                        className="summer-card-image"
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          borderBottom: "3px solid #10265B",
                          background:
                            "radial-gradient(circle at 25% 25%, #FFE33D 0%, transparent 24%), linear-gradient(145deg, #24C5F4, #087FDB)",
                        }}
                      >
                        <Music2
                          size={64}
                          style={{
                            color: "#FFFFFF",
                          }}
                        />
                      </div>
                    )}

                    <div className="summer-card-content">
                      <div
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          gap: "9px",
                        }}
                      >
                        <span className="summer-card-pill">
                          <CalendarDays size={14} />
                          {dateLabel}
                        </span>

                        {group?.name && (
                          <span className="summer-card-pill">
                            <MapPin size={14} />
                            {group.name}
                          </span>
                        )}
                      </div>

                      <h3
                        className="summer-card-title"
                        style={{
                          marginBottom: 0,
                          color: "inherit",
                          fontWeight: 950,
                          letterSpacing: "-0.035em",
                        }}
                      >
                        {post.title ?? "Summer Sessions"}
                      </h3>

                      <div className="summer-card-description">
                        <p
                          style={{
                            margin: 0,
                            fontWeight: 750,
                            lineHeight: 1.65,
                            opacity: 0.9,
                          }}
                        >
                          {description || "More details coming soon."}
                        </p>
                      </div>

                      <Link
                        href={`/posts/${post.id}`}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: "10px",
                          width: "100%",
                          marginTop: "auto",
                          border: "2px solid #10265B",
                          borderRadius: "999px",
                          padding: "13px 18px",
                          backgroundColor: "#10265B",
                          color: "#FFFFFF",
                          fontSize: "0.9rem",
                          fontWeight: 900,
                          textDecoration: "none",
                        }}
                      >
                        View session
                        <ArrowRight size={17} />
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <section
        className="summer-section-padding"
        style={{
          backgroundColor: "#FF641E",
        }}
      >
        <div
          className="summer-final-box"
          style={{
            width: "100%",
            maxWidth: "1280px",
            margin: "0 auto",
            overflow: "hidden",
            border: "3px solid #10265B",
            borderRadius: "36px",
            backgroundColor: "#FFE33D",
            boxShadow: "10px 10px 0 #10265B",
          }}
        >
          <div className="summer-final-copy">
            <p
              style={{
                margin: 0,
                color: "#FF541E",
                fontSize: "0.8rem",
                fontWeight: 950,
                textTransform: "uppercase",
                letterSpacing: "0.22em",
              }}
            >
              Pick a session
            </p>

            <h2
              className="summer-section-title"
              style={{
                marginBottom: 0,
                color: "#10265B",
                fontWeight: 950,
                letterSpacing: "-0.05em",
              }}
            >
              Go somewhere
              <br />
              brilliant.
            </h2>

            <p
              style={{
                maxWidth: "580px",
                marginBottom: 0,
                color: "#10265B",
                fontWeight: 750,
                lineHeight: 1.6,
                opacity: 0.8,
              }}
            >
              Explore the programme and find your next summer night out.
            </p>
          </div>

          <div
            className="summer-final-art"
            style={{
              backgroundColor: "#45D2F5",
              color: "#10265B",
            }}
          >
            <Music2 size={52} />

            <div>
              <p
                style={{
                  margin: 0,
                  fontSize: "0.85rem",
                  fontWeight: 950,
                  textTransform: "uppercase",
                  letterSpacing: "0.2em",
                }}
              >
                Summer Sessions ’26
              </p>

              <p
                style={{
                  margin: "12px 0 0",
                  color: "#FFFFFF",
                  fontSize: "clamp(2.8rem, 6vw, 5rem)",
                  fontWeight: 950,
                  lineHeight: 0.9,
                  letterSpacing: "-0.05em",
                  textShadow: "5px 5px 0 #10265B",
                }}
              >
                August
                <br />
                is calling.
              </p>
            </div>
          </div>
        </div>
      </section>

      <style>{`
        html {
          scroll-behavior: smooth;
        }

        .summer-hero-inner {
          display: flex;
          min-height: clamp(580px, 72vh, 760px);
          flex-direction: column;
          justify-content: center;
          padding: 72px 48px 84px;
        }

        .summer-badge {
          padding: 11px 18px;
          font-size: 0.78rem;
        }

        .summer-title {
          margin-top: 34px !important;
          font-size: clamp(4.4rem, 10vw, 8.8rem);
          line-height: 0.82;
        }

        .summer-subtitle {
          margin-top: 34px;
          font-size: clamp(1.15rem, 2vw, 1.55rem);
        }

        .summer-primary-button {
          margin-top: 32px;
          padding: 15px 26px;
          font-size: 1.05rem;
        }

        .summer-marquee-track {
          display: flex;
          width: max-content;
          padding: 18px 0;
          animation: summerMarquee 24s linear infinite;
          will-change: transform;
        }

        .summer-marquee-group {
          display: flex;
          flex-shrink: 0;
          align-items: center;
          gap: 42px;
          padding-right: 42px;
        }

        .summer-marquee-item {
          display: flex;
          flex-shrink: 0;
          align-items: center;
          gap: 14px;
          font-size: 1.35rem;
          font-weight: 950;
          text-transform: uppercase;
          white-space: nowrap;
        }

        .summer-section-padding {
          padding: 88px 48px;
        }

        .summer-intro-grid {
          display: grid;
          grid-template-columns: 0.9fr 1.1fr;
          align-items: center;
          gap: 72px;
        }

        .summer-section-title {
          margin-top: 18px;
          font-size: clamp(3rem, 6vw, 5.4rem);
          line-height: 0.94;
        }

        .summer-intro-box {
          padding: 38px 42px;
          font-size: 1.25rem;
        }

        .summer-sessions-heading {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 30px;
          margin-bottom: 54px;
        }

        .summer-sessions-title {
          margin-top: 14px;
          font-size: clamp(3.5rem, 7vw, 6.4rem);
          line-height: 0.9;
        }

        .summer-empty-state {
          padding: 54px 30px;
        }

        .summer-card-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          align-items: stretch;
          gap: 34px;
        }

        .summer-card {
          display: flex;
          min-width: 0;
          height: 100%;
          flex-direction: column;
        }

        .summer-card-image {
          width: 100%;
          aspect-ratio: 16 / 10;
          flex-shrink: 0;
          overflow: hidden;
        }

        .summer-card-content {
          display: flex;
          flex: 1;
          flex-direction: column;
          padding: 30px;
        }

        .summer-card-pill {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          border: 2px solid #10265B;
          border-radius: 999px;
          padding: 8px 11px;
          background: #FFFFFF;
          color: #10265B;
          font-size: 0.68rem;
          font-weight: 950;
          line-height: 1;
          text-transform: uppercase;
        }

        .summer-card-title {
          min-height: 6.3rem;
          margin-top: 22px;
          font-size: clamp(1.8rem, 2.5vw, 2.25rem);
          line-height: 1.05;
        }

        .summer-card-description {
          min-height: 17rem;
          margin-top: 20px;
          font-size: 0.98rem;
        }

        .summer-final-box {
          display: grid;
          grid-template-columns: 1.15fr 0.85fr;
        }

        .summer-final-copy {
          padding: 56px;
        }

        .summer-final-art {
          display: flex;
          min-height: 410px;
          flex-direction: column;
          justify-content: space-between;
          border-left: 3px solid #10265B;
          padding: 46px;
        }

        @keyframes summerMarquee {
          from {
            transform: translateX(0);
          }

          to {
            transform: translateX(-50%);
          }
        }

        @media (max-width: 1024px) {
          .summer-section-padding {
            padding: 72px 32px;
          }

          .summer-intro-grid {
            grid-template-columns: 1fr;
            gap: 42px;
          }

          .summer-card-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .summer-final-box {
            grid-template-columns: 1fr;
          }

          .summer-final-art {
            min-height: 330px;
            border-top: 3px solid #10265B;
            border-left: 0;
          }
        }

        @media (max-width: 640px) {
          .summer-hero-inner {
            min-height: 620px;
            padding: 64px 20px 72px;
          }

          .summer-badge {
            padding: 10px 14px;
            font-size: 0.66rem;
          }

          .summer-title {
            margin-top: 30px !important;
            font-size: clamp(3.15rem, 18vw, 4.6rem);
            line-height: 0.84;
            letter-spacing: -0.06em !important;
            text-shadow: 4px 4px 0 #10265B !important;
          }

          .summer-subtitle {
            max-width: 92%;
            margin-top: 28px;
            font-size: 1.1rem;
          }

          .summer-primary-button {
            width: 100% !important;
            margin-top: 28px;
            padding: 14px 20px;
          }

          .summer-marquee-track {
            padding: 15px 0;
            animation-duration: 18s;
          }

          .summer-marquee-group {
            gap: 28px;
            padding-right: 28px;
          }

          .summer-marquee-item {
            gap: 10px;
            font-size: 1rem;
          }

          .summer-section-padding {
            padding: 62px 20px;
          }

          .summer-section-title {
            font-size: 3.15rem;
          }

          .summer-intro-box {
            padding: 28px 24px;
            font-size: 1.05rem;
          }

          .summer-sessions-heading {
            align-items: flex-start;
            flex-direction: column;
            margin-bottom: 38px;
          }

          .summer-sessions-title {
            font-size: 3.5rem;
          }

          .summer-card-grid {
            grid-template-columns: 1fr;
            gap: 30px;
          }

          .summer-card-content {
            padding: 26px 22px;
          }

          .summer-card-title {
            min-height: auto;
            font-size: 2rem;
          }

          .summer-card-description {
            min-height: auto;
            margin-bottom: 28px;
          }

          .summer-final-copy {
            padding: 36px 24px 42px;
          }

          .summer-final-art {
            min-height: 300px;
            padding: 32px 24px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .summer-marquee-track {
            animation: none;
          }
        }
      `}</style>
    </main>
  );
}
"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Bookmark,
  BookmarkMinus,
  LoaderCircle,
} from "lucide-react";

import SiteHeader from "@/components/SiteHeader";
import {
  WebFeedPostCard,
  WebFeedStyles,
  type FeedPost,
  type GroupInfo,
} from "@/components/WebFeedItems";
import { createClient } from "@/lib/supabase/client";

type SavedRow = {
  id: string;
  user_id: string;
  post_id: string;
  created_at: string;
};

type SavedFeedPost = FeedPost & {
  saved_id: string;
  saved_at: string;
};

type SavedTimelinePost = SavedFeedPost & {
  timeline_date: string;
  show_date_heading: boolean;
};

const POST_SELECT = `
  id,
  group_id,
  title,
  content,
  image_url,
  created_at,
  type,
  expires_at,
  event_start,
  event_end,
  deal_price,
  metadata
`;

function getPublicType(post: FeedPost) {
  const metadataType =
    post.metadata?.public_type;

  if (
    typeof metadataType === "string" &&
    metadataType.trim()
  ) {
    return metadataType
      .trim()
      .toLowerCase();
  }

  return post.type
    .trim()
    .toLowerCase();
}

function getLocalDateKey(
  date = new Date()
) {
  return [
    date.getFullYear(),
    String(
      date.getMonth() + 1
    ).padStart(2, "0"),
    String(
      date.getDate()
    ).padStart(2, "0"),
  ].join("-");
}

function parseDateKey(
  value: string
) {
  const [
    year,
    month,
    day,
  ] = value
    .slice(0, 10)
    .split("-")
    .map(Number);

  return new Date(
    year,
    month - 1,
    day
  );
}

function getNextDate(
  post: FeedPost,
  now = new Date()
) {
  const today =
    getLocalDateKey(now);

  const activeDates =
    post.metadata?.active_dates;

  if (
    Array.isArray(activeDates) &&
    activeDates.length > 0
  ) {
    return [...activeDates]
      .filter(
        (value): value is string =>
          typeof value === "string" &&
          value.slice(0, 10) >= today
      )
      .map((value) =>
        value.slice(0, 10)
      )
      .sort()[0] ?? null;
  }

  if (post.event_start) {
    const start =
      new Date(post.event_start);

    if (
      !Number.isNaN(
        start.getTime()
      )
    ) {
      const key =
        getLocalDateKey(start);

      if (key >= today) {
        return key;
      }
    }
  }

  if (
    post.type === "deal" &&
    post.expires_at
  ) {
    const expiry =
      new Date(post.expires_at);

    if (
      !Number.isNaN(
        expiry.getTime()
      ) &&
      expiry.getTime() >=
        now.getTime()
    ) {
      return today;
    }
  }

  return null;
}

function isSavedPostActive(
  post: FeedPost,
  now = new Date()
) {
  if (post.expires_at) {
    const expiry =
      new Date(
        post.expires_at
      );

    if (
      !Number.isNaN(
        expiry.getTime()
      ) &&
      expiry.getTime() <
        now.getTime()
    ) {
      return false;
    }
  }

  const activeDates =
    post.metadata?.active_dates;

  if (
    Array.isArray(activeDates) &&
    activeDates.length > 0
  ) {
    const today =
      getLocalDateKey(now);

    return activeDates.some(
      (value) =>
        typeof value ===
          "string" &&
        value.slice(
          0,
          10
        ) >= today
    );
  }

  return true;
}

function dateKeyFromValue(
  value: string
) {
  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return getLocalDateKey();
  }

  return getLocalDateKey(date);
}

function getSavedTimelineDate(
  post: SavedFeedPost
) {
  return (
    getNextDate(post) ??
    dateKeyFromValue(
      post.saved_at
    )
  );
}

function formatDateHeading(
  dateKey: string
) {
  const today =
    parseDateKey(
      getLocalDateKey()
    );

  const target =
    parseDateKey(dateKey);

  const difference =
    Math.round(
      (
        target.getTime() -
        today.getTime()
      ) /
        86400000
    );

  if (difference === 0) {
    return "Today";
  }

  if (difference === 1) {
    return "Tomorrow";
  }

  if (difference === -1) {
    return "Yesterday";
  }

  return target.toLocaleDateString(
    "en-GB",
    {
      weekday: "long",
      day: "numeric",
      month: "long",
    }
  );
}

export default function SavedPage() {
  const supabase =
    useMemo(
      () => createClient(),
      []
    );

  const [
    posts,
    setPosts,
  ] =
    useState<
      SavedFeedPost[]
    >([]);

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    removingId,
    setRemovingId,
  ] =
    useState<
      string | null
    >(null);

  const [
    errorMessage,
    setErrorMessage,
  ] =
    useState<
      string | null
    >(null);

  const loadingSavedRef =
    useRef(false);

  const loadSaved =
    useCallback(
      async (
        showLoader = true
      ) => {
        if (
          loadingSavedRef.current
        ) {
          return;
        }

        loadingSavedRef.current =
          true;

        if (showLoader) {
          setLoading(true);
        }

        setErrorMessage(null);

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

          const user =
            session?.user;

          if (
            sessionError ||
            !user
          ) {
            if (
              sessionError
            ) {
              console.error(
                "Saved session error:",
                sessionError
              );
            }

            setPosts([]);
            return;
          }

          const {
            data:
              savedData,
            error:
              savedError,
          } =
            await supabase
              .from("saved")
              .select(`
                id,
                user_id,
                post_id,
                created_at
              `)
              .eq(
                "user_id",
                user.id
              )
              .order(
                "created_at",
                {
                  ascending:
                    false,
                }
              );

          if (
            savedError
          ) {
            throw savedError;
          }

          const savedRows =
            (
              savedData ?? []
            ) as SavedRow[];

          if (
            savedRows.length ===
            0
          ) {
            setPosts([]);
            return;
          }

          const postIds =
            savedRows.map(
              (row) =>
                row.post_id
            );

          const {
            data:
              postData,
            error:
              postError,
          } =
            await supabase
              .from("posts")
              .select(
                POST_SELECT
              )
              .in(
                "id",
                postIds
              );

          if (
            postError
          ) {
            throw postError;
          }

          const rawPosts =
            (
              postData ?? []
            ) as FeedPost[];

          const groupIds =
            Array.from(
              new Set(
                rawPosts
                  .map(
                    (post) =>
                      post.group_id
                  )
                  .filter(
                    (
                      id
                    ): id is string =>
                      Boolean(id)
                  )
              )
            );

          let groups:
            GroupInfo[] = [];

          if (
            groupIds.length >
            0
          ) {
            const {
              data:
                groupData,
              error:
                groupError,
            } =
              await supabase
                .from("groups")
                .select(`
                  id,
                  name,
                  is_local_partner,
                  brand_color
                `)
                .in(
                  "id",
                  groupIds
                );

            if (
              groupError
            ) {
              console.error(
                "Saved groups error:",
                groupError
              );
            } else {
              groups =
                (
                  groupData ?? []
                ) as GroupInfo[];
            }
          }

          const groupMap =
            new Map(
              groups.map(
                (group) => [
                  group.id,
                  group,
                ]
              )
            );

          const postMap =
            new Map(
              rawPosts.map(
                (post) => [
                  post.id,
                  {
                    ...post,
                    group:
                      post.group_id
                        ? groupMap.get(
                            post.group_id
                          ) ??
                          null
                        : null,
                  } as FeedPost,
                ]
              )
            );

          const nextPosts:
            SavedFeedPost[] =
              [];

          savedRows.forEach(
            (saved) => {
              const post =
                postMap.get(
                  saved.post_id
                );

              if (!post) {
                return;
              }

              nextPosts.push({
                ...post,
                saved_id:
                  saved.id,
                saved_at:
                  saved.created_at,
              });
            }
          );

          setPosts(
            nextPosts.filter(
              (post) =>
                isSavedPostActive(
                  post
                )
            )
          );
        } catch (
          error
        ) {
          console.error(
            "Saved load error:",
            error
          );

          setPosts([]);

          setErrorMessage(
            error instanceof Error
              ? error.message
              : "Saved posts could not be loaded."
          );
        } finally {
          loadingSavedRef.current =
            false;

          if (showLoader) {
            setLoading(false);
          }
        }
      },
      [supabase]
    );

  useEffect(() => {
    void loadSaved();

    const {
      data: {
        subscription,
      },
    } =
      supabase.auth
        .onAuthStateChange(
          () => {
            void loadSaved(
              false
            );
          }
        );

    return () => {
      subscription.unsubscribe();
    };
  }, [
    loadSaved,
    supabase,
  ]);

  async function removeSaved(
    post:
      SavedFeedPost
  ) {
    if (removingId) {
      return;
    }

    setRemovingId(
      post.saved_id
    );

    setErrorMessage(null);

    try {
      const {
        data: {
          session,
        },
      } =
        await supabase
          .auth
          .getSession();

      const user =
        session?.user;

      if (!user) {
        return;
      }

      const {
        error,
      } =
        await supabase
          .from("saved")
          .delete()
          .eq(
            "id",
            post.saved_id
          )
          .eq(
            "user_id",
            user.id
          );

      if (error) {
        throw error;
      }

      setPosts(
        (current) =>
          current.filter(
            (item) =>
              item.saved_id !==
              post.saved_id
          )
      );
    } catch (
      error
    ) {
      console.error(
        "Remove saved error:",
        error
      );

      setErrorMessage(
        "Could not remove that post from Saved. Please try again."
      );
    } finally {
      setRemovingId(null);
    }
  }

  function confirmRemove(
    post:
      SavedFeedPost
  ) {
    if (
      removingId ===
      post.saved_id
    ) {
      return;
    }

    const confirmed =
      window.confirm(
        `Remove "${post.title}" from Saved?`
      );

    if (confirmed) {
      void removeSaved(post);
    }
  }

  const timelinePosts =
    useMemo<
      SavedTimelinePost[]
    >(
      () => {
        const ordered =
          [...posts]
            .map(
              (post) => ({
                ...post,
                timeline_date:
                  getSavedTimelineDate(
                    post
                  ),
                show_date_heading:
                  false,
              })
            )
            .sort(
              (a, b) => {
                const dateOrder =
                  a.timeline_date
                    .localeCompare(
                      b.timeline_date
                    );

                if (
                  dateOrder !==
                  0
                ) {
                  return dateOrder;
                }

                return (
                  new Date(
                    b.saved_at
                  ).getTime() -
                  new Date(
                    a.saved_at
                  ).getTime()
                );
              }
            );

        return ordered.map(
          (
            post,
            index
          ) => ({
            ...post,
            show_date_heading:
              index === 0 ||
              ordered[
                index - 1
              ].timeline_date !==
                post.timeline_date,
          })
        );
      },
      [posts]
    );

  if (loading) {
    return (
      <main className="elo-saved-page">
        <SiteHeader />

        <div className="elo-saved-loading">
          <LoaderCircle
            size={31}
            className="elo-saved-spin"
          />

          <p>
            Loading saved posts...
          </p>
        </div>

        <style>{styles}</style>
      </main>
    );
  }

  return (
    <main className="elo-saved-page">
      <SiteHeader />

      <section className="elo-saved-main">
        <header className="elo-saved-header">
          <h1>Saved</h1>

          <p>
            Everything you&apos;ve bookmarked in one place.
          </p>

          <div className="elo-saved-count">
            <Bookmark
              size={13}
              fill="currentColor"
            />

            <span>
              {posts.length}{" "}
              {posts.length === 1
                ? "saved post"
                : "saved posts"}
            </span>
          </div>
        </header>

        {errorMessage && (
          <div
            className="elo-saved-error"
            role="alert"
          >
            {errorMessage}
          </div>
        )}

        {timelinePosts.length ===
        0 ? (
          <div className="elo-saved-empty">
            <div className="elo-saved-empty-icon">
              <Bookmark
                size={30}
              />
            </div>

            <h2>
              Nothing saved yet
            </h2>

            <p>
              Bookmark anything you want to come back to and it&apos;ll appear here.
            </p>
          </div>
        ) : (
          <div className="elo-saved-list">
            {timelinePosts.map(
              (post) => {
                const publicType =
                  getPublicType(
                    post
                  );

                return (
                  <div
                    key={
                      post.saved_id
                    }
                    className="elo-saved-item"
                  >
                    {post.show_date_heading && (
                      <div className="elo-saved-date-heading">
                        <strong>
                          {formatDateHeading(
                            post.timeline_date
                          )}
                        </strong>

                        <span />
                      </div>
                    )}

                    <div className="elo-saved-card-wrap">
                      <WebFeedPostCard
                        post={{
                          ...post,
                          type:
                            publicType,
                        }}
                      />

                      <button
                        type="button"
                        className="elo-saved-remove"
                        disabled={
                          removingId ===
                          post.saved_id
                        }
                        onClick={() =>
                          confirmRemove(
                            post
                          )
                        }
                      >
                        {removingId ===
                        post.saved_id ? (
                          <LoaderCircle
                            size={14}
                            className="elo-saved-spin"
                          />
                        ) : (
                          <BookmarkMinus
                            size={14}
                          />
                        )}

                        <span>
                          Remove from Saved
                        </span>
                      </button>

                      {removingId ===
                        post.saved_id && (
                        <div className="elo-saved-removing-overlay">
                          <LoaderCircle
                            size={21}
                            className="elo-saved-spin"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                );
              }
            )}
          </div>
        )}
      </section>

      <WebFeedStyles />

      <style>{styles}</style>
    </main>
  );
}

const styles = `
  .elo-saved-page {
    min-height: 100dvh;
    background: #F4F5F4;
    color: #111111;
    font-family: var(--font-geist-sans), Arial, sans-serif;
  }

  .elo-saved-page *,
  .elo-saved-page *::before,
  .elo-saved-page *::after {
    box-sizing: border-box;
  }

  .elo-saved-page button {
    font: inherit;
  }

  .elo-saved-main {
    width: 100%;
    max-width: 760px;
    margin: 0 auto;
    padding-bottom: 120px;
  }

  .elo-saved-header {
    padding: 20px 16px 18px;
  }

  .elo-saved-header h1 {
    margin: 0;
    color: #005744;
    font-size: 27px;
    line-height: 33px;
    font-weight: 900;
    letter-spacing: -.6px;
  }

  .elo-saved-header > p {
    margin: 4px 0 0;
    color: #777777;
    font-size: 14px;
    line-height: 20px;
  }

  .elo-saved-count {
    width: fit-content;
    display: flex;
    align-items: center;
    gap: 5px;
    margin-top: 13px;
    padding: 6px 9px;
    border-radius: 9px;
    background: #E4F0EC;
    color: #005744;
    font-size: 11px;
    font-weight: 800;
  }

  .elo-saved-error {
    margin: 0 16px 14px;
    padding: 11px 13px;
    border-radius: 12px;
    background: #FDEBE9;
    color: #A82A20;
    font-size: 12px;
    line-height: 18px;
    font-weight: 700;
  }

  .elo-saved-list {
    width: 100%;
  }

  .elo-saved-item {
    padding: 0 16px;
  }

  .elo-saved-date-heading {
    display: flex;
    align-items: center;
    gap: 12px;
    margin: 6px 0 12px;
  }

  .elo-saved-date-heading strong {
    flex: 0 0 auto;
    color: #444444;
    font-size: 14px;
    font-weight: 800;
  }

  .elo-saved-date-heading span {
    height: 1px;
    flex: 1;
    background: #DDDFDD;
  }

  .elo-saved-card-wrap {
    position: relative;
    margin-bottom: 16px;
  }

  .elo-saved-remove {
    display: flex;
    align-items: center;
    gap: 5px;
    margin: 6px 0 0 auto;
    padding: 6px 8px;
    border: 0;
    border-radius: 8px;
    background: transparent;
    color: #6F7A76;
    font-size: 10px;
    font-weight: 800;
    cursor: pointer;
  }

  .elo-saved-remove:hover {
    background: #E8ECEA;
    color: #33413C;
  }

  .elo-saved-remove:disabled {
    opacity: .55;
    cursor: wait;
  }

  .elo-saved-remove:focus {
    outline: none;
  }

  .elo-saved-remove:focus-visible {
    outline: 2px solid #A6B4AF;
    outline-offset: 2px;
  }

  .elo-saved-removing-overlay {
    position: absolute;
    z-index: 20;
    inset: 0 0 30px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 18px;
    background: rgba(244,245,244,.62);
    color: #005744;
    pointer-events: none;
  }

  .elo-saved-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 70px 38px 0;
    text-align: center;
  }

  .elo-saved-empty-icon {
    width: 66px;
    height: 66px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    background: #E4F0EC;
    color: #005744;
  }

  .elo-saved-empty h2 {
    margin: 15px 0 0;
    color: #111111;
    font-size: 18px;
    font-weight: 900;
  }

  .elo-saved-empty p {
    max-width: 300px;
    margin: 6px 0 0;
    color: #7A7A7A;
    font-size: 13px;
    line-height: 20px;
  }

  .elo-saved-loading {
    min-height: 65vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
    color: #005744;
  }

  .elo-saved-loading p {
    margin: 0;
    color: #777777;
    font-size: 13px;
  }

  .elo-saved-spin {
    animation: elo-saved-spin .8s linear infinite;
  }

  @keyframes elo-saved-spin {
    to {
      transform: rotate(360deg);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .elo-saved-spin {
      animation: none;
    }
  }
`;

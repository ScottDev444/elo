"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  Eye,
  LoaderCircle,
  LockKeyhole,
  MapPin,
  Pencil,
  Plus,
  RefreshCw,
  Store,
  Trash2,
  AlertTriangle,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";

import SiteHeader from "@/components/SiteHeader";
import { createClient } from "@/lib/supabase/client";

const IMAGE_BUCKET = "place-images";

type OwnerPage = {
  id: string;
  name: string;
  brand_color: string | null;
};

type PlaceRow = {
  id: string;
  title: string;
  slug: string | null;
  location_name: string | null;
  address: string | null;
  postcode: string | null;
  images: unknown;
  is_active: boolean;
};

function normaliseHex(
  value?: string | null
) {
  const clean =
    value?.trim();

  if (
    clean &&
    /^#[0-9A-Fa-f]{6}$/.test(
      clean
    )
  ) {
    return clean;
  }

  return "#005744";
}

function firstImage(
  value: unknown
) {
  if (
    !Array.isArray(value)
  ) {
    return null;
  }

  for (
    const item of value
  ) {
    if (
      typeof item ===
        "string" &&
      item.trim()
    ) {
      return item.trim();
    }

    if (
      item &&
      typeof item ===
        "object" &&
      !Array.isArray(item)
    ) {
      const record =
        item as Record<
          string,
          unknown
        >;

      const possible =
        record.url ??
        record.image_url ??
        record.src ??
        record.publicUrl;

      if (
        typeof possible ===
          "string" &&
        possible.trim()
      ) {
        return possible.trim();
      }
    }
  }

  return null;
}

function allImages(
  value: unknown
) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item): string | null => {
      if (
        typeof item === "string" &&
        item.trim()
      ) {
        return item.trim();
      }

      if (
        item &&
        typeof item === "object" &&
        !Array.isArray(item)
      ) {
        const record =
          item as Record<
            string,
            unknown
          >;

        const possible =
          record.url ??
          record.image_url ??
          record.src ??
          record.publicUrl;

        return (
          typeof possible === "string" &&
          possible.trim()
        )
          ? possible.trim()
          : null;
      }

      return null;
    })
    .filter(
      (value): value is string =>
        Boolean(value)
    );
}

function storagePathFromPublicUrl(
  url: string
) {
  const marker =
    `/storage/v1/object/public/${IMAGE_BUCKET}/`;

  const index =
    url.indexOf(marker);

  if (index === -1) {
    return null;
  }

  try {
    return decodeURIComponent(
      url.slice(
        index +
          marker.length
      )
    );
  } catch {
    return url.slice(
      index +
        marker.length
    );
  }
}

function readableError(
  error: unknown,
  fallback =
    "Unable to load Places."
) {
  if (
    error instanceof Error
  ) {
    return (
      error.message ||
      fallback
    );
  }

  if (
    error &&
    typeof error ===
      "object"
  ) {
    const record =
      error as Record<
        string,
        unknown
      >;

    const parts = [
      typeof record.message ===
      "string"
        ? record.message
        : null,
      typeof record.details ===
      "string"
        ? record.details
        : null,
      typeof record.code ===
      "string"
        ? `Code: ${record.code}`
        : null,
    ].filter(Boolean);

    if (
      parts.length > 0
    ) {
      return parts.join(" · ");
    }
  }

  return fallback;
}

export default function ManagePlacesPage() {
  const router =
    useRouter();

  const supabase =
    useMemo(
      () => createClient(),
      []
    );

  const [
    ownerPage,
    setOwnerPage,
  ] =
    useState<
      OwnerPage | null
    >(null);

  const [
    places,
    setPlaces,
  ] =
    useState<
      PlaceRow[]
    >([]);

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    refreshing,
    setRefreshing,
  ] =
    useState(false);

  const [
    errorMessage,
    setErrorMessage,
  ] =
    useState<
      string | null
    >(null);


  const [
    deleteTarget,
    setDeleteTarget,
  ] =
    useState<
      PlaceRow | null
    >(null);

  const [
    deleteText,
    setDeleteText,
  ] =
    useState("");

  const [
    deleting,
    setDeleting,
  ] =
    useState(false);

  const canDelete =
    deleteText.trim() ===
    "DELETE";

  const loadPlaces =
    useCallback(
      async (
        showLoader = true
      ) => {
        if (showLoader) {
          setLoading(true);
        }

        setErrorMessage(null);

        try {
          const {
            data: {
              user,
            },
            error:
              authError,
          } =
            await supabase
              .auth
              .getUser();

          if (authError) {
            throw authError;
          }

          if (!user) {
            router.replace(
              `/log-in?next=${encodeURIComponent(
                "/manage-places"
              )}`
            );

            return;
          }

          const {
            data:
              pageData,
            error:
              pageError,
          } =
            await supabase
              .from("groups")
              .select(
                "id, name, brand_color"
              )
              .eq(
                "user_id",
                user.id
              )
              .eq(
                "status",
                "approved"
              )
              .eq(
                "place_enabled",
                true
              )
              .order(
                "created_at",
                {
                  ascending:
                    true,
                }
              )
              .limit(1)
              .maybeSingle();

          if (pageError) {
            throw pageError;
          }

          if (!pageData) {
            setOwnerPage(null);
            setPlaces([]);

            return;
          }

          const page =
            pageData as OwnerPage;

          setOwnerPage(page);

          const {
            data:
              placeData,
            error:
              placeError,
          } =
            await supabase
              .from("places")
              .select(`
                id,
                title,
                slug,
                location_name,
                address,
                postcode,
                images,
                is_active
              `)
              .eq(
                "page_id",
                page.id
              )
              .order(
                "title",
                {
                  ascending:
                    true,
                }
              );

          if (placeError) {
            throw placeError;
          }

          setPlaces(
            (
              placeData ??
              []
            ) as PlaceRow[]
          );
        } catch (error) {
          const message =
            readableError(error);

          console.error(
            "Manage Places load error:",
            message,
            error
          );

          setOwnerPage(null);
          setPlaces([]);
          setErrorMessage(
            message
          );
        } finally {
          if (showLoader) {
            setLoading(false);
          }
        }
      },
      [
        router,
        supabase,
      ]
    );

  useEffect(() => {
    void loadPlaces();

    function handleFocus() {
      void loadPlaces(false);
    }

    window.addEventListener(
      "focus",
      handleFocus
    );

    return () => {
      window.removeEventListener(
        "focus",
        handleFocus
      );
    };
  }, [
    loadPlaces,
  ]);

  async function refresh() {
    if (refreshing) {
      return;
    }

    setRefreshing(true);

    try {
      await loadPlaces(false);
    } finally {
      setRefreshing(false);
    }
  }

  function createPlace() {
    router.push(
      "/create-place"
    );
  }

  function editPlace(
    place: PlaceRow
  ) {
    router.push(
      `/edit-place/${encodeURIComponent(
        place.id
      )}`
    );
  }

  function viewPlace(
    place: PlaceRow
  ) {
    router.push(
      `/places/${encodeURIComponent(
        place.slug ||
          place.id
      )}`
    );
  }


  async function deletePlace() {
    if (
      !deleteTarget ||
      !ownerPage ||
      !canDelete ||
      deleting
    ) {
      return;
    }

    setDeleting(true);
    setErrorMessage(null);

    try {
      const {
        data: {
          user,
        },
        error:
          authError,
      } =
        await supabase
          .auth
          .getUser();

      if (authError) {
        throw authError;
      }

      if (!user) {
        throw new Error(
          "You need to be signed in."
        );
      }

      const {
        data:
          allowedPage,
        error:
          pageError,
      } =
        await supabase
          .from("groups")
          .select("id")
          .eq(
            "id",
            ownerPage.id
          )
          .eq(
            "user_id",
            user.id
          )
          .eq(
            "status",
            "approved"
          )
          .eq(
            "place_enabled",
            true
          )
          .maybeSingle();

      if (pageError) {
        throw pageError;
      }

      if (!allowedPage) {
        throw new Error(
          "You do not have permission to delete this Place."
        );
      }

      const target =
        deleteTarget;

      const {
        error:
          deleteError,
      } =
        await supabase
          .from("places")
          .delete()
          .eq(
            "id",
            target.id
          )
          .eq(
            "page_id",
            ownerPage.id
          );

      if (deleteError) {
        throw deleteError;
      }

      const paths =
        allImages(
          target.images
        )
          .map(
            storagePathFromPublicUrl
          )
          .filter(
            (
              path
            ): path is string =>
              Boolean(path)
          );

      if (paths.length > 0) {
        const {
          error:
            storageError,
        } =
          await supabase
            .storage
            .from(
              IMAGE_BUCKET
            )
            .remove(
              paths
            );

        if (storageError) {
          console.warn(
            "Deleted Place image cleanup failed:",
            storageError
          );
        }
      }

      setPlaces(
        (current) =>
          current.filter(
            (place) =>
              place.id !==
              target.id
          )
      );

      setDeleteTarget(null);
      setDeleteText("");
    } catch (error) {
      const message =
        readableError(
          error,
          "Unable to delete Place."
        );

      console.error(
        "Manage Places delete error:",
        message,
        error
      );

      setErrorMessage(
        message
      );
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <main className="elo-manage-places-page">
        <SiteHeader />

        <div className="elo-manage-places-loading">
          <LoaderCircle
            size={31}
            className="elo-manage-places-spin"
          />

          <span>
            Loading Places...
          </span>
        </div>

        <style>{styles}</style>
      </main>
    );
  }

  return (
    <main className="elo-manage-places-page">
      <SiteHeader />

      <section className="elo-manage-places-shell">
        <div className="elo-manage-places-heading-row">
          <div>
            <div className="elo-manage-places-eyebrow">
              YOUR PLACES
            </div>

            <h1>
              Manage Places.
            </h1>

            <p>
              Choose a Place to edit its details, opening hours or photos. You can add as many locations as your organisation needs.
            </p>
          </div>

          <button
            type="button"
            className="elo-manage-places-refresh"
            onClick={() =>
              void refresh()
            }
            disabled={refreshing}
            aria-label="Refresh Places"
          >
            <RefreshCw
              size={17}
              className={
                refreshing
                  ? "elo-manage-places-spin"
                  : ""
              }
            />
          </button>
        </div>

        {ownerPage && (
          <div className="elo-manage-places-page-line">
            <span
              className="elo-manage-places-page-dot"
              style={{
                backgroundColor:
                  normaliseHex(
                    ownerPage.brand_color
                  ),
              }}
            />

            <span>
              {ownerPage.name}
            </span>
          </div>
        )}

        <button
          type="button"
          className="elo-manage-places-create"
          onClick={
            createPlace
          }
        >
          <Plus size={20} />

          <span>
            Create another Place
          </span>
        </button>

        {errorMessage && (
          <div className="elo-manage-places-error">
            {errorMessage}
          </div>
        )}

        {!ownerPage ? (
          <div className="elo-manage-places-empty">
            <div className="elo-manage-places-empty-icon">
              <LockKeyhole
                size={27}
              />
            </div>

            <h2>
              Places unavailable
            </h2>

            <p>
              Places are only available for approved Pages with Places enabled.
            </p>
          </div>
        ) : places.length ===
          0 ? (
          <div className="elo-manage-places-empty">
            <div className="elo-manage-places-empty-icon">
              <MapPin
                size={28}
              />
            </div>

            <h2>
              No Places yet
            </h2>

            <p>
              Create your first physical location and it will appear here.
            </p>
          </div>
        ) : (
          <div className="elo-manage-places-list">
            {places.map(
              (place) => {
                const image =
                  firstImage(
                    place.images
                  );

                const location =
                  place.location_name ??
                  place.address ??
                  place.postcode ??
                  "";

                return (
                  <article
                    key={
                      place.id
                    }
                    className="elo-manage-places-card"
                  >
                    {image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={
                          image
                        }
                        alt=""
                        className="elo-manage-places-image"
                      />
                    ) : (
                      <div className="elo-manage-places-image-fallback">
                        <Store
                          size={27}
                        />
                      </div>
                    )}

                    <div className="elo-manage-places-card-body">
                      <div className="elo-manage-places-title-row">
                        <h2>
                          {place.title}
                        </h2>

                        {!place.is_active && (
                          <span className="elo-manage-places-inactive">
                            INACTIVE
                          </span>
                        )}
                      </div>

                      {location && (
                        <p className="elo-manage-places-location">
                          {location}
                        </p>
                      )}

                      <div className="elo-manage-places-actions">
                        <button
                          type="button"
                          className="elo-manage-places-edit"
                          onClick={() =>
                            editPlace(
                              place
                            )
                          }
                        >
                          <Pencil
                            size={16}
                          />

                          <span>
                            Edit
                          </span>
                        </button>

                        <button
                          type="button"
                          className="elo-manage-places-view"
                          onClick={() =>
                            viewPlace(
                              place
                            )
                          }
                        >
                          <Eye
                            size={16}
                          />

                          <span>
                            View
                          </span>
                        </button>


                        <button
                          type="button"
                          className="elo-manage-places-delete"
                          onClick={() => {
                            setDeleteText("");
                            setDeleteTarget(
                              place
                            );
                          }}
                        >
                          <Trash2
                            size={16}
                          />

                          <span>
                            Delete
                          </span>
                        </button>
                      </div>
                    </div>
                  </article>
                );
              }
            )}
          </div>
        )}
      </section>

      {deleteTarget && (
        <div
          className="elo-manage-places-modal-root"
          onMouseDown={(event) => {
            if (
              event.currentTarget ===
                event.target &&
              !deleting
            ) {
              setDeleteTarget(
                null
              );
              setDeleteText("");
            }
          }}
        >
          <div
            className="elo-manage-places-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="elo-delete-place-title"
          >
            <button
              type="button"
              className="elo-manage-places-modal-close"
              aria-label="Close delete confirmation"
              disabled={deleting}
              onClick={() => {
                setDeleteTarget(
                  null
                );
                setDeleteText("");
              }}
            >
              <X size={18} />
            </button>

            <div className="elo-manage-places-modal-icon">
              <AlertTriangle
                size={28}
              />
            </div>

            <h2
              id="elo-delete-place-title"
            >
              Delete {deleteTarget.title}?
            </h2>

            <p>
              This permanently removes the Place from ELO and cannot be undone.
            </p>

            <label
              htmlFor="elo-manage-places-delete-input"
            >
              Type <strong>DELETE</strong> to confirm
            </label>

            <input
              id="elo-manage-places-delete-input"
              value={deleteText}
              onChange={(event) =>
                setDeleteText(
                  event.target.value
                    .toUpperCase()
                )
              }
              placeholder="DELETE"
              autoComplete="off"
              spellCheck={false}
              disabled={deleting}
              autoFocus
            />

            <button
              type="button"
              className="elo-manage-places-confirm-delete"
              disabled={
                !canDelete ||
                deleting
              }
              onClick={() =>
                void deletePlace()
              }
            >
              {deleting ? (
                <LoaderCircle
                  size={18}
                  className="elo-manage-places-spin"
                />
              ) : (
                <Trash2
                  size={18}
                />
              )}

              <span>
                {deleting
                  ? "Deleting..."
                  : "Delete permanently"}
              </span>
            </button>

            <button
              type="button"
              className="elo-manage-places-cancel-delete"
              disabled={deleting}
              onClick={() => {
                setDeleteTarget(
                  null
                );
                setDeleteText("");
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <style>{styles}</style>
    </main>
  );
}

const styles = `
  .elo-manage-places-page {
    min-height: 100dvh;
    background: #F4F5F4;
    color: #111614;
    font-family: var(--font-geist-sans), Arial, sans-serif;
  }

  .elo-manage-places-page *,
  .elo-manage-places-page *::before,
  .elo-manage-places-page *::after {
    box-sizing: border-box;
  }

  .elo-manage-places-page button {
    font: inherit;
  }

  .elo-manage-places-shell {
    width: 100%;
    max-width: 760px;
    margin: 0 auto;
    padding: 24px 18px 130px;
  }

  .elo-manage-places-heading-row {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 14px;
  }

  .elo-manage-places-heading-row > div {
    min-width: 0;
    flex: 1;
  }

  .elo-manage-places-eyebrow {
    margin-bottom: 7px;
    color: #005744;
    font-size: 9px;
    font-weight: 900;
    letter-spacing: 1.2px;
  }

  .elo-manage-places-heading-row h1 {
    margin: 0;
    color: #111614;
    font-size: 29px;
    line-height: 34px;
    font-weight: 900;
    letter-spacing: -.7px;
  }

  .elo-manage-places-heading-row p {
    max-width: 530px;
    margin: 8px 0 0;
    color: #68736F;
    font-size: 13px;
    line-height: 20px;
  }

  .elo-manage-places-refresh {
    width: 40px;
    height: 40px;
    flex: 0 0 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-top: 4px;
    border: 1px solid #D5DCDA;
    border-radius: 12px;
    background: #FFFFFF;
    color: #005744;
    cursor: pointer;
  }

  .elo-manage-places-refresh:disabled {
    opacity: .55;
    cursor: wait;
  }

  .elo-manage-places-page-line {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 16px;
    color: #4D5B56;
    font-size: 11px;
    font-weight: 800;
  }

  .elo-manage-places-page-dot {
    width: 10px;
    height: 10px;
    flex: 0 0 10px;
    border-radius: 50%;
  }

  .elo-manage-places-create {
    width: 100%;
    height: 52px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    margin-top: 19px;
    border: 0;
    border-radius: 14px;
    background: #005744;
    color: #FFFFFF;
    cursor: pointer;
  }

  .elo-manage-places-create span {
    font-size: 12px;
    font-weight: 900;
  }

  .elo-manage-places-error {
    margin-top: 14px;
    border-radius: 13px;
    background: #FDECEA;
    padding: 11px 13px;
    color: #A52B21;
    font-size: 11px;
    line-height: 17px;
    font-weight: 700;
  }

  .elo-manage-places-list {
    display: grid;
    gap: 11px;
    margin-top: 17px;
  }

  .elo-manage-places-card {
    min-height: 112px;
    display: flex;
    border: 1px solid #DCE2DF;
    border-radius: 17px;
    background: #FFFFFF;
    padding: 10px;
  }

  .elo-manage-places-image,
  .elo-manage-places-image-fallback {
    width: 92px;
    min-height: 92px;
    flex: 0 0 92px;
    border-radius: 13px;
  }

  .elo-manage-places-image {
    display: block;
    object-fit: cover;
    background: #E8ECEA;
  }

  .elo-manage-places-image-fallback {
    display: flex;
    align-items: center;
    justify-content: center;
    background: #E8F2EE;
    color: #005744;
  }

  .elo-manage-places-card-body {
    min-width: 0;
    flex: 1;
    display: flex;
    flex-direction: column;
    margin-left: 11px;
    padding: 2px 0;
  }

  .elo-manage-places-title-row {
    display: flex;
    align-items: flex-start;
    gap: 7px;
  }

  .elo-manage-places-title-row h2 {
    min-width: 0;
    flex: 1;
    margin: 0;
    color: #18241F;
    font-size: 14px;
    line-height: 18px;
    font-weight: 900;
  }

  .elo-manage-places-inactive {
    flex: 0 0 auto;
    border-radius: 6px;
    background: #ECEFED;
    padding: 4px 6px;
    color: #77817D;
    font-size: 6px;
    font-weight: 900;
    letter-spacing: .6px;
  }

  .elo-manage-places-location {
    overflow: hidden;
    margin: 4px 0 0;
    color: #78837F;
    font-size: 10px;
    font-weight: 600;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .elo-manage-places-actions {
    display: flex;
    gap: 7px;
    margin-top: auto;
    padding-top: 9px;
  }

  .elo-manage-places-edit,
  .elo-manage-places-view,
  .elo-manage-places-delete {
    min-width: 78px;
    height: 34px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 5px;
    border-radius: 10px;
    padding: 0 11px;
    cursor: pointer;
  }

  .elo-manage-places-edit {
    border: 0;
    background: #005744;
    color: #FFFFFF;
  }

  .elo-manage-places-view {
    border: 1px solid #C9D8D2;
    background: #F6FAF8;
    color: #005744;
  }

  .elo-manage-places-delete {
    border: 1px solid #E8B7B2;
    background: #FFF8F7;
    color: #B42318;
  }

  .elo-manage-places-edit span,
  .elo-manage-places-view span,
  .elo-manage-places-delete span {
    font-size: 10px;
    font-weight: 900;
  }

  .elo-manage-places-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    margin-top: 18px;
    border: 1px solid #DCE2DF;
    border-radius: 18px;
    background: #FFFFFF;
    padding: 34px 24px;
    text-align: center;
  }

  .elo-manage-places-empty-icon {
    width: 50px;
    height: 50px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 16px;
    background: #E8F2EE;
    color: #005744;
  }

  .elo-manage-places-empty h2 {
    margin: 10px 0 0;
    color: #1B2824;
    font-size: 16px;
    font-weight: 900;
  }

  .elo-manage-places-empty p {
    max-width: 330px;
    margin: 5px 0 0;
    color: #7B8682;
    font-size: 11px;
    line-height: 17px;
  }

  .elo-manage-places-modal-root {
    position: fixed;
    z-index: 2200;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 22px;
    background: rgba(0,0,0,.52);
  }

  .elo-manage-places-modal {
    position: relative;
    width: 100%;
    max-width: 410px;
    border-radius: 22px;
    background: #FFFFFF;
    padding: 20px;
    box-shadow: 0 25px 75px rgba(0,0,0,.22);
  }

  .elo-manage-places-modal-close {
    position: absolute;
    top: 14px;
    right: 14px;
    width: 34px;
    height: 34px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 0;
    border-radius: 10px;
    background: #F2F4F3;
    color: #68736F;
    cursor: pointer;
  }

  .elo-manage-places-modal-icon {
    width: 52px;
    height: 52px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 16px;
    background: #FDECEA;
    color: #B42318;
  }

  .elo-manage-places-modal h2 {
    margin: 14px 42px 0 0;
    color: #241816;
    font-size: 20px;
    line-height: 25px;
    font-weight: 900;
  }

  .elo-manage-places-modal > p {
    margin: 7px 0 0;
    color: #776A67;
    font-size: 12px;
    line-height: 18px;
  }

  .elo-manage-places-modal > label {
    display: block;
    margin-top: 17px;
    color: #665A57;
    font-size: 10px;
    font-weight: 700;
  }

  .elo-manage-places-modal > label strong {
    color: #B42318;
    font-weight: 900;
  }

  .elo-manage-places-modal > input {
    width: 100%;
    height: 52px;
    margin-top: 7px;
    border: 1px solid #E1B7B2;
    border-radius: 13px;
    outline: none;
    background: #FFF9F8;
    padding: 0 14px;
    color: #B42318;
    font-size: 14px;
    font-weight: 900;
    letter-spacing: 1px;
  }

  .elo-manage-places-modal > input:focus {
    border-color: #C96C63;
  }

  .elo-manage-places-confirm-delete {
    width: 100%;
    height: 50px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    margin-top: 12px;
    border: 0;
    border-radius: 13px;
    background: #B42318;
    color: #FFFFFF;
    font-size: 11px;
    font-weight: 900;
    cursor: pointer;
  }

  .elo-manage-places-confirm-delete:disabled {
    opacity: .35;
    cursor: not-allowed;
  }

  .elo-manage-places-cancel-delete {
    width: 100%;
    height: 46px;
    margin-top: 7px;
    border: 0;
    background: transparent;
    color: #57635F;
    font-size: 11px;
    font-weight: 900;
    cursor: pointer;
  }

  .elo-manage-places-loading {
    min-height: 68vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 10px;
    color: #005744;
  }

  .elo-manage-places-loading span {
    color: #74807C;
    font-size: 11px;
    font-weight: 700;
  }

  .elo-manage-places-page button:focus {
    outline: none;
  }

  .elo-manage-places-page button:focus-visible {
    outline: 2px solid #9EAEA7;
    outline-offset: 2px;
  }

  .elo-manage-places-spin {
    animation: elo-manage-places-spin .8s linear infinite;
  }

  @keyframes elo-manage-places-spin {
    to {
      transform: rotate(360deg);
    }
  }

  @media (max-width: 520px) {
    .elo-manage-places-actions {
      flex-wrap: wrap;
    }

    .elo-manage-places-card {
      min-height: 108px;
    }

    .elo-manage-places-image,
    .elo-manage-places-image-fallback {
      width: 84px;
      min-height: 84px;
      flex-basis: 84px;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .elo-manage-places-spin {
      animation: none;
    }
  }
`;

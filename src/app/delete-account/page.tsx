"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  AlertTriangle,
  Bookmark,
  ChevronLeft,
  Clock3,
  FileText,
  LoaderCircle,
  Store,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

export default function DeleteAccountPage() {
  const router = useRouter();

  const supabase =
    useMemo(
      () => createClient(),
      []
    );

  const [
    email,
    setEmail,
  ] =
    useState("");

  const [
    pageName,
    setPageName,
  ] =
    useState<
      string | null
    >(null);

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    submitting,
    setSubmitting,
  ] =
    useState(false);

  const [
    confirmation,
    setConfirmation,
  ] =
    useState("");

  const [
    existingRequest,
    setExistingRequest,
  ] =
    useState(false);

  const [
    confirmModalOpen,
    setConfirmModalOpen,
  ] =
    useState(false);

  const [
    successModalOpen,
    setSuccessModalOpen,
  ] =
    useState(false);

  const [
    errorMessage,
    setErrorMessage,
  ] =
    useState<
      string | null
    >(null);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        const {
          data:
            sessionData,
          error:
            sessionError,
        } =
          await supabase
            .auth
            .getSession();

        if (
          sessionError
        ) {
          throw sessionError;
        }

        const user =
          sessionData
            .session
            ?.user;

        if (!user) {
          if (mounted) {
            router.replace(
              `/log-in?next=${encodeURIComponent(
                "/delete-account"
              )}`
            );
          }

          return;
        }

        if (mounted) {
          setEmail(
            user.email ?? ""
          );
        }

        const [
          pageResult,
          requestResult,
        ] =
          await Promise.all([
            supabase
              .from("groups")
              .select("name")
              .eq(
                "user_id",
                user.id
              )
              .order(
                "created_at",
                {
                  ascending:
                    true,
                }
              )
              .limit(1)
              .maybeSingle(),

            supabase
              .from(
                "account_deletion_requests"
              )
              .select("status")
              .eq(
                "user_id",
                user.id
              )
              .in(
                "status",
                [
                  "pending",
                  "processing",
                ]
              )
              .limit(1)
              .maybeSingle(),
          ]);

        if (!mounted) {
          return;
        }

        if (
          pageResult.error
        ) {
          console.error(
            "Delete account Page load error:",
            pageResult.error
          );
        }

        if (
          requestResult.error
        ) {
          console.error(
            "Delete account request load error:",
            requestResult.error
          );
        }

        setPageName(
          pageResult.data
            ?.name ??
            null
        );

        setExistingRequest(
          Boolean(
            requestResult.data
          )
        );
      } catch (
        error
      ) {
        console.error(
          "Delete account load error:",
          error
        );

        if (mounted) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : "Unable to load account deletion details."
          );
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      mounted = false;
    };
  }, [
    router,
    supabase,
  ]);

  function requestConfirmation() {
    if (
      confirmation
        .trim()
        .toUpperCase() !==
      "DELETE"
    ) {
      setErrorMessage(
        "Type DELETE in the confirmation box before continuing."
      );

      return;
    }

    setErrorMessage(null);
    setConfirmModalOpen(true);
  }

  async function submitDeletion() {
    if (submitting) {
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);

    try {
      const {
        error,
      } =
        await supabase.rpc(
          "elo_request_account_deletion"
        );

      if (error) {
        throw error;
      }

      setConfirmModalOpen(false);
      setSuccessModalOpen(true);
    } catch (
      error
    ) {
      console.error(
        "Unable to request deletion:",
        error
      );

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Please try again."
      );

      setConfirmModalOpen(false);
    } finally {
      setSubmitting(false);
    }
  }

  async function finishSuccess() {
    await supabase.auth.signOut();

    setSuccessModalOpen(false);

    router.replace("/");
    router.refresh();
  }

  if (loading) {
    return (
      <main className="elo-delete-account-page">
        <div className="elo-delete-account-loading">
          <LoaderCircle
            size={31}
            className="elo-delete-account-spin"
          />
        </div>

        <style>{styles}</style>
      </main>
    );
  }

  return (
    <main className="elo-delete-account-page">
      <header className="elo-delete-account-topbar">
        <button
          type="button"
          className="elo-delete-account-back"
          onClick={() =>
            router.back()
          }
        >
          <ChevronLeft
            size={22}
          />

          <span>
            Back
          </span>
        </button>

        <div className="elo-delete-account-brand">
          <strong>
            East Lothian Online
          </strong>

          <span>
            Your Community&apos;s Digital Home
          </span>
        </div>

        <div className="elo-delete-account-spacer" />
      </header>

      <section className="elo-delete-account-content">
        <div className="elo-delete-account-warning-icon">
          <AlertTriangle
            size={28}
          />
        </div>

        <h1>
          Permanently delete your ELO account.
        </h1>

        <p className="elo-delete-account-intro">
          This is not a temporary deactivation. Once your request has been completed, the account cannot be restored.
        </p>

        {errorMessage && (
          <div
            className="elo-delete-account-error"
            role="alert"
          >
            <span>
              {errorMessage}
            </span>

            <button
              type="button"
              onClick={() =>
                setErrorMessage(
                  null
                )
              }
              aria-label="Dismiss error"
            >
              <X size={17} />
            </button>
          </div>
        )}

        <section className="elo-delete-account-card">
          <h2>
            What will be deleted
          </h2>

          <div className="elo-delete-account-item">
            <UserRound
              size={20}
            />

            <p>
              Your ELO account and account details
            </p>
          </div>

          {pageName && (
            <div className="elo-delete-account-item">
              <Store
                size={20}
              />

              <p>
                {pageName}, its Places and content associated with your account
              </p>
            </div>
          )}

          <div className="elo-delete-account-item">
            <FileText
              size={20}
            />

            <p>
              Posts and other user-generated content associated with your account
            </p>
          </div>

          <div className="elo-delete-account-item">
            <Bookmark
              size={20}
            />

            <p>
              Saved items and other account-specific preferences
            </p>
          </div>
        </section>

        <section className="elo-delete-account-info">
          <h2>
            Processing time
          </h2>

          <p>
            Deletion is currently processed manually and is normally completed within 7 days. Information that ELO is legally required to retain may be kept only for the required period.
          </p>

          {email && (
            <strong>
              Confirmation email: {email}
            </strong>
          )}
        </section>

        {existingRequest ? (
          <section className="elo-delete-account-pending">
            <Clock3
              size={21}
            />

            <div>
              <h2>
                Deletion already requested
              </h2>

              <p>
                Your request is already in the queue. There is no need to submit another one.
              </p>
            </div>
          </section>
        ) : (
          <>
            <label
              htmlFor="elo-delete-account-confirm"
              className="elo-delete-account-label"
            >
              Type DELETE to confirm
            </label>

            <input
              id="elo-delete-account-confirm"
              className="elo-delete-account-input"
              value={
                confirmation
              }
              onChange={(
                event
              ) =>
                setConfirmation(
                  event.target
                    .value
                    .toUpperCase()
                )
              }
              placeholder="DELETE"
              autoComplete="off"
              spellCheck={false}
              disabled={
                submitting
              }
            />

            <button
              type="button"
              className="elo-delete-account-delete-button"
              disabled={
                confirmation
                  .trim()
                  .toUpperCase() !==
                  "DELETE" ||
                submitting
              }
              onClick={
                requestConfirmation
              }
            >
              {submitting ? (
                <LoaderCircle
                  size={19}
                  className="elo-delete-account-spin"
                />
              ) : (
                <>
                  <Trash2
                    size={19}
                  />

                  <span>
                    Request account deletion
                  </span>
                </>
              )}
            </button>
          </>
        )}

        <p className="elo-delete-account-footer">
          If you have an active app-store subscription, cancel it through Apple or Google before deleting your ELO account.
        </p>
      </section>

      {confirmModalOpen && (
        <div
          className="elo-delete-account-modal-root"
          role="presentation"
          onMouseDown={(
            event
          ) => {
            if (
              event.currentTarget ===
              event.target &&
              !submitting
            ) {
              setConfirmModalOpen(
                false
              );
            }
          }}
        >
          <div
            className="elo-delete-account-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="elo-delete-account-confirm-title"
          >
            <div className="elo-delete-account-modal-icon danger">
              <Trash2
                size={26}
              />
            </div>

            <h2
              id="elo-delete-account-confirm-title"
            >
              Delete your ELO account?
            </h2>

            <p>
              This request is permanent once processed. Your account and associated ELO content will be deleted.
            </p>

            <div className="elo-delete-account-modal-actions">
              <button
                type="button"
                className="secondary"
                disabled={
                  submitting
                }
                onClick={() =>
                  setConfirmModalOpen(
                    false
                  )
                }
              >
                Cancel
              </button>

              <button
                type="button"
                className="danger"
                disabled={
                  submitting
                }
                onClick={() =>
                  void submitDeletion()
                }
              >
                {submitting ? (
                  <LoaderCircle
                    size={18}
                    className="elo-delete-account-spin"
                  />
                ) : (
                  "Request deletion"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {successModalOpen && (
        <div className="elo-delete-account-modal-root">
          <div
            className="elo-delete-account-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="elo-delete-account-success-title"
          >
            <div className="elo-delete-account-modal-icon success">
              <Clock3
                size={25}
              />
            </div>

            <h2
              id="elo-delete-account-success-title"
            >
              Deletion requested
            </h2>

            <p>
              We normally complete account deletion within 7 days. We will use the email associated with your account to confirm completion.
            </p>

            <button
              type="button"
              className="elo-delete-account-success-button"
              onClick={() =>
                void finishSuccess()
              }
            >
              OK
            </button>
          </div>
        </div>
      )}

      <style>{styles}</style>
    </main>
  );
}

const styles = `
  .elo-delete-account-page {
    min-height: 100dvh;
    background: #F4F5F4;
    color: #181818;
    font-family: var(--font-geist-sans), Arial, sans-serif;
  }

  .elo-delete-account-page *,
  .elo-delete-account-page *::before,
  .elo-delete-account-page *::after {
    box-sizing: border-box;
  }

  .elo-delete-account-page button,
  .elo-delete-account-page input {
    font: inherit;
  }

  .elo-delete-account-loading {
    min-height: 100dvh;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #005744;
  }

  .elo-delete-account-topbar {
    min-height: 68px;
    display: flex;
    align-items: center;
    padding: 0 14px;
    border-bottom: 1px solid #DDE3E0;
    background: #F4F5F4;
  }

  .elo-delete-account-back {
    width: 76px;
    min-height: 44px;
    display: flex;
    align-items: center;
    gap: 1px;
    border: 0;
    background: transparent;
    padding: 0;
    color: #005744;
    cursor: pointer;
  }

  .elo-delete-account-back span {
    font-size: 13px;
    font-weight: 800;
  }

  .elo-delete-account-back:focus {
    outline: none;
  }

  .elo-delete-account-back:focus-visible {
    outline: 2px solid #A6B4AF;
    outline-offset: 2px;
    border-radius: 8px;
  }

  .elo-delete-account-brand {
    min-width: 0;
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
  }

  .elo-delete-account-brand strong {
    color: #005744;
    font-size: 16px;
    font-weight: 900;
    letter-spacing: -.25px;
  }

  .elo-delete-account-brand span {
    margin-top: 2px;
    color: #47776B;
    font-size: 9px;
    font-weight: 700;
  }

  .elo-delete-account-spacer {
    width: 76px;
    flex: 0 0 76px;
  }

  .elo-delete-account-content {
    width: 100%;
    max-width: 620px;
    margin: 0 auto;
    padding: 28px 20px 130px;
  }

  .elo-delete-account-warning-icon {
    width: 56px;
    height: 56px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 18px;
    background: #FDECEA;
    color: #B42318;
  }

  .elo-delete-account-content > h1 {
    margin: 18px 0 0;
    color: #181818;
    font-size: 30px;
    line-height: 35px;
    font-weight: 900;
    letter-spacing: -.8px;
  }

  .elo-delete-account-intro {
    margin: 10px 0 0;
    color: #68716D;
    font-size: 14px;
    line-height: 21px;
    font-weight: 600;
  }

  .elo-delete-account-error {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-top: 16px;
    padding: 11px 12px 11px 14px;
    border-radius: 13px;
    background: #FDECEA;
    color: #A52B21;
    font-size: 12px;
    line-height: 18px;
    font-weight: 700;
  }

  .elo-delete-account-error span {
    flex: 1;
  }

  .elo-delete-account-error button {
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 0;
    border-radius: 8px;
    background: transparent;
    color: inherit;
    cursor: pointer;
  }

  .elo-delete-account-card {
    margin-top: 24px;
    border-radius: 20px;
    background: #FFFFFF;
    padding: 18px;
  }

  .elo-delete-account-card h2 {
    margin: 0 0 6px;
    color: #222222;
    font-size: 15px;
    font-weight: 900;
  }

  .elo-delete-account-item {
    display: flex;
    align-items: flex-start;
    gap: 11px;
    padding: 11px 0;
    color: #B42318;
  }

  .elo-delete-account-item > svg {
    flex: 0 0 auto;
  }

  .elo-delete-account-item p {
    flex: 1;
    margin: 0;
    color: #555F5A;
    font-size: 13px;
    line-height: 19px;
    font-weight: 600;
  }

  .elo-delete-account-info {
    margin-top: 16px;
    border: 1px solid #F0DFC0;
    border-radius: 18px;
    background: #FFF7E8;
    padding: 16px;
  }

  .elo-delete-account-info h2 {
    margin: 0;
    color: #6B4C00;
    font-size: 13px;
    font-weight: 900;
  }

  .elo-delete-account-info p {
    margin: 5px 0 0;
    color: #7B6533;
    font-size: 12px;
    line-height: 18px;
    font-weight: 600;
  }

  .elo-delete-account-info strong {
    display: block;
    margin-top: 10px;
    color: #6B4C00;
    font-size: 11px;
    font-weight: 800;
  }

  .elo-delete-account-pending {
    display: flex;
    align-items: flex-start;
    gap: 11px;
    margin-top: 18px;
    border-radius: 18px;
    background: #FFF7E8;
    padding: 16px;
    color: #7A5A00;
  }

  .elo-delete-account-pending > svg {
    flex: 0 0 auto;
  }

  .elo-delete-account-pending h2 {
    margin: 0;
    color: #6B4C00;
    font-size: 13px;
    font-weight: 900;
  }

  .elo-delete-account-pending p {
    margin: 3px 0 0;
    color: #806A38;
    font-size: 12px;
    line-height: 18px;
    font-weight: 600;
  }

  .elo-delete-account-label {
    display: block;
    margin-top: 24px;
    margin-bottom: 8px;
    color: #292929;
    font-size: 13px;
    font-weight: 900;
  }

  .elo-delete-account-input {
    width: 100%;
    height: 54px;
    border: 1px solid #D4DAD7;
    border-radius: 14px;
    outline: none;
    background: #FFFFFF;
    padding: 0 15px;
    color: #111111;
    font-size: 16px;
    font-weight: 800;
  }

  .elo-delete-account-input:focus {
    border-color: #ADB7B3;
  }

  .elo-delete-account-input:disabled {
    opacity: .65;
  }

  .elo-delete-account-delete-button {
    width: 100%;
    height: 56px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    margin-top: 14px;
    border: 0;
    border-radius: 14px;
    background: #B42318;
    color: #FFFFFF;
    font-size: 14px;
    font-weight: 900;
    cursor: pointer;
  }

  .elo-delete-account-delete-button:disabled {
    opacity: .45;
    cursor: not-allowed;
  }

  .elo-delete-account-delete-button:focus {
    outline: none;
  }

  .elo-delete-account-delete-button:focus-visible {
    outline: 2px solid #D6A19C;
    outline-offset: 2px;
  }

  .elo-delete-account-footer {
    margin: 18px 0 0;
    color: #7E8682;
    font-size: 11px;
    line-height: 17px;
    font-weight: 600;
    text-align: center;
  }

  .elo-delete-account-modal-root {
    position: fixed;
    z-index: 2000;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
    background: rgba(10,18,15,.45);
  }

  .elo-delete-account-modal {
    width: 100%;
    max-width: 430px;
    border-radius: 22px;
    background: #F4F5F4;
    padding: 22px;
    box-shadow: 0 22px 70px rgba(0,0,0,.18);
  }

  .elo-delete-account-modal-icon {
    width: 52px;
    height: 52px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 17px;
  }

  .elo-delete-account-modal-icon.danger {
    background: #FDECEA;
    color: #B42318;
  }

  .elo-delete-account-modal-icon.success {
    background: #FFF2D8;
    color: #7A5A00;
  }

  .elo-delete-account-modal h2 {
    margin: 14px 0 0;
    color: #1A1A1A;
    font-size: 21px;
    line-height: 27px;
    font-weight: 900;
    letter-spacing: -.3px;
  }

  .elo-delete-account-modal > p {
    margin: 7px 0 0;
    color: #69736F;
    font-size: 13px;
    line-height: 20px;
    font-weight: 600;
  }

  .elo-delete-account-modal-actions {
    display: flex;
    gap: 10px;
    margin-top: 20px;
  }

  .elo-delete-account-modal-actions button,
  .elo-delete-account-success-button {
    min-height: 49px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 13px;
    font-size: 12px;
    font-weight: 900;
    cursor: pointer;
  }

  .elo-delete-account-modal-actions button {
    flex: 1;
  }

  .elo-delete-account-modal-actions .secondary {
    border: 1px solid #D1D8D5;
    background: #FFFFFF;
    color: #45514C;
  }

  .elo-delete-account-modal-actions .danger {
    border: 0;
    background: #B42318;
    color: #FFFFFF;
  }

  .elo-delete-account-modal-actions button:disabled {
    opacity: .55;
    cursor: wait;
  }

  .elo-delete-account-success-button {
    width: 100%;
    margin-top: 20px;
    border: 0;
    background: #005744;
    color: #FFFFFF;
  }

  .elo-delete-account-spin {
    animation: elo-delete-account-spin .8s linear infinite;
  }

  @keyframes elo-delete-account-spin {
    to {
      transform: rotate(360deg);
    }
  }

  @media (max-width: 520px) {
    .elo-delete-account-content {
      padding-left: 16px;
      padding-right: 16px;
    }

    .elo-delete-account-content > h1 {
      font-size: 27px;
      line-height: 32px;
    }

    .elo-delete-account-brand strong {
      font-size: 14px;
    }

    .elo-delete-account-brand span {
      font-size: 8px;
    }

    .elo-delete-account-modal-actions {
      gap: 8px;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .elo-delete-account-spin {
      animation: none;
    }
  }
`;
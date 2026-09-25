"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type ComponentType,
} from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleUserRound,
  CreditCard,
  Ellipsis,
  Flag,
  ImagePlus,
  LoaderCircle,
  MapPin,
  MessageCircleMore,
  MessagesSquare,
  Plus,
  RefreshCw,
  ShieldCheck,
  Store,
  Wrench,
  X,
  FileEdit,
  type LucideProps,
} from "lucide-react";

import { createClient } from "@/lib/supabase/client";

type TicketStatus =
  | "open"
  | "in_progress"
  | "resolved"
  | "closed";

type TicketCategory =
  | "account"
  | "page"
  | "place"
  | "partnership"
  | "payments"
  | "moderation"
  | "technical"
  | "other";

type SupportTicket = {
  id: string;
  ticket_number: number;
  page_id: string | null;
  category: TicketCategory;
  subject: string;
  status: TicketStatus;
  partner_priority: boolean;
  created_at: string;
  updated_at: string;
  last_message_at: string;
  last_user_message_at: string | null;
  last_admin_message_at: string | null;
};

type CategoryItem = {
  value: TicketCategory;
  label: string;
  icon: ComponentType<LucideProps>;
};

const SUPPORT_BUCKET = "support-attachments";

const CATEGORIES: CategoryItem[] = [
  {
    value: "account",
    label: "Account",
    icon: CircleUserRound,
  },
  {
    value: "page",
    label: "Page",
    icon: Store,
  },
  {
    value: "place",
    label: "Place",
    icon: MapPin,
  },
  {
    value: "partnership",
    label: "Partnership",
    icon: ShieldCheck,
  },
  {
    value: "payments",
    label: "Payments",
    icon: CreditCard,
  },
  {
    value: "moderation",
    label: "Report / moderation",
    icon: Flag,
  },
  {
    value: "technical",
    label: "Technical issue",
    icon: Wrench,
  },
  {
    value: "other",
    label: "Other",
    icon: Ellipsis,
  },
];

function makeUuid() {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }

  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(
    /[xy]/g,
    (character) => {
      const random = Math.floor(Math.random() * 16);
      const value =
        character === "x"
          ? random
          : (random & 0x3) | 0x8;

      return value.toString(16);
    }
  );
}

function formatTicketNumber(value: number) {
  return `ELO-${String(value).padStart(6, "0")}`;
}

function categoryLabel(value: TicketCategory) {
  return (
    CATEGORIES.find(
      (item) => item.value === value
    )?.label ?? "Support"
  );
}

function categoryIcon(value: TicketCategory) {
  return (
    CATEGORIES.find(
      (item) => item.value === value
    )?.icon ?? MessageCircleMore
  );
}

function statusLabel(value: TicketStatus) {
  if (value === "in_progress") return "IN PROGRESS";
  if (value === "resolved") return "RESOLVED";
  if (value === "closed") return "CLOSED";
  return "OPEN";
}

function statusTone(value: TicketStatus) {
  if (value === "resolved") {
    return {
      backgroundColor: "#E5F0EC",
      color: "#005744",
      dot: "#007A5C",
    };
  }

  if (value === "closed") {
    return {
      backgroundColor: "#ECEFEE",
      color: "#68736E",
      dot: "#87918C",
    };
  }

  if (value === "in_progress") {
    return {
      backgroundColor: "#FFF1D6",
      color: "#7A5100",
      dot: "#C58A12",
    };
  }

  return {
    backgroundColor: "#E9F0FF",
    color: "#315F9D",
    dot: "#557EB9",
  };
}

function formatTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function fileExtension(file: File) {
  const fromName = file.name
    .split(".")
    .pop()
    ?.toLowerCase()
    .replace(/[^a-z0-9]/g, "");

  if (fromName) {
    return fromName === "jpeg" ? "jpg" : fromName;
  }

  const fromType = file.type
    .split("/")[1]
    ?.toLowerCase()
    .replace("jpeg", "jpg")
    .replace(/[^a-z0-9]/g, "");

  return fromType || "jpg";
}

export default function SupportPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [creating, setCreating] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [category, setCategory] =
    useState<TicketCategory>("technical");

  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] =
    useState<string | null>(null);

  const [errorMessage, setErrorMessage] =
    useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const openTickets = useMemo(
    () =>
      tickets.filter(
        (ticket) =>
          ticket.status !== "resolved" &&
          ticket.status !== "closed"
      ).length,
    [tickets]
  );

  const loadTickets = useCallback(
    async (showLoader = true) => {
      if (showLoader) {
        setLoading(true);
      }

      setErrorMessage(null);

      try {
        const { data, error } = await supabase
          .from("support_tickets")
          .select(`
            id,
            ticket_number,
            page_id,
            category,
            subject,
            status,
            partner_priority,
            created_at,
            updated_at,
            last_message_at,
            last_user_message_at,
            last_admin_message_at
          `)
          .order("updated_at", {
            ascending: false,
          });

        if (error) {
          throw error;
        }

        setTickets((data ?? []) as SupportTicket[]);
      } catch (error) {
        console.error(
          "Support tickets load error:",
          error
        );

        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Unable to load support. Please try again."
        );
      } finally {
        if (showLoader) {
          setLoading(false);
        }
      }
    },
    [supabase]
  );

  useEffect(() => {
    void loadTickets();

    function handleFocus() {
      void loadTickets(false);
    }

    window.addEventListener("focus", handleFocus);

    return () => {
      window.removeEventListener("focus", handleFocus);
    };
  }, [loadTickets]);

  useEffect(() => {
    return () => {
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  async function refresh() {
    if (refreshing) return;

    setRefreshing(true);

    try {
      await loadTickets(false);
    } finally {
      setRefreshing(false);
    }
  }

  function chooseImage(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0] ?? null;

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setErrorMessage(
        "Please choose an image file for the screenshot."
      );
      event.target.value = "";
      return;
    }

    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
    }

    setImage(file);
    setImagePreview(URL.createObjectURL(file));
    setErrorMessage(null);

    event.target.value = "";
  }

  function removeImage() {
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
    }

    setImage(null);
    setImagePreview(null);
  }

  async function uploadAttachment(
    userId: string,
    selected: File
  ) {
    const extension = fileExtension(selected);
    const path = `${userId}/${makeUuid()}.${extension}`;

    const { error } = await supabase.storage
      .from(SUPPORT_BUCKET)
      .upload(path, selected, {
        contentType:
          selected.type || "image/jpeg",
        cacheControl: "3600",
        upsert: false,
      });

    if (error) {
      throw new Error(
        `Attachment upload failed: ${error.message}`
      );
    }

    return path;
  }

  function resetForm() {
    setCategory("technical");
    setSubject("");
    setMessage("");
    removeImage();
    setCreating(false);
    setErrorMessage(null);
  }

  async function submitTicket() {
    if (submitting) return;

    const cleanSubject = subject.trim();
    const cleanMessage = message.trim();

    if (cleanSubject.length < 3) {
      setErrorMessage(
        "Give the ticket a short subject."
      );
      return;
    }

    if (cleanMessage.length < 3) {
      setErrorMessage(
        "Tell us what you need help with."
      );
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);

    let attachmentPath: string | null = null;

    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        throw sessionError;
      }

      const user = session?.user;

      if (!user) {
        throw new Error(
          "Sign in to contact support."
        );
      }

      if (image) {
        attachmentPath =
          await uploadAttachment(
            user.id,
            image
          );
      }

      const { data, error } = await supabase.rpc(
        "elo_create_support_ticket",
        {
          p_category: category,
          p_subject: cleanSubject,
          p_message: cleanMessage,
          p_attachment_path: attachmentPath,
        }
      );

      if (error) {
        throw error;
      }

      const result = data as
        | {
            id: string;
            ticket_number: number;
          }
        | null;

      if (!result?.id) {
        throw new Error(
          "The ticket could not be created."
        );
      }

      resetForm();
      await loadTickets(false);

      router.push(
        `/support/${encodeURIComponent(result.id)}`
      );
    } catch (error) {
      console.error(
        "Support ticket create error:",
        error
      );

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to open ticket. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  }

  const topBar = (
    <header className="elo-support-topbar">
      <button
        type="button"
        className="elo-support-back"
        onClick={() => router.back()}
      >
        <ChevronLeft size={22} />
        <span>Back</span>
      </button>

      <div className="elo-support-brand">
        <strong>East Lothian Online</strong>
        <span>Your Community&apos;s Digital Home</span>
      </div>

      <div className="elo-support-spacer" />
    </header>
  );

  if (loading) {
    return (
      <main className="elo-support-page">
        {topBar}

        <div className="elo-support-loading">
          <LoaderCircle
            size={31}
            className="elo-support-spin"
          />
        </div>

        <style>{styles}</style>
      </main>
    );
  }

  return (
    <main className="elo-support-page">
      {topBar}

      <section className="elo-support-shell">
        <div className="elo-support-heading-row">
          <div className="elo-support-heading-copy">
            <div className="elo-support-eyebrow">
              ELO SUPPORT
            </div>

            <h1>Support</h1>

            <p>
              Open a ticket and keep every reply in one place.
            </p>
          </div>

          <button
            type="button"
            className="elo-support-new-ticket"
            onClick={() =>
              setCreating(
                (value) => !value
              )
            }
            aria-label={
              creating
                ? "Close new ticket form"
                : "Open new ticket form"
            }
          >
            {creating ? (
              <X size={20} />
            ) : (
              <Plus size={20} />
            )}
          </button>
        </div>

        {errorMessage && (
          <div
            className="elo-support-error"
            role="alert"
          >
            <span>{errorMessage}</span>

            <button
              type="button"
              onClick={() =>
                setErrorMessage(null)
              }
              aria-label="Dismiss error"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {!creating && (
          <button
            type="button"
            className="elo-support-primary-action"
            onClick={() =>
              setCreating(true)
            }
          >
            <span className="elo-support-primary-action-icon">
              <MessageCircleMore size={20} />
            </span>

            <span className="elo-support-primary-action-copy">
              <strong>
                Open a support ticket
              </strong>

              <span>
                Tell us what you need help with.
              </span>
            </span>

            <ArrowRight size={18} />
          </button>
        )}

        {creating && (
          <section className="elo-support-form-card">
            <div className="elo-support-form-heading">
              <span className="elo-support-form-heading-icon">
                <FileEdit size={18} />
              </span>

              <div>
                <h2>New ticket</h2>

                <p>
                  We&apos;ll keep this conversation attached to your account.
                </p>
              </div>
            </div>

            <div className="elo-support-field-label">
              WHAT DO YOU NEED HELP WITH?
            </div>

            <div className="elo-support-categories">
              {CATEGORIES.map(
                (item) => {
                  const selected =
                    category === item.value;

                  const Icon = item.icon;

                  return (
                    <button
                      key={item.value}
                      type="button"
                      className={`elo-support-category ${
                        selected
                          ? "is-selected"
                          : ""
                      }`}
                      onClick={() =>
                        setCategory(
                          item.value
                        )
                      }
                    >
                      <Icon size={15} />

                      <span>
                        {item.label}
                      </span>
                    </button>
                  );
                }
              )}
            </div>

            <label
              htmlFor="elo-support-subject"
              className="elo-support-field-label elo-support-field-gap"
            >
              SUBJECT
            </label>

            <input
              id="elo-support-subject"
              className="elo-support-input"
              value={subject}
              onChange={(event) =>
                setSubject(
                  event.target.value
                )
              }
              placeholder="Short summary"
              maxLength={120}
              disabled={submitting}
            />

            <label
              htmlFor="elo-support-message"
              className="elo-support-field-label elo-support-field-gap"
            >
              MESSAGE
            </label>

            <textarea
              id="elo-support-message"
              className="elo-support-input elo-support-textarea"
              value={message}
              onChange={(event) =>
                setMessage(
                  event.target.value
                )
              }
              placeholder="Give us the details..."
              maxLength={5000}
              disabled={submitting}
            />

            {imagePreview ? (
              <div className="elo-support-attachment-preview">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imagePreview}
                  alt="Screenshot attachment preview"
                />

                <button
                  type="button"
                  className="elo-support-remove-attachment"
                  onClick={removeImage}
                  aria-label="Remove screenshot"
                >
                  <X size={17} />
                </button>
              </div>
            ) : (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="elo-support-file-input"
                  onChange={chooseImage}
                />

                <button
                  type="button"
                  className="elo-support-attachment-button"
                  onClick={() =>
                    fileInputRef.current?.click()
                  }
                  disabled={submitting}
                >
                  <ImagePlus size={18} />

                  <span>
                    Add screenshot
                  </span>

                  <small>
                    Optional
                  </small>
                </button>
              </>
            )}

            <div className="elo-support-form-actions">
              <button
                type="button"
                className="elo-support-cancel"
                onClick={resetForm}
                disabled={submitting}
              >
                Cancel
              </button>

              <button
                type="button"
                className="elo-support-submit"
                onClick={() =>
                  void submitTicket()
                }
                disabled={submitting}
              >
                {submitting ? (
                  <LoaderCircle
                    size={18}
                    className="elo-support-spin"
                  />
                ) : (
                  <>
                    <span>Submit</span>
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            </div>
          </section>
        )}

        <div className="elo-support-section-header">
          <div>
            <div className="elo-support-section-label">
              YOUR TICKETS
            </div>

            <h2>
              Conversations
            </h2>
          </div>

          <div className="elo-support-section-actions">
            {tickets.length > 0 && (
              <span className="elo-support-ticket-count">
                {openTickets} open
              </span>
            )}

            <button
              type="button"
              className="elo-support-refresh"
              onClick={() =>
                void refresh()
              }
              disabled={refreshing}
              aria-label="Refresh support tickets"
            >
              <RefreshCw
                size={15}
                className={
                  refreshing
                    ? "elo-support-spin"
                    : ""
                }
              />
            </button>
          </div>
        </div>

        {tickets.length === 0 ? (
          <div className="elo-support-empty">
            <div className="elo-support-empty-icon">
              <MessagesSquare size={22} />
            </div>

            <h3>
              Nothing here yet
            </h3>

            <p>
              Your support conversations will appear here.
            </p>
          </div>
        ) : (
          <div className="elo-support-ticket-list">
            {tickets.map(
              (ticket) => {
                const tone =
                  statusTone(
                    ticket.status
                  );

                const CategoryIcon =
                  categoryIcon(
                    ticket.category
                  );

                const awaitingReply =
                  Boolean(
                    ticket.last_user_message_at &&
                      (
                        !ticket.last_admin_message_at ||
                        new Date(
                          ticket.last_user_message_at
                        ).getTime() >
                          new Date(
                            ticket.last_admin_message_at
                          ).getTime()
                      )
                  ) &&
                  ticket.status !==
                    "resolved" &&
                  ticket.status !==
                    "closed";

                return (
                  <button
                    key={ticket.id}
                    type="button"
                    className="elo-support-ticket-row"
                    onClick={() =>
                      router.push(
                        `/support/${encodeURIComponent(
                          ticket.id
                        )}`
                      )
                    }
                  >
                    <span
                      className="elo-support-ticket-icon"
                      style={{
                        backgroundColor:
                          tone.backgroundColor,
                        color:
                          tone.color,
                      }}
                    >
                      <CategoryIcon
                        size={18}
                      />
                    </span>

                    <span className="elo-support-ticket-main">
                      <span className="elo-support-ticket-title-row">
                        <strong>
                          {ticket.subject}
                        </strong>

                        <ChevronRight
                          size={17}
                        />
                      </span>

                      <span className="elo-support-ticket-meta">
                        <span className="elo-support-ticket-number">
                          {formatTicketNumber(
                            ticket.ticket_number
                          )}
                        </span>

                        <i />

                        <span>
                          {categoryLabel(
                            ticket.category
                          )}
                        </span>

                        <i />

                        <span>
                          {formatTime(
                            ticket.updated_at
                          )}
                        </span>
                      </span>

                      <span className="elo-support-ticket-badges">
                        <span
                          className="elo-support-status-badge"
                          style={{
                            backgroundColor:
                              tone.backgroundColor,
                            color:
                              tone.color,
                          }}
                        >
                          <i
                            style={{
                              backgroundColor:
                                tone.dot,
                            }}
                          />

                          <span>
                            {statusLabel(
                              ticket.status
                            )}
                          </span>
                        </span>

                        {awaitingReply && (
                          <span className="elo-support-awaiting">
                            Awaiting ELO
                          </span>
                        )}

                        {ticket.partner_priority && (
                          <span className="elo-support-priority">
                            <ShieldCheck
                              size={11}
                            />

                            <span>
                              PARTNER
                            </span>
                          </span>
                        )}
                      </span>
                    </span>
                  </button>
                );
              }
            )}
          </div>
        )}
      </section>

      <style>{styles}</style>
    </main>
  );
}

const styles = `
  .elo-support-page {
    min-height: 100dvh;
    background: #F4F5F4;
    color: #24322C;
    font-family: var(--font-geist-sans), Arial, sans-serif;
  }

  .elo-support-page *,
  .elo-support-page *::before,
  .elo-support-page *::after {
    box-sizing: border-box;
  }

  .elo-support-page button,
  .elo-support-page input,
  .elo-support-page textarea {
    font: inherit;
  }

  .elo-support-topbar {
    min-height: 68px;
    display: flex;
    align-items: center;
    padding: 0 14px;
    border-bottom: 1px solid #DDE3E0;
    background: #F4F5F4;
  }

  .elo-support-back {
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

  .elo-support-back span {
    font-size: 13px;
    font-weight: 800;
  }

  .elo-support-brand {
    min-width: 0;
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
  }

  .elo-support-brand strong {
    color: #005744;
    font-size: 16px;
    font-weight: 900;
    letter-spacing: -.25px;
  }

  .elo-support-brand span {
    margin-top: 2px;
    color: #47776B;
    font-size: 9px;
    font-weight: 700;
  }

  .elo-support-spacer {
    width: 76px;
    flex: 0 0 76px;
  }

  .elo-support-shell {
    width: 100%;
    max-width: 760px;
    margin: 0 auto;
    padding: 20px 16px 130px;
  }

  .elo-support-heading-row {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 14px;
    padding: 0 2px 16px;
  }

  .elo-support-heading-copy {
    min-width: 0;
    flex: 1;
  }

  .elo-support-eyebrow {
    color: #008564;
    font-size: 8px;
    font-weight: 900;
    letter-spacing: 1.1px;
  }

  .elo-support-heading-copy h1 {
    margin: 5px 0 0;
    color: #173C33;
    font-size: 30px;
    line-height: 35px;
    font-weight: 900;
    letter-spacing: -.7px;
  }

  .elo-support-heading-copy p {
    max-width: 360px;
    margin: 5px 0 0;
    color: #7C8782;
    font-size: 11px;
    line-height: 16px;
    font-weight: 600;
  }

  .elo-support-new-ticket {
    width: 42px;
    height: 42px;
    flex: 0 0 42px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-top: 10px;
    border: 0;
    border-radius: 14px;
    background: #005744;
    color: #FFFFFF;
    cursor: pointer;
  }

  .elo-support-error {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 12px;
    border-radius: 13px;
    background: #FDECEA;
    padding: 10px 11px 10px 13px;
    color: #A52B21;
    font-size: 11px;
    line-height: 17px;
    font-weight: 700;
  }

  .elo-support-error > span {
    flex: 1;
  }

  .elo-support-error button {
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

  .elo-support-primary-action {
    width: 100%;
    min-height: 72px;
    display: flex;
    align-items: center;
    gap: 11px;
    border: 1px solid #D9E2DE;
    border-radius: 18px;
    background: #FFFFFF;
    padding: 13px;
    color: #005744;
    text-align: left;
    cursor: pointer;
  }

  .elo-support-primary-action-icon {
    width: 40px;
    height: 40px;
    flex: 0 0 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 13px;
    background: #E7F1ED;
  }

  .elo-support-primary-action-copy {
    min-width: 0;
    flex: 1;
    display: flex;
    flex-direction: column;
  }

  .elo-support-primary-action-copy strong {
    color: #26342E;
    font-size: 12px;
    font-weight: 900;
  }

  .elo-support-primary-action-copy span {
    margin-top: 3px;
    color: #87918D;
    font-size: 9px;
    line-height: 13px;
    font-weight: 600;
  }

  .elo-support-form-card {
    border: 1px solid #D8E1DD;
    border-radius: 20px;
    background: #FFFFFF;
    padding: 15px;
  }

  .elo-support-form-heading {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 18px;
  }

  .elo-support-form-heading-icon {
    width: 38px;
    height: 38px;
    flex: 0 0 38px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 12px;
    background: #E7F1ED;
    color: #005744;
  }

  .elo-support-form-heading h2 {
    margin: 0;
    color: #24322C;
    font-size: 14px;
    font-weight: 900;
  }

  .elo-support-form-heading p {
    margin: 2px 0 0;
    color: #89938F;
    font-size: 9px;
    line-height: 13px;
    font-weight: 600;
  }

  .elo-support-field-label {
    display: block;
    color: #74807A;
    font-size: 8px;
    font-weight: 900;
    letter-spacing: .9px;
  }

  .elo-support-field-gap {
    margin-top: 16px;
  }

  .elo-support-categories {
    display: flex;
    flex-wrap: wrap;
    gap: 7px;
    margin-top: 9px;
  }

  .elo-support-category {
    min-height: 36px;
    display: flex;
    align-items: center;
    gap: 6px;
    border: 1px solid #DDE5E1;
    border-radius: 11px;
    background: #F7F9F8;
    padding: 0 9px;
    color: #005744;
    cursor: pointer;
  }

  .elo-support-category span {
    color: #4E5B55;
    font-size: 9px;
    font-weight: 800;
  }

  .elo-support-category.is-selected {
    border-color: #005744;
    background: #005744;
    color: #FFFFFF;
  }

  .elo-support-category.is-selected span {
    color: #FFFFFF;
  }

  .elo-support-input {
    width: 100%;
    min-height: 46px;
    margin-top: 8px;
    border: 1px solid #DDE4E1;
    border-radius: 13px;
    outline: none;
    background: #FAFBFA;
    padding: 0 12px;
    color: #24322C;
    font-size: 11px;
    font-weight: 600;
  }

  .elo-support-input:focus {
    border-color: #AAB7B1;
  }

  .elo-support-textarea {
    min-height: 116px;
    resize: vertical;
    padding-top: 12px;
    padding-bottom: 12px;
    line-height: 17px;
  }

  .elo-support-file-input {
    display: none;
  }

  .elo-support-attachment-button {
    width: 100%;
    min-height: 45px;
    display: flex;
    align-items: center;
    gap: 7px;
    margin-top: 12px;
    border: 1px solid #D8E1DD;
    border-radius: 13px;
    background: #F7F9F8;
    padding: 0 12px;
    color: #005744;
    cursor: pointer;
  }

  .elo-support-attachment-button span {
    font-size: 9px;
    font-weight: 900;
  }

  .elo-support-attachment-button small {
    margin-left: auto;
    color: #929B97;
    font-size: 8px;
    font-weight: 700;
  }

  .elo-support-attachment-preview {
    position: relative;
    overflow: hidden;
    margin-top: 12px;
    border-radius: 14px;
    background: #E8ECEA;
  }

  .elo-support-attachment-preview img {
    display: block;
    width: 100%;
    height: 180px;
    object-fit: cover;
  }

  .elo-support-remove-attachment {
    position: absolute;
    top: 8px;
    right: 8px;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 0;
    border-radius: 50%;
    background: rgba(0,0,0,.58);
    color: #FFFFFF;
    cursor: pointer;
  }

  .elo-support-form-actions {
    display: flex;
    gap: 9px;
    margin-top: 14px;
  }

  .elo-support-cancel,
  .elo-support-submit {
    min-height: 46px;
    border-radius: 13px;
    font-size: 10px;
    font-weight: 900;
    cursor: pointer;
  }

  .elo-support-cancel {
    width: 90px;
    border: 1px solid #D9E1DE;
    background: #FFFFFF;
    color: #68736E;
  }

  .elo-support-submit {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    border: 0;
    background: #005744;
    color: #FFFFFF;
    padding: 0 13px;
  }

  .elo-support-cancel:disabled,
  .elo-support-submit:disabled,
  .elo-support-attachment-button:disabled {
    opacity: .5;
    cursor: wait;
  }

  .elo-support-section-header {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 12px;
    margin: 27px 2px 9px;
  }

  .elo-support-section-label {
    color: #008564;
    font-size: 8px;
    font-weight: 900;
    letter-spacing: 1px;
  }

  .elo-support-section-header h2 {
    margin: 4px 0 0;
    color: #173C33;
    font-size: 20px;
    line-height: 24px;
    font-weight: 900;
    letter-spacing: -.35px;
  }

  .elo-support-section-actions {
    display: flex;
    align-items: center;
    gap: 7px;
  }

  .elo-support-ticket-count {
    min-height: 27px;
    display: flex;
    align-items: center;
    border-radius: 9px;
    background: #E7F1ED;
    padding: 0 9px;
    color: #005744;
    font-size: 8px;
    font-weight: 900;
  }

  .elo-support-refresh {
    width: 29px;
    height: 29px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1px solid #D8E1DD;
    border-radius: 9px;
    background: #FFFFFF;
    color: #005744;
    cursor: pointer;
  }

  .elo-support-refresh:disabled {
    opacity: .55;
    cursor: wait;
  }

  .elo-support-empty {
    min-height: 152px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    border: 1px solid #E0E6E3;
    border-radius: 18px;
    background: #FFFFFF;
    padding: 0 24px;
    text-align: center;
  }

  .elo-support-empty-icon {
    width: 42px;
    height: 42px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 14px;
    background: #EEF2F0;
    color: #78847E;
  }

  .elo-support-empty h3 {
    margin: 10px 0 0;
    color: #4B5852;
    font-size: 11px;
    font-weight: 900;
  }

  .elo-support-empty p {
    margin: 3px 0 0;
    color: #8B9590;
    font-size: 9px;
    line-height: 13px;
    font-weight: 600;
  }

  .elo-support-ticket-list {
    overflow: hidden;
    border: 1px solid #DDE4E1;
    border-radius: 18px;
    background: #FFFFFF;
  }

  .elo-support-ticket-row {
    width: 100%;
    min-height: 98px;
    display: flex;
    align-items: flex-start;
    gap: 11px;
    border: 0;
    border-bottom: 1px solid #E7EBE9;
    background: #FFFFFF;
    padding: 12px 13px;
    text-align: left;
    cursor: pointer;
  }

  .elo-support-ticket-row:last-child {
    border-bottom: 0;
  }

  .elo-support-ticket-row:hover {
    background: #FAFBFA;
  }

  .elo-support-ticket-icon {
    width: 38px;
    height: 38px;
    flex: 0 0 38px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 12px;
  }

  .elo-support-ticket-main {
    min-width: 0;
    flex: 1;
    display: block;
  }

  .elo-support-ticket-title-row {
    min-height: 22px;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .elo-support-ticket-title-row strong {
    min-width: 0;
    flex: 1;
    overflow: hidden;
    color: #26342E;
    font-size: 11px;
    line-height: 15px;
    font-weight: 900;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .elo-support-ticket-title-row svg {
    flex: 0 0 auto;
    color: #A1AAA6;
  }

  .elo-support-ticket-meta {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 5px;
    margin-top: 2px;
    color: #8B9590;
    font-size: 8px;
    font-weight: 600;
  }

  .elo-support-ticket-number {
    color: #7A8580;
    font-weight: 900;
    letter-spacing: .45px;
  }

  .elo-support-ticket-meta > i {
    width: 3px;
    height: 3px;
    border-radius: 50%;
    background: #B7BEBA;
  }

  .elo-support-ticket-badges {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 7px;
    margin-top: 9px;
  }

  .elo-support-status-badge {
    min-height: 25px;
    display: flex;
    align-items: center;
    gap: 5px;
    border-radius: 8px;
    padding: 0 8px;
  }

  .elo-support-status-badge > i {
    width: 5px;
    height: 5px;
    border-radius: 50%;
  }

  .elo-support-status-badge span {
    font-size: 7px;
    font-weight: 900;
    letter-spacing: .45px;
  }

  .elo-support-awaiting {
    color: #8A5A00;
    font-size: 8px;
    font-weight: 800;
  }

  .elo-support-priority {
    min-height: 24px;
    display: flex;
    align-items: center;
    gap: 4px;
    border-radius: 8px;
    background: #E7F1ED;
    padding: 0 7px;
    color: #005744;
  }

  .elo-support-priority span {
    font-size: 7px;
    font-weight: 900;
    letter-spacing: .45px;
  }

  .elo-support-loading {
    min-height: calc(100dvh - 69px);
    display: flex;
    align-items: center;
    justify-content: center;
    color: #005744;
  }

  .elo-support-spin {
    animation: elo-support-spin .8s linear infinite;
  }

  .elo-support-page button:focus {
    outline: none;
  }

  .elo-support-page button:focus-visible {
    outline: 2px solid #9EAEA7;
    outline-offset: 2px;
  }

  @keyframes elo-support-spin {
    to {
      transform: rotate(360deg);
    }
  }

  @media (max-width: 520px) {
    .elo-support-brand strong {
      font-size: 14px;
    }

    .elo-support-brand span {
      font-size: 8px;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .elo-support-spin {
      animation: none;
    }
  }
`;
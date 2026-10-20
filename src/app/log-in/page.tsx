"use client";

import {
  FormEvent,
  useMemo,
  useState,
} from "react";
import {
  ArrowRight,
  Eye,
  EyeOff,
  LoaderCircle,
} from "lucide-react";
import {
  useRouter,
} from "next/navigation";

import {
  createClient,
} from "@/lib/supabase/client";

function getReadableError(
  error: unknown,
  fallback: string
) {
  if (
    error instanceof Error &&
    error.message
  ) {
    return error.message;
  }

  if (
    error &&
    typeof error === "object"
  ) {
    const record =
      error as Record<string, unknown>;

    if (
      typeof record.message === "string" &&
      record.message
    ) {
      return record.message;
    }
  }

  return fallback;
}

export default function LogInPage() {
  const router = useRouter();

  const supabase = useMemo(
    () => createClient(),
    []
  );

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] =
    useState(false);
  const [loading, setLoading] =
    useState(false);
  const [resetting, setResetting] =
    useState(false);
  const [errorMessage, setErrorMessage] =
    useState<string | null>(null);
  const [successMessage, setSuccessMessage] =
    useState<string | null>(null);

  const busy = loading || resetting;

  async function signIn(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (busy) return;

    const cleanEmail = email.trim();

    setErrorMessage(null);
    setSuccessMessage(null);

    if (!cleanEmail || !password) {
      setErrorMessage(
        "Please enter your email address and password."
      );
      return;
    }

    setLoading(true);

    try {
      const { error } =
        await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });

      if (error) throw error;

      const searchParams =
        new URLSearchParams(
          window.location.search
        );

      const requestedRoute =
        searchParams.get("next");

      const destination =
        requestedRoute?.startsWith("/") &&
        !requestedRoute.startsWith("//")
          ? requestedRoute
          : "/account";

      router.replace(destination);
      router.refresh();
    } catch (error) {
      const message = getReadableError(
        error,
        "Please try again."
      );

      setErrorMessage(
        message === "Invalid login credentials"
          ? "That email address or password is incorrect."
          : message
      );
    } finally {
      setLoading(false);
    }
  }

  async function forgotPassword() {
    if (busy) return;

    const cleanEmail = email.trim();

    setErrorMessage(null);
    setSuccessMessage(null);

    if (!cleanEmail) {
      setErrorMessage(
        "Enter your email address first."
      );
      return;
    }

    setResetting(true);

    try {
      const redirectTo =
        `${window.location.origin}/reset-password`;

      const { error } =
        await supabase.auth.resetPasswordForEmail(
          cleanEmail,
          {
            redirectTo,
          }
        );

      if (error) throw error;

      setSuccessMessage(
        "We have sent you password reset instructions."
      );
    } catch (error) {
      setErrorMessage(
        getReadableError(
          error,
          "Unable to send the password reset email. Please try again."
        )
      );
    } finally {
      setResetting(false);
    }
  }

  return (
    <main className="elo-login-page">
      <div
        className="elo-login-background"
        aria-hidden="true"
      >
        <span className="elo-login-shard shard-one" />
        <span className="elo-login-shard shard-two" />
        <span className="elo-login-shard shard-three" />
        <span className="elo-login-shard shard-four" />
        <span className="elo-login-shard shard-five" />
        <span className="elo-login-shard shard-six" />
      </div>

      <div className="elo-login-scroll">
        <header className="elo-login-topbar">
          <strong>
            East Lothian Online
          </strong>

          <span>
            Your Community&apos;s Digital Home
          </span>
        </header>

        <section className="elo-login-card">
          <h1>
            Welcome back 👋
          </h1>

          <p className="elo-login-subtitle">
            Sign in to continue
          </p>

          <form onSubmit={signIn}>
            <label
              htmlFor="elo-login-email"
              className="elo-login-label"
            >
              Email
            </label>

            <input
              id="elo-login-email"
              name="email"
              type="email"
              placeholder="you@example.com"
              autoCapitalize="none"
              autoCorrect="off"
              autoComplete="email"
              inputMode="email"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                setErrorMessage(null);
                setSuccessMessage(null);
              }}
              disabled={busy}
              className="elo-login-input"
            />

            <div className="elo-login-password-header">
              <label
                htmlFor="elo-login-password"
                className="elo-login-label"
              >
                Password
              </label>

              <button
                type="button"
                className="elo-login-forgot"
                onClick={() =>
                  void forgotPassword()
                }
                disabled={busy}
              >
                {resetting
                  ? "Sending..."
                  : "Forgot password?"}
              </button>
            </div>

            <div className="elo-login-password-container">
              <input
                id="elo-login-password"
                name="password"
                type={
                  showPassword
                    ? "text"
                    : "password"
                }
                placeholder="Enter your password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                  setErrorMessage(null);
                  setSuccessMessage(null);
                }}
                disabled={busy}
                className="elo-login-password-input"
              />

              <button
                type="button"
                className="elo-login-show-button"
                onClick={() =>
                  setShowPassword(
                    (current) => !current
                  )
                }
                disabled={busy}
                aria-label={
                  showPassword
                    ? "Hide password"
                    : "Show password"
                }
              >
                {showPassword ? (
                  <>
                    <EyeOff size={17} />
                    <span>Hide</span>
                  </>
                ) : (
                  <>
                    <Eye size={17} />
                    <span>Show</span>
                  </>
                )}
              </button>
            </div>

            {errorMessage && (
              <div
                className="elo-login-message elo-login-error"
                role="alert"
              >
                {errorMessage}
              </div>
            )}

            {successMessage && (
              <div
                className="elo-login-message elo-login-success"
                role="status"
              >
                {successMessage}
              </div>
            )}

            <button
              type="submit"
              className="elo-login-signin"
              disabled={busy}
            >
              {loading ? (
                <LoaderCircle
                  size={19}
                  className="elo-login-spin"
                />
              ) : null}

              <span>
                {loading
                  ? "Signing in..."
                  : "Sign in"}
              </span>
            </button>
          </form>

          <div className="elo-login-divider-row">
            <span />
            <small>or</small>
            <span />
          </div>

          <button
            type="button"
            className="elo-login-create"
            disabled={busy}
            onClick={() =>
              router.push("/sign-up")
            }
          >
            Create an account
          </button>

          <button
            type="button"
            className="elo-login-browse"
            disabled={busy}
            onClick={() =>
              router.push("/")
            }
          >
            <span>
              Browse without an account
            </span>

            <ArrowRight size={17} />
          </button>
        </section>

        <p className="elo-login-footer">
          We&apos;re East Lothian&apos;s Digital Noticeboard
        </p>
      </div>

      <style>{styles}</style>
    </main>
  );
}

const styles = `
  .elo-login-page {
    position: relative;
    min-height: 100dvh;
    overflow: hidden;
    background: #007B5C;
    color: #111111;
    font-family: var(--font-geist-sans), Arial, sans-serif;
  }

  .elo-login-page *,
  .elo-login-page *::before,
  .elo-login-page *::after {
    box-sizing: border-box;
  }

  .elo-login-background {
    position: fixed;
    z-index: 0;
    inset: 0;
    overflow: hidden;
    pointer-events: none;
    background:
      radial-gradient(
        circle at 80% 18%,
        rgba(255,255,255,.08),
        transparent 26%
      ),
      radial-gradient(
        circle at 10% 80%,
        rgba(0,0,0,.08),
        transparent 28%
      ),
      linear-gradient(
        145deg,
        #008564 0%,
        #007B5C 42%,
        #005744 100%
      );
  }

  .elo-login-shard {
    position: absolute;
    display: block;
    opacity: .11;
    transform: rotate(16deg);
  }

  .elo-login-shard.shard-one {
    top: -90px;
    left: -120px;
    width: 380px;
    height: 280px;
    background: #FFFFFF;
    clip-path: polygon(0 0, 100% 12%, 58% 100%, 0 70%);
  }

  .elo-login-shard.shard-two {
    top: 0;
    left: 16%;
    width: 360px;
    height: 260px;
    background: #000000;
    opacity: .055;
    clip-path: polygon(20% 0, 100% 0, 72% 100%, 0 72%);
  }

  .elo-login-shard.shard-three {
    top: 16%;
    right: -130px;
    width: 430px;
    height: 330px;
    background: #FFFFFF;
    opacity: .07;
    clip-path: polygon(35% 0, 100% 18%, 100% 100%, 0 72%);
  }

  .elo-login-shard.shard-four {
    bottom: -150px;
    left: -90px;
    width: 460px;
    height: 390px;
    background: #000000;
    opacity: .05;
    clip-path: polygon(0 18%, 70% 0, 100% 78%, 30% 100%);
  }

  .elo-login-shard.shard-five {
    bottom: -100px;
    right: 4%;
    width: 420px;
    height: 360px;
    background: #FFFFFF;
    opacity: .06;
    clip-path: polygon(22% 0, 100% 24%, 76% 100%, 0 78%);
  }

  .elo-login-shard.shard-six {
    top: 42%;
    left: 45%;
    width: 350px;
    height: 280px;
    background: #FFFFFF;
    opacity: .035;
    clip-path: polygon(0 25%, 72% 0, 100% 78%, 28% 100%);
  }

  .elo-login-scroll {
    position: relative;
    z-index: 1;
    width: 100%;
    min-height: 100dvh;
    display: flex;
    flex-direction: column;
    padding: 18px 22px 112px;
    overflow-y: auto;
  }

  .elo-login-topbar {
    width: 100%;
    max-width: 500px;
    display: flex;
    flex-direction: column;
    align-items: center;
    align-self: center;
    justify-content: center;
    margin-bottom: 30px;
    text-align: center;
  }

  .elo-login-topbar strong {
    color: #FFFFFF;
    font-size: 20px;
    line-height: 25px;
    font-weight: 900;
    letter-spacing: -.4px;
  }

  .elo-login-topbar span {
    margin-top: 3px;
    color: rgba(255,255,255,.78);
    font-size: 12px;
    line-height: 17px;
    font-weight: 700;
  }

  .elo-login-card {
    width: 100%;
    max-width: 500px;
    align-self: center;
    margin: auto;
    border: 1px solid rgba(255,255,255,.36);
    border-radius: 24px;
    background: rgba(255,255,255,.96);
    padding: 24px;
    box-shadow:
      0 28px 65px rgba(0,44,33,.17),
      0 4px 18px rgba(0,0,0,.05);
    backdrop-filter: blur(12px);
  }

  .elo-login-card h1 {
    margin: 0;
    color: #111111;
    font-size: 29px;
    line-height: 35px;
    font-weight: 800;
    letter-spacing: -.7px;
  }

  .elo-login-subtitle {
    margin: 5px 0 27px;
    color: #707070;
    font-size: 15px;
    line-height: 21px;
  }

  .elo-login-label {
    display: block;
    margin: 0 0 8px;
    color: #292929;
    font-size: 14px;
    line-height: 18px;
    font-weight: 700;
  }

  .elo-login-input,
  .elo-login-password-container {
    width: 100%;
    height: 54px;
    border: 1px solid #DEDEDE;
    border-radius: 13px;
    background: #F7F7F7;
  }

  .elo-login-input {
    margin-bottom: 18px;
    outline: 0;
    padding: 0 15px;
    color: #111111;
    font-size: 16px;
  }

  .elo-login-input::placeholder,
  .elo-login-password-input::placeholder {
    color: #8C8C8C;
  }

  .elo-login-input:focus,
  .elo-login-password-container:focus-within {
    border-color: #008564;
    background: #FFFFFF;
    box-shadow: 0 0 0 3px rgba(0,133,100,.09);
  }

  .elo-login-password-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 15px;
  }

  .elo-login-password-header .elo-login-label {
    margin-bottom: 8px;
  }

  .elo-login-forgot {
    margin: 0 0 8px;
    border: 0;
    background: transparent;
    padding: 0;
    color: #008564;
    font-size: 13px;
    line-height: 18px;
    font-weight: 700;
    cursor: pointer;
  }

  .elo-login-password-container {
    display: flex;
    align-items: center;
    margin-bottom: 22px;
    overflow: hidden;
  }

  .elo-login-password-input {
    min-width: 0;
    height: 100%;
    flex: 1;
    border: 0;
    outline: 0;
    background: transparent;
    padding: 0 15px;
    color: #111111;
    font-size: 16px;
  }

  .elo-login-show-button {
    height: 100%;
    display: flex;
    align-items: center;
    gap: 5px;
    border: 0;
    background: transparent;
    padding: 0 15px;
    color: #008564;
    cursor: pointer;
  }

  .elo-login-show-button span {
    font-size: 13px;
    font-weight: 700;
  }

  .elo-login-message {
    margin: -7px 0 15px;
    border-radius: 11px;
    padding: 10px 12px;
    font-size: 12px;
    line-height: 18px;
    font-weight: 700;
  }

  .elo-login-error {
    background: #FDECEA;
    color: #A52B21;
  }

  .elo-login-success {
    background: #E6F4EE;
    color: #126A46;
  }

  .elo-login-signin {
    width: 100%;
    height: 56px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    border: 0;
    border-radius: 13px;
    background: #008564;
    color: #FFFFFF;
    cursor: pointer;
  }

  .elo-login-signin span {
    font-size: 16px;
    font-weight: 800;
  }

  .elo-login-divider-row {
    display: flex;
    align-items: center;
    margin: 21px 0;
  }

  .elo-login-divider-row > span {
    height: 1px;
    flex: 1;
    background: #E1E1E1;
  }

  .elo-login-divider-row small {
    margin: 0 12px;
    color: #909090;
    font-size: 13px;
    font-weight: 400;
  }

  .elo-login-create {
    width: 100%;
    height: 54px;
    border: 1.5px solid #008564;
    border-radius: 13px;
    background: transparent;
    color: #008564;
    font-size: 16px;
    font-weight: 800;
    cursor: pointer;
  }

  .elo-login-browse {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    margin-top: 19px;
    border: 0;
    background: transparent;
    padding: 5px;
    color: #005744;
    cursor: pointer;
  }

  .elo-login-browse span {
    font-size: 14px;
    font-weight: 700;
  }

  .elo-login-footer {
    width: 100%;
    max-width: 500px;
    align-self: center;
    margin: 24px 0 0;
    color: rgba(255,255,255,.84);
    font-size: 13px;
    line-height: 18px;
    font-weight: 600;
    text-align: center;
  }

  .elo-login-page button:disabled,
  .elo-login-page input:disabled {
    opacity: .6;
    cursor: not-allowed;
  }

  .elo-login-page button:focus {
    outline: none;
  }

  .elo-login-page button:focus-visible {
    outline: 2px solid rgba(255,255,255,.92);
    outline-offset: 2px;
  }

  .elo-login-card button:focus-visible {
    outline-color: #008564;
  }

  .elo-login-spin {
    animation: elo-login-spin .8s linear infinite;
  }

  @keyframes elo-login-spin {
    to {
      transform: rotate(360deg);
    }
  }

  @media (min-width: 700px) {
    .elo-login-scroll {
      padding-top: 26px;
    }
  }

  @media (max-width: 520px) {
    .elo-login-scroll {
      padding: 18px 16px 112px;
    }

    .elo-login-topbar {
      margin-bottom: 22px;
    }

    .elo-login-card {
      border-radius: 21px;
      padding: 21px 18px;
    }

    .elo-login-card h1 {
      font-size: 27px;
      line-height: 32px;
    }
  }

  @media (max-height: 720px) {
    .elo-login-card {
      margin-top: 0;
      margin-bottom: 0;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .elo-login-spin {
      animation: none;
    }
  }
`;

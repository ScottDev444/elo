"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  CheckCircle2,
  LoaderCircle,
} from "lucide-react";

import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [ready, setReady] = useState(false);
  const [checking, setChecking] = useState(true);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function checkResetSession() {
      const supabase = createClient();

      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (!isMounted) {
        return;
      }

      if (error || !session) {
        setReady(false);
        setMessage(
          "This reset link is invalid or has expired. Please request a new one.",
        );
      } else {
        setReady(true);
        setMessage("");
      }

      setChecking(false);
    }

    void checkResetSession();

    return () => {
      isMounted = false;
    };
  }, []);

  async function handleReset() {
    if (!ready || loading) {
      return;
    }

    setMessage("");
    setIsSuccess(false);

    if (password.length < 8) {
      setMessage("Your password must be at least 8 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setMessage("Your passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();

      const { error } = await supabase.auth.updateUser({
        password,
      });

      if (error) {
        setMessage(error.message);
        return;
      }

      await supabase.auth.signOut();

      setIsSuccess(true);
      setReady(false);
      setMessage(
        "Your password has been updated. You can now log in with your new password.",
      );

      window.setTimeout(() => {
        router.replace("/log-in");
        router.refresh();
      }, 1800);
    } catch {
      setMessage(
        "Something went wrong while updating your password. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="elo-reset-page">
      <div className="elo-reset-background" aria-hidden="true">
        <span className="elo-reset-shard shard-one" />
        <span className="elo-reset-shard shard-two" />
        <span className="elo-reset-shard shard-three" />
        <span className="elo-reset-shard shard-four" />
        <span className="elo-reset-shard shard-five" />
      </div>

      <div className="elo-reset-scroll">
        <header className="elo-reset-topbar">
          <strong>East Lothian Online</strong>
          <span>Your Community&apos;s Digital Home</span>
        </header>

        <section className="elo-reset-card">
          {isSuccess ? (
            <div className="elo-reset-success">
              <CheckCircle2 className="elo-reset-success-icon" />

              <h1>Password updated.</h1>

              <p className="elo-reset-subtitle">{message}</p>

              <Link href="/log-in" className="elo-reset-primary-button">
                Go to login
                <ArrowRight size={19} />
              </Link>
            </div>
          ) : (
            <>
              <h1>Reset your password</h1>

              <p className="elo-reset-subtitle">
                Choose a new password for your East Lothian Online account.
              </p>

              <div className="elo-reset-form">
                <label htmlFor="password" className="elo-reset-label">
                  New password
                </label>

                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  disabled={!ready || checking || loading}
                  placeholder="Enter a new password"
                  className="elo-reset-input"
                />

                <p className="elo-reset-hint">
                  Use at least 8 characters.
                </p>

                <label
                  htmlFor="confirm-password"
                  className="elo-reset-label"
                >
                  Confirm new password
                </label>

                <input
                  id="confirm-password"
                  name="confirm-password"
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  value={confirmPassword}
                  onChange={(event) =>
                    setConfirmPassword(event.target.value)
                  }
                  disabled={!ready || checking || loading}
                  placeholder="Enter it again"
                  className="elo-reset-input"
                />

                {message ? (
                  <div role="alert" className="elo-reset-message">
                    {message}
                  </div>
                ) : null}

                <button
                  type="button"
                  onClick={handleReset}
                  disabled={checking || loading || !ready}
                  className="elo-reset-primary-button"
                >
                  {checking ? (
                    <>
                      <LoaderCircle
                        size={19}
                        className="elo-reset-spinner"
                      />
                      Checking link
                    </>
                  ) : loading ? (
                    <>
                      <LoaderCircle
                        size={19}
                        className="elo-reset-spinner"
                      />
                      Updating password
                    </>
                  ) : (
                    <>
                      Update password
                      <ArrowRight size={19} />
                    </>
                  )}
                </button>

                {!ready && !checking ? (
                  <p className="elo-reset-request">
                    Need another reset link?{" "}
                    <Link href="/forgot-password">
                      Request one
                    </Link>
                  </p>
                ) : null}
              </div>
            </>
          )}
        </section>

        <p className="elo-reset-footer">
          We&apos;re East Lothian&apos;s Digital Noticeboard
        </p>
      </div>

      <style jsx global>{`
        * {
          box-sizing: border-box;
        }

        .elo-reset-page {
          position: relative;
          min-height: 100vh;
          overflow: hidden;
          background: #007b5c;
          color: #111111;
          font-family: inherit;
        }

        .elo-reset-background {
          position: absolute;
          inset: 0;
          overflow: hidden;
          pointer-events: none;
        }

        .elo-reset-shard {
          position: absolute;
          display: block;
          background: rgba(255, 255, 255, 0.055);
          transform: rotate(20deg);
        }

        .shard-one {
          width: 420px;
          height: 620px;
          top: -260px;
          left: -170px;
        }

        .shard-two {
          width: 350px;
          height: 470px;
          top: -160px;
          right: -150px;
          transform: rotate(-27deg);
        }

        .shard-three {
          width: 300px;
          height: 520px;
          bottom: -270px;
          left: 7%;
          transform: rotate(46deg);
        }

        .shard-four {
          width: 420px;
          height: 560px;
          right: -210px;
          bottom: -210px;
          transform: rotate(28deg);
        }

        .shard-five {
          width: 250px;
          height: 390px;
          left: 48%;
          top: 19%;
          opacity: 0.45;
          transform: rotate(-36deg);
        }

        .elo-reset-scroll {
          position: relative;
          z-index: 1;
          display: flex;
          min-height: 100vh;
          flex-direction: column;
          align-items: center;
          padding: 28px 22px 26px;
        }

        .elo-reset-topbar {
          width: 100%;
          max-width: 500px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          margin-bottom: 30px;
          text-align: center;
        }

        .elo-reset-topbar strong {
          color: #ffffff;
          font-size: 20px;
          font-weight: 900;
          letter-spacing: -0.4px;
        }

        .elo-reset-topbar span {
          margin-top: 3px;
          color: rgba(255, 255, 255, 0.78);
          font-size: 12px;
          font-weight: 700;
        }

        .elo-reset-card {
          width: 100%;
          max-width: 500px;
          margin: auto 0;
          padding: 24px;
          border-radius: 24px;
          background: rgba(255, 255, 255, 0.96);
          box-shadow: 0 22px 55px rgba(0, 57, 43, 0.22);
        }

        .elo-reset-card h1 {
          margin: 0;
          color: #111111;
          font-size: 29px;
          line-height: 1.1;
          font-weight: 800;
          letter-spacing: -0.7px;
        }

        .elo-reset-subtitle {
          margin: 6px 0 27px;
          color: #707070;
          font-size: 15px;
          line-height: 1.5;
        }

        .elo-reset-form {
          display: flex;
          flex-direction: column;
        }

        .elo-reset-label {
          margin-bottom: 8px;
          color: #292929;
          font-size: 14px;
          font-weight: 700;
        }

        .elo-reset-input {
          width: 100%;
          height: 54px;
          margin: 0 0 8px;
          padding: 0 15px;
          border: 1px solid #dedede;
          border-radius: 13px;
          outline: none;
          background: #f7f7f7;
          color: #111111;
          font: inherit;
          font-size: 16px;
          transition:
            border-color 160ms ease,
            box-shadow 160ms ease;
        }

        .elo-reset-input::placeholder {
          color: #8c8c8c;
        }

        .elo-reset-input:focus {
          border-color: #008564;
          box-shadow: 0 0 0 3px rgba(0, 133, 100, 0.1);
        }

        .elo-reset-input:disabled {
          cursor: not-allowed;
          opacity: 0.6;
        }

        .elo-reset-hint {
          margin: 0 0 18px;
          color: #8a8a8a;
          font-size: 12px;
          line-height: 1.5;
        }

        .elo-reset-message {
          margin: 4px 0 18px;
          padding: 12px 14px;
          border-radius: 12px;
          background: #fff1f1;
          color: #a12a2a;
          font-size: 13px;
          font-weight: 600;
          line-height: 1.5;
        }

        .elo-reset-primary-button {
          display: flex;
          width: 100%;
          height: 56px;
          align-items: center;
          justify-content: center;
          gap: 8px;
          margin-top: 4px;
          border: 0;
          border-radius: 13px;
          background: #008564;
          color: #ffffff;
          text-decoration: none;
          font: inherit;
          font-size: 16px;
          font-weight: 800;
          cursor: pointer;
          transition:
            background-color 160ms ease,
            opacity 160ms ease;
        }

        .elo-reset-primary-button:hover:not(:disabled) {
          background: #007558;
        }

        .elo-reset-primary-button:disabled {
          cursor: not-allowed;
          opacity: 0.6;
        }

        .elo-reset-spinner {
          animation: elo-reset-spin 0.8s linear infinite;
        }

        @keyframes elo-reset-spin {
          to {
            transform: rotate(360deg);
          }
        }

        .elo-reset-request {
          margin: 20px 0 0;
          text-align: center;
          color: #707070;
          font-size: 14px;
        }

        .elo-reset-request a {
          color: #008564;
          font-weight: 800;
          text-decoration: none;
        }

        .elo-reset-request a:hover {
          text-decoration: underline;
        }

        .elo-reset-success {
          text-align: center;
        }

        .elo-reset-success-icon {
          width: 48px;
          height: 48px;
          margin: 0 auto 20px;
          color: #008564;
        }

        .elo-reset-success .elo-reset-subtitle {
          margin-top: 12px;
        }

        .elo-reset-footer {
          margin: 24px 0 0;
          color: rgba(255, 255, 255, 0.84);
          font-size: 13px;
          font-weight: 600;
          text-align: center;
        }

        @media (max-width: 600px) {
          .elo-reset-scroll {
            padding: 18px 22px 24px;
          }

          .elo-reset-topbar {
            margin-bottom: 25px;
          }

          .elo-reset-card {
            padding: 24px;
          }
        }
      `}</style>
    </main>
  );
}
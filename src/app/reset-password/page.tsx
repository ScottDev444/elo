"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  CheckCircle2,
  LoaderCircle,
} from "lucide-react";

import SiteHeader from "@/components/SiteHeader";
import Footer from "@/components/Footer";
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
    <>
      <SiteHeader />

      <main className="bg-white text-black">
        <section className="mx-auto flex min-h-[calc(100vh-160px)] w-full max-w-7xl items-center justify-center px-5 py-16 sm:px-8 sm:py-20 lg:px-12 lg:py-28">
          <div className="w-full max-w-xl text-center">
            {isSuccess ? (
              <>
                <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-700" />

                <p className="mt-6 text-sm font-black uppercase tracking-[0.18em] text-emerald-700">
                  East Lothian Online
                </p>

                <h1 className="mt-4 text-5xl font-black leading-[0.95] tracking-[-0.055em] sm:text-6xl">
                  Password updated.
                </h1>

                <p className="mx-auto mt-5 max-w-md text-lg leading-8 text-black/60">
                  {message}
                </p>

                <Link
                  href="/log-in"
                  className="mt-10 inline-flex h-14 w-full items-center justify-center gap-3 rounded-2xl bg-emerald-700 px-5 text-sm font-black uppercase tracking-[0.12em] text-white transition hover:bg-emerald-800"
                >
                  Go to login
                  <ArrowRight className="h-5 w-5" />
                </Link>
              </>
            ) : (
              <>
                <p className="text-sm font-black uppercase tracking-[0.18em] text-emerald-700">
                  East Lothian Online
                </p>

                <h1 className="mt-4 text-5xl font-black leading-[0.95] tracking-[-0.055em] sm:text-6xl">
                  Reset your password.
                </h1>

                <p className="mx-auto mt-5 max-w-md text-lg leading-8 text-black/60">
                  Choose a new password for your East Lothian Online account.
                </p>

                <div className="mt-10 space-y-6 text-left">
                  <div>
                    <label
                      htmlFor="password"
                      className="mb-2 block text-sm font-bold"
                    >
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
                      className="h-14 w-full rounded-2xl border border-black/15 bg-white px-5 text-base outline-none transition focus:border-emerald-700 focus:ring-4 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:bg-black/[0.03] disabled:opacity-60"
                    />

                    <p className="mt-2 text-sm leading-6 text-black/45">
                      Use at least 8 characters.
                    </p>
                  </div>

                  <div>
                    <label
                      htmlFor="confirm-password"
                      className="mb-2 block text-sm font-bold"
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
                      className="h-14 w-full rounded-2xl border border-black/15 bg-white px-5 text-base outline-none transition focus:border-emerald-700 focus:ring-4 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:bg-black/[0.03] disabled:opacity-60"
                    />
                  </div>

                  {message ? (
                    <p
                      role="alert"
                      className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold leading-6 text-red-800"
                    >
                      {message}
                    </p>
                  ) : null}

                  <button
                    type="button"
                    onClick={handleReset}
                    disabled={checking || loading || !ready}
                    className="flex h-14 w-full items-center justify-center gap-3 rounded-2xl bg-emerald-700 px-5 text-sm font-black uppercase tracking-[0.12em] text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {checking ? (
                      <>
                        <LoaderCircle className="h-5 w-5 animate-spin" />
                        Checking link
                      </>
                    ) : loading ? (
                      <>
                        <LoaderCircle className="h-5 w-5 animate-spin" />
                        Updating password
                      </>
                    ) : (
                      <>
                        Update password
                        <ArrowRight className="h-5 w-5" />
                      </>
                    )}
                  </button>
                </div>

                {!ready && !checking ? (
                  <p className="mt-8 text-center text-sm leading-6 text-black/55">
                    Need another reset link?{" "}
                    <Link
                      href="/forgot-password"
                      className="font-bold text-black underline decoration-black/25 underline-offset-4 transition hover:decoration-black"
                    >
                      Request one
                    </Link>
                  </p>
                ) : null}
              </>
            )}
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  LoaderCircle,
} from "lucide-react";

import SiteHeader from "@/components/SiteHeader";
import Footer from "@/components/Footer";
import { createClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasSentEmail, setHasSentEmail] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    setErrorMessage("");
    setIsSubmitting(true);

    try {
      const supabase = createClient();

      const { error } = await supabase.auth.resetPasswordForEmail(
        email.trim(),
        {
          redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
        },
      );

      if (error) {
        setErrorMessage(error.message);
        return;
      }

      setHasSentEmail(true);
    } catch {
      setErrorMessage(
        "Something went wrong while sending the reset email. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <SiteHeader />

      <main className="bg-white text-black">
        <section className="mx-auto flex min-h-[calc(100vh-160px)] w-full max-w-7xl items-center justify-center px-5 py-16 sm:px-8 sm:py-20 lg:px-12 lg:py-28">
          <div className="w-full max-w-xl text-center">
            {hasSentEmail ? (
              <>
                <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-700" />

                <p className="mt-6 text-sm font-black uppercase tracking-[0.18em] text-emerald-700">
                  East Lothian Online
                </p>

                <h1 className="mt-4 text-5xl font-black leading-[0.95] tracking-[-0.055em] sm:text-6xl">
                  Check your inbox.
                </h1>

                <p className="mx-auto mt-5 max-w-md text-lg leading-8 text-black/60">
                  We&apos;ve sent a password reset link to{" "}
                  <span className="font-bold text-black">{email}</span>.
                </p>

                <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-black/45">
                  The link may take a minute to arrive. Check your spam folder
                  if you don&apos;t see it.
                </p>

                <button
                  type="button"
                  onClick={() => {
                    setHasSentEmail(false);
                    setErrorMessage("");
                  }}
                  className="mt-10 inline-flex h-14 w-full items-center justify-center gap-3 rounded-2xl bg-emerald-700 px-5 text-sm font-black uppercase tracking-[0.12em] text-white transition hover:bg-emerald-800"
                >
                  Use another email
                  <ArrowRight className="h-5 w-5" />
                </button>

                <Link
                  href="/log-in"
                  className="mt-6 inline-flex items-center justify-center gap-2 text-sm font-bold text-black/55 transition hover:text-black"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to login
                </Link>
              </>
            ) : (
              <>
                <p className="text-sm font-black uppercase tracking-[0.18em] text-emerald-700">
                  East Lothian Online
                </p>

                <h1 className="mt-4 text-5xl font-black leading-[0.95] tracking-[-0.055em] sm:text-6xl">
                  Forgot your password?
                </h1>

                <p className="mx-auto mt-5 max-w-md text-lg leading-8 text-black/60">
                  Enter your email address and we&apos;ll send you a reset link.
                </p>

                <form
                  onSubmit={handleSubmit}
                  className="mt-10 space-y-6 text-left"
                >
                  <div>
                    <label
                      htmlFor="email"
                      className="mb-2 block text-sm font-bold"
                    >
                      Email address
                    </label>

                    <input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      disabled={isSubmitting}
                      placeholder="you@example.com"
                      className="h-14 w-full rounded-2xl border border-black/15 bg-white px-5 text-base outline-none transition placeholder:text-black/30 focus:border-emerald-700 focus:ring-4 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
                    />
                  </div>

                  {errorMessage ? (
                    <p
                      role="alert"
                      className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold leading-6 text-red-800"
                    >
                      {errorMessage}
                    </p>
                  ) : null}

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex h-14 w-full items-center justify-center gap-3 rounded-2xl bg-emerald-700 px-5 text-sm font-black uppercase tracking-[0.12em] text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSubmitting ? (
                      <>
                        <LoaderCircle className="h-5 w-5 animate-spin" />
                        Sending reset link
                      </>
                    ) : (
                      <>
                        Send reset link
                        <ArrowRight className="h-5 w-5" />
                      </>
                    )}
                  </button>
                </form>

                <Link
                  href="/log-in"
                  className="mt-8 inline-flex items-center justify-center gap-2 text-sm font-bold text-black/55 transition hover:text-black"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to login
                </Link>
              </>
            )}
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, LoaderCircle } from "lucide-react";

import SiteHeader from "@/components/SiteHeader";
import Footer from "@/components/Footer";
import { createClient } from "@/lib/supabase/client";

export default function LogInPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    setErrorMessage("");
    setIsSubmitting(true);

    try {
      const supabase = createClient();

      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        setErrorMessage(
          error.message === "Invalid login credentials"
            ? "That email address or password is incorrect."
            : error.message,
        );
        return;
      }

      const searchParams = new URLSearchParams(window.location.search);
      const requestedRoute = searchParams.get("next");

      const destination =
        requestedRoute?.startsWith("/") && !requestedRoute.startsWith("//")
          ? requestedRoute
          : "/account";

      router.replace(destination);
      router.refresh();
    } catch {
      setErrorMessage(
        "Something went wrong while logging you in. Please try again.",
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
            <p className="text-sm font-black uppercase tracking-[0.18em] text-emerald-700">
              East Lothian Online
            </p>

            <h1 className="mt-4 text-5xl font-black leading-[0.95] tracking-[-0.055em] sm:text-6xl">
              Welcome back.
            </h1>

            <p className="mx-auto mt-5 max-w-md text-lg leading-8 text-black/60">
              Log in to your East Lothian Online account.
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

              <div>
                <div className="mb-2 flex items-center justify-between gap-4">
                  <label htmlFor="password" className="text-sm font-bold">
                    Password
                  </label>

                  <Link
                    href="/forgot-password"
                    className="text-sm font-bold text-black/50 transition hover:text-black"
                  >
                    Forgot password?
                  </Link>
                </div>

                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  disabled={isSubmitting}
                  className="h-14 w-full rounded-2xl border border-black/15 bg-white px-5 text-base outline-none transition focus:border-emerald-700 focus:ring-4 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
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
                    Logging in
                  </>
                ) : (
                  <>
                    Continue
                    <ArrowRight className="h-5 w-5" />
                  </>
                )}
              </button>
            </form>

            <p className="mt-8 text-center text-sm leading-6 text-black/55">
              Don&apos;t have an account?{" "}
              <Link
                href="/sign-up"
                className="font-bold text-black underline decoration-black/25 underline-offset-4 transition hover:decoration-black"
              >
                Create one
              </Link>
            </p>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
"use client";

import { FormEvent, useState } from "react";
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

export default function SignUpPage() {
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasSignedUp, setHasSignedUp] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    setErrorMessage("");

    const cleanUsername = username.trim();

    if (cleanUsername.length < 3) {
      setErrorMessage("Your username must be at least 3 characters long.");
      return;
    }

    if (cleanUsername.length > 30) {
      setErrorMessage("Your username must be 30 characters or fewer.");
      return;
    }

    if (!/^[a-zA-Z0-9 _.-]+$/.test(cleanUsername)) {
      setErrorMessage(
        "Your username can only contain letters, numbers, spaces, dots, dashes and underscores.",
      );
      return;
    }

    if (password.length < 8) {
      setErrorMessage("Your password must be at least 8 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage("Your passwords do not match.");
      return;
    }

    setIsSubmitting(true);

    try {
      const supabase = createClient();

      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: {
            username: cleanUsername,
          },
        },
      });

      if (error) {
        setErrorMessage(error.message);
        return;
      }

      if (data.session) {
        await supabase
          .from("users")
          .upsert(
            {
              id: data.user?.id,
              username: cleanUsername,
              role: "user",
            },
            {
              onConflict: "id",
            },
          );

        router.replace("/account");
        router.refresh();
        return;
      }

      setHasSignedUp(true);
    } catch {
      setErrorMessage(
        "Something went wrong while creating your account. Please try again.",
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
            {hasSignedUp ? (
              <>
                <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-700" />

                <p className="mt-6 text-sm font-black uppercase tracking-[0.18em] text-emerald-700">
                  East Lothian Online
                </p>

                <h1 className="mt-4 text-5xl font-black leading-[0.95] tracking-[-0.055em] sm:text-6xl">
                  Check your inbox.
                </h1>

                <p className="mx-auto mt-5 max-w-md text-lg leading-8 text-black/60">
                  We&apos;ve sent a confirmation link to{" "}
                  <span className="font-bold text-black">{email}</span>.
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
                  Join East Lothian Online.
                </h1>

                <p className="mx-auto mt-5 max-w-md text-lg leading-8 text-black/60">
                  Create your East Lothian Online account.
                </p>

                <form
                  onSubmit={handleSubmit}
                  className="mt-10 space-y-6 text-left"
                >
                  <div>
                    <label
                      htmlFor="username"
                      className="mb-2 block text-sm font-bold"
                    >
                      Username
                    </label>

                    <input
                      id="username"
                      name="username"
                      type="text"
                      autoComplete="username"
                      required
                      minLength={3}
                      maxLength={30}
                      value={username}
                      onChange={(event) => setUsername(event.target.value)}
                      disabled={isSubmitting}
                      placeholder="Choose a username"
                      className="h-14 w-full rounded-2xl border border-black/15 bg-white px-5 text-base outline-none transition placeholder:text-black/30 focus:border-emerald-700 focus:ring-4 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
                    />

                    <p className="mt-2 text-sm leading-6 text-black/45">
                      Your username is only used for your account and will not
                      appear on any Pages or Places you create.
                    </p>
                  </div>

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
                    <label
                      htmlFor="password"
                      className="mb-2 block text-sm font-bold"
                    >
                      Password
                    </label>

                    <input
                      id="password"
                      name="password"
                      type="password"
                      autoComplete="new-password"
                      required
                      minLength={8}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      disabled={isSubmitting}
                      className="h-14 w-full rounded-2xl border border-black/15 bg-white px-5 text-base outline-none transition focus:border-emerald-700 focus:ring-4 focus:ring-emerald-100 disabled:cursor-not-allowed disabled:opacity-60"
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
                      Confirm password
                    </label>

                    <input
                      id="confirm-password"
                      name="confirm-password"
                      type="password"
                      autoComplete="new-password"
                      required
                      minLength={8}
                      value={confirmPassword}
                      onChange={(event) =>
                        setConfirmPassword(event.target.value)
                      }
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
                        Creating account
                      </>
                    ) : (
                      <>
                        Create account
                        <ArrowRight className="h-5 w-5" />
                      </>
                    )}
                  </button>
                </form>

                <p className="mt-8 text-center text-sm leading-6 text-black/55">
                  Already have an account?{" "}
                  <Link
                    href="/log-in"
                    className="font-bold text-black underline decoration-black/25 underline-offset-4 transition hover:decoration-black"
                  >
                    Log in
                  </Link>
                </p>
              </>
            )}
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
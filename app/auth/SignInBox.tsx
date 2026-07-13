"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Mode = "signin" | "signup" | "reset";
type MessageType = "error" | "success";

export default function SignInBox() {
  const router = useRouter();

  const [mode, setMode] = useState<Mode>("signin");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] =
    useState<MessageType>("error");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (loading) return;

    setLoading(true);
    setMessage("");
    setMessageType("error");

    const cleanEmail = email.trim();
    const cleanUsername = username.trim();

    if (mode === "reset") {
      const redirectTo =
        `${window.location.origin}/auth/confirm` +
        `?next=${encodeURIComponent("/reset-password")}`;

      const { error } = await supabase.auth.resetPasswordForEmail(
        cleanEmail,
        { redirectTo }
      );

      if (error) {
        setMessage(error.message);
        setLoading(false);
        return;
      }

      setMessageType("success");
      setMessage(
        "Check your email for a secure password reset link."
      );
      setLoading(false);
      return;
    }

    if (mode === "signin") {
      const { data, error } =
        await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });

      if (error) {
        setMessage(error.message);
        setLoading(false);
        return;
      }

      const userId = data.user?.id;

      if (!userId) {
        setMessage("Unable to sign in.");
        setLoading(false);
        return;
      }

      const { data: userRow, error: userError } = await supabase
        .from("users")
        .select("has_seen_welcome")
        .eq("id", userId)
        .single();

      if (userError) {
        setMessage(userError.message);
        setLoading(false);
        return;
      }

      router.push(userRow?.has_seen_welcome ? "/" : "/welcome");
      router.refresh();
      return;
    }

    if (!cleanUsername) {
      setMessage("Choose a username first.");
      setLoading(false);
      return;
    }

    const { data, error } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
    });

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    const userId = data.user?.id;

    if (userId) {
      const { error: userError } = await supabase
        .from("users")
        .upsert({
          id: userId,
          username: cleanUsername,
          role: "user",
        });

      if (userError) {
        setMessage(userError.message);
        setLoading(false);
        return;
      }
    }

    router.push("/welcome");
    router.refresh();
  }

  function changeMode(nextMode: Mode) {
    if (loading) return;

    setMode(nextMode);
    setMessage("");
    setMessageType("error");
    setPassword("");
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-[2rem] border border-zinc-200 bg-white p-4 shadow-sm"
    >
      {mode !== "reset" ? (
        <div className="mb-5 flex rounded-full bg-zinc-100 p-1">
          {(["signin", "signup"] as const).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => changeMode(item)}
              className={`h-10 flex-1 rounded-full text-sm font-black transition ${
                mode === item
                  ? "bg-zinc-950 text-white"
                  : "text-zinc-500 hover:text-zinc-950"
              }`}
            >
              {item === "signin" ? "Sign in" : "Sign up"}
            </button>
          ))}
        </div>
      ) : (
        <div className="mb-5">
          <button
            type="button"
            onClick={() => changeMode("signin")}
            className="text-sm font-black text-zinc-500 transition hover:text-zinc-950"
          >
            ← Back to sign in
          </button>

          <h2 className="mt-4 text-xl font-black text-zinc-950">
            Reset your password
          </h2>

          <p className="mt-1 text-sm font-medium text-zinc-500">
            Enter your email and we’ll send you a secure reset
            link.
          </p>
        </div>
      )}

      <div className="space-y-4">
        {mode === "signup" && (
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            autoComplete="username"
            className="h-12 w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 text-sm font-semibold text-zinc-950 outline-none transition placeholder:text-zinc-400 focus:border-green-700 focus:bg-white focus:ring-4 focus:ring-green-100"
          />
        )}

        <input
          type="email"
          placeholder="Email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
          className="h-12 w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 text-sm font-semibold text-zinc-950 outline-none transition placeholder:text-zinc-400 focus:border-green-700 focus:bg-white focus:ring-4 focus:ring-green-100"
        />

        {mode !== "reset" && (
          <div>
            <input
              type="password"
              placeholder={
                mode === "signin"
                  ? "Password"
                  : "Create password"
              }
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete={
                mode === "signin"
                  ? "current-password"
                  : "new-password"
              }
              className="h-12 w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 text-sm font-semibold text-zinc-950 outline-none transition placeholder:text-zinc-400 focus:border-green-700 focus:bg-white focus:ring-4 focus:ring-green-100"
            />

            {mode === "signin" && (
              <div className="mt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => changeMode("reset")}
                  className="text-sm font-black text-green-800 transition hover:text-green-950"
                >
                  Forgot password?
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {message && (
        <div
          className={`mt-4 rounded-2xl border px-4 py-3 text-sm font-semibold ${
            messageType === "success"
              ? "border-green-200 bg-green-50 text-green-800"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {message}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="mt-5 h-12 w-full rounded-full bg-zinc-950 text-sm font-black text-white transition hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading
          ? "One moment..."
          : mode === "signin"
            ? "Sign in"
            : mode === "signup"
              ? "Create account"
              : "Send reset link"}
      </button>
    </form>
  );
}
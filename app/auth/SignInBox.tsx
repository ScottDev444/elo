"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function SignInBox() {
  const router = useRouter();

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;

    setLoading(true);
    setMessage("");

    const cleanEmail = email.trim();
    const cleanUsername = username.trim();

    if (mode === "signin") {
      const { data, error } = await supabase.auth.signInWithPassword({
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
      const { error: userError } = await supabase.from("users").upsert({
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

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-[2rem] border border-zinc-200 bg-white p-4 shadow-sm"
    >
      <div className="mb-5 flex rounded-full bg-zinc-100 p-1">
        {(["signin", "signup"] as const).map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => {
              if (loading) return;
              setMode(item);
              setMessage("");
            }}
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

        <input
          type="password"
          placeholder={mode === "signin" ? "Password" : "Create password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete={mode === "signin" ? "current-password" : "new-password"}
          className="h-12 w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 text-sm font-semibold text-zinc-950 outline-none transition placeholder:text-zinc-400 focus:border-green-700 focus:bg-white focus:ring-4 focus:ring-green-100"
        />
      </div>

      {message && (
        <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
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
          : "Create account"}
      </button>
    </form>
  );
}
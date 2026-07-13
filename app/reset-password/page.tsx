"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function ResetPasswordPage() {
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [ready, setReady] = useState(false);
  const [checking, setChecking] = useState(true);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function checkResetSession() {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (error || !session) {
        setReady(false);
        setMessage(
          "Invalid or expired reset link. Please request a new one."
        );
      } else {
        setReady(true);
        setMessage("");
      }

      setChecking(false);
    }

    checkResetSession();
  }, []);

  async function handleReset() {
    if (!ready) {
      setMessage(
        "Reset session not ready. Please request a new reset link."
      );
      return;
    }

    if (password.length < 6) {
      setMessage("Password must be at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setMessage("Passwords do not match.");
      return;
    }

    setLoading(true);
    setMessage("");

    const { error } = await supabase.auth.updateUser({
      password,
    });

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    await supabase.auth.signOut();

    setMessage(
      "Password updated. Please sign in with your new password."
    );
    setLoading(false);

    setTimeout(() => {
      router.push("/auth");
      router.refresh();
    }, 1500);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <h1 className="mb-2 text-center text-xl font-semibold text-gray-900">
          Reset your password
        </h1>

        <p className="mb-5 text-center text-sm text-gray-600">
          Enter your new password below.
        </p>

        <input
          type="password"
          placeholder="New password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          disabled={!ready || checking || loading}
          autoComplete="new-password"
          className="mb-3 w-full rounded-lg border border-gray-300 p-2.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-gray-100"
        />

        <input
          type="password"
          placeholder="Confirm new password"
          value={confirmPassword}
          onChange={(event) =>
            setConfirmPassword(event.target.value)
          }
          disabled={!ready || checking || loading}
          autoComplete="new-password"
          className="mb-3 w-full rounded-lg border border-gray-300 p-2.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-gray-100"
        />

        <button
          type="button"
          onClick={handleReset}
          disabled={checking || loading || !ready}
          className="w-full rounded-lg bg-emerald-600 p-2.5 font-medium text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-gray-300"
        >
          {checking
            ? "Checking link..."
            : loading
              ? "Updating..."
              : "Update password"}
        </button>

        {message && (
          <p className="mt-3 text-center text-sm text-gray-600">
            {message}
          </p>
        )}
      </div>
    </div>
  );
}
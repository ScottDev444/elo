"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function ResetPasswordPage() {
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [ready, setReady] = useState(false);
  const [checking, setChecking] = useState(true);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function setupResetSession() {
      const hash = window.location.hash;

      if (!hash.includes("access_token")) {
        setMessage("Invalid or expired reset link. Please request a new one.");
        setChecking(false);
        return;
      }

      const params = new URLSearchParams(hash.substring(1));
      const access_token = params.get("access_token");
      const refresh_token = params.get("refresh_token");

      if (!access_token || !refresh_token) {
        setMessage("Invalid or expired reset link. Please request a new one.");
        setChecking(false);
        return;
      }

      const { error } = await supabase.auth.setSession({
        access_token,
        refresh_token,
      });

      if (error) {
        setMessage("Reset link expired or invalid. Please request a new one.");
        setReady(false);
      } else {
        setReady(true);
        setMessage("");
      }

      setChecking(false);
    }

    setupResetSession();
  }, [supabase]);

  const handleReset = async () => {
    if (!ready) {
      setMessage("Reset session not ready. Please request a new reset link.");
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

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    await supabase.auth.signOut();

    setMessage("Password updated! Please sign in with your new password.");
    setLoading(false);

    setTimeout(() => router.push("/auth"), 1500);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
        <h1 className="text-xl font-semibold text-gray-900 mb-2 text-center">
          Reset your password
        </h1>

        <p className="text-sm text-gray-600 text-center mb-5">
          Enter your new password below.
        </p>

        <input
          type="password"
          placeholder="New password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full p-2.5 border border-gray-300 rounded-lg mb-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />

        <input
          type="password"
          placeholder="Confirm new password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="w-full p-2.5 border border-gray-300 rounded-lg mb-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        />

        <button
          onClick={handleReset}
          disabled={checking || loading || !ready}
          className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white p-2.5 rounded-lg font-medium transition"
        >
          {checking ? "Checking link..." : loading ? "Updating..." : "Update password"}
        </button>

        {message && (
          <p className="mt-3 text-sm text-center text-gray-600">
            {message}
          </p>
        )}
      </div>
    </div>
  );
}
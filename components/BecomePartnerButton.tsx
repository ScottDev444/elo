"use client";

import { useState } from "react";
import { ArrowRight } from "lucide-react";

export default function BecomePartnerButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleClick() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/partner-checkout", {
        method: "POST",
      });

      const text = await response.text();
      const data = text ? JSON.parse(text) : null;

      if (!response.ok || !data?.url) {
        setError(data?.error || text || "Could not start checkout.");
        return;
      }

      window.location.href = data.url;
    } catch (error: any) {
      setError(error.message || "Could not start checkout.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        onClick={handleClick}
        disabled={loading}
        className="mt-8 inline-flex items-center gap-2 rounded-full bg-emerald-600 px-6 py-4 text-lg font-black text-white transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {loading ? "Opening checkout..." : "Become a Local Partner"}
        <ArrowRight size={18} />
      </button>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
    </div>
  );
}
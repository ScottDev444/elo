"use client";

import { useEffect, useState } from "react";
import { CalendarDays, Check } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function SavePostButton({
  postId,
  brandColor,
}: {
  postId: string;
  brandColor: string;
}) {
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function checkSaved() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        return;
      }

      setUserId(user.id);

      const { data } = await supabase
        .from("saved")
        .select("id")
        .eq("user_id", user.id)
        .eq("post_id", postId)
        .maybeSingle();

      setSaved(!!data);
      setLoading(false);
    }

    checkSaved();
  }, [postId]);

  async function handleToggle() {
    if (!userId) return;

    setLoading(true);
    setMessage("");

    if (saved) {
      const { error } = await supabase
        .from("saved")
        .delete()
        .eq("user_id", userId)
        .eq("post_id", postId);

      if (error) setMessage(error.message);
      else {
        setSaved(false);
        setMessage("Removed from your calendar.");
      }
    } else {
      const { error } = await supabase.from("saved").upsert(
        { user_id: userId, post_id: postId },
        { onConflict: "user_id,post_id" }
      );

      if (error) setMessage(error.message);
      else {
        setSaved(true);
        setMessage("Added to your calendar.");
      }
    }

    setLoading(false);
  }

  return (
    <div>
      <button
        onClick={handleToggle}
        disabled={loading}
        className="inline-flex w-full items-center justify-center gap-2 rounded-2xl px-5 py-4 text-sm font-black text-white transition disabled:opacity-70"
        style={{ backgroundColor: saved ? "#16a34a" : brandColor }}
      >
        {saved ? <Check size={18} /> : <CalendarDays size={18} />}
        {loading
          ? "Checking..."
          : saved
            ? "Remove from my calendar"
            : "Add to my calendar"}
      </button>

      {message && (
        <p className="mt-2 text-center text-xs font-semibold text-neutral-500">
          {message}
        </p>
      )}
    </div>
  );
}
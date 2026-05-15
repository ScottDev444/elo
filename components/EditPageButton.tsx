"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function EditPageButton({
  slug,
  groupUserId,
}: {
  slug: string;
  groupUserId?: string | null;
}) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    async function checkOwner() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      setShow(user?.id === groupUserId);
    }

    checkOwner();
  }, [groupUserId]);

  if (!show) return null;

  return (
    <div className="flex justify-end">
      <Link
        href={`/${slug}/edit`}
        className="rounded-full bg-black px-5 py-2.5 text-sm font-black text-white shadow-sm"
      >
        Edit Page
      </Link>
    </div>
  );
}
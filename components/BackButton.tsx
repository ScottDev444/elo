"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";

export default function BackButton() {
  const router = useRouter();

  return (
    <button
      onClick={() => router.back()}
      className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-neutral-500 transition hover:text-black"
    >
      <ChevronLeft size={18} />
      Back
    </button>
  );
}
import Link from "next/link";
import { ChevronRight } from "lucide-react";

type PostCardProps = {
  id: string;
  title: string;
  pageName: string;
  imageUrl?: string | null;
  timeLabel?: string;
  type?: string;
  deal_price?: string | number | null;
  isLocalPartner?: boolean;
};

export default function PostCard({
  id,
  title,
  pageName,
  imageUrl,
  timeLabel,
  type,
  deal_price,
  isLocalPartner,
}: PostCardProps) {
  const dealLabel =
    String(type).toLowerCase() === "deal" && deal_price
      ? String(deal_price)
      : null;

  return (
    <Link href={`/posts/${id}`}>
      <article className="flex items-center justify-between gap-3 border-b border-neutral-100 py-4 transition-opacity hover:opacity-80 md:gap-5 md:py-5">
        <div className="flex items-center gap-3 md:gap-5">
          <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl bg-neutral-100 md:h-24 md:w-24">
            {imageUrl && (
              <img src={imageUrl} alt="" className="h-full w-full object-cover" />
            )}
          </div>

          <div className="flex flex-col justify-center">
            {timeLabel && (
              <p className="mb-1 text-xs font-medium text-neutral-400 md:text-sm">
                {timeLabel}
              </p>
            )}

            <p className="text-sm font-semibold leading-tight text-black md:text-lg">
              {title}
            </p>

            <div className="mt-1 flex items-center gap-2">
              <p className="text-xs text-neutral-500 md:text-sm">
                {pageName}
              </p>

              {isLocalPartner && (
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-emerald-700 md:text-[11px]">
                  LP
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          {dealLabel && (
            <div className="rounded-full bg-emerald-500 px-3 py-1 text-xs font-black text-white shadow-sm md:text-sm">
              {dealLabel}
            </div>
          )}

          <ChevronRight size={22} className="text-neutral-400" />
        </div>
      </article>
    </Link>
  );
}
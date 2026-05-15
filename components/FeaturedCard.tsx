import Link from "next/link";
import { ChevronRight } from "lucide-react";

type FeaturedCardProps = {
  id: string;
  title: string;
  pageName: string;
  imageUrl?: string | null;
  timeLabel?: string;
};

export default function FeaturedCard({
  id,
  title,
  pageName,
  imageUrl,
  timeLabel,
}: FeaturedCardProps) {
  return (
    <Link href={`/posts/${id}`}>
      <article className="flex items-center justify-between gap-3 rounded-2xl border border-emerald-100 bg-emerald-50/40 py-4 pl-4 pr-3 transition-opacity hover:opacity-80 md:gap-5 md:py-5">
        <div className="flex items-center gap-3 md:gap-5">
          <div className="h-16 w-16 shrink-0 overflow-hidden rounded-2xl bg-neutral-100 md:h-24 md:w-24">
            {imageUrl && (
              <img
                src={imageUrl}
                alt=""
                className="h-full w-full object-cover"
              />
            )}
          </div>

          <div className="flex flex-col justify-center">
            {timeLabel && (
              <p className="mb-1 text-xs font-medium text-emerald-600 md:text-sm">
                {timeLabel}
              </p>
            )}

            <p className="text-sm font-semibold leading-tight text-black md:text-lg">
              {title}
            </p>

            <p className="mt-1 text-xs text-neutral-500 md:text-sm">
              {pageName}
            </p>
          </div>
        </div>

        <ChevronRight
          size={22}
          className="shrink-0 text-neutral-400"
        />
      </article>
    </Link>
  );
}
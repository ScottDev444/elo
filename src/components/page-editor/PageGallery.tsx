"use client";

import {
  ArrowLeft,
  ArrowRight,
  ImagePlus,
  Trash2,
  Upload,
} from "lucide-react";
import {
  type ChangeEvent,
  type DragEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

export type PageGalleryImage = {
  id: string;
  url: string;
  file?: File;
};

type PageGalleryProps = {
  isLocalPartner: boolean;
  images: PageGalleryImage[];
  onImagesChange: (images: PageGalleryImage[]) => void;
};

const IMAGE_LIMIT = 5;
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

function getImageClass(imageCount: number, index: number) {
  if (imageCount === 1) {
    return "col-span-2 row-span-2 sm:col-span-4";
  }

  if (imageCount === 2) {
    return "row-span-2 sm:col-span-2";
  }

  if (imageCount === 3) {
    return index === 0
      ? "col-span-2 row-span-2 sm:col-span-2"
      : "col-span-1 row-span-1 sm:col-span-2";
  }

  if (imageCount === 4) {
    return "col-span-1 row-span-1 sm:col-span-2";
  }

  return index === 0
    ? "col-span-2 row-span-2 sm:col-span-2"
    : "col-span-1 row-span-1";
}

export default function PageGallery({
  isLocalPartner,
  images,
  onImagesChange,
}: PageGalleryProps) {
  void isLocalPartner;

  const inputRef = useRef<HTMLInputElement | null>(null);
  const objectUrlsRef = useRef<Set<string>>(new Set());
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  const remainingSlots = Math.max(IMAGE_LIMIT - images.length, 0);
  const countLabel = useMemo(
    () => `${images.length}/${IMAGE_LIMIT} images`,
    [images.length],
  );

  useEffect(() => {
    const objectUrls = objectUrlsRef.current;

    return () => {
      objectUrls.forEach((url) => URL.revokeObjectURL(url));
      objectUrls.clear();
    };
  }, []);

  function createGalleryImages(files: File[]) {
    return files.map<PageGalleryImage>((file) => {
      const url = URL.createObjectURL(file);
      objectUrlsRef.current.add(url);

      return {
        id: crypto.randomUUID(),
        url,
        file,
      };
    });
  }

  function addFiles(fileList: FileList | null) {
    if (!fileList || remainingSlots === 0) {
      return;
    }

    const validFiles = Array.from(fileList)
      .filter((file) => ACCEPTED_IMAGE_TYPES.includes(file.type))
      .slice(0, remainingSlots);

    if (validFiles.length === 0) {
      return;
    }

    onImagesChange([...images, ...createGalleryImages(validFiles)]);
  }

  function handleFileInput(event: ChangeEvent<HTMLInputElement>) {
    addFiles(event.target.files);
    event.target.value = "";
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDraggingOver(false);
    addFiles(event.dataTransfer.files);
  }

  function removeImage(imageId: string) {
    const image = images.find((item) => item.id === imageId);

    if (image?.url.startsWith("blob:")) {
      URL.revokeObjectURL(image.url);
      objectUrlsRef.current.delete(image.url);
    }

    onImagesChange(images.filter((item) => item.id !== imageId));
  }

  function moveImage(index: number, direction: -1 | 1) {
    const nextIndex = index + direction;

    if (nextIndex < 0 || nextIndex >= images.length) {
      return;
    }

    const nextImages = [...images];
    const [movedImage] = nextImages.splice(index, 1);
    nextImages.splice(nextIndex, 0, movedImage);
    onImagesChange(nextImages);
  }

  return (
    <section className="border-b border-black/10 bg-white text-black">
      <div className="w-full px-4 py-12 sm:px-7 lg:px-10 lg:py-16">
        <div className="flex items-end justify-between gap-5">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700">
              Your Page
            </p>

            <h2 className="mt-3 text-3xl font-black tracking-[-0.045em] sm:text-4xl">
              Gallery
            </h2>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-black/55 sm:text-base">
              Add up to five images. They will automatically form a collage.
            </p>
          </div>

          <p className="shrink-0 text-sm font-black text-black/40">
            {countLabel}
          </p>
        </div>

        {images.length > 0 ? (
          <div className="mt-8 overflow-hidden rounded-[1.5rem] bg-black/[0.04]">
            <div className="grid h-[28rem] grid-cols-2 grid-rows-2 gap-1 sm:h-[36rem] sm:grid-cols-4">
              {images.map((image, index) => (
                <article
                  key={image.id}
                  className={`group relative min-h-0 overflow-hidden ${getImageClass(
                    images.length,
                    index,
                  )}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={image.url}
                    alt=""
                    className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.025]"
                  />

                  <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-gradient-to-t from-black/70 via-black/25 to-transparent p-3 pt-12 opacity-100 sm:opacity-0 sm:transition sm:group-hover:opacity-100">
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => moveImage(index, -1)}
                        disabled={index === 0}
                        aria-label="Move image left"
                        className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/95 text-black shadow-sm transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-35"
                      >
                        <ArrowLeft className="h-4 w-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => moveImage(index, 1)}
                        disabled={index === images.length - 1}
                        aria-label="Move image right"
                        className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/95 text-black shadow-sm transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-35"
                      >
                        <ArrowRight className="h-4 w-4" />
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeImage(image.id)}
                      aria-label="Remove image"
                      className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/95 text-red-700 shadow-sm transition hover:bg-white"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </div>
        ) : (
          <div className="mt-8 flex min-h-72 items-center justify-center rounded-[1.5rem] border border-black/10 bg-black/[0.025] px-6 text-center">
            <div>
              <ImagePlus className="mx-auto h-10 w-10 text-black/20" />
              <p className="mt-4 text-sm font-bold text-black/45">
                Your collage will appear here.
              </p>
            </div>
          </div>
        )}

        <div
          onDragEnter={(event) => {
            event.preventDefault();
            setIsDraggingOver(true);
          }}
          onDragOver={(event) => {
            event.preventDefault();
            setIsDraggingOver(true);
          }}
          onDragLeave={(event) => {
            if (event.currentTarget.contains(event.relatedTarget as Node)) {
              return;
            }

            setIsDraggingOver(false);
          }}
          onDrop={handleDrop}
          className={`mt-5 flex flex-col items-center justify-between gap-4 rounded-2xl border-2 border-dashed px-5 py-5 text-center transition sm:flex-row sm:text-left ${
            isDraggingOver
              ? "border-emerald-700 bg-emerald-50"
              : "border-black/15 bg-black/[0.02]"
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800">
              <Upload className="h-5 w-5" />
            </div>

            <div>
              <p className="text-sm font-black">
                {remainingSlots > 0
                  ? `Add ${remainingSlots} more ${remainingSlots === 1 ? "image" : "images"}`
                  : "Gallery complete"}
              </p>
              <p className="mt-0.5 text-xs leading-5 text-black/45">
                JPG, PNG or WebP. Drag and drop also works.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={remainingSlots === 0}
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-black px-5 text-sm font-black text-white transition hover:bg-black/80 disabled:cursor-not-allowed disabled:opacity-35 sm:w-auto"
          >
            <ImagePlus className="h-4 w-4" />
            Choose images
          </button>

          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            onChange={handleFileInput}
            className="sr-only"
          />
        </div>
      </div>
    </section>
  );
}
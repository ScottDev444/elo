"use client";

import {
  ArrowUpRight,
  Globe2,
  ImagePlus,
  Megaphone,
  Palette,
  Upload,
} from "lucide-react";
import { motion } from "motion/react";
import { FaFacebookF, FaInstagram } from "react-icons/fa";
import {
  type ChangeEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

type PageBasicsProps = {
  isLocalPartner?: boolean;
  brandColour?: string;
  logoUrl?: string | null;
  pageName?: string;
  about?: string;
  description?: string;
  website?: string;
  facebook?: string;
  instagram?: string;
  featuredText?: string;

  onBrandColourChange: (value: string) => void;
  onLogoChange: (file: File | null) => void;
  onPageNameChange: (value: string) => void;
  onAboutChange: (value: string) => void;
  onWebsiteChange: (value: string) => void;
  onFacebookChange: (value: string) => void;
  onInstagramChange: (value: string) => void;
  onFeaturedTextChange: (value: string) => void;
};

function normaliseColour(value?: string | null) {
  return /^#[0-9a-fA-F]{6}$/.test(value ?? "") ? value! : "#6b7280";
}

function getReadableTextColour(hex: string) {
  const clean = hex.replace("#", "");
  const red = Number.parseInt(clean.slice(0, 2), 16);
  const green = Number.parseInt(clean.slice(2, 4), 16);
  const blue = Number.parseInt(clean.slice(4, 6), 16);
  const luminance = (0.299 * red + 0.587 * green + 0.114 * blue) / 255;

  return luminance > 0.64 ? "#111111" : "#ffffff";
}


function mixColour(hex: string, target: "black" | "white", amount: number) {
  const clean = hex.replace("#", "");
  const red = Number.parseInt(clean.slice(0, 2), 16);
  const green = Number.parseInt(clean.slice(2, 4), 16);
  const blue = Number.parseInt(clean.slice(4, 6), 16);
  const targetValue = target === "white" ? 255 : 0;

  const mix = (channel: number) =>
    Math.round(channel + (targetValue - channel) * amount)
      .toString(16)
      .padStart(2, "0");

  return `#${mix(red)}${mix(green)}${mix(blue)}`;
}

function cleanPageName(value: string) {
  return value.replace(/[\r\n]+/g, " ").replace(/\s{2,}/g, " ").slice(0, 80);
}

function getSocialHandle(value: string, platform: "facebook" | "instagram") {
  return value
    .trim()
    .replace(/^https?:\/\/(?:www\.)?/i, "")
    .replace(new RegExp(`^(?:${platform}\.com|fb\.com)\/`, "i"), "")
    .replace(/^@+/, "")
    .replace(/[?#].*$/, "")
    .replace(/\/+$/, "");
}

function buildSocialUrl(handle: string, platform: "facebook" | "instagram") {
  const cleanHandle = getSocialHandle(handle, platform);
  return cleanHandle ? `https://${platform}.com/${cleanHandle}` : "";
}

function toHref(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return "";
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  return `https://${trimmed}`;
}

export default function PageBasics({
  isLocalPartner = false,
  brandColour,
  logoUrl = null,
  pageName = "",
  about,
  description,
  website = "",
  facebook = "",
  instagram = "",
  featuredText = "",
  onBrandColourChange,
  onLogoChange,
  onPageNameChange,
  onAboutChange,
  onWebsiteChange,
  onFacebookChange,
  onInstagramChange,
  onFeaturedTextChange,
}: PageBasicsProps) {
  const colourInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const aboutInputRef = useRef<HTMLTextAreaElement>(null);
  const [localLogoPreview, setLocalLogoPreview] = useState<string | null>(null);

  const safeBrandColour = normaliseColour(brandColour);
  const coverTextColour = getReadableTextColour(safeBrandColour);
  const polygonColours = {
    light: mixColour(safeBrandColour, "white", 0.2),
    bright: mixColour(safeBrandColour, "white", 0.1),
    base: safeBrandColour,
    dark: mixColour(safeBrandColour, "black", 0.18),
    deeper: mixColour(safeBrandColour, "black", 0.34),
    deepest: mixColour(safeBrandColour, "black", 0.48),
  };
  const safeAbout = about ?? description ?? "";
  const previewLogo = useMemo(
    () => localLogoPreview || logoUrl,
    [localLogoPreview, logoUrl],
  );

  const websiteHref = toHref(website);
  const facebookHandle = getSocialHandle(facebook, "facebook");
  const instagramHandle = getSocialHandle(instagram, "instagram");
  const facebookHref = buildSocialUrl(facebookHandle, "facebook");
  const instagramHref = buildSocialUrl(instagramHandle, "instagram");

  useEffect(() => {
    return () => {
      if (localLogoPreview?.startsWith("blob:")) {
        URL.revokeObjectURL(localLogoPreview);
      }
    };
  }, [localLogoPreview]);

  useEffect(() => {
    const textarea = aboutInputRef.current;

    if (!textarea) {
      return;
    }

    textarea.style.height = "0px";
    textarea.style.height = `${textarea.scrollHeight}px`;
  }, [safeAbout]);

  function resizeAboutTextarea(textarea: HTMLTextAreaElement) {
    textarea.style.height = "0px";
    textarea.style.height = `${textarea.scrollHeight}px`;
  }

  function handleLogoChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;

    if (localLogoPreview?.startsWith("blob:")) {
      URL.revokeObjectURL(localLogoPreview);
    }

    if (!file) {
      setLocalLogoPreview(null);
      onLogoChange(null);
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    setLocalLogoPreview(previewUrl);
    onLogoChange(file);
  }

  return (
    <section className="overflow-hidden bg-[#f4f5f1] text-[#151515]">
      <input
        ref={colourInputRef}
        type="color"
        value={safeBrandColour}
        onChange={(event) => onBrandColourChange(event.target.value)}
        className="sr-only"
        aria-label="Choose brand colour"
      />

      <input
        ref={logoInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleLogoChange}
        className="sr-only"
        aria-label="Choose page logo"
      />

      {isLocalPartner ? (
        <div
          className="relative isolate overflow-hidden text-white"
          style={{ backgroundColor: polygonColours.dark }}
        >
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <motion.svg
              className="absolute inset-0 h-full w-full opacity-45"
              viewBox="0 0 1440 240"
              preserveAspectRatio="xMidYMid slice"
              aria-hidden="true"
              initial={{ scale: 1.04, x: 0, y: 0 }}
              animate={{
                scale: [1.04, 1.07, 1.04],
                x: [0, -10, 0],
                y: [0, -6, 0],
              }}
              transition={{
                duration: 40,
                ease: "easeInOut",
                repeat: Infinity,
              }}
            >
              <polygon points="0,0 260,0 150,90 0,140" fill={polygonColours.bright} />
              <polygon points="260,0 500,0 370,82 150,90" fill={polygonColours.base} />
              <polygon points="500,0 760,0 650,105 370,82" fill={polygonColours.dark} />
              <polygon points="760,0 1020,0 890,90 650,105" fill={polygonColours.light} />
              <polygon points="1020,0 1250,0 1160,82 890,90" fill={polygonColours.base} />
              <polygon points="1250,0 1440,0 1440,105 1160,82" fill={polygonColours.bright} />

              <polygon points="0,140 150,90 370,82 260,190 0,175" fill={polygonColours.deeper} />
              <polygon points="370,82 650,105 510,198 260,190" fill={polygonColours.bright} />
              <polygon points="650,105 890,90 780,205 510,198" fill={polygonColours.deepest} />
              <polygon points="890,90 1160,82 1050,192 780,205" fill={polygonColours.dark} />
              <polygon points="1160,82 1440,105 1440,195 1050,192" fill={polygonColours.deeper} />

              <polygon points="0,175 260,190 185,240 0,240" fill={polygonColours.base} />
              <polygon points="260,190 510,198 430,240 185,240" fill={polygonColours.dark} />
              <polygon points="510,198 780,205 700,240 430,240" fill={polygonColours.deeper} />
              <polygon points="780,205 1050,192 970,240 700,240" fill={polygonColours.bright} />
              <polygon points="1050,192 1440,195 1440,240 970,240" fill={polygonColours.dark} />

              <g fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="2">
                <polyline points="0,140 150,90 370,82 650,105 890,90 1160,82 1440,105" />
                <polyline points="0,175 260,190 510,198 780,205 1050,192 1440,195" />
              </g>
            </motion.svg>

            <div
              className="absolute inset-0"
              style={{
                background: `linear-gradient(to bottom, ${mixColour(safeBrandColour, "black", 0.08)}33, ${mixColour(safeBrandColour, "black", 0.28)}70)`,
              }}
            />

            <motion.div
              className="absolute -left-[40%] top-0 h-full w-[35%] skew-x-[-18deg] bg-gradient-to-r from-transparent via-white/15 to-transparent blur-2xl"
              animate={{ x: ["0%", "450%"] }}
              transition={{
                duration: 3,
                delay: 5,
                repeat: Infinity,
                repeatDelay: 14,
                ease: "easeInOut",
              }}
            />
          </div>

          <div className="relative z-10 overflow-hidden">
            <motion.div
              className="flex w-max items-center py-2.5"
              animate={{ x: ["0%", "-50%"] }}
              transition={{ duration: 24, ease: "linear", repeat: Infinity }}
            >
              {Array.from({ length: 10 }).map((_, index) => (
                <span
                  key={index}
                  className="flex items-center gap-3 whitespace-nowrap px-5 text-[11px] font-black uppercase tracking-[0.16em]"
                >
                  <Megaphone className="h-3.5 w-3.5" />
                  {featuredText.trim() || "Add your featured message"}
                </span>
              ))}
            </motion.div>

            <input
              type="text"
              value={featuredText}
              onChange={(event) => onFeaturedTextChange(event.target.value)}
              maxLength={120}
              placeholder="Tap here to edit your featured message"
              className="w-full border-t border-white/15 bg-black/15 px-4 py-2.5 text-center text-xs font-bold text-white outline-none backdrop-blur-sm placeholder:text-white/50 sm:text-sm"
            />
          </div>
        </div>
      ) : null}

      <div className="w-full bg-white">
        <div
          className="relative h-52 overflow-hidden sm:h-64 lg:h-72"
          style={{ backgroundColor: safeBrandColour, color: coverTextColour }}
        >
          <div
            className="absolute inset-0"
            style={{ backgroundColor: safeBrandColour }}
          />

          <button
            type="button"
            onClick={() => colourInputRef.current?.click()}
            className="absolute right-4 top-4 z-20 inline-flex h-11 items-center gap-2 rounded-xl border border-white/20 bg-black/30 px-4 text-xs font-black text-white backdrop-blur-md transition hover:bg-black/45 sm:right-6 sm:top-6"
            aria-label="Change brand colour"
          >
            <Palette className="h-4 w-4" />
            Brand colour
          </button>
        </div>

        <div className="relative mx-auto w-full max-w-7xl px-4 pb-6 sm:px-7 sm:pb-7 lg:px-10 lg:pb-8">
          <div className="flex items-end justify-between gap-4">
            <button
              type="button"
              onClick={() => logoInputRef.current?.click()}
              className="group/logo relative -mt-14 flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-[1.75rem] border-[5px] border-white bg-[#eef0eb] shadow-lg sm:-mt-16 sm:h-32 sm:w-32"
              aria-label="Change page logo"
            >
              {previewLogo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={previewLogo}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <ImagePlus className="h-8 w-8 text-black/30" />
              )}

              <span className="absolute inset-0 flex items-center justify-center bg-black/55 text-white opacity-0 transition group-hover/logo:opacity-100">
                <Upload className="h-5 w-5" />
              </span>
            </button>

            {websiteHref ? (
              <a
                href={websiteHref}
                target="_blank"
                rel="noreferrer"
                className="mb-1 inline-flex h-11 shrink-0 items-center gap-2 rounded-xl px-4 text-sm font-black text-white transition hover:brightness-95 sm:h-12 sm:px-5"
                style={{ backgroundColor: safeBrandColour }}
              >
                <span className="hidden sm:inline">Visit website</span>
                <span className="sm:hidden">Website</span>
                <ArrowUpRight className="h-4 w-4" />
              </a>
            ) : null}
          </div>

          <div className="mt-4 max-w-4xl lg:mt-3">
            <textarea
              value={pageName}
              onChange={(event) => onPageNameChange(cleanPageName(event.target.value))}
              rows={2}
              maxLength={80}
              spellCheck={false}
              placeholder="Your page name"
              className="block max-h-[2.3em] min-h-[1.1em] w-full resize-none overflow-hidden border-0 bg-transparent p-0 text-[clamp(2rem,6vw,3.8rem)] font-black leading-[0.96] tracking-[-0.055em] outline-none placeholder:text-black/20"
            />

            <textarea
              ref={aboutInputRef}
              value={safeAbout}
              onChange={(event) => {
                onAboutChange(event.target.value);
                resizeAboutTextarea(event.currentTarget);
              }}
              rows={1}
              placeholder="Tell people who you are, what you do and why they should visit."
              className="mt-3 block min-h-8 w-full resize-none overflow-hidden border-0 bg-transparent p-0 text-base font-medium leading-7 text-black/65 outline-none placeholder:text-black/25 sm:text-lg sm:leading-8"
            />
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-2.5">
            {websiteHref ? (
              <a
                href={websiteHref}
                target="_blank"
                rel="noreferrer"
                aria-label="Open website"
                className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-black/10 bg-[#f5f6f2] transition hover:bg-[#eceee8]"
              >
                <Globe2 className="h-5 w-5" />
              </a>
            ) : null}

            {facebookHref ? (
              <a
                href={facebookHref}
                target="_blank"
                rel="noreferrer"
                aria-label="Open Facebook"
                className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-black/10 bg-[#f5f6f2] transition hover:bg-[#eceee8]"
              >
                <FaFacebookF className="h-5 w-5" />
              </a>
            ) : null}

            {instagramHref ? (
              <a
                href={instagramHref}
                target="_blank"
                rel="noreferrer"
                aria-label="Open Instagram"
                className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-black/10 bg-[#f5f6f2] transition hover:bg-[#eceee8]"
              >
                <FaInstagram className="h-5 w-5" />
              </a>
            ) : null}
          </div>
        </div>

        <div className="border-t border-black/8 bg-[#f7f8f5]">
          <div className="mx-auto grid w-full max-w-7xl gap-3 px-4 py-6 sm:px-7 md:grid-cols-3 lg:px-10">
            <label className="block">
              <span className="mb-2 block text-[11px] font-black uppercase tracking-[0.16em] text-black/40">
                Website
              </span>
              <div className="relative">
                <Globe2 className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-black/30" />
                <input
                  type="url"
                  value={website}
                  onChange={(event) => onWebsiteChange(event.target.value)}
                  placeholder="yourwebsite.co.uk"
                  className="h-13 w-full rounded-xl border border-black/10 bg-white py-3.5 pl-12 pr-4 text-sm font-bold outline-none transition focus:border-black/25"
                />
              </div>
            </label>

            <label className="block">
              <span className="mb-2 block text-[11px] font-black uppercase tracking-[0.16em] text-black/40">
                Facebook
              </span>
              <div className="flex h-13 overflow-hidden rounded-xl border border-black/10 bg-white transition focus-within:border-black/25">
                <div className="flex shrink-0 items-center gap-2 border-r border-black/8 bg-black/[0.025] px-4 text-sm font-bold text-black/45">
                  <FaFacebookF className="h-4 w-4" />
                  <span className="hidden sm:inline">facebook.com/</span>
                  <span className="sm:hidden">@</span>
                </div>
                <input
                  type="text"
                  inputMode="text"
                  autoCapitalize="none"
                  autoCorrect="off"
                  value={facebookHandle}
                  onChange={(event) =>
                    onFacebookChange(buildSocialUrl(event.target.value, "facebook"))
                  }
                  placeholder="yourpage"
                  className="min-w-0 flex-1 bg-transparent px-4 text-sm font-bold outline-none"
                />
              </div>
            </label>

            <label className="block">
              <span className="mb-2 block text-[11px] font-black uppercase tracking-[0.16em] text-black/40">
                Instagram
              </span>
              <div className="flex h-13 overflow-hidden rounded-xl border border-black/10 bg-white transition focus-within:border-black/25">
                <div className="flex shrink-0 items-center gap-2 border-r border-black/8 bg-black/[0.025] px-4 text-sm font-bold text-black/45">
                  <FaInstagram className="h-4 w-4" />
                  <span className="hidden sm:inline">instagram.com/</span>
                  <span className="sm:hidden">@</span>
                </div>
                <input
                  type="text"
                  inputMode="text"
                  autoCapitalize="none"
                  autoCorrect="off"
                  value={instagramHandle}
                  onChange={(event) =>
                    onInstagramChange(buildSocialUrl(event.target.value, "instagram"))
                  }
                  placeholder="yourpage"
                  className="min-w-0 flex-1 bg-transparent px-4 text-sm font-bold outline-none"
                />
              </div>
            </label>
          </div>
        </div>
      </div>
    </section>
  );
}
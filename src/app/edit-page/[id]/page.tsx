"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type ComponentType,
  type ReactNode,
} from "react";
import {
  BriefcaseBusiness,
  CalendarDays,
  Car,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Coffee,
  Dumbbell,
  Gift,
  Globe2,
  Hammer,
  Heart,
  House,
  ImagePlus,
  Leaf,
  List,
  LoaderCircle,
  PawPrint,
  Plus,
  Gem,
  Sparkles,
  Trash2,
  Utensils,
  X,
  type LucideProps,
} from "lucide-react";
import { FaFacebook, FaInstagram } from "react-icons/fa";
import {
  useParams,
  useRouter,
} from "next/navigation";

import SiteHeader from "@/components/SiteHeader";
import { createClient } from "@/lib/supabase/client";

const PAGE_IMAGE_BUCKET = "post-images";
const FREE_MAX_IMAGES = 3;
const PARTNER_MAX_IMAGES = 20;
const DEFAULT_BRAND_COLOUR = "#005744";

type MenuIconName =
  | "restaurant-outline"
  | "cafe-outline"
  | "briefcase-outline"
  | "home-outline"
  | "car-outline"
  | "fitness-outline"
  | "heart-outline"
  | "leaf-outline"
  | "gift-outline"
  | "hammer-outline"
  | "paw-outline"
  | "sparkles-outline";

type PartnerMenuItem = {
  id: string;
  title: string;
  description: string;
  price: string;
  icon: MenuIconName;
};

type PartnerFeatures = {
  branded_calendar?: boolean;
  menu_enabled?: boolean;
  menu_title?: string;
  menu_items?: unknown;
};

type PageLayout = {
  socials?: {
    facebook?: string | null;
    instagram?: string | null;
  } | null;
  facebook?: string | null;
  instagram?: string | null;
  partner_features?: PartnerFeatures | null;
  [key: string]: unknown;
};

type PageRow = {
  id: string;
  user_id: string | null;
  name: string;
  description: string | null;
  slug: string | null;
  website: string | null;
  brand_color: string | null;
  logo_url: string | null;
  layout: PageLayout | null;
  showcase_images: unknown;
  status: string | null;
  is_local_partner: boolean | null;
};

type SelectedImage = {
  id: string;
  file: File;
  previewUrl: string;
  mimeType: string;
  extension: string;
};

type MenuIconOption = {
  name: MenuIconName;
  label: string;
  icon: ComponentType<LucideProps>;
};

const MENU_ICON_OPTIONS: MenuIconOption[] = [
  {
    name: "restaurant-outline",
    label: "Food",
    icon: Utensils,
  },
  {
    name: "cafe-outline",
    label: "Drink",
    icon: Coffee,
  },
  {
    name: "briefcase-outline",
    label: "Service",
    icon: BriefcaseBusiness,
  },
  {
    name: "home-outline",
    label: "Home",
    icon: House,
  },
  {
    name: "car-outline",
    label: "Car",
    icon: Car,
  },
  {
    name: "fitness-outline",
    label: "Fitness",
    icon: Dumbbell,
  },
  {
    name: "heart-outline",
    label: "Care",
    icon: Heart,
  },
  {
    name: "leaf-outline",
    label: "Nature",
    icon: Leaf,
  },
  {
    name: "gift-outline",
    label: "Gift",
    icon: Gift,
  },
  {
    name: "hammer-outline",
    label: "Trade",
    icon: Hammer,
  },
  {
    name: "paw-outline",
    label: "Pets",
    icon: PawPrint,
  },
  {
    name: "sparkles-outline",
    label: "Other",
    icon: Sparkles,
  },
];

function makeId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `${Date.now().toString(36)}${Math.random()
    .toString(36)
    .slice(2, 10)}`;
}

function normaliseHex(value: string | null | undefined) {
  const clean = value?.trim();

  if (clean && /^#[0-9A-Fa-f]{6}$/.test(clean)) {
    return clean.toUpperCase();
  }

  return DEFAULT_BRAND_COLOUR;
}

function clamp01(
  value: number
) {
  return Math.max(
    0,
    Math.min(
      1,
      value
    )
  );
}

function hsvToHex(
  hue: number,
  saturation: number,
  value: number
) {
  const h =
    (
      (
        hue % 360
      ) + 360
    ) % 360;

  const s =
    clamp01(
      saturation
    );

  const v =
    clamp01(
      value
    );

  const chroma =
    v * s;

  const section =
    h / 60;

  const x =
    chroma *
    (
      1 -
      Math.abs(
        (
          section % 2
        ) - 1
      )
    );

  let red = 0;
  let green = 0;
  let blue = 0;

  if (
    section >= 0 &&
    section < 1
  ) {
    red = chroma;
    green = x;
  } else if (
    section < 2
  ) {
    red = x;
    green = chroma;
  } else if (
    section < 3
  ) {
    green = chroma;
    blue = x;
  } else if (
    section < 4
  ) {
    green = x;
    blue = chroma;
  } else if (
    section < 5
  ) {
    red = x;
    blue = chroma;
  } else {
    red = chroma;
    blue = x;
  }

  const match =
    v - chroma;

  const toHex = (
    channel: number
  ) =>
    Math.round(
      (
        channel +
        match
      ) * 255
    )
      .toString(16)
      .padStart(
        2,
        "0"
      )
      .toUpperCase();

  return `#${toHex(red)}${toHex(green)}${toHex(blue)}`;
}

function hexToHsv(
  hex: string
) {
  const clean =
    normaliseHex(
      hex
    )
      .replace(
        "#",
        ""
      );

  const red =
    Number.parseInt(
      clean.slice(
        0,
        2
      ),
      16
    ) / 255;

  const green =
    Number.parseInt(
      clean.slice(
        2,
        4
      ),
      16
    ) / 255;

  const blue =
    Number.parseInt(
      clean.slice(
        4,
        6
      ),
      16
    ) / 255;

  const max =
    Math.max(
      red,
      green,
      blue
    );

  const min =
    Math.min(
      red,
      green,
      blue
    );

  const delta =
    max - min;

  let hue = 0;

  if (delta !== 0) {
    if (max === red) {
      hue =
        60 *
        (
          (
            (
              green -
              blue
            ) /
            delta
          ) % 6
        );
    } else if (
      max === green
    ) {
      hue =
        60 *
        (
          (
            blue -
            red
          ) /
          delta +
          2
        );
    } else {
      hue =
        60 *
        (
          (
            red -
            green
          ) /
          delta +
          4
        );
    }
  }

  if (hue < 0) {
    hue += 360;
  }

  return {
    hue,
    saturation:
      max === 0
        ? 0
        : delta / max,
    value:
      max,
  };
}

function getReadableTextColour(hex: string) {
  const clean = normaliseHex(hex).replace("#", "");

  const red = Number.parseInt(clean.slice(0, 2), 16);
  const green = Number.parseInt(clean.slice(2, 4), 16);
  const blue = Number.parseInt(clean.slice(4, 6), 16);

  const luminance =
    (0.299 * red + 0.587 * green + 0.114 * blue) / 255;

  return luminance > 0.62 ? "#111111" : "#FFFFFF";
}

function normaliseHandle(value: string) {
  return value
    .trim()
    .replace(
      /^https?:\/\/(www\.)?(facebook|instagram)\.com\//i,
      ""
    )
    .replace(/^@+/, "")
    .replace(/\/$/, "");
}

function socialUrl(
  platform: "facebook" | "instagram",
  value: string
) {
  const handle = normaliseHandle(value);

  if (!handle) {
    return null;
  }

  return `https://www.${platform}.com/${handle}`;
}

function normaliseUrl(value: string) {
  const clean = value.trim();

  if (!clean) {
    return null;
  }

  return /^https?:\/\//i.test(clean)
    ? clean
    : `https://${clean}`;
}

function normaliseShowcaseImages(
  value: unknown,
  maxImages: number
) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item): string | null => {
      if (typeof item === "string") {
        return item.trim() || null;
      }

      if (
        item &&
        typeof item === "object" &&
        !Array.isArray(item)
      ) {
        const record = item as Record<string, unknown>;

        const possible =
          record.url ??
          record.image_url ??
          record.src ??
          record.publicUrl;

        return typeof possible === "string"
          ? possible.trim() || null
          : null;
      }

      return null;
    })
    .filter((value): value is string => Boolean(value))
    .slice(0, maxImages);
}

function isMenuIcon(value: unknown): value is MenuIconName {
  return MENU_ICON_OPTIONS.some(
    (option) => option.name === value
  );
}

function normaliseMenuItems(value: unknown): PartnerMenuItem[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item): PartnerMenuItem | null => {
      if (
        !item ||
        typeof item !== "object" ||
        Array.isArray(item)
      ) {
        return null;
      }

      const row = item as Record<string, unknown>;

      return {
        id:
          typeof row.id === "string" && row.id
            ? row.id
            : makeId(),
        title:
          typeof row.title === "string"
            ? row.title
            : "",
        description:
          typeof row.description === "string"
            ? row.description
            : "",
        price:
          typeof row.price === "string"
            ? row.price
            : "",
        icon: isMenuIcon(row.icon)
          ? row.icon
          : "briefcase-outline",
      };
    })
    .filter((item): item is PartnerMenuItem => Boolean(item));
}

function storagePathFromPublicUrl(url: string) {
  const marker =
    `/storage/v1/object/public/${PAGE_IMAGE_BUCKET}/`;

  const index = url.indexOf(marker);

  if (index === -1) {
    return null;
  }

  try {
    return decodeURIComponent(
      url.slice(index + marker.length)
    );
  } catch {
    return url.slice(index + marker.length);
  }
}

function fileExtension(file: File) {
  const fromName = file.name
    .split(".")
    .pop()
    ?.toLowerCase()
    .replace(/[^a-z0-9]/g, "");

  if (
    fromName === "png" ||
    fromName === "webp" ||
    fromName === "jpg"
  ) {
    return fromName;
  }

  if (fromName === "jpeg") {
    return "jpg";
  }

  if (file.type === "image/png") {
    return "png";
  }

  if (file.type === "image/webp") {
    return "webp";
  }

  return "jpg";
}

function FieldLabel({
  children,
  optional = false,
}: {
  children: ReactNode;
  optional?: boolean;
}) {
  return (
    <div className="elo-edit-page-label-row">
      <label>{children}</label>

      {optional && <span>OPTIONAL</span>}
    </div>
  );
}

function BrandColourPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (
    colour: string
  ) => void;
}) {
  const initial =
    useMemo(
      () =>
        hexToHsv(
          value
        ),
      []
    );

  const [
    hue,
    setHue,
  ] =
    useState(
      initial.hue
    );

  const [
    saturation,
    setSaturation,
  ] =
    useState(
      initial.saturation
    );

  const [
    brightness,
    setBrightness,
  ] =
    useState(
      initial.value
    );

  const [
    draggingPanel,
    setDraggingPanel,
  ] =
    useState(false);

  const [
    draggingHue,
    setDraggingHue,
  ] =
    useState(false);

  const panelRef =
    useRef<HTMLDivElement | null>(
      null
    );

  const hueRef =
    useRef<HTMLDivElement | null>(
      null
    );

  const hueColour =
    hsvToHex(
      hue,
      1,
      1
    );

  function selectPanelColour(
    clientX: number,
    clientY: number
  ) {
    const element =
      panelRef.current;

    if (!element) {
      return;
    }

    const rect =
      element
        .getBoundingClientRect();

    const nextSaturation =
      clamp01(
        (
          clientX -
          rect.left
        ) /
        Math.max(
          1,
          rect.width
        )
      );

    const nextBrightness =
      1 -
      clamp01(
        (
          clientY -
          rect.top
        ) /
        Math.max(
          1,
          rect.height
        )
      );

    setSaturation(
      nextSaturation
    );

    setBrightness(
      nextBrightness
    );

    onChange(
      hsvToHex(
        hue,
        nextSaturation,
        nextBrightness
      )
    );
  }

  function selectHue(
    clientX: number
  ) {
    const element =
      hueRef.current;

    if (!element) {
      return;
    }

    const rect =
      element
        .getBoundingClientRect();

    const nextHue =
      clamp01(
        (
          clientX -
          rect.left
        ) /
        Math.max(
          1,
          rect.width
        )
      ) * 360;

    setHue(
      nextHue
    );

    onChange(
      hsvToHex(
        nextHue,
        saturation,
        brightness
      )
    );
  }

  return (
    <div className="elo-edit-page-colour-picker-card">
      <div
        ref={panelRef}
        className="elo-edit-page-colour-panel"
        style={{
          backgroundColor:
            hueColour,
        }}
        onPointerDown={(event) => {
          event.currentTarget
            .setPointerCapture(
              event.pointerId
            );

          setDraggingPanel(
            true
          );

          selectPanelColour(
            event.clientX,
            event.clientY
          );
        }}
        onPointerMove={(event) => {
          if (
            !draggingPanel
          ) {
            return;
          }

          selectPanelColour(
            event.clientX,
            event.clientY
          );
        }}
        onPointerUp={(event) => {
          setDraggingPanel(
            false
          );

          try {
            event.currentTarget
              .releasePointerCapture(
                event.pointerId
              );
          } catch {}
        }}
        onPointerCancel={() =>
          setDraggingPanel(
            false
          )
        }
      >
        <div className="elo-edit-page-colour-panel-white" />
        <div className="elo-edit-page-colour-panel-black" />

        <span
          className="elo-edit-page-colour-panel-thumb"
          style={{
            left: `${saturation * 100}%`,
            top: `${(1 - brightness) * 100}%`,
            backgroundColor:
              hsvToHex(
                hue,
                saturation,
                brightness
              ),
          }}
        />
      </div>

      <div
        ref={hueRef}
        className="elo-edit-page-hue-track"
        onPointerDown={(event) => {
          event.currentTarget
            .setPointerCapture(
              event.pointerId
            );

          setDraggingHue(
            true
          );

          selectHue(
            event.clientX
          );
        }}
        onPointerMove={(event) => {
          if (
            !draggingHue
          ) {
            return;
          }

          selectHue(
            event.clientX
          );
        }}
        onPointerUp={(event) => {
          setDraggingHue(
            false
          );

          try {
            event.currentTarget
              .releasePointerCapture(
                event.pointerId
              );
          } catch {}
        }}
        onPointerCancel={() =>
          setDraggingHue(
            false
          )
        }
      >
        <span
          className="elo-edit-page-hue-thumb"
          style={{
            left: `${(hue / 360) * 100}%`,
            backgroundColor:
              hueColour,
          }}
        />
      </div>

      <div className="elo-edit-page-selected-colour-row">
        <span
          className="elo-edit-page-selected-colour-swatch"
          style={{
            backgroundColor:
              normaliseHex(
                value
              ),
          }}
        />

        <span className="elo-edit-page-selected-colour-text">
          Drag to choose your Page colour
        </span>

        <strong>
          {normaliseHex(
            value
          )}
        </strong>
      </div>
    </div>
  );
}

function PreviewHero({
  name,
  logoUrl,
  brandColour,
  isPartner,
}: {
  name: string;
  logoUrl: string;
  brandColour: string;
  isPartner: boolean;
}) {
  const textColour =
    getReadableTextColour(brandColour);

  return (
    <div
      className="elo-edit-page-preview"
      style={{
        backgroundColor: brandColour,
      }}
    >
      <svg
        className="elo-edit-page-preview-shards"
        viewBox="0 0 400 190"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <polygon points="0,0 108,0 65,82 0,109" fill="#FFFFFF" fillOpacity=".08" />
        <polygon points="108,0 228,0 167,76 65,82" fill="#000000" fillOpacity=".07" />
        <polygon points="228,0 330,0 279,94 167,76" fill="#FFFFFF" fillOpacity=".11" />
        <polygon points="330,0 400,0 400,81 279,94" fill="#000000" fillOpacity=".08" />
        <polygon points="0,109 65,82 130,190 0,190" fill="#000000" fillOpacity=".05" />
        <polygon points="65,82 167,76 220,190 130,190" fill="#FFFFFF" fillOpacity=".07" />
        <polygon points="167,76 279,94 322,190 220,190" fill="#000000" fillOpacity=".09" />
        <polygon points="279,94 400,81 400,190 322,190" fill="#FFFFFF" fillOpacity=".08" />
      </svg>

      <div className="elo-edit-page-preview-share">↗</div>

      {logoUrl && (
        <div className="elo-edit-page-preview-logo-outer">
          <div className="elo-edit-page-preview-logo-inner">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logoUrl} alt="" />
          </div>
        </div>
      )}

      <div className="elo-edit-page-preview-content">
        <div className="elo-edit-page-preview-eyebrow-row">
          <span style={{ color: textColour }}>
            OFFICIAL ELO PAGE
          </span>

          {isPartner && (
            <>
              <i style={{ backgroundColor: textColour }} />
              <CheckCircle2 size={14} color={textColour} />
              <span style={{ color: textColour }}>
                LOCAL PARTNER
              </span>
            </>
          )}
        </div>

        <div
          className="elo-edit-page-preview-name"
          style={{ color: textColour }}
        >
          {name.trim() || "Your Page"}
        </div>
      </div>
    </div>
  );
}

function PartnerToggle({
  icon: Icon,
  title,
  text,
  value,
  onValueChange,
}: {
  icon: ComponentType<LucideProps>;
  title: string;
  text: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
}) {
  return (
    <label className="elo-edit-page-partner-toggle">
      <span className="elo-edit-page-partner-toggle-icon">
        <Icon size={20} />
      </span>

      <span className="elo-edit-page-partner-toggle-copy">
        <strong>{title}</strong>
        <small>{text}</small>
      </span>

      <span className="elo-edit-page-switch">
        <input
          type="checkbox"
          checked={value}
          onChange={(event) =>
            onValueChange(event.target.checked)
          }
        />

        <i />
      </span>
    </label>
  );
}

export default function EditPagePage() {
  const router = useRouter();

  const params =
    useParams<{
      id?: string | string[];
    }>();

  const requestedPageId = Array.isArray(params.id)
    ? params.id[0]
    : params.id;

  const supabase = useMemo(() => createClient(), []);

  const logoInputRef = useRef<HTMLInputElement | null>(null);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);

  const [page, setPage] = useState<PageRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [website, setWebsite] = useState("");
  const [facebook, setFacebook] = useState("");
  const [instagram, setInstagram] = useState("");
  const [brandColour, setBrandColour] =
    useState(DEFAULT_BRAND_COLOUR);

  const [originalLayout, setOriginalLayout] =
    useState<PageLayout | null>(null);

  const [currentLogoUrl, setCurrentLogoUrl] = useState("");
  const [selectedLogo, setSelectedLogo] =
    useState<SelectedImage | null>(null);
  const [removeLogo, setRemoveLogo] = useState(false);

  const [existingImages, setExistingImages] =
    useState<string[]>([]);
  const [selectedImages, setSelectedImages] =
    useState<SelectedImage[]>([]);
  const [removedImageUrls, setRemovedImageUrls] =
    useState<string[]>([]);

  const [ownerId, setOwnerId] = useState("");

  const [brandedCalendar, setBrandedCalendar] = useState(true);
  const [menuEnabled, setMenuEnabled] = useState(true);
  const [menuTitle, setMenuTitle] =
    useState("Menu & Services");
  const [menuItems, setMenuItems] =
    useState<PartnerMenuItem[]>([]);

  const [formError, setFormError] =
    useState<string | null>(null);
  const [saveMessage, setSaveMessage] =
    useState<string | null>(null);

  const selectedLogoRef =
    useRef<SelectedImage | null>(null);
  const selectedImagesRef =
    useRef<SelectedImage[]>([]);

  useEffect(() => {
    selectedLogoRef.current = selectedLogo;
  }, [selectedLogo]);

  useEffect(() => {
    selectedImagesRef.current = selectedImages;
  }, [selectedImages]);

  useEffect(() => {
    return () => {
      if (selectedLogoRef.current) {
        URL.revokeObjectURL(
          selectedLogoRef.current.previewUrl
        );
      }

      selectedImagesRef.current.forEach((image) =>
        URL.revokeObjectURL(image.previewUrl)
      );
    };
  }, []);

  const isPartner = page?.is_local_partner === true;

  const maxImages = isPartner
    ? PARTNER_MAX_IMAGES
    : FREE_MAX_IMAGES;

  const loadPage = useCallback(async () => {
    setLoading(true);
    setFormError(null);

    try {
      const {
        data: {
          user,
        },
        error:
          authError,
      } =
        await supabase
          .auth
          .getUser();

      if (authError) {
        throw authError;
      }

      if (!user) {
        router.replace(
          `/log-in?next=${encodeURIComponent(
            requestedPageId
              ? `/edit-page/${requestedPageId}`
              : "/edit-page"
          )}`
        );
        return;
      }

      let query = supabase
        .from("groups")
        .select(`
          id,
          user_id,
          name,
          description,
          slug,
          website,
          brand_color,
          logo_url,
          layout,
          showcase_images,
          status,
          is_local_partner
        `);

      if (requestedPageId) {
        query = query.eq("id", requestedPageId);
      } else {
        query = query
          .eq("user_id", user.id)
          .order("created_at", {
            ascending: true,
          })
          .limit(1);
      }

      const {
        data,
        error,
      } = await query
        .limit(1)
        .maybeSingle();

      if (error || !data) {
        throw new Error(
          error?.message ??
            "Your Page could not be found."
        );
      }

      const loaded = data as PageRow;

      if (loaded.user_id !== user.id) {
        throw new Error(
          "You do not have permission to edit this Page."
        );
      }

      const socials = loaded.layout?.socials;
      const partnerFeatures =
        loaded.layout?.partner_features;

      const loadedPartner =
        loaded.is_local_partner === true;

      const loadedMaxImages = loadedPartner
        ? PARTNER_MAX_IMAGES
        : FREE_MAX_IMAGES;

      setPage(loaded);
      setOwnerId(loaded.user_id ?? user.id);
      setName(loaded.name ?? "");
      setDescription(loaded.description ?? "");
      setWebsite(loaded.website ?? "");
      setBrandColour(normaliseHex(loaded.brand_color));
      setCurrentLogoUrl(loaded.logo_url ?? "");
      setSelectedLogo(null);
      setRemoveLogo(false);

      setExistingImages(
        normaliseShowcaseImages(
          loaded.showcase_images,
          loadedMaxImages
        )
      );

      setSelectedImages([]);
      setRemovedImageUrls([]);

      setFacebook(
        normaliseHandle(
          socials?.facebook ??
            loaded.layout?.facebook ??
            ""
        )
      );

      setInstagram(
        normaliseHandle(
          socials?.instagram ??
            loaded.layout?.instagram ??
            ""
        )
      );

      setOriginalLayout(loaded.layout ?? {});

      if (loadedPartner) {
        setBrandedCalendar(
          partnerFeatures?.branded_calendar ?? true
        );

        setMenuEnabled(
          partnerFeatures?.menu_enabled ?? true
        );

        setMenuTitle(
          partnerFeatures?.menu_title?.trim() ||
            "Menu & Services"
        );

        setMenuItems(
          normaliseMenuItems(
            partnerFeatures?.menu_items
          )
        );
      } else {
        setBrandedCalendar(true);
        setMenuEnabled(true);
        setMenuTitle("Menu & Services");
        setMenuItems([]);
      }
    } catch (error) {
      console.error("Unable to edit Page:", error);

      setFormError(
        error instanceof Error
          ? error.message
          : "Unable to edit Page."
      );
    } finally {
      setLoading(false);
    }
  }, [
    requestedPageId,
    router,
    supabase,
  ]);

  useEffect(() => {
    void loadPage();
  }, [loadPage]);

  const logoPreview =
    selectedLogo?.previewUrl ??
    (removeLogo ? "" : currentLogoUrl);

  const totalImages =
    existingImages.length +
    selectedImages.length;

  const remainingImages =
    Math.max(0, maxImages - totalImages);

  function toSelectedImage(file: File): SelectedImage {
    return {
      id: makeId(),
      file,
      previewUrl: URL.createObjectURL(file),
      mimeType: file.type || "image/jpeg",
      extension: fileExtension(file),
    };
  }

  function chooseLogo(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    event.target.value = "";

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setFormError("Choose an image file for your logo.");
      return;
    }

    if (selectedLogo) {
      URL.revokeObjectURL(selectedLogo.previewUrl);
    }

    setSelectedLogo(toSelectedImage(file));
    setRemoveLogo(false);
    setFormError(null);
    setSaveMessage(null);
  }

  function chooseGalleryImages(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";

    if (files.length === 0 || remainingImages <= 0) {
      return;
    }

    const accepted = files
      .filter((file) => file.type.startsWith("image/"))
      .slice(0, remainingImages)
      .map(toSelectedImage);

    setSelectedImages((current) => [
      ...current,
      ...accepted,
    ]);

    setFormError(null);
    setSaveMessage(null);
  }

  function removeExistingImage(url: string) {
    setExistingImages((current) =>
      current.filter((item) => item !== url)
    );

    setRemovedImageUrls((current) =>
      current.includes(url)
        ? current
        : [...current, url]
    );

    setSaveMessage(null);
  }

  function removeSelectedImage(id: string) {
    setSelectedImages((current) => {
      const removed = current.find(
        (item) => item.id === id
      );

      if (removed) {
        URL.revokeObjectURL(removed.previewUrl);
      }

      return current.filter(
        (item) => item.id !== id
      );
    });

    setSaveMessage(null);
  }

  function clearLogo() {
    if (selectedLogo) {
      URL.revokeObjectURL(selectedLogo.previewUrl);
      setSelectedLogo(null);
      return;
    }

    if (currentLogoUrl && !removeLogo) {
      const confirmed =
        window.confirm(
          "Remove logo? The Page will no longer display this logo."
        );

      if (!confirmed) {
        return;
      }

      setRemoveLogo(true);
      setSaveMessage(null);
      return;
    }

    setRemoveLogo(false);
  }

  function addMenuItem() {
    setMenuItems((current) => [
      ...current,
      {
        id: makeId(),
        title: "",
        description: "",
        price: "",
        icon: "briefcase-outline",
      },
    ]);
  }

  function updateMenuItem(
    id: string,
    key: "title" | "description" | "price" | "icon",
    value: string
  ) {
    setMenuItems((current) =>
      current.map((item) =>
        item.id === id
          ? {
              ...item,
              [key]:
                key === "icon" && isMenuIcon(value)
                  ? value
                  : value,
            }
          : item
      )
    );
  }

  function removeMenuItem(id: string) {
    setMenuItems((current) =>
      current.filter((item) => item.id !== id)
    );
  }

  async function uploadImage(
    image: SelectedImage,
    folder: "logo" | "gallery"
  ) {
    if (!ownerId || !page?.id) {
      throw new Error(
        "Page upload information is missing."
      );
    }

    const path =
      `${ownerId}/${page.id}/${folder}/${makeId()}.${image.extension}`;

    const { error } = await supabase.storage
      .from(PAGE_IMAGE_BUCKET)
      .upload(path, image.file, {
        contentType: image.mimeType,
        cacheControl: "3600",
        upsert: false,
      });

    if (error) {
      throw new Error(
        `Image upload failed: ${error.message}`
      );
    }

    const { data } = supabase.storage
      .from(PAGE_IMAGE_BUCKET)
      .getPublicUrl(path);

    return {
      path,
      url: data.publicUrl,
    };
  }

  async function deleteStoredUrls(urls: string[]) {
    const paths = urls
      .map(storagePathFromPublicUrl)
      .filter(
        (path): path is string =>
          Boolean(path)
      );

    if (paths.length === 0) {
      return;
    }

    const { error } = await supabase.storage
      .from(PAGE_IMAGE_BUCKET)
      .remove(paths);

    if (error) {
      console.warn(
        "Old Page image cleanup failed:",
        error
      );
    }
  }

  async function savePage() {
    if (saving || !page) {
      return;
    }

    const cleanName = name.trim();

    if (!cleanName) {
      setFormError(
        "Add the name of the business or organisation."
      );
      return;
    }

    const validBrandColour =
      normaliseHex(brandColour);

    setBrandColour(validBrandColour);
    setSaving(true);
    setFormError(null);
    setSaveMessage(null);

    const uploadedPaths: string[] = [];

    try {
      const {
        data: {
          user,
        },
        error:
          authError,
      } =
        await supabase
          .auth
          .getUser();

      if (authError) {
        throw authError;
      }

      if (!user) {
        throw new Error(
          "You need to be signed in."
        );
      }

      if (page.user_id !== user.id) {
        throw new Error(
          "You do not have permission to edit this Page."
        );
      }

      let finalLogoUrl =
        removeLogo
          ? null
          : currentLogoUrl || null;

      if (selectedLogo) {
        const uploaded = await uploadImage(
          selectedLogo,
          "logo"
        );

        uploadedPaths.push(uploaded.path);
        finalLogoUrl = uploaded.url;
      }

      const newGalleryUrls: string[] = [];

      for (const image of selectedImages) {
        const uploaded = await uploadImage(
          image,
          "gallery"
        );

        uploadedPaths.push(uploaded.path);
        newGalleryUrls.push(uploaded.url);
      }

      const finalGallery = [
        ...existingImages,
        ...newGalleryUrls,
      ].slice(0, maxImages);

      const cleanedMenuItems = menuItems
        .map((item) => ({
          ...item,
          title: item.title.trim(),
          description: item.description.trim(),
          price: item.price.trim(),
          icon: isMenuIcon(item.icon)
            ? item.icon
            : "briefcase-outline" as MenuIconName,
        }))
        .filter((item) => Boolean(item.title));

      const nextLayout: PageLayout = {
        ...(originalLayout ?? {}),
        socials: {
          ...(originalLayout?.socials ?? {}),
          facebook: socialUrl("facebook", facebook),
          instagram: socialUrl("instagram", instagram),
        },
        ...(isPartner
          ? {
              partner_features: {
                branded_calendar: brandedCalendar,
                menu_enabled: menuEnabled,
                menu_title:
                  menuTitle.trim() ||
                  "Menu & Services",
                menu_items: cleanedMenuItems,
              },
            }
          : {}),
      };

      const {
        error: updateError,
      } = await supabase
        .from("groups")
        .update({
          name: cleanName,
          description: description.trim() || null,
          website: normaliseUrl(website),
          brand_color: validBrandColour,
          logo_url: finalLogoUrl,
          layout: nextLayout,
          showcase_images: finalGallery,
        })
        .eq("id", page.id)
        .eq("user_id", user.id);

      if (updateError) {
        throw new Error(
          `Page update failed: ${updateError.message}`
        );
      }

      const urlsToDelete = [
        ...removedImageUrls,
      ];

      if (
        selectedLogo &&
        currentLogoUrl
      ) {
        urlsToDelete.push(currentLogoUrl);
      }

      if (
        removeLogo &&
        currentLogoUrl
      ) {
        urlsToDelete.push(currentLogoUrl);
      }

      await deleteStoredUrls(
        Array.from(new Set(urlsToDelete))
      );

      if (selectedLogo) {
        URL.revokeObjectURL(
          selectedLogo.previewUrl
        );
      }

      selectedImages.forEach((image) =>
        URL.revokeObjectURL(image.previewUrl)
      );

      setCurrentLogoUrl(finalLogoUrl ?? "");
      setSelectedLogo(null);
      setRemoveLogo(false);
      setExistingImages(finalGallery);
      setSelectedImages([]);
      setRemovedImageUrls([]);
      setOriginalLayout(nextLayout);
      setMenuItems(cleanedMenuItems);

      setPage({
        ...page,
        name: cleanName,
        description: description.trim() || null,
        website: normaliseUrl(website),
        brand_color: validBrandColour,
        logo_url: finalLogoUrl,
        layout: nextLayout,
        showcase_images: finalGallery,
      });

      setSaveMessage(
        "Your changes are now live."
      );

      router.refresh();
    } catch (error) {
      if (uploadedPaths.length > 0) {
        await supabase.storage
          .from(PAGE_IMAGE_BUCKET)
          .remove(uploadedPaths);
      }

      setFormError(
        error instanceof Error
          ? error.message
          : "Unable to save Page. Please try again."
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="elo-edit-page-page">
        <SiteHeader />

        <div className="elo-edit-page-loading">
          <LoaderCircle
            size={31}
            className="elo-edit-page-spin"
          />

          <span>Loading Page...</span>
        </div>

        <style>{styles}</style>
      </main>
    );
  }

  if (!page) {
    return (
      <main className="elo-edit-page-page">
        <SiteHeader />

        <div className="elo-edit-page-unavailable">
          <h1>Unable to edit Page</h1>

          <p>
            {formError ??
              "This Page could not be found."}
          </p>
        </div>

        <style>{styles}</style>
      </main>
    );
  }

  return (
    <main className="elo-edit-page-page">
      <SiteHeader />

      <section className="elo-edit-page-shell">
        <header className="elo-edit-page-intro">
          <div className="elo-edit-page-eyebrow">
            EDIT PAGE
          </div>

          <h1>Keep your Page up to date.</h1>

          <p>
            Changes appear across ELO as soon as you save them.
          </p>
        </header>

        {formError && (
          <div
            className="elo-edit-page-error"
            role="alert"
          >
            <span>{formError}</span>

            <button
              type="button"
              onClick={() => setFormError(null)}
              aria-label="Dismiss error"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {saveMessage && (
          <div
            className="elo-edit-page-success"
            role="status"
          >
            <CheckCircle2 size={16} />

            <span>{saveMessage}</span>
          </div>
        )}

        <section className="elo-edit-page-preview-section">
          <div className="elo-edit-page-preview-label">
            PAGE HEADER PREVIEW
          </div>

          <PreviewHero
            name={name}
            logoUrl={logoPreview}
            brandColour={normaliseHex(brandColour)}
            isPartner={isPartner}
          />
        </section>

        <div className="elo-edit-page-form">
          <section className="elo-edit-page-field">
            <FieldLabel>Page name</FieldLabel>

            <input
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                setSaveMessage(null);
              }}
              placeholder="Business or organisation name"
              maxLength={100}
              disabled={saving}
            />
          </section>

          <section className="elo-edit-page-field">
            <FieldLabel optional>About</FieldLabel>

            <textarea
              value={description}
              onChange={(event) => {
                setDescription(event.target.value);
                setSaveMessage(null);
              }}
              placeholder="Tell people a little about your business or organisation..."
              maxLength={1000}
              disabled={saving}
            />

            <div className="elo-edit-page-character-count">
              {description.length}/1000
            </div>
          </section>

          <section className="elo-edit-page-field">
            <FieldLabel optional>Logo</FieldLabel>

            <input
              ref={logoInputRef}
              type="file"
              accept="image/*"
              className="elo-edit-page-hidden-input"
              onChange={chooseLogo}
            />

            <button
              type="button"
              className="elo-edit-page-logo-picker"
              onClick={() => logoInputRef.current?.click()}
              disabled={saving}
            >
              <span className="elo-edit-page-logo-preview">
                {logoPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={logoPreview} alt="" />
                ) : (
                  <ImagePlus size={27} />
                )}
              </span>

              <span className="elo-edit-page-logo-copy">
                <strong>
                  {logoPreview ? "Change logo" : "Add logo"}
                </strong>

                <small>Square images work best</small>
              </span>

              <ChevronRight size={19} />
            </button>

            {(logoPreview || removeLogo) && (
              <button
                type="button"
                className={`elo-edit-page-remove-logo ${
                  removeLogo ? "is-restore" : ""
                }`}
                onClick={clearLogo}
              >
                {removeLogo ? "Keep current logo" : selectedLogo
                  ? "Cancel new logo"
                  : "Remove logo"}
              </button>
            )}
          </section>

          <section className="elo-edit-page-field">
            <FieldLabel>Brand colour</FieldLabel>

            <BrandColourPicker
              value={
                brandColour
              }
              onChange={(colour) => {
                setBrandColour(
                  colour
                );

                setSaveMessage(
                  null
                );
              }}
            />
          </section>

          <section className="elo-edit-page-field">
            <FieldLabel optional>Website</FieldLabel>

            <div className="elo-edit-page-icon-input">
              <Globe2 size={19} />

              <input
                value={website}
                onChange={(event) => {
                  setWebsite(event.target.value);
                  setSaveMessage(null);
                }}
                placeholder="www.example.com"
                disabled={saving}
              />
            </div>
          </section>

          <section className="elo-edit-page-field">
            <FieldLabel optional>Facebook</FieldLabel>

            <div className="elo-edit-page-icon-input">
              <FaFacebook size={18} />

              <input
                value={facebook}
                onChange={(event) => {
                  setFacebook(
                    normaliseHandle(event.target.value)
                  );

                  setSaveMessage(null);
                }}
                placeholder="yourpage"
                disabled={saving}
              />
            </div>
          </section>

          <section className="elo-edit-page-field">
            <FieldLabel optional>Instagram</FieldLabel>

            <div className="elo-edit-page-icon-input">
              <FaInstagram size={18} />
              <span>@</span>

              <input
                value={instagram}
                onChange={(event) => {
                  setInstagram(
                    normaliseHandle(event.target.value)
                  );

                  setSaveMessage(null);
                }}
                placeholder="yourpage"
                disabled={saving}
              />
            </div>
          </section>

          {isPartner && (
            <section className="elo-edit-page-partner-section">
              <div className="elo-edit-page-partner-heading">
                <div className="elo-edit-page-partner-crown">
                  <Gem size={22} />
                </div>

                <div>
                  <div className="elo-edit-page-partner-eyebrow">
                    LOCAL PARTNER
                  </div>

                  <h2>Page features</h2>
                </div>
              </div>

              <p className="elo-edit-page-partner-intro">
                Calendar and Menu are optional. They are switched on by default for new Partner Pages.
              </p>

              <PartnerToggle
                icon={CalendarDays}
                title="Branded Calendar"
                text="Show your own Events and Deals in a full calendar on your Page."
                value={brandedCalendar}
                onValueChange={(value) => {
                  setBrandedCalendar(value);
                  setSaveMessage(null);
                }}
              />

              <PartnerToggle
                icon={List}
                title="Branded Menu / Service List"
                text="Build a menu, services list, treatments list, price list or anything similar."
                value={menuEnabled}
                onValueChange={(value) => {
                  setMenuEnabled(value);
                  setSaveMessage(null);
                }}
              />

              {menuEnabled && (
                <div className="elo-edit-page-menu-editor">
                  <FieldLabel>
                    Menu / section title
                  </FieldLabel>

                  <input
                    value={menuTitle}
                    onChange={(event) => {
                      setMenuTitle(event.target.value);
                      setSaveMessage(null);
                    }}
                    placeholder="e.g. Our Menu, Services, Treatments"
                    maxLength={60}
                    disabled={saving}
                  />

                  <div className="elo-edit-page-menu-heading">
                    <div>
                      <strong>Items</strong>

                      <span>
                        Title required. Description and price are optional.
                      </span>
                    </div>

                    <b>{menuItems.length}</b>
                  </div>

                  {menuItems.map((item, index) => (
                    <div
                      key={item.id}
                      className="elo-edit-page-menu-item"
                    >
                      <div className="elo-edit-page-menu-item-top">
                        <span>{index + 1}</span>

                        <button
                          type="button"
                          onClick={() =>
                            removeMenuItem(item.id)
                          }
                          aria-label="Remove menu item"
                        >
                          <Trash2 size={17} />
                        </button>
                      </div>

                      <input
                        value={item.title}
                        onChange={(event) =>
                          updateMenuItem(
                            item.id,
                            "title",
                            event.target.value
                          )
                        }
                        placeholder="Item or service title"
                        disabled={saving}
                      />

                      <textarea
                        value={item.description}
                        onChange={(event) =>
                          updateMenuItem(
                            item.id,
                            "description",
                            event.target.value
                          )
                        }
                        placeholder="Description (optional)"
                        disabled={saving}
                      />

                      <input
                        value={item.price}
                        onChange={(event) =>
                          updateMenuItem(
                            item.id,
                            "price",
                            event.target.value
                          )
                        }
                        placeholder="Price (optional) — e.g. £12 or From £30"
                        disabled={saving}
                      />

                      <div className="elo-edit-page-menu-icon-label">
                        ICON
                      </div>

                      <div className="elo-edit-page-icon-grid">
                        {MENU_ICON_OPTIONS.map((option) => {
                          const active =
                            item.icon === option.name;

                          const Icon = option.icon;

                          return (
                            <button
                              key={option.name}
                              type="button"
                              className={
                                active ? "is-active" : ""
                              }
                              onClick={() =>
                                updateMenuItem(
                                  item.id,
                                  "icon",
                                  option.name
                                )
                              }
                            >
                              <Icon size={19} />
                              <span>{option.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}

                  <button
                    type="button"
                    className="elo-edit-page-add-menu-item"
                    onClick={addMenuItem}
                  >
                    <Plus size={19} />
                    <span>Add item</span>
                  </button>
                </div>
              )}
            </section>
          )}

          <section className="elo-edit-page-field">
            <div className="elo-edit-page-gallery-heading">
              <div>
                <FieldLabel optional>
                  {isPartner ? "Branded gallery" : "Photos"}
                </FieldLabel>

                {isPartner && (
                  <p>
                    Local Partners can display up to 20 images.
                  </p>
                )}
              </div>

              <span>
                {totalImages}/{maxImages}
              </span>
            </div>

            <input
              ref={galleryInputRef}
              type="file"
              multiple
              accept="image/*"
              className="elo-edit-page-hidden-input"
              onChange={chooseGalleryImages}
            />

            <div className="elo-edit-page-gallery">
              {existingImages.map((url, index) => (
                <div
                  key={`${url}-${index}`}
                  className={`elo-edit-page-gallery-item ${
                    isPartner ? "is-partner" : ""
                  }`}
                  style={{
                    borderColor: isPartner
                      ? normaliseHex(brandColour)
                      : undefined,
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="" />

                  <button
                    type="button"
                    onClick={() => removeExistingImage(url)}
                    aria-label="Remove image"
                  >
                    <X size={17} />
                  </button>
                </div>
              ))}

              {selectedImages.map((image) => (
                <div
                  key={image.id}
                  className={`elo-edit-page-gallery-item ${
                    isPartner ? "is-partner" : ""
                  }`}
                  style={{
                    borderColor: isPartner
                      ? normaliseHex(brandColour)
                      : undefined,
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={image.previewUrl} alt="" />

                  <button
                    type="button"
                    onClick={() =>
                      removeSelectedImage(image.id)
                    }
                    aria-label="Remove new image"
                  >
                    <X size={17} />
                  </button>
                </div>
              ))}

              {remainingImages > 0 && (
                <button
                  type="button"
                  className="elo-edit-page-add-photo"
                  style={{
                    borderColor: isPartner
                      ? normaliseHex(brandColour)
                      : undefined,
                    color: isPartner
                      ? normaliseHex(brandColour)
                      : undefined,
                  }}
                  onClick={() =>
                    galleryInputRef.current?.click()
                  }
                  disabled={saving}
                >
                  <ImagePlus size={24} />
                  <span>Add image</span>
                </button>
              )}
            </div>

            <p className="elo-edit-page-gallery-help">
              {isPartner
                ? "Visitors can tap any image on your Page to view it full-screen."
                : "Add up to three photos to showcase the Page."}
            </p>
          </section>

          <button
            type="button"
            className="elo-edit-page-save"
            onClick={() => void savePage()}
            disabled={saving}
          >
            {saving ? (
              <LoaderCircle
                size={20}
                className="elo-edit-page-spin"
              />
            ) : (
              <CheckCircle2 size={20} />
            )}

            <span>
              {saving ? "Saving..." : "Save changes"}
            </span>
          </button>

          <p className="elo-edit-page-save-note">
            Your Page URL will stay the same.
          </p>
        </div>
      </section>

      <style>{styles}</style>
    </main>
  );
}

const styles = `
  .elo-edit-page-page {
    min-height: 100dvh;
    background: #F4F5F4;
    color: #17221F;
    font-family: var(--font-geist-sans), Arial, sans-serif;
  }

  .elo-edit-page-page *,
  .elo-edit-page-page *::before,
  .elo-edit-page-page *::after {
    box-sizing: border-box;
  }

  .elo-edit-page-page button,
  .elo-edit-page-page input,
  .elo-edit-page-page textarea {
    font: inherit;
  }

  .elo-edit-page-shell {
    width: 100%;
    max-width: 760px;
    margin: 0 auto;
    padding-bottom: 130px;
  }

  .elo-edit-page-loading,
  .elo-edit-page-unavailable {
    min-height: 68vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 10px;
    padding: 28px;
    text-align: center;
  }

  .elo-edit-page-loading {
    color: #005744;
  }

  .elo-edit-page-loading span,
  .elo-edit-page-unavailable p {
    color: #74807C;
    font-size: 11px;
    line-height: 17px;
  }

  .elo-edit-page-unavailable h1 {
    margin: 0;
    font-size: 21px;
    font-weight: 900;
  }

  .elo-edit-page-intro {
    padding: 24px 18px 22px;
  }

  .elo-edit-page-eyebrow {
    margin-bottom: 7px;
    color: #005744;
    font-size: 9px;
    font-weight: 900;
    letter-spacing: 1.3px;
  }

  .elo-edit-page-intro h1 {
    margin: 0;
    color: #111614;
    font-size: 28px;
    line-height: 33px;
    font-weight: 900;
    letter-spacing: -.7px;
  }

  .elo-edit-page-intro p {
    margin: 8px 0 0;
    color: #68736F;
    font-size: 14px;
    line-height: 21px;
  }

  .elo-edit-page-error,
  .elo-edit-page-success {
    display: flex;
    align-items: center;
    gap: 9px;
    margin: 0 18px 14px;
    border-radius: 13px;
    padding: 11px 12px;
    font-size: 11px;
    line-height: 17px;
    font-weight: 700;
  }

  .elo-edit-page-error {
    background: #FDECEA;
    color: #A52B21;
  }

  .elo-edit-page-success {
    background: #E7F3EE;
    color: #005744;
  }

  .elo-edit-page-error span,
  .elo-edit-page-success span {
    flex: 1;
  }

  .elo-edit-page-error button {
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 0;
    border-radius: 8px;
    background: transparent;
    color: inherit;
    cursor: pointer;
  }

  .elo-edit-page-preview-section {
    margin-bottom: 12px;
  }

  .elo-edit-page-preview-label {
    margin: 0 18px 7px;
    color: #84908C;
    font-size: 8px;
    font-weight: 900;
    letter-spacing: 1.2px;
  }

  .elo-edit-page-preview {
    position: relative;
    min-height: 190px;
    overflow: hidden;
  }

  .elo-edit-page-preview-shards {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
  }

  .elo-edit-page-preview-share {
    position: absolute;
    z-index: 5;
    top: 16px;
    left: 16px;
    width: 44px;
    height: 44px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1px solid rgba(0,0,0,.08);
    border-radius: 50%;
    background: rgba(255,255,255,.95);
    color: #173C33;
    font-size: 20px;
  }

  .elo-edit-page-preview-logo-outer {
    position: absolute;
    z-index: 5;
    top: 14px;
    right: 16px;
    width: 68px;
    height: 68px;
    border-radius: 50%;
    background: #FFFFFF;
    padding: 4px;
    box-shadow: 0 2px 6px rgba(0,0,0,.14);
  }

  .elo-edit-page-preview-logo-inner {
    width: 100%;
    height: 100%;
    overflow: hidden;
    border-radius: 50%;
    background: #FFFFFF;
  }

  .elo-edit-page-preview-logo-inner img {
    width: 100%;
    height: 100%;
    display: block;
    object-fit: contain;
  }

  .elo-edit-page-preview-content {
    position: relative;
    z-index: 2;
    padding: 92px 18px 23px;
  }

  .elo-edit-page-preview-eyebrow-row {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 5px;
    margin-bottom: 8px;
    font-size: 8px;
    font-weight: 900;
    letter-spacing: 1.1px;
    opacity: .76;
  }

  .elo-edit-page-preview-eyebrow-row i {
    width: 3px;
    height: 3px;
    border-radius: 50%;
    opacity: .55;
  }

  .elo-edit-page-preview-name {
    max-width: 85%;
    font-size: 30px;
    line-height: 34px;
    font-weight: 900;
    letter-spacing: -.7px;
  }

  .elo-edit-page-form {
    padding: 12px 18px 0;
  }

  .elo-edit-page-field {
    padding: 20px 0;
    border-bottom: 1px solid #D6DDDA;
  }

  .elo-edit-page-label-row {
    min-height: 20px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 9px;
  }

  .elo-edit-page-label-row label {
    color: #1C2925;
    font-size: 13px;
    font-weight: 900;
  }

  .elo-edit-page-label-row span {
    color: #97A09D;
    font-size: 7px;
    font-weight: 900;
    letter-spacing: 1px;
  }

  .elo-edit-page-field > input,
  .elo-edit-page-field > textarea,
  .elo-edit-page-menu-editor > input,
  .elo-edit-page-menu-item > input,
  .elo-edit-page-menu-item > textarea {
    width: 100%;
    min-height: 54px;
    border: 1px solid #D5DCDA;
    border-radius: 14px;
    outline: none;
    background: #FFFFFF;
    padding: 0 15px;
    color: #17221F;
    font-size: 14px;
    font-weight: 600;
  }

  .elo-edit-page-field > textarea,
  .elo-edit-page-menu-item > textarea {
    min-height: 120px;
    resize: vertical;
    padding-top: 14px;
    padding-bottom: 14px;
    line-height: 20px;
  }

  .elo-edit-page-character-count {
    margin-top: 6px;
    color: #9AA39F;
    font-size: 9px;
    font-weight: 700;
    text-align: right;
  }

  .elo-edit-page-hidden-input {
    display: none;
  }

  .elo-edit-page-logo-picker {
    width: 100%;
    min-height: 92px;
    display: flex;
    align-items: center;
    gap: 12px;
    border: 1px solid #D5DCDA;
    border-radius: 16px;
    background: #FFFFFF;
    padding: 12px;
    text-align: left;
    cursor: pointer;
  }

  .elo-edit-page-logo-preview {
    width: 66px;
    height: 66px;
    flex: 0 0 66px;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    border-radius: 14px;
    background: #EEF1EF;
    color: #83908B;
  }

  .elo-edit-page-logo-preview img {
    width: 100%;
    height: 100%;
    display: block;
    object-fit: contain;
    background: #FFFFFF;
  }

  .elo-edit-page-logo-copy {
    min-width: 0;
    flex: 1;
    display: flex;
    flex-direction: column;
  }

  .elo-edit-page-logo-copy strong {
    color: #1B2824;
    font-size: 14px;
    font-weight: 900;
  }

  .elo-edit-page-logo-copy small {
    margin-top: 3px;
    color: #84908C;
    font-size: 11px;
  }

  .elo-edit-page-remove-logo {
    margin-top: 10px;
    border: 0;
    background: transparent;
    padding: 5px 0;
    color: #B42318;
    font-size: 11px;
    font-weight: 800;
    cursor: pointer;
  }

  .elo-edit-page-remove-logo.is-restore {
    color: #005744;
  }

  .elo-edit-page-colour-picker-card {
    border: 1px solid #D5DCDA;
    border-radius: 16px;
    background: #FFFFFF;
    padding: 14px;
  }

  .elo-edit-page-colour-panel {
    position: relative;
    height: 190px;
    overflow: hidden;
    border-radius: 14px;
    cursor: crosshair;
    touch-action: none;
    user-select: none;
  }

  .elo-edit-page-colour-panel-white,
  .elo-edit-page-colour-panel-black {
    position: absolute;
    inset: 0;
    pointer-events: none;
  }

  .elo-edit-page-colour-panel-white {
    background:
      linear-gradient(
        to right,
        #FFFFFF,
        rgba(255,255,255,0)
      );
  }

  .elo-edit-page-colour-panel-black {
    background:
      linear-gradient(
        to bottom,
        rgba(0,0,0,0),
        #000000
      );
  }

  .elo-edit-page-colour-panel-thumb {
    position: absolute;
    width: 24px;
    height: 24px;
    border: 3px solid #FFFFFF;
    border-radius: 50%;
    box-shadow: 0 1px 4px rgba(0,0,0,.28);
    pointer-events: none;
    transform: translate(-50%, -50%);
  }

  .elo-edit-page-hue-track {
    position: relative;
    height: 24px;
    margin-top: 16px;
    border-radius: 12px;
    background:
      linear-gradient(
        to right,
        #FF0000 0%,
        #FFFF00 16.67%,
        #00FF00 33.33%,
        #00FFFF 50%,
        #0000FF 66.67%,
        #FF00FF 83.33%,
        #FF0000 100%
      );
    cursor: ew-resize;
    touch-action: none;
    user-select: none;
  }

  .elo-edit-page-hue-thumb {
    position: absolute;
    top: 0;
    width: 24px;
    height: 24px;
    border: 3px solid #FFFFFF;
    border-radius: 50%;
    box-shadow: 0 1px 4px rgba(0,0,0,.25);
    pointer-events: none;
    transform: translateX(-50%);
  }

  .elo-edit-page-selected-colour-row {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-top: 16px;
  }

  .elo-edit-page-selected-colour-swatch {
    width: 34px;
    height: 34px;
    flex: 0 0 34px;
    border: 1px solid rgba(0,0,0,.16);
    border-radius: 9px;
  }

  .elo-edit-page-selected-colour-text {
    min-width: 0;
    flex: 1;
    color: #68736F;
    font-size: 11px;
    line-height: 16px;
    font-weight: 700;
  }

  .elo-edit-page-selected-colour-row strong {
    flex: 0 0 auto;
    color: #34423D;
    font-size: 10px;
    font-weight: 900;
    letter-spacing: .45px;
  }

  .elo-edit-page-icon-input {
    min-height: 54px;
    display: flex;
    align-items: center;
    gap: 9px;
    border: 1px solid #D5DCDA;
    border-radius: 14px;
    background: #FFFFFF;
    padding: 0 14px;
    color: #68736F;
  }

  .elo-edit-page-icon-input input {
    min-width: 0;
    flex: 1;
    min-height: 52px;
    border: 0;
    outline: 0;
    background: transparent;
    color: #17221F;
    font-size: 14px;
    font-weight: 600;
  }

  .elo-edit-page-partner-section {
    margin-top: 22px;
    border: 1px solid #D9E6E1;
    border-radius: 22px;
    background: #FFFFFF;
    padding: 17px;
  }

  .elo-edit-page-partner-heading {
    display: flex;
    align-items: center;
  }

  .elo-edit-page-partner-crown {
    width: 45px;
    height: 45px;
    flex: 0 0 45px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 14px;
    background: #005744;
    color: #FFFFFF;
  }

  .elo-edit-page-partner-eyebrow {
    color: #005744;
    font-size: 8px;
    font-weight: 900;
    letter-spacing: 1.1px;
  }

  .elo-edit-page-partner-heading > div:last-child {
    min-width: 0;
    flex: 1;
    margin-left: 12px;
  }

  .elo-edit-page-partner-heading h2 {
    margin: 2px 0 0;
    color: #14221E;
    font-size: 20px;
    line-height: 24px;
    font-weight: 900;
  }

  .elo-edit-page-partner-intro {
    margin: 12px 0 0;
    color: #6F7A76;
    font-size: 12px;
    line-height: 18px;
    font-weight: 600;
  }

  .elo-edit-page-partner-toggle {
    min-height: 72px;
    display: flex;
    align-items: center;
    margin-top: 13px;
    border-top: 1px solid #E3E8E6;
    padding: 15px 0 0;
    cursor: pointer;
  }

  .elo-edit-page-partner-toggle-icon {
    width: 40px;
    height: 40px;
    flex: 0 0 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 12px;
    background: #E8F4F0;
    color: #005744;
  }

  .elo-edit-page-partner-toggle-copy {
    min-width: 0;
    flex: 1;
    display: flex;
    flex-direction: column;
    margin: 0 10px;
  }

  .elo-edit-page-partner-toggle-copy strong {
    color: #1A2924;
    font-size: 13px;
    font-weight: 900;
  }

  .elo-edit-page-partner-toggle-copy small {
    margin-top: 3px;
    color: #75807C;
    font-size: 10px;
    line-height: 15px;
    font-weight: 600;
  }

  .elo-edit-page-switch {
    position: relative;
    width: 46px;
    height: 27px;
    flex: 0 0 46px;
  }

  .elo-edit-page-switch input {
    position: absolute;
    opacity: 0;
    pointer-events: none;
  }

  .elo-edit-page-switch i {
    position: absolute;
    inset: 0;
    border-radius: 999px;
    background: #D9DEDC;
  }

  .elo-edit-page-switch i::after {
    content: "";
    position: absolute;
    top: 3px;
    left: 3px;
    width: 21px;
    height: 21px;
    border-radius: 50%;
    background: #F7F7F7;
    box-shadow: 0 1px 3px rgba(0,0,0,.15);
    transition: transform 120ms ease;
  }

  .elo-edit-page-switch input:checked + i {
    background: #80B4A7;
  }

  .elo-edit-page-switch input:checked + i::after {
    transform: translateX(19px);
    background: #005744;
  }

  .elo-edit-page-menu-editor {
    margin-top: 16px;
    border-top: 1px solid #E3E8E6;
    padding-top: 16px;
  }

  .elo-edit-page-menu-heading {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    margin: 18px 0 10px;
  }

  .elo-edit-page-menu-heading > div {
    display: flex;
    flex-direction: column;
  }

  .elo-edit-page-menu-heading strong {
    color: #26352F;
    font-size: 12px;
    font-weight: 900;
  }

  .elo-edit-page-menu-heading span {
    margin-top: 3px;
    color: #85908B;
    font-size: 9px;
  }

  .elo-edit-page-menu-heading b {
    color: #005744;
    font-size: 11px;
  }

  .elo-edit-page-menu-item {
    margin-top: 10px;
    border: 1px solid #E1E7E4;
    border-radius: 18px;
    background: #F7F9F8;
    padding: 12px;
  }

  .elo-edit-page-menu-item > input,
  .elo-edit-page-menu-item > textarea {
    margin-top: 8px;
  }

  .elo-edit-page-menu-item > textarea {
    min-height: 95px;
  }

  .elo-edit-page-menu-item-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .elo-edit-page-menu-item-top > span {
    width: 30px;
    height: 30px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 9px;
    background: #EEF3F1;
    color: #59665F;
    font-size: 10px;
    font-weight: 900;
  }

  .elo-edit-page-menu-item-top button {
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 0;
    border-radius: 9px;
    background: #FDECEA;
    color: #B42318;
    cursor: pointer;
  }

  .elo-edit-page-menu-icon-label {
    margin-top: 11px;
    color: #82908A;
    font-size: 8px;
    font-weight: 900;
    letter-spacing: .9px;
  }

  .elo-edit-page-icon-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 7px;
    margin-top: 7px;
  }

  .elo-edit-page-icon-grid button {
    min-height: 64px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 5px;
    border: 1px solid #DDE4E1;
    border-radius: 11px;
    background: #F8F9F8;
    color: #53615C;
    cursor: pointer;
  }

  .elo-edit-page-icon-grid button span {
    color: inherit;
    font-size: 8px;
    font-weight: 800;
  }

  .elo-edit-page-icon-grid button.is-active {
    border-color: #005744;
    background: #005744;
    color: #FFFFFF;
  }

  .elo-edit-page-add-menu-item {
    width: 100%;
    height: 48px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    margin-top: 11px;
    border: 1px dashed #8FB4AA;
    border-radius: 14px;
    background: #F9FBFA;
    color: #005744;
    font-size: 12px;
    font-weight: 900;
    cursor: pointer;
  }

  .elo-edit-page-gallery-heading {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
  }

  .elo-edit-page-gallery-heading p {
    margin: -4px 0 9px;
    color: #58776B;
    font-size: 9px;
  }

  .elo-edit-page-gallery-heading > span {
    margin-top: 2px;
    color: #84908C;
    font-size: 10px;
    font-weight: 800;
  }

  .elo-edit-page-gallery {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 9px;
  }

  .elo-edit-page-gallery-item,
  .elo-edit-page-add-photo {
    position: relative;
    aspect-ratio: 1;
    overflow: hidden;
    border-radius: 14px;
  }

  .elo-edit-page-gallery-item {
    border: 0 solid transparent;
    background: #E5EAE7;
  }

  .elo-edit-page-gallery-item.is-partner {
    border-width: 2px;
  }

  .elo-edit-page-gallery-item img {
    width: 100%;
    height: 100%;
    display: block;
    object-fit: cover;
  }

  .elo-edit-page-gallery-item button {
    position: absolute;
    top: 6px;
    right: 6px;
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 0;
    border-radius: 50%;
    background: rgba(0,0,0,.72);
    color: #FFFFFF;
    cursor: pointer;
  }

  .elo-edit-page-add-photo {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    border: 1px dashed #A7B4AF;
    background: #F8F9F8;
    color: #005744;
    cursor: pointer;
  }

  .elo-edit-page-add-photo span {
    margin-top: 5px;
    font-size: 9px;
    font-weight: 900;
  }

  .elo-edit-page-gallery-help {
    margin: 9px 0 0;
    color: #8A9591;
    font-size: 10px;
    line-height: 15px;
  }

  .elo-edit-page-save {
    width: 100%;
    height: 57px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 9px;
    margin-top: 26px;
    border: 0;
    border-radius: 15px;
    background: #005744;
    color: #FFFFFF;
    font-size: 13px;
    font-weight: 900;
    cursor: pointer;
  }

  .elo-edit-page-save:disabled {
    opacity: .55;
    cursor: wait;
  }

  .elo-edit-page-save-note {
    margin: 9px 0 0;
    color: #8A9591;
    font-size: 10px;
    text-align: center;
  }

  .elo-edit-page-spin {
    animation: elo-edit-page-spin .8s linear infinite;
  }

  @keyframes elo-edit-page-spin {
    to { transform: rotate(360deg); }
  }

  @media (max-width: 520px) {
    .elo-edit-page-icon-grid {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .elo-edit-page-spin {
      animation: none;
    }
  }
`;

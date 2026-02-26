export type UpscaleCategory =
  | "portrait"
  | "clarity"
  | "product"
  | "anime"
  | "restoration";

export type ProviderName = "claid" | "fal" | "runware";

export interface RouteEntry {
  primary: ProviderName;
  fallback: ProviderName;
}

export const ROUTING_TABLE: Record<UpscaleCategory, RouteEntry> = {
  portrait:    { primary: "claid",   fallback: "fal"     },
  clarity:     { primary: "fal",     fallback: "runware" },
  product:     { primary: "claid",   fallback: "fal"     },
  anime:       { primary: "fal",     fallback: "runware" },
  restoration: { primary: "fal",     fallback: "runware" },
};

export function getProviderForCategory(category: UpscaleCategory): RouteEntry {
  return ROUTING_TABLE[category];
}

export const CATEGORY_LABELS: Record<UpscaleCategory, string> = {
  portrait:    "Portrait / Selfie",
  clarity:     "Clarity Upscaler",
  product:     "Product Photo",
  anime:       "Anime / Illustration",
  restoration: "Old Photo Restoration",
};

export const CATEGORY_DESCRIPTIONS: Record<UpscaleCategory, string> = {
  portrait:    "Best for faces and skin detail",
  clarity:     "General photos, landscapes, architecture",
  product:     "E-commerce and product shots",
  anime:       "Cartoons, anime, illustrations",
  restoration: "Damaged, old, or low-res photos",
};

export const CATEGORY_ICONS: Record<UpscaleCategory, string> = {
  portrait:    "😊",
  clarity:     "📸",
  product:     "🛍️",
  anime:       "🎨",
  restoration: "🕰️",
};

import { fal } from "@fal-ai/client";

fal.config({ credentials: process.env.FAL_KEY });

// Model IDs per category
const FAL_MODELS: Record<string, string> = {
  clarity:     "fal-ai/aura-sr",
  anime:       "fal-ai/esrgan",
  restoration: "fal-ai/esrgan",
  product:     "fal-ai/aura-sr", // fallback for product
  portrait:    "fal-ai/aura-sr", // fallback for portrait
};

export interface FalUpscaleInput {
  imageUrl: string;
  category: string;
  scale: number; // 2 or 4
}

export interface FalUpscaleResult {
  outputUrl: string;
}

export async function upscaleWithFal(
  input: FalUpscaleInput
): Promise<FalUpscaleResult> {
  const model = FAL_MODELS[input.category] ?? "fal-ai/aura-sr";

  const result = await fal.subscribe(model, {
    input: {
      image_url: input.imageUrl,
      scale: input.scale,
      // upscaling_factor is used by aura-sr
      upscaling_factor: input.scale,
    },
    logs: false,
  });

  // fal.ai returns result.data.image.url or result.data.images[0].url
  const outputUrl =
    (result as any).data?.image?.url ??
    (result as any).data?.images?.[0]?.url;

  if (!outputUrl) {
    throw new Error("fal.ai returned no output URL");
  }

  return { outputUrl };
}

const CLAID_BASE = "https://api.claid.ai";

const CLAID_ENDPOINTS: Record<string, string> = {
  portrait: "/v1-beta1/image/upscale/portrait",
  product:  "/v1-beta1/image/upscale/smart",
};

export function getClaidEndpoint(category: string): string {
  return CLAID_ENDPOINTS[category] ?? "/v1-beta1/image/upscale/smart";
}

export interface ClaidUpscaleInput {
  imageUrl: string;
  category: string;
  scale: number;
}

export async function upscaleWithClaid(
  input: ClaidUpscaleInput
): Promise<{ outputUrl: string }> {
  const endpoint = getClaidEndpoint(input.category);

  const res = await fetch(`${CLAID_BASE}${endpoint}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.CLAID_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      input: { image_url: input.imageUrl },
      output: {
        image: {
          format: { type: "jpeg", quality: 95 },
          upscale: { upscaling_factor: input.scale },
        },
      },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Claid API error: ${err}`);
  }

  const data = await res.json();
  const outputUrl = data?.data?.output?.tmp_url ?? data?.output?.url;

  if (!outputUrl) throw new Error("Claid returned no output URL");
  return { outputUrl };
}

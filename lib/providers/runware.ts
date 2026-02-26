import { RunwareServer } from "@runware/sdk-js";

let runwareClient: RunwareServer | null = null;

function getRunwareClient(): RunwareServer {
  if (!runwareClient) {
    runwareClient = new RunwareServer({ apiKey: process.env.RUNWARE_API_KEY! });
  }
  return runwareClient;
}

export async function upscaleWithRunware(input: {
  imageUrl: string;
  scale: number;
}): Promise<{ outputUrl: string }> {
  const client = getRunwareClient();

  const result = await client.upscale({
    inputImage: input.imageUrl,
    upscaleFactor: input.scale,
    outputType: "URL",
  });

  const outputUrl = result?.imageURL;
  if (!outputUrl) throw new Error("Runware returned no output URL");

  return { outputUrl };
}

import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export function getSpacesClient(): S3Client {
  return new S3Client({
    region: process.env.DO_SPACES_REGION!,
    endpoint: process.env.DO_SPACES_ENDPOINT!,
    credentials: {
      accessKeyId: process.env.DO_SPACES_KEY!,
      secretAccessKey: process.env.DO_SPACES_SECRET!,
    },
  });
}

export function getStorageKey(
  userId: string,
  filename: string,
  type: "input" | "output"
): string {
  return `${type}/${userId}/${filename}`;
}

export function getPublicUrl(key: string): string {
  const cdnEndpoint = process.env.DO_SPACES_CDN_ENDPOINT;
  const bucket = process.env.DO_SPACES_BUCKET!;
  const endpoint = process.env.DO_SPACES_ENDPOINT!;

  if (cdnEndpoint) {
    return `${cdnEndpoint}/${key}`;
  }
  // Fallback to direct Spaces URL
  return `${endpoint}/${bucket}/${key}`;
}

export async function uploadToSpaces(
  key: string,
  buffer: Buffer,
  contentType: string
): Promise<string> {
  const client = getSpacesClient();
  await client.send(
    new PutObjectCommand({
      Bucket: process.env.DO_SPACES_BUCKET!,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      ACL: "public-read",
    })
  );
  return getPublicUrl(key);
}

export async function getPresignedUploadUrl(
  key: string,
  contentType: string,
  expiresIn = 300
): Promise<string> {
  const client = getSpacesClient();
  return getSignedUrl(
    client,
    new PutObjectCommand({
      Bucket: process.env.DO_SPACES_BUCKET!,
      Key: key,
      ContentType: contentType,
    }),
    { expiresIn }
  );
}

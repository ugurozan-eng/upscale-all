import { auth } from "@/auth";
import { NextRequest, NextResponse } from "next/server";
import { uploadToSpaces, getStorageKey } from "@/lib/storage";
import { nanoid } from "nanoid";

const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: "Invalid file type. Use JPG, PNG, or WEBP." },
      { status: 400 }
    );
  }

  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json(
      { error: "File too large. Maximum size is 10MB." },
      { status: 400 }
    );
  }

  const ext = file.type.split("/")[1].replace("jpeg", "jpg");
  const filename = `${nanoid()}.${ext}`;
  const key = getStorageKey(session.user.id, filename, "input");

  const buffer = Buffer.from(await file.arrayBuffer());
  const publicUrl = await uploadToSpaces(key, buffer, file.type);

  return NextResponse.json({ url: publicUrl, key });
}

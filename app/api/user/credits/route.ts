import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { getUserCredits } from "@/lib/credits";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ credits: 0 });
  }
  const credits = await getUserCredits(session.user.id);
  return NextResponse.json({ credits });
}

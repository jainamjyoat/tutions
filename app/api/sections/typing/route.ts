import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

// GET: Fetch users currently typing in the section (updated within last 4 seconds)
export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const sectionId = searchParams.get("sectionId");
  if (!sectionId) return NextResponse.json({ typers: [] });

  const userEmail = session.user.email?.trim().toLowerCase();
  const fourSecondsAgo = new Date(Date.now() - 4000);

  try {
    const activeTypers = await prisma.sectionTyping.findMany({
      where: {
        sectionId,
        updatedAt: { gte: fourSecondsAgo },
        NOT: { userEmail: { equals: userEmail, mode: "insensitive" } },
      },
    });

    return NextResponse.json({ typers: activeTypers });
  } catch (error) {
    return NextResponse.json({ typers: [] });
  }
}

// POST: Signal that current user is typing in section
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user || !session.user.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { sectionId } = await req.json();
    if (!sectionId) return NextResponse.json({ success: false });

    const userEmail = session.user.email.trim().toLowerCase();
    const userName = session.user.name || session.user.email;
    const userAvatar = session.user.image || null;

    await prisma.sectionTyping.upsert({
      where: {
        sectionId_userEmail: { sectionId, userEmail },
      },
      update: {
        userName,
        userAvatar,
        updatedAt: new Date(),
      },
      create: {
        sectionId,
        userEmail,
        userName,
        userAvatar,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Typing ping error:", error);
    return NextResponse.json({ success: false });
  }
}
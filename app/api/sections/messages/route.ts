import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

// GET: Fetch messages for a specific section and mark them as seen
export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const sectionId = searchParams.get("sectionId");

  if (!sectionId) {
    return NextResponse.json({ error: "Section ID is required" }, { status: 400 });
  }

  const userEmail = session.user.email?.trim().toLowerCase();

  try {
    // 1. Mark unread messages as seen by current user
    if (userEmail) {
      await prisma.sectionMessage.updateMany({
        where: {
          sectionId,
          NOT: { seenBy: { has: userEmail } },
        },
        data: {
          seenBy: { push: userEmail },
        },
      });
    }

    // 2. Fetch all messages in section
    const messages = await prisma.sectionMessage.findMany({
      where: { sectionId },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ messages });
  } catch (error) {
    console.error("Error fetching section messages:", error);
    return NextResponse.json({ error: "Failed to fetch messages" }, { status: 500 });
  }
}

// POST: Send a message to a section chat
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { sectionId, text } = await req.json();

    if (!sectionId || !text || !text.trim()) {
      return NextResponse.json({ error: "Section ID and message text required" }, { status: 400 });
    }

    const teacherEmail = process.env.TEACHER_EMAIL?.trim().toLowerCase();
    const userEmail = session.user.email?.trim().toLowerCase();
    const userRole = (session.user as any)?.role;

    const isTeacher =
      (teacherEmail && userEmail === teacherEmail) ||
      userRole === "TEACHER" ||
      userRole === "teacher";

    const senderEmail = session.user.email || "";

    const newMessage = await prisma.sectionMessage.create({
      data: {
        sectionId,
        text: text.trim(),
        senderEmail,
        senderName: session.user.name || session.user.email || "User",
        senderRole: isTeacher ? "TEACHER" : "STUDENT",
        senderAvatar: session.user.image || null,
        seenBy: [userEmail || senderEmail], // Initial sender has seen it
      },
    });

    return NextResponse.json({ success: true, message: newMessage });
  } catch (error) {
    console.error("Error posting section message:", error);
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
  }
}
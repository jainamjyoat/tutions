import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

// GET: Fetch section messages & auto-prune messages older than 4 days
export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user || !session.user.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const sectionId = searchParams.get("sectionId");

  if (!sectionId) {
    return NextResponse.json({ error: "sectionId is required" }, { status: 400 });
  }

  try {
    // ⏱️ Auto-delete messages older than 4 days
    const fourDaysAgo = new Date(Date.now() - 4 * 24 * 60 * 60 * 1000);
    await prisma.sectionMessage.deleteMany({
      where: { createdAt: { lt: fourDaysAgo } },
    });

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

// POST: Send a section message
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user || !session.user.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { sectionId, text } = await req.json();

    if (!sectionId || !text?.trim()) {
      return NextResponse.json({ error: "Section ID and message text are required" }, { status: 400 });
    }

    const userRole = ((session.user as any).role || "STUDENT").toUpperCase();

    const newMessage = await prisma.sectionMessage.create({
      data: {
        sectionId,
        senderEmail: session.user.email,
        senderName: session.user.name || "User",
        senderRole: userRole === "TEACHER" ? "TEACHER" : "STUDENT",
        senderAvatar: session.user.image || null,
        text: text.trim(),
        seenBy: [session.user.email],
      },
    });

    return NextResponse.json({ success: true, message: newMessage });
  } catch (error) {
    console.error("Error posting section message:", error);
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
  }
}

// DELETE: Delete a single section message (Strictly only the message sender)
export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user || !session.user.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await req.json();
    if (!id) {
      return NextResponse.json({ error: "Message ID is required" }, { status: 400 });
    }

    const existing = await prisma.sectionMessage.findUnique({ where: { id } });

    if (!existing) {
      return NextResponse.json({ success: true });
    }

    // 🔒 Strictly ensure only the person who sent the message can delete it
    if (existing.senderEmail.toLowerCase() !== session.user.email.toLowerCase()) {
      return NextResponse.json({ error: "You can only delete your own messages" }, { status: 403 });
    }

    await prisma.sectionMessage.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting section message:", error);
    return NextResponse.json({ error: "Failed to delete message" }, { status: 500 });
  }
}
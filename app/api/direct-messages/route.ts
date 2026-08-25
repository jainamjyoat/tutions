import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

// GET: Fetch direct messages & auto-prune messages older than 4 days
export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user || !session.user.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const studentIdParam = searchParams.get("studentId");
  const userRole = ((session.user as any).role || "").toUpperCase();

  try {
    // ⏱️ Auto-delete direct messages older than 4 days
    const fourDaysAgo = new Date(Date.now() - 4 * 24 * 60 * 60 * 1000);
    await prisma.directMessage.deleteMany({
      where: { createdAt: { lt: fourDaysAgo } },
    });

    if (userRole === "STUDENT") {
      const dbUser = await prisma.user.findFirst({
        where: { email: { equals: session.user.email, mode: "insensitive" } },
      });

      if (!dbUser) {
        return NextResponse.json({ messages: [] });
      }

      await prisma.directMessage.updateMany({
        where: { studentId: dbUser.id, senderRole: "TEACHER", read: false },
        data: { read: true },
      });

      const messages = await prisma.directMessage.findMany({
        where: { studentId: dbUser.id },
        orderBy: { createdAt: "asc" },
      });

      return NextResponse.json({ messages, studentId: dbUser.id });
    }

    if (studentIdParam) {
      const messages = await prisma.directMessage.findMany({
        where: { studentId: studentIdParam },
        orderBy: { createdAt: "asc" },
      });

      if (userRole === "TEACHER") {
        await prisma.directMessage.updateMany({
          where: { studentId: studentIdParam, senderRole: "STUDENT", read: false },
          data: { read: true },
        });
      }

      return NextResponse.json({ messages });
    }

    const allMessages = await prisma.directMessage.findMany({
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ messages: allMessages });
  } catch (error) {
    console.error("Error fetching direct messages:", error);
    return NextResponse.json({ error: "Failed to fetch messages" }, { status: 500 });
  }
}

// POST: Send direct message
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user || !session.user.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { studentId, text, attachmentUrl, attachmentName, attachmentType } = await req.json();

    if (!studentId || (!text?.trim() && !attachmentUrl)) {
      return NextResponse.json({ error: "Message content or attachment is required" }, { status: 400 });
    }

    const studentUser = await prisma.user.findUnique({
      where: { id: studentId },
      select: { id: true, name: true, email: true },
    });

    if (!studentUser) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    const userRole = ((session.user as any).role || "STUDENT").toUpperCase();

    const newMessage = await prisma.directMessage.create({
      data: {
        studentId: studentUser.id,
        studentEmail: studentUser.email || "",
        studentName: studentUser.name || "Student",
        senderEmail: session.user.email,
        senderName: session.user.name || (userRole === "TEACHER" ? "Teacher" : "Student"),
        senderRole: userRole === "TEACHER" ? "TEACHER" : "STUDENT",
        senderAvatar: session.user.image || null,
        text: text?.trim() || null,
        attachmentUrl: attachmentUrl || null,
        attachmentName: attachmentName || null,
        attachmentType: attachmentType || null,
        read: false,
      },
    });

    return NextResponse.json({ success: true, message: newMessage });
  } catch (error) {
    console.error("Error creating direct message:", error);
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
  }
}

// PATCH: Mark messages as read
export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { studentId, studentEmail } = await req.json();
    const userRole = ((session.user as any).role || "").toUpperCase();

    await prisma.directMessage.updateMany({
      where: {
        ...(studentId ? { studentId } : {}),
        ...(studentEmail ? { studentEmail } : {}),
        senderRole: userRole === "TEACHER" ? "STUDENT" : "TEACHER",
        read: false,
      },
      data: { read: true },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error marking messages as read:", error);
    return NextResponse.json({ error: "Failed to update read status" }, { status: 500 });
  }
}

// DELETE: Delete a direct message (Strictly only the message sender)
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

    const existing = await prisma.directMessage.findUnique({ where: { id } });

    if (!existing) {
      return NextResponse.json({ success: true });
    }

    // 🔒 Strictly ensure only the person who sent the message can delete it
    if (existing.senderEmail.toLowerCase() !== session.user.email.toLowerCase()) {
      return NextResponse.json({ error: "You can only delete your own messages" }, { status: 403 });
    }

    await prisma.directMessage.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting direct message:", error);
    return NextResponse.json({ error: "Failed to delete message" }, { status: 500 });
  }
}
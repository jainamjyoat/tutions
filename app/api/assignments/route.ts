import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const assignments = await prisma.assignment.findMany({
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ assignments });
  } catch (error) {
    console.error("Error fetching assignments:", error);
    return NextResponse.json({ error: "Failed to fetch assignments" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const teacherEmail = process.env.TEACHER_EMAIL?.trim().toLowerCase();
  const isTeacher = session?.user?.email?.trim().toLowerCase() === teacherEmail;

  if (!isTeacher) {
    return NextResponse.json({ error: "Forbidden: Only teachers can create assignments" }, { status: 403 });
  }

  try {
    const { title, subject, section, studentId, studentName, dueDate } = await req.json();

    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    const newAssignment = await prisma.assignment.create({
      data: {
        title,
        subject: subject || "General Learning",
        section: section || "No Section",
        studentId: studentId || null,
        studentName: studentName || null,
        dueDate: dueDate || "No Due Date",
        status: "active",
      },
    });

    return NextResponse.json({ success: true, assignment: newAssignment });
  } catch (error) {
    console.error("Error creating assignment:", error);
    return NextResponse.json({ error: "Failed to create assignment" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id, status } = await req.json();

    if (!id || !status) {
      return NextResponse.json({ error: "ID and status are required" }, { status: 400 });
    }

    const updatedAssignment = await prisma.assignment.update({
      where: { id },
      data: { status },
    });

    return NextResponse.json({ success: true, assignment: updatedAssignment });
  } catch (error) {
    console.error("Error updating assignment:", error);
    return NextResponse.json({ error: "Failed to update assignment" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  const teacherEmail = process.env.TEACHER_EMAIL?.trim().toLowerCase();
  const isTeacher = session?.user?.email?.trim().toLowerCase() === teacherEmail;

  if (!isTeacher) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { id } = await req.json();

    await prisma.assignment.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting assignment:", error);
    return NextResponse.json({ error: "Failed to delete assignment" }, { status: 500 });
  }
}
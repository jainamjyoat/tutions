import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

// GET: Fetch all assignments
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

// POST: Create Assignment
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized: Please log in" }, { status: 401 });
  }

  const teacherEmail = process.env.TEACHER_EMAIL?.trim().toLowerCase();
  const userEmail = session.user.email?.trim().toLowerCase();
  const userRole = (session.user as any)?.role;

  const isTeacher =
    (teacherEmail && userEmail === teacherEmail) ||
    userRole === "TEACHER" ||
    userRole === "teacher";

  if (!isTeacher) {
    return NextResponse.json(
      { error: "Forbidden: Only verified teachers can publish assignments" },
      { status: 403 }
    );
  }

  try {
    const body = await req.json();
    const { title, subject, section, studentId, studentName, dueDate } = body;

    if (!title || !title.trim()) {
      return NextResponse.json({ error: "Assignment Title is required" }, { status: 400 });
    }

    const newAssignment = await prisma.assignment.create({
      data: {
        title: title.trim(),
        subject: subject?.trim() || "General Learning",
        section: section?.trim() || "No Section",
        studentId: studentId && studentId.trim() !== "" ? studentId.trim() : null,
        studentName: studentName && studentName.trim() !== "" ? studentName.trim() : null,
        // Removed completedStudentIds: [] (Prisma schema defaults this to [] automatically)
        dueDate: dueDate?.trim() || "No Due Date",
        status: "active",
      },
    });

    return NextResponse.json({ success: true, assignment: newAssignment });
  } catch (error: any) {
    console.error("Error creating assignment in DB:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to save assignment to database" },
      { status: 500 }
    );
  }
}

// PATCH: Toggle Completion Status
export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id, status } = await req.json();
    const studentUser = session.user as any;
    const studentIdentifier = studentUser.id || studentUser.email;

    const assignment = await prisma.assignment.findUnique({ where: { id } });
    if (!assignment) {
      return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
    }

    let updatedCompletedIds = assignment.completedStudentIds || [];

    if (status === "completed") {
      if (!updatedCompletedIds.includes(studentIdentifier)) {
        updatedCompletedIds.push(studentIdentifier);
      }
    } else {
      updatedCompletedIds = updatedCompletedIds.filter((item) => item !== studentIdentifier);
    }

    const updatedAssignment = await prisma.assignment.update({
      where: { id },
      data: {
        status,
        completedStudentIds: updatedCompletedIds,
      },
    });

    return NextResponse.json({ success: true, assignment: updatedAssignment });
  } catch (error) {
    console.error("Error updating assignment completion:", error);
    return NextResponse.json({ error: "Failed to update assignment" }, { status: 500 });
  }
}

// DELETE: Remove Assignment
export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await req.json();
    await prisma.assignment.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting assignment:", error);
    return NextResponse.json({ error: "Failed to delete assignment" }, { status: 500 });
  }
}
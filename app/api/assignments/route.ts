import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

// GET: Fetch all assignments (with auto-delete expiration logic)
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // -------------------------------------------------------------
    // ⏱️ AUTO-DELETE EXPIRATION LOGIC
    // -------------------------------------------------------------
    
    // 🧪 FOR TESTING: 3 Minutes
    // const EXPIRATION_TIME_MS = 3 * 60 * 1000; 

    // 🚀 FOR PRODUCTION: 3 Days after creation
    const EXPIRATION_TIME_MS = 3 * 24 * 60 * 60 * 1000; 

    const expirationCutoff = new Date(Date.now() - EXPIRATION_TIME_MS);

    // Delete assignments created earlier than the expiration cutoff time
    await prisma.assignment.deleteMany({
      where: {
        createdAt: {
          lt: expirationCutoff,
        },
      },
    });

    // Fetch remaining active/valid assignments (including student submissions if schema has them)
    const assignments = await prisma.assignment.findMany({
      include: {
        submissions: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ assignments });
  } catch (error) {
    // Fallback if submissions relation isn't migrated yet
    try {
      const assignments = await prisma.assignment.findMany({
        orderBy: { createdAt: "desc" },
      });
      return NextResponse.json({ assignments });
    } catch (fallbackError) {
      console.error("Error fetching or cleaning up assignments:", fallbackError);
      return NextResponse.json({ error: "Failed to fetch assignments" }, { status: 500 });
    }
  }
}

// POST: Create Assignment (with Description & Teacher Attachment)
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
    const {
      title,
      description,
      subject,
      section,
      studentId,
      studentName,
      attachmentUrl,
      dueDate,
    } = body;

    if (!title || !title.trim()) {
      return NextResponse.json({ error: "Assignment Title is required" }, { status: 400 });
    }

    const newAssignment = await prisma.assignment.create({
      data: {
        title: title.trim(),
        description: description?.trim() || null,
        subject: subject?.trim() || "General Learning",
        section: section?.trim() || "No Section",
        studentId: studentId && studentId.trim() !== "" ? studentId.trim() : null,
        studentName: studentName && studentName.trim() !== "" ? studentName.trim() : null,
        attachmentUrl: attachmentUrl || null,
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

// PATCH: Toggle Student Completion Status (with optional Student Attachment)
export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id, status, studentAttachmentUrl } = await req.json();
    const studentUser = session.user as any;
    const studentIdentifier = studentUser.id || studentUser.email;
    const studentName = session.user.name || "Student";

    const assignment = await prisma.assignment.findUnique({ where: { id } });
    if (!assignment) {
      return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
    }

    let updatedCompletedIds = assignment.completedStudentIds || [];

    if (status === "completed") {
      if (!updatedCompletedIds.includes(studentIdentifier)) {
        updatedCompletedIds.push(studentIdentifier);
      }

      // Record student submission if Submission model exists
      try {
        await prisma.submission.create({
          data: {
            assignmentId: id,
            studentId: studentIdentifier,
            studentName: studentName,
            attachmentUrl: studentAttachmentUrl || null,
          },
        });
      } catch (subErr) {
        // Safe catch if Submission table isn't generated yet
      }
    } else {
      updatedCompletedIds = updatedCompletedIds.filter((item) => item !== studentIdentifier);

      try {
        await prisma.submission.deleteMany({
          where: {
            assignmentId: id,
            studentId: studentIdentifier,
          },
        });
      } catch (subErr) {
        // Safe catch
      }
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
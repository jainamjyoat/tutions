import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { assignmentId, studentId, studentEmail, remarks } = await req.json();

    if (!assignmentId || !studentId) {
      return NextResponse.json(
        { error: "assignmentId and studentId are required" },
        { status: 400 }
      );
    }

    // Upsert the teacher remark into the student submission record in PostgreSQL
    const submission = await prisma.submission.upsert({
      where: {
        assignmentId_studentId: {
          assignmentId,
          studentId,
        },
      },
      update: {
        remarks: remarks || null,
        ...(studentEmail && { studentEmail }),
      },
      create: {
        assignmentId,
        studentId,
        studentName: "Student",
        studentEmail: studentEmail || null,
        remarks: remarks || null,
      },
    });

    return NextResponse.json({ success: true, submission });
  } catch (error) {
    console.error("Failed to save remarks in /api/assignments/remarks:", error);
    return NextResponse.json(
      { error: "Failed to save remarks to database" },
      { status: 500 }
    );
  }
}
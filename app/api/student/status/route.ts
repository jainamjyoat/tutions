import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { StudentStatus, Role } from "@prisma/client";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userEmail = session.user.email?.trim().toLowerCase();
  const teacherEmail = process.env.TEACHER_EMAIL?.trim().toLowerCase();
  const isTeacher = userEmail === teacherEmail;

  // 1. TEACHER VIEW: Fetch ALL non-teacher accounts
  if (isTeacher && teacherEmail) {
    const students = await prisma.user.findMany({
      where: {
        NOT: {
          email: { equals: teacherEmail, mode: "insensitive" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const formattedStudents = students.map((s) => ({
      id: s.id,
      name: s.name || "Student",
      email: s.email,
      avatar: s.image,
      // Default to "pending" if status is null or missing
      status: (s.status || StudentStatus.PENDING).toString().toLowerCase(),
      createdAt: s.createdAt ? s.createdAt.toISOString() : new Date().toISOString(),
    }));

    return NextResponse.json({ students: formattedStudents });
  }

  // 2. STUDENT VIEW: Find or recreate student record
  let student = await prisma.user.findFirst({
    where: {
      email: { equals: userEmail, mode: "insensitive" },
    },
  });

  if (!student && userEmail) {
    student = await prisma.user.create({
      data: {
        email: userEmail,
        name: session.user.name,
        image: session.user.image,
        role: Role.STUDENT,
        status: StudentStatus.PENDING,
      },
    });
  }

  return NextResponse.json({
    student: student
      ? {
          ...student,
          status: (student.status || StudentStatus.PENDING).toString().toLowerCase(),
        }
      : null,
  });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const teacherEmail = process.env.TEACHER_EMAIL?.trim().toLowerCase();
  const isTeacher = session?.user?.email?.trim().toLowerCase() === teacherEmail;

  if (!isTeacher) {
    return NextResponse.json(
      { error: "Forbidden: Only teachers can authorize students" },
      { status: 403 }
    );
  }

  const { studentEmail, action } = await req.json();

  if (!studentEmail) {
    return NextResponse.json(
      { error: "Student email is required" },
      { status: 400 }
    );
  }

  const normalizedEmail = studentEmail.trim().toLowerCase();

  // 💡 Updated actions to support toggling between Grant Access and Revoke Access safely without deleting user records
  if (action === "approve" || action === "grant") {
    await prisma.user.updateMany({
      where: { email: { equals: normalizedEmail, mode: "insensitive" } },
      data: { status: StudentStatus.APPROVED, role: Role.STUDENT },
    });
  } else if (action === "decline" || action === "revoke") {
    // Updates status to DECLINED instead of deleting the database record entirely
    await prisma.user.updateMany({
      where: { email: { equals: normalizedEmail, mode: "insensitive" } },
      data: { status: StudentStatus.DECLINED },
    });
  } else if (action === "delete") {
    // Permanent deletion option if ever needed explicitly
    await prisma.session.deleteMany({
      where: { user: { email: { equals: normalizedEmail, mode: "insensitive" } } },
    });

    await prisma.account.deleteMany({
      where: { user: { email: { equals: normalizedEmail, mode: "insensitive" } } },
    });

    await prisma.user.deleteMany({
      where: { email: { equals: normalizedEmail, mode: "insensitive" } },
    });
  }

  // Return fresh list of all non-teacher students
  const updatedStudents = await prisma.user.findMany({
    where: {
      NOT: {
        email: { equals: teacherEmail, mode: "insensitive" },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const formattedStudents = updatedStudents.map((s) => ({
    id: s.id,
    name: s.name || "Student",
    email: s.email,
    avatar: s.image,
    status: (s.status || StudentStatus.PENDING).toString().toLowerCase(),
    createdAt: s.createdAt ? s.createdAt.toISOString() : new Date().toISOString(),
  }));

  return NextResponse.json({ success: true, students: formattedStudents });
}
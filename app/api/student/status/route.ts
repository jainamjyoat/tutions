import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userEmail = session.user.email?.toLowerCase();
  const isTeacher = userEmail === process.env.TEACHER_EMAIL?.toLowerCase();

  if (isTeacher) {
    const students = await prisma.user.findMany({
      where: { role: "STUDENT" },
      orderBy: { createdAt: "desc" },
    });

    const formattedStudents = students.map(
      (s: {
        id: string;
        name: string | null;
        email: string | null;
        image: string | null;
        status: string;
        createdAt: Date;
      }) => ({
        id: s.id,
        name: s.name || "Student",
        email: s.email,
        avatar: s.image,
        status: s.status.toLowerCase(),
        createdAt: s.createdAt.toISOString(),
      })
    );

    return NextResponse.json({ students: formattedStudents });
  }

  let student = await prisma.user.findUnique({
    where: { email: userEmail },
  });

  if (!student && userEmail) {
    student = await prisma.user.create({
      data: {
        email: userEmail,
        name: session.user.name,
        image: session.user.image,
        role: "STUDENT",
        status: "PENDING",
      },
    });
  }

  return NextResponse.json({
    student: student
      ? {
          ...student,
          status: student.status.toLowerCase(),
        }
      : null,
  });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const isTeacher =
    session?.user?.email?.toLowerCase() === process.env.TEACHER_EMAIL?.toLowerCase();

  if (!isTeacher) {
    return NextResponse.json(
      { error: "Forbidden: Only teachers can authorize students" },
      { status: 403 }
    );
  }

  const { studentEmail, action } = await req.json();

  if (!studentEmail) {
    return NextResponse.json({ error: "Student email is required" }, { status: 400 });
  }

  const normalizedEmail = studentEmail.trim().toLowerCase();

  if (action === "approve") {
    // Approve student access
    await prisma.user.updateMany({
      where: { email: normalizedEmail },
      data: { status: "APPROVED", role: "STUDENT" },
    });
  } else if (action === "decline" || action === "revoke" || action === "delete") {
    // 1. Delete linked NextAuth sessions and accounts first to avoid Foreign Key constraint errors
    await prisma.session.deleteMany({
      where: { user: { email: normalizedEmail } },
    });

    await prisma.account.deleteMany({
      where: { user: { email: normalizedEmail } },
    });

    // 2. Permanently delete the student User record from the database
    await prisma.user.deleteMany({
      where: { email: normalizedEmail },
    });
  }

  // Fetch updated student list to return fresh data to the frontend
  const updatedStudents = await prisma.user.findMany({
    where: { role: "STUDENT" },
    orderBy: { createdAt: "desc" },
  });

  const formattedStudents = updatedStudents.map(
    (s: {
      id: string;
      name: string | null;
      email: string | null;
      image: string | null;
      status: string;
      createdAt: Date;
    }) => ({
      id: s.id,
      name: s.name || "Student",
      email: s.email,
      avatar: s.image,
      status: s.status.toLowerCase(),
      createdAt: s.createdAt.toISOString(),
    })
  );

  return NextResponse.json({ success: true, students: formattedStudents });
}
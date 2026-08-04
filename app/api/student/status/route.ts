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

    // Added explicit type to 's' parameter to prevent implicit any error
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

  if (action === "approve") {
    await prisma.user.update({
      where: { email: studentEmail },
      data: { status: "APPROVED" },
    });
  } else if (action === "decline") {
    await prisma.user.update({
      where: { email: studentEmail },
      data: { status: "DECLINED" },
    });
  }

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
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized: Please log in" }, { status: 401 });
  }

  try {
    const { studentEmail, sectionId } = await req.json();

    if (!studentEmail) {
      return NextResponse.json({ error: "Student email is required" }, { status: 400 });
    }

    const cleanEmail = studentEmail.trim().toLowerCase();

    // 1. Find student using case-insensitive search
    const student = await prisma.user.findFirst({
      where: {
        email: {
          equals: cleanEmail,
          mode: "insensitive",
        },
      },
    });

    if (!student) {
      return NextResponse.json(
        { error: `Student record for "${studentEmail}" was not found in the database.` },
        { status: 404 }
      );
    }

    // 2. Update sectionId for the student
    const updatedUser = await prisma.user.update({
      where: { id: student.id },
      data: {
        sectionId: sectionId || null,
      },
    });

    return NextResponse.json({ success: true, user: updatedUser });
  } catch (error: any) {
    console.error("Error assigning student to section:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to assign student to section" },
      { status: 500 }
    );
  }
}
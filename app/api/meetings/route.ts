import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

// GET: Retrieve all scheduled meetings
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const meetings = await prisma.meeting.findMany({
      include: {
        student: {
          select: { id: true, name: true, email: true, image: true },
        },
      },
      orderBy: [{ date: "asc" }, { time: "asc" }],
    });

    return NextResponse.json({ meetings });
  } catch (error) {
    console.error("Error fetching meetings:", error);
    return NextResponse.json({ error: "Failed to fetch meetings" }, { status: 500 });
  }
}

// POST: Automatically generate Google Meet link and schedule meeting
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { studentId, topic, date, time, endTime, meetLink } = await req.json();

    if (!topic || !date || !time || !endTime) {
      return NextResponse.json(
        { error: "Topic, Date, Start Time, and End Time are required" },
        { status: 400 }
      );
    }

    let studentName = "General Session";
    let studentEmail = null;

    if (studentId) {
      const student = await prisma.user.findUnique({
        where: { id: studentId },
        select: { name: true, email: true },
      });
      if (student) {
        studentName = student.name || "Student";
        studentEmail = student.email;
      }
    }

    // ⚡ Automatically generate the Google Meet link tied to the teacher account host
    const teacherEmail = process.env.TEACHER_EMAIL?.trim() || session.user.email || "happytoddlers18@gmail.com";
    const generatedMeetLink =
      meetLink && meetLink.trim().startsWith("http")
        ? meetLink.trim()
        : `https://meet.google.com/new?authuser=${encodeURIComponent(teacherEmail)}`;

    const newMeeting = await prisma.meeting.create({
      data: {
        topic: topic.trim(),
        date,
        time,
        endTime,
        meetLink: generatedMeetLink,
        status: "upcoming",
        studentId: studentId || null,
        studentName,
        studentEmail,
      },
      include: {
        student: {
          select: { id: true, name: true, email: true, image: true },
        },
      },
    });

    return NextResponse.json({ success: true, meeting: newMeeting });
  } catch (error) {
    console.error("Error scheduling meeting:", error);
    return NextResponse.json({ error: "Failed to schedule meeting" }, { status: 500 });
  }
}

// PATCH: Reschedule or update status
export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id, status, date, time, endTime, topic, meetLink } = await req.json();

    if (!id) {
      return NextResponse.json({ error: "Meeting ID required" }, { status: 400 });
    }

    const updated = await prisma.meeting.update({
      where: { id },
      data: {
        ...(status && { status }),
        ...(date && { date }),
        ...(time && { time }),
        ...(endTime && { endTime }),
        ...(topic && { topic: topic.trim() }),
        ...(meetLink && { meetLink: meetLink.trim() }),
      },
      include: {
        student: {
          select: { id: true, name: true, email: true, image: true },
        },
      },
    });

    return NextResponse.json({ success: true, meeting: updated });
  } catch (error) {
    console.error("Error updating meeting:", error);
    return NextResponse.json({ error: "Failed to update meeting" }, { status: 500 });
  }
}

// DELETE: Cancel meeting
export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await req.json();
    await prisma.meeting.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting meeting:", error);
    return NextResponse.json({ error: "Failed to delete meeting" }, { status: 500 });
  }
}
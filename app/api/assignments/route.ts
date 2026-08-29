import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { createClient } from "@supabase/supabase-js";

// Initialize Supabase Client with Server-Only Keys
const supabaseUrl = process.env.SUPABASE_URL || "";
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  "";

const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

// Robust helper to extract relative bucket path (e.g. "attachments/filename.png")
function extractFilePath(url: string | null | undefined): string | null {
  if (!url || typeof url !== "string") return null;

  try {
    const cleanUrl = url.split("?")[0].trim();
    const bucketMarker = "/assignment-files/";

    if (cleanUrl.includes(bucketMarker)) {
      const path = cleanUrl.split(bucketMarker)[1];
      return decodeURIComponent(path);
    }

    if (cleanUrl.startsWith("attachments/")) {
      return decodeURIComponent(cleanUrl);
    }
  } catch (err) {
    console.error("Error extracting file path from URL:", url, err);
  }

  return null;
}

// Helper to remove files from Supabase Storage bucket
async function deleteFilesFromStorage(urls: (string | null | undefined)[]) {
  if (!supabase) return;

  const validPaths = Array.from(
    new Set(urls.map((u) => extractFilePath(u)).filter(Boolean) as string[])
  );

  if (validPaths.length === 0) return;

  console.log("Removing files from Supabase Storage 'assignment-files':", validPaths);

  try {
    const { data, error } = await supabase.storage
      .from("assignment-files")
      .remove(validPaths);

    if (error) {
      console.error("Supabase Storage deletion error:", error);
    } else {
      console.log("Successfully removed files from Storage:", data);
    }
  } catch (err) {
    console.error("Failed to execute storage deletion:", err);
  }
}

// GET: Fetch all assignments (Auto-deletes expired assignments + storage files)
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // ⏱️ EXPIRATION TIMER (3 Days)
    const EXPIRATION_TIME_MS = 3 * 24 * 60 * 60 * 1000;
    const expirationCutoff = new Date(Date.now() - EXPIRATION_TIME_MS);

    // 1. Fetch expired assignments to collect file URLs
    let expiredAssignments: any[] = [];
    try {
      expiredAssignments = await prisma.assignment.findMany({
        where: { createdAt: { lt: expirationCutoff } },
        include: { submissions: true },
      });
    } catch (e) {
      expiredAssignments = await prisma.assignment.findMany({
        where: { createdAt: { lt: expirationCutoff } },
      });
    }

    if (expiredAssignments.length > 0) {
      const fileUrlsToDelete: (string | null | undefined)[] = [];

      for (const assignment of expiredAssignments) {
        if (assignment.attachmentUrl) fileUrlsToDelete.push(assignment.attachmentUrl);
        if (Array.isArray(assignment.submissions)) {
          assignment.submissions.forEach((sub: any) => {
            if (sub?.attachmentUrl) fileUrlsToDelete.push(sub.attachmentUrl);
          });
        }
      }

      // Delete files from storage
      await deleteFilesFromStorage(fileUrlsToDelete);

      // Delete database records
      await prisma.assignment.deleteMany({
        where: { createdAt: { lt: expirationCutoff } },
      });
    }

    // Fetch active assignments with submissions and individual student remarks
    let assignments: any[] = [];
    try {
      assignments = await prisma.assignment.findMany({
        include: { submissions: true },
        orderBy: { createdAt: "desc" },
      });
    } catch (e) {
      assignments = await prisma.assignment.findMany({
        orderBy: { createdAt: "desc" },
      });
    }

    return NextResponse.json({ assignments });
  } catch (error) {
    console.error("Error in GET assignments:", error);
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
    const { title, description, subject, section, studentId, studentName, attachmentUrl, dueDate, remarks } = body;

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
        remarks: remarks || null,
        status: "active",
      },
      include: {
        submissions: true,
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

// PATCH: Toggle Student Completion Status OR Save Teacher Remarks
export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { id, assignmentId, studentId, studentName, studentEmail, remarks, status, studentAttachmentUrl } = body;

    const targetId = assignmentId || id;
    if (!targetId) {
      return NextResponse.json({ error: "Assignment ID is required" }, { status: 400 });
    }

    const studentUser = session.user as any;
    const activeStudentId = studentId || studentUser.id || studentUser.email;
    const activeStudentName = studentName || session.user.name || "Student";
    const activeStudentEmail = studentEmail || session.user.email || null;

    // 1. If teacher is saving Remarks for a specific student submission
    if (remarks !== undefined && activeStudentId) {
      await prisma.submission.upsert({
        where: {
          assignmentId_studentId: {
            assignmentId: targetId,
            studentId: activeStudentId,
          },
        },
        update: {
          remarks: remarks,
          ...(studentAttachmentUrl !== undefined && { attachmentUrl: studentAttachmentUrl }),
        },
        create: {
          assignmentId: targetId,
          studentId: activeStudentId,
          studentName: activeStudentName,
          studentEmail: activeStudentEmail,
          attachmentUrl: studentAttachmentUrl || null,
          remarks: remarks,
        },
      });
    }

    // 2. If student is toggling completion status
    if (status !== undefined) {
      const assignment = await prisma.assignment.findUnique({ where: { id: targetId } });
      if (!assignment) {
        return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
      }

      let updatedCompletedIds = assignment.completedStudentIds || [];

      if (status === "completed") {
        if (!updatedCompletedIds.includes(activeStudentId)) {
          updatedCompletedIds.push(activeStudentId);
        }

        try {
          await prisma.submission.upsert({
            where: {
              assignmentId_studentId: {
                assignmentId: targetId,
                studentId: activeStudentId,
              },
            },
            update: {
              attachmentUrl: studentAttachmentUrl || undefined,
            },
            create: {
              assignmentId: targetId,
              studentId: activeStudentId,
              studentName: activeStudentName,
              studentEmail: activeStudentEmail,
              attachmentUrl: studentAttachmentUrl || null,
            },
          });
        } catch (subErr) {
          console.error("Submission upsert error during completion toggle:", subErr);
        }
      } else if (status === "active") {
        updatedCompletedIds = updatedCompletedIds.filter((item) => item !== activeStudentId);

        try {
          const studentSubmissions = await prisma.submission.findMany({
            where: {
              assignmentId: targetId,
              studentId: activeStudentId,
            },
          });

          const subFileUrls = studentSubmissions.map((s) => s.attachmentUrl);
          await deleteFilesFromStorage(subFileUrls);

          await prisma.submission.deleteMany({
            where: {
              assignmentId: targetId,
              studentId: activeStudentId,
            },
          });
        } catch (subErr) {
          console.error("Submission deletion error during status revert:", subErr);
        }
      }

      await prisma.assignment.update({
        where: { id: targetId },
        data: {
          status,
          completedStudentIds: updatedCompletedIds,
          ...(remarks !== undefined && { remarks }),
        },
      });
    } else if (remarks !== undefined && !activeStudentId) {
      // General assignment remarks
      await prisma.assignment.update({
        where: { id: targetId },
        data: { remarks },
      });
    }

    // Fetch updated assignment with all submissions included
    const updatedAssignment = await prisma.assignment.findUnique({
      where: { id: targetId },
      include: { submissions: true },
    });

    return NextResponse.json({ success: true, assignment: updatedAssignment });
  } catch (error) {
    console.error("Error updating assignment/remarks in DB:", error);
    return NextResponse.json({ error: "Failed to update assignment" }, { status: 500 });
  }
}

// DELETE: Manual Delete Assignment & All Attached Bucket Files
export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await req.json();
    if (!id) {
      return NextResponse.json({ error: "Assignment ID is required" }, { status: 400 });
    }

    // 1. Fetch assignment and its submissions
    let assignment: any = null;
    try {
      assignment = await prisma.assignment.findUnique({
        where: { id },
        include: { submissions: true },
      });
    } catch (e) {
      assignment = await prisma.assignment.findUnique({
        where: { id },
      });
    }

    if (assignment) {
      const fileUrlsToDelete: (string | null | undefined)[] = [assignment.attachmentUrl];

      if (Array.isArray(assignment.submissions)) {
        assignment.submissions.forEach((sub: any) => {
          if (sub?.attachmentUrl) fileUrlsToDelete.push(sub.attachmentUrl);
        });
      }

      // 2. Delete files from Supabase Storage
      await deleteFilesFromStorage(fileUrlsToDelete);

      // 3. Delete database record
      await prisma.assignment.delete({ where: { id } });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting assignment:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to delete assignment" },
      { status: 500 }
    );
  }
}
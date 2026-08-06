"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useSession, signOut } from "next-auth/react";
import { uploadAssignmentFile } from "@/lib/upload";

type Student = {
  id: string;
  name: string;
  avatar: string;
  subject: string;
  time: string;
  status: "approved" | "pending" | "declined" | "active";
  progress: number;
  email: string;
  sectionId?: string | null;
  sectionName?: string | null;
};

type Submission = {
  id: string;
  studentId: string;
  studentName: string;
  attachmentUrl?: string | null;
  submittedAt: string;
};

type Assignment = {
  id: string;
  title: string;
  description?: string | null;
  subject: string;
  section: string;
  studentId?: string | null;
  studentName?: string | null;
  attachmentUrl?: string | null;
  completedStudentIds?: string[];
  submissions?: Submission[];
  dueDate: string;
  status: "active" | "completed";
};

type Section = {
  id: string;
  name: string;
  groups?: number;
  students?: number;
};

type Invite = {
  id: string;
  name: string;
  email: string;
  avatar: string;
  date: string;
};

type Meeting = {
  id: string;
  studentId: string;
  topic: string;
  date: string;
  time: string;
  meetLink: string;
};

type NotificationItem = {
  id: string;
  title: string;
  desc: string;
  time: string;
  read: boolean;
};

export default function TeacherDashboard() {
  const { data: session } = useSession();
  const [mounted, setMounted] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeView, setActiveView] = useState<
    "overview" | "approvals" | "students" | "assignments" | "sections" | "schedule"
  >("overview");

  // Notifications State
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  // Settings State
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [sessionReminders, setSessionReminders] = useState(true);
  const [defaultMeetLink, setDefaultMeetLink] = useState(
    "https://meet.google.com/abc-defg-hij"
  );

  const [students, setStudents] = useState<Student[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);

  // Assignments State
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [showAddAssignment, setShowAddAssignment] = useState(false);
  const [teacherFile, setTeacherFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const [newAssignment, setNewAssignment] = useState({
    title: "",
    description: "",
    subject: "General Learning",
    section: "No Section",
    studentId: "",
    studentName: "",
    dueDate: "",
  });

  // Sections State
  const [sections, setSections] = useState<Section[]>([]);
  const [showAddSection, setShowAddSection] = useState(false);
  const [newSection, setNewSection] = useState({ name: "" });

  // Assign Student to Section State
  const [targetSectionForAssign, setTargetSectionForAssign] = useState<Section | null>(null);
  const [selectedStudentToAssign, setSelectedStudentToAssign] = useState<string>("");

  // Meetings State
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  const [scheduleForm, setScheduleForm] = useState({
    studentId: "",
    topic: "",
    date: "",
    time: "",
    meetLink: "",
  });

  // 🔄 Fetch sections from database on mount
  useEffect(() => {
    async function fetchSections() {
      try {
        const res = await fetch("/api/sections");
        if (res.ok) {
          const data = await res.json();
          if (data.sections) {
            setSections(data.sections);
          }
        }
      } catch (err) {
        console.error("Failed to fetch sections from DB:", err);
      }
    }

    fetchSections();
  }, []);

  // 🔄 Fetch assignments from database on load & poll
  useEffect(() => {
    async function fetchAssignments() {
      try {
        const res = await fetch("/api/assignments");
        if (res.ok) {
          const data = await res.json();
          if (data.assignments) {
            setAssignments(data.assignments);
          }
        }
      } catch (err) {
        console.error("Failed to fetch assignments from DB:", err);
      }
    }

    fetchAssignments();
    const interval = setInterval(fetchAssignments, 5000);
    return () => clearInterval(interval);
  }, []);

  // 🔄 Fetch pending & registered students + calculate real-time dynamic progress
  useEffect(() => {
    setMounted(true);

    async function fetchStudentRequests() {
      try {
        const res = await fetch("/api/student/status");
        if (res.ok) {
          const data = await res.json();
          if (data.students) {
            const pendingList: Invite[] = data.students
              .filter((s: { status: string }) => s.status === "pending")
              .map((s: any) => ({
                id: s.id,
                name: s.name,
                email: s.email,
                avatar:
                  s.avatar ||
                  "https://lh3.googleusercontent.com/aida-public/AB6AXuCQp9hpI_rAqqxXQCtOSg0Hc_3TiA_bdldTgXInxdPmrafjmw6_NoI9zac3vx4KwNZx-EFfdx9g2VQ4uc7CqiPL6J83XDfF4M56jmFtM6W75p8ahCsHT-Yqyz7gosagkAyL0wU3ZN7n5XYDivqcwwNtqDBxNTI-n5F-w4R-AHmoUs4xLUSdYKHlj5Lh-rHM_J_POD362yLmVOsvZOXQ31AJ04510oNnZTZ0bAGTkw07m-XzrZ1JVrpPmA",
                date: new Date(s.createdAt || Date.now()).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                }),
              }));

            const studentList: Student[] = data.students
              .filter((s: { status: string }) => s.status !== "pending")
              .map((s: any) => {
                const targetAssignments = assignments.filter(
                  (a) =>
                    !a.studentId ||
                    a.studentId === s.id ||
                    a.studentName?.toLowerCase() === s.name.toLowerCase()
                );

                const completedCount = targetAssignments.filter(
                  (a) =>
                    a.completedStudentIds &&
                    (a.completedStudentIds.includes(s.id) || a.completedStudentIds.includes(s.email))
                ).length;

                const dynamicProgress =
                  targetAssignments.length > 0
                    ? Math.round((completedCount / targetAssignments.length) * 100)
                    : 0;

                return {
                  id: s.id,
                  name: s.name,
                  email: s.email,
                  avatar:
                    s.avatar ||
                    "https://lh3.googleusercontent.com/aida-public/AB6AXuCQp9hpI_rAqqxXQCtOSg0Hc_3TiA_bdldTgXInxdPmrafjmw6_NoI9zac3vx4KwNZx-EFfdx9g2VQ4uc7CqiPL6J83XDfF4M56jmFtM6W75p8ahCsHT-Yqyz7gosagkAyL0wU3ZN7n5XYDivqcwwNtqDBxNTI-n5F-w4R-AHmoUs4xLUSdYKHlj5Lh-rHM_J_POD362yLmVOsvZOXQ31AJ04510oNnZTZ0bAGTkw07m-XzrZ1JVrpPmA",
                  subject: "General Learning",
                  time: "Not Scheduled",
                  status: s.status as any,
                  progress: dynamicProgress,
                  sectionId: s.sectionId || s.section?.id || null,
                  sectionName: s.section?.name || null,
                };
              });

            setInvites(pendingList);
            setStudents(studentList);
          }
        }
      } catch (err) {
        console.error("Failed to fetch student requests:", err);
      }
    }

    fetchStudentRequests();
    const interval = setInterval(fetchStudentRequests, 5000);
    return () => clearInterval(interval);
  }, [assignments]);

  // 🔄 Assign / Unassign Student to Section
  const handleAssignStudentToSection = async (studentEmail: string, sectionId: string | null) => {
    try {
      const res = await fetch("/api/sections/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentEmail, sectionId }),
      });

      if (res.ok) {
        const assignedSection = sections.find((s) => s.id === sectionId);
        setStudents((prev) =>
          prev.map((s) =>
            s.email.toLowerCase() === studentEmail.toLowerCase()
              ? {
                  ...s,
                  sectionId: sectionId,
                  sectionName: assignedSection ? assignedSection.name : null,
                }
              : s
          )
        );

        if (selectedStudent?.email.toLowerCase() === studentEmail.toLowerCase()) {
          setSelectedStudent((prev) =>
            prev
              ? {
                  ...prev,
                  sectionId: sectionId,
                  sectionName: assignedSection ? assignedSection.name : null,
                }
              : null
          );
        }

        setTargetSectionForAssign(null);
        setSelectedStudentToAssign("");
      } else {
        alert("Failed to assign student to section.");
      }
    } catch (err) {
      console.error("Failed to assign student to section:", err);
    }
  };

  // 🔄 Toggle Student Access
  const handleToggleAccess = async (student: Student) => {
    const isApproved = student.status === "approved" || student.status === "active";
    const action = isApproved ? "revoke" : "grant";

    try {
      const res = await fetch("/api/student/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentEmail: student.email, action }),
      });

      if (res.ok) {
        const newStatus = isApproved ? "declined" : "approved";
        setStudents((prev) =>
          prev.map((s) =>
            s.email.toLowerCase() === student.email.toLowerCase()
              ? { ...s, status: newStatus }
              : s
          )
        );

        if (selectedStudent?.id === student.id) {
          setSelectedStudent((prev) => (prev ? { ...prev, status: newStatus } : null));
        }
      }
    } catch (err) {
      console.error("Failed to toggle student access:", err);
    }
  };

  // 🗑️ Delete Student
  const handleDeleteStudent = async (student: Student) => {
    if (
      !confirm(
        `Are you sure you want to permanently delete ${student.name} from the database? This action cannot be undone.`
      )
    ) {
      return;
    }

    try {
      const res = await fetch("/api/student/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentEmail: student.email, action: "delete" }),
      });

      if (res.ok) {
        setStudents((prev) =>
          prev.filter((s) => s.email.toLowerCase() !== student.email.toLowerCase())
        );
        setSelectedStudent(null);
      } else {
        alert("Failed to delete student from database.");
      }
    } catch (err) {
      console.error("Failed to delete student:", err);
      alert("Error occurred while deleting student from database.");
    }
  };

  // Create New Assignment with File Upload & Description
  const handleAddAssignment = async () => {
    if (!newAssignment.title || !newAssignment.title.trim()) {
      alert("Please enter an assignment title.");
      return;
    }

    setIsUploading(true);
    let uploadedUrl = null;

    if (teacherFile) {
      try {
        uploadedUrl = await uploadAssignmentFile(teacherFile);
      } catch (err) {
        console.error("File upload failed:", err);
      }
    }

    try {
      const res = await fetch("/api/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newAssignment.title.trim(),
          description: newAssignment.description.trim() || null,
          subject: newAssignment.subject || "General Learning",
          section: newAssignment.section || "No Section",
          studentId: newAssignment.studentId || null,
          studentName: newAssignment.studentName || null,
          attachmentUrl: uploadedUrl,
          dueDate: newAssignment.dueDate || "No Due Date",
        }),
      });

      const data = await res.json();

      if (res.ok && data.assignment) {
        setAssignments((prev) => [data.assignment, ...prev]);
        setNewAssignment({
          title: "",
          description: "",
          subject: "General Learning",
          section: "No Section",
          studentId: "",
          studentName: "",
          dueDate: "",
        });
        setTeacherFile(null);
        setShowAddAssignment(false);
      } else {
        alert(data.error || "Failed to publish assignment.");
      }
    } catch (err) {
      console.error("Failed to save assignment to database:", err);
      alert("Network error: Could not save assignment.");
    } finally {
      setIsUploading(false);
    }
  };

  // Toggle Assignment Status
  const handleToggleAssignmentStatus = async (id: string) => {
    const current = assignments.find((a) => a.id === id);
    if (!current) return;

    const nextStatus = current.status === "active" ? "completed" : "active";

    try {
      const res = await fetch("/api/assignments", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: nextStatus }),
      });

      if (res.ok) {
        setAssignments((prev) =>
          prev.map((a) => (a.id === id ? { ...a, status: nextStatus } : a))
        );
      }
    } catch (err) {
      console.error("Failed to update assignment status:", err);
    }
  };

  // Delete Assignment
  const handleDeleteAssignment = async (id: string) => {
    try {
      const res = await fetch("/api/assignments", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });

      if (res.ok) {
        setAssignments((prev) => prev.filter((a) => a.id !== id));
      }
    } catch (err) {
      console.error("Failed to delete assignment from database:", err);
    }
  };

  // Accept Invite
  const handleAcceptInvite = async (invite: Invite) => {
    try {
      const res = await fetch("/api/student/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentEmail: invite.email, action: "approve" }),
      });

      if (res.ok) {
        const newStudent: Student = {
          id: invite.id || Math.random().toString(36).slice(2, 11),
          name: invite.name,
          avatar: invite.avatar,
          subject: "General Learning",
          time: "Not Scheduled",
          status: "approved",
          progress: 0,
          email: invite.email,
        };
        setStudents((prev) => [...prev, newStudent]);
        setInvites((prev) => prev.filter((i) => i.email.toLowerCase() !== invite.email.toLowerCase()));
      }
    } catch (err) {
      console.error("Failed to approve student:", err);
    }
  };

  // Decline Invite
  const handleDeclineInvite = async (invite: Invite) => {
    try {
      const res = await fetch("/api/student/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentEmail: invite.email, action: "decline" }),
      });

      if (res.ok) {
        setInvites((prev) => prev.filter((i) => i.email.toLowerCase() !== invite.email.toLowerCase()));
      }
    } catch (err) {
      console.error("Failed to decline student:", err);
    }
  };

  const userImage = session?.user?.image;
  const userName = session?.user?.name || session?.user?.email || "Teacher";
  const userInitial = userName.charAt(0).toUpperCase();

  const unreadNotificationsCount = notifications.filter((n) => !n.read).length;

  const markNotificationAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const markAllNotificationsAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const openScheduleForStudent = (studentId: string) => {
    setScheduleForm((prev) => ({ ...prev, studentId, meetLink: defaultMeetLink }));
    setShowScheduleModal(true);
  };

  const handleScheduleMeet = () => {
    if (
      !scheduleForm.studentId ||
      !scheduleForm.topic ||
      !scheduleForm.date ||
      !scheduleForm.time ||
      !scheduleForm.meetLink
    )
      return;
    const meeting: Meeting = {
      id: Math.random().toString(36).slice(2, 11),
      studentId: scheduleForm.studentId,
      topic: scheduleForm.topic,
      date: scheduleForm.date,
      time: scheduleForm.time,
      meetLink: scheduleForm.meetLink,
    };
    setMeetings((prev) => [...prev, meeting]);
    setShowScheduleModal(false);
    setScheduleForm({ studentId: "", topic: "", date: "", time: "", meetLink: defaultMeetLink });
  };

  // ➕ Create Section in Database
  const handleAddSection = async () => {
    if (!newSection.name || !newSection.name.trim()) return;

    try {
      const res = await fetch("/api/sections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newSection.name.trim() }),
      });

      const data = await res.json();

      if (res.ok && data.section) {
        setSections((prev) => [...prev, data.section]);
        setNewSection({ name: "" });
        setShowAddSection(false);
      } else {
        alert(data.error || "Failed to create section.");
      }
    } catch (err) {
      console.error("Failed to create section:", err);
      alert("Network error: Could not create section.");
    }
  };

  // 🗑️ Delete Section from Database
  const handleDeleteSection = async (id: string) => {
    try {
      const res = await fetch("/api/sections", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });

      if (res.ok) {
        setSections((prev) => prev.filter((s) => s.id !== id));
      } else {
        alert("Failed to delete section.");
      }
    } catch (err) {
      console.error("Failed to delete section:", err);
    }
  };

  const navItems = [
    { id: "overview" as const, icon: "dashboard", label: "Overview" },
    {
      id: "approvals" as const,
      icon: "person_add",
      label: "Student Requests",
      badge: invites.length,
    },
    { id: "students" as const, icon: "groups", label: "Students" },
    { id: "assignments" as const, icon: "assignment", label: "Assignments" },
    { id: "sections" as const, icon: "school", label: "Sections" },
    { id: "schedule" as const, icon: "calendar_today", label: "Schedule" },
  ];

  const todayStr = mounted
    ? new Date().toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "";

  const renderModal = (
    open: boolean,
    onClose: () => void,
    title: string,
    children: React.ReactNode
  ) => {
    if (!open) return null;
    return (
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60] flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
        <div className="bg-white rounded-2xl p-5 sm:p-6 w-full max-w-[720px] shadow-2xl my-auto relative max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-5 sticky top-0 bg-white z-10 pb-2 border-b border-[#eae8e7]/50">
            <h3 className="font-quicksand font-bold text-lg sm:text-xl text-[#1b1c1c]">{title}</h3>
            <button
              onClick={onClose}
              className="text-[#727785] hover:text-[#1b1c1c] p-1.5 rounded-full hover:bg-[#f5f3f3] transition-colors"
              aria-label="Close modal"
            >
              <span className="material-symbols-outlined text-xl">close</span>
            </button>
          </div>
          {children}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-[#fbf9f8] text-[#1b1c1c] font-inter min-h-screen flex antialiased relative">
      {/* Sidebar Desktop */}
      <aside className="bg-white h-screen w-64 fixed left-0 top-0 shadow-sm flex flex-col py-6 px-3 z-50 border-r border-[#eae8e7] hidden md:flex">
        <div className="mb-8 px-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#005bbf] text-white flex items-center justify-center shrink-0 overflow-hidden font-quicksand font-bold text-base border-2 border-[#005bbf] shadow-xs">
              {userImage && !imageError ? (
                <Image
                  src={userImage}
                  alt={userName}
                  width={40}
                  height={40}
                  unoptimized
                  referrerPolicy="no-referrer"
                  onError={() => setImageError(true)}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span>{userInitial}</span>
              )}
            </div>

            <div>
              <h1 className="font-quicksand font-semibold text-lg text-[#005bbf] m-0 leading-tight">
                Happy Toddles
              </h1>
              <p className="text-xs text-[#414754] m-0">Academic Joy</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveView(item.id)}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl font-quicksand font-bold transition-all text-left ${
                activeView === item.id
                  ? "text-[#005bbf] bg-[#1a73e8]/10"
                  : "text-[#414754] hover:text-[#005bbf] hover:bg-[#f5f3f3]"
              }`}
            >
              <div className="flex items-center gap-3">
                <span
                  className="material-symbols-outlined text-xl"
                  style={activeView === item.id ? { fontVariationSettings: "'FILL' 1" } : {}}
                >
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </div>
              {item.badge !== undefined && item.badge > 0 && (
                <span className="bg-[#ac3509] text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                  {item.badge}
                </span>
              )}
            </button>
          ))}
        </nav>

        <div className="mt-auto px-2">
          <button
            onClick={() => setShowScheduleModal(true)}
            className="w-full bg-[#005bbf] text-white py-3.5 px-6 rounded-full font-quicksand font-bold hover:bg-[#004493] transition-colors flex items-center justify-center gap-2 shadow-sm"
          >
            <span
              className="material-symbols-outlined text-xl"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              play_arrow
            </span>
            <span>Start Session</span>
          </button>
        </div>
      </aside>

      {/* Mobile Drawer */}
      <div
        onClick={() => setMobileMenuOpen(false)}
        className={`fixed inset-0 bg-black/40 backdrop-blur-sm z-50 md:hidden transition-opacity ${
          mobileMenuOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      />
      <aside
        className={`fixed top-0 left-0 bottom-0 w-[280px] bg-white z-[51] md:hidden shadow-2xl flex flex-col justify-between p-6 transition-transform duration-300 ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div>
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-[#eae8e7]">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-[#005bbf] text-white flex items-center justify-center shrink-0 overflow-hidden font-quicksand font-bold text-sm border-2 border-[#005bbf]">
                {userImage && !imageError ? (
                  <Image
                    src={userImage}
                    alt={userName}
                    width={32}
                    height={32}
                    unoptimized
                    referrerPolicy="no-referrer"
                    onError={() => setImageError(true)}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span>{userInitial}</span>
                )}
              </div>
              <span className="font-quicksand font-bold text-lg text-[#005bbf]">
                Happy Toddles
              </span>
            </div>
            <button onClick={() => setMobileMenuOpen(false)} className="text-[#414754] p-1">
              <span className="material-symbols-outlined text-2xl">close</span>
            </button>
          </div>
          <nav className="space-y-1.5 font-quicksand font-bold text-sm text-[#414754]">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setActiveView(item.id);
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-3 rounded-xl text-left transition-colors ${
                  activeView === item.id
                    ? "bg-[#1a73e8]/10 text-[#005bbf]"
                    : "hover:bg-[#f5f3f3]"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-xl">{item.icon}</span>
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="bg-[#ac3509] text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                    {item.badge}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>
        <button
          onClick={() => {
            setMobileMenuOpen(false);
            setShowScheduleModal(true);
          }}
          className="w-full bg-[#005bbf] text-white py-3.5 rounded-full font-quicksand font-bold text-sm flex items-center justify-center gap-2 active:scale-95 transition-transform"
        >
          <span className="material-symbols-outlined text-lg">play_arrow</span>
          <span>Start Session</span>
        </button>
      </aside>

      {/* Main Content */}
      <main className="flex-1 md:ml-64 relative min-h-screen pb-12 w-full overflow-x-hidden">
        <header className="bg-white flex justify-between items-center w-full h-16 px-4 sm:px-6 md:px-12 shadow-sm sticky top-0 z-40 bg-white/90 backdrop-blur-md">
          <div className="flex items-center gap-2 sm:gap-3 md:hidden">
            <button onClick={() => setMobileMenuOpen(true)} className="text-[#005bbf] p-1.5 rounded-lg active:bg-[#f5f3f3]">
              <span className="material-symbols-outlined text-2xl">menu</span>
            </button>
            <span className="font-quicksand font-bold text-base sm:text-lg text-[#005bbf] truncate">
              Happy Toddles
            </span>
          </div>

          <div className="hidden md:flex items-center bg-[#f5f3f3] rounded-full px-4 py-2 border border-[#eae8e7] w-80 lg:w-96">
            <span className="material-symbols-outlined text-[#727785] mr-2 text-lg">search</span>
            <input
              type="text"
              placeholder="Search students, classes, or resources..."
              className="bg-transparent border-none focus:outline-none text-sm w-full"
            />
          </div>

          <div className="flex items-center gap-1 sm:gap-2 ml-auto">
            <div className="relative">
              <button
                onClick={() => {
                  setShowNotifications(!showNotifications);
                  setShowSettingsModal(false);
                }}
                className="text-[#414754] hover:text-[#005bbf] p-2 rounded-full hover:bg-[#f5f3f3] relative transition-colors"
                aria-label="Notifications"
              >
                <span className="material-symbols-outlined text-xl block">notifications</span>
                {unreadNotificationsCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-[#ac3509] rounded-full border-2 border-white" />
                )}
              </button>

              {showNotifications && (
                <div className="fixed inset-x-3 top-16 sm:absolute sm:inset-auto sm:right-0 sm:top-full sm:mt-2 sm:w-96 bg-white rounded-2xl shadow-xl border border-[#eae8e7] z-50 p-4 animate-fadeIn">
                  <div className="flex items-center justify-between pb-3 border-b border-[#eae8e7] mb-3">
                    <div className="flex items-center gap-2">
                      <h4 className="font-quicksand font-bold text-base text-[#1b1c1c]">Notifications</h4>
                      {unreadNotificationsCount > 0 && (
                        <span className="bg-[#005bbf]/10 text-[#005bbf] text-xs font-bold px-2 py-0.5 rounded-full">
                          {unreadNotificationsCount} new
                        </span>
                      )}
                    </div>
                    {unreadNotificationsCount > 0 && (
                      <button
                        onClick={markAllNotificationsAsRead}
                        className="text-xs text-[#005bbf] hover:underline font-semibold"
                      >
                        Mark all as read
                      </button>
                    )}
                  </div>
                  <div className="space-y-2.5 max-h-72 sm:max-h-80 overflow-y-auto pr-1">
                    {notifications.length === 0 ? (
                      <p className="text-xs text-[#727785] text-center py-6">No notifications</p>
                    ) : (
                      notifications.map((n) => (
                        <div
                          key={n.id}
                          onClick={() => markNotificationAsRead(n.id)}
                          className={`p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                            n.read
                              ? "bg-white border-[#eae8e7] opacity-75"
                              : "bg-[#f5f3f3] border-[#005bbf]/20 font-medium"
                          }`}
                        >
                          <div className="flex justify-between items-start gap-2 mb-1">
                            <p className="font-quicksand font-bold text-[#1b1c1c] text-xs">{n.title}</p>
                            <span className="text-[10px] text-[#727785] shrink-0">{n.time}</span>
                          </div>
                          <p className="text-[#414754] text-[11px] leading-relaxed">{n.desc}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={() => {
                setShowSettingsModal(true);
                setShowNotifications(false);
              }}
              className="text-[#414754] hover:text-[#005bbf] p-2 rounded-full hover:bg-[#f5f3f3] transition-colors"
              aria-label="Settings"
            >
              <span className="material-symbols-outlined text-xl block">settings</span>
            </button>
          </div>
        </header>

        <div className="p-4 sm:p-6 md:p-10 lg:p-12 max-w-[1280px] mx-auto space-y-6 sm:space-y-8">
          {/* OVERVIEW VIEW */}
          {activeView === "overview" && (
            <>
              <section className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 sm:gap-4">
                <div>
                  <h2 className="font-quicksand font-bold text-xl sm:text-2xl md:text-3xl text-[#1b1c1c] mb-1">
                    Welcome back, {session?.user?.name || "Teacher"}! 👋
                  </h2>
                  <p className="font-inter text-xs sm:text-sm md:text-base text-[#414754]">
                    You have {students.filter((s) => s.status === "approved" || s.status === "active").length} authorized students and {meetings.length} meetings scheduled.
                  </p>
                </div>
                <div className="text-left sm:text-right mt-2 sm:mt-0">
                  <p className="font-inter font-semibold text-[10px] sm:text-xs text-[#727785] uppercase tracking-wider">
                    Today&apos;s Date
                  </p>
                  <p className="font-quicksand font-bold text-lg sm:text-xl text-[#005bbf]">{todayStr}</p>
                </div>
              </section>

              {invites.length > 0 && (
                <div className="bg-[#005bbf]/5 border border-[#005bbf]/20 rounded-2xl p-3.5 sm:p-4 shadow-xs">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-quicksand font-bold text-sm text-[#005bbf] flex items-center gap-2">
                      <span className="material-symbols-outlined text-lg">person_add</span>
                      Pending Authorization Requests ({invites.length})
                    </h3>
                    <button
                      onClick={() => setActiveView("approvals")}
                      className="text-xs text-[#005bbf] font-bold hover:underline"
                    >
                      View All
                    </button>
                  </div>
                  <div className="space-y-2">
                    {invites.map((invite) => (
                      <div
                        key={invite.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between bg-white rounded-xl p-3 gap-3 shadow-xs"
                      >
                        <div className="flex items-center gap-3">
                          <Image
                            src={invite.avatar}
                            alt={invite.name}
                            width={36}
                            height={36}
                            unoptimized
                            className="w-9 h-9 rounded-full object-cover shrink-0 border border-[#005bbf]"
                          />
                          <div className="min-w-0">
                            <p className="font-quicksand font-bold text-sm text-[#1b1c1c] truncate">
                              {invite.name}
                            </p>
                            <p className="text-xs text-[#727785] truncate">{invite.email}</p>
                          </div>
                        </div>
                        <div className="flex gap-2 w-full sm:w-auto">
                          <button
                            onClick={() => handleAcceptInvite(invite)}
                            className="flex-1 sm:flex-none bg-[#005bbf] text-white px-4 py-1.5 rounded-full text-xs font-quicksand font-bold hover:bg-[#004493] transition-colors active:scale-95"
                          >
                            Authorize Access
                          </button>
                          <button
                            onClick={() => handleDeclineInvite(invite)}
                            className="flex-1 sm:flex-none border border-[#eae8e7] text-[#414754] px-4 py-1.5 rounded-full text-xs font-quicksand font-bold hover:bg-[#f5f3f3] transition-colors"
                          >
                            Decline
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-12 gap-5 sm:gap-6">
                <div className="md:col-span-8 space-y-5 sm:space-y-6">
                  <div className="bg-white/80 backdrop-blur-md rounded-[20px] sm:rounded-[24px] p-4 sm:p-6 border border-white/40 shadow-[0_4px_12px_rgba(26,115,232,0.05)]">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
                      <h3 className="font-quicksand font-semibold text-lg sm:text-xl text-[#1b1c1c] flex items-center gap-2">
                        <span
                          className="material-symbols-outlined text-[#005bbf]"
                          style={{ fontVariationSettings: "'FILL' 1" }}
                        >
                          event
                        </span>
                        Today&apos;s Schedule
                      </h3>
                      <button
                        onClick={() => setShowScheduleModal(true)}
                        className="flex items-center justify-center gap-1.5 bg-[#005bbf] text-white px-4 py-2 rounded-full font-quicksand font-bold text-xs hover:bg-[#004493] transition-colors w-full sm:w-auto"
                      >
                        <span className="material-symbols-outlined text-base">add</span>
                        <span>Schedule Meet</span>
                      </button>
                    </div>
                    <div className="space-y-3.5">
                      {students.map((student) => (
                        <div
                          key={student.id}
                          className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3.5 sm:p-4 bg-[#f5f3f3] rounded-2xl border border-[#eae8e7] hover:border-[#005bbf]/30 transition-colors gap-3 sm:gap-4"
                        >
                          <div className="flex items-center gap-3.5">
                            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full p-0.5 border-2 border-[#005bbf] bg-white relative shrink-0">
                              <Image
                                src={student.avatar}
                                alt={student.name}
                                width={48}
                                height={48}
                                unoptimized
                                className="w-full h-full rounded-full object-cover"
                              />
                            </div>
                            <div>
                              <h4 className="font-quicksand font-bold text-sm sm:text-base text-[#1b1c1c]">
                                {student.name}
                              </h4>
                              <button
                                onClick={() => setSelectedStudent(student)}
                                className="text-xs text-[#005bbf] hover:underline font-semibold block text-left"
                              >
                                View Profile
                              </button>
                              <p className="text-[11px] sm:text-xs text-[#414754] flex items-center gap-1 mt-0.5">
                                <span className="material-symbols-outlined text-xs">schedule</span>
                                <span>{student.time}</span>
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-between sm:justify-end pt-2 sm:pt-0 border-t sm:border-t-0 border-[#eae8e7]">
                            <span className="bg-[#005bbf]/10 text-[#005bbf] px-3 py-1 rounded-full font-inter font-semibold text-xs">
                              {student.subject}
                            </span>
                            <button
                              onClick={() => openScheduleForStudent(student.id)}
                              className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#005bbf] text-white flex items-center justify-center hover:opacity-90 transition-opacity shadow-sm shrink-0"
                              aria-label={`Schedule meeting for ${student.name}`}
                            >
                              <span
                                className="material-symbols-outlined text-lg"
                                style={{ fontVariationSettings: "'FILL' 1" }}
                              >
                                videocam
                              </span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-6">
                    {/* 🌟 Dynamic Recent Activity Stream */}
                    <div className="bg-white/80 backdrop-blur-md rounded-[20px] sm:rounded-[24px] p-4 sm:p-6 border border-white/40 shadow-[0_4px_12px_rgba(26,115,232,0.05)]">
                      <h4 className="font-quicksand font-bold text-base text-[#1b1c1c] mb-4 flex items-center gap-2">
                        <span className="material-symbols-outlined text-[#795900]">history</span>
                        Recent Activity
                      </h4>
                      <ul className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
                        {assignments.flatMap((a) =>
                          (a.completedStudentIds || []).map((studentRef) => {
                            const student = students.find(
                              (s) => s.id === studentRef || s.email === studentRef
                            );
                            const name = student ? student.name : a.studentName || "A student";

                            return (
                              <li key={`${a.id}-${studentRef}`} className="flex items-start gap-3">
                                <div className="w-8 h-8 rounded-full bg-[#fe6f42]/10 flex items-center justify-center shrink-0">
                                  <span className="material-symbols-outlined text-[#ac3509] text-base">
                                    star
                                  </span>
                                </div>
                                <div>
                                  <p className="text-xs sm:text-sm text-[#1b1c1c]">
                                    <strong>{name}</strong> completed <em>&quot;{a.title}&quot;</em>
                                  </p>
                                  <span className="text-[11px] text-[#727785]">Recently completed</span>
                                </div>
                              </li>
                            );
                          })
                        )}
                        {assignments.every((a) => !a.completedStudentIds || a.completedStudentIds.length === 0) && (
                          <p className="text-xs text-[#727785] text-center py-4">
                            No recent completion activity yet.
                          </p>
                        )}
                      </ul>
                    </div>

                    {/* 📝 Overview Assignments Widget */}
                    <div className="bg-white/80 backdrop-blur-md rounded-[20px] sm:rounded-[24px] p-4 sm:p-6 border border-white/40 shadow-[0_4px_12px_rgba(26,115,232,0.05)]">
                      <div className="flex justify-between items-center mb-4">
                        <h4 className="font-quicksand font-bold text-base text-[#1b1c1c] flex items-center gap-2">
                          <span className="material-symbols-outlined text-[#005bbf]">
                            assignment
                          </span>
                          Active Assignments
                        </h4>
                        <button
                          onClick={() => setShowAddAssignment(true)}
                          className="text-[#005bbf] hover:bg-[#005bbf]/5 p-1 rounded-full"
                          aria-label="Create new assignment"
                        >
                          <span className="material-symbols-outlined text-lg">add_circle</span>
                        </button>
                      </div>
                      <div className="space-y-2">
                        {assignments.filter((a) => a.status === "active").length === 0 ? (
                          <p className="text-xs text-[#727785] py-2">No active assignments.</p>
                        ) : (
                          assignments
                            .filter((a) => a.status === "active")
                            .map((a) => (
                              <div
                                key={a.id}
                                className="flex items-center justify-between p-2.5 bg-[#f5f3f3] rounded-xl"
                              >
                                <div className="min-w-0 pr-2">
                                  <p className="font-inter font-semibold text-xs text-[#1b1c1c] truncate">
                                    {a.title}
                                  </p>
                                  <p className="text-[11px] text-[#727785] truncate">
                                    {a.section} • Due {a.dueDate}
                                  </p>
                                </div>
                                <span className="text-[10px] bg-[#005bbf]/10 text-[#005bbf] px-2 py-0.5 rounded-full font-semibold shrink-0">
                                  {a.subject}
                                </span>
                              </div>
                            ))
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 📊 Real-Time Dynamic Student Progress Area */}
                <div className="md:col-span-4 space-y-5 sm:space-y-6">
                  <div className="bg-white/80 backdrop-blur-md rounded-[20px] sm:rounded-[24px] p-4 sm:p-6 border border-white/40 shadow-[0_4px_12px_rgba(26,115,232,0.05)]">
                    <h3 className="font-quicksand font-bold text-lg sm:text-xl text-[#1b1c1c] mb-5 flex items-center gap-2">
                      <span
                        className="material-symbols-outlined text-[#ac3509]"
                        style={{ fontVariationSettings: "'FILL' 1" }}
                      >
                        trending_up
                      </span>
                      Student Progress
                    </h3>
                    <div className="space-y-5">
                      {students.map((s) => (
                        <div key={s.id}>
                          <div className="flex justify-between items-end mb-1.5">
                            <span className="font-quicksand font-bold text-xs text-[#1b1c1c]">
                              {s.name}
                            </span>
                            <span className="font-inter font-semibold text-xs text-[#005bbf]">
                              {s.progress}%
                            </span>
                          </div>
                          <div className="h-2.5 w-full bg-[#eae8e7] rounded-full overflow-hidden">
                            <div
                              className="h-full bg-[#005bbf] rounded-full transition-all duration-500"
                              style={{ width: `${s.progress}%` }}
                            />
                          </div>
                        </div>
                      ))}
                      {students.length === 0 && (
                        <p className="text-xs text-[#727785] text-center py-4">No registered students yet.</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* DEDICATED STUDENT REQUESTS VIEW */}
          {activeView === "approvals" && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="font-quicksand font-bold text-xl sm:text-2xl text-[#1b1c1c]">
                    Student Authorization Requests ({invites.length})
                  </h2>
                  <p className="text-xs sm:text-sm text-[#727785] mt-1">
                    Review and authorize new Google account sign-ups attempting to access Happy Toddles.
                  </p>
                </div>
              </div>

              {invites.length === 0 ? (
                <div className="bg-white rounded-[20px] p-8 sm:p-12 text-center border border-[#eae8e7]">
                  <span className="material-symbols-outlined text-4xl text-[#005bbf] mb-2">
                    check_circle
                  </span>
                  <h3 className="font-quicksand font-bold text-base text-[#1b1c1c]">No Pending Requests</h3>
                  <p className="text-xs sm:text-sm text-[#727785] mt-1">
                    All student sign-up requests have been reviewed.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {invites.map((invite) => (
                    <div
                      key={invite.id}
                      className="bg-white rounded-[20px] p-5 border border-[#eae8e7] shadow-xs flex flex-col justify-between gap-4"
                    >
                      <div className="flex items-start gap-3.5">
                        <Image
                          src={invite.avatar}
                          alt={invite.name}
                          width={48}
                          height={48}
                          unoptimized
                          className="w-12 h-12 rounded-full object-cover border-2 border-[#005bbf] shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex justify-between items-start">
                            <h4 className="font-quicksand font-bold text-base text-[#1b1c1c] truncate">
                              {invite.name}
                            </h4>
                            <span className="text-[10px] text-[#727785] bg-[#f5f3f3] px-2 py-0.5 rounded-full shrink-0">
                              {invite.date}
                            </span>
                          </div>
                          <p className="text-xs text-[#727785] truncate mt-0.5">{invite.email}</p>
                          <span className="inline-block mt-2 bg-[#fe6f42]/10 text-[#ac3509] text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                            Pending Authorization
                          </span>
                        </div>
                      </div>

                      <div className="flex gap-2.5 pt-2 border-t border-[#eae8e7]">
                        <button
                          onClick={() => handleAcceptInvite(invite)}
                          className="flex-1 bg-[#005bbf] hover:bg-[#004493] text-white py-2 rounded-xl text-xs font-quicksand font-bold transition-all shadow-xs active:scale-95"
                        >
                          Authorize Access
                        </button>
                        <button
                          onClick={() => handleDeclineInvite(invite)}
                          className="flex-1 bg-[#f5f3f3] hover:bg-[#eae8e7] text-[#414754] py-2 rounded-xl text-xs font-quicksand font-bold transition-colors"
                        >
                          Decline
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* STUDENTS VIEW */}
          {activeView === "students" && (
            <div className="space-y-5 sm:space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <h2 className="font-quicksand font-bold text-xl sm:text-2xl text-[#1b1c1c]">
                  Registered Students ({students.length})
                </h2>
                {invites.length > 0 && (
                  <button
                    onClick={() => setActiveView("approvals")}
                    className="bg-[#ac3509]/10 text-[#ac3509] hover:bg-[#ac3509]/20 px-4 py-2 rounded-full font-quicksand font-bold text-xs flex items-center gap-2 self-start sm:self-auto"
                  >
                    <span className="material-symbols-outlined text-base">person_add</span>
                    <span>{invites.length} Pending Approval</span>
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {students.map((student) => {
                  const isApproved = student.status === "approved" || student.status === "active";

                  return (
                    <div
                      key={student.id}
                      onClick={() => setSelectedStudent(student)}
                      className="bg-white rounded-[20px] p-4 sm:p-5 border border-[#eae8e7] hover:border-[#005bbf]/30 hover:shadow-md transition-all cursor-pointer relative group flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center gap-3.5 mb-3">
                          <Image
                            src={student.avatar}
                            alt={student.name}
                            width={56}
                            height={56}
                            unoptimized
                            className="w-12 h-12 sm:w-14 sm:h-14 rounded-full object-cover border-2 border-[#005bbf] shrink-0"
                          />
                          <div className="min-w-0 flex-1">
                            <h3 className="font-quicksand font-bold text-sm sm:text-base text-[#1b1c1c] truncate">
                              {student.name}
                            </h3>
                            <p className="text-xs text-[#727785] truncate">{student.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span
                            className={`px-2.5 py-1 rounded-full font-semibold capitalize ${
                              isApproved
                                ? "bg-[#005bbf]/10 text-[#005bbf]"
                                : "bg-[#ac3509]/10 text-[#ac3509]"
                            }`}
                          >
                            {isApproved ? "Approved" : "Access Revoked"}
                          </span>
                          <span className="text-[#727785]">{student.time}</span>
                        </div>
                        <div className="mt-3">
                          <div className="h-2 w-full bg-[#eae8e7] rounded-full overflow-hidden">
                            <div
                              className="h-full bg-[#005bbf] rounded-full"
                              style={{ width: `${student.progress}%` }}
                            />
                          </div>
                          <p className="text-[11px] text-[#727785] mt-1 text-right">
                            {student.progress}% complete
                          </p>
                        </div>
                      </div>

                      {/* 🟢 / 🔴 OUTSIDE CARD BUTTON */}
                      <div className="mt-4 pt-3 border-t border-[#eae8e7] flex items-center justify-between">
                        <span className="text-[13px] font-semibold text-[#005bbf]">Click card for details</span>
                        {isApproved ? (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleAccess(student);
                            }}
                            className="text-xs text-[#ac3509] hover:bg-[#ac3509]/10 border border-[#ac3509]/20 px-3 py-1.5 rounded-xl font-quicksand font-bold flex items-center gap-1 transition-colors"
                          >
                            <span className="material-symbols-outlined text-base">person_remove</span>
                            <span>Revoke Access</span>
                          </button>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleAccess(student);
                            }}
                            className="text-xs text-[#0f9d58] bg-[#0f9d58]/10 hover:bg-[#0f9d58]/20 border border-[#0f9d58]/30 px-3 py-1.5 rounded-xl font-quicksand font-bold flex items-center gap-1.5 transition-colors shadow-2xs"
                          >
                            <span className="material-symbols-outlined text-base">how_to_reg</span>
                            <span>Grant Access</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 📝 ASSIGNMENTS VIEW */}
          {activeView === "assignments" && (
            <div className="space-y-5 sm:space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="font-quicksand font-bold text-xl sm:text-2xl text-[#1b1c1c]">
                  Assignments &amp; Activities ({assignments.length})
                </h2>
                <button
                  onClick={() => setShowAddAssignment(true)}
                  className="bg-[#005bbf] text-white px-4 sm:px-5 py-2 sm:py-2.5 rounded-full font-quicksand font-bold text-xs sm:text-sm hover:bg-[#004493] flex items-center gap-1.5 sm:gap-2 shadow-sm"
                >
                  <span className="material-symbols-outlined text-base">add</span>
                  <span>Create Assignment</span>
                </button>
              </div>

              {assignments.length === 0 ? (
                <div className="bg-white rounded-[20px] p-8 sm:p-12 text-center border border-[#eae8e7]">
                  <span className="material-symbols-outlined text-4xl text-[#727785] mb-2">
                    assignment
                  </span>
                  <h3 className="font-quicksand font-bold text-base text-[#1b1c1c]">
                    No Assignments Posted Yet
                  </h3>
                  <p className="text-xs sm:text-sm text-[#727785] mt-1">
                    Click &quot;Create Assignment&quot; to publish tasks for your sections or specific students.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {assignments.map((assignment) => (
                    <div
                      key={assignment.id}
                      className="bg-white rounded-[20px] p-5 border border-[#eae8e7] shadow-xs flex flex-col justify-between gap-4"
                    >
                      <div>
                        <div className="flex justify-between items-start mb-2">
                          <span className="bg-[#005bbf]/10 text-[#005bbf] text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                            {assignment.subject}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              assignment.status === "completed"
                                ? "bg-[#0f9d58]/10 text-[#0f9d58]"
                                : "bg-[#795900]/10 text-[#795900]"
                            }`}
                          >
                            {assignment.status === "completed" ? "Completed" : "Active"}
                          </span>
                        </div>
                        <h3 className="font-quicksand font-bold text-base text-[#1b1c1c]">
                          {assignment.title}
                        </h3>

                        {/* Optional Description */}
                        {assignment.description && (
                          <p className="text-xs text-[#414754] my-2 bg-[#f5f3f3] p-2.5 rounded-xl border border-[#eae8e7]/60">
                            {assignment.description}
                          </p>
                        )}

                        {/* Optional Teacher Attachment Download */}
                        {assignment.attachmentUrl && (
                          <a
                            href={assignment.attachmentUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-xs text-[#005bbf] font-bold hover:underline my-1.5"
                          >
                            <span className="material-symbols-outlined text-sm">attach_file</span>
                            View Attached File
                          </a>
                        )}

                        <div className="mt-2 space-y-1">
                          <p className="text-xs text-[#727785] flex items-center gap-1">
                            <span className="material-symbols-outlined text-sm">school</span>
                            <span>{assignment.section}</span>
                          </p>
                          {assignment.studentName && (
                            <p className="text-xs font-semibold text-[#005bbf] flex items-center gap-1">
                              <span className="material-symbols-outlined text-sm">person</span>
                              <span>Assigned to: {assignment.studentName}</span>
                            </p>
                          )}
                          <p className="text-xs text-[#727785] flex items-center gap-1">
                            <span className="material-symbols-outlined text-sm">event</span>
                            <span>Due: {assignment.dueDate}</span>
                          </p>
                        </div>

                        {/* Submitted Files List */}
                        {assignment.submissions && assignment.submissions.length > 0 && (
                          <div className="mt-3 pt-2 border-t border-[#eae8e7]">
                            <p className="text-xs font-bold text-[#1b1c1c] mb-1">Student Submissions:</p>
                            <div className="space-y-1 max-h-24 overflow-y-auto">
                              {assignment.submissions.map((sub) => (
                                <div key={sub.id} className="text-[11px] flex justify-between items-center bg-[#f5f3f3] px-2 py-1 rounded-lg">
                                  <span className="font-semibold text-[#1b1c1c]">{sub.studentName}</span>
                                  {sub.attachmentUrl ? (
                                    <a href={sub.attachmentUrl} target="_blank" rel="noopener noreferrer" className="text-[#005bbf] hover:underline font-bold">
                                      File 📄
                                    </a>
                                  ) : (
                                    <span className="text-[#0f9d58]">Done ✓</span>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2 pt-3 border-t border-[#eae8e7]">
                        <button
                          onClick={() => handleToggleAssignmentStatus(assignment.id)}
                          className={`flex-1 py-2 rounded-xl text-xs font-quicksand font-bold transition-all ${
                            assignment.status === "completed"
                              ? "bg-[#f5f3f3] text-[#414754] hover:bg-[#eae8e7]"
                              : "bg-[#005bbf] text-white hover:bg-[#004493]"
                          }`}
                        >
                          {assignment.status === "completed" ? "Mark Active" : "Mark Complete"}
                        </button>
                        <button
                          onClick={() => handleDeleteAssignment(assignment.id)}
                          className="p-2 text-[#ac3509] hover:bg-[#ac3509]/10 rounded-xl transition-colors"
                          aria-label="Delete assignment"
                        >
                          <span className="material-symbols-outlined text-lg">delete</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 🏫 SECTIONS VIEW WITH ADD STUDENT OPTION */}
          {activeView === "sections" && (
            <div className="space-y-5 sm:space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="font-quicksand font-bold text-xl sm:text-2xl text-[#1b1c1c]">
                  Sections ({sections.length})
                </h2>
                <button
                  onClick={() => setShowAddSection(true)}
                  className="bg-[#005bbf] text-white px-4 sm:px-5 py-2 sm:py-2.5 rounded-full font-quicksand font-bold text-xs sm:text-sm hover:bg-[#004493] flex items-center gap-1.5 sm:gap-2 shadow-sm"
                >
                  <span className="material-symbols-outlined text-base">add</span>
                  <span>Add Section</span>
                </button>
              </div>

              {sections.length === 0 ? (
                <div className="bg-white rounded-[20px] p-8 sm:p-12 text-center border border-[#eae8e7]">
                  <span className="material-symbols-outlined text-4xl text-[#727785] mb-2">school</span>
                  <h3 className="font-quicksand font-bold text-base text-[#1b1c1c]">No Sections Created Yet</h3>
                  <p className="text-xs sm:text-sm text-[#727785] mt-1">
                    Click &quot;Add Section&quot; to organize your classes and assign students.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {sections.map((section) => {
                    const assignedStudents = students.filter(
                      (s) => s.sectionId === section.id || s.sectionName === section.name
                    );

                    return (
                      <div
                        key={section.id}
                        className="bg-white rounded-[20px] p-5 sm:p-6 border border-[#eae8e7] hover:border-[#005bbf]/30 transition-all flex flex-col justify-between space-y-4"
                      >
                        <div>
                          <div className="flex items-center justify-between mb-3 pb-3 border-b border-[#eae8e7]">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-[#005bbf]/10 flex items-center justify-center shrink-0">
                                <span className="material-symbols-outlined text-[#005bbf]">school</span>
                              </div>
                              <div>
                                <h3 className="font-quicksand font-bold text-base sm:text-lg text-[#1b1c1c]">
                                  {section.name}
                                </h3>
                                <p className="text-xs text-[#727785]">
                                  {assignedStudents.length} {assignedStudents.length === 1 ? "Student" : "Students"}
                                </p>
                              </div>
                            </div>
                            <button
                              onClick={() => handleDeleteSection(section.id)}
                              className="text-[#ac3509] hover:bg-[#ac3509]/10 p-1.5 rounded-lg transition-colors"
                              title="Delete Section"
                            >
                              <span className="material-symbols-outlined text-lg">delete</span>
                            </button>
                          </div>

                          {/* List of assigned students */}
                          <div className="space-y-2 mt-3">
                            <p className="text-[11px] font-bold text-[#727785] uppercase tracking-wider">
                              Assigned Students
                            </p>
                            {assignedStudents.length === 0 ? (
                              <p className="text-xs text-[#727785] italic py-1">No students in this section yet.</p>
                            ) : (
                              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                                {assignedStudents.map((st) => (
                                  <div
                                    key={st.id}
                                    className="flex items-center justify-between bg-[#f5f3f3] p-2 rounded-xl text-xs"
                                  >
                                    <div className="flex items-center gap-2 min-w-0">
                                      <Image
                                        src={st.avatar}
                                        alt={st.name}
                                        width={24}
                                        height={24}
                                        unoptimized
                                        className="w-6 h-6 rounded-full object-cover shrink-0"
                                      />
                                      <span className="font-semibold text-[#1b1c1c] truncate">{st.name}</span>
                                    </div>
                                    <button
                                      onClick={() => handleAssignStudentToSection(st.email, null)}
                                      className="text-[10px] text-[#ac3509] hover:underline font-bold shrink-0 ml-1"
                                      title="Remove from section"
                                    >
                                      Remove
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* ➕ Button to Add Student to this Section */}
                        <button
                          onClick={() => {
                            setTargetSectionForAssign(section);
                            setSelectedStudentToAssign("");
                          }}
                          className="w-full bg-[#005bbf]/10 hover:bg-[#005bbf]/20 text-[#005bbf] py-2.5 rounded-xl text-xs font-quicksand font-bold flex items-center justify-center gap-1.5 transition-colors"
                        >
                          <span className="material-symbols-outlined text-base">person_add</span>
                          <span>Add Student to Section</span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* SCHEDULE VIEW */}
          {activeView === "schedule" && (
            <div className="space-y-5 sm:space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="font-quicksand font-bold text-xl sm:text-2xl text-[#1b1c1c]">
                  Scheduled Meetings
                </h2>
                <button
                  onClick={() => setShowScheduleModal(true)}
                  className="bg-[#005bbf] text-white px-4 sm:px-5 py-2 sm:py-2.5 rounded-full font-quicksand font-bold text-xs sm:text-sm hover:bg-[#004493] flex items-center gap-1.5 sm:gap-2"
                >
                  <span className="material-symbols-outlined text-base">add</span>
                  <span>New Meeting</span>
                </button>
              </div>
              {meetings.length === 0 ? (
                <div className="bg-white rounded-[20px] p-8 sm:p-12 text-center border border-[#eae8e7]">
                  <span className="material-symbols-outlined text-4xl text-[#eae8e7] mb-2">
                    event_busy
                  </span>
                  <p className="text-xs sm:text-sm text-[#727785]">No meetings scheduled yet.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {meetings.map((meet) => {
                    const s = students.find((x) => x.id === meet.studentId);
                    return (
                      <div
                        key={meet.id}
                        className="bg-white rounded-2xl p-4 sm:p-5 border border-[#eae8e7] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4"
                      >
                        <div className="flex items-center gap-3.5">
                          {s && (
                            <Image
                              src={s.avatar}
                              alt={s.name}
                              width={48}
                              height={48}
                              unoptimized
                              className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover border-2 border-[#005bbf] shrink-0"
                            />
                          )}
                          <div className="min-w-0">
                            <h4 className="font-quicksand font-bold text-sm sm:text-base text-[#1b1c1c] truncate">{meet.topic}</h4>
                            <p className="text-xs text-[#727785] truncate">
                              {s?.name} • {meet.date} at {meet.time}
                            </p>
                          </div>
                        </div>
                        <a
                          href={meet.meetLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="bg-[#005bbf] text-white px-4 sm:px-5 py-2 rounded-full text-xs font-quicksand font-bold hover:bg-[#004493] flex items-center justify-center gap-1.5 w-full sm:w-auto"
                        >
                          <span className="material-symbols-outlined text-base">videocam</span>
                          <span>Join Meet</span>
                        </a>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Settings Modal */}
      {renderModal(
        showSettingsModal,
        () => setShowSettingsModal(false),
        "Dashboard Settings",
        <div className="space-y-5 sm:space-y-6">
          <div className="p-3.5 sm:p-4 bg-[#f5f3f3] rounded-2xl flex items-center gap-3">
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-[#005bbf] text-white flex items-center justify-center font-quicksand font-bold text-base sm:text-lg overflow-hidden border-2 border-[#005bbf] shrink-0">
              {userImage && !imageError ? (
                <Image
                  src={userImage}
                  alt={userName}
                  width={48}
                  height={48}
                  unoptimized
                  referrerPolicy="no-referrer"
                  onError={() => setImageError(true)}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span>{userInitial}</span>
              )}
            </div>
            <div className="min-w-0">
              <h4 className="font-quicksand font-bold text-xs sm:text-sm text-[#1b1c1c] truncate">{userName}</h4>
              <p className="text-xs text-[#727785] truncate">{session?.user?.email || "teacher@happytoddles.com"}</p>
              <span className="inline-block mt-1 bg-[#005bbf]/10 text-[#005bbf] text-[10px] font-bold px-2 py-0.5 rounded-full">
                Verified Instructor
              </span>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-[#414754]">Default Google Meet Link</label>
            <input
              type="url"
              value={defaultMeetLink}
              onChange={(e) => setDefaultMeetLink(e.target.value)}
              className="w-full border border-[#eae8e7] rounded-xl px-3.5 sm:px-4 py-2.5 text-xs sm:text-sm focus:outline-none focus:border-[#005bbf]"
              placeholder="https://meet.google.com/..."
            />
            <p className="text-[11px] text-[#727785]">
              This link will automatically pre-fill whenever you schedule a new meeting.
            </p>
          </div>

          <div className="space-y-3 pt-2 border-t border-[#eae8e7]">
            <h5 className="font-quicksand font-bold text-xs text-[#1b1c1c]">Preferences</h5>

            <label className="flex items-center justify-between cursor-pointer py-1">
              <span className="text-xs text-[#414754] font-medium">Email Notifications</span>
              <input
                type="checkbox"
                checked={emailAlerts}
                onChange={(e) => setEmailAlerts(e.target.checked)}
                className="w-4 h-4 accent-[#005bbf] rounded cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between cursor-pointer py-1">
              <span className="text-xs text-[#414754] font-medium">Session Reminders</span>
              <input
                type="checkbox"
                checked={sessionReminders}
                onChange={(e) => setSessionReminders(e.target.checked)}
                className="w-4 h-4 accent-[#005bbf] rounded cursor-pointer"
              />
            </label>
          </div>

          <div className="pt-3 border-t border-[#eae8e7]">
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="w-full bg-[#ac3509]/10 hover:bg-[#ac3509]/20 text-[#ac3509] py-3 rounded-xl font-quicksand font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-colors active:scale-95"
            >
              <span className="material-symbols-outlined text-base">logout</span>
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}

      {/* Schedule Modal */}
      {renderModal(showScheduleModal, () => setShowScheduleModal(false), "Schedule Google Meet", (
        <div className="space-y-4 sm:space-y-5">
          <div>
            <label className="block text-xs font-semibold text-[#414754] mb-1.5">Student</label>
            <select
              className="w-full border border-[#eae8e7] rounded-xl px-3.5 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm focus:outline-none focus:border-[#005bbf] focus:ring-1 focus:ring-[#005bbf] bg-white"
              value={scheduleForm.studentId}
              onChange={(e) => setScheduleForm({ ...scheduleForm, studentId: e.target.value })}
            >
              <option value="">Select student</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#414754] mb-1.5">Topic</label>
            <input
              type="text"
              placeholder="e.g. Reading Practice"
              className="w-full border border-[#eae8e7] rounded-xl px-3.5 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm focus:outline-none focus:border-[#005bbf] focus:ring-1 focus:ring-[#005bbf]"
              value={scheduleForm.topic}
              onChange={(e) => setScheduleForm({ ...scheduleForm, topic: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#414754] mb-1.5">Date</label>
              <input
                type="date"
                className="w-full border border-[#eae8e7] rounded-xl px-3.5 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm focus:outline-none focus:border-[#005bbf] focus:ring-1 focus:ring-[#005bbf]"
                value={scheduleForm.date}
                onChange={(e) => setScheduleForm({ ...scheduleForm, date: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#414754] mb-1.5">Time</label>
              <input
                type="time"
                className="w-full border border-[#eae8e7] rounded-xl px-3.5 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm focus:outline-none focus:border-[#005bbf] focus:ring-1 focus:ring-[#005bbf]"
                value={scheduleForm.time}
                onChange={(e) => setScheduleForm({ ...scheduleForm, time: e.target.value })}
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#414754] mb-1.5">
              Google Meet Link
            </label>
            <input
              type="url"
              placeholder="https://meet.google.com/abc-defg-hij"
              className="w-full border border-[#eae8e7] rounded-xl px-3.5 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm focus:outline-none focus:border-[#005bbf] focus:ring-1 focus:ring-[#005bbf]"
              value={scheduleForm.meetLink}
              onChange={(e) => setScheduleForm({ ...scheduleForm, meetLink: e.target.value })}
            />
            <p className="text-[11px] text-[#727785] mt-1">
              Paste your Google Meet link here. Only you can provide this.
            </p>
          </div>
          <button
            onClick={handleScheduleMeet}
            className="w-full bg-[#005bbf] text-white py-3 sm:py-3.5 rounded-xl font-quicksand font-bold hover:bg-[#004493] transition-colors mt-2 text-xs sm:text-sm active:scale-95"
          >
            Schedule Meeting
          </button>
        </div>
      ))}

      {/* 📝 Add Assignment Modal */}
      {renderModal(showAddAssignment, () => setShowAddAssignment(false), "Create New Assignment", (
        <div className="space-y-4 sm:space-y-5">
          <div>
            <label className="block text-xs font-semibold text-[#414754] mb-1.5">Title *</label>
            <input
              type="text"
              placeholder="e.g. Alphabet Soup Worksheet"
              className="w-full border border-[#eae8e7] rounded-xl px-3.5 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm focus:outline-none focus:border-[#005bbf] focus:ring-1 focus:ring-[#005bbf]"
              value={newAssignment.title}
              onChange={(e) => setNewAssignment({ ...newAssignment, title: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#414754] mb-1.5">Description (Optional)</label>
            <textarea
              rows={3}
              placeholder="Add instructions, guidelines, or details for this assignment..."
              className="w-full border border-[#eae8e7] rounded-xl px-3.5 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm focus:outline-none focus:border-[#005bbf] focus:ring-1 focus:ring-[#005bbf]"
              value={newAssignment.description}
              onChange={(e) => setNewAssignment({ ...newAssignment, description: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#414754] mb-1.5">Attach File (PDF, Image, Word) (Optional)</label>
            <input
              type="file"
              accept="image/*,.pdf,.doc,.docx"
              className="w-full text-xs text-[#727785] file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:bg-[#005bbf]/10 file:text-[#005bbf] file:font-bold hover:file:bg-[#005bbf]/20 cursor-pointer"
              onChange={(e) => setTeacherFile(e.target.files?.[0] || null)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#414754] mb-1.5">Subject</label>
              <input
                type="text"
                placeholder="e.g. Reading, Math"
                className="w-full border border-[#eae8e7] rounded-xl px-3.5 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm focus:outline-none focus:border-[#005bbf] focus:ring-1 focus:ring-[#005bbf]"
                value={newAssignment.subject}
                onChange={(e) => setNewAssignment({ ...newAssignment, subject: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#414754] mb-1.5">Section</label>
              <select
                className="w-full border border-[#eae8e7] rounded-xl px-3.5 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm focus:outline-none focus:border-[#005bbf] focus:ring-1 focus:ring-[#005bbf] bg-white"
                value={newAssignment.section}
                onChange={(e) => setNewAssignment({ ...newAssignment, section: e.target.value })}
              >
                <option value="No Section">No Section (General)</option>
                {sections.map((s) => (
                  <option key={s.id} value={s.name}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Target Specific Student Dropdown */}
          <div>
            <label className="block text-xs font-semibold text-[#414754] mb-1.5">
              Assign To Specific Student (Optional)
            </label>
            <select
              className="w-full border border-[#eae8e7] rounded-xl px-3.5 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm focus:outline-none focus:border-[#005bbf] focus:ring-1 focus:ring-[#005bbf] bg-white"
              value={newAssignment.studentId}
              onChange={(e) => {
                const selectedStudent = students.find((s) => s.id === e.target.value);
                setNewAssignment({
                  ...newAssignment,
                  studentId: e.target.value,
                  studentName: selectedStudent ? selectedStudent.name : "",
                });
              }}
            >
              <option value="">All Students (No Specific Student)</option>
              {students
                .filter((s) => s.status === "approved" || s.status === "active")
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.email})
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#414754] mb-1.5">Due Date</label>
            <input
              type="text"
              placeholder="e.g. Tomorrow, Aug 12"
              className="w-full border border-[#eae8e7] rounded-xl px-3.5 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm focus:outline-none focus:border-[#005bbf] focus:ring-1 focus:ring-[#005bbf]"
              value={newAssignment.dueDate}
              onChange={(e) => setNewAssignment({ ...newAssignment, dueDate: e.target.value })}
            />
          </div>

          <button
            onClick={handleAddAssignment}
            disabled={isUploading}
            className="w-full bg-[#005bbf] text-white py-3 sm:py-3.5 rounded-xl font-quicksand font-bold hover:bg-[#004493] text-xs sm:text-sm active:scale-95 transition-transform disabled:opacity-50"
          >
            {isUploading ? "Uploading Attached File..." : "Publish Assignment"}
          </button>
        </div>
      ))}

      {/* Add Section Modal */}
      {renderModal(showAddSection, () => setShowAddSection(false), "Add New Section", (
        <div className="space-y-4 sm:space-y-5">
          <div>
            <label className="block text-xs font-semibold text-[#414754] mb-1.5">Section Name</label>
            <input
              type="text"
              placeholder="e.g. Section C"
              className="w-full border border-[#eae8e7] rounded-xl px-3.5 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm focus:outline-none focus:border-[#005bbf] focus:ring-1 focus:ring-[#005bbf]"
              value={newSection.name}
              onChange={(e) => setNewSection({ ...newSection, name: e.target.value })}
            />
          </div>
          <button
            onClick={handleAddSection}
            className="w-full bg-[#005bbf] text-white py-3 sm:py-3.5 rounded-xl font-quicksand font-bold hover:bg-[#004493] text-xs sm:text-sm active:scale-95 transition-transform"
          >
            Add Section
          </button>
        </div>
      ))}

      {/* Modal: Add Student to Section */}
      {renderModal(
        !!targetSectionForAssign,
        () => setTargetSectionForAssign(null),
        `Add Student to ${targetSectionForAssign?.name || "Section"}`,
        <div className="space-y-4 sm:space-y-5">
          <div>
            <label className="block text-xs font-semibold text-[#414754] mb-1.5">
              Select Approved Student
            </label>
            <select
              className="w-full border border-[#eae8e7] rounded-xl px-3.5 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm focus:outline-none focus:border-[#005bbf] bg-white"
              value={selectedStudentToAssign}
              onChange={(e) => setSelectedStudentToAssign(e.target.value)}
            >
              <option value="">Select a student...</option>
              {students
                .filter((s) => s.status === "approved" || s.status === "active")
                .map((s) => (
                  <option key={s.id} value={s.email}>
                    {s.name} ({s.email}) {s.sectionName ? `[Currently: ${s.sectionName}]` : "[No Section]"}
                  </option>
                ))}
            </select>
            <p className="text-[11px] text-[#727785] mt-1.5">
              Only authorized students appear in this dropdown list.
            </p>
          </div>

          <button
            onClick={() => {
              if (!selectedStudentToAssign || !targetSectionForAssign) {
                alert("Please select a student.");
                return;
              }
              handleAssignStudentToSection(selectedStudentToAssign, targetSectionForAssign.id);
            }}
            className="w-full bg-[#005bbf] text-white py-3 rounded-xl font-quicksand font-bold text-xs sm:text-sm hover:bg-[#004493] active:scale-95 transition-transform"
          >
            Assign to {targetSectionForAssign?.name}
          </button>
        </div>
      )}

      {/* Student Detail Modal */}
      {renderModal(
        !!selectedStudent,
        () => setSelectedStudent(null),
        selectedStudent?.name || "Student Profile",
        selectedStudent && (
          <div className="space-y-4 sm:space-y-5">
            <div className="flex items-center gap-3.5">
              <Image
                src={selectedStudent.avatar}
                alt={selectedStudent.name}
                width={64}
                height={64}
                unoptimized
                className="w-14 h-14 sm:w-16 sm:h-16 rounded-full object-cover border-2 border-[#005bbf] shrink-0"
              />
              <div className="min-w-0">
                <h4 className="font-quicksand font-bold text-base sm:text-lg truncate">{selectedStudent.name}</h4>
                <p className="text-xs sm:text-sm text-[#727785] truncate">{selectedStudent.email}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5 sm:gap-3 text-xs sm:text-sm">
              <div className="bg-[#f5f3f3] rounded-xl p-3">
                <p className="text-[#727785] text-[10px] sm:text-xs">Subject</p>
                <p className="font-semibold text-[#1b1c1c] truncate">{selectedStudent.subject}</p>
              </div>
              <div className="bg-[#f5f3f3] rounded-xl p-3">
                <p className="text-[#727785] text-[10px] sm:text-xs">Schedule</p>
                <p className="font-semibold text-[#1b1c1c] truncate">{selectedStudent.time}</p>
              </div>
              <div className="bg-[#f5f3f3] rounded-xl p-3">
                <p className="text-[#727785] text-[10px] sm:text-xs">Progress</p>
                <p className="font-semibold text-[#1b1c1c]">{selectedStudent.progress}%</p>
              </div>
              <div className="bg-[#f5f3f3] rounded-xl p-3">
                <p className="text-[#727785] text-[10px] sm:text-xs">Status</p>
                <p className="font-semibold text-[#005bbf] capitalize">
                  {selectedStudent.status === "approved" || selectedStudent.status === "active"
                    ? "Approved"
                    : "Revoked"}
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <button
                onClick={() => {
                  openScheduleForStudent(selectedStudent.id);
                  setSelectedStudent(null);
                }}
                className="w-full bg-[#005bbf] text-white py-3 sm:py-3.5 rounded-xl font-quicksand font-bold hover:bg-[#004493] text-xs sm:text-sm active:scale-95 transition-transform"
              >
                Schedule Meeting
              </button>

              <button
                onClick={() => handleDeleteStudent(selectedStudent)}
                className="w-full bg-[#ac3509]/10 hover:bg-[#ac3509]/20 border border-[#ac3509]/30 text-[#ac3509] py-3 sm:py-3.5 rounded-xl font-quicksand font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-colors active:scale-95"
              >
                <span className="material-symbols-outlined text-base">delete</span>
                <span>Delete from Database</span>
              </button>
            </div>
          </div>
        )
      )}
    </div>
  );
}
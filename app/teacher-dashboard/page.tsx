"use client";

import { useState, useEffect, useRef } from "react";
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

type SectionMessage = {
  id: string;
  sectionId: string;
  senderEmail: string;
  senderName: string;
  senderRole: string;
  senderAvatar?: string | null;
  text: string;
  createdAt: string;
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
  studentId?: string | null;
  studentName?: string | null;
  studentEmail?: string | null;
  student?: {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
  } | null;
  topic: string;
  date: string;
  time: string;
  endTime?: string | null;
  meetLink: string;
  status: "upcoming" | "completed" | "cancelled";
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
    "https://meet.google.com/new"
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

  // Section Group Chat State
  const [chatSection, setChatSection] = useState<Section | null>(null);
  const [chatMessages, setChatMessages] = useState<SectionMessage[]>([]);
  const [newMessageText, setNewMessageText] = useState("");
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  // Database Meetings State
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [editingMeeting, setEditingMeeting] = useState<Meeting | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [scheduleFilter, setScheduleFilter] = useState<"upcoming" | "today" | "completed" | "all">("upcoming");
  const [isScheduling, setIsScheduling] = useState(false);

  const [scheduleForm, setScheduleForm] = useState({
    studentId: "",
    topic: "",
    date: "",
    time: "",
    endTime: "",
    meetLink: "",
  });

  // Helper to ensure teacher joins with host privileges
  const getTeacherHostUrl = (link: string) => {
    const teacherEmail = "happytoddlers18@gmail.com";
    const targetLink = link || defaultMeetLink || "https://meet.google.com/new";
    if (targetLink.includes("?")) {
      return `${targetLink}&authuser=${encodeURIComponent(teacherEmail)}`;
    }
    return `${targetLink}?authuser=${encodeURIComponent(teacherEmail)}`;
  };

  const parseMeetingDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr + "T00:00:00");
      const month = d.toLocaleString("en-US", { month: "short" });
      const day = d.getDate();
      return { month, day };
    } catch {
      return { month: "Date", day: dateStr };
    }
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  useEffect(() => {
    if (!chatSection) return;

    async function fetchChatMessages() {
      try {
        const res = await fetch(`/api/sections/messages?sectionId=${chatSection?.id}`);
        if (res.ok) {
          const data = await res.json();
          setChatMessages(data.messages || []);
        }
      } catch (err) {
        console.error("Failed to fetch section chat messages:", err);
      }
    }

    fetchChatMessages();
    const interval = setInterval(fetchChatMessages, 3000);
    return () => clearInterval(interval);
  }, [chatSection]);

  const handleSendMessage = async () => {
    if (!newMessageText.trim() || !chatSection) return;

    const messageText = newMessageText.trim();
    setNewMessageText("");

    try {
      const res = await fetch("/api/sections/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sectionId: chatSection.id,
          text: messageText,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.message) {
          setChatMessages((prev) => [...prev, data.message]);
        }
      } else {
        alert("Failed to send message.");
      }
    } catch (err) {
      console.error("Failed to send message:", err);
    }
  };

  useEffect(() => {
    async function fetchMeetings() {
      try {
        const res = await fetch("/api/meetings");
        if (res.ok) {
          const data = await res.json();
          if (data.meetings) {
            setMeetings(data.meetings);
          }
        }
      } catch (err) {
        console.error("Failed to fetch meetings from DB:", err);
      }
    }

    fetchMeetings();
    const interval = setInterval(fetchMeetings, 5000);
    return () => clearInterval(interval);
  }, []);

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
    setScheduleForm({
      studentId,
      topic: "",
      date: new Date().toISOString().split("T")[0],
      time: "10:00 AM",
      endTime: "10:50 AM",
      meetLink: defaultMeetLink,
    });
    setShowScheduleModal(true);
  };

  const handleScheduleMeet = async () => {
    if (!scheduleForm.topic.trim() || !scheduleForm.date || !scheduleForm.time || !scheduleForm.endTime) {
      alert("Please fill in the topic, date, start time, and end time.");
      return;
    }

    setIsScheduling(true);
    try {
      const res = await fetch("/api/meetings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: scheduleForm.studentId || null,
          topic: scheduleForm.topic.trim(),
          date: scheduleForm.date,
          time: scheduleForm.time,
          endTime: scheduleForm.endTime,
          meetLink: scheduleForm.meetLink || defaultMeetLink,
        }),
      });

      const data = await res.json();
      if (res.ok && data.meeting) {
        setMeetings((prev) => [data.meeting, ...prev]);
        setShowScheduleModal(false);
        setScheduleForm({
          studentId: "",
          topic: "",
          date: new Date().toISOString().split("T")[0],
          time: "10:00 AM",
          endTime: "10:50 AM",
          meetLink: defaultMeetLink,
        });
      } else {
        alert(data.error || "Failed to schedule meeting.");
      }
    } catch (err) {
      console.error("Failed to save meeting to DB:", err);
      alert("Network error: Could not schedule meeting.");
    } finally {
      setIsScheduling(false);
    }
  };

  const handleUpdateMeetingStatus = async (id: string, newStatus: "upcoming" | "completed" | "cancelled") => {
    try {
      const res = await fetch("/api/meetings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: newStatus }),
      });

      if (res.ok) {
        setMeetings((prev) =>
          prev.map((m) => (m.id === id ? { ...m, status: newStatus } : m))
        );
      }
    } catch (err) {
      console.error("Failed to update meeting status:", err);
    }
  };

  const handleSaveRescheduledMeeting = async () => {
    if (!editingMeeting) return;

    try {
      const res = await fetch("/api/meetings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingMeeting.id,
          topic: editingMeeting.topic,
          date: editingMeeting.date,
          time: editingMeeting.time,
          endTime: editingMeeting.endTime,
          meetLink: editingMeeting.meetLink,
        }),
      });

      if (res.ok) {
        setMeetings((prev) =>
          prev.map((m) => (m.id === editingMeeting.id ? editingMeeting : m))
        );
        setEditingMeeting(null);
      } else {
        alert("Failed to update meeting.");
      }
    } catch (err) {
      console.error("Failed to update meeting:", err);
    }
  };

  const handleDeleteMeeting = async (id: string) => {
    if (!confirm("Are you sure you want to cancel and delete this scheduled meeting?")) return;

    try {
      const res = await fetch("/api/meetings", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });

      if (res.ok) {
        setMeetings((prev) => prev.filter((m) => m.id !== id));
      } else {
        alert("Failed to delete meeting.");
      }
    } catch (err) {
      console.error("Failed to delete meeting:", err);
    }
  };

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
    }
  };

  const handleDeleteSection = async (id: string) => {
    try {
      const res = await fetch("/api/sections", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });

      if (res.ok) {
        setSections((prev) => prev.filter((s) => s.id !== id));
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
      label: "Requests",
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

  const isoToday = new Date().toISOString().split("T")[0];

  const todayMeetings = meetings.filter((m) => m.date === isoToday && m.status === "upcoming");
  const approvedStudentsCount = students.filter((s) => s.status === "approved" || s.status === "active").length;
  const activeAssignmentsCount = assignments.filter((a) => a.status === "active").length;

  const filteredMeetings = meetings.filter((m) => {
    if (scheduleFilter === "upcoming") return m.status === "upcoming";
    if (scheduleFilter === "today") return m.date === isoToday;
    if (scheduleFilter === "completed") return m.status === "completed";
    return true;
  });

  const renderModal = (
    open: boolean,
    onClose: () => void,
    title: string,
    children: React.ReactNode
  ) => {
    if (!open) return null;
    return (
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60] flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
        <div className="bg-white rounded-3xl p-5 sm:p-6 w-full max-w-[720px] shadow-2xl my-auto relative max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-5 sticky top-0 bg-white z-10 pb-2 border-b border-[#eae8e7]/60">
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
    <div className="bg-[#fbf9f8] text-[#1b1c1c] font-inter min-h-screen flex flex-col md:flex-row antialiased">
      {/* 🧭 Executive Slim Sidebar */}
      <aside className="hidden md:flex flex-col justify-between p-5 border-r border-[#eae8e7] bg-white h-screen w-72 fixed left-0 top-0 z-40 shadow-[1px_0_10px_rgba(0,0,0,0.02)]">
        <div>
          {/* Brand Header */}
          <div className="flex items-center gap-3 px-2 mb-8">
            <div className="w-10 h-10 rounded-2xl bg-[#005bbf] text-white flex items-center justify-center shadow-sm">
              <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                toys
              </span>
            </div>
            <div>
              <span className="font-quicksand text-xl font-bold text-[#005bbf] tracking-tight block leading-tight">
                Happy Toddles
              </span>
              <span className="text-[11px] text-[#727785] font-medium">Instructor Portal</span>
            </div>
          </div>

          {/* Teacher Profile Card */}
          <div className="p-3.5 bg-[#fbf9f8] rounded-2xl border border-[#eae8e7]/80 flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-full border-2 border-[#005bbf] p-0.5 bg-white text-[#005bbf] flex items-center justify-center overflow-hidden font-quicksand font-bold text-lg shrink-0">
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
            <div className="min-w-0 flex-1">
              <h4 className="font-quicksand font-bold text-sm text-[#1b1c1c] truncate">{userName}</h4>
              <span className="inline-flex items-center gap-1 text-[10px] text-[#0f9d58] font-bold bg-[#0f9d58]/10 px-2 py-0.5 rounded-full mt-0.5">
                <span className="material-symbols-outlined text-[12px]">verified</span>
                Verified Instructor
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex flex-col gap-1.5">
            {navItems.map((item) => {
              const isActive = activeView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveView(item.id)}
                  className={`flex items-center gap-3.5 rounded-2xl px-4 py-3 font-quicksand font-bold text-xs transition-all text-left ${
                    isActive
                      ? "bg-[#005bbf] text-white shadow-sm"
                      : "text-[#414754] hover:bg-[#f5f3f3] hover:text-[#005bbf]"
                  }`}
                >
                  <span
                    className="material-symbols-outlined text-lg"
                    style={isActive ? { fontVariationSettings: "'FILL' 1" } : {}}
                  >
                    {item.icon}
                  </span>
                  <span className="flex-1">{item.label}</span>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                        isActive ? "bg-white/20 text-white" : "bg-[#ac3509] text-white"
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Quick Action */}
        <div className="p-4 bg-[#f5f3f3] rounded-3xl border border-[#eae8e7] space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-quicksand font-bold text-[#1b1c1c]">Live Classroom</span>
            <span className="w-2 h-2 rounded-full bg-[#0f9d58] animate-pulse" />
          </div>
          <p className="text-[11px] text-[#727785]">Host links pre-route through your Google profile.</p>
          <button
            onClick={() => {
              setScheduleForm({
                studentId: "",
                topic: "",
                date: new Date().toISOString().split("T")[0],
                time: "10:00 AM",
                endTime: "10:50 AM",
                meetLink: defaultMeetLink,
              });
              setShowScheduleModal(true);
            }}
            className="w-full bg-[#005bbf] hover:bg-[#004493] text-white py-2.5 rounded-xl font-quicksand font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs active:scale-95 transition-all"
          >
            <span className="material-symbols-outlined text-base">add_circle</span>
            <span>Schedule Session</span>
          </button>
        </div>
      </aside>

      {/* 📱 Mobile Top Bar */}
      <header className="md:hidden flex justify-between items-center w-full px-4 h-16 sticky top-0 z-50 bg-white/90 backdrop-blur-md shadow-sm border-b border-[#eae8e7]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#005bbf] text-white flex items-center justify-center">
            <span className="material-symbols-outlined text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>
              toys
            </span>
          </div>
          <span className="font-quicksand text-lg font-bold text-[#005bbf]">Happy Toddles</span>
        </div>
        <div className="flex items-center gap-1 text-[#005bbf]">
          <button
            onClick={() => {
              setShowNotifications(!showNotifications);
              setShowSettingsModal(false);
            }}
            className="p-2 hover:bg-[#f5f3f3] rounded-full relative"
            aria-label="Notifications"
          >
            <span className="material-symbols-outlined text-xl block">notifications</span>
            {unreadNotificationsCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#ac3509] rounded-full" />
            )}
          </button>

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 hover:bg-[#f5f3f3] rounded-full"
            aria-label="Toggle menu"
          >
            <span className="material-symbols-outlined text-2xl block">
              {mobileMenuOpen ? "close" : "menu"}
            </span>
          </button>
        </div>
      </header>

      {/* 📱 Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 top-16 bg-black/40 backdrop-blur-sm z-40">
          <div className="bg-white w-[280px] h-full shadow-2xl p-6 flex flex-col justify-between animate-slideRight">
            <div className="space-y-4">
              <div className="flex items-center gap-3 pb-4 border-b border-[#eae8e7]">
                <div className="w-12 h-12 rounded-full border-2 border-[#005bbf] flex items-center justify-center font-bold text-sm bg-white overflow-hidden">
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
                <div>
                  <h3 className="font-quicksand font-bold text-sm text-[#1b1c1c]">{userName}</h3>
                  <p className="text-xs text-[#727785]">Instructor Portal</p>
                </div>
              </div>

              <nav className="flex flex-col gap-1.5">
                {navItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveView(item.id);
                      setMobileMenuOpen(false);
                    }}
                    className={`flex items-center gap-3 rounded-xl px-4 py-3 font-quicksand font-bold text-xs text-left ${
                      activeView === item.id ? "bg-[#005bbf] text-white" : "text-[#414754] hover:bg-[#f5f3f3]"
                    }`}
                  >
                    <span className="material-symbols-outlined text-lg">{item.icon}</span>
                    <span className="flex-1">{item.label}</span>
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
                setShowSettingsModal(true);
                setMobileMenuOpen(false);
              }}
              className="w-full bg-[#f5f3f3] text-[#414754] py-3 rounded-xl font-quicksand font-bold text-xs flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-base">settings</span>
              <span>Settings</span>
            </button>
          </div>
        </div>
      )}

      {/* 🚀 Main Workspace Content */}
      <main className="flex-1 md:ml-72 p-4 sm:p-6 md:p-10 overflow-y-auto max-w-7xl mx-auto w-full space-y-6">
        {/* Top Header Glance */}
        <header className="hidden md:flex justify-between items-center bg-white p-4 sm:px-6 rounded-3xl border border-[#eae8e7] shadow-xs">
          <div>
            <h1 className="font-quicksand text-xl lg:text-2xl font-bold text-[#1b1c1c]">
              {activeView === "overview" && `Welcome, ${userName}! 👋`}
              {activeView === "approvals" && "Student Access Requests"}
              {activeView === "students" && "Enrolled Students Directory"}
              {activeView === "assignments" && "Coursework & Assignments"}
              {activeView === "sections" && "Academic Sections & Cohorts"}
              {activeView === "schedule" && "Live Class Calendar & Meetings"}
            </h1>
            <p className="text-xs text-[#727785] mt-0.5">
              {activeView === "overview" && "Monitor daily schedules, pending approvals, and student progress."}
              {activeView === "approvals" && "Authorize or decline new Google account student registrations."}
              {activeView === "students" && "Manage student profiles, grant access, or schedule one-on-one sessions."}
              {activeView === "assignments" && "Create assignments, distribute learning material, and grade submissions."}
              {activeView === "sections" && "Organize cohorts and communicate through class section discussions."}
              {activeView === "schedule" && "Host Google Meet sessions and manage virtual class timetables."}
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-2.5 rounded-2xl bg-[#f5f3f3] hover:bg-[#eae8e7] text-[#005bbf] transition-colors relative"
                aria-label="Notifications"
              >
                <span className="material-symbols-outlined text-xl block">notifications</span>
                {unreadNotificationsCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-[#ac3509] rounded-full border-2 border-white" />
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-3xl shadow-2xl border border-[#eae8e7] z-50 p-4 animate-fadeIn">
                  <div className="flex items-center justify-between pb-3 border-b border-[#eae8e7] mb-3">
                    <h4 className="font-quicksand font-bold text-sm text-[#1b1c1c]">Notifications</h4>
                    {unreadNotificationsCount > 0 && (
                      <button
                        onClick={markAllNotificationsAsRead}
                        className="text-xs text-[#005bbf] hover:underline font-semibold"
                      >
                        Mark all as read
                      </button>
                    )}
                  </div>
                  <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                    {notifications.map((n) => (
                      <div
                        key={n.id}
                        onClick={() => markNotificationAsRead(n.id)}
                        className={`p-3 rounded-2xl border text-xs cursor-pointer transition-all ${
                          n.read ? "bg-white border-[#eae8e7] opacity-75" : "bg-[#f5f3f3] border-[#005bbf]/20"
                        }`}
                      >
                        <p className="font-quicksand font-bold text-[#1b1c1c] text-xs">{n.title}</p>
                        <p className="text-[#414754] text-[11px] mt-0.5">{n.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={() => setShowSettingsModal(true)}
              className="p-2.5 rounded-2xl bg-[#f5f3f3] hover:bg-[#eae8e7] text-[#005bbf] transition-colors"
              aria-label="Settings"
            >
              <span className="material-symbols-outlined text-xl block">settings</span>
            </button>
          </div>
        </header>

        {/* 🌟 VIEW 1: OVERVIEW (REDESIGNED BENTO COMMAND CENTER) */}
        {activeView === "overview" && (
          <div className="space-y-6">
            {/* Bento Row 1: Hero Command Banner + Quick Stat Matrix */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Hero Banner */}
              <div className="lg:col-span-8 bg-gradient-to-br from-[#005bbf] to-[#004493] rounded-3xl p-6 sm:p-8 text-white relative overflow-hidden shadow-sm flex flex-col justify-between min-h-[220px]">
                <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/15 backdrop-blur-md rounded-full text-xs font-quicksand font-bold tracking-wide uppercase">
                      <span className="material-symbols-outlined text-sm">school</span>
                      Academic Control Hub
                    </span>
                    <span className="text-xs text-white/80 font-medium font-quicksand">{todayStr}</span>
                  </div>
                  <h2 className="font-quicksand text-2xl sm:text-3xl font-bold tracking-tight mb-2">
                    {todayMeetings.length > 0
                      ? `You have ${todayMeetings.length} live session${todayMeetings.length === 1 ? "" : "s"} scheduled for today.`
                      : "No live sessions scheduled for today."}
                  </h2>
                  <p className="text-xs sm:text-sm text-white/85 max-w leading-relaxed">
                    {approvedStudentsCount} active students are currently enrolled across {sections.length} cohort sections.
                  </p>
                </div>

                <div className="pt-5 flex flex-wrap items-center gap-3.5">
                  <button
                    onClick={() => {
                      setScheduleForm({
                        studentId: "",
                        topic: "",
                        date: isoToday,
                        time: "10:00 AM",
                        endTime: "10:50 AM",
                        meetLink: defaultMeetLink,
                      });
                      setShowScheduleModal(true);
                    }}
                    className="bg-[#fe6f42] hover:bg-[#fe5b27] text-white px-5 py-2.5 rounded-2xl font-quicksand font-bold text-xs sm:text-sm shadow-md transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-base">videocam</span>
                    <span>Schedule Class Session</span>
                  </button>

                  <button
                    onClick={() => setShowAddAssignment(true)}
                    className="bg-white/15 hover:bg-white/25 backdrop-blur-md text-white px-4 py-2.5 rounded-2xl font-quicksand font-bold text-xs sm:text-sm transition-colors flex items-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-base">add</span>
                    <span>New Assignment</span>
                  </button>
                </div>
              </div>

              {/* 4-Cell Stats Matrix */}
              <div className="lg:col-span-4 grid grid-cols-2 gap-3.5">
                <div className="bg-white p-4 rounded-3xl border border-[#eae8e7] flex flex-col justify-between shadow-xs">
                  <div className="w-10 h-10 rounded-2xl bg-[#005bbf]/10 text-[#005bbf] flex items-center justify-center mb-2">
                    <span className="material-symbols-outlined text-xl">groups</span>
                  </div>
                  <div>
                    <p className="text-2xl font-bold font-quicksand text-[#1b1c1c]">{approvedStudentsCount}</p>
                    <p className="text-[11px] text-[#727785] font-semibold">Active Students</p>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-3xl border border-[#eae8e7] flex flex-col justify-between shadow-xs">
                  <div className="w-10 h-10 rounded-full bg-[#ac3509]/10 text-[#ac3509] flex items-center justify-center mb-2">
                    <span className="material-symbols-outlined text-xl">person_add</span>
                  </div>
                  <div>
                    <p className="text-2xl font-bold font-quicksand text-[#1b1c1c]">{invites.length}</p>
                    <p className="text-[11px] text-[#727785] font-semibold">Pending Requests</p>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-3xl border border-[#eae8e7] flex flex-col justify-between shadow-xs">
                  <div className="w-10 h-10 rounded-2xl bg-[#0f9d58]/10 text-[#0f9d58] flex items-center justify-center mb-2">
                    <span className="material-symbols-outlined text-xl">today</span>
                  </div>
                  <div>
                    <p className="text-2xl font-bold font-quicksand text-[#1b1c1c]">{todayMeetings.length}</p>
                    <p className="text-[11px] text-[#727785] font-semibold">Today&apos;s Classes</p>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-3xl border border-[#eae8e7] flex flex-col justify-between shadow-xs">
                  <div className="w-10 h-10 rounded-2xl bg-[#fe6f42]/10 text-[#fe6f42] flex items-center justify-center mb-2">
                    <span className="material-symbols-outlined text-xl">assignment</span>
                  </div>
                  <div>
                    <p className="text-2xl font-bold font-quicksand text-[#1b1c1c]">{activeAssignmentsCount}</p>
                    <p className="text-[11px] text-[#727785] font-semibold">Assignments</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Pending Requests Alert Banner */}
            {invites.length > 0 && (
              <div className="bg-white rounded-3xl p-5 border border-[#ac3509]/20 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-[#ac3509]/10 text-[#ac3509] flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-xl">notification_important</span>
                  </div>
                  <div>
                    <h3 className="font-quicksand font-bold text-sm text-[#1b1c1c]">
                      {invites.length} Student Registration Request{invites.length === 1 ? "" : "s"} Awaiting Approval
                    </h3>
                    <p className="text-xs text-[#727785]">Review and grant classroom access to new Google account sign-ups.</p>
                  </div>
                </div>
                <button
                  onClick={() => setActiveView("approvals")}
                  className="bg-[#ac3509] text-white px-4 py-2 rounded-2xl font-quicksand font-bold text-xs hover:bg-[#8e2b07] transition-colors shrink-0"
                >
                  Review Requests
                </button>
              </div>
            )}

            {/* Bento Row 2: Today's Schedule Timeline & Student Mastery */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Today's Schedule Live Hub */}
              <div className="lg:col-span-8 bg-white rounded-3xl p-6 border border-[#eae8e7] shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-quicksand font-bold text-base text-[#1b1c1c] flex items-center gap-2">
                      <span className="material-symbols-outlined text-[#005bbf]">event</span>
                      Today&apos;s Class Schedule ({todayMeetings.length})
                    </h3>
                    <button onClick={() => setActiveView("schedule")} className="text-xs text-[#005bbf] font-bold hover:underline">
                      View Full Calendar
                    </button>
                  </div>

                  <div className="space-y-3">
                    {todayMeetings.map((meet) => {
                      const targetStudent = students.find(
                        (s) => s.id === meet.studentId || s.email === meet.studentEmail
                      );
                      const studentAvatar = targetStudent?.avatar || meet.student?.image;

                      return (
                        <div
                          key={meet.id}
                          className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-[#fbf9f8] rounded-2xl border border-[#eae8e7] hover:border-[#005bbf]/30 transition-all gap-4"
                        >
                          <div className="flex items-center gap-3.5 min-w-0">
                            <div className="w-12 h-12 rounded-2xl p-0.5 border-2 border-[#005bbf] bg-white relative shrink-0 overflow-hidden">
                              {studentAvatar ? (
                                <Image
                                  src={studentAvatar}
                                  alt={meet.studentName || "Student"}
                                  width={48}
                                  height={48}
                                  unoptimized
                                  referrerPolicy="no-referrer"
                                  className="w-full h-full rounded-2xl object-cover"
                                />
                              ) : (
                                <div className="w-full h-full rounded-2xl bg-[#005bbf] text-white flex items-center justify-center font-bold font-quicksand text-sm">
                                  {(meet.studentName || "S").charAt(0).toUpperCase()}
                                </div>
                              )}
                            </div>
                            <div className="min-w-0">
                              <h4 className="font-quicksand font-bold text-sm text-[#1b1c1c] truncate">{meet.topic}</h4>
                              <p className="text-xs text-[#005bbf] font-semibold truncate">
                                With: {meet.studentName || "General Class Session"}
                              </p>
                              <p className="text-[11px] text-[#727785] mt-0.5 flex items-center gap-1 font-medium">
                                <span className="material-symbols-outlined text-[13px] text-[#005bbf]">schedule</span>
                                <span>{meet.time} {meet.endTime ? `– ${meet.endTime}` : ""}</span>
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <a
                              href={getTeacherHostUrl(meet.meetLink)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="bg-[#005bbf] hover:bg-[#004493] text-white px-4 py-2 rounded-xl font-quicksand font-bold text-xs flex items-center gap-1.5 shadow-xs transition-all active:scale-95"
                            >
                              <span className="material-symbols-outlined text-base">videocam</span>
                              <span>Join as Host</span>
                            </a>
                          </div>
                        </div>
                      );
                    })}

                    {todayMeetings.length === 0 && (
                      <div className="p-8 bg-[#fbf9f8] rounded-2xl text-center border border-dashed border-[#eae8e7]">
                        <span className="material-symbols-outlined text-3xl text-[#727785] mb-1">event_available</span>
                        <p className="text-xs text-[#727785] font-medium">No live sessions scheduled for today.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Student Mastery & Progress Widget */}
              <div className="lg:col-span-4 bg-white rounded-3xl p-6 border border-[#eae8e7] shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-quicksand font-bold text-base text-[#1b1c1c] flex items-center gap-2">
                      <span className="material-symbols-outlined text-[#fe6f42]">trending_up</span>
                      Student Mastery
                    </h3>
                    <button onClick={() => setActiveView("students")} className="text-xs text-[#005bbf] font-bold hover:underline">
                      Directory
                    </button>
                  </div>

                  <div className="space-y-4 max-h-[280px] overflow-y-auto pr-1">
                    {students.slice(0, 5).map((s) => (
                      <div key={s.id}>
                        <div className="flex justify-between items-end mb-1">
                          <span className="font-quicksand font-bold text-xs text-[#1b1c1c] truncate">{s.name}</span>
                          <span className="font-bold text-xs text-[#005bbf]">{s.progress}%</span>
                        </div>
                        <div className="h-2 w-full bg-[#eae8e7] rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[#005bbf] rounded-full transition-all duration-500"
                            style={{ width: `${s.progress}%` }}
                          />
                        </div>
                      </div>
                    ))}
                    {students.length === 0 && (
                      <p className="text-xs text-[#727785] text-center py-6">No enrolled students yet.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 📋 VIEW 2: STUDENT ACCESS REQUESTS */}
        {activeView === "approvals" && (
          <div className="space-y-5">
            <div>
              <h2 className="font-quicksand font-bold text-xl text-[#1b1c1c]">Student Requests ({invites.length})</h2>
              <p className="text-xs text-[#727785]">Review and grant access to students attempting to sign in.</p>
            </div>

            {invites.length === 0 ? (
              <div className="bg-white rounded-3xl p-12 text-center border border-[#eae8e7]">
                <span className="material-symbols-outlined text-4xl text-[#005bbf] mb-2">check_circle</span>
                <h3 className="font-quicksand font-bold text-base text-[#1b1c1c]">No Pending Requests</h3>
                <p className="text-xs text-[#727785] mt-1">All student access requests have been authorized.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {invites.map((invite) => (
                  <div
                    key={invite.id}
                    className="bg-white rounded-3xl p-5 border border-[#eae8e7] shadow-xs flex flex-col justify-between gap-4"
                  >
                    <div className="flex items-start gap-3.5">
                      <Image
                        src={invite.avatar}
                        alt={invite.name}
                        width={48}
                        height={48}
                        unoptimized
                        referrerPolicy="no-referrer"
                        className="w-12 h-12 rounded-2xl object-cover border-2 border-[#005bbf] shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex justify-between items-start">
                          <h4 className="font-quicksand font-bold text-base text-[#1b1c1c] truncate">{invite.name}</h4>
                          <span className="text-[10px] text-[#727785] bg-[#f5f3f3] px-2 py-0.5 rounded-full">{invite.date}</span>
                        </div>
                        <p className="text-xs text-[#727785] truncate mt-0.5">{invite.email}</p>
                      </div>
                    </div>

                    <div className="flex gap-2.5 pt-2 border-t border-[#eae8e7]">
                      <button
                        onClick={() => handleAcceptInvite(invite)}
                        className="flex-1 bg-[#005bbf] hover:bg-[#004493] text-white py-2 rounded-xl text-xs font-quicksand font-bold transition-all active:scale-95 shadow-xs"
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

        {/* 👥 VIEW 3: STUDENTS DIRECTORY */}
        {activeView === "students" && (
          <div className="space-y-5">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="font-quicksand font-bold text-xl text-[#1b1c1c]">Enrolled Students ({students.length})</h2>
                <p className="text-xs text-[#727785]">Manage student authorizations and schedule one-on-one sessions.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {students.map((student) => {
                const isApproved = student.status === "approved" || student.status === "active";
                return (
                  <div
                    key={student.id}
                    onClick={() => setSelectedStudent(student)}
                    className="bg-white rounded-3xl p-5 border border-[#eae8e7] hover:border-[#005bbf]/40 transition-all cursor-pointer flex flex-col justify-between shadow-xs"
                  >
                    <div>
                      <div className="flex items-center gap-3.5 mb-3">
                        <Image
                          src={student.avatar}
                          alt={student.name}
                          width={56}
                          height={56}
                          unoptimized
                          referrerPolicy="no-referrer"
                          className="w-12 h-12 rounded-2xl object-cover border-2 border-[#005bbf] shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <h3 className="font-quicksand font-bold text-base text-[#1b1c1c] truncate">{student.name}</h3>
                          <p className="text-xs text-[#727785] truncate">{student.email}</p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs mb-3">
                        <span
                          className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] ${
                            isApproved ? "bg-[#0f9d58]/10 text-[#0f9d58]" : "bg-[#ac3509]/10 text-[#ac3509]"
                          }`}
                        >
                          {isApproved ? "Authorized" : "Access Revoked"}
                        </span>
                        <span className="text-[11px] font-bold text-[#005bbf]">{student.progress}% Complete</span>
                      </div>

                      <div className="h-1.5 w-full bg-[#eae8e7] rounded-full overflow-hidden">
                        <div className="h-full bg-[#005bbf] rounded-full" style={{ width: `${student.progress}%` }} />
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-[#eae8e7] flex items-center justify-between">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleAccess(student);
                        }}
                        className={`text-xs px-3 py-1.5 rounded-xl font-quicksand font-bold transition-colors ${
                          isApproved ? "text-[#ac3509] hover:bg-[#ac3509]/10" : "text-[#0f9d58] bg-[#0f9d58]/10"
                        }`}
                      >
                        {isApproved ? "Revoke" : "Grant Access"}
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openScheduleForStudent(student.id);
                        }}
                        className="bg-[#005bbf]/10 text-[#005bbf] hover:bg-[#005bbf]/20 px-3 py-1.5 rounded-xl font-quicksand font-bold text-xs flex items-center gap-1"
                      >
                        <span className="material-symbols-outlined text-sm">videocam</span>
                        <span>Schedule</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 📝 VIEW 4: ASSIGNMENTS */}
        {activeView === "assignments" && (
          <div className="space-y-5">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="font-quicksand font-bold text-xl text-[#1b1c1c]">Assignments ({assignments.length})</h2>
                <p className="text-xs text-[#727785]">Create coursework and track student completion.</p>
              </div>
              <button
                onClick={() => setShowAddAssignment(true)}
                className="bg-[#005bbf] hover:bg-[#004493] text-white px-5 py-2.5 rounded-2xl font-quicksand font-bold text-xs flex items-center gap-1.5 shadow-xs"
              >
                <span className="material-symbols-outlined text-base">add</span>
                <span>Create Assignment</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {assignments.map((assignment) => (
                <div
                  key={assignment.id}
                  className="bg-white rounded-3xl p-5 border border-[#eae8e7] shadow-xs flex flex-col justify-between gap-4"
                >
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <span className="bg-[#005bbf]/10 text-[#005bbf] text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                        {assignment.subject}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          assignment.status === "completed" ? "bg-[#0f9d58]/10 text-[#0f9d58]" : "bg-[#795900]/10 text-[#795900]"
                        }`}
                      >
                        {assignment.status === "completed" ? "Completed" : "Active"}
                      </span>
                    </div>

                    <h3 className="font-quicksand font-bold text-base text-[#1b1c1c]">{assignment.title}</h3>

                    {assignment.description && (
                      <p className="text-xs text-[#414754] my-2 bg-[#fbf9f8] p-2.5 rounded-2xl border border-[#eae8e7]">
                        {assignment.description}
                      </p>
                    )}

                    {assignment.attachmentUrl && (
                      <a
                        href={assignment.attachmentUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs text-[#005bbf] font-bold hover:underline my-1.5"
                      >
                        <span className="material-symbols-outlined text-sm">attach_file</span>
                        <span>Attached Material</span>
                      </a>
                    )}

                    <div className="mt-2 text-xs text-[#727785] space-y-0.5">
                      <p>Cohort: {assignment.section}</p>
                      <p className="font-semibold text-[#ac3509]">Due Date: {assignment.dueDate}</p>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-3 border-t border-[#eae8e7]">
                    <button
                      onClick={() => handleToggleAssignmentStatus(assignment.id)}
                      className={`flex-1 py-2 rounded-xl text-xs font-quicksand font-bold transition-all ${
                        assignment.status === "completed"
                          ? "bg-[#f5f3f3] text-[#414754]"
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
          </div>
        )}

        {/* 🏫 VIEW 5: SECTIONS */}
        {activeView === "sections" && (
          <div className="space-y-5">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="font-quicksand font-bold text-xl text-[#1b1c1c]">Academic Sections ({sections.length})</h2>
                <p className="text-xs text-[#727785]">Create class cohorts and conduct group discussions.</p>
              </div>
              <button
                onClick={() => setShowAddSection(true)}
                className="bg-[#005bbf] hover:bg-[#004493] text-white px-5 py-2.5 rounded-2xl font-quicksand font-bold text-xs flex items-center gap-1.5 shadow-xs"
              >
                <span className="material-symbols-outlined text-base">add</span>
                <span>Add Section</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {sections.map((section) => {
                const assignedStudents = students.filter(
                  (s) => s.sectionId === section.id || s.sectionName === section.name
                );

                return (
                  <div
                    key={section.id}
                    className="bg-white rounded-3xl p-5 border border-[#eae8e7] shadow-xs flex flex-col justify-between space-y-4"
                  >
                    <div>
                      <div className="flex items-center justify-between pb-3 border-b border-[#eae8e7]">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-2xl bg-[#005bbf]/10 text-[#005bbf] flex items-center justify-center font-bold">
                            <span className="material-symbols-outlined text-xl">school</span>
                          </div>
                          <div>
                            <h3 className="font-quicksand font-bold text-base text-[#1b1c1c]">{section.name}</h3>
                            <p className="text-xs text-[#727785]">{assignedStudents.length} Students</p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleDeleteSection(section.id)}
                          className="text-[#ac3509] hover:bg-[#ac3509]/10 p-1.5 rounded-xl"
                        >
                          <span className="material-symbols-outlined text-lg">delete</span>
                        </button>
                      </div>

                      <div className="space-y-2 mt-3">
                        <p className="text-[11px] font-bold text-[#727785] uppercase tracking-wider">Roster</p>
                        {assignedStudents.length === 0 ? (
                          <p className="text-xs text-[#727785] italic py-1">No students assigned yet.</p>
                        ) : (
                          <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                            {assignedStudents.map((st) => (
                              <div
                                key={st.id}
                                className="flex items-center justify-between bg-[#fbf9f8] p-2 rounded-xl text-xs"
                              >
                                <span className="font-semibold text-[#1b1c1c] truncate">{st.name}</span>
                                <button
                                  onClick={() => handleAssignStudentToSection(st.email, null)}
                                  className="text-[10px] text-[#ac3509] font-bold hover:underline"
                                >
                                  Remove
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-2 pt-2 border-t border-[#eae8e7]">
                      <button
                        onClick={() => setChatSection(section)}
                        className="w-full bg-[#005bbf] hover:bg-[#004493] text-white py-2.5 rounded-xl text-xs font-quicksand font-bold flex items-center justify-center gap-1.5 shadow-xs"
                      >
                        <span className="material-symbols-outlined text-base">forum</span>
                        <span>Open Section Chat</span>
                      </button>

                      <button
                        onClick={() => {
                          setTargetSectionForAssign(section);
                          setSelectedStudentToAssign("");
                        }}
                        className="w-full bg-[#005bbf]/10 hover:bg-[#005bbf]/20 text-[#005bbf] py-2 rounded-xl text-xs font-quicksand font-bold flex items-center justify-center gap-1"
                      >
                        <span className="material-symbols-outlined text-base">person_add</span>
                        <span>Assign Student</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 📅 VIEW 6: LIVE SCHEDULE */}
        {activeView === "schedule" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="font-quicksand font-bold text-xl text-[#1b1c1c]">Live Meeting Schedule</h2>
                <p className="text-xs text-[#727785]">Host Google Meet classrooms and monitor upcoming sessions.</p>
              </div>
              <button
                onClick={() => {
                  setScheduleForm({
                    studentId: "",
                    topic: "",
                    date: isoToday,
                    time: "10:00 AM",
                    endTime: "10:50 AM",
                    meetLink: defaultMeetLink,
                  });
                  setShowScheduleModal(true);
                }}
                className="bg-[#005bbf] hover:bg-[#004493] text-white px-5 py-2.5 rounded-2xl font-quicksand font-bold text-xs flex items-center gap-1.5 shadow-xs self-start sm:self-auto"
              >
                <span className="material-symbols-outlined text-base">add_circle</span>
                <span>Schedule New Session</span>
              </button>
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-2 border-b border-[#eae8e7] pb-3 overflow-x-auto">
              {(["upcoming", "today", "completed", "all"] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setScheduleFilter(filter)}
                  className={`px-4 py-2 rounded-2xl font-quicksand font-bold text-xs capitalize transition-colors shrink-0 ${
                    scheduleFilter === filter
                      ? "bg-[#005bbf] text-white shadow-xs"
                      : "bg-[#f5f3f3] text-[#414754] hover:bg-[#eae8e7]"
                  }`}
                >
                  {filter} ({
                    filter === "upcoming"
                      ? meetings.filter((m) => m.status === "upcoming").length
                      : filter === "today"
                      ? meetings.filter((m) => m.date === isoToday).length
                      : filter === "completed"
                      ? meetings.filter((m) => m.status === "completed").length
                      : meetings.length
                  })
                </button>
              ))}
            </div>

            {/* Meetings Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredMeetings.map((meet) => {
                const isCompleted = meet.status === "completed";
                const isToday = meet.date === isoToday;
                const { month, day } = parseMeetingDate(meet.date);

                return (
                  <div
                    key={meet.id}
                    className={`bg-white rounded-3xl p-5 border shadow-xs transition-all flex flex-col justify-between gap-4 ${
                      isCompleted ? "opacity-75 border-[#eae8e7]" : isToday ? "border-[#005bbf]" : "border-[#eae8e7]"
                    }`}
                  >
                    <div>
                      <div className="flex justify-between items-start mb-3">
                        <span
                          className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 ${
                            isCompleted ? "bg-[#0f9d58]/10 text-[#0f9d58]" : "bg-[#005bbf]/10 text-[#005bbf]"
                          }`}
                        >
                          <span className="material-symbols-outlined text-xs">
                            {isCompleted ? "check_circle" : "videocam"}
                          </span>
                          <span>{isCompleted ? "Completed" : "Live Google Meet"}</span>
                        </span>

                        <button
                          onClick={() => handleDeleteMeeting(meet.id)}
                          className="text-[#727785] hover:text-[#ac3509] p-1 rounded-xl"
                        >
                          <span className="material-symbols-outlined text-base">delete</span>
                        </button>
                      </div>

                      <h3 className={`font-quicksand font-bold text-base text-[#1b1c1c] ${isCompleted ? "line-through text-[#727785]" : ""}`}>
                        {meet.topic}
                      </h3>

                      <div className="flex items-center gap-3 p-3 bg-[#fbf9f8] rounded-2xl my-3 border border-[#eae8e7]">
                        <div className="w-12 h-12 rounded-xl bg-[#005bbf] text-white flex flex-col items-center justify-center font-quicksand shrink-0">
                          <span className="text-[9px] uppercase font-bold">{month}</span>
                          <span className="text-base font-bold leading-tight">{day}</span>
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-[#1b1c1c]">
                            {meet.time} {meet.endTime ? `– ${meet.endTime}` : ""}
                          </p>
                          <p className="text-[11px] text-[#727785] truncate">
                            {meet.studentName ? `With: ${meet.studentName}` : "General Class Session"}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2 pt-2 border-t border-[#eae8e7]">
                      <a
                        href={getTeacherHostUrl(meet.meetLink)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full bg-[#005bbf] hover:bg-[#004493] text-white py-2.5 rounded-2xl font-quicksand font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-all active:scale-95"
                      >
                        <span className="material-symbols-outlined text-base">videocam</span>
                        <span>Join as Host</span>
                      </a>

                      <div className="flex gap-2">
                        <button
                          onClick={() => handleUpdateMeetingStatus(meet.id, isCompleted ? "upcoming" : "completed")}
                          className="flex-1 py-1.5 bg-[#f5f3f3] hover:bg-[#eae8e7] text-[#414754] rounded-xl font-quicksand font-bold text-[11px]"
                        >
                          {isCompleted ? "Mark Upcoming" : "Mark Completed"}
                        </button>
                        <button
                          onClick={() => setEditingMeeting(meet)}
                          className="px-3 py-1.5 border border-[#eae8e7] text-[#414754] hover:bg-[#f5f3f3] rounded-xl font-quicksand font-bold text-[11px]"
                        >
                          Edit
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>

      {/* 📅 Modal: Schedule Google Meet */}
      {renderModal(
        showScheduleModal,
        () => setShowScheduleModal(false),
        "Schedule Google Meet Session",
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#414754] mb-1.5">Assign to Student (Optional)</label>
            <select
              className="w-full border border-[#eae8e7] rounded-2xl px-4 py-2.5 text-xs sm:text-sm focus:outline-none focus:border-[#005bbf] bg-white"
              value={scheduleForm.studentId}
              onChange={(e) => setScheduleForm({ ...scheduleForm, studentId: e.target.value })}
            >
              <option value="">All Students (General Session)</option>
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
            <label className="block text-xs font-semibold text-[#414754] mb-1.5">Session Topic *</label>
            <input
              type="text"
              placeholder="e.g. Reading Phonics & Numbers"
              className="w-full border border-[#eae8e7] rounded-2xl px-4 py-2.5 text-xs sm:text-sm focus:outline-none focus:border-[#005bbf]"
              value={scheduleForm.topic}
              onChange={(e) => setScheduleForm({ ...scheduleForm, topic: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#414754] mb-1.5">Date *</label>
              <input
                type="date"
                className="w-full border border-[#eae8e7] rounded-2xl px-3 py-2 text-xs sm:text-sm focus:outline-none focus:border-[#005bbf]"
                value={scheduleForm.date}
                onChange={(e) => setScheduleForm({ ...scheduleForm, date: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#414754] mb-1.5">Start Time *</label>
              <input
                type="text"
                placeholder="10:00 AM"
                className="w-full border border-[#eae8e7] rounded-2xl px-3 py-2 text-xs sm:text-sm focus:outline-none focus:border-[#005bbf]"
                value={scheduleForm.time}
                onChange={(e) => setScheduleForm({ ...scheduleForm, time: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#414754] mb-1.5">End Time *</label>
              <input
                type="text"
                placeholder="10:50 AM"
                className="w-full border border-[#eae8e7] rounded-2xl px-3 py-2 text-xs sm:text-sm focus:outline-none focus:border-[#005bbf]"
                value={scheduleForm.endTime}
                onChange={(e) => setScheduleForm({ ...scheduleForm, endTime: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#414754] mb-1.5">Google Meet Room Link</label>
            <input
              type="url"
              placeholder="https://meet.google.com/..."
              className="w-full border border-[#eae8e7] rounded-2xl px-4 py-2.5 text-xs sm:text-sm focus:outline-none focus:border-[#005bbf]"
              value={scheduleForm.meetLink}
              onChange={(e) => setScheduleForm({ ...scheduleForm, meetLink: e.target.value })}
            />
            <p className="text-[11px] text-[#727785] mt-1">
              Leave blank to automatically generate an instant room link.
            </p>
          </div>

          <button
            onClick={handleScheduleMeet}
            disabled={isScheduling}
            className="w-full bg-[#005bbf] hover:bg-[#004493] text-white py-3 rounded-2xl font-quicksand font-bold text-xs sm:text-sm active:scale-95 shadow-sm disabled:opacity-50"
          >
            {isScheduling ? "Publishing Session..." : "Publish Scheduled Session"}
          </button>
        </div>
      )}

      {/* ✏️ Modal: Edit Meeting */}
      {renderModal(
        !!editingMeeting,
        () => setEditingMeeting(null),
        "Edit Scheduled Session",
        editingMeeting && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#414754] mb-1.5">Session Topic</label>
              <input
                type="text"
                className="w-full border border-[#eae8e7] rounded-2xl px-4 py-2 text-xs sm:text-sm focus:outline-none focus:border-[#005bbf]"
                value={editingMeeting.topic}
                onChange={(e) => setEditingMeeting({ ...editingMeeting, topic: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#414754] mb-1.5">Date</label>
                <input
                  type="date"
                  className="w-full border border-[#eae8e7] rounded-2xl px-3 py-2 text-xs sm:text-sm focus:outline-none focus:border-[#005bbf]"
                  value={editingMeeting.date}
                  onChange={(e) => setEditingMeeting({ ...editingMeeting, date: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#414754] mb-1.5">Start Time</label>
                <input
                  type="text"
                  className="w-full border border-[#eae8e7] rounded-2xl px-3 py-2 text-xs sm:text-sm focus:outline-none focus:border-[#005bbf]"
                  value={editingMeeting.time}
                  onChange={(e) => setEditingMeeting({ ...editingMeeting, time: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#414754] mb-1.5">End Time</label>
                <input
                  type="text"
                  className="w-full border border-[#eae8e7] rounded-2xl px-3 py-2 text-xs sm:text-sm focus:outline-none focus:border-[#005bbf]"
                  value={editingMeeting.endTime || ""}
                  onChange={(e) => setEditingMeeting({ ...editingMeeting, endTime: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#414754] mb-1.5">Google Meet Link</label>
              <input
                type="url"
                className="w-full border border-[#eae8e7] rounded-2xl px-4 py-2 text-xs sm:text-sm focus:outline-none focus:border-[#005bbf]"
                value={editingMeeting.meetLink}
                onChange={(e) => setEditingMeeting({ ...editingMeeting, meetLink: e.target.value })}
              />
            </div>

            <button
              onClick={handleSaveRescheduledMeeting}
              className="w-full bg-[#005bbf] hover:bg-[#004493] text-white py-3 rounded-2xl font-quicksand font-bold text-xs sm:text-sm active:scale-95"
            >
              Save Changes
            </button>
          </div>
        )
      )}

      {/* 📝 Modal: Create Assignment */}
      {renderModal(
        showAddAssignment,
        () => setShowAddAssignment(false),
        "Create New Assignment",
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#414754] mb-1.5">Title *</label>
            <input
              type="text"
              placeholder="e.g. Alphabet Soup Worksheet"
              className="w-full border border-[#eae8e7] rounded-2xl px-4 py-2.5 text-xs sm:text-sm focus:outline-none focus:border-[#005bbf]"
              value={newAssignment.title}
              onChange={(e) => setNewAssignment({ ...newAssignment, title: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#414754] mb-1.5">Description (Optional)</label>
            <textarea
              rows={3}
              placeholder="Instructions and details..."
              className="w-full border border-[#eae8e7] rounded-2xl px-4 py-2.5 text-xs sm:text-sm focus:outline-none focus:border-[#005bbf]"
              value={newAssignment.description}
              onChange={(e) => setNewAssignment({ ...newAssignment, description: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#414754] mb-1.5">Attach Learning File</label>
            <input
              type="file"
              accept="image/*,.pdf,.doc,.docx"
              className="w-full text-xs text-[#727785] file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:bg-[#005bbf]/10 file:text-[#005bbf] file:font-bold hover:file:bg-[#005bbf]/20 cursor-pointer"
              onChange={(e) => setTeacherFile(e.target.files?.[0] || null)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#414754] mb-1.5">Subject</label>
              <input
                type="text"
                placeholder="Reading, Math"
                className="w-full border border-[#eae8e7] rounded-2xl px-4 py-2.5 text-xs sm:text-sm focus:outline-none focus:border-[#005bbf]"
                value={newAssignment.subject}
                onChange={(e) => setNewAssignment({ ...newAssignment, subject: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#414754] mb-1.5">Cohort Section</label>
              <select
                className="w-full border border-[#eae8e7] rounded-2xl px-4 py-2.5 text-xs sm:text-sm focus:outline-none focus:border-[#005bbf] bg-white"
                value={newAssignment.section}
                onChange={(e) => setNewAssignment({ ...newAssignment, section: e.target.value })}
              >
                <option value="No Section">General / All Cohorts</option>
                {sections.map((s) => (
                  <option key={s.id} value={s.name}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#414754] mb-1.5">Specific Student (Optional)</label>
            <select
              className="w-full border border-[#eae8e7] rounded-2xl px-4 py-2.5 text-xs sm:text-sm focus:outline-none focus:border-[#005bbf] bg-white"
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
              <option value="">All Cohort Students</option>
              {students
                .filter((s) => s.status === "approved" || s.status === "active")
                .map((s) => (
                  <option key={s.id} value={s.id}>{s.name} ({s.email})</option>
                ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#414754] mb-1.5">Due Date</label>
            <input
              type="text"
              placeholder="e.g. Tomorrow, Aug 28"
              className="w-full border border-[#eae8e7] rounded-2xl px-4 py-2.5 text-xs sm:text-sm focus:outline-none focus:border-[#005bbf]"
              value={newAssignment.dueDate}
              onChange={(e) => setNewAssignment({ ...newAssignment, dueDate: e.target.value })}
            />
          </div>

          <button
            onClick={handleAddAssignment}
            disabled={isUploading}
            className="w-full bg-[#005bbf] hover:bg-[#004493] text-white py-3 rounded-2xl font-quicksand font-bold text-xs sm:text-sm active:scale-95 shadow-sm disabled:opacity-50"
          >
            {isUploading ? "Uploading File..." : "Publish Assignment"}
          </button>
        </div>
      )}

      {/* 🏫 Modal: Add Section */}
      {renderModal(
        showAddSection,
        () => setShowAddSection(false),
        "Create New Cohort Section",
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#414754] mb-1.5">Section Name</label>
            <input
              type="text"
              placeholder="e.g. Section C"
              className="w-full border border-[#eae8e7] rounded-2xl px-4 py-2.5 text-xs sm:text-sm focus:outline-none focus:border-[#005bbf]"
              value={newSection.name}
              onChange={(e) => setNewSection({ ...newSection, name: e.target.value })}
            />
          </div>
          <button
            onClick={handleAddSection}
            className="w-full bg-[#005bbf] hover:bg-[#004493] text-white py-3 rounded-2xl font-quicksand font-bold text-xs sm:text-sm active:scale-95"
          >
            Create Section
          </button>
        </div>
      )}

      {/* Modal: Assign Student to Section */}
      {renderModal(
        !!targetSectionForAssign,
        () => setTargetSectionForAssign(null),
        `Add Student to ${targetSectionForAssign?.name || "Section"}`,
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#414754] mb-1.5">Select Approved Student</label>
            <select
              className="w-full border border-[#eae8e7] rounded-2xl px-4 py-2.5 text-xs sm:text-sm focus:outline-none focus:border-[#005bbf] bg-white"
              value={selectedStudentToAssign}
              onChange={(e) => setSelectedStudentToAssign(e.target.value)}
            >
              <option value="">Select student...</option>
              {students
                .filter((s) => s.status === "approved" || s.status === "active")
                .map((s) => (
                  <option key={s.id} value={s.email}>
                    {s.name} ({s.email}) {s.sectionName ? `[Section: ${s.sectionName}]` : "[No Section]"}
                  </option>
                ))}
            </select>
          </div>

          <button
            onClick={() => {
              if (!selectedStudentToAssign || !targetSectionForAssign) {
                alert("Please select a student.");
                return;
              }
              handleAssignStudentToSection(selectedStudentToAssign, targetSectionForAssign.id);
            }}
            className="w-full bg-[#005bbf] hover:bg-[#004493] text-white py-3 rounded-2xl font-quicksand font-bold text-xs sm:text-sm active:scale-95"
          >
            Assign to {targetSectionForAssign?.name}
          </button>
        </div>
      )}

      {/* 💬 Section Chat Modal */}
      {renderModal(
        !!chatSection,
        () => setChatSection(null),
        `${chatSection?.name || "Section"} Class Discussion`,
        chatSection && (
          <div className="flex flex-col h-[480px] bg-white rounded-2xl overflow-hidden border border-[#eae8e7]">
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#fbf9f8]">
              {chatMessages.map((msg) => {
                const isMe = msg.senderEmail.toLowerCase() === session?.user?.email?.toLowerCase();
                return (
                  <div key={msg.id} className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                    <span className="text-[10px] text-[#727785] mb-0.5 px-1 font-semibold">
                      {msg.senderName} ({msg.senderRole})
                    </span>
                    <div
                      className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-xs ${
                        isMe ? "bg-[#005bbf] text-white rounded-tr-none" : "bg-white text-[#1b1c1c] border border-[#eae8e7] rounded-tl-none"
                      }`}
                    >
                      {msg.text}
                    </div>
                  </div>
                );
              })}
              <div ref={chatEndRef} />
            </div>

            <div className="p-3 border-t border-[#eae8e7] flex items-center gap-2">
              <input
                type="text"
                placeholder="Type a message to the cohort..."
                className="flex-1 bg-[#f5f3f3] border border-[#eae8e7] rounded-full px-4 py-2.5 text-xs sm:text-sm focus:outline-none focus:border-[#005bbf]"
                value={newMessageText}
                onChange={(e) => setNewMessageText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
              />
              <button
                onClick={handleSendMessage}
                disabled={!newMessageText.trim()}
                className="bg-[#005bbf] hover:bg-[#004493] text-white px-5 py-2.5 rounded-full text-xs font-quicksand font-bold transition-colors disabled:opacity-40"
              >
                Send
              </button>
            </div>
          </div>
        )
      )}

      {/* 👤 Student Detail Modal */}
      {renderModal(
        !!selectedStudent,
        () => setSelectedStudent(null),
        selectedStudent?.name || "Student Profile",
        selectedStudent && (
          <div className="space-y-4">
            <div className="flex items-center gap-3.5">
              <Image
                src={selectedStudent.avatar}
                alt={selectedStudent.name}
                width={64}
                height={64}
                unoptimized
                referrerPolicy="no-referrer"
                className="w-14 h-14 rounded-2xl object-cover border-2 border-[#005bbf] shrink-0"
              />
              <div className="min-w-0">
                <h4 className="font-quicksand font-bold text-base sm:text-lg truncate">{selectedStudent.name}</h4>
                <p className="text-xs text-[#727785] truncate">{selectedStudent.email}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-[#fbf9f8] rounded-2xl p-3 border border-[#eae8e7]">
                <p className="text-[#727785] text-[10px]">Cohort</p>
                <p className="font-semibold text-[#1b1c1c] truncate">{selectedStudent.sectionName || "No Cohort"}</p>
              </div>
              <div className="bg-[#fbf9f8] rounded-2xl p-3 border border-[#eae8e7]">
                <p className="text-[#727785] text-[10px]">Mastery</p>
                <p className="font-semibold text-[#005bbf]">{selectedStudent.progress}%</p>
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <button
                onClick={() => {
                  openScheduleForStudent(selectedStudent.id);
                  setSelectedStudent(null);
                }}
                className="w-full bg-[#005bbf] hover:bg-[#004493] text-white py-3 rounded-2xl font-quicksand font-bold text-xs sm:text-sm active:scale-95"
              >
                Schedule Class Session
              </button>

              <button
                onClick={() => handleDeleteStudent(selectedStudent)}
                className="w-full bg-[#ac3509]/10 hover:bg-[#ac3509]/20 text-[#ac3509] py-3 rounded-2xl font-quicksand font-bold text-xs sm:text-sm flex items-center justify-center gap-2 active:scale-95"
              >
                <span className="material-symbols-outlined text-base">delete</span>
                <span>Delete Student Record</span>
              </button>
            </div>
          </div>
        )
      )}

      {/* ⚙️ Settings Modal */}
      {renderModal(
        showSettingsModal,
        () => setShowSettingsModal(false),
        "Instructor Settings",
        <div className="space-y-5">
          <div className="p-3.5 bg-[#fbf9f8] rounded-2xl flex items-center gap-3 border border-[#eae8e7]">
            <div className="w-12 h-12 rounded-full bg-[#005bbf] text-white flex items-center justify-center font-quicksand font-bold text-lg overflow-hidden shrink-0">
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
              <h4 className="font-quicksand font-bold text-sm text-[#1b1c1c] truncate">{userName}</h4>
              <p className="text-xs text-[#727785] truncate">{session?.user?.email}</p>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-[#414754]">Default Google Meet Link</label>
            <input
              type="url"
              value={defaultMeetLink}
              onChange={(e) => setDefaultMeetLink(e.target.value)}
              className="w-full border border-[#eae8e7] rounded-2xl px-4 py-2.5 text-xs sm:text-sm focus:outline-none focus:border-[#005bbf]"
            />
          </div>

          <div className="space-y-3 pt-2 border-t border-[#eae8e7]">
            <h5 className="font-quicksand font-bold text-xs text-[#1b1c1c]">Preferences</h5>
            <label className="flex items-center justify-between cursor-pointer py-1">
              <span className="text-xs text-[#414754] font-medium">Email Alerts</span>
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
              className="w-full bg-[#ac3509]/10 hover:bg-[#ac3509]/20 text-[#ac3509] py-3 rounded-2xl font-quicksand font-bold text-xs sm:text-sm flex items-center justify-center gap-2 active:scale-95"
            >
              <span className="material-symbols-outlined text-base">logout</span>
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
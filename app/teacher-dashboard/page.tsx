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
  studentEmail?: string | null;
  attachmentUrl?: string | null;
  submittedAt: string;
  remarks?: string | null;
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

type DirectMessage = {
  id: string;
  studentId: string;
  studentEmail: string;
  studentName: string;
  senderEmail: string;
  senderName: string;
  senderRole: string;
  senderAvatar?: string | null;
  text?: string | null;
  attachmentUrl?: string | null;
  attachmentName?: string | null;
  attachmentType?: string | null;
  read: boolean;
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
    "overview" | "approvals" | "students" | "assignments" | "sections" | "schedule" | "direct_messages"
  >("overview");

  // 🌙 Dark/Light Theme State
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "dark") {
      setIsDarkMode(true);
    } else if (savedTheme === "light") {
      setIsDarkMode(false);
    } else {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      setIsDarkMode(prefersDark);
    }
  }, []);

  const toggleTheme = () => {
    setIsDarkMode((prev) => {
      const next = !prev;
      localStorage.setItem("theme", next ? "dark" : "light");
      return next;
    });
  };

  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [sessionReminders, setSessionReminders] = useState(true);
  const [defaultMeetLink, setDefaultMeetLink] = useState("https://meet.google.com/new");

  const [students, setStudents] = useState<Student[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);

  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [showAddAssignment, setShowAddAssignment] = useState(false);
  const [teacherFile, setTeacherFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // 📁 Selected Assignment Submissions Modal & Remarks State
  const [selectedAssignmentSubmissions, setSelectedAssignmentSubmissions] = useState<Assignment | null>(null);
  const [remarksDraft, setRemarksDraft] = useState<Record<string, string>>({});
  const [savingRemarkStudentId, setSavingRemarkStudentId] = useState<string | null>(null);

  const [newAssignment, setNewAssignment] = useState({
    title: "",
    description: "",
    subject: "General Learning",
    section: "No Section",
    studentId: "",
    studentName: "",
    dueDate: "",
  });

  const [sections, setSections] = useState<Section[]>([]);
  const [showAddSection, setShowAddSection] = useState(false);
  const [newSection, setNewSection] = useState({ name: "" });

  const [targetSectionForAssign, setTargetSectionForAssign] = useState<Section | null>(null);
  const [selectedStudentToAssign, setSelectedStudentToAssign] = useState<string>("");

  const [chatSection, setChatSection] = useState<Section | null>(null);
  const [chatMessages, setChatMessages] = useState<SectionMessage[]>([]);
  const [newMessageText, setNewMessageText] = useState("");
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  // 💬 Direct Chat State
  const [allDirectMessages, setAllDirectMessages] = useState<DirectMessage[]>([]);
  const [selectedChatStudent, setSelectedChatStudent] = useState<Student | null>(null);
  const [teacherDirectInput, setTeacherDirectInput] = useState("");
  const [teacherDirectFile, setTeacherDirectFile] = useState<File | null>(null);
  const [isSendingTeacherDirect, setIsSendingTeacherDirect] = useState(false);
  const [searchStudentTerm, setSearchStudentTerm] = useState("");

  const teacherChatContainerRef = useRef<HTMLDivElement | null>(null);
  const prevDirectMsgLengthRef = useRef<number>(0);
  const prevActiveChatStudentIdRef = useRef<string | null>(null);

  // Meetings State
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
    if (!selectedChatStudent) return;

    const studentMsgs = allDirectMessages.filter(
      (m) => m.studentId === selectedChatStudent.id || m.studentEmail?.toLowerCase() === selectedChatStudent.email.toLowerCase()
    );
    const hasStudentChanged = prevActiveChatStudentIdRef.current !== selectedChatStudent.id;
    const isNewOutgoing = studentMsgs.length > prevDirectMsgLengthRef.current;

    if (hasStudentChanged || isNewOutgoing) {
      if (teacherChatContainerRef.current) {
        teacherChatContainerRef.current.scrollTop = teacherChatContainerRef.current.scrollHeight;
      }
      prevDirectMsgLengthRef.current = studentMsgs.length;
      prevActiveChatStudentIdRef.current = selectedChatStudent.id;
    }
  }, [allDirectMessages, selectedChatStudent]);

  const handleSelectStudentThread = async (st: Student) => {
    setSelectedChatStudent(st);

    setAllDirectMessages((prev) =>
      prev.map((m) =>
        m.studentId === st.id || m.studentEmail?.toLowerCase() === st.email.toLowerCase()
          ? { ...m, read: true }
          : m
      )
    );

    try {
      await fetch("/api/direct-messages", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId: st.id, studentEmail: st.email }),
      });
    } catch (err) {
      console.error("Failed to mark messages as read:", err);
    }
  };

  useEffect(() => {
    async function fetchTeacherDirectMessages() {
      try {
        const res = await fetch("/api/direct-messages");
        if (res.ok) {
          const data = await res.json();
          if (data.messages) {
            setAllDirectMessages((prev) => {
              if (selectedChatStudent) {
                return data.messages.map((m: DirectMessage) =>
                  m.studentId === selectedChatStudent.id ||
                  m.studentEmail?.toLowerCase() === selectedChatStudent.email.toLowerCase()
                    ? { ...m, read: true }
                    : m
                );
              }
              return data.messages;
            });
          }
        }
      } catch (err) {
        console.error("Failed to load teacher direct messages:", err);
      }
    }

    fetchTeacherDirectMessages();
    const interval = setInterval(fetchTeacherDirectMessages, 3000);
    return () => clearInterval(interval);
  }, [selectedChatStudent]);

  const handleDeleteDirectMessage = async (id: string) => {
    if (!confirm("Are you sure you want to delete this message?")) return;

    try {
      const res = await fetch("/api/direct-messages", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });

      if (res.ok) {
        setAllDirectMessages((prev) => prev.filter((m) => m.id !== id));
      } else {
        const data = await res.json();
        alert(data.error || "Failed to delete message.");
      }
    } catch (err) {
      console.error("Error deleting message:", err);
    }
  };

  const handleDeleteSectionMessage = async (id: string) => {
    if (!confirm("Are you sure you want to delete this class discussion message?")) return;

    try {
      const res = await fetch("/api/sections/messages", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });

      if (res.ok) {
        setChatMessages((prev) => prev.filter((m) => m.id !== id));
      } else {
        const data = await res.json();
        alert(data.error || "Failed to delete message.");
      }
    } catch (err) {
      console.error("Error deleting section message:", err);
    }
  };

  const handleTeacherSendDirectMessage = async () => {
    if ((!teacherDirectInput.trim() && !teacherDirectFile) || !selectedChatStudent) return;

    setIsSendingTeacherDirect(true);
    let uploadedUrl: string | null = null;
    let fileName: string | null = null;
    let fileType: string | null = null;

    if (teacherDirectFile) {
      fileName = teacherDirectFile.name;
      if (teacherDirectFile.type.startsWith("image/")) {
        fileType = "image";
      } else if (teacherDirectFile.type.includes("pdf")) {
        fileType = "pdf";
      } else {
        fileType = "document";
      }

      try {
        uploadedUrl = await uploadAssignmentFile(teacherDirectFile);
      } catch (err) {
        console.error("Failed to upload teacher file:", err);
      }
    }

    const messageText = teacherDirectInput.trim();
    setTeacherDirectInput("");
    setTeacherDirectFile(null);

    try {
      const res = await fetch("/api/direct-messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: selectedChatStudent.id,
          text: messageText || null,
          attachmentUrl: uploadedUrl,
          attachmentName: fileName,
          attachmentType: fileType,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.message) {
          setAllDirectMessages((prev) => [...prev, data.message]);
          setTimeout(() => {
            if (teacherChatContainerRef.current) {
              teacherChatContainerRef.current.scrollTop = teacherChatContainerRef.current.scrollHeight;
            }
          }, 50);
        }
      } else {
        alert("Failed to send message to student.");
      }
    } catch (err) {
      console.error("Error sending teacher message:", err);
    } finally {
      setIsSendingTeacherDirect(false);
    }
  };

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

  // 📝 Save Remarks / Feedback for Individual Student Assignment Submission
  const handleSaveStudentRemarks = async (
    assignmentId: string,
    studentId: string,
    studentEmail: string | undefined,
    remarkText: string
  ) => {
    setSavingRemarkStudentId(studentId);

    try {
      const res = await fetch("/api/assignments/remarks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assignmentId,
          studentId,
          studentEmail,
          remarks: remarkText,
        }),
      });

      if (res.ok || res.status === 200) {
        // Update local assignments list state
        setAssignments((prev) =>
          prev.map((a) => {
            if (a.id !== assignmentId) return a;

            const existingSubs = a.submissions || [];
            const subIndex = existingSubs.findIndex(
              (sub) =>
                sub.studentId === studentId ||
                (studentEmail && sub.studentEmail?.toLowerCase() === studentEmail.toLowerCase())
            );

            let updatedSubs: Submission[] = [];
            if (subIndex >= 0) {
              updatedSubs = existingSubs.map((sub, idx) =>
                idx === subIndex ? { ...sub, remarks: remarkText } : sub
              );
            } else {
              const targetStudent = students.find((s) => s.id === studentId || s.email === studentEmail);
              updatedSubs = [
                ...existingSubs,
                {
                  id: Math.random().toString(36).substring(2, 9),
                  studentId,
                  studentEmail: studentEmail || targetStudent?.email,
                  studentName: targetStudent?.name || "Student",
                  submittedAt: new Date().toISOString(),
                  remarks: remarkText,
                },
              ];
            }

            return { ...a, submissions: updatedSubs };
          })
        );

        // Update modal inspector state directly
        setSelectedAssignmentSubmissions((prev) => {
          if (!prev || prev.id !== assignmentId) return prev;

          const existingSubs = prev.submissions || [];
          const subIndex = existingSubs.findIndex(
            (sub) =>
              sub.studentId === studentId ||
              (studentEmail && sub.studentEmail?.toLowerCase() === studentEmail.toLowerCase())
          );

          let updatedSubs: Submission[] = [];
          if (subIndex >= 0) {
            updatedSubs = existingSubs.map((sub, idx) =>
              idx === subIndex ? { ...sub, remarks: remarkText } : sub
            );
          } else {
            const targetStudent = students.find((s) => s.id === studentId || s.email === studentEmail);
            updatedSubs = [
              ...existingSubs,
              {
                id: Math.random().toString(36).substring(2, 9),
                studentId,
                studentEmail: studentEmail || targetStudent?.email,
                studentName: targetStudent?.name || "Student",
                submittedAt: new Date().toISOString(),
                remarks: remarkText,
              },
            ];
          }

          return { ...prev, submissions: updatedSubs };
        });

        alert("Remarks updated successfully!");
      } else {
        alert("Failed to save remarks. Please try again.");
      }
    } catch (err) {
      console.error("Error saving student remarks:", err);
      alert("Error occurred while saving remarks.");
    } finally {
      setSavingRemarkStudentId(null);
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

  const unreadDirectMessagesCount = allDirectMessages.filter(
    (m) => m.senderRole === "STUDENT" && !m.read
  ).length;

  const navItems = [
    { id: "overview" as const, icon: "dashboard", label: "Overview" },
    {
      id: "approvals" as const,
      icon: "person_add",
      label: "Requests",
      badge: invites.length,
    },
    { id: "students" as const, icon: "groups", label: "Students" },
    {
      id: "direct_messages" as const,
      icon: "chat",
      label: "Messages",
      badge: unreadDirectMessagesCount,
    },
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

  const filteredMeetings = meetings.filter((m) => {
    if (scheduleFilter === "upcoming") return m.status === "upcoming";
    if (scheduleFilter === "today") return m.date === isoToday;
    if (scheduleFilter === "completed") return m.status === "completed";
    return true;
  });

  const filteredChatStudents = students.filter(
    (s) =>
      s.name.toLowerCase().includes(searchStudentTerm.toLowerCase()) ||
      s.email.toLowerCase().includes(searchStudentTerm.toLowerCase())
  );

  const renderModal = (
    open: boolean,
    onClose: () => void,
    title: string,
    children: React.ReactNode
  ) => {
    if (!open) return null;
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
        <div className={`rounded-3xl p-5 sm:p-6 w-full max-w-[720px] shadow-2xl my-auto relative max-h-[90vh] overflow-y-auto border transition-colors ${
          isDarkMode ? "bg-[#111827] text-slate-100 border-slate-800" : "bg-white text-[#1b1c1c] border-[#eae8e7]"
        }`}>
          <div className={`flex justify-between items-center mb-5 sticky top-0 z-10 pb-2 border-b transition-colors ${
            isDarkMode ? "bg-[#111827] border-slate-800" : "bg-white border-[#eae8e7]/60"
          }`}>
            <h3 className="font-quicksand font-bold text-lg sm:text-xl">{title}</h3>
            <button
              onClick={onClose}
              className={`p-1.5 rounded-full transition-colors ${
                isDarkMode ? "text-slate-400 hover:text-white hover:bg-slate-800" : "text-[#727785] hover:text-[#1b1c1c] hover:bg-[#f5f3f3]"
              }`}
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
    <div className={`font-inter min-h-screen flex flex-col md:flex-row antialiased transition-colors duration-200 ${
      isDarkMode ? "bg-[#090d16] text-slate-100" : "bg-[#fbf9f8] text-[#1b1c1c]"
    }`}>
      {/* 🧭 Sidebar */}
      <aside className={`hidden md:flex flex-col justify-between p-5 border-r h-screen w-72 fixed left-0 top-0 z-40 transition-colors ${
        isDarkMode ? "bg-[#111827] border-slate-800 shadow-[1px_0_10px_rgba(0,0,0,0.2)]" : "bg-white border-[#eae8e7] shadow-[1px_0_10px_rgba(0,0,0,0.02)]"
      }`}>
        <div>
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
              <span className={`text-[11px] font-medium ${isDarkMode ? "text-slate-400" : "text-[#727785]"}`}>Instructor Portal</span>
            </div>
          </div>

          <div className={`p-3.5 rounded-2xl border flex items-center gap-3 mb-6 transition-colors ${
            isDarkMode ? "bg-[#1f2937] border-slate-800" : "bg-[#fbf9f8] border-[#eae8e7]/80"
          }`}>
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
              <h4 className="font-quicksand font-bold text-sm truncate">{userName}</h4>
              <span className="inline-flex items-center gap-1 text-[10px] text-[#0f9d58] font-bold bg-[#0f9d58]/10 px-2 py-0.5 rounded-full mt-0.5">
                <span className="material-symbols-outlined text-[12px]">verified</span>
                Verified Instructor
              </span>
            </div>
          </div>

          <nav className="flex flex-col gap-1.5">
            {navItems.map((item) => {
              const isActive = activeView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveView(item.id);
                    if (item.id === "direct_messages" && students.length > 0 && !selectedChatStudent) {
                      handleSelectStudentThread(students[0]);
                    }
                  }}
                  className={`flex items-center gap-3.5 rounded-2xl px-4 py-3 font-quicksand font-bold text-xs transition-all text-left ${
                    isActive
                      ? "bg-[#005bbf] text-white shadow-sm"
                      : isDarkMode
                      ? "text-slate-300 hover:bg-slate-800 hover:text-[#005bbf]"
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

        <div className={`p-4 rounded-3xl border space-y-2 transition-colors ${
          isDarkMode ? "bg-[#1f2937] border-slate-800" : "bg-[#f5f3f3] border-[#eae8e7]"
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-quicksand font-bold">Live Classroom</span>
            <span className="w-2 h-2 rounded-full bg-[#0f9d58] animate-pulse" />
          </div>
          <p className={`text-[11px] ${isDarkMode ? "text-slate-400" : "text-[#727785]"}`}>Host links pre-route through your Google profile.</p>
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
      <header className={`md:hidden flex justify-between items-center w-full px-4 h-16 sticky top-0 z-50 backdrop-blur-md shadow-sm border-b transition-colors ${
        isDarkMode ? "bg-[#111827]/90 border-slate-800" : "bg-white/90 border-[#eae8e7]"
      }`}>
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
            onClick={toggleTheme}
            className={`p-2 rounded-full transition-colors ${
              isDarkMode ? "hover:bg-slate-800 text-amber-400" : "hover:bg-[#f5f3f3] text-[#005bbf]"
            }`}
            title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            <span className="material-symbols-outlined text-xl block">
              {isDarkMode ? "light_mode" : "dark_mode"}
            </span>
          </button>

          <button
            onClick={() => {
              setShowNotifications(!showNotifications);
              setShowSettingsModal(false);
            }}
            className={`p-2 rounded-full relative transition-colors ${
              isDarkMode ? "hover:bg-slate-800" : "hover:bg-[#f5f3f3]"
            }`}
            aria-label="Notifications"
          >
            <span className="material-symbols-outlined text-xl block">notifications</span>
            {unreadNotificationsCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#ac3509] rounded-full" />
            )}
          </button>

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className={`p-2 rounded-full transition-colors ${
              isDarkMode ? "hover:bg-slate-800" : "hover:bg-[#f5f3f3]"
            }`}
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
        <div className="md:hidden fixed inset-0 top-16 bg-black/50 backdrop-blur-sm z-40">
          <div className={`w-[280px] h-full shadow-2xl p-6 flex flex-col justify-between animate-slideRight transition-colors ${
            isDarkMode ? "bg-[#111827] text-slate-100" : "bg-white text-[#1b1c1c]"
          }`}>
            <div className="space-y-4">
              <div className={`flex items-center gap-3 pb-4 border-b ${isDarkMode ? "border-slate-800" : "border-[#eae8e7]"}`}>
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
                  <h3 className="font-quicksand font-bold text-sm">{userName}</h3>
                  <p className={`text-xs ${isDarkMode ? "text-slate-400" : "text-[#727785]"}`}>Instructor Portal</p>
                </div>
              </div>

              <nav className="flex flex-col gap-1.5">
                {navItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveView(item.id);
                      setMobileMenuOpen(false);
                      if (item.id === "direct_messages" && students.length > 0 && !selectedChatStudent) {
                        handleSelectStudentThread(students[0]);
                      }
                    }}
                    className={`flex items-center gap-3 rounded-xl px-4 py-3 font-quicksand font-bold text-xs text-left ${
                      activeView === item.id
                        ? "bg-[#005bbf] text-white"
                        : isDarkMode
                        ? "text-slate-300 hover:bg-slate-800"
                        : "text-[#414754] hover:bg-[#f5f3f3]"
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
              className={`w-full py-3 rounded-xl font-quicksand font-bold text-xs flex items-center justify-center gap-2 transition-colors ${
                isDarkMode ? "bg-slate-800 text-slate-200" : "bg-[#f5f3f3] text-[#414754]"
              }`}
            >
              <span className="material-symbols-outlined text-base">settings</span>
              <span>Settings</span>
            </button>
          </div>
        </div>
      )}

      {/* 🚀 Main Workspace Content */}
      <main className="flex-1 md:ml-72 p-4 sm:p-6 md:p-10 overflow-y-auto max-w-7xl mx-auto w-full space-y-6">
        <header className={`hidden md:flex justify-between items-center p-4 sm:px-6 rounded-3xl border shadow-xs transition-colors ${
          isDarkMode ? "bg-[#111827] border-slate-800" : "bg-white border-[#eae8e7]"
        }`}>
          <div>
            <h1 className="font-quicksand text-xl lg:text-2xl font-bold">
              {activeView === "overview" && `Welcome, ${userName}! 👋`}
              {activeView === "approvals" && "Student Access Requests"}
              {activeView === "students" && "Enrolled Students Directory"}
              {activeView === "direct_messages" && "Student Direct Messaging Hub"}
              {activeView === "assignments" && "Coursework & Assignments"}
              {activeView === "sections" && "Academic Sections & Cohorts"}
              {activeView === "schedule" && "Live Class Calendar & Meetings"}
            </h1>
            <p className={`text-xs mt-0.5 ${isDarkMode ? "text-slate-400" : "text-[#727785]"}`}>
              {activeView === "overview" && "Monitor daily schedules, pending approvals, and student progress."}
              {activeView === "approvals" && "Authorize or decline new Google account student registrations."}
              {activeView === "students" && "Manage student profiles, grant/revoke access, or schedule one-on-one sessions."}
              {activeView === "direct_messages" && "View direct messages sent by students, review file attachments, and reply."}
              {activeView === "assignments" && "Create assignments, review submissions, and provide individual student feedback."}
              {activeView === "sections" && "Organize cohorts and communicate through class section discussions."}
              {activeView === "schedule" && "Host Google Meet sessions and manage virtual class timetables."}
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={toggleTheme}
              className={`p-2.5 rounded-2xl transition-colors ${
                isDarkMode ? "bg-slate-800 text-amber-400 hover:bg-slate-700" : "bg-[#f5f3f3] text-[#005bbf] hover:bg-[#eae8e7]"
              }`}
              title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              <span className="material-symbols-outlined text-xl block">
                {isDarkMode ? "light_mode" : "dark_mode"}
              </span>
            </button>

            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className={`p-2.5 rounded-2xl transition-colors relative ${
                  isDarkMode ? "bg-slate-800 text-slate-200 hover:bg-slate-700" : "bg-[#f5f3f3] text-[#005bbf] hover:bg-[#eae8e7]"
                }`}
                aria-label="Notifications"
              >
                <span className="material-symbols-outlined text-xl block">notifications</span>
                {unreadNotificationsCount > 0 && (
                  <span className={`absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-[#ac3509] rounded-full border-2 ${
                    isDarkMode ? "border-slate-800" : "border-white"
                  }`} />
                )}
              </button>

              {showNotifications && (
                <div className={`absolute right-0 mt-2 w-80 sm:w-96 rounded-3xl shadow-2xl border z-50 p-4 animate-fadeIn transition-colors ${
                  isDarkMode ? "bg-[#111827] border-slate-800" : "bg-white border-[#eae8e7]"
                }`}>
                  <div className={`flex items-center justify-between pb-3 border-b mb-3 ${isDarkMode ? "border-slate-800" : "border-[#eae8e7]"}`}>
                    <h4 className="font-quicksand font-bold text-sm">Notifications</h4>
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
                          n.read
                            ? isDarkMode
                              ? "bg-[#1f2937] border-slate-800 opacity-60"
                              : "bg-white border-[#eae8e7] opacity-75"
                            : isDarkMode
                            ? "bg-slate-800/80 border-[#005bbf]/40"
                            : "bg-[#f5f3f3] border-[#005bbf]/20"
                        }`}
                      >
                        <p className="font-quicksand font-bold text-xs">{n.title}</p>
                        <p className={`text-[11px] mt-0.5 ${isDarkMode ? "text-slate-400" : "text-[#414754]"}`}>{n.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={() => setShowSettingsModal(true)}
              className={`p-2.5 rounded-2xl transition-colors ${
                isDarkMode ? "bg-slate-800 text-slate-200 hover:bg-slate-700" : "bg-[#f5f3f3] text-[#005bbf] hover:bg-[#eae8e7]"
              }`}
              aria-label="Settings"
            >
              <span className="material-symbols-outlined text-xl block">settings</span>
            </button>
          </div>
        </header>

        {/* 🌟 VIEW 1: OVERVIEW */}
        {activeView === "overview" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
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

              <div className="lg:col-span-4 grid grid-cols-2 gap-3.5">
                <div className={`p-4 rounded-3xl border flex flex-col justify-between shadow-xs transition-colors ${
                  isDarkMode ? "bg-[#111827] border-slate-800" : "bg-white border-[#eae8e7]"
                }`}>
                  <div className="w-10 h-10 rounded-2xl bg-[#005bbf]/10 text-[#005bbf] flex items-center justify-center mb-2">
                    <span className="material-symbols-outlined text-xl">groups</span>
                  </div>
                  <div>
                    <p className="text-2xl font-bold font-quicksand">{approvedStudentsCount}</p>
                    <p className={`text-[11px] font-semibold ${isDarkMode ? "text-slate-400" : "text-[#727785]"}`}>Active Students</p>
                  </div>
                </div>

                <div className={`p-4 rounded-3xl border flex flex-col justify-between shadow-xs transition-colors ${
                  isDarkMode ? "bg-[#111827] border-slate-800" : "bg-white border-[#eae8e7]"
                }`}>
                  <div className="w-10 h-10 rounded-full bg-[#ac3509]/10 text-[#ac3509] flex items-center justify-center mb-2">
                    <span className="material-symbols-outlined text-xl">person_add</span>
                  </div>
                  <div>
                    <p className="text-2xl font-bold font-quicksand">{invites.length}</p>
                    <p className={`text-[11px] font-semibold ${isDarkMode ? "text-slate-400" : "text-[#727785]"}`}>Pending Requests</p>
                  </div>
                </div>

                <div className={`p-4 rounded-3xl border flex flex-col justify-between shadow-xs transition-colors ${
                  isDarkMode ? "bg-[#111827] border-slate-800" : "bg-white border-[#eae8e7]"
                }`}>
                  <div className="w-10 h-10 rounded-2xl bg-[#0f9d58]/10 text-[#0f9d58] flex items-center justify-center mb-2">
                    <span className="material-symbols-outlined text-xl">today</span>
                  </div>
                  <div>
                    <p className="text-2xl font-bold font-quicksand">{todayMeetings.length}</p>
                    <p className={`text-[11px] font-semibold ${isDarkMode ? "text-slate-400" : "text-[#727785]"}`}>Today&apos;s Classes</p>
                  </div>
                </div>

                <div className={`p-4 rounded-3xl border flex flex-col justify-between shadow-xs transition-colors ${
                  isDarkMode ? "bg-[#111827] border-slate-800" : "bg-white border-[#eae8e7]"
                }`}>
                  <div className="w-10 h-10 rounded-2xl bg-[#fe6f42]/10 text-[#fe6f42] flex items-center justify-center mb-2">
                    <span className="material-symbols-outlined text-xl">chat</span>
                  </div>
                  <div>
                    <p className="text-2xl font-bold font-quicksand">{unreadDirectMessagesCount}</p>
                    <p className={`text-[11px] font-semibold ${isDarkMode ? "text-slate-400" : "text-[#727785]"}`}>New Messages</p>
                  </div>
                </div>
              </div>
            </div>

            {invites.length > 0 && (
              <div className={`rounded-3xl p-5 border shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors ${
                isDarkMode ? "bg-[#111827] border-[#ac3509]/40" : "bg-white border-[#ac3509]/20"
              }`}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-[#ac3509]/10 text-[#ac3509] flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-xl">notification_important</span>
                  </div>
                  <div>
                    <h3 className="font-quicksand font-bold text-sm">
                      {invites.length} Student Registration Request{invites.length === 1 ? "" : "s"} Awaiting Approval
                    </h3>
                    <p className={`text-xs ${isDarkMode ? "text-slate-400" : "text-[#727785]"}`}>Review and grant classroom access to new student sign-ups.</p>
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

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className={`lg:col-span-8 rounded-3xl p-6 border shadow-xs flex flex-col justify-between transition-colors ${
                isDarkMode ? "bg-[#111827] border-slate-800" : "bg-white border-[#eae8e7]"
              }`}>
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-quicksand font-bold text-base flex items-center gap-2">
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
                          className={`flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl border transition-all gap-4 ${
                            isDarkMode ? "bg-[#1f2937] border-slate-800 hover:border-[#005bbf]/50" : "bg-[#fbf9f8] border-[#eae8e7] hover:border-[#005bbf]/30"
                          }`}
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
                              <h4 className="font-quicksand font-bold text-sm truncate">{meet.topic}</h4>
                              <p className="text-xs text-[#005bbf] font-semibold truncate">
                                With: {meet.studentName || "General Class Session"}
                              </p>
                              <p className={`text-[11px] mt-0.5 flex items-center gap-1 font-medium ${isDarkMode ? "text-slate-400" : "text-[#727785]"}`}>
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
                      <div className={`p-8 rounded-2xl text-center border border-dashed transition-colors ${
                        isDarkMode ? "bg-[#1f2937] border-slate-800" : "bg-[#fbf9f8] border-[#eae8e7]"
                      }`}>
                        <span className={`material-symbols-outlined text-3xl mb-1 ${isDarkMode ? "text-slate-500" : "text-[#727785]"}`}>event_available</span>
                        <p className={`text-xs font-medium ${isDarkMode ? "text-slate-400" : "text-[#727785]"}`}>No live sessions scheduled for today.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className={`lg:col-span-4 rounded-3xl p-6 border shadow-xs flex flex-col justify-between transition-colors ${
                isDarkMode ? "bg-[#111827] border-slate-800" : "bg-white border-[#eae8e7]"
              }`}>
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-quicksand font-bold text-base flex items-center gap-2">
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
                          <span className="font-quicksand font-bold text-xs truncate">{s.name}</span>
                          <span className="font-bold text-xs text-[#005bbf]">{s.progress}%</span>
                        </div>
                        <div className={`h-2 w-full rounded-full overflow-hidden ${isDarkMode ? "bg-slate-800" : "bg-[#eae8e7]"}`}>
                          <div
                            className="h-full bg-[#005bbf] rounded-full transition-all duration-500"
                            style={{ width: `${s.progress}%` }}
                          />
                        </div>
                      </div>
                    ))}
                    {students.length === 0 && (
                      <p className={`text-xs text-center py-6 ${isDarkMode ? "text-slate-400" : "text-[#727785]"}`}>No enrolled students yet.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 💬 VIEW 2: DIRECT STUDENT MESSAGES */}
        {activeView === "direct_messages" && (
          <div className="space-y-4">
            <div>
              <h2 className="font-quicksand font-bold text-xl">Student Direct Messages</h2>
              <p className={`text-xs ${isDarkMode ? "text-slate-400" : "text-[#727785]"}`}>Private 1-on-1 messages with student file attachments and review.</p>
            </div>

            <div className={`flex flex-col md:flex-row h-[calc(100dvh-200px)] min-h-[520px] max-h-[700px] rounded-3xl border overflow-hidden shadow-xs transition-colors ${
              isDarkMode ? "bg-[#111827] border-slate-800" : "bg-white border-[#eae8e7]"
            }`}>
              <div
                className={`w-full md:w-80 shrink-0 border-r flex-col h-full transition-colors ${
                  isDarkMode ? "bg-[#1f2937]/50 border-slate-800" : "bg-[#fbf9f8] border-[#eae8e7]"
                } ${selectedChatStudent ? "hidden md:flex" : "flex"}`}
              >
                <div className={`p-4 border-b space-y-3 shrink-0 transition-colors ${
                  isDarkMode ? "bg-[#111827] border-slate-800" : "bg-white border-[#eae8e7]"
                }`}>
                  <div className="flex items-center justify-between">
                    <h3 className="font-quicksand font-bold text-sm flex items-center gap-2">
                      <span className="material-symbols-outlined text-[#005bbf]">chat</span>
                      Conversations
                    </h3>
                    <span className="text-xs font-bold bg-[#005bbf]/10 text-[#005bbf] px-2.5 py-0.5 rounded-full">
                      {students.length}
                    </span>
                  </div>

                  <div className="relative">
                    <span className={`material-symbols-outlined text-xs absolute left-3 top-2.5 ${isDarkMode ? "text-slate-500" : "text-[#727785]"}`}>
                      search
                    </span>
                    <input
                      type="text"
                      placeholder="Search student..."
                      className={`w-full border rounded-xl pl-8 pr-3 py-1.5 text-xs focus:outline-none focus:border-[#005bbf] transition-colors ${
                        isDarkMode ? "bg-slate-800 border-slate-700 text-slate-100 placeholder-slate-500" : "bg-[#f5f3f3] border-[#eae8e7] text-[#1b1c1c]"
                      }`}
                      value={searchStudentTerm}
                      onChange={(e) => setSearchStudentTerm(e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-2">
                  {filteredChatStudents.length === 0 ? (
                    <p className={`text-xs text-center py-10 ${isDarkMode ? "text-slate-400" : "text-[#727785]"}`}>No students found.</p>
                  ) : (
                    filteredChatStudents.map((st) => {
                      const isSelected = selectedChatStudent?.id === st.id;
                      const studentMsgs = allDirectMessages.filter(
                        (m) => m.studentId === st.id || m.studentEmail?.toLowerCase() === st.email.toLowerCase()
                      );
                      const latestMsg = studentMsgs[studentMsgs.length - 1];
                      const unreadCount = studentMsgs.filter(
                        (m) => m.senderRole === "STUDENT" && !m.read
                      ).length;

                      return (
                        <button
                          key={st.id}
                          onClick={() => handleSelectStudentThread(st)}
                          className={`w-full p-3 rounded-2xl text-left transition-all flex items-center gap-3 border cursor-pointer ${
                            isSelected
                              ? "bg-[#005bbf] text-white border-[#005bbf] shadow-sm"
                              : isDarkMode
                              ? "bg-[#111827] border-slate-800 text-slate-100 hover:border-[#005bbf]/50"
                              : "bg-white border-[#eae8e7] text-[#1b1c1c] hover:border-[#005bbf]/30"
                          }`}
                        >
                          <div className="relative shrink-0">
                            <Image
                              src={st.avatar}
                              alt={st.name}
                              width={40}
                              height={40}
                              unoptimized
                              referrerPolicy="no-referrer"
                              className="w-10 h-10 rounded-xl object-cover border border-white/20"
                            />
                            {unreadCount > 0 && !isSelected && (
                              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-[#ac3509] rounded-full border-2 border-white flex items-center justify-center text-[9px] text-white font-bold" />
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex justify-between items-center">
                              <h4 className={`font-quicksand font-bold text-xs truncate ${isSelected ? "text-white" : ""}`}>
                                {st.name}
                              </h4>
                              {unreadCount > 0 && !isSelected && (
                                <span className="bg-[#ac3509] text-white text-[9px] font-bold px-1.5 py-0.2 rounded-full shrink-0">
                                  {unreadCount}
                                </span>
                              )}
                            </div>
                            <p className={`text-[11px] truncate mt-0.5 ${
                              isSelected ? "text-white/80" : isDarkMode ? "text-slate-400" : "text-[#727785]"
                            }`}>
                              {latestMsg ? (latestMsg.text || `📎 ${latestMsg.attachmentName || "Attachment"}`) : "No messages yet"}
                            </p>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              <div
                className={`flex-1 flex-col justify-between h-full min-w-0 ${
                  isDarkMode ? "bg-[#111827]" : "bg-white"
                } ${selectedChatStudent ? "flex" : "hidden md:flex"}`}
              >
                {selectedChatStudent ? (
                  <>
                    <div className={`p-3.5 sm:p-4 border-b flex items-center justify-between shadow-2xs shrink-0 transition-colors ${
                      isDarkMode ? "bg-[#111827] border-slate-800" : "bg-white border-[#eae8e7]"
                    }`}>
                      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                        <button
                          onClick={() => setSelectedChatStudent(null)}
                          className={`md:hidden p-1.5 -ml-1 rounded-xl transition-colors ${
                            isDarkMode ? "text-slate-400 hover:text-[#005bbf] hover:bg-slate-800" : "text-[#727785] hover:text-[#005bbf] hover:bg-[#f5f3f3]"
                          }`}
                          title="Back to conversations"
                        >
                          <span className="material-symbols-outlined text-xl block">arrow_back</span>
                        </button>

                        <Image
                          src={selectedChatStudent.avatar}
                          alt={selectedChatStudent.name}
                          width={36}
                          height={36}
                          unoptimized
                          referrerPolicy="no-referrer"
                          className="w-9 h-9 rounded-xl object-cover border border-[#005bbf] shrink-0"
                        />
                        <div className="min-w-0">
                          <h4 className="font-quicksand font-bold text-xs sm:text-sm truncate">
                            {selectedChatStudent.name}
                          </h4>
                          <p className={`text-[10px] sm:text-[11px] truncate ${isDarkMode ? "text-slate-400" : "text-[#727785]"}`}>{selectedChatStudent.email}</p>
                        </div>
                      </div>

                      <button
                        onClick={() => openScheduleForStudent(selectedChatStudent.id)}
                        className="bg-[#005bbf]/10 text-[#005bbf] hover:bg-[#005bbf]/20 px-2.5 sm:px-3.5 py-1.5 rounded-xl font-quicksand font-bold text-xs flex items-center gap-1 shrink-0"
                      >
                        <span className="material-symbols-outlined text-sm">videocam</span>
                        <span className="hidden sm:inline">Schedule Call</span>
                      </button>
                    </div>

                    <div
                      ref={teacherChatContainerRef}
                      className={`flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-3.5 transition-colors ${
                        isDarkMode ? "bg-[#090d16]" : "bg-[#fbf9f8]"
                      }`}
                    >
                      {allDirectMessages.filter(
                        (m) => m.studentId === selectedChatStudent.id || m.studentEmail?.toLowerCase() === selectedChatStudent.email.toLowerCase()
                      ).length === 0 ? (
                        <div className={`h-full flex flex-col items-center justify-center text-center py-10 ${isDarkMode ? "text-slate-400" : "text-[#727785]"}`}>
                          <span className="material-symbols-outlined text-3xl text-[#005bbf] mb-1">chat</span>
                          <p className="text-xs">No direct messages exchanged with {selectedChatStudent.name} yet.</p>
                        </div>
                      ) : (
                        allDirectMessages
                          .filter(
                            (m) => m.studentId === selectedChatStudent.id || m.studentEmail?.toLowerCase() === selectedChatStudent.email.toLowerCase()
                          )
                          .map((msg) => {
                            const isMe = msg.senderRole === "TEACHER";
                            const formattedTime = new Date(msg.createdAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            });

                            return (
                              <div key={msg.id} className={`flex items-end gap-2.5 group ${isMe ? "justify-end" : "justify-start"}`}>
                                {!isMe && (
                                  <Image
                                    src={selectedChatStudent.avatar}
                                    alt={selectedChatStudent.name}
                                    width={28}
                                    height={28}
                                    unoptimized
                                    referrerPolicy="no-referrer"
                                    className="w-7 h-7 rounded-xl object-cover border border-[#005bbf] shrink-0"
                                  />
                                )}

                                {isMe && (
                                  <button
                                    onClick={() => handleDeleteDirectMessage(msg.id)}
                                    className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-[#ac3509] p-1 rounded-lg transition-all"
                                    title="Delete Message"
                                  >
                                    <span className="material-symbols-outlined text-sm">delete</span>
                                  </button>
                                )}

                                <div
                                  className={`max-w-[80%] sm:max-w-[70%] p-3.5 rounded-2xl text-xs shadow-2xs space-y-2 ${
                                    isMe
                                      ? "bg-[#005bbf] text-white rounded-tr-none"
                                      : isDarkMode
                                      ? "bg-[#1f2937] text-slate-100 border border-slate-800 rounded-tl-none"
                                      : "bg-white text-[#1b1c1c] border border-[#eae8e7] rounded-tl-none"
                                  }`}
                                >
                                  {!isMe && (
                                    <p className="font-quicksand font-bold text-[11px] text-[#005bbf]">
                                      {selectedChatStudent.name}
                                    </p>
                                  )}

                                  {msg.text && (
                                    <p className="whitespace-pre-wrap break-words leading-relaxed text-xs sm:text-[13px]">
                                      {msg.text}
                                    </p>
                                  )}

                                  {msg.attachmentUrl && (
                                    <div className={`p-2.5 rounded-xl border ${
                                      isMe
                                        ? "bg-white/10 border-white/20"
                                        : isDarkMode
                                        ? "bg-slate-800 border-slate-700"
                                        : "bg-[#fbf9f8] border-[#eae8e7]"
                                    }`}>
                                      {msg.attachmentType === "image" ? (
                                        <a href={msg.attachmentUrl} target="_blank" rel="noopener noreferrer" className="block">
                                          <Image
                                            src={msg.attachmentUrl}
                                            alt={msg.attachmentName || "Attached Image"}
                                            width={240}
                                            height={160}
                                            unoptimized
                                            className="rounded-lg object-cover max-h-48 w-full border border-black/5"
                                          />
                                          <span className="text-[10px] mt-1 inline-flex items-center gap-1 font-semibold underline">
                                            <span className="material-symbols-outlined text-xs">image</span>
                                            {msg.attachmentName || "View Image"}
                                          </span>
                                        </a>
                                      ) : (
                                        <a
                                          href={msg.attachmentUrl}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="inline-flex items-center gap-2 font-quicksand font-bold text-xs hover:underline"
                                        >
                                          <span className="material-symbols-outlined text-lg">
                                            {msg.attachmentType === "pdf" ? "picture_as_pdf" : "description"}
                                          </span>
                                          <span className="truncate max-w-[200px]">{msg.attachmentName || "View Document"}</span>
                                          <span className="material-symbols-outlined text-xs">open_in_new</span>
                                        </a>
                                      )}
                                    </div>
                                  )}

                                  <div className={`text-[9px] text-right font-medium ${
                                    isMe ? "text-white/80" : isDarkMode ? "text-slate-400" : "text-[#727785]"
                                  }`}>
                                    {formattedTime}
                                  </div>
                                </div>
                              </div>
                            );
                          })
                      )}
                    </div>

                    {teacherDirectFile && (
                      <div className={`px-4 py-2 border-t flex items-center justify-between text-xs shrink-0 transition-colors ${
                        isDarkMode ? "bg-slate-800 border-slate-700" : "bg-[#f5f3f3] border-[#eae8e7]"
                      }`}>
                        <div className="flex items-center gap-2 text-[#005bbf] font-semibold truncate">
                          <span className="material-symbols-outlined text-base">attach_file</span>
                          <span className="truncate max-w-xs">{teacherDirectFile.name}</span>
                        </div>
                        <button
                          onClick={() => setTeacherDirectFile(null)}
                          className="text-[#ac3509] hover:bg-[#ac3509]/10 p-1 rounded-full"
                          title="Remove file"
                        >
                          <span className="material-symbols-outlined text-base">close</span>
                        </button>
                      </div>
                    )}

                    <div className={`p-3 border-t flex items-center gap-2 shrink-0 transition-colors ${
                      isDarkMode ? "bg-[#111827] border-slate-800" : "bg-white border-[#eae8e7]"
                    }`}>
                      <label className={`p-2.5 rounded-full text-[#005bbf] cursor-pointer transition-colors shrink-0 ${
                        isDarkMode ? "hover:bg-slate-800" : "hover:bg-[#f5f3f3]"
                      }`} title="Attach image, PDF, or document">
                        <span className="material-symbols-outlined text-xl block">attach_file</span>
                        <input
                          type="file"
                          accept="image/*,.pdf,.doc,.docx"
                          className="hidden"
                          onChange={(e) => setTeacherDirectFile(e.target.files?.[0] || null)}
                        />
                      </label>

                      <input
                        type="text"
                        placeholder={`Reply to ${selectedChatStudent.name}...`}
                        className={`flex-1 border rounded-full px-4 py-2.5 text-xs sm:text-sm focus:outline-none focus:border-[#005bbf] transition-colors ${
                          isDarkMode ? "bg-slate-800 border-slate-700 text-slate-100 placeholder-slate-500" : "bg-[#f5f3f3] border-[#eae8e7] text-[#1b1c1c]"
                        }`}
                        value={teacherDirectInput}
                        onChange={(e) => setTeacherDirectInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleTeacherSendDirectMessage()}
                      />

                      <button
                        onClick={handleTeacherSendDirectMessage}
                        disabled={isSendingTeacherDirect || (!teacherDirectInput.trim() && !teacherDirectFile)}
                        className="bg-[#005bbf] hover:bg-[#004493] text-white px-5 py-2.5 rounded-full text-xs font-quicksand font-bold transition-colors disabled:opacity-40 shrink-0 flex items-center gap-1"
                      >
                        <span>{isSendingTeacherDirect ? "Sending..." : "Send"}</span>
                        <span className="material-symbols-outlined text-sm">send</span>
                      </button>
                    </div>
                  </>
                ) : (
                  <div className={`h-full flex flex-col items-center justify-center text-center p-6 ${isDarkMode ? "text-slate-400" : "text-[#727785]"}`}>
                    <span className="material-symbols-outlined text-4xl text-[#005bbf] mb-2">person_search</span>
                    <p className="text-xs">Select a student on the left to view direct messages.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 📋 VIEW 3: STUDENT REQUESTS */}
        {activeView === "approvals" && (
          <div className="space-y-5">
            <div>
              <h2 className="font-quicksand font-bold text-xl">Student Requests ({invites.length})</h2>
              <p className={`text-xs ${isDarkMode ? "text-slate-400" : "text-[#727785]"}`}>Review and grant access to students attempting to sign in.</p>
            </div>

            {invites.length === 0 ? (
              <div className={`rounded-3xl p-12 text-center border transition-colors ${
                isDarkMode ? "bg-[#111827] border-slate-800" : "bg-white border-[#eae8e7]"
              }`}>
                <span className="material-symbols-outlined text-4xl text-[#005bbf] mb-2">check_circle</span>
                <h3 className="font-quicksand font-bold text-base">No Pending Requests</h3>
                <p className={`text-xs mt-1 ${isDarkMode ? "text-slate-400" : "text-[#727785]"}`}>All student access requests have been authorized.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {invites.map((invite) => (
                  <div
                    key={invite.id}
                    className={`rounded-3xl p-5 border shadow-xs flex flex-col justify-between gap-4 transition-colors ${
                      isDarkMode ? "bg-[#111827] border-slate-800" : "bg-white border-[#eae8e7]"
                    }`}
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
                          <h4 className="font-quicksand font-bold text-base truncate">{invite.name}</h4>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                            isDarkMode ? "bg-slate-800 text-slate-300" : "bg-[#f5f3f3] text-[#727785]"
                          }`}>{invite.date}</span>
                        </div>
                        <p className={`text-xs truncate mt-0.5 ${isDarkMode ? "text-slate-400" : "text-[#727785]"}`}>{invite.email}</p>
                      </div>
                    </div>

                    <div className={`flex gap-2.5 pt-2 border-t ${isDarkMode ? "border-slate-800" : "border-[#eae8e7]"}`}>
                      <button
                        onClick={() => handleAcceptInvite(invite)}
                        className="flex-1 bg-[#005bbf] hover:bg-[#004493] text-white py-2 rounded-xl text-xs font-quicksand font-bold transition-all active:scale-95 shadow-xs"
                      >
                        Authorize Access
                      </button>
                      <button
                        onClick={() => handleDeclineInvite(invite)}
                        className={`flex-1 py-2 rounded-xl text-xs font-quicksand font-bold transition-colors ${
                          isDarkMode ? "bg-slate-800 hover:bg-slate-700 text-slate-300" : "bg-[#f5f3f3] hover:bg-[#eae8e7] text-[#414754]"
                        }`}
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

        {/* 👥 VIEW 4: STUDENTS DIRECTORY */}
        {activeView === "students" && (
          <div className="space-y-5">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="font-quicksand font-bold text-xl">Enrolled Students ({students.length})</h2>
                <p className={`text-xs ${isDarkMode ? "text-slate-400" : "text-[#727785]"}`}>Manage student authorizations and schedule one-on-one sessions.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {students.map((student) => {
                const isApproved = student.status === "approved" || student.status === "active";
                return (
                  <div
                    key={student.id}
                    onClick={() => setSelectedStudent(student)}
                    className={`rounded-3xl p-5 border hover:border-[#005bbf]/50 transition-all cursor-pointer flex flex-col justify-between shadow-xs ${
                      isDarkMode ? "bg-[#111827] border-slate-800" : "bg-white border-[#eae8e7]"
                    }`}
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
                          <h3 className="font-quicksand font-bold text-base truncate">{student.name}</h3>
                          <p className={`text-xs truncate ${isDarkMode ? "text-slate-400" : "text-[#727785]"}`}>{student.email}</p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs mb-3">
                        <span
                          className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] ${
                            isApproved ? "bg-[#0f9d58]/10 text-[#0f9d58]" : "bg-[#ac3509]/10 text-[#ac3509]"
                          }`}
                        >
                          {isApproved ? "Approved" : "Access Revoked"}
                        </span>
                        <span className="text-[11px] font-bold text-[#005bbf]">{student.progress}% Complete</span>
                      </div>

                      <div className={`h-1.5 w-full rounded-full overflow-hidden ${isDarkMode ? "bg-slate-800" : "bg-[#eae8e7]"}`}>
                        <div className="h-full bg-[#005bbf] rounded-full" style={{ width: `${student.progress}%` }} />
                      </div>
                    </div>

                    <div className={`mt-4 pt-3 border-t flex items-center justify-between ${isDarkMode ? "border-slate-800" : "border-[#eae8e7]"}`}>
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

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openScheduleForStudent(student.id);
                        }}
                        className="bg-[#005bbf] text-white hover:bg-[#004493] px-3.5 py-1.5 rounded-xl font-quicksand font-bold text-xs flex items-center gap-1"
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

        {/* 📝 VIEW 5: ASSIGNMENTS */}
        {activeView === "assignments" && (
          <div className="space-y-5">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="font-quicksand font-bold text-xl">Assignments ({assignments.length})</h2>
                <p className={`text-xs ${isDarkMode ? "text-slate-400" : "text-[#727785]"}`}>Create coursework, track student completion, and deliver individual remarks.</p>
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
              {assignments.map((assignment) => {
                const totalSubmissions =
                  assignment.submissions?.length || assignment.completedStudentIds?.length || 0;

                return (
                  <div
                    key={assignment.id}
                    className={`rounded-3xl p-5 border shadow-xs flex flex-col justify-between gap-4 transition-colors ${
                      isDarkMode ? "bg-[#111827] border-slate-800" : "bg-white border-[#eae8e7]"
                    }`}
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

                      <h3 className="font-quicksand font-bold text-base">{assignment.title}</h3>

                      {assignment.description && (
                        <p className={`text-xs my-2 p-2.5 rounded-2xl border ${
                          isDarkMode ? "bg-[#1f2937] border-slate-800 text-slate-300" : "bg-[#fbf9f8] border-[#eae8e7] text-[#414754]"
                        }`}>
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
                          <span>Teacher Material File</span>
                        </a>
                      )}

                      <div className={`mt-2 text-xs space-y-0.5 ${isDarkMode ? "text-slate-400" : "text-[#727785]"}`}>
                        <p>Cohort: {assignment.section}</p>
                        <p className="font-semibold text-[#ac3509]">Due Date: {assignment.dueDate}</p>
                      </div>
                    </div>

                    <div className={`space-y-2 pt-3 border-t ${isDarkMode ? "border-slate-800" : "border-[#eae8e7]"}`}>
                      {/* 👁️ View Submissions & Give Remarks Button */}
                      <button
                        onClick={() => setSelectedAssignmentSubmissions(assignment)}
                        className="w-full bg-[#005bbf]/10 hover:bg-[#005bbf]/20 text-[#005bbf] py-2 rounded-xl text-xs font-quicksand font-bold flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <span className="material-symbols-outlined text-base">visibility</span>
                        <span>View Submissions ({totalSubmissions})</span>
                      </button>

                      <div className="flex gap-2">
                        <button
                          onClick={() => handleToggleAssignmentStatus(assignment.id)}
                          className={`flex-1 py-2 rounded-xl text-xs font-quicksand font-bold transition-all ${
                            assignment.status === "completed"
                              ? isDarkMode
                                ? "bg-slate-800 text-slate-300"
                                : "bg-[#f5f3f3] text-[#414754]"
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
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 🏫 VIEW 6: SECTIONS */}
        {activeView === "sections" && (
          <div className="space-y-5">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="font-quicksand font-bold text-xl">Academic Sections ({sections.length})</h2>
                <p className={`text-xs ${isDarkMode ? "text-slate-400" : "text-[#727785]"}`}>Create class cohorts and conduct group discussions.</p>
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
                    className={`rounded-3xl p-5 border shadow-xs flex flex-col justify-between space-y-4 transition-colors ${
                      isDarkMode ? "bg-[#111827] border-slate-800" : "bg-white border-[#eae8e7]"
                    }`}
                  >
                    <div>
                      <div className={`flex items-center justify-between pb-3 border-b ${isDarkMode ? "border-slate-800" : "border-[#eae8e7]"}`}>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-2xl bg-[#005bbf]/10 text-[#005bbf] flex items-center justify-center font-bold">
                            <span className="material-symbols-outlined text-xl">school</span>
                          </div>
                          <div>
                            <h3 className="font-quicksand font-bold text-base">{section.name}</h3>
                            <p className={`text-xs ${isDarkMode ? "text-slate-400" : "text-[#727785]"}`}>{assignedStudents.length} Students</p>
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
                        <p className={`text-[11px] font-bold uppercase tracking-wider ${isDarkMode ? "text-slate-400" : "text-[#727785]"}`}>Roster</p>
                        {assignedStudents.length === 0 ? (
                          <p className={`text-xs italic py-1 ${isDarkMode ? "text-slate-500" : "text-[#727785]"}`}>No students assigned yet.</p>
                        ) : (
                          <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                            {assignedStudents.map((st) => (
                              <div
                                key={st.id}
                                className={`flex items-center justify-between p-2 rounded-xl text-xs ${
                                  isDarkMode ? "bg-[#1f2937]" : "bg-[#fbf9f8]"
                                }`}
                              >
                                <span className="font-semibold truncate">{st.name}</span>
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

                    <div className={`space-y-2 pt-2 border-t ${isDarkMode ? "border-slate-800" : "border-[#eae8e7]"}`}>
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

        {/* 📅 VIEW 7: LIVE SCHEDULE */}
        {activeView === "schedule" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="font-quicksand font-bold text-xl">Live Meeting Schedule</h2>
                <p className={`text-xs ${isDarkMode ? "text-slate-400" : "text-[#727785]"}`}>Host Google Meet classrooms and monitor upcoming sessions.</p>
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

            <div className={`flex items-center gap-2 border-b pb-3 overflow-x-auto ${isDarkMode ? "border-slate-800" : "border-[#eae8e7]"}`}>
              {(["upcoming", "today", "completed", "all"] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setScheduleFilter(filter)}
                  className={`px-4 py-2 rounded-2xl font-quicksand font-bold text-xs capitalize transition-colors shrink-0 ${
                    scheduleFilter === filter
                      ? "bg-[#005bbf] text-white shadow-xs"
                      : isDarkMode
                      ? "bg-slate-800 text-slate-300 hover:bg-slate-700"
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

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredMeetings.map((meet) => {
                const isCompleted = meet.status === "completed";
                const isToday = meet.date === isoToday;
                const { month, day } = parseMeetingDate(meet.date);

                return (
                  <div
                    key={meet.id}
                    className={`rounded-3xl p-5 border shadow-xs transition-all flex flex-col justify-between gap-4 ${
                      isCompleted
                        ? "opacity-75 border-slate-700"
                        : isToday
                        ? "border-[#005bbf]"
                        : isDarkMode
                        ? "bg-[#111827] border-slate-800"
                        : "bg-white border-[#eae8e7]"
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
                          className={`p-1 rounded-xl transition-colors ${isDarkMode ? "text-slate-400 hover:text-[#ac3509]" : "text-[#727785] hover:text-[#ac3509]"}`}
                        >
                          <span className="material-symbols-outlined text-base">delete</span>
                        </button>
                      </div>

                      <h3 className={`font-quicksand font-bold text-base ${isCompleted ? "line-through opacity-60" : ""}`}>
                        {meet.topic}
                      </h3>

                      <div className={`flex items-center gap-3 p-3 rounded-2xl my-3 border ${
                        isDarkMode ? "bg-[#1f2937] border-slate-800" : "bg-[#fbf9f8] border-[#eae8e7]"
                      }`}>
                        <div className="w-12 h-12 rounded-xl bg-[#005bbf] text-white flex flex-col items-center justify-center font-quicksand shrink-0">
                          <span className="text-[9px] uppercase font-bold">{month}</span>
                          <span className="text-base font-bold leading-tight">{day}</span>
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold">
                            {meet.time} {meet.endTime ? `– ${meet.endTime}` : ""}
                          </p>
                          <p className={`text-[11px] truncate ${isDarkMode ? "text-slate-400" : "text-[#727785]"}`}>
                            {meet.studentName ? `With: ${meet.studentName}` : "General Class Session"}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className={`space-y-2 pt-2 border-t ${isDarkMode ? "border-slate-800" : "border-[#eae8e7]"}`}>
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
                          className={`flex-1 py-1.5 rounded-xl font-quicksand font-bold text-[11px] transition-colors ${
                            isDarkMode ? "bg-slate-800 hover:bg-slate-700 text-slate-300" : "bg-[#f5f3f3] hover:bg-[#eae8e7] text-[#414754]"
                          }`}
                        >
                          {isCompleted ? "Mark Upcoming" : "Mark Completed"}
                        </button>
                        <button
                          onClick={() => setEditingMeeting(meet)}
                          className={`px-3 py-1.5 border rounded-xl font-quicksand font-bold text-[11px] transition-colors ${
                            isDarkMode ? "border-slate-700 hover:bg-slate-800 text-slate-300" : "border-[#eae8e7] hover:bg-[#f5f3f3] text-[#414754]"
                          }`}
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

      {/* 📁 Modal: Student Submissions Inspector & Individual Remarks */}
      {renderModal(
        !!selectedAssignmentSubmissions,
        () => setSelectedAssignmentSubmissions(null),
        `Submissions & Remarks: ${selectedAssignmentSubmissions?.title || ""}`,
        selectedAssignmentSubmissions && (
          <div className="space-y-4">
            <div className={`p-3.5 rounded-2xl border text-xs space-y-1 ${
              isDarkMode ? "bg-[#1f2937] border-slate-800 text-slate-300" : "bg-[#fbf9f8] border-[#eae8e7] text-[#414754]"
            }`}>
              <div className="flex justify-between items-center">
                <span className="font-semibold">Subject: {selectedAssignmentSubmissions.subject}</span>
                <span className="text-[#005bbf] font-bold">Due: {selectedAssignmentSubmissions.dueDate}</span>
              </div>
              <p>Cohort / Section: {selectedAssignmentSubmissions.section}</p>
            </div>

            <div className="space-y-3">
              <h4 className="font-quicksand font-bold text-sm flex items-center gap-2">
                <span className="material-symbols-outlined text-[#005bbf]">task</span>
                Submitted Student Work & Teacher Feedback
              </h4>

              {(() => {
                const submittedStudentIds = selectedAssignmentSubmissions.completedStudentIds || [];
                const explicitSubmissions = selectedAssignmentSubmissions.submissions || [];

                const completedStudents = students.filter(
                  (s) =>
                    submittedStudentIds.includes(s.id) ||
                    submittedStudentIds.includes(s.email) ||
                    explicitSubmissions.some((sub) => sub.studentId === s.id || sub.studentEmail?.toLowerCase() === s.email.toLowerCase())
                );

                if (completedStudents.length === 0 && explicitSubmissions.length === 0) {
                  return (
                    <div className={`p-8 rounded-2xl text-center border border-dashed ${
                      isDarkMode ? "bg-slate-800/40 border-slate-700 text-slate-400" : "bg-[#fbf9f8] border-[#eae8e7] text-[#727785]"
                    }`}>
                      <span className="material-symbols-outlined text-3xl mb-1 text-[#005bbf]">assignment_late</span>
                      <p className="text-xs font-medium">No student submissions recorded for this assignment yet.</p>
                    </div>
                  );
                }

                return (
                  <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                    {completedStudents.map((st) => {
                      const studentSubmission = explicitSubmissions.find(
                        (sub) => sub.studentId === st.id || sub.studentEmail?.toLowerCase() === st.email.toLowerCase()
                      );

                      const currentDraft =
                        remarksDraft[st.id] !== undefined
                          ? remarksDraft[st.id]
                          : studentSubmission?.remarks || "";

                      return (
                        <div
                          key={st.id}
                          className={`p-4 rounded-2xl border flex flex-col gap-3 ${
                            isDarkMode ? "bg-[#1f2937] border-slate-800" : "bg-white border-[#eae8e7]"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                              <Image
                                src={st.avatar}
                                alt={st.name}
                                width={36}
                                height={36}
                                unoptimized
                                referrerPolicy="no-referrer"
                                className="w-9 h-9 rounded-xl object-cover border border-[#005bbf] shrink-0"
                              />
                              <div className="min-w-0">
                                <h5 className="font-quicksand font-bold text-xs truncate">{st.name}</h5>
                                <p className={`text-[11px] truncate ${isDarkMode ? "text-slate-400" : "text-[#727785]"}`}>{st.email}</p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <span className="bg-[#0f9d58]/10 text-[#0f9d58] text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                                <span className="material-symbols-outlined text-xs">check_circle</span>
                                Submitted
                              </span>

                              {studentSubmission?.attachmentUrl ? (
                                <a
                                  href={studentSubmission.attachmentUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="bg-[#005bbf] text-white px-3 py-1.5 rounded-xl text-xs font-quicksand font-bold hover:bg-[#004493] flex items-center gap-1 shadow-xs transition-all active:scale-95"
                                >
                                  <span className="material-symbols-outlined text-sm">open_in_new</span>
                                  <span>View File</span>
                                </a>
                              ) : (
                                <span className={`text-[10px] italic ${isDarkMode ? "text-slate-500" : "text-[#727785]"}`}>
                                  Completed (No File)
                                </span>
                              )}
                            </div>
                          </div>

                          {/* 💬 Teacher Remarks Section */}
                          <div className={`pt-3 border-t space-y-1.5 ${isDarkMode ? "border-slate-800" : "border-[#eae8e7]"}`}>
                            <label className={`block text-[11px] font-semibold flex items-center gap-1 ${
                              isDarkMode ? "text-slate-300" : "text-[#414754]"
                            }`}>
                              <span className="material-symbols-outlined text-sm text-[#005bbf]">rate_review</span>
                              <span>Teacher Remarks / Feedback for {st.name}:</span>
                            </label>

                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                placeholder="e.g. Well done! Great handwriting and correct answers."
                                className={`flex-1 border rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#005bbf] transition-colors ${
                                  isDarkMode
                                    ? "bg-slate-800 border-slate-700 text-slate-100 placeholder-slate-500"
                                    : "bg-[#f5f3f3] border-[#eae8e7] text-[#1b1c1c]"
                                }`}
                                value={currentDraft}
                                onChange={(e) =>
                                  setRemarksDraft({ ...remarksDraft, [st.id]: e.target.value })
                                }
                              />

                              <button
                                onClick={() =>
                                  handleSaveStudentRemarks(
                                    selectedAssignmentSubmissions.id,
                                    st.id,
                                    st.email,
                                    currentDraft
                                  )
                                }
                                disabled={savingRemarkStudentId === st.id}
                                className="bg-[#005bbf] hover:bg-[#004493] text-white px-3.5 py-2 rounded-xl text-xs font-quicksand font-bold shrink-0 shadow-xs transition-all active:scale-95 disabled:opacity-50 flex items-center gap-1"
                              >
                                <span className="material-symbols-outlined text-sm">save</span>
                                <span>{savingRemarkStudentId === st.id ? "Saving..." : "Save Remark"}</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          </div>
        )
      )}

      {/* 📅 Modal: Schedule Google Meet */}
      {renderModal(
        showScheduleModal,
        () => setShowScheduleModal(false),
        "Schedule Google Meet Session",
        <div className="space-y-4">
          <div>
            <label className={`block text-xs font-semibold mb-1.5 ${isDarkMode ? "text-slate-300" : "text-[#414754]"}`}>Assign to Student (Optional)</label>
            <select
              className={`w-full border rounded-2xl px-4 py-2.5 text-xs sm:text-sm focus:outline-none focus:border-[#005bbf] transition-colors ${
                isDarkMode ? "bg-slate-800 border-slate-700 text-slate-100" : "bg-white border-[#eae8e7] text-[#1b1c1c]"
              }`}
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
            <label className={`block text-xs font-semibold mb-1.5 ${isDarkMode ? "text-slate-300" : "text-[#414754]"}`}>Session Topic *</label>
            <input
              type="text"
              placeholder="e.g. Reading Phonics & Numbers"
              className={`w-full border rounded-2xl px-4 py-2.5 text-xs sm:text-sm focus:outline-none focus:border-[#005bbf] transition-colors ${
                isDarkMode ? "bg-slate-800 border-slate-700 text-slate-100 placeholder-slate-500" : "bg-white border-[#eae8e7] text-[#1b1c1c]"
              }`}
              value={scheduleForm.topic}
              onChange={(e) => setScheduleForm({ ...scheduleForm, topic: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className={`block text-xs font-semibold mb-1.5 ${isDarkMode ? "text-slate-300" : "text-[#414754]"}`}>Date *</label>
              <input
                type="date"
                className={`w-full border rounded-2xl px-3 py-2 text-xs sm:text-sm focus:outline-none focus:border-[#005bbf] transition-colors ${
                  isDarkMode ? "bg-slate-800 border-slate-700 text-slate-100" : "bg-white border-[#eae8e7] text-[#1b1c1c]"
                }`}
                value={scheduleForm.date}
                onChange={(e) => setScheduleForm({ ...scheduleForm, date: e.target.value })}
              />
            </div>
            <div>
              <label className={`block text-xs font-semibold mb-1.5 ${isDarkMode ? "text-slate-300" : "text-[#414754]"}`}>Start Time *</label>
              <input
                type="text"
                placeholder="10:00 AM"
                className={`w-full border rounded-2xl px-3 py-2 text-xs sm:text-sm focus:outline-none focus:border-[#005bbf] transition-colors ${
                  isDarkMode ? "bg-slate-800 border-slate-700 text-slate-100 placeholder-slate-500" : "bg-white border-[#eae8e7] text-[#1b1c1c]"
                }`}
                value={scheduleForm.time}
                onChange={(e) => setScheduleForm({ ...scheduleForm, time: e.target.value })}
              />
            </div>
            <div>
              <label className={`block text-xs font-semibold mb-1.5 ${isDarkMode ? "text-slate-300" : "text-[#414754]"}`}>End Time *</label>
              <input
                type="text"
                placeholder="10:50 AM"
                className={`w-full border rounded-2xl px-3 py-2 text-xs sm:text-sm focus:outline-none focus:border-[#005bbf] transition-colors ${
                  isDarkMode ? "bg-slate-800 border-slate-700 text-slate-100 placeholder-slate-500" : "bg-white border-[#eae8e7] text-[#1b1c1c]"
                }`}
                value={scheduleForm.endTime}
                onChange={(e) => setScheduleForm({ ...scheduleForm, endTime: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className={`block text-xs font-semibold mb-1.5 ${isDarkMode ? "text-slate-300" : "text-[#414754]"}`}>Google Meet Room Link</label>
            <input
              type="url"
              placeholder="https://meet.google.com/..."
              className={`w-full border rounded-2xl px-4 py-2.5 text-xs sm:text-sm focus:outline-none focus:border-[#005bbf] transition-colors ${
                isDarkMode ? "bg-slate-800 border-slate-700 text-slate-100 placeholder-slate-500" : "bg-white border-[#eae8e7] text-[#1b1c1c]"
              }`}
              value={scheduleForm.meetLink}
              onChange={(e) => setScheduleForm({ ...scheduleForm, meetLink: e.target.value })}
            />
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
              <label className={`block text-xs font-semibold mb-1.5 ${isDarkMode ? "text-slate-300" : "text-[#414754]"}`}>Session Topic</label>
              <input
                type="text"
                className={`w-full border rounded-2xl px-4 py-2 text-xs sm:text-sm focus:outline-none focus:border-[#005bbf] transition-colors ${
                  isDarkMode ? "bg-slate-800 border-slate-700 text-slate-100" : "bg-white border-[#eae8e7] text-[#1b1c1c]"
                }`}
                value={editingMeeting.topic}
                onChange={(e) => setEditingMeeting({ ...editingMeeting, topic: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className={`block text-xs font-semibold mb-1.5 ${isDarkMode ? "text-slate-300" : "text-[#414754]"}`}>Date</label>
                <input
                  type="date"
                  className={`w-full border rounded-2xl px-3 py-2 text-xs sm:text-sm focus:outline-none focus:border-[#005bbf] transition-colors ${
                    isDarkMode ? "bg-slate-800 border-slate-700 text-slate-100" : "bg-white border-[#eae8e7] text-[#1b1c1c]"
                  }`}
                  value={editingMeeting.date}
                  onChange={(e) => setEditingMeeting({ ...editingMeeting, date: e.target.value })}
                />
              </div>
              <div>
                <label className={`block text-xs font-semibold mb-1.5 ${isDarkMode ? "text-slate-300" : "text-[#414754]"}`}>Start Time</label>
                <input
                  type="text"
                  className={`w-full border rounded-2xl px-3 py-2 text-xs sm:text-sm focus:outline-none focus:border-[#005bbf] transition-colors ${
                    isDarkMode ? "bg-slate-800 border-slate-700 text-slate-100" : "bg-white border-[#eae8e7] text-[#1b1c1c]"
                  }`}
                  value={editingMeeting.time}
                  onChange={(e) => setEditingMeeting({ ...editingMeeting, time: e.target.value })}
                />
              </div>
              <div>
                <label className={`block text-xs font-semibold mb-1.5 ${isDarkMode ? "text-slate-300" : "text-[#414754]"}`}>End Time</label>
                <input
                  type="text"
                  className={`w-full border rounded-2xl px-3 py-2 text-xs sm:text-sm focus:outline-none focus:border-[#005bbf] transition-colors ${
                    isDarkMode ? "bg-slate-800 border-slate-700 text-slate-100" : "bg-white border-[#eae8e7] text-[#1b1c1c]"
                  }`}
                  value={editingMeeting.endTime || ""}
                  onChange={(e) => setEditingMeeting({ ...editingMeeting, endTime: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label className={`block text-xs font-semibold mb-1.5 ${isDarkMode ? "text-slate-300" : "text-[#414754]"}`}>Google Meet Link</label>
              <input
                type="url"
                className={`w-full border rounded-2xl px-4 py-2 text-xs sm:text-sm focus:outline-none focus:border-[#005bbf] transition-colors ${
                  isDarkMode ? "bg-slate-800 border-slate-700 text-slate-100" : "bg-white border-[#eae8e7] text-[#1b1c1c]"
                }`}
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
            <label className={`block text-xs font-semibold mb-1.5 ${isDarkMode ? "text-slate-300" : "text-[#414754]"}`}>Title *</label>
            <input
              type="text"
              placeholder="e.g. Alphabet Soup Worksheet"
              className={`w-full border rounded-2xl px-4 py-2.5 text-xs sm:text-sm focus:outline-none focus:border-[#005bbf] transition-colors ${
                isDarkMode ? "bg-slate-800 border-slate-700 text-slate-100 placeholder-slate-500" : "bg-white border-[#eae8e7] text-[#1b1c1c]"
              }`}
              value={newAssignment.title}
              onChange={(e) => setNewAssignment({ ...newAssignment, title: e.target.value })}
            />
          </div>

          <div>
            <label className={`block text-xs font-semibold mb-1.5 ${isDarkMode ? "text-slate-300" : "text-[#414754]"}`}>Description (Optional)</label>
            <textarea
              rows={3}
              placeholder="Instructions and details..."
              className={`w-full border rounded-2xl px-4 py-2.5 text-xs sm:text-sm focus:outline-none focus:border-[#005bbf] transition-colors ${
                isDarkMode ? "bg-slate-800 border-slate-700 text-slate-100 placeholder-slate-500" : "bg-white border-[#eae8e7] text-[#1b1c1c]"
              }`}
              value={newAssignment.description}
              onChange={(e) => setNewAssignment({ ...newAssignment, description: e.target.value })}
            />
          </div>

          <div>
            <label className={`block text-xs font-semibold mb-1.5 ${isDarkMode ? "text-slate-300" : "text-[#414754]"}`}>Attach Learning File</label>
            <input
              type="file"
              accept="image/*,.pdf,.doc,.docx"
              className={`w-full text-xs file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:bg-[#005bbf]/10 file:text-[#005bbf] file:font-bold hover:file:bg-[#005bbf]/20 cursor-pointer ${
                isDarkMode ? "text-slate-400" : "text-[#727785]"
              }`}
              onChange={(e) => setTeacherFile(e.target.files?.[0] || null)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={`block text-xs font-semibold mb-1.5 ${isDarkMode ? "text-slate-300" : "text-[#414754]"}`}>Subject</label>
              <input
                type="text"
                placeholder="Reading, Math"
                className={`w-full border rounded-2xl px-4 py-2.5 text-xs sm:text-sm focus:outline-none focus:border-[#005bbf] transition-colors ${
                  isDarkMode ? "bg-slate-800 border-slate-700 text-slate-100 placeholder-slate-500" : "bg-white border-[#eae8e7] text-[#1b1c1c]"
                }`}
                value={newAssignment.subject}
                onChange={(e) => setNewAssignment({ ...newAssignment, subject: e.target.value })}
              />
            </div>
            <div>
              <label className={`block text-xs font-semibold mb-1.5 ${isDarkMode ? "text-slate-300" : "text-[#414754]"}`}>Cohort Section</label>
              <select
                className={`w-full border rounded-2xl px-4 py-2.5 text-xs sm:text-sm focus:outline-none focus:border-[#005bbf] transition-colors ${
                  isDarkMode ? "bg-slate-800 border-slate-700 text-slate-100" : "bg-white border-[#eae8e7] text-[#1b1c1c]"
                }`}
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
            <label className={`block text-xs font-semibold mb-1.5 ${isDarkMode ? "text-slate-300" : "text-[#414754]"}`}>Specific Student (Optional)</label>
            <select
              className={`w-full border rounded-2xl px-4 py-2.5 text-xs sm:text-sm focus:outline-none focus:border-[#005bbf] transition-colors ${
                isDarkMode ? "bg-slate-800 border-slate-700 text-slate-100" : "bg-white border-[#eae8e7] text-[#1b1c1c]"
              }`}
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
            <label className={`block text-xs font-semibold mb-1.5 ${isDarkMode ? "text-slate-300" : "text-[#414754]"}`}>Due Date</label>
            <input
              type="text"
              placeholder="e.g. Tomorrow, Aug 28"
              className={`w-full border rounded-2xl px-4 py-2.5 text-xs sm:text-sm focus:outline-none focus:border-[#005bbf] transition-colors ${
                isDarkMode ? "bg-slate-800 border-slate-700 text-slate-100 placeholder-slate-500" : "bg-white border-[#eae8e7] text-[#1b1c1c]"
              }`}
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
            <label className={`block text-xs font-semibold mb-1.5 ${isDarkMode ? "text-slate-300" : "text-[#414754]"}`}>Section Name</label>
            <input
              type="text"
              placeholder="e.g. Section C"
              className={`w-full border rounded-2xl px-4 py-2.5 text-xs sm:text-sm focus:outline-none focus:border-[#005bbf] transition-colors ${
                isDarkMode ? "bg-slate-800 border-slate-700 text-slate-100 placeholder-slate-500" : "bg-white border-[#eae8e7] text-[#1b1c1c]"
              }`}
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
            <label className={`block text-xs font-semibold mb-1.5 ${isDarkMode ? "text-slate-300" : "text-[#414754]"}`}>Select Approved Student</label>
            <select
              className={`w-full border rounded-2xl px-4 py-2.5 text-xs sm:text-sm focus:outline-none focus:border-[#005bbf] transition-colors ${
                isDarkMode ? "bg-slate-800 border-slate-700 text-slate-100" : "bg-white border-[#eae8e7] text-[#1b1c1c]"
              }`}
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
          <div className={`flex flex-col h-[480px] rounded-2xl overflow-hidden border transition-colors ${
            isDarkMode ? "bg-[#111827] border-slate-800" : "bg-white border-[#eae8e7]"
          }`}>
            <div className={`flex-1 overflow-y-auto p-4 space-y-3 ${isDarkMode ? "bg-[#090d16]" : "bg-[#fbf9f8]"}`}>
              {chatMessages.map((msg) => {
                const isMe = msg.senderEmail.toLowerCase() === session?.user?.email?.toLowerCase();
                return (
                  <div key={msg.id} className={`flex items-end gap-2 group ${isMe ? "justify-end" : "justify-start"}`}>
                    {!isMe && (
                      <span className={`text-[10px] mb-0.5 px-1 font-semibold ${isDarkMode ? "text-slate-400" : "text-[#727785]"}`}>
                        {msg.senderName} ({msg.senderRole})
                      </span>
                    )}

                    {isMe && (
                      <button
                        onClick={() => handleDeleteSectionMessage(msg.id)}
                        className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-[#ac3509] p-1 rounded-lg transition-all"
                        title="Delete Message"
                      >
                        <span className="material-symbols-outlined text-sm">delete</span>
                      </button>
                    )}

                    <div
                      className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-xs ${
                        isMe
                          ? "bg-[#005bbf] text-white rounded-tr-none"
                          : isDarkMode
                          ? "bg-[#1f2937] text-slate-100 border border-slate-800 rounded-tl-none"
                          : "bg-white text-[#1b1c1c] border border-[#eae8e7] rounded-tl-none"
                      }`}
                    >
                      {msg.text}
                    </div>
                  </div>
                );
              })}
              <div ref={chatEndRef} />
            </div>

            <div className={`p-3 border-t flex items-center gap-2 ${isDarkMode ? "border-slate-800 bg-[#111827]" : "border-[#eae8e7] bg-white"}`}>
              <input
                type="text"
                placeholder="Type a message to the cohort..."
                className={`flex-1 border rounded-full px-4 py-2.5 text-xs sm:text-sm focus:outline-none focus:border-[#005bbf] transition-colors ${
                  isDarkMode ? "bg-slate-800 border-slate-700 text-slate-100 placeholder-slate-500" : "bg-[#f5f3f3] border-[#eae8e7] text-[#1b1c1c]"
                }`}
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
                <p className={`text-xs truncate ${isDarkMode ? "text-slate-400" : "text-[#727785]"}`}>{selectedStudent.email}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className={`rounded-2xl p-3 border ${isDarkMode ? "bg-slate-800/60 border-slate-700" : "bg-[#fbf9f8] border-[#eae8e7]"}`}>
                <p className={`text-[10px] ${isDarkMode ? "text-slate-400" : "text-[#727785]"}`}>Cohort</p>
                <p className="font-semibold truncate">{selectedStudent.sectionName || "No Cohort"}</p>
              </div>
              <div className={`rounded-2xl p-3 border ${isDarkMode ? "bg-slate-800/60 border-slate-700" : "bg-[#fbf9f8] border-[#eae8e7]"}`}>
                <p className={`text-[10px] ${isDarkMode ? "text-slate-400" : "text-[#727785]"}`}>Mastery</p>
                <p className="font-semibold text-[#005bbf]">{selectedStudent.progress}%</p>
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <button
                onClick={() => {
                  handleSelectStudentThread(selectedStudent);
                  setSelectedStudent(null);
                  setActiveView("direct_messages");
                }}
                className="w-full bg-[#005bbf]/10 hover:bg-[#005bbf]/20 text-[#005bbf] py-2.5 rounded-2xl font-quicksand font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
              >
                <span className="material-symbols-outlined text-base">chat</span>
                <span>Send Direct Message</span>
              </button>

              <button
                onClick={() => {
                  openScheduleForStudent(selectedStudent.id);
                  setSelectedStudent(null);
                }}
                className="w-full bg-[#005bbf] hover:bg-[#004493] text-white py-2.5 rounded-2xl font-quicksand font-bold text-xs flex items-center justify-center gap-1.5"
              >
                <span className="material-symbols-outlined text-base">videocam</span>
                <span>Schedule Class Session</span>
              </button>

              <button
                onClick={() => handleDeleteStudent(selectedStudent)}
                className="w-full bg-[#ac3509]/10 hover:bg-[#ac3509]/20 text-[#ac3509] py-2.5 rounded-2xl font-quicksand font-bold text-xs flex items-center justify-center gap-1.5 active:scale-95"
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
          <div className={`p-3.5 rounded-2xl flex items-center gap-3 border ${
            isDarkMode ? "bg-slate-800/60 border-slate-700" : "bg-[#fbf9f8] border-[#eae8e7]"
          }`}>
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
              <h4 className="font-quicksand font-bold text-sm truncate">{userName}</h4>
              <p className={`text-xs truncate ${isDarkMode ? "text-slate-400" : "text-[#727785]"}`}>{session?.user?.email}</p>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className={`block text-xs font-semibold ${isDarkMode ? "text-slate-300" : "text-[#414754]"}`}>Default Google Meet Link</label>
            <input
              type="url"
              value={defaultMeetLink}
              onChange={(e) => setDefaultMeetLink(e.target.value)}
              className={`w-full border rounded-2xl px-4 py-2.5 text-xs sm:text-sm focus:outline-none focus:border-[#005bbf] transition-colors ${
                isDarkMode ? "bg-slate-800 border-slate-700 text-slate-100" : "bg-white border-[#eae8e7] text-[#1b1c1c]"
              }`}
            />
          </div>

          <div className={`space-y-3 pt-2 border-t ${isDarkMode ? "border-slate-800" : "border-[#eae8e7]"}`}>
            <h5 className="font-quicksand font-bold text-xs">Preferences</h5>
            
            <label className="flex items-center justify-between cursor-pointer py-1">
              <span className={`text-xs font-medium ${isDarkMode ? "text-slate-300" : "text-[#414754]"}`}>Dark Mode Theme</span>
              <input
                type="checkbox"
                checked={isDarkMode}
                onChange={toggleTheme}
                className="w-4 h-4 accent-[#005bbf] rounded cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between cursor-pointer py-1">
              <span className={`text-xs font-medium ${isDarkMode ? "text-slate-300" : "text-[#414754]"}`}>Email Alerts</span>
              <input
                type="checkbox"
                checked={emailAlerts}
                onChange={(e) => setEmailAlerts(e.target.checked)}
                className="w-4 h-4 accent-[#005bbf] rounded cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between cursor-pointer py-1">
              <span className={`text-xs font-medium ${isDarkMode ? "text-slate-300" : "text-[#414754]"}`}>Session Reminders</span>
              <input
                type="checkbox"
                checked={sessionReminders}
                onChange={(e) => setSessionReminders(e.target.checked)}
                className="w-4 h-4 accent-[#005bbf] rounded cursor-pointer"
              />
            </label>
          </div>

          <div className={`pt-3 border-t ${isDarkMode ? "border-slate-800" : "border-[#eae8e7]"}`}>
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
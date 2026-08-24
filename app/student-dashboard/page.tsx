"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { useSession, signOut } from "next-auth/react";
import { uploadAssignmentFile } from "@/lib/upload";

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
  dueDate: string;
  status: "active" | "completed";
};

type SectionMessage = {
  id: string;
  sectionId: string;
  senderEmail: string;
  senderName: string;
  senderRole: string;
  senderAvatar?: string | null;
  text: string;
  seenBy?: string[];
  createdAt: string;
};

type TyperUser = {
  id: string;
  userEmail: string;
  userName: string;
  userAvatar?: string | null;
};

type Classmate = {
  id: string;
  name: string;
  avatar?: string | null;
  email: string;
  role?: string;
};

type Meeting = {
  id: string;
  studentId?: string | null;
  studentName?: string | null;
  studentEmail?: string | null;
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

export default function StudentDashboard() {
  const { data: session, status } = useSession();
  const [approvalStatus, setApprovalStatus] = useState<"loading" | "pending" | "approved">("loading");
  const [assignedSection, setAssignedSection] = useState<string | null>(null);
  const [currentSectionId, setCurrentSectionId] = useState<string | null>(null);
  const [classmates, setClassmates] = useState<Classmate[]>([]);
  const [imageError, setImageError] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeNav, setActiveNav] = useState<
    "learning" | "assignments" | "classes" | "sections" | "resources"
  >("learning");

  // Real Database Assignments State
  const [assignments, setAssignments] = useState<Assignment[]>([]);

  // Real Database Scheduled Meetings State
  const [meetings, setMeetings] = useState<Meeting[]>([]);

  // Student File Attachments State
  const [studentFiles, setStudentFiles] = useState<{ [key: string]: File | null }>({});
  const [uploadingId, setUploadingId] = useState<string | null>(null);

  // Section Group Chat & Typing State
  const [sectionChatMessages, setSectionChatMessages] = useState<SectionMessage[]>([]);
  const [studentChatInput, setStudentChatInput] = useState("");
  const [activeTypers, setActiveTypers] = useState<TyperUser[]>([]);
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const lastTypingPingRef = useRef<number>(0);

  // Notifications State
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([
    {
      id: "1",
      title: "New Assignment Posted",
      desc: "Check your assigned tasks for this week.",
      time: "15 mins ago",
      read: false,
    },
    {
      id: "2",
      title: "Class Reminder",
      desc: "Live learning session scheduled. Check your Classes tab.",
      time: "1 hour ago",
      read: false,
    },
  ]);

  // Settings State
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [soundEffects, setSoundEffects] = useState(true);
  const [dailyProgress, setDailyProgress] = useState(0);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [sectionChatMessages, activeTypers]);

  // Check Student Approval Status & Section
  useEffect(() => {
    const userRole = (session?.user as any)?.role;

    if (
      status === "authenticated" &&
      (userRole === "TEACHER" || userRole === "teacher")
    ) {
      window.location.href = "/teacher-dashboard";
      return;
    }

    async function checkApproval() {
      try {
        const res = await fetch("/api/student/status");
        if (res.ok) {
          const data = await res.json();
          if (data.student?.status === "approved") {
            setApprovalStatus("approved");

            const secName = data.student.section?.name || data.student.sectionName || null;
            const secId = data.student.sectionId || data.student.section?.id || null;

            setAssignedSection(secName);
            setCurrentSectionId(secId);
          } else {
            setApprovalStatus("pending");
          }
        } else {
          setApprovalStatus("pending");
        }
      } catch (err) {
        console.error("Failed to check approval status:", err);
        setApprovalStatus("pending");
      }
    }

    if (status === "authenticated") {
      checkApproval();
    } else if (status === "unauthenticated") {
      setApprovalStatus("pending");
    }
  }, [status, session]);

  // Fetch Scheduled Meetings from Database (Polls every 5s)
  useEffect(() => {
    async function fetchMeetings() {
      try {
        const res = await fetch("/api/meetings");
        if (res.ok) {
          const data = await res.json();
          if (data.meetings) {
            const currentStudentId = (session?.user as any)?.id;
            const currentStudentEmail = session?.user?.email?.toLowerCase();

            const myMeetings = data.meetings.filter((m: Meeting) => {
              if (m.status !== "upcoming") return false;
              if (!m.studentId && !m.studentEmail) return true;
              const matchesId = m.studentId && m.studentId === currentStudentId;
              const matchesEmail =
                m.studentEmail &&
                currentStudentEmail &&
                m.studentEmail.toLowerCase() === currentStudentEmail;
              return matchesId || matchesEmail;
            });

            setMeetings(myMeetings);
          }
        }
      } catch (err) {
        console.error("Failed to fetch meetings for student:", err);
      }
    }

    if (status === "authenticated") {
      fetchMeetings();
      const interval = setInterval(fetchMeetings, 5000);
      return () => clearInterval(interval);
    }
  }, [status, session]);

  // Fetch Section Group Chat Messages & Typers (Polls every 2.5s)
  useEffect(() => {
    if (!currentSectionId) return;

    async function fetchChatData() {
      try {
        const [msgRes, typingRes] = await Promise.all([
          fetch(`/api/sections/messages?sectionId=${currentSectionId}`),
          fetch(`/api/sections/typing?sectionId=${currentSectionId}`),
        ]);

        if (msgRes.ok) {
          const msgData = await msgRes.json();
          setSectionChatMessages(msgData.messages || []);
        }

        if (typingRes.ok) {
          const typingData = await typingRes.json();
          setActiveTypers(typingData.typers || []);
        }
      } catch (err) {
        console.error("Failed to load section chat data:", err);
      }
    }

    if (status === "authenticated") {
      fetchChatData();
      const interval = setInterval(fetchChatData, 2500);
      return () => clearInterval(interval);
    }
  }, [currentSectionId, status]);

  // Trigger Typing Ping when Student is typing
  const handleTypingInput = (text: string) => {
    setStudentChatInput(text);

    if (!currentSectionId) return;

    const now = Date.now();
    if (now - lastTypingPingRef.current > 2000) {
      lastTypingPingRef.current = now;
      fetch("/api/sections/typing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sectionId: currentSectionId }),
      }).catch((err) => console.error("Typing ping failed:", err));
    }
  };

  // Send Student Section Message
  const handleSendStudentMessage = async () => {
    if (!studentChatInput.trim() || !currentSectionId) return;

    const textToSend = studentChatInput.trim();
    setStudentChatInput("");

    try {
      const res = await fetch("/api/sections/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sectionId: currentSectionId,
          text: textToSend,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.message) {
          setSectionChatMessages((prev) => [...prev, data.message]);
        }
      } else {
        alert("Failed to send message.");
      }
    } catch (err) {
      console.error("Failed to post message:", err);
    }
  };

  // Fetch Assignments from Database & Calculate Daily Progress
  useEffect(() => {
    async function fetchAssignments() {
      try {
        const res = await fetch("/api/assignments");
        if (res.ok) {
          const data = await res.json();
          if (data.assignments) {
            const currentStudentId = (session?.user as any)?.id;
            const currentStudentName = session?.user?.name;

            const myAssignments = data.assignments.filter((a: Assignment) => {
              if (!a.studentId && !a.studentName) return true;
              const matchesId = a.studentId && a.studentId === currentStudentId;
              const matchesName =
                a.studentName &&
                currentStudentName &&
                a.studentName.toLowerCase() === currentStudentName.toLowerCase();
              return matchesId || matchesName;
            });

            setAssignments(myAssignments);

            // Compute actual assignment progress
            if (myAssignments.length > 0) {
              const completedCount = myAssignments.filter((a: Assignment) => a.status === "completed").length;
              setDailyProgress(Math.round((completedCount / myAssignments.length) * 100));
            } else {
              setDailyProgress(0);
            }
          }
        }
      } catch (err) {
        console.error("Failed to fetch assignments for student:", err);
      }
    }

    if (status === "authenticated") {
      fetchAssignments();
      const interval = setInterval(fetchAssignments, 5000);
      return () => clearInterval(interval);
    }
  }, [status, session]);

  const handleFileChange = (assignmentId: string, file: File | null) => {
    setStudentFiles((prev) => ({ ...prev, [assignmentId]: file }));
  };

  const handleToggleAssignment = async (id: string, currentStatus: "active" | "completed") => {
    const nextStatus = currentStatus === "active" ? "completed" : "active";
    let uploadedUrl: string | null = null;

    if (nextStatus === "completed" && studentFiles[id]) {
      setUploadingId(id);
      try {
        uploadedUrl = await uploadAssignmentFile(studentFiles[id]!);
      } catch (err) {
        console.error("Failed to upload student attachment:", err);
      }
    }

    setAssignments((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: nextStatus } : a))
    );

    try {
      const res = await fetch("/api/assignments", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          status: nextStatus,
          studentAttachmentUrl: uploadedUrl,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.assignment) {
          setAssignments((prev) =>
            prev.map((a) => (a.id === id ? data.assignment : a))
          );
        }
        setStudentFiles((prev) => ({ ...prev, [id]: null }));
      }
    } catch (err) {
      console.error("Failed to update assignment status:", err);
    } finally {
      setUploadingId(null);
    }
  };

  const userImage = session?.user?.image;
  const rawName = session?.user?.name || session?.user?.email || "Student";
  const firstName = rawName.split(" ")[0];
  const userInitial = firstName.charAt(0).toUpperCase();

  const unreadNotificationsCount = notifications.filter((n) => !n.read).length;

  const markNotificationAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const markAllNotificationsAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const navItems = [
    { id: "learning" as const, icon: "dashboard", label: "My Learning" },
    { id: "assignments" as const, icon: "assignment", label: "Assignments" },
    { id: "classes" as const, icon: "videocam", label: "Classes" },
    { id: "sections" as const, icon: "groups", label: "My Section" },
    { id: "resources" as const, icon: "library_books", label: "Resources" },
  ];

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

  const hasActiveAssignments = assignments.length > 0;
  const activeAssignmentsCount = assignments.filter((a) => a.status === "active").length;
  const completedAssignmentsCount = assignments.filter((a) => a.status === "completed").length;

  const renderModal = (
    open: boolean,
    onClose: () => void,
    title: string,
    children: React.ReactNode
  ) => {
    if (!open) return null;
    return (
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60] flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
        <div className="bg-white rounded-3xl p-5 sm:p-6 max-w-[720px] w-full shadow-2xl my-auto relative max-h-[90vh] overflow-y-auto">
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

  if (approvalStatus === "loading") {
    return (
      <div className="min-h-screen bg-[#fbf9f8] flex flex-col items-center justify-center gap-3">
        <div className="w-10 h-10 border-4 border-[#005bbf] border-t-transparent rounded-full animate-spin" />
        <p className="font-quicksand font-bold text-sm text-[#005bbf]">
          Verifying account status...
        </p>
      </div>
    );
  }

  if (approvalStatus === "pending") {
    return (
      <div className="min-h-screen w-full bg-[#fbf9f8] flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-8 max-w-[620px] w-full text-center border border-[#eae8e7] shadow-xl space-y-6">
          <div className="w-16 h-16 bg-[#005bbf]/10 text-[#005bbf] rounded-2xl flex items-center justify-center mx-auto">
            <span className="material-symbols-outlined text-3xl">hourglass_top</span>
          </div>

          <div className="space-y-2">
            <h2 className="font-quicksand font-bold text-2xl text-[#1b1c1c]">
              Account Approval Pending
            </h2>
            <p className="text-xs sm:text-sm text-[#414754] leading-relaxed">
              Hi <strong className="text-[#1b1c1c]">{firstName}</strong>! Your student account (
              <span className="text-[#005bbf] font-medium">{session?.user?.email}</span>) is awaiting authorization.
            </p>
            <p className="text-xs text-[#727785] leading-relaxed">
              Your instructor will authorize your access shortly.
            </p>
          </div>

          <div className="pt-2 space-y-3">
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-[#005bbf] hover:bg-[#004493] text-white font-quicksand font-bold py-3 rounded-2xl text-xs sm:text-sm transition-all shadow-sm active:scale-95 flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-lg">refresh</span>
              <span>Check Status Again</span>
            </button>

            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="w-full bg-[#f5f3f3] hover:bg-[#eae8e7] text-[#414754] font-quicksand font-bold py-2.5 rounded-2xl text-xs transition-colors flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-base">logout</span>
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#fbf9f8] text-[#1b1c1c] font-inter min-h-screen flex flex-col md:flex-row antialiased">
      {/* 🧭 Modern Slim Sidebar */}
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
              <span className="text-[11px] text-[#727785] font-medium">Student Portal</span>
            </div>
          </div>

          {/* User Profile Card */}
          <div className="p-3.5 bg-[#fbf9f8] rounded-2xl border border-[#eae8e7]/80 flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-full border-2 border-[#005bbf] p-0.5 bg-white text-[#005bbf] flex items-center justify-center overflow-hidden font-quicksand font-bold text-lg shrink-0">
              {userImage && !imageError ? (
                <Image
                  src={userImage}
                  alt={rawName}
                  width={48}
                  height={48}
                  unoptimized
                  referrerPolicy="no-referrer"
                  onError={() => setImageError(true)}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <span>{userInitial}</span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="font-quicksand font-bold text-sm text-[#1b1c1c] truncate">{firstName}</h4>
              {assignedSection ? (
                <span className="inline-flex items-center gap-1 text-[10px] text-[#005bbf] font-bold bg-[#005bbf]/10 px-2 py-0.5 rounded-full mt-0.5">
                  <span className="material-symbols-outlined text-[12px]">school</span>
                  {assignedSection}
                </span>
              ) : (
                <span className="text-[11px] text-[#727785]">No Section</span>
              )}
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex flex-col gap-1.5">
            {navItems.map((item) => {
              const isActive = activeNav === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveNav(item.id)}
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
                  {item.id === "assignments" && activeAssignmentsCount > 0 && (
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                        isActive ? "bg-white/20 text-white" : "bg-[#ac3509]/10 text-[#ac3509]"
                      }`}
                    >
                      {activeAssignmentsCount}
                    </span>
                  )}
                  {item.id === "classes" && meetings.length > 0 && (
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                        isActive ? "bg-white/20 text-white" : "bg-[#005bbf]/10 text-[#005bbf]"
                      }`}
                    >
                      {meetings.length}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Sidebar Daily Goal Widget (Strictly conditional on assignments) */}
        <div className="p-4 bg-[#f5f3f3] rounded-3xl border border-[#eae8e7]">
          <div className="flex items-center justify-between mb-2">
            <span className="font-quicksand font-bold text-xs text-[#1b1c1c] flex items-center gap-1.5">
              <span className="material-symbols-outlined text-sm text-[#fe6f42]">flag</span>
              Daily Goal
            </span>
            <span className="text-xs font-bold text-[#005bbf]">{dailyProgress}%</span>
          </div>
          <div className="h-2 w-full bg-[#eae8e7] rounded-full overflow-hidden mb-3">
            <div
              className="h-full bg-[#005bbf] rounded-full transition-all duration-500"
              style={{ width: `${dailyProgress}%` }}
            />
          </div>
          <button
            onClick={() => {
              if (hasActiveAssignments) {
                setActiveNav("assignments");
              }
            }}
            disabled={!hasActiveAssignments}
            className={`w-full py-2.5 rounded-xl font-quicksand font-bold text-xs transition-all flex items-center justify-center gap-1.5 shadow-xs ${
              hasActiveAssignments
                ? "bg-[#005bbf] text-white hover:bg-[#004493] active:scale-95 cursor-pointer"
                : "bg-[#eae8e7] text-[#727785] cursor-not-allowed opacity-75"
            }`}
          >
            <span className="material-symbols-outlined text-sm">
              {hasActiveAssignments ? "rocket_launch" : "lock"}
            </span>
            <span>{hasActiveAssignments ? "Start Daily Goal" : "No Assignments"}</span>
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

      {/* 📱 Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 top-16 bg-black/40 backdrop-blur-sm z-40">
          <div className="bg-white w-[280px] h-full shadow-2xl p-6 flex flex-col justify-between animate-slideRight">
            <div className="space-y-4">
              <div className="flex items-center gap-3 pb-4 border-b border-[#eae8e7]">
                <div className="w-12 h-12 rounded-full border-2 border-[#005bbf] flex items-center justify-center font-bold text-sm bg-white overflow-hidden">
                  {userImage && !imageError ? (
                    <Image
                      src={userImage}
                      alt={rawName}
                      width={48}
                      height={48}
                      unoptimized
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span>{userInitial}</span>
                  )}
                </div>
                <div>
                  <h3 className="font-quicksand font-bold text-sm text-[#1b1c1c]">{firstName}</h3>
                  <p className="text-xs text-[#727785]">{assignedSection || "No Section"}</p>
                </div>
              </div>

              <nav className="flex flex-col gap-1.5">
                {navItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveNav(item.id);
                      setMobileMenuOpen(false);
                    }}
                    className={`flex items-center gap-3 rounded-xl px-4 py-3 font-quicksand font-bold text-xs text-left ${
                      activeNav === item.id ? "bg-[#005bbf] text-white" : "text-[#414754] hover:bg-[#f5f3f3]"
                    }`}
                  >
                    <span className="material-symbols-outlined text-lg">{item.icon}</span>
                    <span>{item.label}</span>
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
        {/* Top Glance Header */}
        <header className="hidden md:flex justify-between items-center bg-white p-4 sm:px-6 rounded-3xl border border-[#eae8e7] shadow-xs">
          <div>
            <h1 className="font-quicksand text-xl lg:text-2xl font-bold text-[#1b1c1c]">
              {activeNav === "learning" && `Welcome back, ${firstName}! ✨`}
              {activeNav === "assignments" && "Assignments & Worksheets"}
              {activeNav === "classes" && "Scheduled Live Classes"}
              {activeNav === "sections" && "Section & Group Discussions"}
              {activeNav === "resources" && "Learning Materials"}
            </h1>
            <p className="text-xs text-[#727785] mt-0.5">
              {activeNav === "learning" && "Track your daily study goals and active assignments."}
              {activeNav === "assignments" && "Complete your assigned tasks and attach your work."}
              {activeNav === "classes" && "Join your live Google Meet classes hosted by your teacher."}
              {activeNav === "sections" && "Engage in class group chat and meet your classmates."}
              {activeNav === "resources" && "Download downloadable printables and reading sheets."}
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

        {/* 🌟 VIEW 1: MY LEARNING (REDESIGNED BENTO HUB) */}
        {activeNav === "learning" && (
          <div className="space-y-6">
            {/* Bento Top Row: Hero Banner & Quick Metrics */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Hero Action Card */}
              <div className="lg:col-span-8 bg-gradient-to-br from-[#005bbf] to-[#004493] rounded-3xl p-6 sm:p-8 text-white relative overflow-hidden shadow-sm flex flex-col justify-between min-h-[220px]">
                <div
                  className="absolute -right-10 -bottom-10 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none"
                />
                <div>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/15 backdrop-blur-md rounded-full text-xs font-quicksand font-bold tracking-wide uppercase mb-3">
                    <span className="material-symbols-outlined text-sm">stars</span>
                    Daily Learning Journey
                  </span>
                  <h2 className="font-quicksand text-2xl sm:text-3xl font-bold tracking-tight mb-2">
                    {hasActiveAssignments
                      ? `You have ${activeAssignmentsCount} active assignment${activeAssignmentsCount === 1 ? "" : "s"} today!`
                      : "All caught up! No active assignments right now."}
                  </h2>
                  <p className="text-xs sm:text-sm text-white/80 max-w-0.9">
                    {hasActiveAssignments
                      ? "Complete your tasks and submit your worksheets to advance your learning progress."
                      : "Check back later or ask your instructor in your Section chat for new activities."}
                  </p>
                </div>

                <div className="pt-5 flex flex-wrap items-center gap-4">
                  <button
                    onClick={() => {
                      if (hasActiveAssignments) setActiveNav("assignments");
                    }}
                    disabled={!hasActiveAssignments}
                    className={`px-6 py-3 rounded-2xl font-quicksand font-bold text-xs sm:text-sm shadow-md transition-all flex items-center gap-2 ${
                      hasActiveAssignments
                        ? "bg-[#fe6f42] text-white hover:bg-[#fe5b27] active:scale-95 cursor-pointer"
                        : "bg-white/20 text-white/60 cursor-not-allowed"
                    }`}
                  >
                    <span className="material-symbols-outlined text-base">
                      {hasActiveAssignments ? "play_arrow" : "lock"}
                    </span>
                    <span>{hasActiveAssignments ? "Continue Learning Goal" : "Goal Locked (No Tasks)"}</span>
                  </button>

                  {assignedSection && (
                    <span className="text-xs bg-white/15 px-4 py-2.5 rounded-2xl font-semibold backdrop-blur-md">
                      🏫 Section: {assignedSection}
                    </span>
                  )}
                </div>
              </div>

              {/* Learning Stats Bento Card */}
              <div className="lg:col-span-4 grid grid-cols-2 gap-3.5">
                <div className="bg-white p-4 rounded-3xl border border-[#eae8e7] flex flex-col justify-between shadow-xs">
                  <div className="w-10 h-10 rounded-2xl bg-[#005bbf]/10 text-[#005bbf] flex items-center justify-center mb-2">
                    <span className="material-symbols-outlined text-xl">assignment</span>
                  </div>
                  <div>
                    <p className="text-2xl font-bold font-quicksand text-[#1b1c1c]">{activeAssignmentsCount}</p>
                    <p className="text-[11px] text-[#727785] font-semibold">Active Tasks</p>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-3xl border border-[#eae8e7] flex flex-col justify-between shadow-xs">
                  <div className="w-10 h-10 rounded-2xl bg-[#0f9d58]/10 text-[#0f9d58] flex items-center justify-center mb-2">
                    <span className="material-symbols-outlined text-xl">task_alt</span>
                  </div>
                  <div>
                    <p className="text-2xl font-bold font-quicksand text-[#1b1c1c]">{completedAssignmentsCount}</p>
                    <p className="text-[11px] text-[#727785] font-semibold">Completed</p>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-3xl border border-[#eae8e7] flex flex-col justify-between shadow-xs">
                  <div className="w-10 h-10 rounded-2xl bg-[#fe6f42]/10 text-[#fe6f42] flex items-center justify-center mb-2">
                    <span className="material-symbols-outlined text-xl">videocam</span>
                  </div>
                  <div>
                    <p className="text-2xl font-bold font-quicksand text-[#1b1c1c]">{meetings.length}</p>
                    <p className="text-[11px] text-[#727785] font-semibold">Live Classes</p>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-3xl border border-[#eae8e7] flex flex-col justify-between shadow-xs">
                  <div className="w-10 h-10 rounded-2xl bg-[#795900]/10 text-[#795900] flex items-center justify-center mb-2">
                    <span className="material-symbols-outlined text-xl">trending_up</span>
                  </div>
                  <div>
                    <p className="text-2xl font-bold font-quicksand text-[#1b1c1c]">{dailyProgress}%</p>
                    <p className="text-[11px] text-[#727785] font-semibold">Completion</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Bento Lower Grid: Live Classes & Assignments Side-by-Side */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Scheduled Live Meetings Preview */}
              <div className="lg:col-span-6 bg-white rounded-3xl p-6 border border-[#eae8e7] shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-quicksand font-bold text-base text-[#1b1c1c] flex items-center gap-2">
                      <span className="material-symbols-outlined text-[#005bbf]">videocam</span>
                      Upcoming Classes ({meetings.length})
                    </h3>
                    <button onClick={() => setActiveNav("classes")} className="text-xs text-[#005bbf] font-bold hover:underline">
                      View All
                    </button>
                  </div>

                  {meetings.length === 0 ? (
                    <div className="py-8 text-center text-[#727785]">
                      <span className="material-symbols-outlined text-3xl mb-1">event_available</span>
                      <p className="text-xs font-medium">No live classes scheduled today.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {meetings.slice(0, 2).map((meet) => {
                        const { month, day } = parseMeetingDate(meet.date);
                        return (
                          <div
                            key={meet.id}
                            className="flex items-center justify-between p-3.5 bg-[#fbf9f8] rounded-2xl border border-[#eae8e7]"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-11 h-11 rounded-xl bg-[#005bbf] text-white flex flex-col items-center justify-center font-quicksand shrink-0">
                                <span className="text-[9px] uppercase font-bold">{month}</span>
                                <span className="text-sm font-bold leading-none">{day}</span>
                              </div>
                              <div className="min-w-0">
                                <h4 className="font-quicksand font-bold text-xs sm:text-sm text-[#1b1c1c] truncate">
                                  {meet.topic}
                                </h4>
                                <p className="text-[11px] text-[#727785]">
                                  {meet.time} {meet.endTime ? `– ${meet.endTime}` : ""}
                                </p>
                              </div>
                            </div>
                            <a
                              href={meet.meetLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="bg-[#005bbf] hover:bg-[#004493] text-white px-3.5 py-1.5 rounded-xl font-quicksand font-bold text-xs flex items-center gap-1 shrink-0"
                            >
                              <span>Join</span>
                            </a>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Active Assignments Preview */}
              <div className="lg:col-span-6 bg-white rounded-3xl p-6 border border-[#eae8e7] shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-quicksand font-bold text-base text-[#1b1c1c] flex items-center gap-2">
                      <span className="material-symbols-outlined text-[#005bbf]">assignment</span>
                      Active Assignments ({activeAssignmentsCount})
                    </h3>
                    <button onClick={() => setActiveNav("assignments")} className="text-xs text-[#005bbf] font-bold hover:underline">
                      View All
                    </button>
                  </div>

                  {assignments.length === 0 ? (
                    <div className="py-8 text-center text-[#727785]">
                      <span className="material-symbols-outlined text-3xl mb-1">task_alt</span>
                      <p className="text-xs font-medium">No active assignments posted.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {assignments.slice(0, 2).map((assignment) => {
                        const isCompleted = assignment.status === "completed";
                        return (
                          <div
                            key={assignment.id}
                            className="flex items-center justify-between p-3.5 bg-[#fbf9f8] rounded-2xl border border-[#eae8e7]"
                          >
                            <div className="min-w-0 pr-2">
                              <span className="text-[10px] font-bold text-[#005bbf] bg-[#005bbf]/10 px-2 py-0.5 rounded-full">
                                {assignment.subject}
                              </span>
                              <h4 className={`font-quicksand font-bold text-xs sm:text-sm text-[#1b1c1c] truncate mt-1 ${
                                isCompleted ? "line-through text-[#727785]" : ""
                              }`}>
                                {assignment.title}
                              </h4>
                              <p className="text-[11px] text-[#727785] mt-0.5">Due: {assignment.dueDate}</p>
                            </div>

                            <button
                              onClick={() => handleToggleAssignment(assignment.id, assignment.status)}
                              className={`px-3 py-1.5 rounded-xl text-xs font-quicksand font-bold shrink-0 transition-colors ${
                                isCompleted ? "bg-[#0f9d58]/10 text-[#0f9d58]" : "bg-[#005bbf] text-white"
                              }`}
                            >
                              {isCompleted ? "Done ✓" : "Mark Done"}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 📝 VIEW 2: DEDICATED ASSIGNMENTS TAB */}
        {activeNav === "assignments" && (
          <div className="space-y-5">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="font-quicksand font-bold text-xl text-[#1b1c1c]">
                  Your Assigned Tasks ({assignments.length})
                </h2>
                <p className="text-xs text-[#727785]">Complete tasks and submit attached work.</p>
              </div>
            </div>

            {assignments.length === 0 ? (
              <div className="bg-white rounded-3xl p-10 text-center border border-[#eae8e7]">
                <span className="material-symbols-outlined text-4xl text-[#005bbf] mb-2">assignment_turned_in</span>
                <h3 className="font-quicksand font-bold text-base text-[#1b1c1c]">No Assignments Available</h3>
                <p className="text-xs text-[#727785] mt-1">Daily goals will unlock as soon as your teacher posts assignments.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {assignments.map((assignment) => {
                  const isCompleted = assignment.status === "completed";
                  return (
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
                              isCompleted ? "bg-[#0f9d58]/10 text-[#0f9d58]" : "bg-[#795900]/10 text-[#795900]"
                            }`}
                          >
                            {isCompleted ? "Completed" : "Active"}
                          </span>
                        </div>

                        <h3 className={`font-quicksand font-bold text-base text-[#1b1c1c] ${isCompleted ? "line-through text-[#727785]" : ""}`}>
                          {assignment.title}
                        </h3>

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
                            <span>View Teacher Attachment</span>
                          </a>
                        )}

                        <div className="mt-2 text-xs text-[#727785] space-y-0.5">
                          <p>Section: {assignment.section}</p>
                          <p className="font-semibold text-[#ac3509]">Due: {assignment.dueDate}</p>
                        </div>

                        {!isCompleted && (
                          <div className="mt-3 pt-2 border-t border-[#eae8e7]">
                            <label className="block text-[11px] font-semibold text-[#414754] mb-1">
                              Attach Completed Work (PDF, Image, Doc)
                            </label>
                            <input
                              type="file"
                              accept="image/*,.pdf,.doc,.docx"
                              className="w-full text-xs text-[#727785] file:mr-2 file:py-1 file:px-3 file:rounded-xl file:border-0 file:bg-[#005bbf]/10 file:text-[#005bbf] file:font-bold hover:file:bg-[#005bbf]/20 cursor-pointer"
                              onChange={(e) => handleFileChange(assignment.id, e.target.files?.[0] || null)}
                            />
                          </div>
                        )}
                      </div>

                      <button
                        onClick={() => handleToggleAssignment(assignment.id, assignment.status)}
                        disabled={uploadingId === assignment.id}
                        className={`w-full py-2.5 rounded-2xl text-xs font-quicksand font-bold transition-all flex items-center justify-center gap-1.5 active:scale-95 ${
                          isCompleted ? "bg-[#f5f3f3] text-[#414754]" : "bg-[#005bbf] text-white hover:bg-[#004493]"
                        }`}
                      >
                        <span className="material-symbols-outlined text-base">
                          {isCompleted ? "undo" : "check_circle"}
                        </span>
                        <span>{isCompleted ? "Mark Incomplete" : "Mark as Complete"}</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* 📅 VIEW 3: CLASSES (LIVE GOOGLE MEET SESSIONS) */}
        {activeNav === "classes" && (
          <div className="space-y-5">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="font-quicksand font-bold text-xl text-[#1b1c1c]">
                  Scheduled Live Classes ({meetings.length})
                </h2>
                <p className="text-xs text-[#727785]">Join your virtual sessions hosted on Google Meet.</p>
              </div>
            </div>

            {meetings.length === 0 ? (
              <div className="bg-white rounded-3xl p-10 text-center border border-[#eae8e7]">
                <span className="material-symbols-outlined text-4xl text-[#005bbf] mb-2">event_busy</span>
                <h3 className="font-quicksand font-bold text-base text-[#1b1c1c]">No Classes Scheduled</h3>
                <p className="text-xs text-[#727785] mt-1">Your teacher has not scheduled any live meetings yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {meetings.map((meet) => {
                  const { month, day } = parseMeetingDate(meet.date);
                  return (
                    <div
                      key={meet.id}
                      className="bg-white rounded-3xl p-5 border border-[#eae8e7] shadow-xs flex flex-col justify-between gap-4"
                    >
                      <div>
                        <div className="flex justify-between items-start mb-3">
                          <span className="bg-[#005bbf]/10 text-[#005bbf] text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                            <span className="material-symbols-outlined text-xs">videocam</span>
                            Live Google Meet
                          </span>
                          <span className="text-[11px] text-[#727785] font-semibold">{meet.date}</span>
                        </div>

                        <h3 className="font-quicksand font-bold text-base text-[#1b1c1c] mb-2">{meet.topic}</h3>

                        <div className="flex items-center gap-3 p-3 bg-[#fbf9f8] rounded-2xl border border-[#eae8e7]">
                          <div className="w-12 h-12 rounded-xl bg-[#005bbf] text-white flex flex-col items-center justify-center font-quicksand shrink-0">
                            <span className="text-[9px] uppercase font-bold">{month}</span>
                            <span className="text-base font-bold leading-tight">{day}</span>
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-[#1b1c1c]">
                              {meet.time} {meet.endTime ? `– ${meet.endTime}` : ""}
                            </p>
                            <p className="text-[11px] text-[#727785]">
                              {meet.studentName ? `Session for: ${meet.studentName}` : "General Class Session"}
                            </p>
                          </div>
                        </div>
                      </div>

                      <a
                        href={meet.meetLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full bg-[#005bbf] hover:bg-[#004493] text-white py-2.5 rounded-2xl font-quicksand font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-all active:scale-95"
                      >
                        <span className="material-symbols-outlined text-base">videocam</span>
                        <span>Join Google Meet</span>
                      </a>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* 🏫 VIEW 4: MY SECTION & CLASSMATES */}
        {activeNav === "sections" && (
          <div className="space-y-6">
            <div className="bg-white rounded-3xl p-6 border border-[#eae8e7] shadow-xs flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-[#005bbf]/10 text-[#005bbf] flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-3xl">school</span>
              </div>
              <div>
                <h2 className="font-quicksand font-bold text-xl text-[#1b1c1c]">
                  {assignedSection ? `Section: ${assignedSection}` : "No Section Assigned"}
                </h2>
                <p className="text-xs text-[#727785]">
                  {assignedSection
                    ? "Connect with your classmates and teachers."
                    : "Ask your teacher to assign you to a section."}
                </p>
              </div>
            </div>

            {assignedSection && currentSectionId ? (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left Panel: Group Members */}
                <div className="lg:col-span-4 bg-white rounded-3xl p-5 border border-[#eae8e7] shadow-xs flex flex-col justify-between">
                  <div>
                    <h3 className="font-quicksand font-bold text-sm text-[#1b1c1c] pb-3 border-b border-[#eae8e7] mb-3 flex items-center gap-2">
                      <span className="material-symbols-outlined text-[#005bbf]">groups</span>
                      Class Members
                    </h3>

                    <div className="space-y-2.5 max-h-[380px] overflow-y-auto">
                      <div className="flex items-center gap-3 p-2.5 bg-[#fbf9f8] rounded-2xl border border-[#005bbf]/20">
                        <div className="w-9 h-9 rounded-full bg-[#005bbf] text-white flex items-center justify-center font-bold text-xs shrink-0">
                          <span className="material-symbols-outlined text-base">school</span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-quicksand font-bold text-xs text-[#1b1c1c]">Class Teacher</p>
                          <span className="text-[10px] text-[#005bbf] font-semibold">Moderator</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 p-2.5 bg-[#fbf9f8] rounded-2xl border border-[#eae8e7]">
                        <div className="w-9 h-9 rounded-full bg-[#005bbf] text-white flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden">
                          {userImage && !imageError ? (
                            <Image
                              src={userImage}
                              alt={rawName}
                              width={36}
                              height={36}
                              unoptimized
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span>{userInitial}</span>
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-quicksand font-bold text-xs text-[#1b1c1c]">{rawName} (You)</p>
                          <span className="text-[10px] text-[#0f9d58] font-semibold">Student</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <p className="text-[11px] text-[#727785] text-center pt-3 border-t border-[#eae8e7]">
                    Section members only.
                  </p>
                </div>

                {/* Right Panel: Chat Stream */}
                <div className="lg:col-span-8 flex flex-col h-[520px] bg-white rounded-3xl overflow-hidden border border-[#eae8e7] shadow-xs">
                  <div className="bg-white border-b border-[#eae8e7] p-4 flex items-center gap-3">
                    <span className="material-symbols-outlined text-[#005bbf]">forum</span>
                    <h3 className="font-quicksand font-bold text-sm text-[#1b1c1c]">
                      {assignedSection} Class Discussion
                    </h3>
                  </div>

                  <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#fbf9f8]">
                    {sectionChatMessages.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-center text-[#727785]">
                        <span className="material-symbols-outlined text-3xl mb-1">chat_bubble_outline</span>
                        <p className="text-xs">No messages yet. Say hi to your class!</p>
                      </div>
                    ) : (
                      sectionChatMessages.map((msg) => {
                        const isMe = msg.senderEmail.toLowerCase() === session?.user?.email?.toLowerCase();
                        return (
                          <div key={msg.id} className={`flex items-end gap-2 ${isMe ? "justify-end" : "justify-start"}`}>
                            {!isMe && (
                              <div className="w-7 h-7 rounded-full bg-[#005bbf] text-white flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden">
                                {msg.senderAvatar ? (
                                  <Image
                                    src={msg.senderAvatar}
                                    alt={msg.senderName}
                                    width={28}
                                    height={28}
                                    unoptimized
                                    referrerPolicy="no-referrer"
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <span>{msg.senderName.charAt(0).toUpperCase()}</span>
                                )}
                              </div>
                            )}
                            <div
                              className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-xs ${
                                isMe ? "bg-[#005bbf] text-white rounded-tr-none" : "bg-white text-[#1b1c1c] border border-[#eae8e7] rounded-tl-none"
                              }`}
                            >
                              {!isMe && <p className="font-bold text-[10px] text-[#005bbf] mb-0.5">{msg.senderName}</p>}
                              <p className="whitespace-pre-wrap break-words">{msg.text}</p>
                            </div>
                          </div>
                        );
                      })
                    )}
                    <div ref={chatEndRef} />
                  </div>

                  <div className="p-3 border-t border-[#eae8e7] flex items-center gap-2 bg-white">
                    <input
                      type="text"
                      placeholder="Type a message to your section..."
                      className="flex-1 bg-[#f5f3f3] border border-[#eae8e7] rounded-full px-4 py-2 text-xs focus:outline-none focus:border-[#005bbf]"
                      value={studentChatInput}
                      onChange={(e) => handleTypingInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSendStudentMessage()}
                    />
                    <button
                      onClick={handleSendStudentMessage}
                      disabled={!studentChatInput.trim()}
                      className="bg-[#005bbf] hover:bg-[#004493] text-white px-4 py-2 rounded-full text-xs font-quicksand font-bold disabled:opacity-40"
                    >
                      Send
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-3xl p-8 text-center border border-[#eae8e7]">
                <span className="material-symbols-outlined text-4xl text-[#727785] mb-2">chat_error</span>
                <p className="text-xs text-[#727785]">Section chat will unlock once assigned to a class.</p>
              </div>
            )}
          </div>
        )}

        {/* 📚 VIEW 5: RESOURCES */}
        {activeNav === "resources" && (
          <div className="space-y-4">
            <div className="bg-white rounded-3xl p-6 border border-[#eae8e7] shadow-xs flex items-center justify-between">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-[#005bbf]/10 text-[#005bbf] flex items-center justify-center">
                  <span className="material-symbols-outlined text-2xl">description</span>
                </div>
                <div>
                  <h4 className="font-quicksand font-bold text-sm text-[#1b1c1c]">Alphabet &amp; Phonics Worksheet</h4>
                  <p className="text-xs text-[#727785]">PDF Printable trace guide</p>
                </div>
              </div>
              <button className="bg-[#f5f3f3] text-[#005bbf] px-4 py-2 rounded-full text-xs font-quicksand font-bold hover:bg-[#005bbf]/10">
                Download
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Settings Modal */}
      {renderModal(
        showSettingsModal,
        () => setShowSettingsModal(false),
        "Student Settings",
        <div className="space-y-5">
          <div className="p-4 bg-[#fbf9f8] rounded-2xl flex items-center gap-3 border border-[#eae8e7]">
            <div className="w-12 h-12 rounded-full bg-[#005bbf] text-white flex items-center justify-center font-quicksand font-bold text-lg overflow-hidden shrink-0">
              {userImage && !imageError ? (
                <Image
                  src={userImage}
                  alt={rawName}
                  width={48}
                  height={48}
                  unoptimized
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              ) : (
                <span>{userInitial}</span>
              )}
            </div>
            <div className="min-w-0">
              <h4 className="font-quicksand font-bold text-sm text-[#1b1c1c] truncate">{rawName}</h4>
              <p className="text-xs text-[#727785] truncate">{session?.user?.email}</p>
            </div>
          </div>

          <div className="space-y-3 pt-2 border-t border-[#eae8e7]">
            <h5 className="font-quicksand font-bold text-xs text-[#1b1c1c]">Preferences</h5>
            <label className="flex items-center justify-between cursor-pointer py-1">
              <span className="text-xs text-[#414754] font-medium">Class Notifications</span>
              <input
                type="checkbox"
                checked={emailAlerts}
                onChange={(e) => setEmailAlerts(e.target.checked)}
                className="w-4 h-4 accent-[#005bbf] rounded cursor-pointer"
              />
            </label>
            <label className="flex items-center justify-between cursor-pointer py-1">
              <span className="text-xs text-[#414754] font-medium">Sound Effects</span>
              <input
                type="checkbox"
                checked={soundEffects}
                onChange={(e) => setSoundEffects(e.target.checked)}
                className="w-4 h-4 accent-[#005bbf] rounded cursor-pointer"
              />
            </label>
          </div>

          <div className="pt-3 border-t border-[#eae8e7]">
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="w-full bg-[#ac3509]/10 hover:bg-[#ac3509]/20 text-[#ac3509] py-3 rounded-2xl font-quicksand font-bold text-xs flex items-center justify-center gap-2 transition-colors"
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
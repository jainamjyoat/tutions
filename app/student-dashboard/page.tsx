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

type Message = {
  id: string;
  name: string;
  role: string;
  avatar: string;
  text: string;
  online: boolean;
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
    "learning" | "assignments" | "sections" | "tutors" | "resources"
  >("learning");

  // Real Database Assignments State
  const [assignments, setAssignments] = useState<Assignment[]>([]);

  // 📅 Real Database Scheduled Meetings State
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
      desc: "Live learning session scheduled. Check Upcoming Classes.",
      time: "1 hour ago",
      read: false,
    },
  ]);

  // Settings State
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [soundEffects, setSoundEffects] = useState(true);

  // 🔄 Auto-scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [sectionChatMessages, activeTypers]);

  // Auto-redirect Teacher OR Check Student Approval Status & Section on mount
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

  // 🔄 Fetch Scheduled Meetings from Database (Polls every 5s)
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
              if (!m.studentId && !m.studentEmail) return true; // General class session
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

  // 🔄 Fetch Section Group Chat Messages & Typers (Polls every 2.5s)
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

  // ✍️ Trigger Typing Ping when Student is typing
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

  // 💬 Send Student Section Message
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

  // 🔄 Fetch Assignments from Database
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
              if (!a.studentId && !a.studentName) {
                return true;
              }
              
              const matchesId = a.studentId && a.studentId === currentStudentId;
              const matchesName =
                a.studentName &&
                currentStudentName &&
                a.studentName.toLowerCase() === currentStudentName.toLowerCase();

              return matchesId || matchesName;
            });

            setAssignments(myAssignments);
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

  const [messages] = useState<Message[]>([
    {
      id: "1",
      name: "Ms. Sarah",
      role: "Math Tutor",
      avatar:
        "https://lh3.googleusercontent.com/aida-public/AB6AXuDTFxk46S7ROXdOAhBSK8153pLWE7SXzDlBlMESne1J5VvzxvgK1fxfBJ2stZJQpsw92Tr-X4pHafPH_DZDzgyO7zNmCZmamm-SBBrd52KJcj3kMB9vO_h4mLRbZ_LEF-J43G9wzN02cQHs5XMe9f-dQVn4rgFN0tv8_6Q7Jg_M_6DQ5yKOK3u5Q2IYM0IDMgl_mVjQ2rIiBwS7lZPsQaDsFsbtCoPHYs-x2S3S9uCpV72a2hU25HS_Aw",
      text: `${firstName} did amazing with counting today! Try the new blocks game tonight.`,
      online: true,
    },
  ]);

  const [dailyProgress, setDailyProgress] = useState(65);

  const navItems = [
    { id: "learning" as const, icon: "school", label: "My Learning" },
    { id: "assignments" as const, icon: "assignment", label: "Assignments" },
    { id: "sections" as const, icon: "groups", label: "My Section" },
    { id: "tutors" as const, icon: "face", label: "My Tutors" },
    { id: "resources" as const, icon: "library_books", label: "Resources" },
  ];

  // Helper to format meeting date for calendar badge
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

  const renderModal = (
    open: boolean,
    onClose: () => void,
    title: string,
    children: React.ReactNode
  ) => {
    if (!open) return null;
    return (
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60] flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
        <div className="bg-white rounded-2xl p-5 sm:p-6 max-w-[720px] w-full shadow-2xl my-auto relative max-h-[90vh] overflow-y-auto">
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
        <div className="bg-white rounded-3xl p-8 max-w-[720px] w-full text-center border border-[#eae8e7] shadow-lg space-y-6">
          <div className="w-16 h-16 bg-[#005bbf]/10 text-[#005bbf] rounded-full flex items-center justify-center mx-auto">
            <span className="material-symbols-outlined text-3xl">hourglass_top</span>
          </div>

          <div className="space-y-2">
            <h2 className="font-quicksand font-bold text-2xl text-[#1b1c1c]">
              Account Approval Pending
            </h2>
            <p className="text-xs sm:text-sm text-[#414754] leading-relaxed">
              Hi <strong className="text-[#1b1c1c]">{firstName}</strong>! Your account (
              <span className="text-[#005bbf] font-medium">{session?.user?.email}</span>) has been logged in.
            </p>
            <p className="text-xs text-[#727785] leading-relaxed">
              Your teacher needs to authorize your access from the Teacher Dashboard before you can view your classes.
            </p>
          </div>

          <div className="pt-2 space-y-3">
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-[#005bbf] hover:bg-[#004493] text-white font-quicksand font-bold py-3 rounded-xl text-xs sm:text-sm transition-all shadow-sm active:scale-95 flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-lg">refresh</span>
              <span>Check Status Again</span>
            </button>

            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="w-full bg-[#f5f3f3] hover:bg-[#eae8e7] text-[#414754] font-quicksand font-bold py-2.5 rounded-xl text-xs transition-colors flex items-center justify-center gap-2"
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
    <div className="bg-[#fbf9f8] text-[#1b1c1c] font-inter min-h-screen flex flex-col md:flex-row">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col gap-2 p-4 border-r border-[#c1c6d6] bg-[#f5f3f3] h-screen w-64 fixed left-0 top-0 z-40">
        <div className="flex items-center gap-3 mb-6 px-2">
          <span
            className="material-symbols-outlined text-[#005bbf] text-3xl"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            toys
          </span>
          <span className="font-quicksand text-2xl font-bold text-[#005bbf]">
            Happy Toddles
          </span>
        </div>

        {/* Dynamic Profile Avatar & Section Badge */}
        <div className="flex flex-col items-center mb-6 px-2">
          <div className="w-20 h-20 rounded-full border-4 border-[#005bbf] p-1 mb-3 bg-[#005bbf] text-white flex items-center justify-center overflow-hidden font-quicksand font-bold text-2xl shrink-0 shadow-sm">
            {userImage && !imageError ? (
              <Image
                src={userImage}
                alt={rawName}
                width={80}
                height={80}
                unoptimized
                referrerPolicy="no-referrer"
                onError={() => setImageError(true)}
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              <span>{userInitial}</span>
            )}
          </div>
          <h2 className="font-quicksand text-xl font-bold text-[#1b1c1c] truncate max-w-full">
            Hi, {firstName}!
          </h2>
          
          {assignedSection ? (
            <span className="mt-1.5 bg-[#005bbf]/10 text-[#005bbf] text-xs font-bold px-3 py-0.5 rounded-full border border-[#005bbf]/20 flex items-center gap-1">
              <span className="material-symbols-outlined text-xs">school</span>
              {assignedSection}
            </span>
          ) : (
            <p className="text-xs text-[#727785] font-medium mt-1">No Section Assigned</p>
          )}
        </div>

        <nav className="flex flex-col gap-1.5 flex-grow">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveNav(item.id)}
              className={`flex items-center gap-3 rounded-xl px-4 py-3 font-bold transition-all text-left ${
                activeNav === item.id
                  ? "bg-[#1a73e8] text-white shadow-sm"
                  : "text-[#414754] hover:bg-[#e4e2e1]"
              }`}
            >
              <span
                className="material-symbols-outlined"
                style={activeNav === item.id ? { fontVariationSettings: "'FILL' 1" } : {}}
              >
                {item.icon}
              </span>
              {item.label}
            </button>
          ))}
        </nav>

        <div className="mt-auto">
          <button
            onClick={() => setDailyProgress((p) => Math.min(p + 5, 100))}
            className="w-full bg-[#005bbf] text-white font-quicksand font-bold py-3 px-4 rounded-xl hover:bg-[#004493] transition-colors shadow-sm"
          >
            Start Daily Goal
          </button>
        </div>
      </aside>

      {/* Mobile Top Bar */}
      <header className="md:hidden flex justify-between items-center w-full px-4 h-16 sticky top-0 z-50 bg-[#fbf9f8] shadow-sm border-b border-[#c1c6d6]">
        <div className="flex items-center gap-2">
          <span
            className="material-symbols-outlined text-[#005bbf] text-2xl"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            toys
          </span>
          <span className="font-quicksand text-xl font-bold text-[#005bbf]">
            Happy Toddles
          </span>
        </div>
        <div className="flex items-center gap-2 text-[#005bbf]">
          <div className="relative">
            <button
              onClick={() => {
                setShowNotifications(!showNotifications);
                setShowSettingsModal(false);
              }}
              className="p-2 hover:opacity-80 transition-opacity relative"
              aria-label="Notifications"
            >
              <span className="material-symbols-outlined block">notifications</span>
              {unreadNotificationsCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-[#ac3509] rounded-full border-2 border-white" />
              )}
            </button>

            {showNotifications && (
              <div className="fixed inset-x-3 top-16 bg-white rounded-2xl shadow-xl border border-[#eae8e7] z-50 p-4 animate-fadeIn">
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
                <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
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
            className="p-2 hover:opacity-80 transition-opacity"
            aria-label="Settings"
          >
            <span className="material-symbols-outlined block">settings</span>
          </button>

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 hover:opacity-80 transition-opacity"
            aria-label="Toggle menu"
          >
            <span className="material-symbols-outlined block">
              {mobileMenuOpen ? "close" : "menu"}
            </span>
          </button>
        </div>
      </header>

      {/* Mobile Menu Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 top-16 bg-black/40 backdrop-blur-sm z-40">
          <div className="bg-white w-[280px] h-full shadow-2xl p-6 flex flex-col gap-2">
            <div className="flex flex-col items-center mb-6 pb-6 border-b border-[#eae8e7]">
              <div className="w-16 h-16 rounded-full border-4 border-[#005bbf] p-1 mb-3 bg-[#005bbf] text-white flex items-center justify-center font-quicksand font-bold text-xl overflow-hidden shrink-0">
                {userImage && !imageError ? (
                  <Image
                    src={userImage}
                    alt={rawName}
                    width={64}
                    height={64}
                    unoptimized
                    referrerPolicy="no-referrer"
                    onError={() => setImageError(true)}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <span>{userInitial}</span>
                )}
              </div>
              <h2 className="font-quicksand text-lg font-bold">Hi, {firstName}!</h2>
              {assignedSection && (
                <span className="mt-1 bg-[#005bbf]/10 text-[#005bbf] text-xs font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                  <span className="material-symbols-outlined text-xs">school</span>
                  {assignedSection}
                </span>
              )}
            </div>
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setActiveNav(item.id);
                  setMobileMenuOpen(false);
                }}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 font-bold transition-all text-left ${
                  activeNav === item.id
                    ? "bg-[#1a73e8] text-white"
                    : "text-[#414754] hover:bg-[#f5f3f3]"
                }`}
              >
                <span className="material-symbols-outlined">{item.icon}</span>
                {item.label}
              </button>
            ))}
            <div className="mt-auto">
              <button
                onClick={() => {
                  setDailyProgress((p) => Math.min(p + 5, 100));
                  setMobileMenuOpen(false);
                }}
                className="w-full bg-[#005bbf] text-white font-quicksand font-bold py-3 rounded-xl"
              >
                Start Daily Goal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 md:ml-64 p-4 md:p-8 overflow-y-auto w-full max-w-7xl mx-auto">
        <div className="flex justify-between items-end mb-8">
          <div>
            <h1 className="font-quicksand text-2xl sm:text-3xl md:text-4xl font-bold text-[#1b1c1c] mb-1.5">
              {activeNav === "learning" && "My Learning Journey"}
              {activeNav === "assignments" && "My Assignments & Activities"}
              {activeNav === "sections" && "My Section & Classmates"}
              {activeNav === "tutors" && "My Teachers & Tutors"}
              {activeNav === "resources" && "Learning Resources"}
            </h1>
            <p className="text-xs sm:text-sm text-[#414754]">
              {activeNav === "learning" && `Here is your plan for the week, ${firstName}!`}
              {activeNav === "assignments" && "Complete your assigned tasks from your teacher."}
              {activeNav === "sections" && "View your section members and participate in class discussion."}
              {activeNav === "tutors" && "Connect with your tutors and ask questions anytime."}
              {activeNav === "resources" && "Download worksheets, guides, and storybooks."}
            </p>
          </div>

          <div className="hidden md:flex items-center gap-3">
            <div className="relative">
              <button
                onClick={() => {
                  setShowNotifications(!showNotifications);
                  setShowSettingsModal(false);
                }}
                className="p-2.5 rounded-full bg-[#f0eded] hover:bg-[#e4e2e1] transition-colors text-[#005bbf] relative"
                aria-label="Notifications"
              >
                <span className="material-symbols-outlined block">notifications</span>
                {unreadNotificationsCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-[#ac3509] rounded-full border-2 border-white" />
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-[#eae8e7] z-50 p-4 animate-fadeIn">
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
                  <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
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
              className="p-2.5 rounded-full bg-[#f0eded] hover:bg-[#e4e2e1] transition-colors text-[#005bbf]"
              aria-label="Settings"
            >
              <span className="material-symbols-outlined block">settings</span>
            </button>
          </div>
        </div>

        {/* NAV VIEW: MY LEARNING */}
        {activeNav === "learning" && (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            <div className="md:col-span-8 bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-[#e4e2e1] relative overflow-hidden flex flex-col justify-between min-h-[300px]">
              <div className="absolute top-0 right-0 w-64 h-64 bg-[#d8e2ff] rounded-full blur-3xl opacity-30 -mr-20 -mt-20 pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-[#ffdbd0] rounded-full blur-2xl opacity-20 -ml-10 -mb-10 pointer-events-none" />
              <div className="relative z-10 mb-6">
                <div className="flex items-center gap-2 mb-4">
                  <span className="inline-block px-3 py-1 bg-[#fe6f42] text-white rounded-full text-xs font-bold font-quicksand uppercase tracking-wider">
                    Today&apos;s Focus
                  </span>

                  {assignedSection && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-[#005bbf]/10 text-[#005bbf] border border-[#005bbf]/20 rounded-full text-xs font-bold font-quicksand">
                      <span className="material-symbols-outlined text-xs">school</span>
                      {assignedSection}
                    </span>
                  )}
                </div>

                <h2 className="font-quicksand text-2xl sm:text-3xl font-bold text-[#1b1c1c] mb-2">
                  Mastering Shapes &amp; Colors
                </h2>
                <p className="text-xs sm:text-sm text-[#414754]">
                  You&apos;re doing great! Complete your next task to earn a special badge.
                </p>
              </div>
              <div className="relative z-10 flex flex-col sm:flex-row gap-4 items-center">
                <div className="flex-1 w-full bg-[#f5f3f3] rounded-full h-4 overflow-hidden border border-[#e4e2e1]">
                  <div
                    className="bg-[#005bbf] h-full rounded-full transition-all duration-500"
                    style={{ width: `${dailyProgress}%` }}
                  />
                </div>
                <span className="font-quicksand font-bold text-[#005bbf] whitespace-nowrap text-sm">
                  {dailyProgress}% Complete
                </span>
                <button
                  onClick={() => setDailyProgress((p) => Math.min(p + 10, 100))}
                  className="w-full sm:w-auto bg-[#ac3509] text-white font-quicksand font-bold py-2.5 px-6 rounded-xl hover:bg-[#fe6f42] hover:text-[#3a0a00] transition-colors shadow-sm text-xs sm:text-sm"
                >
                  Continue
                </button>
              </div>
            </div>

            <div className="md:col-span-4 bg-[#005bbf] rounded-3xl p-6 text-white shadow-md relative overflow-hidden flex flex-col">
              <div
                className="absolute inset-0 opacity-10 pointer-events-none"
                style={{
                  backgroundImage: "radial-gradient(circle at 2px 2px, white 1px, transparent 0)",
                  backgroundSize: "20px 20px",
                }}
              />
              <div className="relative z-10 flex items-center justify-between mb-6">
                <h3 className="font-quicksand text-xl font-bold flex items-center gap-2">
                  <span
                    className="material-symbols-outlined"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    chat_bubble
                  </span>
                  Teacher Chat
                </h3>
              </div>
              <div className="relative z-10 flex-1 flex flex-col gap-4">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className="bg-white/10 rounded-2xl p-4 backdrop-blur-sm border border-white/20"
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <Image
                        src={msg.avatar}
                        alt={msg.name}
                        width={32}
                        height={32}
                        unoptimized
                        referrerPolicy="no-referrer"
                        className="w-8 h-8 rounded-full object-cover border-2 border-white/50 shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-quicksand font-bold text-sm truncate">{msg.name}</p>
                        <p className="text-xs text-[#adc7ff] truncate">{msg.role}</p>
                      </div>
                      {msg.online && (
                        <span className="w-2 h-2 rounded-full bg-[#ffdbd0] shrink-0" />
                      )}
                    </div>
                    <p className="text-xs sm:text-sm text-white/90 leading-relaxed line-clamp-2">{msg.text}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* 📅 DYNAMIC DATABASE-BACKED UPCOMING CLASSES */}
            <div className="md:col-span-7 bg-white rounded-3xl p-6 shadow-sm border border-[#e4e2e1]">
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-quicksand text-xl font-bold text-[#1b1c1c] flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#005bbf]">calendar_month</span>
                  Upcoming Live Classes ({meetings.length})
                </h3>
              </div>

              {meetings.length === 0 ? (
                <div className="p-8 bg-[#f5f3f3] rounded-2xl text-center border border-dashed border-[#eae8e7]">
                  <span className="material-symbols-outlined text-3xl text-[#727785] mb-1">
                    event_available
                  </span>
                  <p className="text-xs text-[#727785] font-medium">
                    No upcoming live classes scheduled by your teacher.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {meetings.map((meet) => {
                    const { month, day } = parseMeetingDate(meet.date);

                    return (
                      <div
                        key={meet.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl border border-[#e4e2e1] hover:border-[#005bbf]/40 hover:bg-[#fbf9f8] transition-all gap-4 group"
                      >
                        <div className="flex items-center gap-4">
                          <div className="flex flex-col items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-2xl font-quicksand shrink-0 bg-[#d8e2ff] text-[#005bbf] shadow-2xs">
                            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider">
                              {month}
                            </span>
                            <span className="text-lg sm:text-xl font-bold">{day}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="px-2 py-0.5 bg-[#005bbf]/10 text-[#005bbf] text-[10px] font-bold rounded-md uppercase tracking-wide">
                                Live Class
                              </span>
                              <h4 className="font-quicksand font-bold text-xs sm:text-sm text-[#1b1c1c] group-hover:text-[#005bbf] transition-colors truncate">
                                {meet.topic}
                              </h4>
                            </div>
                            <p className="text-xs sm:text-sm text-[#414754] flex items-center gap-1 font-medium">
                              <span className="material-symbols-outlined text-[15px] text-[#005bbf]">schedule</span>
                              <span>
                                {meet.time} {meet.endTime ? `– ${meet.endTime}` : ""}
                              </span>
                            </p>
                          </div>
                        </div>

                        <a
                          href={meet.meetLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="bg-[#005bbf] hover:bg-[#004493] text-white px-5 py-2.5 rounded-full font-quicksand font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-all active:scale-95 shrink-0"
                        >
                          <span className="material-symbols-outlined text-base">videocam</span>
                          <span>Ask to Join Meet</span>
                        </a>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="md:col-span-5 bg-[#f5f3f3] rounded-3xl p-6 shadow-sm border border-[#e4e2e1]">
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-quicksand text-xl font-bold text-[#1b1c1c] flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#005bbf]">assignment</span>
                  Teacher Assignments
                </h3>
                <span className="text-xs bg-[#005bbf]/10 text-[#005bbf] px-2.5 py-0.5 rounded-full font-bold">
                  {assignments.filter((a) => a.status === "active").length} Active
                </span>
              </div>

              {assignments.length === 0 ? (
                <div className="bg-white rounded-2xl p-6 text-center border border-[#e4e2e1]">
                  <span className="material-symbols-outlined text-3xl text-[#727785] mb-1">
                    task_alt
                  </span>
                  <p className="text-xs text-[#727785]">No assignments posted by your teacher yet.</p>
                </div>
              ) : (
                <div className="flex flex-col gap-3 max-h-[380px] overflow-y-auto pr-1">
                  {assignments.map((assignment) => {
                    const isCompleted = assignment.status === "completed";

                    return (
                      <button
                        key={assignment.id}
                        onClick={() => handleToggleAssignment(assignment.id, assignment.status)}
                        disabled={uploadingId === assignment.id}
                        className={`flex items-start gap-3 p-4 rounded-xl border text-left transition-all w-full ${
                          isCompleted
                            ? "bg-white border-[#e4e2e1] opacity-75"
                            : "bg-white border-l-4 border-[#005bbf] shadow-xs hover:border-[#004493]"
                        }`}
                      >
                        <div className="mt-0.5 shrink-0">
                          <span
                            className={`material-symbols-outlined ${
                              isCompleted ? "text-[#0f9d58]" : "text-[#727785]"
                            }`}
                            style={isCompleted ? { fontVariationSettings: "'FILL' 1" } : {}}
                          >
                            {isCompleted ? "check_circle" : "radio_button_unchecked"}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start mb-1 gap-2">
                            <h4
                              className={`font-quicksand font-bold text-xs sm:text-sm text-[#1b1c1c] truncate ${
                                isCompleted ? "line-through text-[#727785]" : ""
                              }`}
                            >
                              {assignment.title}
                            </h4>
                            <span className="text-[10px] bg-[#005bbf]/10 text-[#005bbf] px-2 py-0.5 rounded-full font-semibold shrink-0">
                              {assignment.subject}
                            </span>
                          </div>

                          {assignment.description && (
                            <p className="text-xs text-[#414754] my-1.5 bg-[#f5f3f3] p-2 rounded-lg border border-[#eae8e7]/60">
                              {assignment.description}
                            </p>
                          )}

                          {assignment.attachmentUrl && (
                            <a
                              href={assignment.attachmentUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="inline-flex items-center gap-1 text-[11px] text-[#005bbf] font-bold hover:underline my-1"
                            >
                              <span className="material-symbols-outlined text-xs">attach_file</span>
                              <span>View Teacher Attachment</span>
                            </a>
                          )}

                          <div className="flex items-center justify-between text-[11px] text-[#727785] mt-1">
                            <span>Section: {assignment.section}</span>
                            <span className="font-medium text-[#ac3509]">Due: {assignment.dueDate}</span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* NAV VIEW: DEDICATED ASSIGNMENTS TAB */}
        {activeNav === "assignments" && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="font-quicksand font-bold text-xl sm:text-2xl text-[#1b1c1c]">
                  Your Assigned Tasks ({assignments.length})
                </h2>
                <p className="text-xs sm:text-sm text-[#727785] mt-1">
                  Complete your tasks and optionally attach your completed work file.
                </p>
              </div>
            </div>

            {assignments.length === 0 ? (
              <div className="bg-white rounded-[20px] p-8 sm:p-12 text-center border border-[#eae8e7]">
                <span className="material-symbols-outlined text-4xl text-[#727785] mb-2">
                  assignment_turned_in
                </span>
                <h3 className="font-quicksand font-bold text-base text-[#1b1c1c]">All Caught Up!</h3>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {assignments.map((assignment) => {
                  const isCompleted = assignment.status === "completed";

                  return (
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
                              isCompleted
                                ? "bg-[#0f9d58]/10 text-[#0f9d58]"
                                : "bg-[#795900]/10 text-[#795900]"
                            }`}
                          >
                            {isCompleted ? "Completed" : "Active"}
                          </span>
                        </div>
                        <h3 className={`font-quicksand font-bold text-base text-[#1b1c1c] ${isCompleted ? "line-through text-[#727785]" : ""}`}>
                          {assignment.title}
                        </h3>

                        {assignment.description && (
                          <p className="text-xs text-[#414754] my-2 bg-[#f5f3f3] p-2.5 rounded-xl border border-[#eae8e7]/60">
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

                        <div className="mt-2 space-y-1">
                          <p className="text-xs text-[#727785] flex items-center gap-1">
                            <span className="material-symbols-outlined text-sm">school</span>
                            <span>{assignment.section}</span>
                          </p>
                          <p className="text-xs text-[#727785] flex items-center gap-1">
                            <span className="material-symbols-outlined text-sm">event</span>
                            <span>Due: {assignment.dueDate}</span>
                          </p>
                        </div>

                        {!isCompleted && (
                          <div className="mt-3 pt-2 border-t border-[#eae8e7]">
                            <label className="block text-[11px] font-semibold text-[#414754] mb-1">
                              Attach Completed Work (PDF, Image, Word) (Optional)
                            </label>
                            <input
                              type="file"
                              accept="image/*,.pdf,.doc,.docx"
                              className="w-full text-xs text-[#727785] file:mr-2 file:py-1 file:px-3 file:rounded-lg file:border-0 file:bg-[#005bbf]/10 file:text-[#005bbf] file:font-bold hover:file:bg-[#005bbf]/20 cursor-pointer"
                              onChange={(e) => handleFileChange(assignment.id, e.target.files?.[0] || null)}
                            />
                          </div>
                        )}
                      </div>

                      <div className="pt-3 border-t border-[#eae8e7]">
                        <button
                          onClick={() => handleToggleAssignment(assignment.id, assignment.status)}
                          disabled={uploadingId === assignment.id}
                          className={`w-full py-2.5 rounded-xl text-xs font-quicksand font-bold transition-all flex items-center justify-center gap-1.5 active:scale-95 disabled:opacity-50 ${
                            isCompleted
                              ? "bg-[#f5f3f3] text-[#414754] hover:bg-[#eae8e7]"
                              : "bg-[#005bbf] text-white hover:bg-[#004493]"
                          }`}
                        >
                          <span className="material-symbols-outlined text-base">
                            {isCompleted ? "undo" : "check_circle"}
                          </span>
                          <span>
                            {uploadingId === assignment.id
                              ? "Uploading Attachment..."
                              : isCompleted
                              ? "Mark Incomplete"
                              : "Mark as Complete"}
                          </span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* 🏫 NAV VIEW: MY SECTION (WITH SEEN READ RECEIPTS & TYPING INDICATORS) */}
        {activeNav === "sections" && (
          <div className="space-y-6">
            {/* Section Banner */}
            <div className="bg-white rounded-3xl p-6 border border-[#eae8e7] shadow-sm">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-[#005bbf]/10 text-[#005bbf] flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-3xl">school</span>
                </div>
                <div>
                  <h2 className="font-quicksand font-bold text-xl sm:text-2xl text-[#1b1c1c]">
                    {assignedSection ? `Section: ${assignedSection}` : "No Section Assigned"}
                  </h2>
                  <p className="text-xs sm:text-sm text-[#727785]">
                    {assignedSection
                      ? "You are registered in this academic section."
                      : "Ask your teacher to assign you to a section from the Teacher Dashboard."}
                  </p>
                </div>
              </div>
            </div>

            {assignedSection && currentSectionId ? (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* 👥 Left Panel: Group Members */}
                <div className="lg:col-span-4 bg-white rounded-3xl p-5 border border-[#eae8e7] shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between pb-3 border-b border-[#eae8e7] mb-4">
                      <h3 className="font-quicksand font-bold text-base text-[#1b1c1c] flex items-center gap-2">
                        <span className="material-symbols-outlined text-[#005bbf]">groups</span>
                        Group Members
                      </h3>
                      <span className="text-[10px] bg-[#005bbf]/10 text-[#005bbf] font-bold px-2 py-0.5 rounded-full">
                        Section {assignedSection}
                      </span>
                    </div>

                    <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                      {/* Teacher Badge */}
                      <div className="flex items-center gap-3 p-2.5 bg-[#f5f3f3] rounded-2xl border border-[#005bbf]/20">
                        <div className="w-9 h-9 rounded-full bg-[#005bbf] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                          <span className="material-symbols-outlined text-lg">school</span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-quicksand font-bold text-xs text-[#1b1c1c] truncate">
                            Class Teacher
                          </p>
                          <span className="text-[10px] text-[#005bbf] font-semibold block">
                            Instructor &amp; Moderator
                          </span>
                        </div>
                      </div>

                      {/* Current Student (You) */}
                      <div className="flex items-center gap-3 p-2.5 bg-[#f5f3f3] rounded-2xl border border-[#eae8e7]">
                        <div className="w-9 h-9 rounded-full bg-[#005bbf] text-white flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden shadow-xs">
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
                          <p className="font-quicksand font-bold text-xs text-[#1b1c1c] truncate">
                            {rawName} (You)
                          </p>
                          <span className="text-[10px] text-[#0f9d58] font-semibold block">
                            Enrolled Student
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-[#eae8e7]">
                    <p className="text-[11px] text-[#727785] text-center">
                      Only authorized section members can view and chat here.
                    </p>
                  </div>
                </div>

                {/* 💬 Right Panel: Section Group Chat */}
                <div className="lg:col-span-8 flex flex-col h-[520px] bg-white rounded-3xl overflow-hidden border border-[#eae8e7] shadow-sm">
                  {/* Chat Header */}
                  <div className="bg-white border-b border-[#eae8e7] p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-[#005bbf]/10 text-[#005bbf] flex items-center justify-center font-bold text-lg">
                        <span className="material-symbols-outlined text-xl">forum</span>
                      </div>
                      <div>
                        <h3 className="font-quicksand font-bold text-base text-[#1b1c1c] leading-tight">
                          {assignedSection} Class Discussion
                        </h3>
                        <p className="text-xs text-[#727785]">
                          Real-time section messages
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Chat Messages Feed */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#fbf9f8]">
                    {sectionChatMessages.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full text-center py-10">
                        <span className="material-symbols-outlined text-3xl text-[#727785] mb-2">
                          chat_bubble_outline
                        </span>
                        <p className="text-xs text-[#727785]">
                          No messages yet. Send a message to start the conversation with your class!
                        </p>
                      </div>
                    ) : (
                      sectionChatMessages.map((msg) => {
                        const isMe = msg.senderEmail.toLowerCase() === session?.user?.email?.toLowerCase();
                        const isTeacherMsg = msg.senderRole === "TEACHER" || msg.senderRole === "teacher";
                        const isSeen = msg.seenBy && msg.seenBy.length > 1;

                        const formattedTime = new Date(msg.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        });

                        return (
                          <div
                            key={msg.id}
                            className={`flex items-end gap-2 ${isMe ? "justify-end" : "justify-start"}`}
                          >
                            {!isMe && (
                              <div className="w-8 h-8 rounded-full bg-[#005bbf] text-white flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden shadow-xs">
                                {msg.senderAvatar ? (
                                  <Image
                                    src={msg.senderAvatar}
                                    alt={msg.senderName}
                                    width={32}
                                    height={32}
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
                              className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-xs relative shadow-2xs ${
                                isMe
                                  ? "bg-[#005bbf] text-white rounded-tr-none"
                                  : "bg-white text-[#1b1c1c] border border-[#eae8e7] rounded-tl-none"
                              }`}
                            >
                              {!isMe && (
                                <p className="font-bold text-[11px] mb-1 text-[#005bbf] flex items-center gap-1">
                                  {msg.senderName}
                                  {isTeacherMsg ? (
                                    <span className="inline-flex items-center gap-0.5 text-[10px] bg-[#005bbf]/10 text-[#005bbf] px-1.5 py-0.2 rounded-full font-bold">
                                      <span className="material-symbols-outlined text-[12px]">school</span> Teacher
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-0.5 text-[10px] bg-emerald-50 text-emerald-700 px-1.5 py-0.2 rounded-full font-bold">
                                      <span className="material-symbols-outlined text-[12px]">person</span> Student
                                    </span>
                                  )}
                                </p>
                              )}
                              <p className="whitespace-pre-wrap break-words leading-relaxed text-xs">
                                {msg.text}
                              </p>
                              
                              {/* Message Time & Seen Receipt Indicator */}
                              <div
                                className={`flex items-center justify-end gap-1 text-[9px] mt-1 font-medium ${
                                  isMe ? "text-white/80" : "text-[#727785]"
                                }`}
                              >
                                <span>{formattedTime}</span>
                                {isMe && (
                                  <span
                                    className={`material-symbols-outlined text-xs ${
                                      isSeen ? "text-sky-200" : "text-white/60"
                                    }`}
                                    title={isSeen ? "Seen" : "Sent"}
                                  >
                                    {isSeen ? "done_all" : "done"}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}

                    {/* ✍️ Live Typing Indicator with Profile Icon */}
                    {activeTypers.length > 0 && (
                      <div className="flex items-center gap-2 p-2.5 bg-white border border-[#eae8e7] rounded-2xl w-fit text-xs text-[#005bbf] shadow-2xs animate-fadeIn">
                        <div className="w-6 h-6 rounded-full bg-[#005bbf] text-white overflow-hidden shrink-0 flex items-center justify-center font-bold text-[10px]">
                          {activeTypers[0].userAvatar ? (
                            <Image
                              src={activeTypers[0].userAvatar}
                              alt={activeTypers[0].userName}
                              width={24}
                              height={24}
                              unoptimized
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            activeTypers[0].userName.charAt(0).toUpperCase()
                          )}
                        </div>
                        <span className="font-semibold text-xs text-[#1b1c1c]">
                          {activeTypers[0].userName} is typing...
                        </span>
                        <span className="material-symbols-outlined text-xs text-[#005bbf] animate-bounce">
                          more_horiz
                        </span>
                      </div>
                    )}
                    <div ref={chatEndRef} />
                  </div>

                  {/* Chat Input */}
                  <div className="bg-white p-3 border-t border-[#eae8e7] flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Type a message to your section..."
                      className="flex-1 bg-[#f5f3f3] border border-[#eae8e7] rounded-full px-4 py-2.5 text-xs sm:text-sm focus:outline-none focus:border-[#005bbf]"
                      value={studentChatInput}
                      onChange={(e) => handleTypingInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSendStudentMessage()}
                    />
                    <button
                      onClick={handleSendStudentMessage}
                      disabled={!studentChatInput.trim()}
                      className="bg-[#005bbf] hover:bg-[#004493] text-white px-5 py-2.5 rounded-full text-xs font-quicksand font-bold transition-colors disabled:opacity-40 shrink-0"
                    >
                      Send
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-3xl p-8 text-center border border-[#eae8e7]">
                <span className="material-symbols-outlined text-4xl text-[#727785] mb-2">
                  chat_error
                </span>
                <p className="text-xs text-[#727785]">
                  Group chat will unlock once your teacher assigns you to an active section.
                </p>
              </div>
            )}
          </div>
        )}

        {/* NAV VIEW: MY TUTORS */}
        {activeNav === "tutors" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-white rounded-3xl p-6 border border-[#e4e2e1] flex items-center gap-4">
              <Image
                src={messages[0].avatar}
                alt="Ms. Sarah"
                width={56}
                height={56}
                unoptimized
                referrerPolicy="no-referrer"
                className="w-14 h-14 rounded-full object-cover border-2 border-[#005bbf] shrink-0"
              />
              <div>
                <h3 className="font-quicksand font-bold text-base text-[#1b1c1c]">Ms. Sarah</h3>
                <p className="text-xs text-[#727785]">Math Tutor</p>
                <span className="inline-block mt-2 bg-[#005bbf]/10 text-[#005bbf] text-[10px] font-bold px-2 py-0.5 rounded-full">
                  Active Tutor
                </span>
              </div>
            </div>
          </div>
        )}

        {/* NAV VIEW: RESOURCES */}
        {activeNav === "resources" && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl p-4 border border-[#e4e2e1] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-[#005bbf]">description</span>
                <div>
                  <h4 className="font-quicksand font-bold text-sm">Alphabet Practice Worksheet</h4>
                  <p className="text-xs text-[#727785]">PDF • Printable trace guide</p>
                </div>
              </div>
              <button className="bg-[#f5f3f3] text-[#005bbf] px-4 py-1.5 rounded-full text-xs font-bold font-quicksand hover:bg-[#005bbf]/10">
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
        <div className="space-y-5 sm:space-y-6">
          <div className="p-3.5 sm:p-4 bg-[#f5f3f3] rounded-2xl flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-[#005bbf] text-white flex items-center justify-center font-quicksand font-bold text-lg overflow-hidden border-2 border-[#005bbf] shrink-0">
              {userImage && !imageError ? (
                <Image
                  src={userImage}
                  alt={rawName}
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
              <h4 className="font-quicksand font-bold text-sm text-[#1b1c1c] truncate">{rawName}</h4>
              <p className="text-xs text-[#727785] truncate">{session?.user?.email || "student@happytoddles.com"}</p>
              
              <span className="inline-block mt-1 bg-[#005bbf]/10 text-[#005bbf] text-[10px] font-bold px-2 py-0.5 rounded-full">
                {assignedSection ? `Section: ${assignedSection}` : "Active Student (No Section)"}
              </span>
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
              className="w-full bg-[#ac3509]/10 hover:bg-[#ac3509]/20 text-[#ac3509] py-3 rounded-xl font-quicksand font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-colors active:scale-95"
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
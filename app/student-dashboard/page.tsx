"use client";

import { useState, useEffect } from "react";
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

type Task = {
  id: string;
  title: string;
  subtitle: string;
  status: "completed" | "in-progress" | "pending";
  due?: string;
  progress?: number;
  tag?: string;
  tagColor?: string;
  tagTextColor?: string;
};

type ClassItem = {
  id: string;
  subject: string;
  title: string;
  date: string;
  month: string;
  time: string;
  teacher: string;
  color: string;
  textColor: string;
  tagColor: string;
  tagTextColor: string;
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
  const [imageError, setImageError] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeNav, setActiveNav] = useState<
    "learning" | "assignments" | "tutors" | "achievements" | "resources"
  >("learning");

  // Real Database Assignments State
  const [assignments, setAssignments] = useState<Assignment[]>([]);

  // Student File Attachments State (mapped by assignment ID)
  const [studentFiles, setStudentFiles] = useState<{ [key: string]: File | null }>({});
  const [uploadingId, setUploadingId] = useState<string | null>(null);

  // Notifications State
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([
    {
      id: "1",
      title: "New Star Badge Earned!",
      desc: "You completed 3 tasks in a row today.",
      time: "15 mins ago",
      read: false,
    },
    {
      id: "2",
      title: "Class Reminder",
      desc: "Advanced Reading starts at 10:00 AM.",
      time: "1 hour ago",
      read: false,
    },
  ]);

  // Settings State
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [emailAlerts, setEmailAlerts] = useState(true);
  const [soundEffects, setSoundEffects] = useState(true);

  // Auto-redirect Teacher OR Check Student Approval Status on mount
  useEffect(() => {
    const userRole = (session?.user as any)?.role;

    // 1. Auto-redirect teacher to teacher-dashboard
    if (
      status === "authenticated" &&
      (userRole === "TEACHER" || userRole === "teacher")
    ) {
      window.location.href = "/teacher-dashboard";
      return;
    }

    // 2. Otherwise, check student approval status
    async function checkApproval() {
      try {
        const res = await fetch("/api/student/status");
        if (res.ok) {
          const data = await res.json();
          if (data.student?.status === "approved") {
            setApprovalStatus("approved");
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

  // 🔄 Fetch Assignments from Database & Filter specifically for this student
  useEffect(() => {
    async function fetchAssignments() {
      try {
        const res = await fetch("/api/assignments");
        if (res.ok) {
          const data = await res.json();
          if (data.assignments) {
            const currentStudentId = (session?.user as any)?.id;
            const currentStudentName = session?.user?.name;

            // Strict Filtering: Show only general assignments OR assignments targeted to this specific student
            const myAssignments = data.assignments.filter((a: Assignment) => {
              if (!a.studentId && !a.studentName) {
                return true; // General assignment for all students
              }
              
              const matchesId = a.studentId && a.studentId === currentStudentId;
              const matchesName = a.studentName && currentStudentName && a.studentName.toLowerCase() === currentStudentName.toLowerCase();

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

  // Handle student file input selection
  const handleFileChange = (assignmentId: string, file: File | null) => {
    setStudentFiles((prev) => ({ ...prev, [assignmentId]: file }));
  };

  // 🔄 Toggle Assignment Completion in Database (Uploads optional student attachment if attached)
  const handleToggleAssignment = async (id: string, currentStatus: "active" | "completed") => {
    const nextStatus = currentStatus === "active" ? "completed" : "active";
    let uploadedUrl: string | null = null;

    // Upload student file if marking as completed and a file is selected
    if (nextStatus === "completed" && studentFiles[id]) {
      setUploadingId(id);
      try {
        uploadedUrl = await uploadAssignmentFile(studentFiles[id]!);
      } catch (err) {
        console.error("Failed to upload student attachment:", err);
      }
    }

    // Optimistic status update
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
        // Reset file input for this assignment
        setStudentFiles((prev) => ({ ...prev, [id]: null }));
      }
    } catch (err) {
      console.error("Failed to update assignment status:", err);
    } finally {
      setUploadingId(null);
    }
  };

  // Extract session details
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

  const [classes] = useState<ClassItem[]>([
    {
      id: "1",
      subject: "Reading",
      title: "Advanced Reading - Section A",
      date: "12",
      month: "Oct",
      time: "10:00 AM - 10:45 AM",
      teacher: "Mr. David",
      color: "bg-[#d8e2ff]",
      textColor: "text-[#005bbf]",
      tagColor: "bg-[#ffdfa0]",
      tagTextColor: "text-[#261a00]",
    },
    {
      id: "2",
      subject: "Math",
      title: "Intro to Numbers - Group 2",
      date: "14",
      month: "Oct",
      time: "2:30 PM - 3:15 PM",
      teacher: "Ms. Sarah",
      color: "bg-[#ffdbd0]",
      textColor: "text-[#3a0a00]",
      tagColor: "bg-[#d8e2ff]",
      tagTextColor: "text-[#001a41]",
    },
  ]);

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
    { id: "tutors" as const, icon: "face", label: "My Tutors" },
    { id: "achievements" as const, icon: "military_tech", label: "Achievements" },
    { id: "resources" as const, icon: "library_books", label: "Resources" },
  ];

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

  // -------------------------------------------------------------
  // 1. LOADING SCREEN
  // -------------------------------------------------------------
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

  // -------------------------------------------------------------
  // 2. PENDING APPROVAL SCREEN
  // -------------------------------------------------------------
  if (approvalStatus === "pending") {
    return (
      <div className="min-h-screen w-full bg-[#fbf9f8] flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-8 max-w-[720px] w-full text-center border border-[#eae8e7] shadow-lg space-y-6">
          <div className="w-16 h-16 bg-[#005bbf]/10 text-[#005bbf] rounded-full flex items-center justify-center mx-auto">
            <span className="material-symbols-outlined text-3xl">hourglass_top</span>
          </div>

          <div className="space-y-2">
            <h2 className="font-quicksand font-bold text-2xl text-[#1b1c1c]">
              Account Approval Pending ⏳
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
              className="w-full bg-[#005bbf] hover:bg-[#004493] text-white font-quicksand font-bold py-3 rounded-xl text-xs sm:text-sm transition-all shadow-sm active:scale-95"
            >
              Check Status Again
            </button>

            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="w-full bg-[#f5f3f3] hover:bg-[#eae8e7] text-[#414754] font-quicksand font-bold py-2.5 rounded-xl text-xs transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // 3. APPROVED STUDENT DASHBOARD (Normal Dashboard View)
  // -------------------------------------------------------------
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

        {/* Dynamic Profile Avatar */}
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
          <p className="text-sm text-[#414754] font-medium">Ready to learn?</p>
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
          {/* Notifications Trigger */}
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

            {/* Notifications Dropdown */}
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

          {/* Settings Trigger */}
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

          {/* Mobile Menu Trigger */}
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
        {/* Top Header Bar (Desktop Actions) */}
        <div className="flex justify-between items-end mb-8">
          <div>
            <h1 className="font-quicksand text-2xl sm:text-3xl md:text-4xl font-bold text-[#1b1c1c] mb-1.5">
              {activeNav === "learning" && "My Learning Journey"}
              {activeNav === "assignments" && "My Assignments & Activities"}
              {activeNav === "tutors" && "My Teachers & Tutors"}
              {activeNav === "achievements" && "My Badges & Trophies"}
              {activeNav === "resources" && "Learning Resources"}
            </h1>
            <p className="text-xs sm:text-sm text-[#414754]">
              {activeNav === "learning" && `Here is your plan for the week, ${firstName}!`}
              {activeNav === "assignments" && "Complete your assigned tasks from your teacher."}
              {activeNav === "tutors" && "Connect with your tutors and ask questions anytime."}
              {activeNav === "achievements" && "Track stars and unlock rewards as you learn."}
              {activeNav === "resources" && "Download worksheets, guides, and storybooks."}
            </p>
          </div>

          <div className="hidden md:flex items-center gap-3">
            {/* Desktop Notifications Popover Trigger */}
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

            {/* Settings Trigger Button */}
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
            {/* Hero / Daily Progress */}
            <div className="md:col-span-8 bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-[#e4e2e1] relative overflow-hidden flex flex-col justify-between min-h-[300px]">
              <div className="absolute top-0 right-0 w-64 h-64 bg-[#d8e2ff] rounded-full blur-3xl opacity-30 -mr-20 -mt-20 pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-[#ffdbd0] rounded-full blur-2xl opacity-20 -ml-10 -mb-10 pointer-events-none" />
              <div className="relative z-10 mb-6">
                <div className="inline-block px-3 py-1 bg-[#fe6f42] text-white rounded-full text-xs font-bold font-quicksand mb-4 uppercase tracking-wider">
                  Today&apos;s Focus
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

            {/* Quick Chat Widget */}
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
                <button className="bg-white/20 hover:bg-white/30 p-2 rounded-full transition-colors">
                  <span className="material-symbols-outlined">edit_square</span>
                </button>
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
              <button className="relative z-10 mt-4 w-full py-2.5 bg-white text-[#005bbf] font-quicksand font-bold rounded-xl hover:bg-[#f5f3f3] transition-colors shadow-sm text-xs sm:text-sm">
                View All Messages
              </button>
            </div>

            {/* Upcoming Classes */}
            <div className="md:col-span-7 bg-white rounded-3xl p-6 shadow-sm border border-[#e4e2e1]">
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-quicksand text-xl font-bold text-[#1b1c1c]">
                  Upcoming Classes
                </h3>
                <button className="text-[#005bbf] text-xs sm:text-sm font-bold hover:underline">
                  View Schedule
                </button>
              </div>
              <div className="flex flex-col gap-4">
                {classes.map((cls) => (
                  <div
                    key={cls.id}
                    className="flex items-center gap-4 p-4 rounded-2xl border border-[#e4e2e1] hover:border-[#005bbf]/30 hover:bg-[#fbf9f8] transition-colors cursor-pointer group"
                  >
                    <div
                      className={`flex flex-col items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-xl font-quicksand shrink-0 ${cls.color} ${cls.textColor}`}
                    >
                      <span className="text-[10px] sm:text-xs font-bold uppercase">{cls.month}</span>
                      <span className="text-lg sm:text-xl font-bold">{cls.date}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className={`px-2 py-0.5 ${cls.tagColor} ${cls.tagTextColor} text-[10px] font-bold rounded-md uppercase tracking-wide`}
                        >
                          {cls.subject}
                        </span>
                        <h4 className="font-quicksand font-bold text-xs sm:text-sm text-[#1b1c1c] group-hover:text-[#005bbf] transition-colors truncate">
                          {cls.title}
                        </h4>
                      </div>
                      <p className="text-xs sm:text-sm text-[#414754] flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px]">schedule</span>
                        {cls.time}
                      </p>
                      <p className="text-xs sm:text-sm text-[#414754] flex items-center gap-1 mt-0.5">
                        <span className="material-symbols-outlined text-[14px]">person</span>
                        {cls.teacher}
                      </p>
                    </div>
                    <div className="hidden sm:flex">
                      <button className="w-9 h-9 rounded-full border border-[#c1c6d6] flex items-center justify-center hover:bg-[#005bbf] hover:text-white hover:border-[#005bbf] transition-colors text-[#414754]">
                        <span className="material-symbols-outlined text-lg">arrow_forward</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 📝 REAL DATABASE ASSIGNMENTS FROM TEACHER (OVERVIEW WIDGET) */}
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

                          {/* Teacher Description */}
                          {assignment.description && (
                            <p className="text-xs text-[#414754] my-1.5 bg-[#f5f3f3] p-2 rounded-lg border border-[#eae8e7]/60">
                              {assignment.description}
                            </p>
                          )}

                          {/* Teacher Attachment Link */}
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

        {/* 📝 NAV VIEW: DEDICATED ASSIGNMENTS TAB */}
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
                <h3 className="font-quicksand font-bold text-base text-[#1b1c1c]">
                  All Caught Up!
                </h3>
                <p className="text-xs sm:text-sm text-[#727785] mt-1">
                  You currently have no assignments assigned to you.
                </p>
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

                        {/* Optional Teacher Description */}
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
                            <span>View Teacher Attachment</span>
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

                        {/* Optional Student Completed File Attachment Input */}
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
                className="w-14 h-14 rounded-full object-cover border-2 border-[#005bbf] shrink-0"
              />
              <div>
                <h3 className="font-quicksand font-bold text-base text-[#1b1c1c]">Ms. Sarah</h3>
                <p className="text-xs text-[#727785]">Math Tutor</p>
                <span className="inline-block mt-2 bg-[#005bbf]/10 text-[#005bbf] text-[10px] font-bold px-2 py-0.5 rounded-full">Active Tutor</span>
              </div>
            </div>
          </div>
        )}

        {/* NAV VIEW: ACHIEVEMENTS */}
        {activeNav === "achievements" && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-3xl p-5 border border-[#e4e2e1] text-center">
              <div className="w-16 h-16 rounded-full bg-[#ffdfa0] text-[#795900] mx-auto flex items-center justify-center mb-3">
                <span className="material-symbols-outlined text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
              </div>
              <h4 className="font-quicksand font-bold text-sm text-[#1b1c1c]">Early Bird</h4>
              <p className="text-[11px] text-[#727785] mt-1">Completed 5 morning goals</p>
            </div>
            <div className="bg-white rounded-3xl p-5 border border-[#e4e2e1] text-center">
              <div className="w-16 h-16 rounded-full bg-[#d8e2ff] text-[#005bbf] mx-auto flex items-center justify-center mb-3">
                <span className="material-symbols-outlined text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>workspace_premium</span>
              </div>
              <h4 className="font-quicksand font-bold text-sm text-[#1b1c1c]">Math Master</h4>
              <p className="text-[11px] text-[#727785] mt-1">Counted to 20 perfectly</p>
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
              <button className="bg-[#f5f3f3] text-[#005bbf] px-4 py-1.5 rounded-full text-xs font-bold font-quicksand hover:bg-[#005bbf]/10">Download</button>
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
          {/* Account Profile Card */}
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
                Active Student
              </span>
            </div>
          </div>

          {/* Preferences Toggles */}
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

          {/* Sign Out Action Button */}
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
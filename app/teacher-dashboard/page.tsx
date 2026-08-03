"use client";

import { useState, useEffect } from "react";
import Image from "next/image";

type Student = {
  id: string;
  name: string;
  avatar: string;
  subject: string;
  time: string;
  status: "active" | "pending";
  progress: number;
  email: string;
};

type Group = {
  id: string;
  name: string;
  students: string[];
  section: string;
};

type Section = {
  id: string;
  name: string;
  groups: number;
  students: number;
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

export default function TeacherDashboard() {
  const [mounted, setMounted] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeView, setActiveView] = useState<
    "overview" | "students" | "groups" | "sections" | "schedule"
  >("overview");

  useEffect(() => {
    setMounted(true);
  }, []);

  const [students, setStudents] = useState<Student[]>([
    {
      id: "1",
      name: "Leo Bennett",
      avatar:
        "https://lh3.googleusercontent.com/aida-public/AB6AXuBXPr-oSV6LBFC_X7G2-LlBphRU1IJfGD58PujbLVLG1nk6NOMAJq3KNOhDrF9zFm8Conqd_DD5zpgbdQW8y5eZRTpQ3LBQfPlwohfqNIx4bE6xrtKpAnxfwnVJHVP5Nl0ODlNPrc7PeAm5UqTyeYWmZrfosdhV1l1vIRGLJjTU-YsECNvmj78zDsSZLKO5YZRPQTaAKxNA5LhO4WBnEdenbtcP8thF2Xa6_XfC_d_fgD_nmJsj4iOHGA",
      subject: "Reading",
      time: "9:00 AM - 9:45 AM",
      status: "active",
      progress: 75,
      email: "leo.bennett@email.com",
    },
    {
      id: "2",
      name: "Mia Chang",
      avatar:
        "https://lh3.googleusercontent.com/aida-public/AB6AXuAKVZqOh002WBku_9ztYfeQF1GxhhpcYsEOLbM5r4XM37FKW5h1rWn2g_oPfOEd9qaPHQEm_qgMGKaZ_7jsK3Mpf3WFXSBPmRbDDwpfxlNOydU-n1Uf_wD8YbWMdZxisSg7TF3nRqmKLohuBx13T8thYwsZlLkMnLOA1OiOfrWHiYSsIYSuLyP9fCeoPeMfSM5mBhIHYgyPOH-f073sVCidzOqgv7qVuZYN-P8natGeorsmLqEe5cYyCQ",
      subject: "Math Concepts",
      time: "11:15 AM - 12:00 PM",
      status: "active",
      progress: 45,
      email: "mia.chang@email.com",
    },
    {
      id: "3",
      name: "Sam Rivera",
      avatar:
        "https://lh3.googleusercontent.com/aida-public/AB6AXuCQp9hpI_rAqqxXQCtOSg0Hc_3TiA_bdldTgXInxdPmrafjmw6_NoI9zac3vx4KwNZx-EFfdx9g2VQ4uc7CqiPL6J83XDfF4M56jmFtM6W75p8ahCsHT-Yqyz7gosagkAyL0wU3ZN7n5XYDivqcwwNtqDBxNTI-n5F-w4R-AHmoUs4xLUSdYKHlj5Lh-rHM_J_POD362yLmVOsvZOXQ31AJ04510oNnZTZ0bAGTkw07m-XzrZ1JVrpPmA",
      subject: "Science",
      time: "2:00 PM - 2:45 PM",
      status: "active",
      progress: 90,
      email: "sam.rivera@email.com",
    },
  ]);

  const [groups, setGroups] = useState<Group[]>([
    { id: "1", name: "Advanced Reading", students: ["1", "3"], section: "Section A" },
    { id: "2", name: "Math Basics", students: ["2"], section: "Section B" },
  ]);

  const [sections, setSections] = useState<Section[]>([
    { id: "1", name: "Section A", groups: 1, students: 2 },
    { id: "2", name: "Section B", groups: 1, students: 1 },
  ]);

  const [invites, setInvites] = useState<Invite[]>([
    {
      id: "1",
      name: "Emma Wilson",
      email: "emma.wilson@email.com",
      avatar:
        "https://lh3.googleusercontent.com/aida-public/AB6AXuCQp9hpI_rAqqxXQCtOSg0Hc_3TiA_bdldTgXInxdPmrafjmw6_NoI9zac3vx4KwNZx-EFfdx9g2VQ4uc7CqiPL6J83XDfF4M56jmFtM6W75p8ahCsHT-Yqyz7gosagkAyL0wU3ZN7n5XYDivqcwwNtqDBxNTI-n5F-w4R-AHmoUs4xLUSdYKHlj5Lh-rHM_J_POD362yLmVOsvZOXQ31AJ04510oNnZTZ0bAGTkw07m-XzrZ1JVrpPmA",
      date: "Aug 3, 2026",
    },
  ]);

  const [meetings, setMeetings] = useState<Meeting[]>([]);

  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showAddGroup, setShowAddGroup] = useState(false);
  const [showAddSection, setShowAddSection] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [preselectedStudentId, setPreselectedStudentId] = useState("");

  const [scheduleForm, setScheduleForm] = useState({
    studentId: "",
    topic: "",
    date: "",
    time: "",
    meetLink: "",
  });

  const [newGroup, setNewGroup] = useState({ name: "", section: "" });
  const [newSection, setNewSection] = useState({ name: "" });

  const openScheduleForStudent = (studentId: string) => {
    setPreselectedStudentId(studentId);
    setScheduleForm((prev) => ({ ...prev, studentId }));
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
    setScheduleForm({ studentId: "", topic: "", date: "", time: "", meetLink: "" });
  };

  const handleAcceptInvite = (invite: Invite) => {
    const newStudent: Student = {
      id: Math.random().toString(36).slice(2, 11),
      name: invite.name,
      avatar: invite.avatar,
      subject: "Pending Assignment",
      time: "Not Scheduled",
      status: "active",
      progress: 0,
      email: invite.email,
    };
    setStudents((prev) => [...prev, newStudent]);
    setInvites((prev) => prev.filter((i) => i.id !== invite.id));
  };

  const handleAddGroup = () => {
    if (!newGroup.name || !newGroup.section) return;
    setGroups((prev) => [
      ...prev,
      {
        id: Math.random().toString(36).slice(2, 11),
        name: newGroup.name,
        students: [],
        section: newGroup.section,
      },
    ]);
    setNewGroup({ name: "", section: "" });
    setShowAddGroup(false);
  };

  const handleAddSection = () => {
    if (!newSection.name) return;
    setSections((prev) => [
      ...prev,
      {
        id: Math.random().toString(36).slice(2, 11),
        name: newSection.name,
        groups: 0,
        students: 0,
      },
    ]);
    setNewSection({ name: "" });
    setShowAddSection(false);
  };

  const navItems = [
    { id: "overview" as const, icon: "dashboard", label: "Overview" },
    { id: "students" as const, icon: "groups", label: "Students" },
    { id: "groups" as const, icon: "group_work", label: "Groups" },
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
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60] flex items-start sm:items-center justify-center p-4 overflow-y-auto">
        <div className="bg-white rounded-2xl p-6 w-ful shadow-2xl my-8 sm:my-0 relative">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-quicksand font-bold text-xl text-[#1b1c1c]">{title}</h3>
            <button
              onClick={onClose}
              className="text-[#727785] hover:text-[#1b1c1c] p-1.5 rounded-full hover:bg-[#f5f3f3] transition-colors"
            >
              <span className="material-symbols-outlined">close</span>
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
            <div className="w-10 h-10 rounded-full bg-[#1a73e8]/10 flex items-center justify-center shrink-0">
              <Image
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuCQp9hpI_rAqqxXQCtOSg0Hc_3TiA_bdldTgXInxdPmrafjmw6_NoI9zac3vx4KwNZx-EFfdx9g2VQ4uc7CqiPL6J83XDfF4M56jmFtM6W75p8ahCsHT-Yqyz7gosagkAyL0wU3ZN7n5XYDivqcwwNtqDBxNTI-n5F-w4R-AHmoUs4xLUSdYKHlj5Lh-rHM_J_POD362yLmVOsvZOXQ31AJ04510oNnZTZ0bAGTkw07m-XzrZ1JVrpPmA"
                alt="Profile"
                width={40}
                height={40}
                unoptimized
                className="w-10 h-10 rounded-full object-cover border-2 border-[#005bbf]"
              />
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
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-quicksand font-bold transition-all text-left ${
                activeView === item.id
                  ? "text-[#005bbf] bg-[#1a73e8]/10"
                  : "text-[#414754] hover:text-[#005bbf] hover:bg-[#f5f3f3]"
              }`}
            >
              <span
                className="material-symbols-outlined text-xl"
                style={activeView === item.id ? { fontVariationSettings: "'FILL' 1" } : {}}
              >
                {item.icon}
              </span>
              <span>{item.label}</span>
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
            <span className="font-quicksand font-bold text-xl text-[#005bbf]">Happy Toddles</span>
            <button onClick={() => setMobileMenuOpen(false)} className="text-[#414754]">
              <span className="material-symbols-outlined text-2xl">close</span>
            </button>
          </div>
          <nav className="space-y-2 font-quicksand font-bold text-sm text-[#414754]">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setActiveView(item.id);
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left ${
                  activeView === item.id
                    ? "bg-[#1a73e8]/10 text-[#005bbf]"
                    : "hover:bg-[#f5f3f3]"
                }`}
              >
                <span className="material-symbols-outlined text-lg">{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </nav>
        </div>
        <button
          onClick={() => setShowScheduleModal(true)}
          className="w-full bg-[#005bbf] text-white py-3 rounded-full font-quicksand font-bold text-sm flex items-center justify-center gap-2"
        >
          <span className="material-symbols-outlined text-lg">play_arrow</span>
          <span>Start Session</span>
        </button>
      </aside>

      {/* Main Content */}
      <main className="flex-1 md:ml-64 relative min-h-screen pb-12">
        <header className="bg-white flex justify-between items-center w-full h-16 px-6 md:px-12 shadow-sm sticky top-0 z-40 bg-white/90 backdrop-blur-md">
          <div className="flex items-center gap-3 md:hidden">
            <button onClick={() => setMobileMenuOpen(true)} className="text-[#005bbf]">
              <span className="material-symbols-outlined text-2xl">menu</span>
            </button>
            <span className="font-quicksand font-bold text-lg text-[#005bbf]">Happy Toddles</span>
          </div>
          <div className="hidden md:flex items-center bg-[#f5f3f3] rounded-full px-4 py-2 border border-[#eae8e7] w-96">
            <span className="material-symbols-outlined text-[#727785] mr-2 text-lg">search</span>
            <input
              type="text"
              placeholder="Search students, classes, or resources..."
              className="bg-transparent border-none focus:outline-none text-sm w-full"
            />
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <button className="text-[#414754] hover:text-[#005bbf] p-2 rounded-full hover:bg-[#f5f3f3]">
              <span className="material-symbols-outlined text-xl">notifications</span>
            </button>
            <button className="text-[#414754] hover:text-[#005bbf] p-2 rounded-full hover:bg-[#f5f3f3]">
              <span className="material-symbols-outlined text-xl">settings</span>
            </button>
          </div>
        </header>

        <div className="p-6 md:p-12 max-w-[1280px] mx-auto space-y-8">
          {/* OVERVIEW */}
          {activeView === "overview" && (
            <>
              <section className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                  <h2 className="font-quicksand font-bold text-2xl md:text-3xl text-[#1b1c1c] mb-1">
                    Welcome back, Sarah! 👋
                  </h2>
                  <p className="font-inter text-sm md:text-base text-[#414754]">
                    You have {students.length} students and {meetings.length} meetings scheduled.
                  </p>
                </div>
                <div className="text-left md:text-right">
                  <p className="font-inter font-semibold text-xs text-[#727785] uppercase tracking-wider">
                    Today&apos;s Date
                  </p>
                  <p className="font-quicksand font-bold text-xl text-[#005bbf]">{todayStr}</p>
                </div>
              </section>

              {invites.length > 0 && (
                <div className="bg-[#005bbf]/5 border border-[#005bbf]/20 rounded-2xl p-4">
                  <h3 className="font-quicksand font-bold text-sm text-[#005bbf] mb-3 flex items-center gap-2">
                    <span className="material-symbols-outlined">mail</span>
                    Pending Invites ({invites.length})
                  </h3>
                  <div className="space-y-2">
                    {invites.map((invite) => (
                      <div
                        key={invite.id}
                        className="flex items-center justify-between bg-white rounded-xl p-3"
                      >
                        <div className="flex items-center gap-3">
                          <Image
                            src={invite.avatar}
                            alt={invite.name}
                            width={36}
                            height={36}
                            unoptimized
                            className="w-9 h-9 rounded-full object-cover"
                          />
                          <div>
                            <p className="font-quicksand font-bold text-sm text-[#1b1c1c]">
                              {invite.name}
                            </p>
                            <p className="text-xs text-[#727785]">{invite.email}</p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleAcceptInvite(invite)}
                            className="bg-[#005bbf] text-white px-4 py-1.5 rounded-full text-xs font-quicksand font-bold hover:bg-[#004493]"
                          >
                            Accept
                          </button>
                          <button
                            onClick={() => setInvites((prev) => prev.filter((i) => i.id !== invite.id))}
                            className="border border-[#eae8e7] text-[#414754] px-4 py-1.5 rounded-full text-xs font-quicksand font-bold hover:bg-[#f5f3f3]"
                          >
                            Decline
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                <div className="md:col-span-8 space-y-6">
                  <div className="bg-white/80 backdrop-blur-md rounded-[24px] p-6 border border-white/40 shadow-[0_4px_12px_rgba(26,115,232,0.05)]">
                    <div className="flex flex-wrap justify-between items-center gap-3 mb-6">
                      <h3 className="font-quicksand font-semibold text-xl text-[#1b1c1c] flex items-center gap-2">
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
                        className="flex items-center gap-1.5 bg-[#005bbf] text-white px-4 py-2 rounded-full font-quicksand font-bold text-xs hover:bg-[#004493] transition-colors"
                      >
                        <span className="material-symbols-outlined text-base">add</span>
                        <span>Schedule Meet</span>
                      </button>
                    </div>
                    <div className="space-y-4">
                      {students.map((student) => (
                        <div
                          key={student.id}
                          className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-[#f5f3f3] rounded-2xl border border-[#eae8e7] hover:border-[#005bbf]/30 transition-colors gap-4"
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full p-0.5 border-2 border-[#005bbf] bg-white relative shrink-0">
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
                              <h4 className="font-quicksand font-bold text-base text-[#1b1c1c]">
                                {student.name}
                              </h4>
                              <button
                                onClick={() => setSelectedStudent(student)}
                                className="text-xs text-[#005bbf] hover:underline font-semibold block text-left"
                              >
                                View Profile
                              </button>
                              <p className="text-xs text-[#414754] flex items-center gap-1 mt-0.5">
                                <span className="material-symbols-outlined text-xs">schedule</span>
                                <span>{student.time}</span>
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                            <span className="bg-[#005bbf]/10 text-[#005bbf] px-3 py-1 rounded-full font-inter font-semibold text-xs">
                              {student.subject}
                            </span>
                            <button
                              onClick={() => openScheduleForStudent(student.id)}
                              className="w-10 h-10 rounded-full bg-[#005bbf] text-white flex items-center justify-center hover:opacity-90 transition-opacity shadow-sm shrink-0"
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

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="bg-white/80 backdrop-blur-md rounded-[24px] p-6 border border-white/40 shadow-[0_4px_12px_rgba(26,115,232,0.05)]">
                      <h4 className="font-quicksand font-bold text-base text-[#1b1c1c] mb-4 flex items-center gap-2">
                        <span className="material-symbols-outlined text-[#795900]">history</span>
                        Recent Activity
                      </h4>
                      <ul className="space-y-3">
                        <li className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-full bg-[#fe6f42]/10 flex items-center justify-center shrink-0">
                            <span className="material-symbols-outlined text-[#ac3509] text-base">
                              star
                            </span>
                          </div>
                          <div>
                            <p className="text-sm text-[#1b1c1c]">
                              <strong>Leo</strong> completed Alphabet Soup
                            </p>
                            <span className="text-xs text-[#727785]">2 hours ago</span>
                          </div>
                        </li>
                        <li className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-full bg-[#005bbf]/10 flex items-center justify-center shrink-0">
                            <span className="material-symbols-outlined text-[#005bbf] text-base">
                              workspace_premium
                            </span>
                          </div>
                          <div>
                            <p className="text-sm text-[#1b1c1c]">
                              <strong>Sam</strong> mastered Counting to 10
                            </p>
                            <span className="text-xs text-[#727785]">Yesterday</span>
                          </div>
                        </li>
                      </ul>
                    </div>

                    <div className="bg-white/80 backdrop-blur-md rounded-[24px] p-6 border border-white/40 shadow-[0_4px_12px_rgba(26,115,232,0.05)]">
                      <div className="flex justify-between items-center mb-4">
                        <h4 className="font-quicksand font-bold text-base text-[#1b1c1c] flex items-center gap-2">
                          <span className="material-symbols-outlined text-[#005bbf]">
                            group_work
                          </span>
                          Groups
                        </h4>
                        <button
                          onClick={() => setShowAddGroup(true)}
                          className="text-[#005bbf] hover:bg-[#005bbf]/5 p-1 rounded-full"
                        >
                          <span className="material-symbols-outlined text-lg">add_circle</span>
                        </button>
                      </div>
                      <div className="space-y-2">
                        {groups.map((group) => (
                          <div
                            key={group.id}
                            className="flex items-center justify-between p-2.5 bg-[#f5f3f3] rounded-xl"
                          >
                            <div>
                              <p className="font-inter font-semibold text-xs text-[#1b1c1c]">
                                {group.name}
                              </p>
                              <p className="text-[11px] text-[#727785]">
                                {group.section} • {group.students.length} Students
                              </p>
                            </div>
                            <button
                              onClick={() => setGroups((prev) => prev.filter((g) => g.id !== group.id))}
                              className="text-[#727785] hover:text-[#ac3509]"
                            >
                              <span className="material-symbols-outlined text-lg">delete</span>
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="md:col-span-4 space-y-6">
                  <div className="bg-white/80 backdrop-blur-md rounded-[24px] p-6 border border-white/40 shadow-[0_4px_12px_rgba(26,115,232,0.05)]">
                    <h3 className="font-quicksand font-bold text-xl text-[#1b1c1c] mb-6 flex items-center gap-2">
                      <span
                        className="material-symbols-outlined text-[#ac3509]"
                        style={{ fontVariationSettings: "'FILL' 1" }}
                      >
                        trending_up
                      </span>
                      Student Progress
                    </h3>
                    <div className="space-y-6">
                      {students.map((s) => (
                        <div key={s.id}>
                          <div className="flex justify-between items-end mb-2">
                            <span className="font-quicksand font-bold text-xs text-[#1b1c1c]">
                              {s.name}
                            </span>
                            <span
                              className={`font-inter font-semibold text-xs ${
                                s.progress >= 70
                                  ? "text-[#005bbf]"
                                  : s.progress >= 40
                                  ? "text-[#795900]"
                                  : "text-[#ac3509]"
                              }`}
                            >
                              {s.progress}%
                            </span>
                          </div>
                          <div className="h-3 w-full bg-[#eae8e7] rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                s.progress >= 70
                                  ? "bg-[#005bbf]"
                                  : s.progress >= 40
                                  ? "bg-[#795900]"
                                  : "bg-[#fe6f42]"
                              }`}
                              style={{ width: `${s.progress}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* STUDENTS */}
          {activeView === "students" && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="font-quicksand font-bold text-2xl text-[#1b1c1c]">
                  All Students ({students.length})
                </h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {students.map((student) => (
                  <div
                    key={student.id}
                    onClick={() => setSelectedStudent(student)}
                    className="bg-white rounded-[24px] p-5 border border-[#eae8e7] hover:border-[#005bbf]/30 hover:shadow-md transition-all cursor-pointer"
                  >
                    <div className="flex items-center gap-4 mb-3">
                      <Image
                        src={student.avatar}
                        alt={student.name}
                        width={56}
                        height={56}
                        unoptimized
                        className="w-14 h-14 rounded-full object-cover border-2 border-[#005bbf]"
                      />
                      <div>
                        <h3 className="font-quicksand font-bold text-base text-[#1b1c1c]">
                          {student.name}
                        </h3>
                        <p className="text-xs text-[#727785]">{student.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="bg-[#005bbf]/10 text-[#005bbf] px-2.5 py-1 rounded-full font-semibold">
                        {student.subject}
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
                ))}
              </div>
            </div>
          )}

          {/* GROUPS */}
          {activeView === "groups" && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="font-quicksand font-bold text-2xl text-[#1b1c1c]">
                  Groups ({groups.length})
                </h2>
                <button
                  onClick={() => setShowAddGroup(true)}
                  className="bg-[#005bbf] text-white px-5 py-2.5 rounded-full font-quicksand font-bold text-sm hover:bg-[#004493] flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-base">add</span>
                  Create Group
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {groups.map((group) => (
                  <div key={group.id} className="bg-white rounded-[24px] p-6 border border-[#eae8e7]">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="font-quicksand font-bold text-lg text-[#1b1c1c]">
                          {group.name}
                        </h3>
                        <p className="text-sm text-[#727785]">{group.section}</p>
                      </div>
                      <button
                        onClick={() => setGroups((prev) => prev.filter((g) => g.id !== group.id))}
                        className="text-[#727785] hover:text-[#ac3509] p-1"
                      >
                        <span className="material-symbols-outlined">delete</span>
                      </button>
                    </div>
                    <div className="flex -space-x-2 mb-4">
                      {group.students.map((sid) => {
                        const s = students.find((x) => x.id === sid);
                        return s ? (
                          <Image
                            key={sid}
                            src={s.avatar}
                            alt={s.name}
                            width={32}
                            height={32}
                            unoptimized
                            className="w-8 h-8 rounded-full border-2 border-white object-cover"
                          />
                        ) : null;
                      })}
                      <div className="w-8 h-8 rounded-full bg-[#f5f3f3] border-2 border-white flex items-center justify-center text-xs text-[#727785]">
                        +{group.students.length}
                      </div>
                    </div>
                    <button
                      onClick={() => setShowScheduleModal(true)}
                      className="w-full py-2 border border-[#005bbf]/20 text-[#005bbf] rounded-xl font-quicksand font-bold text-xs hover:bg-[#005bbf]/5"
                    >
                      Schedule Meet
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SECTIONS */}
          {activeView === "sections" && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="font-quicksand font-bold text-2xl text-[#1b1c1c]">
                  Sections ({sections.length})
                </h2>
                <button
                  onClick={() => setShowAddSection(true)}
                  className="bg-[#005bbf] text-white px-5 py-2.5 rounded-full font-quicksand font-bold text-sm hover:bg-[#004493] flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-base">add</span>
                  Add Section
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {sections.map((section) => (
                  <div
                    key={section.id}
                    className="bg-white rounded-[24px] p-6 border border-[#eae8e7] hover:border-[#005bbf]/30 transition-all"
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-full bg-[#005bbf]/10 flex items-center justify-center">
                        <span className="material-symbols-outlined text-[#005bbf]">school</span>
                      </div>
                      <h3 className="font-quicksand font-bold text-lg text-[#1b1c1c]">
                        {section.name}
                      </h3>
                    </div>
                    <div className="space-y-2 text-sm text-[#414754]">
                      <p className="flex justify-between">
                        <span>Groups</span>
                        <span className="font-semibold">{section.groups}</span>
                      </p>
                      <p className="flex justify-between">
                        <span>Students</span>
                        <span className="font-semibold">{section.students}</span>
                      </p>
                    </div>
                    <button
                      onClick={() => setSections((prev) => prev.filter((s) => s.id !== section.id))}
                      className="mt-4 w-full py-2 text-xs text-[#ac3509] border border-[#ac3509]/20 rounded-xl hover:bg-[#ac3509]/5 font-quicksand font-bold"
                    >
                      Remove Section
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SCHEDULE */}
          {activeView === "schedule" && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="font-quicksand font-bold text-2xl text-[#1b1c1c]">
                  Scheduled Meetings
                </h2>
                <button
                  onClick={() => setShowScheduleModal(true)}
                  className="bg-[#005bbf] text-white px-5 py-2.5 rounded-full font-quicksand font-bold text-sm hover:bg-[#004493] flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-base">add</span>
                  New Meeting
                </button>
              </div>
              {meetings.length === 0 ? (
                <div className="bg-white rounded-[24px] p-12 text-center border border-[#eae8e7]">
                  <span className="material-symbols-outlined text-4xl text-[#eae8e7] mb-2">
                    event_busy
                  </span>
                  <p className="text-[#727785]">No meetings scheduled yet.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {meetings.map((meet) => {
                    const s = students.find((x) => x.id === meet.studentId);
                    return (
                      <div
                        key={meet.id}
                        className="bg-white rounded-2xl p-5 border border-[#eae8e7] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                      >
                        <div className="flex items-center gap-4">
                          {s && (
                            <Image
                              src={s.avatar}
                              alt={s.name}
                              width={48}
                              height={48}
                              unoptimized
                              className="w-12 h-12 rounded-full object-cover border-2 border-[#005bbf]"
                            />
                          )}
                          <div>
                            <h4 className="font-quicksand font-bold text-base">{meet.topic}</h4>
                            <p className="text-xs text-[#727785]">
                              {s?.name} • {meet.date} at {meet.time}
                            </p>
                          </div>
                        </div>
                        <a
                          href={meet.meetLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="bg-[#005bbf] text-white px-5 py-2 rounded-full text-xs font-quicksand font-bold hover:bg-[#004493] flex items-center gap-2"
                        >
                          <span className="material-symbols-outlined text-base">videocam</span>
                          Join Meet
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

      {/* Schedule Modal */}
      {renderModal(showScheduleModal, () => setShowScheduleModal(false), "Schedule Google Meet", (
        <div className="space-y-5">
          <div>
            <label className="block text-xs font-semibold text-[#414754] mb-1.5">Student</label>
            <select
              className="w-full border border-[#eae8e7] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#005bbf] focus:ring-1 focus:ring-[#005bbf] bg-white"
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
              className="w-full border border-[#eae8e7] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#005bbf] focus:ring-1 focus:ring-[#005bbf]"
              value={scheduleForm.topic}
              onChange={(e) => setScheduleForm({ ...scheduleForm, topic: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#414754] mb-1.5">Date</label>
              <input
                type="date"
                className="w-full border border-[#eae8e7] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#005bbf] focus:ring-1 focus:ring-[#005bbf]"
                value={scheduleForm.date}
                onChange={(e) => setScheduleForm({ ...scheduleForm, date: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#414754] mb-1.5">Time</label>
              <input
                type="time"
                className="w-full border border-[#eae8e7] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#005bbf] focus:ring-1 focus:ring-[#005bbf]"
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
              className="w-full border border-[#eae8e7] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#005bbf] focus:ring-1 focus:ring-[#005bbf]"
              value={scheduleForm.meetLink}
              onChange={(e) => setScheduleForm({ ...scheduleForm, meetLink: e.target.value })}
            />
            <p className="text-[11px] text-[#727785] mt-1">
              Paste your Google Meet link here. Only you can provide this.
            </p>
          </div>
          <button
            onClick={handleScheduleMeet}
            className="w-full bg-[#005bbf] text-white py-3.5 rounded-xl font-quicksand font-bold hover:bg-[#004493] transition-colors mt-2"
          >
            Schedule Meeting
          </button>
        </div>
      ))}

      {/* Add Group Modal */}
      {renderModal(showAddGroup, () => setShowAddGroup(false), "Create New Group", (
        <div className="space-y-5">
          <div>
            <label className="block text-xs font-semibold text-[#414754] mb-1.5">Group Name</label>
            <input
              type="text"
              placeholder="e.g. Advanced Math"
              className="w-full border border-[#eae8e7] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#005bbf] focus:ring-1 focus:ring-[#005bbf]"
              value={newGroup.name}
              onChange={(e) => setNewGroup({ ...newGroup, name: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#414754] mb-1.5">Section</label>
            <select
              className="w-full border border-[#eae8e7] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#005bbf] focus:ring-1 focus:ring-[#005bbf] bg-white"
              value={newGroup.section}
              onChange={(e) => setNewGroup({ ...newGroup, section: e.target.value })}
            >
              <option value="">Select section</option>
              {sections.map((s) => (
                <option key={s.id} value={s.name}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={handleAddGroup}
            className="w-full bg-[#005bbf] text-white py-3.5 rounded-xl font-quicksand font-bold hover:bg-[#004493]"
          >
            Create Group
          </button>
        </div>
      ))}

      {/* Add Section Modal */}
      {renderModal(showAddSection, () => setShowAddSection(false), "Add New Section", (
        <div className="space-y-5">
          <div>
            <label className="block text-xs font-semibold text-[#414754] mb-1.5">Section Name</label>
            <input
              type="text"
              placeholder="e.g. Section C"
              className="w-full border border-[#eae8e7] rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-[#005bbf] focus:ring-1 focus:ring-[#005bbf]"
              value={newSection.name}
              onChange={(e) => setNewSection({ ...newSection, name: e.target.value })}
            />
          </div>
          <button
            onClick={handleAddSection}
            className="w-full bg-[#005bbf] text-white py-3.5 rounded-xl font-quicksand font-bold hover:bg-[#004493]"
          >
            Add Section
          </button>
        </div>
      ))}

      {/* Student Detail Modal */}
      {renderModal(
        !!selectedStudent,
        () => setSelectedStudent(null),
        selectedStudent?.name || "Student Profile",
        selectedStudent && (
          <div className="space-y-5">
            <div className="flex items-center gap-4">
              <Image
                src={selectedStudent.avatar}
                alt={selectedStudent.name}
                width={64}
                height={64}
                unoptimized
                className="w-16 h-16 rounded-full object-cover border-2 border-[#005bbf]"
              />
              <div>
                <h4 className="font-quicksand font-bold text-lg">{selectedStudent.name}</h4>
                <p className="text-sm text-[#727785]">{selectedStudent.email}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-[#f5f3f3] rounded-xl p-3">
                <p className="text-[#727785] text-xs">Subject</p>
                <p className="font-semibold text-[#1b1c1c]">{selectedStudent.subject}</p>
              </div>
              <div className="bg-[#f5f3f3] rounded-xl p-3">
                <p className="text-[#727785] text-xs">Schedule</p>
                <p className="font-semibold text-[#1b1c1c]">{selectedStudent.time}</p>
              </div>
              <div className="bg-[#f5f3f3] rounded-xl p-3">
                <p className="text-[#727785] text-xs">Progress</p>
                <p className="font-semibold text-[#1b1c1c]">{selectedStudent.progress}%</p>
              </div>
              <div className="bg-[#f5f3f3] rounded-xl p-3">
                <p className="text-[#727785] text-xs">Status</p>
                <p className="font-semibold text-[#005bbf] capitalize">{selectedStudent.status}</p>
              </div>
            </div>
            <button
              onClick={() => {
                openScheduleForStudent(selectedStudent.id);
                setSelectedStudent(null);
              }}
              className="w-full bg-[#005bbf] text-white py-3.5 rounded-xl font-quicksand font-bold hover:bg-[#004493]"
            >
              Schedule Meeting
            </button>
          </div>
        )
      )}
    </div>
  );
}
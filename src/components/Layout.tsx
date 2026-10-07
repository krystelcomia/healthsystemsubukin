import React, { useState, useEffect } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { NavLink } from "@/components/NavLink";
import { Home, Info, Calendar, Phone, Fingerprint, Clock, UserCheck, LogOut, List, Shield, User, CalendarDays, Printer, AlertTriangle, History, Search, FilePlus, Edit3, Trash2, Activity, Filter, CheckCircle2 } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/contexts/AuthContext";
import { useSettings } from "@/contexts/SettingsContext";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { bhwCheckIn, bhwCheckOut, getActiveBhwShift } from "@/lib/activityLogger";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import OfficialHeader from "@/components/OfficialHeader";
import { BhaiChatbot } from "@/components/AteBhwChatbot";

const getHeaderLinks = (t: (key: string) => string) => [
  { label: t("nav.dashboard"), to: "/", Icon: Home, isCalendar: false },
  { label: t("nav.about"), to: "/about", Icon: Info, isCalendar: false },
  { label: t("nav.calendar"), to: "/calendar", Icon: Calendar, isCalendar: true },
  { label: t("nav.contact"), to: "/contact", Icon: Phone, isCalendar: false },
];

const DEFAULT_BHW_WORKERS = [
  { name: "Mary Jane Landicho", phone: "0912-345-6789", role: "midwife", sitio: "Subukin Main" },
  { name: "Cristeta R. Lanuza", phone: "0919-6980-712", role: "supervisor", sitio: "Masigla" },
  { name: "Krystel Comia", phone: "0912-345-6789", role: "worker", sitio: "Maligaya" },
  { name: "Evelyn T. Ilao", phone: "0935-5638-247", role: "worker", sitio: "Manggahan 1" },
  { name: "Cecilia G. Benosa", phone: "0921-8509-320", role: "worker", sitio: "Maligaya" },
  { name: "Merlita R. Alonzo", phone: "0930-9085-713", role: "worker", sitio: "Matahimik/Punta" },
  { name: "Suzette B. Lopez", phone: "0935-2008-942", role: "worker", sitio: "Makalintal 1" },
  { name: "Amelita R. Sayat", phone: "0931-0232-973", role: "worker", sitio: "Puntor" },
  { name: "Wilma D. Tanyag", phone: "0997-4971-138", role: "worker", sitio: "Masaya" },
  { name: "Nenita M. Dimaculangan", phone: "0985-1225-857", role: "worker", sitio: "Manggahan 2" },
  { name: "Mercy O. Abanilla", phone: "0949-7768-394", role: "worker", sitio: "Cama" },
  { name: "Renchie V. Ilao", phone: "0965-6627-031", role: "worker", sitio: "Makalintal 2" },
  { name: "Renalyn D. Laurante", phone: "0985-1086-472", role: "worker", sitio: "Matahimik / Burol" },
  { name: "Maribel M. Abayon", phone: "0922-6722-134", role: "bns", sitio: "Masigla" }
];

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, userRole, username, fullName, isMidwife } = useAuth();
  const { t, language } = useSettings();
  const [showAlertBadge, setShowAlertBadge] = useState(false);
  const [activeBhw, setActiveBhw] = useState<string | null>(null);
  const [sessionDuration, setSessionDuration] = useState("00:00:00");
  const [logsDialogOpen, setLogsDialogOpen] = useState(false);
  const [attendanceSearchQuery, setAttendanceSearchQuery] = useState("");
  const [attendanceStatusFilter, setAttendanceStatusFilter] = useState("ALL");
  const [attendanceDateFilter, setAttendanceDateFilter] = useState("ALL");
  const [attendanceWorkerFilter, setAttendanceWorkerFilter] = useState("ALL");
  const [activityLogsDialogOpen, setActivityLogsDialogOpen] = useState(false);
  const [activitySearchQuery, setActivitySearchQuery] = useState("");
  const [activityCategoryFilter, setActivityCategoryFilter] = useState("ALL");
  const [activityDateFilter, setActivityDateFilter] = useState("ALL");
  const [attendanceNoticeOpen, setAttendanceNoticeOpen] = useState(false);
  const [noticeDismissed, setNoticeDismissed] = useState(false);
  const [selectedWorker, setSelectedWorker] = useState<any>(null);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [attendanceLogs, setAttendanceLogs] = useState<any[]>([]);
  const [activityLogs, setActivityLogs] = useState<any[]>([]);
  const [workersList, setWorkersList] = useState<any[]>(DEFAULT_BHW_WORKERS);

  // Get active worker display name (full name, username or email local part)
  const workerDisplayName = fullName || username || user?.user_metadata?.full_name || (userRole === "supervisor" ? "Cristeta R. Lanuza" : userRole === "midwife" ? "Mary Jane Landicho" : user?.email?.split("@")[0]) || "Staff";

  useEffect(() => {
    const updateBhwState = () => {
      if (!user) {
        setActiveBhw(null);
        setAttendanceLogs([]);
        setActivityLogs([]);
        return;
      }

      // Check active shift strictly for the logged-in user
      const activeShift = getActiveBhwShift(user);
      setActiveBhw(activeShift ? activeShift.workerName : null);
      
      const att = localStorage.getItem("bhw_attendance_logs");
      setAttendanceLogs(att ? JSON.parse(att) : []);
      const act = localStorage.getItem("bhw_activity_logs");
      if (act) {
        try {
          const parsed = JSON.parse(act);
          const cleaned = Array.isArray(parsed) ? parsed.filter((l: any) => !isAuthOrAttendanceLog(l)) : [];
          if (cleaned.length !== parsed.length) {
            localStorage.setItem("bhw_activity_logs", JSON.stringify(cleaned));
          }
          setActivityLogs(cleaned);
        } catch {
          setActivityLogs([]);
        }
      } else {
        setActivityLogs([]);
      }
    };

    updateBhwState();

    // BroadcastChannel for instant real-time synchronization across all tabs and browser windows
    let bc: BroadcastChannel | null = null;
    if (typeof window !== "undefined" && "BroadcastChannel" in window) {
      try {
        bc = new BroadcastChannel("bhw_attendance_channel");
        bc.onmessage = () => {
          updateBhwState();
        };
      } catch {}
    }

    window.addEventListener("bhw-attendance-updated", updateBhwState);
    window.addEventListener("bhw-db-updated", updateBhwState);
    window.addEventListener("bhw-activity-updated", updateBhwState);
    window.addEventListener("storage", updateBhwState);

    return () => {
      if (bc) bc.close();
      window.removeEventListener("bhw-attendance-updated", updateBhwState);
      window.removeEventListener("bhw-db-updated", updateBhwState);
      window.removeEventListener("bhw-activity-updated", updateBhwState);
      window.removeEventListener("storage", updateBhwState);
    };
  }, [user, logsDialogOpen, activityLogsDialogOpen]);

  // Load dynamic workers list from database to ensure all registered workers are present
  useEffect(() => {
    const fetchWorkers = async () => {
      try {
        const { data } = await (supabase.from as any)("bhw_workers").select("*").order("name");
        if (data && data.length > 0) {
          const mapped = data.map((w: any) => ({
            name: w.name,
            phone: w.number || w.gmail || "—",
            role: (w.gmail || "").toLowerCase().includes("cristeta") || (w.name || "").toLowerCase().includes("cristeta")
              ? "supervisor"
              : (w.gmail || "").toLowerCase().includes("maryjane") || (w.name || "").toLowerCase().includes("mary jane")
              ? "midwife"
              : (w.gmail || "").toLowerCase().includes("bns")
              ? "bns"
              : "worker",
            sitio: w.assigned_sitio || w.address || "Subukin",
            is_online: w.is_online,
          }));
          setWorkersList(mapped);
        }
      } catch {}
    };
    fetchWorkers();
    window.addEventListener("bhw-db-updated", fetchWorkers);
    return () => window.removeEventListener("bhw-db-updated", fetchWorkers);
  }, []);

  useEffect(() => {
    const checkUpcomingEvents = () => {
      try {
        const storedEvents = localStorage.getItem("subukin_calendar_events");
        const storedRead = localStorage.getItem("subukin_read_events");
        const readIds: string[] = storedRead ? JSON.parse(storedRead) : [];
        
        if (!storedEvents) {
          setShowAlertBadge(false);
          return;
        }
        const events = JSON.parse(storedEvents);
        if (!Array.isArray(events)) {
          setShowAlertBadge(false);
          return;
        }
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        let hasUnread = false;

        events.forEach((event: any) => {
          if (event.status !== "scheduled" && event.status !== "rescheduled") {
            return;
          }
          
          const eventDate = new Date(event.date);
          eventDate.setHours(0, 0, 0, 0);

          const diffTime = eventDate.getTime() - today.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

          // Alert triggers if the event starts in the next 3 days (0 to 3 days) and has not been marked as read
          if (diffDays >= 0 && diffDays <= 3) {
            if (!readIds.includes(event.id)) {
              hasUnread = true;
            }
          }
        });

        setShowAlertBadge(hasUnread);
      } catch (e) {
        console.error("Error checking upcoming events:", e);
        setShowAlertBadge(false);
      }
    };

    checkUpcomingEvents();
    const interval = setInterval(checkUpcomingEvents, 10000);

    const handleEventsUpdate = () => checkUpcomingEvents();
    window.addEventListener("calendar-events-updated", handleEventsUpdate);
    window.addEventListener("storage", handleEventsUpdate);

    return () => {
      clearInterval(interval);
      window.removeEventListener("calendar-events-updated", handleEventsUpdate);
      window.removeEventListener("storage", handleEventsUpdate);
    };
  }, []);

  useEffect(() => {
    if (user && !activeBhw && !noticeDismissed && !isMidwife) {
      const timer = setTimeout(() => setAttendanceNoticeOpen(true), 400);
      return () => clearTimeout(timer);
    }
  }, [user, activeBhw, noticeDismissed, isMidwife]);

  useEffect(() => {
    if (workerDisplayName) {
      setSelectedWorker({
        name: workerDisplayName,
        role: userRole === "supervisor" ? "supervisor" : userRole === "supervisory" ? "supervisory" : userRole === "bns" ? "bns" : "worker",
        phone: user?.email ?? "—"
      });
    }
  }, [workerDisplayName, userRole, logsDialogOpen]);

  useEffect(() => {
    if (!activeBhw || !user) {
      setSessionDuration("00:00:00");
      return;
    }

    const timer = setInterval(() => {
      try {
        const activeShift = getActiveBhwShift(user);
        if (activeShift?.loginAt) {
          const diffMs = new Date().getTime() - new Date(activeShift.loginAt).getTime();
          const hrs = String(Math.floor(diffMs / 3600000)).padStart(2, "0");
          const mins = String(Math.floor((diffMs % 3600000) / 60000)).padStart(2, "0");
          const secs = String(Math.floor((diffMs % 60000) / 1000)).padStart(2, "0");
          setSessionDuration(`${hrs}:${mins}:${secs}`);
          return;
        }

        const storedLogs = localStorage.getItem("bhw_attendance_logs");
        if (!storedLogs) return;
        const logs = JSON.parse(storedLogs);
        const activeLog = logs.find((l: any) =>
          !l.logoutAt &&
          ((l.userId && l.userId === user.id) || l.workerName === activeBhw)
        );
        if (activeLog) {
          const diffMs = new Date().getTime() - new Date(activeLog.loginAt).getTime();
          const hrs = String(Math.floor(diffMs / 3600000)).padStart(2, "0");
          const mins = String(Math.floor((diffMs % 3600000) / 60000)).padStart(2, "0");
          const secs = String(Math.floor((diffMs % 60000) / 1000)).padStart(2, "0");
          setSessionDuration(`${hrs}:${mins}:${secs}`);
        }
      } catch (e) {
        console.error(e);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [activeBhw, user]);

  const getWorkerAttendance = (workerName: string) => {
    const cleanWorkerName = (workerName || "").toLowerCase().trim();
    return attendanceLogs
      .filter((l: any) => {
        const logWorker = (l.workerName || "").toLowerCase().trim();
        const logEmail = (l.userEmail || "").toLowerCase().trim();
        const logUserId = l.userId;
        const currentUid = user?.id;

        if (logUserId && currentUid && logUserId === currentUid && workerName === workerDisplayName) {
          return true;
        }
        return logWorker === cleanWorkerName || 
               cleanWorkerName.includes(logWorker) ||
               logWorker.includes(cleanWorkerName.split(" ")[0]);
      })
      .sort((a: any, b: any) => (b.loginAt || "").localeCompare(a.loginAt || ""));
  };

  const formatDuration = (login: Date, logout: Date) => {
    const diffMs = logout.getTime() - login.getTime();
    const hrs = Math.floor(diffMs / 3600000);
    const mins = Math.floor((diffMs % 3600000) / 60000);
    if (hrs > 0) return `${hrs}h ${mins}m`;
    return `${mins}m`;
  };

  const handlePrintAttendance = () => {
    document.body.classList.add("printing-attendance");
    window.print();
    const cleanup = () => {
      document.body.classList.remove("printing-attendance");
      window.removeEventListener("afterprint", cleanup);
    };
    window.addEventListener("afterprint", cleanup);
    setTimeout(cleanup, 2000);
  };

  const handlePrintActivityLogs = () => {
    document.body.classList.add("printing-activity-logs");
    window.print();
    const cleanup = () => {
      document.body.classList.remove("printing-activity-logs");
      window.removeEventListener("afterprint", cleanup);
    };
    window.addEventListener("afterprint", cleanup);
    setTimeout(cleanup, 2000);
  };

  const isAuthOrAttendanceLog = (log: any) => {
    const a = (log?.action || "").toLowerCase();
    const d = (log?.description || "").toLowerCase();
    const c = (log?.actionCategory || "").toUpperCase();
    return (
      a.includes("login") ||
      a.includes("logout") ||
      a.includes("sign-in") ||
      a.includes("sign-out") ||
      a.includes("signin") ||
      a.includes("signout") ||
      a.includes("check-in") ||
      a.includes("check-out") ||
      a.includes("shift") ||
      a.includes("attendance") ||
      c === "ATTENDANCE" ||
      d.includes("signed in") ||
      d.includes("signed out") ||
      d.includes("checked in") ||
      d.includes("checked out")
    );
  };

  const resolveActionCategory = (log: any): "RECORDING" | "EDITING" | "DELETING" | "PRINTING" | "OTHER" => {
    if (log.actionCategory && log.actionCategory !== "ATTENDANCE") return log.actionCategory;
    const a = (log.action || "").toLowerCase();
    const d = (log.description || "").toLowerCase();
    if (a.includes("submit") || a.includes("create") || a.includes("add") || a.includes("record") || d.includes("recorded") || d.includes("added")) {
      return "RECORDING";
    }
    if (a.includes("update") || a.includes("edit") || a.includes("modify") || a.includes("save") || d.includes("updated") || d.includes("edited")) {
      return "EDITING";
    }
    if (a.includes("delete") || a.includes("remove") || d.includes("deleted") || d.includes("removed")) {
      return "DELETING";
    }
    if (a.includes("print") || d.includes("printed") || d.includes("print")) {
      return "PRINTING";
    }
    return "OTHER";
  };

  const availableActivityDates = Array.from(
    new Set(
      activityLogs
        .filter((l: any) => !isAuthOrAttendanceLog(l))
        .map((l: any) => {
          if (l.dateStr) return l.dateStr;
          if (l.timestamp) return new Date(l.timestamp).toISOString().split("T")[0];
          return "";
        })
        .filter(Boolean)
    )
  ).sort().reverse();

  const filteredActivityLogs = activityLogs
    .filter((log: any) => {
      // Do not include user sign-ins and sign-outs in activity logs (they belong in attendance)
      if (isAuthOrAttendanceLog(log)) {
        return false;
      }
      const category = resolveActionCategory(log);
      if (activityCategoryFilter !== "ALL" && category !== activityCategoryFilter) {
        return false;
      }
      const logDate = log.dateStr || (log.timestamp ? new Date(log.timestamp).toISOString().split("T")[0] : "");
      if (activityDateFilter !== "ALL" && logDate !== activityDateFilter) {
        return false;
      }
      if (activitySearchQuery.trim()) {
        const q = activitySearchQuery.toLowerCase().trim();
        const worker = (log.workerName || "").toLowerCase();
        const email = (log.userEmail || "").toLowerCase();
        const desc = (log.description || "").toLowerCase();
        const act = (log.action || "").toLowerCase();
        const dateMatch = logDate.includes(q);
        if (!worker.includes(q) && !email.includes(q) && !desc.includes(q) && !act.includes(q) && !dateMatch) {
          return false;
        }
      }
      return true;
    })
    .sort((a: any, b: any) => {
      const timeA = new Date(a.timestamp || 0).getTime();
      const timeB = new Date(b.timestamp || 0).getTime();
      return timeB - timeA;
    });

  // Group activities by date so there is a single date entry per day
  const groupedActivityLogsByDate = filteredActivityLogs.reduce<Record<string, any[]>>((acc, log: any) => {
    const logDate = log.dateStr || (log.timestamp ? new Date(log.timestamp).toISOString().split("T")[0] : "Undated");
    if (!acc[logDate]) {
      acc[logDate] = [];
    }
    acc[logDate].push(log);
    return acc;
  }, {});

  const sortedDateGroups: [string, any[]][] = Object.entries(groupedActivityLogsByDate).sort(
    ([dateA], [dateB]) => dateB.localeCompare(dateA)
  );

  const formatDateHeader = (dateStr: string) => {
    if (!dateStr || dateStr === "Undated") return "Undated Activities";
    try {
      const [year, month, day] = dateStr.split("-").map(Number);
      if (year && month && day) {
        const d = new Date(year, month - 1, day);
        return d.toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" });
      }
      return dateStr;
    } catch {
      return dateStr;
    }
  };

  const availableAttendanceDates = Array.from(
    new Set(
      attendanceLogs
        .map((l: any) => {
          if (l.dateStr) return l.dateStr;
          if (l.loginAt) {
            const d = new Date(l.loginAt);
            const yr = d.getFullYear();
            const mo = String(d.getMonth() + 1).padStart(2, "0");
            const day = String(d.getDate()).padStart(2, "0");
            return `${yr}-${mo}-${day}`;
          }
          return "";
        })
        .filter(Boolean)
    )
  ).sort().reverse();

  const filteredAttendanceLogs = attendanceLogs
    .filter((log: any) => {
      let loginDateStr = log.dateStr;
      if (!loginDateStr && log.loginAt) {
        const d = new Date(log.loginAt);
        const yr = d.getFullYear();
        const mo = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        loginDateStr = `${yr}-${mo}-${day}`;
      }
      loginDateStr = loginDateStr || "Undated";

      if (attendanceDateFilter !== "ALL" && loginDateStr !== attendanceDateFilter) {
        return false;
      }
      const isCompleted = Boolean(log.logoutAt);
      if (attendanceStatusFilter === "ACTIVE" && isCompleted) {
        return false;
      }
      if (attendanceStatusFilter === "COMPLETED" && !isCompleted) {
        return false;
      }
      if (attendanceWorkerFilter !== "ALL") {
        const wName = (log.workerName || "").toLowerCase().trim();
        const target = attendanceWorkerFilter.toLowerCase().trim();
        if (!wName.includes(target) && !target.includes(wName)) {
          return false;
        }
      }
      if (attendanceSearchQuery.trim()) {
        const q = attendanceSearchQuery.toLowerCase().trim();
        const worker = (log.workerName || "").toLowerCase();
        const email = (log.userEmail || "").toLowerCase();
        const sitio = (log.sitio || "").toLowerCase();
        const dateMatch = loginDateStr.includes(q);
        const statusMatch = (isCompleted ? "completed naka-check out" : "on duty nasa trabaho active").includes(q);
        if (!worker.includes(q) && !email.includes(q) && !sitio.includes(q) && !dateMatch && !statusMatch) {
          return false;
        }
      }
      return true;
    })
    .sort((a: any, b: any) => {
      const timeA = new Date(a.loginAt || 0).getTime();
      const timeB = new Date(b.loginAt || 0).getTime();
      return timeB - timeA;
    });

  // Group attendance by date so there is a single date entry per day (matching activity logs design)
  const groupedAttendanceLogsByDate = filteredAttendanceLogs.reduce<Record<string, any[]>>((acc, log: any) => {
    let logDate = log.dateStr;
    if (!logDate && log.loginAt) {
      const d = new Date(log.loginAt);
      const yr = d.getFullYear();
      const mo = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      logDate = `${yr}-${mo}-${day}`;
    }
    logDate = logDate || "Undated";

    if (!acc[logDate]) {
      acc[logDate] = [];
    }
    acc[logDate].push(log);
    return acc;
  }, {});

  const sortedAttendanceDateGroups: [string, any[]][] = Object.entries(groupedAttendanceLogsByDate).sort(
    ([dateA], [dateB]) => dateB.localeCompare(dateA)
  );

  const [sidebarHeaderHeight, setSidebarHeaderHeight] = useState<number | null>(null);

  useEffect(() => {
    const updateHeight = () => {
      const el = document.querySelector('[data-sidebar="header"]');
      if (el) {
        setSidebarHeaderHeight(el.getBoundingClientRect().height);
      }
    };
    
    updateHeight();
    window.addEventListener("load", updateHeight);
    window.addEventListener("resize", updateHeight);
    
    const timer = setTimeout(updateHeight, 150);
    
    return () => {
      window.removeEventListener("load", updateHeight);
      window.removeEventListener("resize", updateHeight);
      clearTimeout(timer);
    };
  }, []);

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <main className="flex-1 flex flex-col min-h-screen min-w-0">
          <header 
            className="sticky top-0 z-30 flex items-center justify-between gap-4 border-b border-sidebar-border bg-sidebar text-sidebar-foreground px-4 shrink-0"
            style={sidebarHeaderHeight ? { height: `${sidebarHeaderHeight}px` } : { height: "58px" }}
          >
            <div className="flex items-center gap-4">
              <SidebarTrigger className="text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground" />
            </div>

            <div className="flex items-center gap-4 ml-auto">
              <TooltipProvider delayDuration={100}>
                <nav className="flex items-center gap-2">
                  {getHeaderLinks(t).map(({ label, to, Icon, isCalendar }) => {
                    const isAdminMode = userRole === "supervisor";
                    const resolvedTo = isAdminMode ? (to === "/" ? "/admin" : `/admin${to}`) : to;
                    return (
                      <Tooltip key={to}>
                        <TooltipTrigger asChild>
                          <NavLink
                            to={resolvedTo}
                            end
                            className="flex items-center justify-center px-3 py-1.5 rounded-md text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                            activeClassName="bg-sidebar-accent text-sidebar-primary"
                          >
                            <div className="relative">
                              <Icon className="h-5 w-5" aria-label={label} />
                              {isCalendar && showAlertBadge && (
                                <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500 ring-2 ring-sidebar"></span>
                                </span>
                              )}
                            </div>
                          </NavLink>
                        </TooltipTrigger>
                        <TooltipContent>{label}</TooltipContent>
                      </Tooltip>
                    );
                  })}
                </nav>
              </TooltipProvider>

              {!isMidwife && (
                <>
                  <div className="border-l border-sidebar-border h-6 shrink-0" />

                  <Popover>
                    <PopoverTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className={`relative flex items-center gap-2 h-9 rounded-full px-3.5 transition-all shrink-0 ${
                          !activeBhw
                            ? "bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 border border-amber-500/20 animate-pulse" 
                            : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                        }`}
                      >
                        <Fingerprint className={`h-5 w-5 shrink-0 ${!activeBhw ? "text-amber-500 animate-pulse" : "text-primary"}`} />
                        <span className={`text-xs font-semibold ${activeBhw ? "max-w-[150px] truncate" : "whitespace-nowrap"}`}>
                          {activeBhw 
                            ? activeBhw 
                            : userRole === "supervisor" || userRole === "supervisory"
                            ? (language === "tl" ? "Supervisory Clock In" : "Supervisory Clock In")
                            : (language === "tl" ? "Mag-Clock In" : "Clock In")}
                        </span>
                        {activeBhw && (
                          <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-green-500 border-2 border-background animate-pulse" />
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent align="end" className="w-80 p-4 border border-border/50 bg-popover shadow-xl rounded-lg z-50 space-y-4">
                      {(userRole === "bhw" || userRole === "bns" || userRole === "BNS" || userRole === "supervisor" || userRole === "supervisory") && (
                        <>
                          <div className="space-y-1">
                            <h4 className="font-heading font-semibold text-sm text-foreground flex items-center gap-1.5">
                              <Fingerprint className="h-4 w-4 text-primary" />
                              {userRole === "supervisor" || userRole === "supervisory"
                                ? (language === "tl" ? "Aktibong Shift ng BHW Supervisory" : "BHW Supervisory Active Shift") 
                                : userRole === "bns" 
                                ? (language === "tl" ? "Aktibong Shift ng BNS Scholar" : "BNS Scholar Active Shift") 
                                : (language === "tl" ? "Aktibong Shift ng BHW" : "BHW Active Shift")}
                            </h4>
                            <p className="text-xs text-muted-foreground">
                              {language === "tl" ? "Tagasubaybay ng shift gamit ang aktibong profile: " : "Shift tracker using your active login profile: "}<span className="font-bold text-foreground">{workerDisplayName}</span>.
                            </p>
                          </div>

                          {activeBhw ? (
                            <div className="p-3 bg-muted/40 border border-border/30 rounded-lg space-y-2 text-xs">
                              <p className="text-foreground">
                                {language === "tl" ? "Aktibong Shift: " : "Active Shift: "}<strong>{activeBhw}</strong>
                              </p>
                              <p className="text-muted-foreground flex items-center gap-1">
                                <Clock className="h-3 w-3 text-primary/75" />
                                {language === "tl" ? "Tagal ng shift: " : "Shift duration: "}<span className="font-mono text-primary font-semibold">{sessionDuration}</span>
                              </p>
                              <Button 
                                variant="destructive" 
                                size="sm" 
                                className="w-full text-xs h-8 mt-1 gap-1 font-semibold"
                                onClick={() => {
                                  bhwCheckOut({ userId: user?.id, userEmail: user?.email });
                                  toast.success(language === "tl" ? "Matagumpay na natapos ang shift!" : "Shift ended successfully!");
                                }}
                              >
                                <LogOut className="h-3.5 w-3.5" /> {language === "tl" ? "Tapusin ang Shift / Mag-Check Out" : "End Shift / Check Out"}
                              </Button>
                            </div>
                          ) : (
                            <div className="space-y-3">
                              <div className="p-3 bg-muted/20 border border-border/10 rounded-lg space-y-1">
                                <p className="text-xs text-muted-foreground">{language === "tl" ? "Naka-log in na User Profile:" : "Logged In User Profile:"}</p>
                                <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                                  <User className="h-3.5 w-3.5 text-primary" /> {workerDisplayName}
                                </p>
                              </div>
                              <Button 
                                size="sm" 
                                className="w-full text-xs h-8 gap-1.5 font-semibold"
                                onClick={() => {
                                  bhwCheckIn(workerDisplayName, { userId: user?.id, userEmail: user?.email });
                                  toast.success(language === "tl" ? `Maligayang pagdating, ${workerDisplayName}! Nagsimula na ang iyong shift.` : `Welcome, ${workerDisplayName}! Shift started.`);
                                }}
                              >
                                <UserCheck className="h-3.5 w-3.5" /> {language === "tl" ? "Mag-Clock In / Simulan ang Shift" : "Clock In / Start Shift"}
                              </Button>
                            </div>
                          )}
                        </>
                      )}

                      <div className="border-t border-border/30 pt-3 space-y-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="w-full text-xs h-8 gap-1.5 font-semibold"
                          onClick={() => {
                            setLogsDialogOpen(true);
                          }}
                        >
                          <List className="h-3.5 w-3.5" /> {language === "tl" ? "Tingnan ang Attendance" : "View Attendance"}
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="w-full text-xs h-8 gap-1.5 font-semibold text-primary border-primary/30 hover:bg-primary/10"
                          onClick={() => {
                            setActivityLogsDialogOpen(true);
                          }}
                        >
                          <History className="h-3.5 w-3.5" /> {language === "tl" ? "Tingnan ang Activity Logs" : "View Activity Logs"}
                        </Button>
                      </div>
                    </PopoverContent>
                  </Popover>
                </>
              )}
            </div>
          </header>

          <div className="flex-1 p-6 animate-fade-in space-y-6 min-w-0 max-w-full">
            {!activeBhw && user && !isMidwife && (
              <div className="p-4 rounded-xl border border-amber-500/40 bg-gradient-to-r from-amber-500/15 via-amber-500/10 to-amber-500/5 shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4 animate-bounce-subtle">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 mt-0.5 animate-pulse">
                    <Fingerprint className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="font-heading font-bold text-sm text-foreground flex items-center gap-2 flex-wrap">
                      <span>{t("attendance.noticeTitle")}</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide bg-amber-500 text-white animate-pulse">
                        {language === "tl" ? "KAILANGAN ANG ATTENDANCE" : "ATTENDANCE REQUIRED"}
                      </span>
                    </h4>
                    <p className="text-xs text-muted-foreground mt-1 max-w-2xl leading-relaxed">
                      {t("attendance.noticeDesc")}
                    </p>
                  </div>
                </div>

                <Button
                  size="sm"
                  className="bg-amber-600 hover:bg-amber-700 text-white font-bold px-4 py-2 text-xs shadow-md shrink-0 gap-2 w-full md:w-auto"
                  onClick={() => {
                    bhwCheckIn(workerDisplayName, { userId: user?.id, userEmail: user?.email });
                    toast.success(language === "tl" ? `Maligayang pagdating, ${workerDisplayName}! Naka-check in ka na sa attendance ngayong araw.` : `Welcome, ${workerDisplayName}! You are now checked in for today's attendance.`);
                    setAttendanceNoticeOpen(false);
                    setNoticeDismissed(true);
                  }}
                >
                  <UserCheck className="h-4 w-4" />
                  {t("attendance.clockInNow")}
                </Button>
              </div>
            )}

            {children}
          </div>
        </main>
      </div>      {/* Attendance Logs Dialog - Styled identically to Activity Logs */}
      <Dialog open={logsDialogOpen} onOpenChange={setLogsDialogOpen}>
        <DialogContent 
          className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col p-6 rounded-xl border border-slate-300 bg-white text-black shadow-2xl"
          style={{ color: "#000000" }}
        >
          <DialogHeader className="pb-4 border-b border-slate-300">
            <div>
              <DialogTitle className="text-xl font-heading font-extrabold flex items-center gap-2 text-black">
                <Clock className="h-5 w-5 text-black" />
                {language === "tl" ? "Talaan ng Attendance sa Sistema (Attendance Logs)" : "System Attendance Logs"}
              </DialogTitle>
              <DialogDescription className="text-xs text-black font-medium mt-1">
                {language === "tl"
                  ? "Opisyal na talaan ng oras ng pagpasok (Time In) at paglabas (Time Out) ng mga kawani sa kalusugan ng Barangay Subukin."
                  : "Official attendance log tracking Time In and Time Out records with timestamps, duty shifts, and personnel details."}
              </DialogDescription>
            </div>
          </DialogHeader>

          {/* Filters & Search Toolbar */}
          <div className="pt-3 pb-1 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 text-black">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-black" />
              <Input
                placeholder={language === "tl" ? "Maghanap ayon sa kawani, email, oras o katayuan..." : "Search by personnel, email, time, or status..."}
                value={attendanceSearchQuery}
                onChange={(e) => setAttendanceSearchQuery(e.target.value)}
                className="pl-9 h-9 text-xs text-black font-medium placeholder:text-black/60 border-slate-400 bg-slate-50/70"
              />
              {attendanceSearchQuery && (
                <button
                  onClick={() => setAttendanceSearchQuery("")}
                  className="absolute right-2.5 top-2.5 text-xs text-black hover:font-bold"
                >
                  ×
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0 flex-wrap">
              {/* Personnel Filter */}
              <Select value={attendanceWorkerFilter} onValueChange={setAttendanceWorkerFilter}>
                <SelectTrigger className="h-9 w-[160px] text-xs text-black font-semibold border-slate-400 bg-slate-50/70">
                  <SelectValue placeholder="Personnel" />
                </SelectTrigger>
                <SelectContent className="text-black">
                  <SelectItem value="ALL">{language === "tl" ? "Lahat ng Kawani" : "All Personnel"}</SelectItem>
                  {workersList.map((w: any) => (
                    <SelectItem key={w.name} value={w.name}>
                      {w.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Status Filter */}
              <Select value={attendanceStatusFilter} onValueChange={setAttendanceStatusFilter}>
                <SelectTrigger className="h-9 w-[140px] text-xs text-black font-semibold border-slate-400 bg-slate-50/70">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent className="text-black">
                  <SelectItem value="ALL">{language === "tl" ? "Lahat ng Katayuan" : "All Status"}</SelectItem>
                  <SelectItem value="ACTIVE">{language === "tl" ? "Nasa Trabaho (On Duty)" : "On Duty (Active)"}</SelectItem>
                  <SelectItem value="COMPLETED">{language === "tl" ? "Naka-Check Out" : "Completed Shift"}</SelectItem>
                </SelectContent>
              </Select>

              {/* Date Filter */}
              <Select value={attendanceDateFilter} onValueChange={setAttendanceDateFilter}>
                <SelectTrigger className="h-9 w-[130px] text-xs text-black font-semibold border-slate-400 bg-slate-50/70">
                  <SelectValue placeholder="Filter Date" />
                </SelectTrigger>
                <SelectContent className="text-black">
                  <SelectItem value="ALL">{language === "tl" ? "Lahat ng Petsa" : "All Dates"}</SelectItem>
                  {availableAttendanceDates.map((dateStr) => (
                    <SelectItem key={dateStr} value={dateStr}>
                      {dateStr}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Attendance Logs Count Summary */}
          <div className="flex items-center justify-between text-[11px] text-black font-semibold px-0.5">
            <span>
              {language === "tl" ? "Kabuuang mga tala: " : "Showing: "}
              <strong className="text-black font-extrabold">{filteredAttendanceLogs.length}</strong>
              {language === "tl" ? " attendance log(s) sa " : " attendance log(s) across "}
              <strong className="text-black font-extrabold">{sortedAttendanceDateGroups.length}</strong>
              {language === "tl" ? " araw" : " day(s)"}
            </span>
            {(attendanceSearchQuery || attendanceStatusFilter !== "ALL" || attendanceDateFilter !== "ALL" || attendanceWorkerFilter !== "ALL") && (
              <button
                onClick={() => {
                  setAttendanceSearchQuery("");
                  setAttendanceStatusFilter("ALL");
                  setAttendanceDateFilter("ALL");
                  setAttendanceWorkerFilter("ALL");
                }}
                className="text-black underline font-bold hover:opacity-80"
              >
                {language === "tl" ? "I-reset ang mga filter" : "Reset filters"}
              </button>
            )}
          </div>

          {/* Attendance Logs Table */}
          <div className="flex-1 min-h-0 border-2 border-slate-300 rounded-xl overflow-hidden bg-white flex flex-col mt-2 shadow-xs">
            <div className="overflow-y-auto flex-1 text-black">
              <table className="w-full text-left text-xs border-collapse text-black" style={{ color: "#000000" }}>
                <thead className="sticky top-0 z-10 bg-slate-100 border-b-2 border-slate-400 font-extrabold text-black">
                  <tr>
                    <th className="p-3 w-12 text-center text-black font-extrabold">#</th>
                    <th className="p-3 w-36 text-black font-extrabold">{language === "tl" ? "Oras (Timestamp)" : "Time"}</th>
                    <th className="p-3 w-40 text-black font-extrabold">{language === "tl" ? "Katayuan" : "Status"}</th>
                    <th className="p-3 w-48 text-black font-extrabold">{language === "tl" ? "Sino ang Kawani" : "Performed By"}</th>
                    <th className="p-3 text-black font-extrabold">{language === "tl" ? "Mga Detalye / Shift" : "Details / Description"}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-300 text-black">
                  {sortedAttendanceDateGroups.length > 0 ? (
                    sortedAttendanceDateGroups.map(([dateKey, dayLogs]: [string, any[]], groupIdx: number) => (
                      <React.Fragment key={dateKey || groupIdx}>
                        {/* Single Date Header Entry for all attendance records on this day */}
                        <tr className="bg-slate-200/90 text-black border-y-2 border-slate-400 font-bold">
                          <td colSpan={5} className="py-2.5 px-4 text-black font-bold text-xs">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2 text-black font-extrabold text-xs tracking-wide">
                                <CalendarDays className="h-4 w-4 text-black shrink-0" />
                                <span className="text-black uppercase">{formatDateHeader(dateKey)}</span>
                                <span className="font-mono text-[11px] font-bold text-black/90">[{dateKey}]</span>
                              </div>
                              <span className="text-[11px] font-bold text-black bg-white px-2.5 py-0.5 rounded-full border border-slate-400 shadow-2xs">
                                {dayLogs.length} {language === "tl" ? "na attendance record sa araw na ito" : "attendance record(s) on this date"}
                              </span>
                            </div>
                          </td>
                        </tr>

                        {/* Attendance records performed on this single date */}
                        {dayLogs.map((log: any, idx: number) => {
                          const loginDate = log.loginAt ? new Date(log.loginAt) : new Date();
                          const loginDisplay = loginDate.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" });
                          const logoutDisplay = log.logoutAt
                            ? new Date(log.logoutAt).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" })
                            : null;
                          const durationStr = log.logoutAt
                            ? formatDuration(new Date(log.loginAt), new Date(log.logoutAt))
                            : (language === "tl" ? "Aktibong Shift" : "Active Shift");
                          const isCompleted = !!log.logoutAt;

                          return (
                            <tr key={log.id || `${dateKey}-${idx}`} className="hover:bg-slate-50 text-black transition-colors border-b border-slate-200">
                              <td className="p-3 text-center font-mono text-[11px] font-bold text-black">
                                {idx + 1}
                              </td>
                              <td className="p-3 whitespace-nowrap text-black font-mono font-bold">
                                <div className="flex items-center gap-1.5 text-black">
                                  <Clock className="h-3.5 w-3.5 text-black shrink-0" />
                                  <span className="font-bold text-black text-xs">{loginDisplay}</span>
                                </div>
                              </td>
                              <td className="p-3 whitespace-nowrap text-black">
                                {isCompleted ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-100 text-blue-900 border border-blue-400">
                                    <CheckCircle2 className="h-3 w-3 text-blue-900" />
                                    {language === "tl" ? "Naka-Check Out" : "Completed Shift"}
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-400">
                                    <span className="h-2 w-2 rounded-full bg-emerald-600 animate-pulse" />
                                    {language === "tl" ? "Nasa Trabaho" : "On Duty (Active)"}
                                  </span>
                                )}
                              </td>
                              <td className="p-3 text-black">
                                <div className="font-bold text-black text-xs flex items-center gap-1.5">
                                  <User className="h-3.5 w-3.5 text-black shrink-0" />
                                  <span className="truncate max-w-[160px] text-black font-extrabold">{log.workerName || "BHW Staff"}</span>
                                </div>
                                {(log.userEmail || log.sitio) && (
                                  <div className="text-[10px] text-black font-medium truncate max-w-[160px] mt-0.5">
                                    {log.userEmail || log.sitio}
                                  </div>
                                )}
                              </td>
                              <td className="p-3 text-black">
                                {isCompleted ? (
                                  <>
                                    <p className="font-semibold text-black text-xs leading-relaxed">
                                      {language === "tl"
                                        ? `Natapos ang shift • Time Out: ${logoutDisplay} (Kabuuang tagal: ${durationStr})`
                                        : `Completed duty shift • Time Out: ${logoutDisplay} (Total duration: ${durationStr})`}
                                    </p>
                                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                      <span className="inline-block text-[10px] font-mono font-bold uppercase px-1.5 py-0.5 rounded bg-slate-200 text-black border border-slate-400">
                                        DURATION: {durationStr}
                                      </span>
                                      <span className="inline-block text-[10px] font-mono font-bold uppercase px-1.5 py-0.5 rounded bg-slate-200 text-black border border-slate-400">
                                        STATION: {log.sitio || "BARANGAY SUBKIN HEALTH CENTER"}
                                      </span>
                                    </div>
                                  </>
                                ) : (
                                  <>
                                    <p className="font-semibold text-black text-xs leading-relaxed">
                                      {language === "tl"
                                        ? `Kasalukuyang naka-duty sa Barangay • Nagsimula noong ${loginDisplay}`
                                        : `Currently on active duty shift • Clocked in at ${loginDisplay}`}
                                    </p>
                                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                      <span className="inline-block text-[10px] font-mono font-bold uppercase px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-900 border border-emerald-400">
                                        ACTIVE SHIFT
                                      </span>
                                      <span className="inline-block text-[10px] font-mono font-bold uppercase px-1.5 py-0.5 rounded bg-slate-200 text-black border border-slate-400">
                                        STATION: {log.sitio || "BARANGAY SUBKIN HEALTH CENTER"}
                                      </span>
                                    </div>
                                  </>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </React.Fragment>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="p-10 text-center text-black">
                        <Clock className="h-10 w-10 text-black mx-auto mb-2 opacity-60" />
                        <p className="text-sm font-bold text-black">
                          {language === "tl" ? "Walang nahanap na tala ng attendance." : "No attendance logs match your criteria."}
                        </p>
                        <p className="text-xs text-black font-medium mt-1">
                          {language === "tl" ? "Subukang baguhin ang iyong mga filter o keyword sa paghahanap." : "Try adjusting your filters or search keywords."}
                        </p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <DialogFooter className="pt-4 border-t border-slate-300 mt-4 shrink-0 flex items-center justify-between gap-3 text-black">
            <div className="flex items-center gap-2">
              <Button
                onClick={handlePrintAttendance}
                size="sm"
                className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs shadow-sm"
              >
                <Printer className="h-4 w-4" />
                {language === "tl" ? "I-print ang Attendance Logs" : "Print Attendance Logs"}
              </Button>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setLogsDialogOpen(false)} 
              className="text-black font-bold border-slate-400"
            >
              {language === "tl" ? "Isara" : "Close"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Attendance Check-In Notice Popup Dialog */}
      <Dialog open={attendanceNoticeOpen && !isMidwife} onOpenChange={setAttendanceNoticeOpen}>
        <DialogContent className="max-w-md bg-card border-2 border-amber-500/50 shadow-2xl p-6 rounded-2xl">
          <DialogHeader className="text-center sm:text-left space-y-2">
            <div className="mx-auto sm:mx-0 h-12 w-12 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center animate-pulse">
              <Fingerprint className="h-6 w-6" />
            </div>
            <DialogTitle className="text-lg font-heading font-bold text-foreground">
              {t("attendance.noticeTitle")}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
              {t("attendance.noticeDesc")}
            </DialogDescription>
          </DialogHeader>

          <div className="p-3 bg-amber-500/10 border border-amber-500/25 rounded-xl text-xs text-amber-800 dark:text-amber-300 font-medium space-y-1">
            <p className="flex items-center gap-1.5 font-bold">
              <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
              {language === "tl" ? "Babala sa Attendance:" : "Attendance Warning:"}
            </p>
            <p className="text-[11px] leading-normal opacity-90">
              {language === "tl" 
                ? <>Nagsisilbi ang check-in bilang opisyal na tala ng iyong pang-araw-araw na attendance. Ang hindi pag-check in ay nangangahulugang hindi maire-record ang iyong <strong>oras ng pagpasok ("In" time)</strong>.</>
                : <>Check-in serves as your official daily attendance log. Failing to check in now means your <strong>"In" time</strong> will not be recorded.</>}
            </p>
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-2 pt-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setNoticeDismissed(true);
                setAttendanceNoticeOpen(false);
              }}
              className="text-xs"
            >
              {t("attendance.remindLater")}
            </Button>
            <Button
              size="sm"
              onClick={() => {
                bhwCheckIn(workerDisplayName, { userId: user?.id, userEmail: user?.email });
                toast.success(language === "tl" ? `Maligayang pagdating, ${workerDisplayName}! Naka-check in ka na sa attendance ngayong araw.` : `Welcome, ${workerDisplayName}! You are now checked in.`);
                setNoticeDismissed(true);
                setAttendanceNoticeOpen(false);
              }}
              className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs gap-1.5 shadow-md"
            >
              <UserCheck className="h-4 w-4" />
              {t("attendance.clockInNow")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Printable Official Attendance Record - patterned after AdminWorkers supervisor print */}
       {logsDialogOpen && (
        <div id="attendance-print-area" className="hidden print:block text-black bg-white w-full mx-auto p-0 m-0">
          <style>{`
            @media print {
              body:not(.printing-attendance) #attendance-print-area {
                display: none !important;
                visibility: hidden !important;
              }
              body.printing-attendance * {
                visibility: hidden !important;
              }
              body.printing-attendance #attendance-print-area,
              body.printing-attendance #attendance-print-area * {
                visibility: visible !important;
              }
              body.printing-attendance #attendance-print-area {
                position: absolute !important;
                left: 0 !important;
                top: 0 !important;
                width: 100% !important;
                background: white !important;
                padding: 20px !important;
                margin: 0 !important;
                box-shadow: none !important;
                border: none !important;
                color: black !important;
                display: block !important;
                box-sizing: border-box !important;
              }
              body.printing-attendance #attendance-print-area .header-seal img {
                height: 130px !important;
                mix-blend-mode: multiply !important;
              }
              @page {
                size: A4 portrait;
                margin: 6mm;
              }
            }
          `}</style>

          {/* Official Header with logos and letterhead */}
          <div style={{ width: "100%", marginBottom: "12px" }}>
            <OfficialHeader
              title={language === "tl" ? "BARANGAY HEALTH WORKERS OPISYAL NA TALAAN NG ATTENDANCE" : "BARANGAY HEALTH WORKERS OFFICIAL ATTENDANCE RECORD"}
              subtitle={language === "tl" ? "Barangay Subukin Health Center, San Juan, Batangas • Opisyal na Talaan ng Oras ng Pagpasok at Paglabas" : "Barangay Subukin Health Center, San Juan, Batangas • Official Time In & Time Out Record"}
              showDoubleBorder={true}
              logoHeight="130px"
            />
          </div>

          {/* Worker Summary Box */}
          <div style={{ width: "100%", border: "1px solid #000", padding: "8px 10px", marginBottom: "10px", fontSize: "12px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", boxSizing: "border-box", background: "#f8fafc" }}>
            <div>
              <p style={{ margin: "2px 0" }}>
                <span style={{ fontWeight: "bold", textTransform: "uppercase", fontSize: "11px" }}>Personnel Filter:</span>{" "}
                <span style={{ fontWeight: "bold", fontSize: "13px" }}>{attendanceWorkerFilter === "ALL" ? "All Registered Personnel (Lahat ng Kawani)" : attendanceWorkerFilter}</span>
              </p>
              <p style={{ margin: "2px 0" }}>
                <span style={{ fontWeight: "bold", textTransform: "uppercase", fontSize: "11px" }}>Station:</span>{" "}
                <span style={{ fontWeight: "600" }}>Barangay Subukin Health Center • San Juan, Batangas</span>
              </p>
              <p style={{ margin: "2px 0" }}>
                <span style={{ fontWeight: "bold", textTransform: "uppercase", fontSize: "11px" }}>Total Records:</span>{" "}
                <span style={{ fontWeight: "600" }}>{filteredAttendanceLogs.length} attendance record(s) across {sortedAttendanceDateGroups.length} day(s)</span>
              </p>
            </div>
            <div style={{ textAlign: "right" }}>
              <p style={{ margin: "2px 0" }}><span style={{ fontWeight: "bold", textTransform: "uppercase", fontSize: "11px" }}>Document Type:</span> <span style={{ fontWeight: "600" }}>Official Attendance Log & Shift Tracker</span></p>
              <p style={{ margin: "2px 0" }}><span style={{ fontWeight: "bold", textTransform: "uppercase", fontSize: "11px" }}>Date Generated:</span> <span style={{ fontWeight: "600" }}>{new Date().toLocaleDateString(undefined, { dateStyle: "medium" })} {new Date().toLocaleTimeString(undefined, { timeStyle: "short" })}</span></p>
              <p style={{ margin: "2px 0" }}><span style={{ fontWeight: "bold", textTransform: "uppercase", fontSize: "11px" }}>Status Filter:</span> <span style={{ fontWeight: "600" }}>{attendanceStatusFilter === "ALL" ? "All Shifts" : attendanceStatusFilter === "ACTIVE" ? "Active / On Duty" : "Completed Shifts"}</span></p>
            </div>
          </div>

          {/* Official Attendance Log Table */}
          <div style={{ width: "100%", marginBottom: "12px" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px", tableLayout: "fixed", color: "#000" }}>
              <thead>
                <tr style={{ background: "#f1f5f9", borderBottom: "2px solid #000" }}>
                  <th style={{ border: "1px solid #000", padding: "6px 8px", textAlign: "center", textTransform: "uppercase", fontWeight: "bold", width: "5%" }}>#</th>
                  <th style={{ border: "1px solid #000", padding: "6px 8px", textAlign: "center", textTransform: "uppercase", fontWeight: "bold", width: "16%" }}>Time In</th>
                  <th style={{ border: "1px solid #000", padding: "6px 8px", textAlign: "center", textTransform: "uppercase", fontWeight: "bold", width: "16%" }}>Time Out</th>
                  <th style={{ border: "1px solid #000", padding: "6px 8px", textAlign: "center", textTransform: "uppercase", fontWeight: "bold", width: "15%" }}>Status</th>
                  <th style={{ border: "1px solid #000", padding: "6px 8px", textAlign: "left", textTransform: "uppercase", fontWeight: "bold", width: "30%" }}>Personnel</th>
                  <th style={{ border: "1px solid #000", padding: "6px 8px", textAlign: "center", textTransform: "uppercase", fontWeight: "bold", width: "18%" }}>Duration</th>
                </tr>
              </thead>
              <tbody>
                {sortedAttendanceDateGroups.length > 0 ? (
                  sortedAttendanceDateGroups.map(([dateKey, dayLogs]: [string, any[]], groupIdx: number) => (
                    <React.Fragment key={dateKey || groupIdx}>
                      <tr style={{ background: "#e2e8f0", borderTop: "2px solid #000", borderBottom: "1px solid #000" }}>
                        <td colSpan={6} style={{ border: "1px solid #000", padding: "6px 10px", fontWeight: "bold", textTransform: "uppercase", fontSize: "11px" }}>
                          DATE: {formatDateHeader(dateKey)} [{dateKey}] • ({dayLogs.length} attendance records)
                        </td>
                      </tr>
                      {dayLogs.map((log: any, idx: number) => {
                        const loginDate = log.loginAt ? new Date(log.loginAt) : new Date();
                        const tIn = loginDate.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" });
                        const tOut = log.logoutAt ? new Date(log.logoutAt).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "— (Active)";
                        const durationStr = log.logoutAt
                          ? formatDuration(new Date(log.loginAt), new Date(log.logoutAt))
                          : "Active Shift";
                        return (
                          <tr key={log.id || idx} style={{ borderBottom: "1px solid #000" }}>
                            <td style={{ border: "1px solid #000", padding: "6px 8px", textAlign: "center", fontFamily: "monospace", fontWeight: "bold" }}>{idx + 1}</td>
                            <td style={{ border: "1px solid #000", padding: "6px 8px", textAlign: "center", fontFamily: "monospace", fontWeight: "bold" }}>{tIn}</td>
                            <td style={{ border: "1px solid #000", padding: "6px 8px", textAlign: "center", fontFamily: "monospace", fontWeight: "bold" }}>{tOut}</td>
                            <td style={{ border: "1px solid #000", padding: "6px 8px", textAlign: "center", fontWeight: "bold" }}>{log.logoutAt ? "Completed" : "On Duty"}</td>
                            <td style={{ border: "1px solid #000", padding: "6px 8px", fontWeight: "bold" }}>{log.workerName || "BHW Staff"}</td>
                            <td style={{ border: "1px solid #000", padding: "6px 8px", textAlign: "center", fontFamily: "monospace", fontWeight: "bold" }}>{durationStr}</td>
                          </tr>
                        );
                      })}
                    </React.Fragment>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} style={{ border: "1px solid #000", padding: "14px", textAlign: "center", fontStyle: "italic" }}>
                      No attendance records found for this period.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Official Certification and Sign-offs */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "48px", paddingTop: "16px", marginTop: "12px", fontSize: "12px", width: "100%" }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ borderBottom: "1px solid #000", width: "60%", margin: "0 auto", paddingBottom: "4px", fontWeight: "bold", fontSize: "13px", textTransform: "uppercase" }}>
                {selectedWorker?.name || "BHW Personnel"}
              </div>
              <p style={{ marginTop: "4px", fontSize: "11px", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "0.05em" }}>Signature over Printed Name / Personnel</p>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ borderBottom: "1px solid #000", width: "60%", margin: "0 auto", paddingBottom: "4px", fontWeight: "bold", fontSize: "13px", textTransform: "uppercase" }}>
                MARY JANE LANDICHO
              </div>
              <p style={{ marginTop: "4px", fontSize: "11px", fontWeight: "bold", textTransform: "uppercase", letterSpacing: "0.05em" }}>Barangay Midwife / Certified Correct</p>
            </div>
          </div>
        </div>
      )}

      {/* Activity Logs Dialog */}
      <Dialog open={activityLogsDialogOpen} onOpenChange={setActivityLogsDialogOpen}>
        <DialogContent 
          className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col p-6 rounded-xl border border-slate-300 bg-white text-black shadow-2xl"
          style={{ color: "#000000" }}
        >
          <DialogHeader className="pb-4 border-b border-slate-300">
            <div>
              <DialogTitle className="text-xl font-heading font-extrabold flex items-center gap-2 text-black">
                <History className="h-5 w-5 text-black" />
                {language === "tl" ? "Talaan ng mga Gawain sa Sistema (Activity Logs)" : "System Activity Logs"}
              </DialogTitle>
              <DialogDescription className="text-xs text-black font-medium mt-1">
                {language === "tl"
                  ? "Opisyal na talaan ng mga aksyon sa sistema (pagtatala ng datos, pag-edit, pagbura, at pag-print) kasama ang oras at kung sinong gumawa ng bawat gawain."
                  : "Official activity log tracking data recording, editing, deleting, and printing operations with timestamps and responsible users."}
              </DialogDescription>
            </div>
          </DialogHeader>

          {/* Filters & Search Toolbar */}
          <div className="pt-3 pb-1 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 text-black">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-black" />
              <Input
                placeholder={language === "tl" ? "Maghanap ayon sa gumawa, aksyon, form o deskripsyon..." : "Search by user, action, form, or description..."}
                value={activitySearchQuery}
                onChange={(e) => setActivitySearchQuery(e.target.value)}
                className="pl-9 h-9 text-xs text-black font-medium placeholder:text-black/60 border-slate-400 bg-slate-50/70"
              />
              {activitySearchQuery && (
                <button
                  onClick={() => setActivitySearchQuery("")}
                  className="absolute right-2.5 top-2.5 text-xs text-black hover:font-bold"
                >
                  ×
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0 flex-wrap">
              {/* Category Filter */}
              <Select value={activityCategoryFilter} onValueChange={setActivityCategoryFilter}>
                <SelectTrigger className="h-9 w-[150px] text-xs text-black font-semibold border-slate-400 bg-slate-50/70">
                  <SelectValue placeholder="Action Type" />
                </SelectTrigger>
                <SelectContent className="text-black">
                  <SelectItem value="ALL">{language === "tl" ? "Lahat ng Aksyon" : "All Actions"}</SelectItem>
                  <SelectItem value="RECORDING">{language === "tl" ? "Pagtatala (Recording)" : "Data Recording"}</SelectItem>
                  <SelectItem value="EDITING">{language === "tl" ? "Pag-edit (Editing)" : "Editing / Updating"}</SelectItem>
                  <SelectItem value="DELETING">{language === "tl" ? "Pagbura (Deleting)" : "Deleting Records"}</SelectItem>
                  <SelectItem value="PRINTING">{language === "tl" ? "Pag-print (Printing)" : "Printing"}</SelectItem>
                </SelectContent>
              </Select>

              {/* Date Filter */}
              <Select value={activityDateFilter} onValueChange={setActivityDateFilter}>
                <SelectTrigger className="h-9 w-[130px] text-xs text-black font-semibold border-slate-400 bg-slate-50/70">
                  <SelectValue placeholder="Filter Date" />
                </SelectTrigger>
                <SelectContent className="text-black">
                  <SelectItem value="ALL">{language === "tl" ? "Lahat ng Petsa" : "All Dates"}</SelectItem>
                  {availableActivityDates.map((dateStr) => (
                    <SelectItem key={dateStr} value={dateStr}>
                      {dateStr}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Activity Logs Count Summary */}
          <div className="flex items-center justify-between text-[11px] text-black font-semibold px-0.5">
            <span>
              {language === "tl" ? "Kabuuang mga tala: " : "Showing: "}
              <strong className="text-black font-extrabold">{filteredActivityLogs.length}</strong>
              {language === "tl" ? " aktibidad sa " : " activity log(s) across "}
              <strong className="text-black font-extrabold">{sortedDateGroups.length}</strong>
              {language === "tl" ? " araw" : " day(s)"}
            </span>
            {(activitySearchQuery || activityCategoryFilter !== "ALL" || activityDateFilter !== "ALL") && (
              <button
                onClick={() => {
                  setActivitySearchQuery("");
                  setActivityCategoryFilter("ALL");
                  setActivityDateFilter("ALL");
                }}
                className="text-black underline font-bold hover:opacity-80"
              >
                {language === "tl" ? "I-reset ang mga filter" : "Reset filters"}
              </button>
            )}
          </div>

          {/* Activity Logs Table */}
          <div className="flex-1 min-h-0 border-2 border-slate-300 rounded-xl overflow-hidden bg-white flex flex-col mt-2 shadow-xs">
            <div className="overflow-y-auto flex-1 text-black">
              <table className="w-full text-left text-xs border-collapse text-black" style={{ color: "#000000" }}>
                <thead className="sticky top-0 z-10 bg-slate-100 border-b-2 border-slate-400 font-extrabold text-black">
                  <tr>
                    <th className="p-3 w-12 text-center text-black font-extrabold">#</th>
                    <th className="p-3 w-36 text-black font-extrabold">{language === "tl" ? "Oras (Timestamp)" : "Time"}</th>
                    <th className="p-3 w-40 text-black font-extrabold">{language === "tl" ? "Aksyon" : "Action"}</th>
                    <th className="p-3 w-48 text-black font-extrabold">{language === "tl" ? "Sino ang Gumawa" : "Performed By"}</th>
                    <th className="p-3 text-black font-extrabold">{language === "tl" ? "Mga Detalye / Form" : "Details / Description"}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-300 text-black">
                  {sortedDateGroups.length > 0 ? (
                    sortedDateGroups.map(([dateKey, dayLogs]: [string, any[]], groupIdx: number) => (
                      <React.Fragment key={dateKey || groupIdx}>
                        {/* Single Date Header Entry for all activities on this day */}
                        <tr className="bg-slate-200/90 text-black border-y-2 border-slate-400 font-bold">
                          <td colSpan={5} className="py-2.5 px-4 text-black font-bold text-xs">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2 text-black font-extrabold text-xs tracking-wide">
                                <CalendarDays className="h-4 w-4 text-black shrink-0" />
                                <span className="text-black uppercase">{formatDateHeader(dateKey)}</span>
                                <span className="font-mono text-[11px] font-bold text-black/90">[{dateKey}]</span>
                              </div>
                              <span className="text-[11px] font-bold text-black bg-white px-2.5 py-0.5 rounded-full border border-slate-400 shadow-2xs">
                                {dayLogs.length} {language === "tl" ? "na tala sa araw na ito" : "activity record(s) on this date"}
                              </span>
                            </div>
                          </td>
                        </tr>

                        {/* Activities performed on this single date */}
                        {dayLogs.map((log: any, idx: number) => {
                          const logDate = log.timestamp ? new Date(log.timestamp) : new Date();
                          const category = resolveActionCategory(log);
                          const displayTime = log.timeStr || logDate.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" });

                          return (
                            <tr key={log.id || `${dateKey}-${idx}`} className="hover:bg-slate-50 text-black transition-colors border-b border-slate-200">
                              <td className="p-3 text-center font-mono text-[11px] font-bold text-black">
                                {idx + 1}
                              </td>
                              <td className="p-3 whitespace-nowrap text-black font-mono font-bold">
                                <div className="flex items-center gap-1.5 text-black">
                                  <Clock className="h-3.5 w-3.5 text-black shrink-0" />
                                  <span className="font-bold text-black text-xs">{displayTime}</span>
                                </div>
                              </td>
                              <td className="p-3 whitespace-nowrap text-black">
                                {category === "RECORDING" && (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-400">
                                    <FilePlus className="h-3 w-3 text-emerald-900" />
                                    {language === "tl" ? "Pagtatala ng Datos" : "Data Recording"}
                                  </span>
                                )}
                                {category === "EDITING" && (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-100 text-blue-900 border border-blue-400">
                                    <Edit3 className="h-3 w-3 text-blue-900" />
                                    {language === "tl" ? "Pag-edit / Update" : "Editing / Update"}
                                  </span>
                                )}
                                {category === "DELETING" && (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-100 text-rose-900 border border-rose-400">
                                    <Trash2 className="h-3 w-3 text-rose-900" />
                                    {language === "tl" ? "Pagbura ng Tala" : "Record Deleted"}
                                  </span>
                                )}
                                {category === "PRINTING" && (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-purple-100 text-purple-900 border border-purple-400">
                                    <Printer className="h-3 w-3 text-purple-900" />
                                    {language === "tl" ? "Pag-print" : "Printed Record"}
                                  </span>
                                )}
                                {category === "OTHER" && (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-200 text-black border border-slate-400">
                                    <Activity className="h-3 w-3 text-black" />
                                    {log.action || "Action"}
                                  </span>
                                )}
                              </td>
                              <td className="p-3 text-black">
                                <div className="font-bold text-black text-xs flex items-center gap-1.5">
                                  <User className="h-3.5 w-3.5 text-black shrink-0" />
                                  <span className="truncate max-w-[160px] text-black font-extrabold">{log.workerName || "System Staff"}</span>
                                </div>
                                {log.userEmail && (
                                  <div className="text-[10px] text-black font-medium truncate max-w-[160px] mt-0.5">
                                    {log.userEmail}
                                  </div>
                                )}
                              </td>
                              <td className="p-3 text-black">
                                <p className="font-semibold text-black text-xs leading-relaxed">{log.description || log.action}</p>
                                {log.entityType && (
                                  <span className="inline-block mt-1 text-[10px] font-mono font-bold uppercase px-1.5 py-0.5 rounded bg-slate-200 text-black border border-slate-400">
                                    Entity: {log.entityType}
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </React.Fragment>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="p-10 text-center text-black">
                        <History className="h-10 w-10 text-black mx-auto mb-2 opacity-60" />
                        <p className="text-sm font-bold text-black">
                          {language === "tl" ? "Walang nahanap na tala ng aktibidad." : "No activity logs match your criteria."}
                        </p>
                        <p className="text-xs text-black font-medium mt-1">
                          {language === "tl"
                            ? "Maitatala dito ang mga pagkilos tulad ng pagtatala sa forms, pag-print, pag-edit, at pagbura."
                            : "Actions such as recording form data, printing, editing, and deleting will appear here automatically."}
                        </p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <DialogFooter className="pt-4 border-t border-slate-300 mt-4 shrink-0 flex items-center justify-between gap-3 text-black">
            <div className="flex items-center gap-2">
              <Button
                onClick={handlePrintActivityLogs}
                size="sm"
                className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs shadow-sm"
              >
                <Printer className="h-4 w-4" />
                {language === "tl" ? "I-print ang Activity Logs" : "Print Activity Logs"}
              </Button>
            </div>
            <Button variant="outline" size="sm" onClick={() => setActivityLogsDialogOpen(false)} className="text-black font-bold border-slate-400">
              {language === "tl" ? "Isara" : "Close"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Activity Logs Print Container */}
      <div id="activity-logs-print-area" className="hidden print:block text-black bg-white w-full mx-auto p-0 m-0">
        <style>{`
          @media print {
            body:not(.printing-activity-logs) #activity-logs-print-area {
              display: none !important;
              visibility: hidden !important;
            }
            body.printing-activity-logs * {
              visibility: hidden !important;
            }
            body.printing-activity-logs #activity-logs-print-area,
            body.printing-activity-logs #activity-logs-print-area * {
              visibility: visible !important;
            }
            body.printing-activity-logs #activity-logs-print-area {
              position: absolute !important;
              left: 0 !important;
              top: 0 !important;
              width: 100% !important;
              background: white !important;
              padding: 16px !important;
              margin: 0 !important;
              box-shadow: none !important;
              border: none !important;
              color: black !important;
              display: block !important;
              box-sizing: border-box !important;
            }
            @page {
              size: A4 landscape;
              margin: 8mm;
            }
          }
        `}</style>

        {/* Official Header */}
        <div style={{ width: "100%", marginBottom: "12px" }}>
          <OfficialHeader
            title={language === "tl" ? "BARANGAY HEALTH SYSTEM OPISYAL NA TALAAN NG MGA GAWAIN (ACTIVITY LOGS)" : "BARANGAY HEALTH SYSTEM OFFICIAL ACTIVITY & AUDIT LOGS"}
            subtitle={language === "tl" ? "Barangay Subukin Health Center, San Juan, Batangas • Opisyal na Talaan ng Pagtatala, Pag-edit, Pagbura, at Pag-print" : "Barangay Subukin Health Center, San Juan, Batangas • Audit Log of Data Entry, Editing, Deletion, and Printing"}
            showDoubleBorder={true}
            logoHeight="110px"
          />
        </div>

        {/* Summary Meta */}
        <div style={{ width: "100%", border: "1px solid #000", padding: "8px 10px", marginBottom: "10px", fontSize: "11px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", boxSizing: "border-box", background: "#f8fafc", color: "#000" }}>
          <div>
            <p style={{ margin: "2px 0" }}><span style={{ fontWeight: "bold", textTransform: "uppercase" }}>Generated By:</span> <span>{workerDisplayName}</span></p>
            <p style={{ margin: "2px 0" }}><span style={{ fontWeight: "bold", textTransform: "uppercase" }}>Category Filter:</span> <span>{activityCategoryFilter}</span></p>
          </div>
          <div style={{ textAlign: "right" }}>
            <p style={{ margin: "2px 0" }}><span style={{ fontWeight: "bold", textTransform: "uppercase" }}>Date Filter:</span> <span>{activityDateFilter === "ALL" ? "All Dates" : activityDateFilter}</span></p>
            <p style={{ margin: "2px 0" }}><span style={{ fontWeight: "bold", textTransform: "uppercase" }}>Date Generated:</span> <span>{new Date().toLocaleDateString(undefined, { dateStyle: "medium" })} {new Date().toLocaleTimeString(undefined, { timeStyle: "short" })}</span></p>
          </div>
        </div>

        {/* Logs Table with Single Date Header per Day */}
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "11px", tableLayout: "fixed", color: "#000" }}>
          <thead>
            <tr style={{ background: "#f1f5f9", borderBottom: "2px solid #000" }}>
              <th style={{ border: "1px solid #000", padding: "6px 8px", textAlign: "center", textTransform: "uppercase", fontWeight: "bold", width: "5%" }}>#</th>
              <th style={{ border: "1px solid #000", padding: "6px 8px", textAlign: "center", textTransform: "uppercase", fontWeight: "bold", width: "16%" }}>Timestamp (Time)</th>
              <th style={{ border: "1px solid #000", padding: "6px 8px", textAlign: "center", textTransform: "uppercase", fontWeight: "bold", width: "18%" }}>Action</th>
              <th style={{ border: "1px solid #000", padding: "6px 8px", textAlign: "left", textTransform: "uppercase", fontWeight: "bold", width: "23%" }}>Performed By</th>
              <th style={{ border: "1px solid #000", padding: "6px 8px", textAlign: "left", textTransform: "uppercase", fontWeight: "bold", width: "38%" }}>Description / Details</th>
            </tr>
          </thead>
          <tbody>
            {sortedDateGroups.length > 0 ? (
              sortedDateGroups.map(([dateKey, dayLogs]: [string, any[]], groupIdx: number) => (
                <React.Fragment key={dateKey || groupIdx}>
                  <tr style={{ background: "#e2e8f0", borderTop: "2px solid #000", borderBottom: "1px solid #000" }}>
                    <td colSpan={5} style={{ border: "1px solid #000", padding: "6px 10px", fontWeight: "bold", textTransform: "uppercase", fontSize: "11px" }}>
                      DATE: {formatDateHeader(dateKey)} [{dateKey}] • ({dayLogs.length} activities)
                    </td>
                  </tr>
                  {dayLogs.map((log: any, idx: number) => {
                    const logDate = log.timestamp ? new Date(log.timestamp) : new Date();
                    const tStr = log.timeStr || logDate.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" });
                    const cat = resolveActionCategory(log);
                    return (
                      <tr key={log.id || idx} style={{ borderBottom: "1px solid #000" }}>
                        <td style={{ border: "1px solid #000", padding: "6px 8px", textAlign: "center", fontFamily: "monospace", fontWeight: "bold" }}>{idx + 1}</td>
                        <td style={{ border: "1px solid #000", padding: "6px 8px", textAlign: "center", fontFamily: "monospace", fontWeight: "bold" }}>{tStr}</td>
                        <td style={{ border: "1px solid #000", padding: "6px 8px", textAlign: "center", fontWeight: "bold" }}>{cat}</td>
                        <td style={{ border: "1px solid #000", padding: "6px 8px", fontWeight: "bold" }}>{log.workerName || log.userEmail || "Staff"}</td>
                        <td style={{ border: "1px solid #000", padding: "6px 8px", fontWeight: "500" }}>{log.description || log.action}</td>
                      </tr>
                    );
                  })}
                </React.Fragment>
              ))
            ) : (
              <tr>
                <td colSpan={5} style={{ border: "1px solid #000", padding: "14px", textAlign: "center", fontStyle: "italic" }}>
                  No activity logs recorded.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Signatures */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "48px", paddingTop: "16px", marginTop: "12px", fontSize: "11px", width: "100%", color: "#000" }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ borderBottom: "1px solid #000", width: "60%", margin: "0 auto", paddingBottom: "4px", fontWeight: "bold", fontSize: "12px", textTransform: "uppercase" }}>
              {workerDisplayName}
            </div>
            <p style={{ marginTop: "4px", fontSize: "10px", fontWeight: "bold", textTransform: "uppercase" }}>Generated / Prepared By</p>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ borderBottom: "1px solid #000", width: "60%", margin: "0 auto", paddingBottom: "4px", fontWeight: "bold", fontSize: "12px", textTransform: "uppercase" }}>
              CRISTETA R. LANUZA
            </div>
            <p style={{ marginTop: "4px", fontSize: "10px", fontWeight: "bold", textTransform: "uppercase" }}>BHW Supervisory / Verified Correct</p>
          </div>
        </div>
      </div>

      {/* BHAI - Barangay Health AI Chatbot */}
      <BhaiChatbot />
    </SidebarProvider>
  );
}





import { useState, useEffect } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { NavLink } from "@/components/NavLink";
import { Home, Info, Calendar, Phone, Fingerprint, Clock, UserCheck, LogOut, List, Shield, User, CalendarDays, Printer, AlertTriangle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/contexts/AuthContext";
import { useSettings } from "@/contexts/SettingsContext";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { bhwCheckIn, bhwCheckOut } from "@/lib/activityLogger";
import { toast } from "sonner";
import OfficialHeader from "@/components/OfficialHeader";

const getHeaderLinks = (t: (key: string) => string) => [
  { label: t("nav.dashboard"), to: "/", Icon: Home },
  { label: t("nav.about"), to: "/about", Icon: Info },
  { label: t("nav.calendar"), to: "/calendar", Icon: Calendar },
  { label: t("nav.contact"), to: "/contact", Icon: Phone },
];

const BHW_WORKERS = [
  { name: "Cristeta R. Lanuza", phone: "0919-6980-712", role: "supervisory", sitio: "Masigla" },
  { name: "Evelyn T. Ilao", phone: "0935-5638-247", role: "worker", sitio: "Manggahan 1" },
  { name: "Cecilia G. Benosa", phone: "0921-8509-320", role: "worker", sitio: "Maligaya" },
  { name: "Merlita R. Alonzo", phone: "0930-9085-713", role: "worker", sitio: "Matahimik/Punta" },
  { name: "Suzette B. Lopez", phone: "0935-2008-942", role: "worker", sitio: "Makalintal 1" },
  { name: "Amelita R. Sayat", phone: "0931-0232-973", role: "worker", sitio: "Puntor" },
  { name: "Wilma D. Tanyag", phone: "0997-4971-138", role: "worker", sitio: "Masaya" },
  { name: "Nenita M. Dimaculangan", phone: "0985-1225-857", role: "worker", sitio: "Manggahan 2" },
  { name: "Mercy O. Abanilla", phone: "0949-7768-394", role: "worker", sitio: "Cama" },
  { name: "Renchie V. Ilao", phone: "0965-6627-031", role: "worker", sitio: "Makalintal 2" },
  { name: "Renalyn D. Laurente", phone: "0985-1086-472", role: "worker", sitio: "Matahimik / Burol" },
  { name: "Maribel M. Abayon", phone: "0922-6722-134", role: "bns", sitio: "Masigla" }
];

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, userRole, username, fullName } = useAuth();
  const { t, language } = useSettings();
  const [activeBhw, setActiveBhw] = useState<string | null>(null);
  const [sessionDuration, setSessionDuration] = useState("00:00:00");
  const [logsDialogOpen, setLogsDialogOpen] = useState(false);
  const [attendanceNoticeOpen, setAttendanceNoticeOpen] = useState(false);
  const [noticeDismissed, setNoticeDismissed] = useState(false);
  const [selectedWorker, setSelectedWorker] = useState<any>(null);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [attendanceLogs, setAttendanceLogs] = useState<any[]>([]);
  const [activityLogs, setActivityLogs] = useState<any[]>([]);

  // Get active worker display name (full name, username or email local part)
  const workerDisplayName = fullName || username || user?.user_metadata?.full_name || (userRole === "supervisor" ? "Admin Midwife" : user?.email?.split("@")[0]) || "Staff";

  useEffect(() => {
    const updateBhwState = () => {
      const active = localStorage.getItem("active_bhw_worker");
      setActiveBhw(active);
      
      const att = localStorage.getItem("bhw_attendance_logs");
      setAttendanceLogs(att ? JSON.parse(att) : []);
      const act = localStorage.getItem("bhw_activity_logs");
      setActivityLogs(act ? JSON.parse(act) : []);
    };

    updateBhwState();
    window.addEventListener("bhw-attendance-updated", updateBhwState);
    window.addEventListener("storage", updateBhwState);

    return () => {
      window.removeEventListener("bhw-attendance-updated", updateBhwState);
      window.removeEventListener("storage", updateBhwState);
    };
  }, [logsDialogOpen]);

  useEffect(() => {
    if (user && !activeBhw && !noticeDismissed) {
      const timer = setTimeout(() => setAttendanceNoticeOpen(true), 400);
      return () => clearTimeout(timer);
    }
  }, [user, activeBhw, noticeDismissed]);

  useEffect(() => {
    if (workerDisplayName) {
      setSelectedWorker({
        name: workerDisplayName,
        role: (userRole === "supervisor" || userRole === "supervisory") ? "supervisory" : userRole === "bns" ? "bns" : "worker",
        phone: user?.email ?? "—"
      });
    }
  }, [workerDisplayName, userRole, logsDialogOpen]);

  useEffect(() => {
    if (!activeBhw) {
      setSessionDuration("00:00:00");
      return;
    }

    const timer = setInterval(() => {
      try {
        const storedLogs = localStorage.getItem("bhw_attendance_logs");
        if (!storedLogs) return;
        const logs = JSON.parse(storedLogs);
        const activeLog = logs.find((l: any) => l.workerName === activeBhw && !l.logoutAt);
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
  }, [activeBhw]);

  const getWorkerAttendance = (workerName: string) => {
    const cleanWorkerName = workerName.toLowerCase();
    return attendanceLogs
      .filter((l: any) => {
        const logWorker = l.workerName.toLowerCase();
        return logWorker === cleanWorkerName || 
               cleanWorkerName.includes(logWorker) ||
               logWorker.includes(cleanWorkerName.split(" ")[0]);
      })
      .sort((a: any, b: any) => b.loginAt.localeCompare(a.loginAt));
  };

  const formatDuration = (login: Date, logout: Date) => {
    const diffMs = logout.getTime() - login.getTime();
    const hrs = Math.floor(diffMs / 3600000);
    const mins = Math.floor((diffMs % 3600000) / 60000);
    if (hrs > 0) return `${hrs}h ${mins}m`;
    return `${mins}m`;
  };

  const handlePrintAttendance = () => {
    window.print();
  };

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
                  {getHeaderLinks(t).map(({ label, to, Icon }) => {
                    const isAdminMode = userRole === "supervisor";
                    const resolvedTo = isAdminMode ? (to === "/" ? "/admin" : `/admin${to}`) : to;
                    return (
                      <Tooltip key={label}>
                        <TooltipTrigger asChild>
                          <NavLink
                            to={resolvedTo}
                            end
                            className="flex items-center justify-center px-3 py-1.5 rounded-md text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                            activeClassName="bg-sidebar-accent text-sidebar-primary"
                          >
                            <Icon className="h-5 w-5" aria-label={label} />
                          </NavLink>
                        </TooltipTrigger>
                        <TooltipContent>{label}</TooltipContent>
                      </Tooltip>
                    );
                  })}
                </nav>
              </TooltipProvider>

              <div className="border-l border-sidebar-border h-6 shrink-0" />

              <Popover>
                <PopoverTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className={`relative flex items-center gap-2 h-9 rounded-full px-3 transition-all shrink-0 ${
                      !activeBhw
                        ? "bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 border border-amber-500/20 animate-pulse" 
                        : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                    }`}
                  >
                    <Fingerprint className={`h-5 w-5 ${!activeBhw ? "text-amber-500 animate-pulse" : "text-primary"}`} />
                    <span className="text-xs font-semibold max-w-[120px] truncate">
                      {activeBhw 
                        ? activeBhw 
                        : (userRole === "supervisor" || userRole === "supervisory")
                        ? (language === "tl" ? "Mag-Clock In" : "Midwife Sign In")
                        : (language === "tl" ? "Mag-Clock In" : "BHW Sign In")}
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
                          {userRole === "supervisory" || userRole === "supervisor"
                            ? (language === "tl" ? "Aktibong Shift ng Midwife" : "Midwife Active Shift") 
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
                              bhwCheckOut();
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
                              bhwCheckIn(workerDisplayName);
                              toast.success(language === "tl" ? `Maligayang pagdating, ${workerDisplayName}! Nagsimula na ang iyong shift.` : `Welcome, ${workerDisplayName}! Shift started.`);
                            }}
                          >
                            <UserCheck className="h-3.5 w-3.5" /> {language === "tl" ? "Mag-Clock In / Simulan ang Shift" : "Clock In / Start Shift"}
                          </Button>
                        </div>
                      )}
                    </>
                  )}

                  {userRole === "supervisor" && (
                    <div className="space-y-1 p-2 bg-muted/20 border border-border/20 rounded-md">
                      <p className="text-[10px] text-muted-foreground flex items-center gap-1.5">
                        <Shield className="h-3.5 w-3.5 text-primary" />
                        {language === "tl" ? "Mode ng Midwife Admin" : "Midwife Admin Mode"}
                      </p>
                    </div>
                  )}

                  <div className="border-t border-border/30 pt-3">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full text-xs h-8 gap-1.5 font-semibold"
                      onClick={() => {
                        setLogsDialogOpen(true);
                      }}
                    >
                      <List className="h-3.5 w-3.5" /> {language === "tl" ? "Tingnan ang Attendance at Logs" : "View Attendance & Logs"}
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </header>

          <div className="flex-1 p-6 animate-fade-in space-y-6 min-w-0 max-w-full">
            {!activeBhw && user && (
              <div className="p-4 rounded-xl border border-amber-500/40 bg-gradient-to-r from-amber-500/15 via-amber-500/10 to-amber-500/5 shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4 animate-bounce-subtle">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 mt-0.5 animate-pulse">
                    <Fingerprint className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="font-heading font-bold text-sm text-foreground flex items-center gap-2 flex-wrap">
                      <span>{t("attendance.noticeTitle")}</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide bg-amber-500 text-white animate-pulse">
                        ATTENDANCE REQUIRED
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
                    bhwCheckIn(workerDisplayName);
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
      </div>

      {/* Attendance Logs Dialog */}
      <Dialog open={logsDialogOpen} onOpenChange={setLogsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col p-6 rounded-xl border border-border/50 bg-background">
          <DialogHeader className="pb-4 border-b border-border/30">
            <DialogTitle className="text-xl font-heading font-bold flex items-center gap-2 text-foreground">
              <Fingerprint className="h-5 w-5 text-primary animate-pulse" />
              {language === "tl" ? "Talaan ng Attendance ng mga Barangay Health Worker" : "Barangay Health Workers Attendance Log"}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground mt-0.5">
              {language === "tl" ? "Opisyal na log-in at log-out attendance records ng mga tauhan sa kalusugan ng Barangay Subukin." : "Official time in and time out attendance records for Barangay Subukin health staff."}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 overflow-hidden">
            {/* Sidebar list of BHW Workers - ONLY VISIBLE TO ADMIN/SUPERVISOR */}
            {userRole === "supervisor" ? (
              <div className="border-r border-border/30 pr-4 overflow-y-auto space-y-2 h-full">
                <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 block">
                  {language === "tl" ? "Direktoryo ng mga Tauhan ng BHW" : "BHW Personnel Directory"} ({BHW_WORKERS.length})
                </Label>
                {BHW_WORKERS.map((worker) => {
                  const isSelected = selectedWorker?.name === worker.name;
                  const isOnline = activeBhw === worker.name;
                  return (
                    <button
                      key={worker.name}
                      onClick={() => setSelectedWorker(worker)}
                      className={`w-full text-left p-2.5 rounded-lg border text-xs transition-all flex items-center justify-between gap-2 ${
                        isSelected 
                          ? "bg-primary/5 border-primary text-foreground font-semibold" 
                          : "border-border/30 hover:border-primary/40 hover:bg-muted/30 text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0 ${
                          isSelected ? "bg-primary text-white" : "bg-muted text-muted-foreground"
                        }`}>
                          {worker.name.split(" ").map(n => n[0]).slice(0, 2).join("")}
                        </div>
                        <div className="min-w-0">
                          <p className={`truncate text-xs ${isSelected ? "text-foreground font-semibold" : "text-foreground/95"}`}>
                            {worker.name}
                          </p>
                          <p className="text-[10px] text-muted-foreground capitalize truncate">
                            {worker.role === "supervisory" ? (language === "tl" ? "Midwife" : "Midwife") : worker.role === "bns" ? "BNS Scholar" : "BHW Worker"}
                          </p>
                        </div>
                      </div>
                      {isOnline && (
                        <span className="h-2 w-2 rounded-full bg-green-500 shrink-0 animate-ping" />
                      )}
                    </button>
                  );
                })}
              </div>
            ) : null}

            {/* Attendance detail view */}
            <div className={`${userRole === "supervisor" ? "col-span-2" : "col-span-3"} overflow-y-auto h-full space-y-4`}>
              {selectedWorker ? (
                <>
                  {/* Worker header summary */}
                  <div className="p-4 bg-muted/20 border border-border/30 rounded-xl space-y-3">
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                      <div>
                        <h3 className="text-base font-bold text-foreground">{selectedWorker.name}</h3>
                        <p className="text-[10px] text-muted-foreground capitalize">
                          {selectedWorker.role === "supervisory" ? (language === "tl" ? "Midwife" : "Midwife") : selectedWorker.role === "bns" ? (language === "tl" ? "Barangay Nutrition Scholar" : "Barangay Nutrition Scholar") : (language === "tl" ? "Barangay Health Worker" : "Barangay Health Worker")}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {activeBhw === selectedWorker.name ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-green-100 text-green-800 dark:bg-green-950/30 dark:text-green-400 border border-green-200 dark:border-green-900/30">
                            <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                            {language === "tl" ? `Nasa Trabaho (Tagal: ${sessionDuration})` : `On Duty (Duration: ${sessionDuration})`}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-muted text-muted-foreground border border-border/30">
                            {language === "tl" ? "Wala sa Trabaho (Off Duty)" : "Off Duty"}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-xs text-muted-foreground pt-1 border-t border-border/10">
                      <div>
                        <strong>{language === "tl" ? "User ID / Telepono:" : "User ID / Phone:"}</strong> {selectedWorker.phone || "—"}
                      </div>
                      <div>
                        <strong>{language === "tl" ? "Itinalagang Sitio:" : "Assigned Sitio:"}</strong> {selectedWorker.sitio || "Subukin Main"}
                      </div>
                    </div>
                  </div>

                  {/* Attendance Log Table */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                        <CalendarDays className="h-3.5 w-3.5 text-primary" />
                        {language === "tl" ? "Talaan ng Pagpasok at Paglabas" : "Time In & Time Out History"}
                      </h4>
                      <span className="text-[11px] text-muted-foreground">
                        {getWorkerAttendance(selectedWorker.name).length} {language === "tl" ? "na tala" : "record(s)"}
                      </span>
                    </div>
                    <div className="border border-border/30 rounded-xl overflow-hidden bg-card/50">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-muted/40 border-b border-border/30 font-semibold text-muted-foreground">
                            <th className="p-3">{language === "tl" ? "Petsa" : "Date"}</th>
                            <th className="p-3">{language === "tl" ? "Oras ng Pagpasok (Time In)" : "Time In"}</th>
                            <th className="p-3">{language === "tl" ? "Oras ng Paglabas (Time Out)" : "Time Out"}</th>
                            <th className="p-3 text-center">{language === "tl" ? "Tagal ng Shift" : "Shift Duration"}</th>
                            <th className="p-3 text-center">{language === "tl" ? "Katayuan" : "Status"}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/20">
                          {getWorkerAttendance(selectedWorker.name).length > 0 ? (
                            getWorkerAttendance(selectedWorker.name).map((log) => {
                              const loginDate = new Date(log.loginAt);
                              const durationStr = log.logoutAt 
                                ? formatDuration(new Date(log.loginAt), new Date(log.logoutAt))
                                : (language === "tl" ? "Aktibong Shift" : "Active Shift");
                              return (
                                <tr key={log.id} className="hover:bg-muted/20 text-foreground/90 transition-colors">
                                  <td className="p-3 font-medium">{loginDate.toLocaleDateString(undefined, { dateStyle: "medium" })}</td>
                                  <td className="p-3 font-mono font-medium text-emerald-600 dark:text-emerald-400">
                                    {loginDate.toLocaleTimeString(undefined, { timeStyle: "short" })}
                                  </td>
                                  <td className="p-3 font-mono font-medium text-muted-foreground">
                                    {log.logoutAt 
                                      ? new Date(log.logoutAt).toLocaleTimeString(undefined, { timeStyle: "short" })
                                      : <span className="text-amber-600 dark:text-amber-400 font-semibold">({language === "tl" ? "Nasa Trabaho" : "Currently Active"})</span>}
                                  </td>
                                  <td className="p-3 text-center">
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-semibold font-mono ${
                                      log.logoutAt ? "bg-muted text-muted-foreground" : "bg-green-100 text-green-800 dark:bg-green-950/30 dark:text-green-400 border border-green-200 dark:border-green-900/30"
                                    }`}>
                                      {durationStr}
                                    </span>
                                  </td>
                                  <td className="p-3 text-center">
                                    {log.logoutAt ? (
                                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                                        {language === "tl" ? "Naka-Check Out" : "Completed"}
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800">
                                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                        {language === "tl" ? "Nasa Trabaho" : "On Duty"}
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })
                          ) : (
                            <tr>
                              <td colSpan={5} className="p-6 text-center text-muted-foreground italic">
                                {language === "tl" ? "Walang nahanap na tala ng attendance para sa kawaning ito." : "No attendance records found for this personnel."}
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground py-12">
                  <User className="h-10 w-10 text-muted-foreground/50 mb-2" />
                  <p className="text-xs">{language === "tl" ? "Pumili ng kawani upang tingnan ang talaan ng attendance." : "Select a personnel to view attendance logs."}</p>
                </div>
              )}
            </div>
          </div>
          
          <DialogFooter className="pt-4 border-t border-border/30 mt-4 shrink-0 flex items-center justify-between gap-3">
            <Button
              onClick={handlePrintAttendance}
              size="sm"
              className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-xs shadow-sm"
            >
              <Printer className="h-4 w-4" />
              {language === "tl" ? "I-print ang Attendance" : "Print Attendance Record"}
            </Button>
            <Button variant="outline" size="sm" onClick={() => setLogsDialogOpen(false)}>
              {language === "tl" ? "Isara" : "Close"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Attendance Check-In Notice Popup Dialog */}
      <Dialog open={attendanceNoticeOpen} onOpenChange={setAttendanceNoticeOpen}>
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
                bhwCheckIn(workerDisplayName);
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

      {/* Printable Official Attendance Record (Only visible during window.print) */}
      <div id="attendance-print-area" className="hidden print:block text-black bg-white w-full min-w-full p-0 m-0">
        <style>{`
          @media print {
            html, body {
              width: 100% !important;
              min-width: 100% !important;
              height: 100% !important;
              margin: 0 !important;
              padding: 0 !important;
              background: #ffffff !important;
              color: #000000 !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            body * {
              visibility: hidden !important;
            }
            #attendance-print-area, #attendance-print-area * {
              visibility: visible !important;
            }
            #attendance-print-area {
              position: absolute !important;
              left: 0 !important;
              top: 0 !important;
              width: 100% !important;
              max-width: 100% !important;
              min-width: 100% !important;
              background: #ffffff !important;
              color: #000000 !important;
              padding: 0 !important;
              margin: 0 !important;
              display: block !important;
              box-sizing: border-box !important;
              page-break-after: avoid !important;
              break-after: avoid !important;
              page-break-inside: avoid !important;
              break-inside: avoid !important;
            }
            @page {
              size: A4 portrait;
              margin: 8mm 12mm;
            }
          }
        `}</style>
        
        {/* Official Header with logos and letterhead */}
        <div className="w-full mb-3">
          <OfficialHeader
            title={language === "tl" ? "BARANGAY HEALTH WORKERS OPISYAL NA TALAAN NG ATTENDANCE" : "BARANGAY HEALTH WORKERS OFFICIAL ATTENDANCE RECORD"}
            subtitle={language === "tl" ? "Barangay Subukin, San Juan, Batangas • Opisyal na Talaan ng Oras ng Pagpasok at Paglabas" : "Barangay Subukin Health Center, San Juan, Batangas • Official Time In & Time Out Record"}
            showDoubleBorder={true}
            logoHeight="125px"
          />
        </div>

        {/* Worker Summary Box */}
        {selectedWorker && (
          <div className="w-full border-2 border-black p-4 rounded-md mb-4 text-[15px] leading-relaxed grid grid-cols-2 gap-4 mt-2 box-border bg-slate-50/70">
            <div className="space-y-2">
              <p><span className="font-bold uppercase tracking-wider text-black">Personnel Name:</span> <span className="font-bold text-black text-[16px]">{selectedWorker.name}</span></p>
              <p><span className="font-bold uppercase tracking-wider text-black">Designation / Role:</span> <span className="font-semibold text-black">{selectedWorker.role === "supervisory" ? "Midwife" : selectedWorker.role === "bns" ? "Barangay Nutrition Scholar (BNS)" : "Barangay Health Worker (BHW)"}</span></p>
              <p><span className="font-bold uppercase tracking-wider text-black">Assigned Station / Sitio:</span> <span className="font-semibold text-black">{selectedWorker.sitio || "Subukin Main"}</span></p>
            </div>
            <div className="text-right space-y-2">
              <p><span className="font-bold uppercase tracking-wider text-black">Contact Number:</span> <span className="font-semibold text-black">{selectedWorker.phone || "—"}</span></p>
              <p><span className="font-bold uppercase tracking-wider text-black">Document Type:</span> <span className="font-semibold text-black">Official Time Log & Duty Record</span></p>
              <p><span className="font-bold uppercase tracking-wider text-black">Date Generated:</span> <span className="text-black font-semibold">{new Date().toLocaleDateString(undefined, { dateStyle: "long" })} {new Date().toLocaleTimeString(undefined, { timeStyle: "short" })}</span></p>
            </div>
          </div>
        )}

        {/* Official Attendance Log Table */}
        <div className="w-full mb-5">
          <table className="w-full min-w-full text-left text-[15px] border-2 border-black border-collapse table-auto">
            <thead>
              <tr className="bg-slate-200/90 border-b-2 border-black font-bold text-black">
                <th className="border-2 border-black p-3.5 text-center w-14 font-bold uppercase text-[14px]">#</th>
                <th className="border-2 border-black p-3.5 font-bold uppercase text-[14px]">Date (Petsa)</th>
                <th className="border-2 border-black p-3.5 font-bold uppercase text-[14px]">Time In (Oras ng Pagpasok)</th>
                <th className="border-2 border-black p-3.5 font-bold uppercase text-[14px]">Time Out (Oras ng Paglabas)</th>
                <th className="border-2 border-black p-3.5 text-center w-36 font-bold uppercase text-[14px]">Duration (Tagal)</th>
                <th className="border-2 border-black p-3.5 text-center w-44 font-bold uppercase text-[14px]">Status (Katayuan)</th>
              </tr>
            </thead>
            <tbody>
              {selectedWorker && getWorkerAttendance(selectedWorker.name).length > 0 ? (
                getWorkerAttendance(selectedWorker.name).map((log: any, idx: number) => {
                  const loginDate = new Date(log.loginAt);
                  const durationStr = log.logoutAt 
                    ? formatDuration(new Date(log.loginAt), new Date(log.logoutAt))
                    : (language === "tl" ? "Aktibong Shift" : "Active Shift");
                  return (
                    <tr key={log.id || idx} className="border-b-2 border-black text-black">
                      <td className="border-2 border-black p-3.5 text-center font-mono font-bold text-[15px]">{idx + 1}</td>
                      <td className="border-2 border-black p-3.5 font-bold text-[15px]">{loginDate.toLocaleDateString(undefined, { dateStyle: "medium" })}</td>
                      <td className="border-2 border-black p-3.5 font-mono font-semibold text-[15px]">{loginDate.toLocaleTimeString(undefined, { timeStyle: "short" })}</td>
                      <td className="border-2 border-black p-3.5 font-mono font-semibold text-[15px]">
                        {log.logoutAt ? new Date(log.logoutAt).toLocaleTimeString(undefined, { timeStyle: "short" }) : "— (Active on Duty)"}
                      </td>
                      <td className="border-2 border-black p-3.5 text-center font-mono font-bold text-[15px]">{durationStr}</td>
                      <td className="border-2 border-black p-3.5 text-center font-bold text-[15px]">
                        {log.logoutAt ? "Completed Shift" : "On Duty (Active)"}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="border-2 border-black p-10 text-center italic font-medium text-slate-800 text-[15px]">
                    No official attendance records logged for this personnel during this period.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Official Certification and Sign-offs */}
        <div className="grid grid-cols-2 gap-12 pt-6 mt-2 text-[14px] w-full">
          <div className="text-center">
            <div className="border-b-2 border-black w-4/5 mx-auto pb-1.5 font-bold text-[17px] text-black uppercase">
              {selectedWorker?.name || "BHW Personnel"}
            </div>
            <p className="mt-2 text-[13px] text-black font-bold uppercase tracking-wider">Signature over Printed Name / Personnel</p>
          </div>
          <div className="text-center">
            <div className="border-b-2 border-black w-4/5 mx-auto pb-1.5 font-bold text-[17px] text-black uppercase">
              Admin Midwife
            </div>
            <p className="mt-2 text-[13px] text-black font-bold uppercase tracking-wider">Midwife Administrator / Certified Correct</p>
          </div>
        </div>
      </div>
    </SidebarProvider>
  );
}





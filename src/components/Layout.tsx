import { useState, useEffect } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { NavLink } from "@/components/NavLink";
import { Home, Info, Calendar, Phone, Fingerprint, Clock, UserCheck, LogOut, List, Shield, User, Activity, CalendarDays, Eye } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/contexts/AuthContext";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { bhwCheckIn, bhwCheckOut } from "@/lib/activityLogger";
import { toast } from "sonner";

const headerLinks = [
  { label: "Home", to: "/", Icon: Home },
  { label: "About", to: "/about", Icon: Info },
  { label: "Calendar", to: "/calendar", Icon: Calendar },
  { label: "Contact", to: "/contact", Icon: Phone },
];

const BHW_WORKERS = [
  { name: "Cristeta R. Lanuza", phone: "0919-6980-712", role: "supervisory" },
  { name: "Evelyn T. Ilao", phone: "0935-5638-247", role: "worker" },
  { name: "Cecilia G. Benosa", phone: "0921-8509-320", role: "worker" },
  { name: "Merlita R. Alonzo", phone: "0930-9085-713", role: "worker" },
  { name: "Suzette B. Lopez", phone: "0935-2008-942", role: "worker" },
  { name: "Amelita R. Sayat", phone: "0931-0232-973", role: "worker" },
  { name: "Wilma D. Tanyag", phone: "0997-4971-138", role: "worker" },
  { name: "Nenita M. Dimaculangan", phone: "0985-1225-857", role: "worker" },
  { name: "Mercy O. Abanilla", phone: "0949-7768-394", role: "worker" },
  { name: "Renchie V. Ilao", phone: "0965-6627-031", role: "worker" },
  { name: "Renalyn D. Laurente", phone: "0985-1086-472", role: "worker" },
  { name: "Maribel M. Abayon", phone: "0922-6722-134", role: "bns" }
];

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, userRole, username } = useAuth();
  const [showAlertBadge, setShowAlertBadge] = useState(false);
  const [activeBhw, setActiveBhw] = useState<string | null>(null);
  const [sessionDuration, setSessionDuration] = useState("00:00:00");
  const [logsDialogOpen, setLogsDialogOpen] = useState(false);
  const [selectedWorker, setSelectedWorker] = useState<any>(null);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [attendanceLogs, setAttendanceLogs] = useState<any[]>([]);
  const [activityLogs, setActivityLogs] = useState<any[]>([]);

  // Get active worker display name (full name, username or email local part)
  const workerDisplayName = username || user?.user_metadata?.full_name || user?.email?.split("@")[0] || "BHW Worker";

  useEffect(() => {
    const checkUpcomingEvents = () => {
      try {
        const storedEvents = localStorage.getItem("subukin_calendar_events");
        const storedSeen = localStorage.getItem("subukin_seen_events");
        const seenIds: string[] = storedSeen ? JSON.parse(storedSeen) : [];
        
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
        let hasUnseen = false;

        events.forEach((event: any) => {
          if (event.status !== "scheduled" && event.status !== "rescheduled") {
            return;
          }
          
          const eventDate = new Date(event.date);
          eventDate.setHours(0, 0, 0, 0);

          const diffTime = eventDate.getTime() - today.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

          // Alert triggers if the event starts in the next 3 days and has not been seen yet
          if (diffDays >= 0 && diffDays <= 3) {
            if (!seenIds.includes(event.id)) {
              hasUnseen = true;
            }
          }
        });

        setShowAlertBadge(hasUnseen);
      } catch (e) {
        console.error("Error checking unseen events:", e);
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
    if (userRole === "bhw" && workerDisplayName) {
      setSelectedWorker({
        name: workerDisplayName,
        role: "worker",
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

  const markAllAsSeen = () => {
    try {
      const storedEvents = localStorage.getItem("subukin_calendar_events");
      if (!storedEvents) return;
      const events = JSON.parse(storedEvents);
      if (!Array.isArray(events)) return;
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const upcomingIds: string[] = [];

      events.forEach((event: any) => {
        if (event.status !== "scheduled" && event.status !== "rescheduled") {
          return;
        }
        
        const eventDate = new Date(event.date);
        eventDate.setHours(0, 0, 0, 0);

        const diffTime = eventDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays >= 0 && diffDays <= 3) {
          upcomingIds.push(event.id);
        }
      });

      const storedSeen = localStorage.getItem("subukin_seen_events");
      const seenIds: string[] = storedSeen ? JSON.parse(storedSeen) : [];
      const newSeenIds = Array.from(new Set([...seenIds, ...upcomingIds]));
      
      localStorage.setItem("subukin_seen_events", JSON.stringify(newSeenIds));
      window.dispatchEvent(new Event("calendar-events-updated"));
    } catch (e) {
      console.error(e);
    }
  };

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

  const getWorkerActivities = (workerName: string) => {
    const cleanWorkerName = workerName.toLowerCase();
    return activityLogs
      .filter((l: any) => {
        const logWorker = l.workerName.toLowerCase();
        return logWorker === cleanWorkerName || 
               cleanWorkerName.includes(logWorker) ||
               logWorker.includes(cleanWorkerName.split(" ")[0]);
      })
      .sort((a: any, b: any) => b.timestamp.localeCompare(a.timestamp));
  };

  const formatDuration = (login: Date, logout: Date) => {
    const diffMs = logout.getTime() - login.getTime();
    const hrs = Math.floor(diffMs / 3600000);
    const mins = Math.floor((diffMs % 3600000) / 60000);
    if (hrs > 0) return `${hrs}h ${mins}m`;
    return `${mins}m`;
  };

  const getSessionActivities = (workerName: string, sessionId: string | null) => {
    const workerActions = getWorkerActivities(workerName);
    if (!sessionId) return workerActions;
    
    const session = attendanceLogs.find((l: any) => l.id === sessionId);
    if (!session) return [];
    
    const start = new Date(session.loginAt).getTime();
    const end = session.logoutAt ? new Date(session.logoutAt).getTime() : Date.now();
    
    return workerActions.filter((activity: any) => {
      const t = new Date(activity.timestamp).getTime();
      // 5-second window buffer to capture login/logout operations
      return t >= start - 5000 && t <= end + 5000;
    });
  };

  useEffect(() => {
    if (selectedWorker) {
      const att = getWorkerAttendance(selectedWorker.name);
      if (att.length > 0) {
        setSelectedSessionId(att[0].id);
      } else {
        setSelectedSessionId(null);
      }
    } else {
      setSelectedSessionId(null);
    }
  }, [selectedWorker, attendanceLogs]);

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <main className="flex-1 flex flex-col min-h-screen">
          <header className="sticky top-0 z-30 h-14 flex items-center justify-between gap-4 border-b border-sidebar-border bg-sidebar text-sidebar-foreground px-6 shrink-0">
            <div className="flex items-center gap-4">
              <SidebarTrigger className="text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground" />
            </div>

            <TooltipProvider delayDuration={100}>
              <nav className="flex items-center gap-2">
                {headerLinks.map(({ label, to, Icon }) => {
                  const isCalendar = label === "Calendar";
                  return (
                    <Tooltip key={label}>
                      <TooltipTrigger asChild>
                        <NavLink
                          to={to}
                          end
                          onClick={isCalendar ? markAllAsSeen : undefined}
                          className="flex items-center justify-center px-3 py-1.5 rounded-md text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                          activeClassName="bg-sidebar-accent text-sidebar-primary"
                        >
                          <div className="relative">
                            <Icon className="h-5 w-5" aria-label={label} />
                            {isCalendar && showAlertBadge && (
                              <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
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

            <div className="flex items-center gap-2">
              <div className="border-l border-sidebar-border h-6 mx-1 shrink-0" />

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
                      {activeBhw ? activeBhw : "BHW Sign In"}
                    </span>
                    {activeBhw && (
                      <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-green-500 border-2 border-background animate-pulse" />
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-80 p-4 border border-border/50 bg-popover shadow-xl rounded-lg z-50 space-y-4">
                  {(userRole === "bhw" || userRole === "supervisor") && (
                    <>
                      <div className="space-y-1">
                        <h4 className="font-heading font-semibold text-sm text-foreground flex items-center gap-1.5">
                          <Fingerprint className="h-4 w-4 text-primary" />
                          BHW Active Shift
                        </h4>
                        <p className="text-xs text-muted-foreground">
                          Shift tracker using your active login profile: <span className="font-bold text-foreground">{workerDisplayName}</span>.
                        </p>
                      </div>

                      {activeBhw ? (
                        <div className="p-3 bg-muted/40 border border-border/30 rounded-lg space-y-2 text-xs">
                          <p className="text-foreground">
                            Active Shift: <strong>{activeBhw}</strong>
                          </p>
                          <p className="text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3 text-primary/75" />
                            Shift duration: <span className="font-mono text-primary font-semibold">{sessionDuration}</span>
                          </p>
                          <Button 
                            variant="destructive" 
                            size="sm" 
                            className="w-full text-xs h-8 mt-1 gap-1 font-semibold"
                            onClick={() => {
                              bhwCheckOut();
                              toast.success("Shift ended successfully!");
                            }}
                          >
                            <LogOut className="h-3.5 w-3.5" /> End Shift / Check Out
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div className="p-3 bg-muted/20 border border-border/10 rounded-lg space-y-1">
                            <p className="text-xs text-muted-foreground">Logged In User Profile:</p>
                            <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                              <User className="h-3.5 w-3.5 text-primary" /> {workerDisplayName}
                            </p>
                          </div>
                          <Button 
                            size="sm" 
                            className="w-full text-xs h-8 gap-1.5 font-semibold"
                            onClick={() => {
                              bhwCheckIn(workerDisplayName);
                              toast.success(`Welcome, ${workerDisplayName}! Shift started.`);
                            }}
                          >
                            <UserCheck className="h-3.5 w-3.5" /> Clock In / Start Shift
                          </Button>
                        </div>
                      )}
                    </>
                  )}

                  {userRole === "supervisor" && (
                    <div className="space-y-1 p-2 bg-muted/20 border border-border/20 rounded-md">
                      <p className="text-[10px] text-muted-foreground flex items-center gap-1.5">
                        <Shield className="h-3.5 w-3.5 text-primary" />
                        Supervisor Admin Mode
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
                      <List className="h-3.5 w-3.5" /> View Attendance & Logs
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </header>

          <div className="flex-1 p-6 animate-fade-in">
            {children}
          </div>
        </main>
      </div>

      {/* Attendance & Activity Logs Dialog */}
      <Dialog open={logsDialogOpen} onOpenChange={setLogsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col p-6 rounded-xl border border-border/50 bg-background">
          <DialogHeader className="pb-4 border-b border-border/30">
            <DialogTitle className="text-xl font-heading font-bold flex items-center gap-2 text-foreground">
              <Fingerprint className="h-5 w-5 text-primary animate-pulse" />
              Barangay Health Workers Attendance & Logs
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Attendance records and shift activity history for Barangay Subukin health staff.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 overflow-hidden">
            {/* Sidebar list of BHW Workers - ONLY VISIBLE TO ADMIN/SUPERVISOR */}
            {userRole === "supervisor" ? (
              <div className="border-r border-border/30 pr-4 overflow-y-auto space-y-2 h-full">
                <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 block">
                  BHW Personnel Directory ({BHW_WORKERS.length})
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
                            {worker.role === "supervisory" ? "Supervisor" : worker.role === "bns" ? "BNS Scholar" : "BHW Worker"}
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

            {/* Logs detail view */}
            <div className={`${userRole === "supervisor" ? "col-span-2" : "col-span-3"} overflow-y-auto h-full space-y-6`}>
              {selectedWorker ? (
                <>
                  {/* Worker header summary */}
                  <div className="p-4 bg-muted/20 border border-border/30 rounded-xl space-y-3">
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                      <div>
                        <h3 className="text-base font-bold text-foreground">{selectedWorker.name}</h3>
                        <p className="text-xs text-muted-foreground capitalize">
                          {selectedWorker.role === "supervisory" ? "Supervisory Staff" : selectedWorker.role === "bns" ? "Barangay Nutrition Scholar" : "Barangay Health Worker"}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {activeBhw === selectedWorker.name ? (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-green-100 text-green-800 dark:bg-green-950/30 dark:text-green-400 border border-green-200 dark:border-green-900/30">
                            <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                            On Duty (Shift duration: {sessionDuration})
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-muted text-muted-foreground border border-border/30">
                            Off Duty
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-xs text-muted-foreground pt-1 border-t border-border/10">
                      <div>
                        <strong>User ID / Phone:</strong> {selectedWorker.phone || "—"}
                      </div>
                      <div>
                        <strong>Shift Access:</strong> Registered BHW Staff
                      </div>
                    </div>
                  </div>

                  {/* Attendance Record Table */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <CalendarDays className="h-3.5 w-3.5 text-primary" />
                      Attendance History
                    </h4>
                    <div className="border border-border/30 rounded-xl overflow-hidden bg-card/50">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-muted/40 border-b border-border/30 font-semibold text-muted-foreground">
                            <th className="p-2.5">Date</th>
                            <th className="p-2.5">Check In</th>
                            <th className="p-2.5">Check Out</th>
                            <th className="p-2.5">Duration</th>
                            <th className="p-2.5 text-center">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/20">
                          {getWorkerAttendance(selectedWorker.name).length > 0 ? (
                            getWorkerAttendance(selectedWorker.name).map((log) => {
                              const loginDate = new Date(log.loginAt);
                              const durationStr = log.logoutAt 
                                ? formatDuration(new Date(log.loginAt), new Date(log.logoutAt))
                                : "Active Shift";
                              const isCurrentSession = selectedSessionId === log.id;
                              return (
                                <tr key={log.id} className={`hover:bg-muted/20 text-foreground/90 transition-colors ${isCurrentSession ? "bg-primary/5 hover:bg-primary/10" : ""}`}>
                                  <td className="p-2.5 font-medium">{loginDate.toLocaleDateString(undefined, { dateStyle: "medium" })}</td>
                                  <td className="p-2.5 text-muted-foreground">{loginDate.toLocaleTimeString(undefined, { timeStyle: "short" })}</td>
                                  <td className="p-2.5 text-muted-foreground">
                                    {log.logoutAt 
                                      ? new Date(log.logoutAt).toLocaleTimeString(undefined, { timeStyle: "short" })
                                      : "—"}
                                  </td>
                                  <td className="p-2.5">
                                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold font-mono ${
                                      log.logoutAt ? "bg-muted text-muted-foreground" : "bg-green-100 text-green-800 dark:bg-green-950/30 dark:text-green-400 border border-green-200 dark:border-green-900/30"
                                    }`}>
                                      {durationStr}
                                    </span>
                                  </td>
                                  <td className="p-2.5 text-center">
                                    <Button
                                      variant={isCurrentSession ? "default" : "outline"}
                                      size="icon"
                                      className="h-6 w-6 rounded"
                                      onClick={() => setSelectedSessionId(log.id)}
                                      title="Filter activities for this shift"
                                    >
                                      <Eye className="h-3 w-3" />
                                    </Button>
                                  </td>
                                </tr>
                              );
                            })
                          ) : (
                            <tr>
                              <td colSpan={5} className="p-4 text-center text-muted-foreground italic">
                                No attendance records found.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Activity Logs Timeline */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-4">
                      <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                        <Activity className="h-3.5 w-3.5 text-primary" />
                        {selectedSessionId ? "Shift Action Log" : "All Actions Log"}
                        {selectedSessionId && (
                          <span className="text-[10px] text-muted-foreground font-normal lowercase">
                            ({(() => {
                              const sess = attendanceLogs.find(l => l.id === selectedSessionId);
                              if (!sess) return "";
                              return `${new Date(sess.loginAt).toLocaleTimeString(undefined, {timeStyle: "short"})} - ${sess.logoutAt ? new Date(sess.logoutAt).toLocaleTimeString(undefined, {timeStyle: "short"}) : "present"}`;
                            })()})
                          </span>
                        )}
                      </h4>
                      {selectedSessionId && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-6 text-[10px] px-2 hover:bg-muted text-primary"
                          onClick={() => setSelectedSessionId(null)}
                        >
                          Show All History
                        </Button>
                      )}
                    </div>
                    <div className="space-y-2">
                      {getSessionActivities(selectedWorker.name, selectedSessionId).length > 0 ? (
                        getSessionActivities(selectedWorker.name, selectedSessionId).map((activity) => {
                          const logTime = new Date(activity.timestamp);
                          return (
                            <div 
                              key={activity.id} 
                              className="p-3 border border-border/30 rounded-xl bg-card/30 flex items-start gap-3 hover:bg-muted/10 transition-colors"
                            >
                              <div className="mt-1 px-1.5 py-0.5 rounded text-[9px] font-semibold font-mono bg-primary/10 text-primary shrink-0 uppercase">
                                {activity.action}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs text-foreground font-medium leading-normal">
                                  {activity.description}
                                </p>
                                <p className="text-[10px] text-muted-foreground mt-0.5">
                                  {logTime.toLocaleDateString()} at {logTime.toLocaleTimeString(undefined, { timeStyle: "medium" })}
                                </p>
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="p-6 text-center text-xs text-muted-foreground italic border border-dashed border-border/30 rounded-xl bg-muted/10">
                          {selectedSessionId 
                            ? "No logged actions found during this shift. Click 'Show All History' or another shift to view logs." 
                            : "No logged actions found."}
                        </div>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground py-12">
                  <User className="h-10 w-10 text-muted-foreground/50 mb-2" />
                  <p className="text-xs">Review logs and attendance sessions above.</p>
                </div>
              )}
            </div>
          </div>
          
          <DialogFooter className="pt-4 border-t border-border/30 mt-4 shrink-0 font-semibold">
            <Button variant="outline" size="sm" onClick={() => setLogsDialogOpen(false)}>
              Close Log Viewer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
}





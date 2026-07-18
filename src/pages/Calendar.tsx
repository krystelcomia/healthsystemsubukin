import { useState, useEffect } from "react";
import { useSettings } from "@/contexts/SettingsContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Clock,
  CheckCircle2,
  CalendarCheck,
  CalendarClock,
  XCircle,
  FileText,
  AlertCircle,
  Edit,
  Trash2,
  Bell,
} from "lucide-react";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { logActivity } from "@/lib/activityLogger";

interface CalendarEvent {
  id: string;
  title: string;
  description: string;
  time: string;
  date: string; // YYYY-MM-DD
  status: "completed" | "scheduled" | "rescheduled" | "cancelled";
}

interface CalendarNote {
  date: string; // YYYY-MM-DD
  content: string;
}

const CalendarPage = () => {
  const { t, language } = useSettings();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [notifications, setNotifications] = useState<any[]>([]);
  const [readEventIds, setReadEventIds] = useState<string[]>([]);

  useEffect(() => {
    // Load read notifications
    const storedRead = localStorage.getItem("subukin_read_events");
    const readIds: string[] = storedRead ? JSON.parse(storedRead) : [];
    setReadEventIds(readIds);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const upcomingList: any[] = [];

    events.forEach((event: any) => {
      if (event.status !== "scheduled" && event.status !== "rescheduled") {
        return;
      }
      
      const eventDate = new Date(event.date);
      eventDate.setHours(0, 0, 0, 0);

      const diffTime = eventDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays >= 0 && diffDays <= 3) {
        let label = "";
        if (diffDays === 0) label = t("calendar.today");
        else if (diffDays === 1) label = language === "tl" ? "Bukas" : "Tomorrow";
        else label = language === "tl" ? `Sa loob ng ${diffDays} araw` : `In ${diffDays} days`;

        upcomingList.push({
          id: event.id,
          title: event.title,
          timeStr: event.time,
          diffDays: diffDays,
          dayLabel: label
        });
      }
    });

    upcomingList.sort((a, b) => a.diffDays - b.diffDays || a.timeStr.localeCompare(b.timeStr));
    setNotifications(upcomingList);
  }, [events, language]);

  const markAsRead = (eventId: string) => {
    const newReadIds = [...readEventIds, eventId];
    setReadEventIds(newReadIds);
    localStorage.setItem("subukin_read_events", JSON.stringify(newReadIds));
    window.dispatchEvent(new Event("calendar-events-updated"));
  };

  const markAllAsRead = () => {
    const allIds = notifications.map(n => n.id);
    const newReadIds = Array.from(new Set([...readEventIds, ...allIds]));
    setReadEventIds(newReadIds);
    localStorage.setItem("subukin_read_events", JSON.stringify(newReadIds));
    window.dispatchEvent(new Event("calendar-events-updated"));
  };

  // Form states
  const [isEditing, setIsEditing] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [eventTitle, setEventTitle] = useState("");
  const [eventDesc, setEventDesc] = useState("");
  const [eventTime, setEventTime] = useState("");
  const [eventStatus, setEventStatus] = useState<CalendarEvent["status"]>("scheduled");
  const [showForm, setShowForm] = useState(false);

  // Minutes / Notes state
  const [dayNotes, setDayNotes] = useState("");

  const selectedDateStr = selectedDate.toISOString().split("T")[0];

  // Load events and notes from LocalStorage on mount
  useEffect(() => {
    const storedEvents = localStorage.getItem("subukin_calendar_events");
    const storedNotes = localStorage.getItem("subukin_calendar_notes");

    let initialEvents: CalendarEvent[] = [];
    let initialNotes: Record<string, string> = {};

    const todayStr = new Date().toISOString().split("T")[0];
    
    // Helper to get relative dates
    const getRelativeDateStr = (daysOffset: number) => {
      const d = new Date();
      d.setDate(d.getDate() + daysOffset);
      return d.toISOString().split("T")[0];
    };

    if (storedEvents) {
      initialEvents = JSON.parse(storedEvents);
    } else {
      // Pre-populate with mock events for Subukin
      initialEvents = [
        {
          id: "1",
          title: "Barangay General Assembly & Consultation",
          description: "Discussing local health protocols, dengue updates, and family data collection progress.",
          time: "14:00",
          date: todayStr,
          status: "scheduled",
        },
        {
          id: "2",
          title: "Maternal Health and Prenatal Seminar",
          description: "Information drive for expectant mothers and local family planning guidelines.",
          time: "09:00",
          date: getRelativeDateStr(1),
          status: "scheduled",
        },
        {
          id: "3",
          title: "Child Vaccination & Immunization Drive",
          description: "Providing polio and measles vaccines for children under 5 at the health center.",
          time: "08:00",
          date: getRelativeDateStr(2),
          status: "scheduled",
        },
        {
          id: "4",
          title: "Dengue Mosquito Breeding Spot Inspection",
          description: "Routine inspection of larvae containers around Sitio Uno with local BHW team.",
          time: "10:00",
          date: getRelativeDateStr(-1),
          status: "completed",
        },
        {
          id: "5",
          title: "BHW Training & Re-assessment Seminar",
          description: "Staff retraining on the digital BHW Subukin Health Records System. Pushed back from last week.",
          time: "13:30",
          date: getRelativeDateStr(4),
          status: "rescheduled",
        },
      ];
      localStorage.setItem("subukin_calendar_events", JSON.stringify(initialEvents));
    }

    if (storedNotes) {
      initialNotes = JSON.parse(storedNotes);
    } else {
      // Pre-populate with mock notes for Subukin
      initialNotes = {
        [getRelativeDateStr(-1)]: "Minutes of the Dengue Inspection:\n- 8 BHW workers attended.\n- Found 3 households with active kiti-kiti in open drums.\n- Action plan: Administered local warning and distributed flyers on larvae elimination.",
        [todayStr]: "General Assembly Agenda:\n1. Open forum on resident record digitalization.\n2. Logistical check for tomorrow's prenatal seminar.",
      };
      localStorage.setItem("subukin_calendar_notes", JSON.stringify(initialNotes));
    }

    setEvents(initialEvents);
    setNotes(initialNotes);

    // Initial note loading for selected date (today)
    setDayNotes(initialNotes[todayStr] || "");

    // Reminders check: identify events in the next 3 days
    const upcoming = initialEvents.filter((event) => {
      const eventDate = new Date(event.date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      eventDate.setHours(0, 0, 0, 0);

      const diffTime = eventDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      return diffDays >= 0 && diffDays <= 3 && event.status !== "cancelled";
    });

    // Notify user of upcoming events
    if (upcoming.length > 0) {
      upcoming.forEach((event) => {
        const eventDate = new Date(event.date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        eventDate.setHours(0, 0, 0, 0);
        const diffDays = Math.ceil((eventDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        let dayMessage = "";
        if (diffDays === 0) dayMessage = t("calendar.today");
        else if (diffDays === 1) dayMessage = language === "tl" ? "bukas" : "tomorrow";
        else dayMessage = `${diffDays} ${t("calendar.days")}`;

        toast.info(`${event.title}`, {
          description: `${t("calendar.eventTime")}: ${event.time} (${dayMessage})`,
          duration: 6000,
        });
      });
    }
  }, [language]);

  // Load notes whenever selectedDate changes
  useEffect(() => {
    setDayNotes(notes[selectedDateStr] || "");
    setShowForm(false);
    setIsEditing(false);
  }, [selectedDate, notes]);

  // Month navigation helpers
  const handlePrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  // Calendar Day Generation
  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDayIndex = getFirstDayOfMonth(year, month);

  // Days from previous month
  const prevMonth = month === 0 ? 11 : month - 1;
  const prevYear = month === 0 ? year - 1 : year;
  const daysInPrevMonth = getDaysInMonth(prevYear, prevMonth);
  const prevMonthDays = [];
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    prevMonthDays.push({
      day: daysInPrevMonth - i,
      date: new Date(prevYear, prevMonth, daysInPrevMonth - i),
      isCurrentMonth: false,
    });
  }

  // Days in current month
  const currentMonthDays = [];
  for (let i = 1; i <= daysInMonth; i++) {
    currentMonthDays.push({
      day: i,
      date: new Date(year, month, i),
      isCurrentMonth: true,
    });
  }

  // Days in next month to pad the grid (to 35 or 42 cells)
  const totalCells = prevMonthDays.length + currentMonthDays.length;
  const nextMonthDaysNeeded = totalCells <= 35 ? 35 - totalCells : 42 - totalCells;
  const nextMonth = month === 11 ? 0 : month + 1;
  const nextYear = month === 11 ? year + 1 : year;
  const nextMonthDays = [];
  for (let i = 1; i <= nextMonthDaysNeeded; i++) {
    nextMonthDays.push({
      day: i,
      date: new Date(nextYear, nextMonth, i),
      isCurrentMonth: false,
    });
  }

  const calendarDays = [...prevMonthDays, ...currentMonthDays, ...nextMonthDays];

  // Helper to check if a calendar date matches today's date
  const isToday = (date: Date) => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  // Helper to check if calendar date is selected
  const isSelected = (date: Date) => {
    return (
      date.getDate() === selectedDate.getDate() &&
      date.getMonth() === selectedDate.getMonth() &&
      date.getFullYear() === selectedDate.getFullYear()
    );
  };

  // Fetch events for a specific day string (YYYY-MM-DD)
  const getDayEvents = (dateStr: string) => {
    return events.filter((e) => e.date === dateStr);
  };

  // Handle Event Saving (Create or Update)
  const handleSaveEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventTitle.trim()) {
      toast.error(language === "tl" ? "Kailangan ng pamagat!" : "Title is required!");
      return;
    }

    let updatedEvents = [...events];

    if (isEditing && editingEventId) {
      updatedEvents = updatedEvents.map((evt) =>
        evt.id === editingEventId
          ? {
              ...evt,
              title: eventTitle,
              description: eventDesc,
              time: eventTime || "12:00",
              status: eventStatus,
            }
          : evt
      );
      toast.success(language === "tl" ? "Na-update na ang event!" : "Event updated successfully!");
      logActivity("update_event", { description: `Updated calendar event: "${eventTitle}" for date: ${selectedDateStr}` });
    } else {
      const newEvt: CalendarEvent = {
        id: Date.now().toString(),
        title: eventTitle,
        description: eventDesc,
        time: eventTime || "12:00",
        date: selectedDateStr,
        status: eventStatus,
      };
      updatedEvents.push(newEvt);
      toast.success(language === "tl" ? "Naidagdag na ang event!" : "Event added successfully!");
      logActivity("create_event", { description: `Created calendar event: "${eventTitle}" scheduled for ${selectedDateStr}` });
    }

    setEvents(updatedEvents);
    localStorage.setItem("subukin_calendar_events", JSON.stringify(updatedEvents));
    window.dispatchEvent(new Event("calendar-events-updated"));
    
    // Clear form
    setEventTitle("");
    setEventDesc("");
    setEventTime("");
    setEventStatus("scheduled");
    setShowForm(false);
    setIsEditing(false);
    setEditingEventId(null);
  };

  // Start editing an event
  const handleEditEvent = (evt: CalendarEvent) => {
    setEventTitle(evt.title);
    setEventDesc(evt.description);
    setEventTime(evt.time);
    setEventStatus(evt.status);
    setEditingEventId(evt.id);
    setIsEditing(true);
    setShowForm(true);
  };

  // Delete an event
  const handleDeleteEvent = (id: string) => {
    const deletedEvent = events.find((evt) => evt.id === id);
    const updatedEvents = events.filter((evt) => evt.id !== id);
    setEvents(updatedEvents);
    localStorage.setItem("subukin_calendar_events", JSON.stringify(updatedEvents));
    window.dispatchEvent(new Event("calendar-events-updated"));
    toast.success(language === "tl" ? "Nabura na ang event!" : "Event deleted successfully!");
    logActivity("delete_event", { description: `Deleted calendar event: "${deletedEvent?.title || id}"` });
  };

  // Handle Note (minutes) saving
  const handleSaveNotes = () => {
    const updatedNotes = {
      ...notes,
      [selectedDateStr]: dayNotes,
    };
    setNotes(updatedNotes);
    localStorage.setItem("subukin_calendar_notes", JSON.stringify(updatedNotes));
    toast.success(language === "tl" ? "Nai-save na ang mga tala!" : "Notes saved successfully!");
    logActivity("save_calendar_notes", { description: `Saved meeting notes/minutes for ${selectedDateStr}` });
  };

  // Filter events occurring in the upcoming 3 days for reminder sidebar
  const getUpcomingEvents = () => {
    return events
      .filter((event) => {
        const eventDate = new Date(event.date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        eventDate.setHours(0, 0, 0, 0);

        const diffTime = eventDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays >= 0 && diffDays <= 3 && event.status !== "cancelled";
      })
      .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
  };

  const getStatusConfig = (status: CalendarEvent["status"]) => {
    switch (status) {
      case "completed":
        return {
          label: t("calendar.status.completed"),
          dotClass: "bg-green-500",
          badgeClass: "bg-green-100 text-green-800 dark:bg-green-950/30 dark:text-green-400 border-green-200 dark:border-green-900/30",
          icon: CheckCircle2,
        };
      case "scheduled":
        return {
          label: t("calendar.status.scheduled"),
          dotClass: "bg-blue-500",
          badgeClass: "bg-blue-100 text-blue-800 dark:bg-blue-950/30 dark:text-blue-400 border-blue-200 dark:border-blue-900/30",
          icon: CalendarCheck,
        };
      case "rescheduled":
        return {
          label: t("calendar.status.rescheduled"),
          dotClass: "bg-amber-500",
          badgeClass: "bg-amber-100 text-amber-800 dark:bg-amber-950/30 dark:text-amber-400 border-amber-200 dark:border-amber-900/30",
          icon: CalendarClock,
        };
      case "cancelled":
        return {
          label: t("calendar.status.cancelled"),
          dotClass: "bg-red-500",
          badgeClass: "bg-red-100 text-red-800 dark:bg-red-950/30 dark:text-red-400 border-red-200 dark:border-red-900/30",
          icon: XCircle,
        };
    }
  };

  const formatHeaderDate = (date: Date) => {
    return date.toLocaleString(language === "tl" ? "fil-PH" : "en-US", {
      month: "long",
      year: "numeric",
    });
  };

  const formatDayName = (dayIndex: number) => {
    const daysEN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const daysTL = ["Lin", "Lun", "Mar", "Miy", "Huw", "Biy", "Sab"];
    return language === "tl" ? daysTL[dayIndex] : daysEN[dayIndex];
  };

  const upcomingEvents = getUpcomingEvents();
  const unreadCount = notifications.filter(n => !readEventIds.includes(n.id)).length;

  return (
    <div className="space-y-6 w-full animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-heading font-bold text-foreground flex items-center gap-2">
            <CalendarIcon className="h-6 w-6 text-primary" />
            {t("calendar.title")}
          </h1>
          <p className="text-muted-foreground mt-1">{t("calendar.subtitle")}</p>
        </div>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="relative flex items-center gap-2 shadow-sm bg-card border-border/50 hover:bg-muted/30">
              <Bell className="h-4 w-4 text-primary" />
              <span className="font-medium text-xs">Notifications</span>
              {unreadCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow-sm ring-2 ring-background">
                  {unreadCount}
                </span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-80 p-0 border border-border/50 bg-popover shadow-xl rounded-lg overflow-hidden z-50">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/40 bg-muted/40">
              <span className="font-heading font-semibold text-sm text-foreground">Notifications</span>
              {unreadCount > 0 && (
                <button onClick={markAllAsRead} className="text-xs text-primary hover:underline font-medium">
                  Mark all as read
                </button>
              )}
            </div>
            <div className="max-h-64 overflow-y-auto divide-y divide-border/20">
              {notifications.length > 0 ? (
                notifications.map((n) => {
                  const isUnread = !readEventIds.includes(n.id);
                  return (
                    <div 
                      key={n.id} 
                      onClick={() => isUnread && markAsRead(n.id)}
                      className={`p-3 text-left transition-colors cursor-pointer flex items-start gap-3 hover:bg-muted/50 ${
                        isUnread ? "bg-primary/5 dark:bg-primary/10" : ""
                      }`}
                    >
                      <div className={`mt-1.5 h-2 w-2 rounded-full shrink-0 ${
                        isUnread ? "bg-primary animate-pulse" : "bg-transparent"
                      }`} />
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs leading-normal ${
                          isUnread ? "text-foreground font-bold font-semibold" : "text-muted-foreground"
                        }`}>
                          {n.title}
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
                          <Clock className="h-3 w-3 text-primary/75" />
                          <span>{n.dayLabel} at {n.timeStr}</span>
                        </p>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="p-6 text-center text-xs text-muted-foreground">
                  No upcoming reminders (within the next 3 days).
                </div>
              )}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar Grid Section */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-border/50 shadow-md">
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <CardTitle className="text-lg font-heading font-bold text-foreground">
                {formatHeaderDate(currentMonth)}
              </CardTitle>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="icon" onClick={handlePrevMonth} className="h-8 w-8">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={handleNextMonth} className="h-8 w-8">
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-1">
                {/* Days of Week Header */}
                {Array.from({ length: 7 }).map((_, i) => (
                  <div key={i} className="text-center font-semibold text-xs py-2 text-muted-foreground bg-muted/30 rounded-md">
                    {formatDayName(i)}
                  </div>
                ))}

                {/* Day Cells */}
                {calendarDays.map((cell, index) => {
                  const dateStr = cell.date.toISOString().split("T")[0];
                  const dayEvents = getDayEvents(dateStr);
                  const isCellSelected = isSelected(cell.date);
                  const isCellToday = isToday(cell.date);

                  return (
                    <button
                      key={index}
                      onClick={() => setSelectedDate(cell.date)}
                      className={`min-h-[85px] p-2 flex flex-col justify-between items-start border rounded-lg text-left transition-all duration-200 focus:outline-none ${
                        cell.isCurrentMonth
                          ? "bg-card hover:bg-muted/30 text-foreground"
                          : "bg-muted/10 text-muted-foreground/60 border-muted/20"
                      } ${
                        isCellSelected
                          ? "border-primary ring-2 ring-primary/20 scale-[1.01]"
                          : "border-border/50"
                      } ${
                        isCellToday ? "bg-primary/5 border-primary/40 font-bold" : ""
                      }`}
                    >
                      <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                        isCellToday ? "bg-primary text-primary-foreground font-bold" : ""
                      }`}>
                        {cell.day}
                      </span>

                      {/* Event indicators in cells */}
                      <div className="w-full space-y-1 mt-2">
                        {dayEvents.slice(0, 3).map((evt) => {
                          const conf = getStatusConfig(evt.status);
                          return (
                            <div
                              key={evt.id}
                              className="flex items-center gap-1 text-[10px] py-0.5 px-1.5 rounded bg-muted/50 border border-border/30 truncate"
                              title={`${evt.time} - ${evt.title}`}
                            >
                              <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${conf.dotClass}`} />
                              <span className="truncate text-foreground/80">{evt.title}</span>
                            </div>
                          );
                        })}
                        {dayEvents.length > 3 && (
                          <div className="text-[9px] text-muted-foreground pl-1 font-medium">
                            +{dayEvents.length - 3} more
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Meeting Notes Card */}
          <Card className="border-border/50 shadow-md">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-heading font-bold flex items-center gap-2 text-foreground">
                <FileText className="h-5 w-5 text-primary" />
                {t("calendar.notes")}
              </CardTitle>
              <CardDescription>
                {selectedDate.toLocaleDateString(language === "tl" ? "fil-PH" : "en-US", {
                  dateStyle: "full",
                })}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                placeholder={t("calendar.notesPlaceholder")}
                value={dayNotes}
                onChange={(e) => setDayNotes(e.target.value)}
                className="min-h-[140px] resize-y bg-background"
              />
              <div className="flex justify-end">
                <Button onClick={handleSaveNotes} className="flex items-center gap-1.5 shadow-sm">
                  <FileText className="h-4 w-4" />
                  {t("calendar.saveNotes")}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar Panel for Notifications & Day Details */}
        <div className="space-y-6">
          {/* Upcoming Event Reminders Banner */}
          {upcomingEvents.length > 0 && (
            <Card className="border-primary/20 bg-primary/5 shadow-md">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-heading font-bold flex items-center gap-2 text-primary">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {t("calendar.upcomingReminders")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2.5">
                {upcomingEvents.map((evt) => {
                  const conf = getStatusConfig(evt.status);
                  const evtDate = new Date(evt.date);
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  evtDate.setHours(0, 0, 0, 0);
                  const diffDays = Math.ceil((evtDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

                  let dayLabelStr = "";
                  if (diffDays === 0) dayLabelStr = t("calendar.today");
                  else if (diffDays === 1) dayLabelStr = language === "tl" ? "Bukas" : "Tomorrow";
                  else dayLabelStr = language === "tl" ? `Sa loob ng ${diffDays} araw` : `In ${diffDays} days`;

                  return (
                    <div
                      key={evt.id}
                      onClick={() => setSelectedDate(new Date(evt.date))}
                      className="cursor-pointer p-2.5 rounded-lg bg-card border border-primary/10 hover:border-primary/30 hover:shadow-sm transition-all duration-200 space-y-1.5 text-xs text-foreground"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-primary/95 truncate">{evt.title}</span>
                        <span className="text-[10px] text-muted-foreground shrink-0 font-medium">{dayLabelStr}</span>
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground gap-2">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span>{evt.time}</span>
                        </div>
                        <span className={`px-1.5 py-0.5 rounded border text-[9px] font-semibold ${conf.badgeClass}`}>
                          {conf.label}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}

          {/* Selected Day Events List & Creation Form Card */}
          <Card className="border-border/50 shadow-md">
            <CardHeader className="pb-3 border-b border-border/30">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-heading font-bold text-foreground">
                  {selectedDate.toLocaleDateString(language === "tl" ? "fil-PH" : "en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </CardTitle>
                {!showForm && (
                  <Button variant="outline" size="sm" onClick={() => {
                    setIsEditing(false);
                    setEventTitle("");
                    setEventDesc("");
                    setEventTime("08:00");
                    setEventStatus("scheduled");
                    setShowForm(true);
                  }} className="h-8 text-xs flex items-center gap-1">
                    <Plus className="h-3.5 w-3.5" />
                    {t("calendar.addEvent")}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              {/* Add / Edit Event Form */}
              {showForm && (
                <form onSubmit={handleSaveEvent} className="p-3 bg-secondary/50 rounded-lg border border-border/40 space-y-3">
                  <h4 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    {isEditing ? (
                      <>
                        <Edit className="h-3.5 w-3.5 text-primary" />
                        {t("calendar.editEvent")}
                      </>
                    ) : (
                      <>
                        <Plus className="h-3.5 w-3.5 text-primary" />
                        {t("calendar.addEvent")}
                      </>
                    )}
                  </h4>

                  <div className="space-y-1">
                    <Label htmlFor="event_title" className="text-[10px] uppercase font-bold text-muted-foreground">
                      {t("calendar.eventTitle")}
                    </Label>
                    <Input
                      id="event_title"
                      value={eventTitle}
                      onChange={(e) => setEventTitle(e.target.value)}
                      placeholder={language === "tl" ? "Hal. Pagsasanay ng mga BHW" : "e.g. Vaccination Drive"}
                      className="h-8 text-sm"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="event_desc" className="text-[10px] uppercase font-bold text-muted-foreground">
                      {t("calendar.eventDescription")}
                    </Label>
                    <Input
                      id="event_desc"
                      value={eventDesc}
                      onChange={(e) => setEventDesc(e.target.value)}
                      placeholder={language === "tl" ? "Karagdagang detalye..." : "Event notes..."}
                      className="h-8 text-sm"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label htmlFor="event_time" className="text-[10px] uppercase font-bold text-muted-foreground">
                        {t("calendar.eventTime")}
                      </Label>
                      <Input
                        id="event_time"
                        type="time"
                        value={eventTime}
                        onChange={(e) => setEventTime(e.target.value)}
                        className="h-8 text-xs text-foreground"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label htmlFor="event_status" className="text-[10px] uppercase font-bold text-muted-foreground">
                        {t("calendar.status")}
                      </Label>
                      <select
                        id="event_status"
                        value={eventStatus}
                        onChange={(e) => setEventStatus(e.target.value as CalendarEvent["status"])}
                        className="flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-xs ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 text-foreground"
                      >
                        <option value="scheduled">{t("calendar.status.scheduled")}</option>
                        <option value="completed">{t("calendar.status.completed")}</option>
                        <option value="rescheduled">{t("calendar.status.rescheduled")}</option>
                        <option value="cancelled">{t("calendar.status.cancelled")}</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-1.5 pt-1">
                    <Button variant="ghost" size="sm" type="button" onClick={() => setShowForm(false)} className="h-7 text-xs">
                      {t("common.cancel")}
                    </Button>
                    <Button size="sm" type="submit" className="h-7 text-xs font-semibold px-3 shadow-sm">
                      {t("common.save")}
                    </Button>
                  </div>
                </form>
              )}

              {/* Day Events List */}
              <div className="space-y-2.5">
                {getDayEvents(selectedDateStr).length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-6">
                    {t("calendar.noEvents")}
                  </p>
                ) : (
                  getDayEvents(selectedDateStr).map((evt) => {
                    const conf = getStatusConfig(evt.status);
                    const ConfIcon = conf.icon;
                    return (
                      <div
                        key={evt.id}
                        className="p-3 bg-secondary/20 rounded-lg border border-border/50 text-xs text-foreground space-y-2"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-0.5 min-w-0">
                            <h4 className="font-bold truncate text-foreground/95">{evt.title}</h4>
                            {evt.description && (
                              <p className="text-muted-foreground text-[11px] leading-normal">{evt.description}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <Button variant="ghost" size="icon" onClick={() => handleEditEvent(evt)} className="h-6 w-6 text-muted-foreground hover:text-foreground">
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDeleteEvent(evt.id)} className="h-6 w-6 text-muted-foreground hover:text-destructive">
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                        <div className="flex items-center justify-between gap-2 pt-1 text-[10px]">
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Clock className="h-3.5 w-3.5" />
                            <span>{evt.time}</span>
                          </div>
                          <span className={`px-1.5 py-0.5 rounded border text-[9px] font-bold flex items-center gap-1 ${conf.badgeClass}`}>
                            <ConfIcon className="h-3 w-3" />
                            {conf.label}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default CalendarPage;

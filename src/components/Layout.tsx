import { useState, useEffect } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { NavLink } from "@/components/NavLink";
import { Home, Info, Calendar, Phone, Bell, Clock } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";

const headerLinks = [
  { label: "Home", to: "/", Icon: Home },
  { label: "About", to: "/about", Icon: Info },
  { label: "Calendar", to: "/calendar", Icon: Calendar },
  { label: "Contact", to: "/contact", Icon: Phone },
];

interface NotificationItem {
  id: string;
  title: string;
  timeStr: string;
  minsLeft: number;
  dayLabel?: string;
}

export function Layout({ children }: { children: React.ReactNode }) {
  const [showAlertBadge, setShowAlertBadge] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [readEventIds, setReadEventIds] = useState<string[]>([]);

  useEffect(() => {
    // Load read notifications
    const storedRead = localStorage.getItem("subukin_read_events");
    if (storedRead) {
      setReadEventIds(JSON.parse(storedRead));
    }

    const checkUpcomingEvents = () => {
      try {
        const storedEvents = localStorage.getItem("subukin_calendar_events");
        const storedRead = localStorage.getItem("subukin_read_events");
        const readIds: string[] = storedRead ? JSON.parse(storedRead) : [];
        
        if (!storedEvents) {
          setNotifications([]);
          setShowAlertBadge(false);
          return;
        }
        const events = JSON.parse(storedEvents);
        if (!Array.isArray(events)) {
          setNotifications([]);
          setShowAlertBadge(false);
          return;
        }
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const upcomingList: NotificationItem[] = [];

        events.forEach((event: any) => {
          if (event.status !== "scheduled" && event.status !== "rescheduled") {
            return;
          }
          
          const eventDate = new Date(event.date);
          eventDate.setHours(0, 0, 0, 0);

          const diffTime = eventDate.getTime() - today.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

          // Alert triggers if the event starts in the next 3 days (same as the Calendar reminders list)
          if (diffDays >= 0 && diffDays <= 3) {
            let label = "";
            if (diffDays === 0) label = "Today";
            else if (diffDays === 1) label = "Tomorrow";
            else label = `In ${diffDays} days`;

            upcomingList.push({
              id: event.id,
              title: event.title,
              timeStr: event.time,
              minsLeft: diffDays,
              dayLabel: label
            });
          }
        });

        // Sort upcoming notifications (soonest day first, then by time)
        upcomingList.sort((a, b) => a.minsLeft - b.minsLeft || a.timeStr.localeCompare(b.timeStr));
        setNotifications(upcomingList);

        // Alert badge is visible if there is at least one upcoming event that has NOT been marked as read
        const hasUnread = upcomingList.some(item => !readIds.includes(item.id));
        setShowAlertBadge(hasUnread);
      } catch (e) {
        console.error("Error checking upcoming events:", e);
        setNotifications([]);
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

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <main className="flex-1 flex flex-col min-h-screen">
          <header className="sticky top-0 z-30 h-14 flex items-center gap-4 border-b border-sidebar-border bg-sidebar text-sidebar-foreground px-6 shrink-0">
            <SidebarTrigger className="text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground" />
            <TooltipProvider delayDuration={100}>
              <nav className="flex-1 flex items-center justify-between gap-2">
                {headerLinks.map(({ label, to, Icon }) => {
                  const isCalendar = label === "Calendar";
                  return (
                    <Tooltip key={label}>
                      <TooltipTrigger asChild>
                        <NavLink
                          to={to}
                          end
                          onClick={isCalendar ? markAllAsRead : undefined}
                          className="flex-1 flex items-center justify-center px-3 py-1.5 rounded-md text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
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

            <div className="border-l border-sidebar-border h-6 mx-1 shrink-0" />

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground shrink-0 rounded-full h-9 w-9">
                  <Bell className="h-5 w-5" />
                  {showAlertBadge && (
                    <span className="absolute top-1.5 right-1.5 flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                    </span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-80 p-0 border border-border/50 bg-popover shadow-xl rounded-lg overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/40 bg-muted/40">
                  <span className="font-heading font-semibold text-sm text-foreground">Notifications</span>
                  {notifications.some(n => !readEventIds.includes(n.id)) && (
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
          </header>
          <div className="flex-1 p-6 animate-fade-in">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}



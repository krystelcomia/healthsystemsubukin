import { useState, useEffect } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { NavLink } from "@/components/NavLink";
import { Home, Info, Calendar, Phone } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const headerLinks = [
  { label: "Home", to: "/", Icon: Home },
  { label: "About", to: "/about", Icon: Info },
  { label: "Calendar", to: "/calendar", Icon: Calendar },
  { label: "Contact", to: "/contact", Icon: Phone },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const [showAlertBadge, setShowAlertBadge] = useState(false);

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
                          onClick={isCalendar ? markAllAsSeen : undefined}
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
          </header>
          <div className="flex-1 p-6 animate-fade-in">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}




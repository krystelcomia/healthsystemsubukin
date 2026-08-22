import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./AuthContext";
import { toast } from "sonner";

export type NotificationCategory = "health_alert" | "calendar" | "system" | "announcement" | "attendance";
export type NotificationPriority = "high" | "medium" | "low";

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  category: NotificationCategory;
  priority: NotificationPriority;
  timestamp: string;
  read: boolean;
  link?: string;
  actionLabel?: string;
  senderName?: string;
  senderRole?: string;
  metadata?: Record<string, any>;
}

interface NotificationContextType {
  notifications: AppNotification[];
  unreadCount: number;
  loading: boolean;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  deleteNotification: (id: string) => void;
  clearAll: () => void;
  sendNotification: (notif: Omit<AppNotification, "id" | "timestamp" | "read">) => void;
  refreshNotifications: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

const STORAGE_KEY = "bhw_app_notifications_v1";

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, userRole, username } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  const [loading, setLoading] = useState(false);

  // Sync to localStorage whenever notifications change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications));
    } catch (e) {
      console.error("Failed to persist notifications:", e);
    }
  }, [notifications]);

  // Unread count
  const unreadCount = useMemo(() => {
    return notifications.filter((n) => !n.read).length;
  }, [notifications]);

  // Intelligent system generator: Scan live data and generate smart contextual notifications
  const scanSystemEvents = useCallback(async () => {
    try {
      const generatedNotifs: AppNotification[] = [];

      // 1. Check Dengue positive records (Larvae found)
      const { data: dengueData } = await supabase
        .from("dengue_prevention")
        .select("id, household_name, container_type, has_larvae, created_at")
        .eq("has_larvae", true)
        .order("created_at", { ascending: false })
        .limit(5);

      if (dengueData && dengueData.length > 0) {
        dengueData.forEach((d) => {
          generatedNotifs.push({
            id: `dengue-alert-${d.id}`,
            title: "Dengue Larvae Positive Detected",
            message: `Breeding container (${d.container_type || "Water container"}) tested positive for larvae at ${d.household_name || "Household"}. Follow up eradication recommended.`,
            category: "health_alert",
            priority: "high",
            timestamp: d.created_at || new Date().toISOString(),
            read: false,
            link: "/forms/dengue-prevention",
            actionLabel: "View Inspection Record"
          });
        });
      }

      // 2. Check PhilPen high risk (High Blood Pressure: Systolic >= 140 or Diastolic >= 90)
      const { data: philpenData } = await supabase
        .from("philpen_health")
        .select("id, full_name, bp, address_sitio, created_at")
        .order("created_at", { ascending: false })
        .limit(10);

      if (philpenData && philpenData.length > 0) {
        philpenData.forEach((p) => {
          if (p.bp) {
            const parts = p.bp.split("/");
            const sys = parseInt(parts[0] || "0", 10);
            const dia = parseInt(parts[1] || "0", 10);
            if (sys >= 140 || dia >= 90) {
              generatedNotifs.push({
                id: `philpen-bp-${p.id}`,
                title: `Hypertension Alert: BP ${p.bp}`,
                message: `Elevated blood pressure recorded for ${p.full_name || "Resident"} (${p.address_sitio || "Subukin"}). Consider scheduled monitoring.`,
                category: "health_alert",
                priority: "medium",
                timestamp: p.created_at || new Date().toISOString(),
                read: false,
                link: "/forms/philpen-health",
                actionLabel: "View PhilPen Record"
              });
            }
          }
        });
      }

      // 3. Check upcoming Calendar Events within next 3 days
      try {
        const storedEvents = localStorage.getItem("subukin_calendar_events");
        if (storedEvents) {
          const events = JSON.parse(storedEvents);
          if (Array.isArray(events)) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            events.forEach((ev: any) => {
              if (ev.status === "scheduled" || ev.status === "rescheduled") {
                const evDate = new Date(ev.date);
                evDate.setHours(0, 0, 0, 0);
                const diffTime = evDate.getTime() - today.getTime();
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                if (diffDays >= 0 && diffDays <= 3) {
                  const dayLabel = diffDays === 0 ? "Today" : diffDays === 1 ? "Tomorrow" : `in ${diffDays} days`;
                  generatedNotifs.push({
                    id: `calendar-event-${ev.id}`,
                    title: `Upcoming Event: ${ev.title}`,
                    message: `${ev.title} is scheduled for ${dayLabel} (${new Date(ev.date).toLocaleDateString()}) at ${ev.location || "Subukin Health Center"}.`,
                    category: "calendar",
                    priority: diffDays === 0 ? "high" : "medium",
                    timestamp: ev.created_at || new Date().toISOString(),
                    read: false,
                    link: "/calendar",
                    actionLabel: "Open Health Calendar"
                  });
                }
              }
            });
          }
        }
      } catch (e) {
        console.error("Error checking calendar notifications:", e);
      }

      // Merge newly discovered items with existing stored notifications without overwriting read states
      setNotifications((prev) => {
        const existingMap = new Map(prev.map((n) => [n.id, n]));
        let hasNew = false;

        generatedNotifs.forEach((item) => {
          if (!existingMap.has(item.id)) {
            existingMap.set(item.id, item);
            hasNew = true;
          }
        });

        if (hasNew) {
          return Array.from(existingMap.values()).sort(
            (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
          );
        }
        return prev;
      });
    } catch (err) {
      console.error("Error scanning system notifications:", err);
    }
  }, []);

  useEffect(() => {
    scanSystemEvents();
    const interval = setInterval(scanSystemEvents, 30000); // scan every 30s
    return () => clearInterval(interval);
  }, [scanSystemEvents]);

  // Actions
  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    toast.success("All notifications marked as read");
  }, []);

  const deleteNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
    toast.info("All notifications cleared");
  }, []);

  const sendNotification = useCallback(
    (notifData: Omit<AppNotification, "id" | "timestamp" | "read">) => {
      const newNotif: AppNotification = {
        ...notifData,
        id: `custom-notif-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        timestamp: new Date().toISOString(),
        read: false,
        senderName: notifData.senderName || username || user?.email?.split("@")[0] || "Health Center Staff",
        senderRole: notifData.senderRole || (userRole === "supervisor" ? "Supervisor Midwife" : "Barangay Health Worker")
      };

      setNotifications((prev) => [newNotif, ...prev]);
      toast.success("Notification broadcasted successfully!");
    },
    [user, userRole, username]
  );

  const refreshNotifications = useCallback(async () => {
    setLoading(true);
    await scanSystemEvents();
    setLoading(false);
  }, [scanSystemEvents]);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        loading,
        markAsRead,
        markAllAsRead,
        deleteNotification,
        clearAll,
        sendNotification,
        refreshNotifications
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotifications must be used within a NotificationProvider");
  }
  return context;
};

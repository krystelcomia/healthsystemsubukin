import { supabase } from "@/integrations/supabase/client";

const SESSION_KEY = "active_session_id";

export async function startSession(userId: string): Promise<string | null> {
  try {
    const { data, error } = await (supabase.from as any)("user_sessions")
      .insert({ user_id: userId, login_at: new Date().toISOString() })
      .select("id")
      .single();
    if (error) throw error;
    if (data?.id) {
      localStorage.setItem(SESSION_KEY, data.id);
      if (typeof window !== "undefined") {
        sessionStorage.setItem("bhw_current_session_id", data.id);
      }
      return data.id;
    }
  } catch (e) {
    console.warn("startSession failed", e);
  }
  return null;
}

export async function endSession() {
  const id = localStorage.getItem(SESSION_KEY);
  if (!id) return;
  try {
    const logoutAt = new Date();
    const { data: row } = await (supabase.from as any)("user_sessions")
      .select("login_at")
      .eq("id", id)
      .maybeSingle();
    let mins: number | null = null;
    if (row?.login_at) {
      mins = Math.max(0, Math.round((logoutAt.getTime() - new Date(row.login_at).getTime()) / 60000));
    }
    await (supabase.from as any)("user_sessions")
      .update({ logout_at: logoutAt.toISOString(), duration_minutes: mins })
      .eq("id", id);
  } catch (e) {
    console.warn("endSession failed", e);
  } finally {
    localStorage.removeItem(SESSION_KEY);
  }
}

export interface ActiveBhwShift {
  id: string;
  userId?: string | null;
  userEmail?: string | null;
  workerName: string;
  loginAt: string;
}

const ATTENDANCE_CHANNEL = "bhw_attendance_channel";

function broadcastAttendance(data: any) {
  if (typeof window !== "undefined") {
    if ("BroadcastChannel" in window) {
      try {
        const bc = new BroadcastChannel(ATTENDANCE_CHANNEL);
        bc.postMessage(data);
        bc.close();
      } catch {}
    }
    window.dispatchEvent(new CustomEvent("bhw-attendance-updated", { detail: data }));
    window.dispatchEvent(new Event("storage"));
  }
}

export function getActiveBhwShift(user?: { id?: string; email?: string } | null): ActiveBhwShift | null {
  if (typeof window === "undefined" || !user || !user.id) {
    return null;
  }
  try {
    const cleanEmail = (user.email || "").toLowerCase().trim();
    const emailPrefix = cleanEmail.split("@")[0];

    // 1. Check user-scoped shift key
    const userShiftStr = localStorage.getItem(`bhw_active_shift_${user.id}`);
    if (userShiftStr) {
      try {
        const parsed = JSON.parse(userShiftStr);
        if (parsed && (!parsed.userId || parsed.userId === user.id)) {
          return parsed;
        }
      } catch {}
    }

    // 2. Check general active shift JSON
    const generalShiftStr = localStorage.getItem("bhw_active_shift");
    if (generalShiftStr) {
      try {
        const parsed = JSON.parse(generalShiftStr);
        if (parsed) {
          const matches =
            parsed.userId === user.id ||
            (parsed.userEmail && cleanEmail && parsed.userEmail.toLowerCase().trim() === cleanEmail);
          if (matches) {
            return parsed;
          }
          // Belongs to someone else; do not return it
        }
      } catch {}
    }

    // 3. Fallback: check bhw_attendance_logs for an open shift matching current user
    const dbStr = localStorage.getItem("bhw_attendance_logs");
    if (dbStr) {
      try {
        const logs = JSON.parse(dbStr);
        if (Array.isArray(logs)) {
          const openLog = logs.find((l: any) =>
            !l.logoutAt &&
            ((l.userId && l.userId === user.id) ||
              (l.userEmail && cleanEmail && l.userEmail.toLowerCase().trim() === cleanEmail))
          );
          if (openLog) {
            const shift: ActiveBhwShift = {
              id: openLog.id,
              userId: user.id,
              userEmail: user.email,
              workerName: openLog.workerName,
              loginAt: openLog.loginAt,
            };
            localStorage.setItem(`bhw_active_shift_${user.id}`, JSON.stringify(shift));
            return shift;
          }
        }
      } catch {}
    }

    // 4. Clean up any stale legacy active_bhw_worker belonging to another user
    const legacyWorker = localStorage.getItem("active_bhw_worker");
    if (legacyWorker) {
      const cleanLegacy = legacyWorker.toLowerCase().trim();
      const isCurrent =
        (emailPrefix && cleanLegacy.includes(emailPrefix)) ||
        (cleanEmail.includes("krystel") && cleanLegacy.includes("krystel")) ||
        (cleanEmail.includes("cristeta") && cleanLegacy.includes("cristeta")) ||
        (cleanEmail.includes("maryjane") && cleanLegacy.includes("mary jane"));

      if (isCurrent) {
        const sessionId = localStorage.getItem("active_bhw_session_id") || crypto.randomUUID();
        const shift: ActiveBhwShift = {
          id: sessionId,
          userId: user.id,
          userEmail: user.email,
          workerName: legacyWorker,
          loginAt: new Date().toISOString(),
        };
        localStorage.setItem(`bhw_active_shift_${user.id}`, JSON.stringify(shift));
        return shift;
      } else {
        // Stale legacy worker belongs to another account (e.g. Cristeta when logged in as Krystel)
        localStorage.removeItem("active_bhw_worker");
        localStorage.removeItem("active_bhw_session_id");
      }
    }
  } catch (e) {
    console.error("Error checking active BHW shift:", e);
  }
  return null;
}

export interface LogActivityOptions {
  entity_type?: string;
  entityType?: string;
  entity_id?: string;
  entityId?: string;
  description?: string;
  workerName?: string;
  userEmail?: string;
  action?: string;
}

export async function logActivity(
  actionOrEntry: string | ({ action: string } & LogActivityOptions),
  opts?: LogActivityOptions
) {
  try {
    const action = typeof actionOrEntry === "string" ? actionOrEntry : actionOrEntry.action;
    const resolvedOpts: LogActivityOptions =
      typeof actionOrEntry === "object" ? { ...actionOrEntry, ...opts } : (opts || {});
    const entityType = resolvedOpts.entity_type || resolvedOpts.entityType;
    const entityId = resolvedOpts.entity_id || resolvedOpts.entityId;
    const description = resolvedOpts.description;
    // Do not include user sign-ins and sign-outs in the activity logs, as those belong in the attendance logs.
    const actLower = action.toLowerCase();
    const descLower = (description || "").toLowerCase();
    const isAuthOrAttendance =
      actLower.includes("login") ||
      actLower.includes("logout") ||
      actLower.includes("sign-in") ||
      actLower.includes("sign-out") ||
      actLower.includes("signin") ||
      actLower.includes("signout") ||
      actLower.includes("check-in") ||
      actLower.includes("check-out") ||
      actLower.includes("attendance") ||
      actLower.includes("shift") ||
      descLower.includes("signed in") ||
      descLower.includes("signed out") ||
      descLower.includes("checked in") ||
      descLower.includes("checked out");

    if (isAuthOrAttendance) {
      return;
    }

    let currentUser: any = null;
    try {
      const { data } = await supabase.auth.getUser();
      currentUser = data?.user || null;
    } catch {}

    const uid = currentUser?.id || (typeof window !== "undefined" ? (localStorage.getItem("bhw_active_user_id") || localStorage.getItem("active_user_id")) : null);
    const uEmail = resolvedOpts.userEmail || currentUser?.email || (typeof window !== "undefined" ? localStorage.getItem("bhw_active_user_email") || "" : "");

    // Log to standard Supabase logs
    if (uid) {
      try {
        await (supabase.from as any)("user_activity_logs").insert({
          user_id: uid,
          action,
          entity_type: entityType ?? null,
          entity_id: entityId ?? null,
          description: description ?? null,
        });
      } catch {}
    }

    // Also log to BHW specific logs with safe worker identification
    const activeShift = getActiveBhwShift(currentUser || (uid ? { id: uid, email: uEmail } : null));
    const activeBhw = resolvedOpts.workerName ||
                      activeShift?.workerName || 
                      (typeof window !== "undefined" ? (
                        sessionStorage.getItem("logged_in_fullname") || 
                        sessionStorage.getItem("logged_in_username") ||
                        localStorage.getItem("active_bhw_worker")
                      ) : null) ||
                      currentUser?.user_metadata?.full_name ||
                      (uEmail ? uEmail.split("@")[0] : null) ||
                      "BHW Personnel";

    // Categorize action for clear badge & filtering (recording, editing, deleting, printing)
    let actionCategory: "RECORDING" | "EDITING" | "DELETING" | "PRINTING" | "OTHER" = "OTHER";
    if (actLower.includes("submit") || actLower.includes("create") || actLower.includes("add") || actLower.includes("record")) {
      actionCategory = "RECORDING";
    } else if (actLower.includes("update") || actLower.includes("edit") || actLower.includes("modify") || actLower.includes("save")) {
      actionCategory = "EDITING";
    } else if (actLower.includes("delete") || actLower.includes("remove")) {
      actionCategory = "DELETING";
    } else if (actLower.includes("print")) {
      actionCategory = "PRINTING";
    }

    const now = new Date();
    const newLog = {
      id: crypto.randomUUID(),
      userId: uid || null,
      userEmail: uEmail || null,
      workerName: activeBhw,
      action,
      actionCategory,
      entityType: entityType ?? null,
      entityId: entityId ?? null,
      description: description ?? action,
      timestamp: now.toISOString(),
      dateStr: now.toISOString().split("T")[0],
      timeStr: now.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
    };

    if (typeof window !== "undefined") {
      const dbStr = localStorage.getItem("bhw_activity_logs");
      const logs = dbStr ? JSON.parse(dbStr) : [];
      logs.push(newLog);
      // Keep up to 2000 logs
      if (logs.length > 2000) {
        logs.splice(0, logs.length - 2000);
      }
      localStorage.setItem("bhw_activity_logs", JSON.stringify(logs));
      
      broadcastAttendance({ type: "ACTIVITY_LOGGED", workerName: activeBhw, action, log: newLog });
      window.dispatchEvent(new CustomEvent("bhw-activity-updated", { detail: newLog }));
      window.dispatchEvent(new Event("storage"));
    }
  } catch (e) {
    console.warn("logActivity failed", e);
  }
}

// Global print event tracker to automatically record printing of any form
if (typeof window !== "undefined" && !(window as any).__bhwPrintTrackerInitialized) {
  (window as any).__bhwPrintTrackerInitialized = true;
  window.addEventListener("beforeprint", () => {
    try {
      const path = window.location.pathname;
      const formMap: Record<string, string> = {
        "/": "Dashboard Overview",
        "/family-data": "Family Data Form",
        "/consultation": "Consultation Form",
        "/maternal-care": "Maternal Care Form",
        "/child-health": "Child Health Form",
        "/family-planning": "Family Planning Form",
        "/dengue-prevention": "Dengue Prevention Form",
        "/philpen-health": "PhilPen Health Form",
        "/residents": "Resident Records",
        "/calendar": "Barangay Calendar",
        "/admin": "Admin Dashboard",
        "/admin/health-records": "Official Health Records",
        "/admin/workers": "BHW Directory",
        "/admin/settings": "Admin Settings",
      };
      const title = formMap[path] || (document.title ? document.title.replace(" | Subukin", "") : "System Form");
      logActivity("print", {
        entity_type: "document",
        description: `Printed official document / report from ${title}`,
      });
    } catch {}
  });
}

export function bhwCheckIn(
  workerName: string,
  userMeta?: { userId?: string | null; userEmail?: string | null }
) {
  const now = new Date();
  const sessionId = crypto.randomUUID();
  const userId = userMeta?.userId || null;
  const userEmail = userMeta?.userEmail || null;

  const shift: ActiveBhwShift = {
    id: sessionId,
    userId,
    userEmail,
    workerName,
    loginAt: now.toISOString(),
  };

  // 1. Store user-scoped active shift
  if (userId) {
    localStorage.setItem(`bhw_active_shift_${userId}`, JSON.stringify(shift));
  }
  localStorage.setItem("bhw_active_shift", JSON.stringify(shift));
  localStorage.setItem("active_bhw_worker", workerName);
  localStorage.setItem("active_bhw_session_id", sessionId);

  // 2. Add to bhw_attendance_logs
  const dbStr = localStorage.getItem("bhw_attendance_logs") || "[]";
  let logs: any[] = [];
  try {
    logs = JSON.parse(dbStr);
  } catch {
    logs = [];
  }

  // Close any orphaned unclosed shift for this specific user/worker before opening a new one
  logs = logs.map((l: any) => {
    const isSame = (userId && l.userId === userId) || (l.workerName === workerName && !l.logoutAt);
    return isSame ? { ...l, logoutAt: now.toISOString() } : l;
  });

  const newLog = {
    id: sessionId,
    userId,
    userEmail,
    workerName,
    loginAt: now.toISOString(),
    logoutAt: null,
    dateStr: now.toISOString().split("T")[0],
  };
  logs.push(newLog);
  localStorage.setItem("bhw_attendance_logs", JSON.stringify(logs));

  // 3. Mark worker presence online in database if possible
  try {
    if (userId) {
      (supabase.from as any)("bhw_workers")
        .update({ is_online: true, last_seen: now.toISOString() })
        .eq("user_id", userId)
        .then(() => {});
    }
    if (userEmail) {
      (supabase.from as any)("bhw_workers")
        .update({ is_online: true, last_seen: now.toISOString() })
        .eq("gmail", userEmail.toLowerCase().trim())
        .then(() => {});
    }
  } catch {}

  // 4. Broadcast in real time to all tabs and windows
  broadcastAttendance({
    type: "CHECK_IN",
    userId,
    userEmail,
    workerName,
    sessionId,
    loginAt: now.toISOString(),
    timestamp: Date.now(),
  });
}

export function bhwCheckOut(userMeta?: { userId?: string | null; userEmail?: string | null }) {
  const userId = userMeta?.userId;
  const userEmail = userMeta?.userEmail;

  // Retrieve current active shift
  let currentShift: ActiveBhwShift | null = null;
  if (userId) {
    const s = localStorage.getItem(`bhw_active_shift_${userId}`);
    if (s) {
      try { currentShift = JSON.parse(s); } catch {}
    }
  }
  if (!currentShift) {
    const s = localStorage.getItem("bhw_active_shift");
    if (s) {
      try {
        const parsed = JSON.parse(s);
        if (!userId || parsed.userId === userId) {
          currentShift = parsed;
        }
      } catch {}
    }
  }

  const workerName = currentShift?.workerName || localStorage.getItem("active_bhw_worker");
  const sessionId = currentShift?.id || localStorage.getItem("active_bhw_session_id");

  const now = new Date();

  // 1. Update bhw_attendance_logs
  const dbStr = localStorage.getItem("bhw_attendance_logs") || "[]";
  try {
    const logs = JSON.parse(dbStr);
    const updatedLogs = logs.map((log: any) => {
      const isTarget =
        (sessionId && log.id === sessionId) ||
        (userId && log.userId === userId && !log.logoutAt) ||
        (!userId && workerName && log.workerName === workerName && !log.logoutAt);
      return isTarget ? { ...log, logoutAt: now.toISOString() } : log;
    });
    localStorage.setItem("bhw_attendance_logs", JSON.stringify(updatedLogs));
  } catch {}

  // 2. Mark worker presence offline
  try {
    if (userId) {
      (supabase.from as any)("bhw_workers")
        .update({ is_online: false, last_seen: now.toISOString() })
        .eq("user_id", userId)
        .then(() => {});
    }
    if (userEmail) {
      (supabase.from as any)("bhw_workers")
        .update({ is_online: false, last_seen: now.toISOString() })
        .eq("gmail", userEmail.toLowerCase().trim())
        .then(() => {});
    }
  } catch {}

  // 3. Clear active shift keys
  if (userId) {
    localStorage.removeItem(`bhw_active_shift_${userId}`);
  }
  localStorage.removeItem("bhw_active_shift");
  localStorage.removeItem("active_bhw_worker");
  localStorage.removeItem("active_bhw_session_id");

  // 4. Broadcast in real time
  broadcastAttendance({
    type: "CHECK_OUT",
    userId,
    userEmail,
    workerName,
    sessionId,
    logoutAt: now.toISOString(),
    timestamp: Date.now(),
  });
}



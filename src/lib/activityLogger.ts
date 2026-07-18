import { supabase } from "@/integrations/supabase/client";

const SESSION_KEY = "active_session_id";

export async function startSession(userId: string) {
  try {
    const { data, error } = await (supabase.from as any)("user_sessions")
      .insert({ user_id: userId, login_at: new Date().toISOString() })
      .select("id")
      .single();
    if (error) throw error;
    if (data?.id) localStorage.setItem(SESSION_KEY, data.id);
  } catch (e) {
    console.warn("startSession failed", e);
  }
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

export async function logActivity(
  action: string,
  opts?: { entity_type?: string; entity_id?: string; description?: string }
) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    
    // Log to standard Supabase logs
    await (supabase.from as any)("user_activity_logs").insert({
      user_id: user.id,
      action,
      entity_type: opts?.entity_type ?? null,
      entity_id: opts?.entity_id ?? null,
      description: opts?.description ?? null,
    });

    // Also log to BHW specific logs if a BHW worker is checked in
    const activeBhw = localStorage.getItem("active_bhw_worker");
    if (activeBhw) {
      const dbStr = localStorage.getItem("bhw_activity_logs");
      const logs = dbStr ? JSON.parse(dbStr) : [];
      const newLog = {
        id: crypto.randomUUID(),
        workerName: activeBhw,
        action,
        description: opts?.description ?? action,
        timestamp: new Date().toISOString(),
        dateStr: new Date().toISOString().split("T")[0]
      };
      logs.push(newLog);
      localStorage.setItem("bhw_activity_logs", JSON.stringify(logs));
      
      // Dispatch storage/custom event for active UI updates
      window.dispatchEvent(new Event("bhw-attendance-updated"));
    }
  } catch (e) {
    console.warn("logActivity failed", e);
  }
}

export function bhwCheckIn(workerName: string) {
  const now = new Date();
  const sessionId = crypto.randomUUID();
  localStorage.setItem("active_bhw_worker", workerName);
  localStorage.setItem("active_bhw_session_id", sessionId);

  // Add to bhw_attendance_logs
  const dbStr = localStorage.getItem("bhw_attendance_logs") || "[]";
  const logs = JSON.parse(dbStr);
  const newLog = {
    id: sessionId,
    workerName,
    loginAt: now.toISOString(),
    logoutAt: null,
    dateStr: now.toISOString().split("T")[0]
  };
  logs.push(newLog);
  localStorage.setItem("bhw_attendance_logs", JSON.stringify(logs));

  // Log activity
  logActivity("check-in", { description: `BHW worker ${workerName} checked in` });
  
  // Dispatch custom event
  window.dispatchEvent(new Event("bhw-attendance-updated"));
}

export function bhwCheckOut() {
  const workerName = localStorage.getItem("active_bhw_worker");
  const sessionId = localStorage.getItem("active_bhw_session_id");
  if (!workerName || !sessionId) return;

  const now = new Date();

  // Update bhw_attendance_logs
  const dbStr = localStorage.getItem("bhw_attendance_logs") || "[]";
  const logs = JSON.parse(dbStr);
  const updatedLogs = logs.map((log: any) => 
    log.id === sessionId ? { ...log, logoutAt: now.toISOString() } : log
  );
  localStorage.setItem("bhw_attendance_logs", JSON.stringify(updatedLogs));

  // Log activity
  logActivity("check-out", { description: `BHW worker ${workerName} checked out` });

  // Clear active session keys
  localStorage.removeItem("active_bhw_worker");
  localStorage.removeItem("active_bhw_session_id");
  
  // Dispatch custom event
  window.dispatchEvent(new Event("bhw-attendance-updated"));
}


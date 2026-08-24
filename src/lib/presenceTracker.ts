import { supabase } from "@/integrations/supabase/client";

export interface ActivePresenceEntry {
  userId?: string;
  email?: string;
  name?: string;
  isOnline: boolean;
  lastSeen: string;
}

const PRESENCE_KEY = "bhw_active_presence";

export const getActivePresences = (): Record<string, ActivePresenceEntry> => {
  try {
    const raw = localStorage.getItem(PRESENCE_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
};

export const isWorkerOnline = (worker: { id?: string; gmail?: string; user_id?: string | null; is_online?: boolean; last_seen?: string | null }): boolean => {
  if (worker.is_online) return true;

  const presences = getActivePresences();
  const now = Date.now();
  const THRESHOLD_MS = 60 * 1000; // 60 seconds

  const emailKey = worker.gmail?.toLowerCase().trim();
  const userKey = worker.user_id;

  if (emailKey && presences[emailKey]) {
    const p = presences[emailKey];
    if (p.isOnline && (now - new Date(p.lastSeen).getTime() < THRESHOLD_MS)) {
      return true;
    }
  }

  if (userKey && presences[userKey]) {
    const p = presences[userKey];
    if (p.isOnline && (now - new Date(p.lastSeen).getTime() < THRESHOLD_MS)) {
      return true;
    }
  }

  return false;
};

export const recordWorkerPresence = async (
  email?: string | null,
  userId?: string | null,
  name?: string | null,
  isOnline: boolean = true
) => {
  try {
    const cleanEmail = (email || "").toLowerCase().trim();
    const now = new Date().toISOString();

    const presences = getActivePresences();
    const entry: ActivePresenceEntry = {
      userId: userId || undefined,
      email: cleanEmail || undefined,
      name: name || undefined,
      isOnline,
      lastSeen: now,
    };

    if (cleanEmail) presences[cleanEmail] = entry;
    if (userId) presences[userId] = entry;

    localStorage.setItem(PRESENCE_KEY, JSON.stringify(presences));

    // Update database records
    if (userId) {
      await (supabase.from as any)("bhw_workers")
        .update({ is_online: isOnline, last_seen: now })
        .eq("user_id", userId);
    }

    if (cleanEmail) {
      await (supabase.from as any)("bhw_workers")
        .update({ is_online: isOnline, last_seen: now, ...(userId ? { user_id: userId } : {}) })
        .eq("gmail", cleanEmail);
    }

    window.dispatchEvent(new CustomEvent("bhw-worker-status-changed", { detail: { email: cleanEmail, userId, isOnline } }));
    window.dispatchEvent(new Event("storage"));
  } catch (e) {
    console.error("Error recording presence:", e);
  }
};

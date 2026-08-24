import { supabase } from "@/integrations/supabase/client";

export interface ActivePresenceEntry {
  userId?: string;
  email?: string;
  name?: string;
  isOnline: boolean;
  lastSeen: string;
}

const PRESENCE_KEY = "bhw_active_presence";
const ACTIVE_TIMEOUT_MS = 2 * 60 * 1000; // 2 minutes window for active device heartbeat

export const getActivePresences = (): Record<string, ActivePresenceEntry> => {
  try {
    const raw = localStorage.getItem(PRESENCE_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
};

/**
 * Checks whether a worker account is currently active/online on any device or site.
 * Validates database flags, cross-device last_seen timestamps, and local active presences.
 */
export const isWorkerOnline = (worker: {
  id?: string;
  gmail?: string;
  user_id?: string | null;
  is_online?: boolean;
  last_seen?: string | null;
}): boolean => {
  const now = Date.now();

  // 1. Check local presence cache first (instant local tab/device detection)
  const presences = getActivePresences();
  const emailKey = worker.gmail?.toLowerCase().trim();
  const userKey = worker.user_id;

  if (emailKey && presences[emailKey]) {
    const p = presences[emailKey];
    if (p.isOnline && (now - new Date(p.lastSeen).getTime() < ACTIVE_TIMEOUT_MS)) {
      return true;
    }
  }

  if (userKey && presences[userKey]) {
    const p = presences[userKey];
    if (p.isOnline && (now - new Date(p.lastSeen).getTime() < ACTIVE_TIMEOUT_MS)) {
      return true;
    }
  }

  // 2. Check remote database last_seen timestamp (cross-device & external site detection)
  if (worker.last_seen) {
    const lastSeenTime = new Date(worker.last_seen).getTime();
    if (!isNaN(lastSeenTime)) {
      const timeDiff = now - lastSeenTime;
      // If heartbeated on any device within the active timeout window
      if (timeDiff < ACTIVE_TIMEOUT_MS) {
        return worker.is_online !== false;
      }
    }
  }

  // 3. If marked online but last_seen is missing or within recent threshold
  if (worker.is_online) {
    if (!worker.last_seen) return true;
    const lastSeenTime = new Date(worker.last_seen).getTime();
    if (!isNaN(lastSeenTime) && now - lastSeenTime < ACTIVE_TIMEOUT_MS) {
      return true;
    }
  }

  return false;
};

/**
 * Records active presence in the central database and local cache whenever
 * an account is logged in or used on any device or browser.
 */
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

    // Update database records so other devices / admin panel on any site detect it
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

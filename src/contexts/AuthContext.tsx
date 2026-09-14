import { createContext, useContext, useEffect, useState, useRef, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { startSession, endSession, logActivity } from "@/lib/activityLogger";
import { recordWorkerPresence } from "@/lib/presenceTracker";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ShieldAlert, LogOut } from "lucide-react";

interface AuthContextType {
  session: Session | null;
  user: User | null;
  userRole: string | null;
  isMidwife: boolean;
  username: string | null;
  fullName: string | null;
  avatarUrl: string | null;
  loading: boolean;
  signOut: () => Promise<void>;
  setUsername: (name: string | null) => void;
  setAvatarUrl: (url: string | null) => void;
  refreshProfile: () => Promise<void>;
  updateProfileState: (data: { username?: string; full_name?: string; avatar_url?: string | null }) => void;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  userRole: null,
  isMidwife: false,
  username: null,
  fullName: null,
  avatarUrl: null,
  loading: true,
  signOut: async () => {},
  setUsername: () => {},
  setAvatarUrl: () => {},
  refreshProfile: async () => {},
  updateProfileState: () => {},
});

export const useAuth = () => useContext(AuthContext);

const STORAGE_KEY_ACTIVE_INSTANCE = "bhw_active_instance_id";
const STORAGE_KEY_ACTIVE_INSTANCE_USER_PREFIX = "bhw_active_instance_for_";
const INSTANCE_BROADCAST_CHANNEL = "bhw_site_instance_channel";

export const getTabInstanceId = (): string => {
  if (typeof window === "undefined") return "server";
  if ((window as any).__bhwTabInstanceId) {
    return (window as any).__bhwTabInstanceId;
  }
  let id = sessionStorage.getItem("bhw_site_tab_instance_id");
  if (!id || (window.name && window.name !== id)) {
    id = "inst_" + Date.now() + "_" + Math.random().toString(36).substring(2, 9);
    sessionStorage.setItem("bhw_site_tab_instance_id", id);
    window.name = id;
  } else if (!window.name) {
    window.name = id;
  }
  (window as any).__bhwTabInstanceId = id;
  return id;
};

const getSessionNoticeText = (type: "switched" | "logged_out") => {
  const lang = (typeof window !== "undefined" && localStorage.getItem("language")) || "tl";
  if (type === "switched") {
    return lang === "tl"
      ? "Nag-expire ang iyong sesyon dahil may nag-sign in na ibang account sa browser na ito. Para sa seguridad, isang account lamang ang maaaring aktibo bawat browser (katulad ng Facebook). Upang magbukas ng karagdagang account, gumamit ng Incognito o ibang browser tulad ng Microsoft Edge."
      : "Session Expired: Another account was logged into on this browser. For system security, only one active account is permitted per browser instance (similar to Facebook). Use Incognito mode or another browser (such as Microsoft Edge) to use multiple accounts.";
  }
  return lang === "tl"
    ? "Naka-log out: Ang iyong sesyon ay isinara mula sa ibang tab o window sa browser na ito."
    : "Signed out: Your session was ended from another tab or window in this browser.";
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const activeUserIdRef = useRef<string | null>(null);
  const activeSessionRef = useRef<Session | null>(null);
  const myInstanceIdRef = useRef<string>(getTabInstanceId());
  const [sessionExpiredModalOpen, setSessionExpiredModalOpen] = useState(false);
  const hasInitializedAuthRef = useRef<boolean>(false);
  const [userRole, setUserRole] = useState<string | null>(() => {
    try {
      return localStorage.getItem("bhw_user_role") || null;
    } catch {
      return null;
    }
  });
  const [username, setUsername] = useState<string | null>(() => {
    try {
      return localStorage.getItem("logged_in_username") || null;
    } catch {
      return null;
    }
  });
  const [fullName, setFullName] = useState<string | null>(() => {
    try {
      return localStorage.getItem("logged_in_fullname") || null;
    } catch {
      return null;
    }
  });
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const isMidwife = Boolean(
    userRole?.toLowerCase() === "midwife" ||
    user?.email?.toLowerCase().includes("maryjanelandicho") ||
    user?.email?.toLowerCase().includes("midwife") ||
    fullName?.toLowerCase().includes("mary jane") ||
    username?.toLowerCase().includes("mary jane") ||
    (typeof window !== "undefined" && (
      localStorage.getItem("logged_in_username")?.toLowerCase().includes("mary jane") ||
      localStorage.getItem("logged_in_fullname")?.toLowerCase().includes("mary jane") ||
      localStorage.getItem("active_bhw_worker")?.toLowerCase().includes("mary jane") ||
      localStorage.getItem("bhw_user_role")?.toLowerCase() === "midwife"
    ))
  );

  const fetchRole = async (userId: string) => {
    try {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .maybeSingle();

      if (data?.role) {
        const cleanRole = data.role.toLowerCase();
        setUserRole(cleanRole);
        localStorage.setItem("bhw_user_role", cleanRole);
        return cleanRole;
      }

      // Fallback role detection if user_roles entry is missing
      const { data: userData } = await supabase.auth.getUser();
      const email = (userData?.user?.email || "").toLowerCase();
      // Cristeta R. Lanuza is the BHW Supervisory admin
      const isSupervisor = email.includes("cristetalanuza") || email === "adminsubukin@gmail.com";
      // Mary Jane Landicho is the Midwife (view-only user dashboard)
      const isMidwifeUser = email.includes("maryjanelandicho") || email.includes("midwife");
      const isBns = email.includes("bns");
      const fallbackRole = isSupervisor ? "supervisor" : isMidwifeUser ? "midwife" : isBns ? "bns" : "bhw";
      setUserRole(fallbackRole);
      localStorage.setItem("bhw_user_role", fallbackRole);
      return fallbackRole;
    } catch (e) {
      console.error("Error fetching user role:", e);
      setUserRole("bhw");
      return "bhw";
    }
  };

  const fetchProfile = async (userId: string, userEmail?: string | null) => {
    try {
      const cleanEmail = (userEmail || user?.email || "").toLowerCase().trim();
      const { data } = await supabase
        .from("profiles")
        .select("username, full_name, avatar_url, settings")
        .eq("user_id", userId)
        .maybeSingle();

      // Check if user explicitly removed their avatar
      const isRemoved = 
        localStorage.getItem("bhw_avatar_removed_" + userId) === "true" ||
        (cleanEmail && localStorage.getItem("bhw_avatar_removed_" + cleanEmail) === "true");

      let userAvatar: string | null = null;
      if (!isRemoved) {
        userAvatar = (data as any)?.avatar_url || null;
        if (!userAvatar) {
          userAvatar = 
            localStorage.getItem("bhw_avatar_" + userId) ||
            (cleanEmail ? localStorage.getItem("bhw_avatar_" + cleanEmail) : null) ||
            (username ? localStorage.getItem("bhw_avatar_" + username.toLowerCase().trim()) : null);
        }
      }

      if (userAvatar && !isRemoved) {
        localStorage.setItem("bhw_avatar_" + userId, userAvatar);
        if (cleanEmail) localStorage.setItem("bhw_avatar_" + cleanEmail, userAvatar);
        setAvatarUrl(userAvatar);
      } else {
        localStorage.removeItem("bhw_avatar_" + userId);
        if (cleanEmail) localStorage.removeItem("bhw_avatar_" + cleanEmail);
        setAvatarUrl(null);
      }

      // Synchronize user settings (theme, font size, font style, etc.)
      const savedSettings = (data as any)?.settings;
      if (savedSettings) {
        localStorage.setItem("bhw_settings_" + userId, JSON.stringify(savedSettings));
        if (cleanEmail) localStorage.setItem("bhw_settings_" + cleanEmail, JSON.stringify(savedSettings));
      }
      window.dispatchEvent(new CustomEvent("bhw-user-settings-sync", { detail: { userId, email: cleanEmail, settings: savedSettings } }));

      if (data) {
        if (data.username) {
          localStorage.setItem("logged_in_username", data.username);
          setUsername(data.username);
        } else {
          setUsername(null);
        }
        if ((data as any).full_name) {
          localStorage.setItem("logged_in_fullname", (data as any).full_name);
          setFullName((data as any).full_name);
        } else {
          setFullName(null);
        }
      }
    } catch (e) {
      console.error("Error fetching user profile:", e);
    }
  };

  const refreshProfile = async () => {
    if (user?.id) {
      await fetchProfile(user.id, user.email);
    }
  };

  const updateProfileState = (data: { username?: string; full_name?: string; avatar_url?: string | null }) => {
    if (data.username !== undefined) {
      setUsername(data.username || null);
      if (data.username) localStorage.setItem("logged_in_username", data.username);
      else localStorage.removeItem("logged_in_username");
    }
    if (data.full_name !== undefined) {
      setFullName(data.full_name || null);
      if (data.full_name) localStorage.setItem("logged_in_fullname", data.full_name);
      else localStorage.removeItem("logged_in_fullname");
    }
    if (data.avatar_url !== undefined) {
      setAvatarUrl(data.avatar_url);
      if (user?.id) {
        if (data.avatar_url) {
          localStorage.setItem("bhw_avatar_" + user.id, data.avatar_url);
          localStorage.removeItem("bhw_avatar_removed_" + user.id);
          if (user.email) {
            localStorage.setItem("bhw_avatar_" + user.email.toLowerCase().trim(), data.avatar_url);
            localStorage.removeItem("bhw_avatar_removed_" + user.email.toLowerCase().trim());
          }
        } else {
          localStorage.removeItem("bhw_avatar_" + user.id);
          localStorage.setItem("bhw_avatar_removed_" + user.id, "true");
          if (user.email) {
            localStorage.removeItem("bhw_avatar_" + user.email.toLowerCase().trim());
            localStorage.setItem("bhw_avatar_removed_" + user.email.toLowerCase().trim(), "true");
          }
        }
      }
    }
    window.dispatchEvent(new Event("profile-updated"));
  };

  const updateOnlineStatus = async (userId: string, online: boolean, userEmail?: string | null) => {
    try {
      await recordWorkerPresence(userEmail || user?.email, userId, fullName || username, online);
    } catch (e) {
      console.error("Error updating online status:", e);
    }
  };

  // Heartbeat to keep active online status synced across devices, browsers, and sites
  useEffect(() => {
    if (!user) return;

    let lastPing = Date.now();
    updateOnlineStatus(user.id, true, user.email);

    // Regular background interval
    const interval = setInterval(() => {
      lastPing = Date.now();
      updateOnlineStatus(user.id, true, user.email);
    }, 15000);

    // Trigger immediate refresh when returning to tab or unlocking screen on phone/tablet
    const handleActiveWakeup = () => {
      if (document.visibilityState === "visible" || document.hasFocus()) {
        const now = Date.now();
        if (now - lastPing > 5000) {
          lastPing = now;
          updateOnlineStatus(user.id, true, user.email);
        }
      }
    };

    const handleBeforeUnload = () => {
      updateOnlineStatus(user.id, false, user.email);
    };

    window.addEventListener("focus", handleActiveWakeup);
    document.addEventListener("visibilitychange", handleActiveWakeup);
    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("pagehide", handleBeforeUnload);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", handleActiveWakeup);
      document.removeEventListener("visibilitychange", handleActiveWakeup);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("pagehide", handleBeforeUnload);
    };
  }, [user]);

  const claimActiveInstance = (instanceId: string, targetUserId?: string | null) => {
    if (typeof window === "undefined") return;
    try {
      const uid = targetUserId || activeUserIdRef.current;
      sessionStorage.removeItem("bhw_instance_expired");
      if (uid) {
        localStorage.setItem(`${STORAGE_KEY_ACTIVE_INSTANCE_USER_PREFIX}${uid}`, instanceId);
        localStorage.setItem(`${STORAGE_KEY_ACTIVE_INSTANCE_USER_PREFIX}${uid}_time`, Date.now().toString());
      }
      localStorage.setItem(STORAGE_KEY_ACTIVE_INSTANCE, instanceId);
      localStorage.setItem(STORAGE_KEY_ACTIVE_INSTANCE + "_time", Date.now().toString());

      if ("BroadcastChannel" in window) {
        const bc = new BroadcastChannel(INSTANCE_BROADCAST_CHANNEL);
        bc.postMessage({
          type: "CLAIM_ACTIVE_INSTANCE",
          instanceId: instanceId,
          userId: uid,
          timestamp: Date.now(),
        });
        bc.close();
      }
    } catch (err) {
      console.warn("Failed to claim active instance:", err);
    }
  };

  const checkInstanceConflict = (claimedInstanceId: string, claimedUserId?: string | null) => {
    const myId = myInstanceIdRef.current;
    if (!claimedInstanceId || claimedInstanceId === myId) return;

    const myUserId = activeUserIdRef.current;
    if (!myUserId) return;

    // Rule: "You are not allowed to open the same account on any site. You may only use different accounts on different sites simultaneously."
    // If the claim is explicitly for a DIFFERENT user account: allow them to run simultaneously!
    if (claimedUserId && claimedUserId !== myUserId) {
      return;
    }

    // If claimed session is for the SAME account or active instance for my account changed:
    const activeInstanceForMyUser = localStorage.getItem(`${STORAGE_KEY_ACTIVE_INSTANCE_USER_PREFIX}${myUserId}`);
    const isSameAccountConflict = (claimedUserId && claimedUserId === myUserId) || (activeInstanceForMyUser && activeInstanceForMyUser !== myId);

    if (isSameAccountConflict && (activeUserIdRef.current || activeSessionRef.current)) {
      sessionStorage.setItem("bhw_instance_expired", "true");
      setSessionExpiredModalOpen(true);
    }
  };

  const checkRemoteSameAccountConflict = async (userId: string) => {
    try {
      const mySessionId = sessionStorage.getItem("bhw_current_session_id") || localStorage.getItem("active_session_id");
      if (!mySessionId) return;

      const { data, error } = await (supabase.from as any)("user_sessions")
        .select("id, login_at")
        .eq("user_id", userId)
        .is("logout_at", null)
        .order("login_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!error && data?.id && data.id !== mySessionId) {
        // A newer session for the same account was opened on another site or browser
        sessionStorage.setItem("bhw_instance_expired", "true");
        setSessionExpiredModalOpen(true);
      }
    } catch (err) {
      // ignore
    }
  };

  const handleAcknowledgeSessionExpired = async () => {
    setSessionExpiredModalOpen(false);
    sessionStorage.setItem("bhw_instance_expired", "true");

    if (user) {
      try {
        await logActivity("logout", { description: "Session expired: acknowledged single account policy" });
        await updateOnlineStatus(user.id, false, user.email);
      } catch (err) {
        console.warn("Logout error on session expired acknowledge:", err);
      }
    }

    // Invalidate local in-memory session only so the other tab retains its valid session
    setSession(null);
    setUser(null);
    setUserRole(null);
    setUsername(null);
    setFullName(null);
    setAvatarUrl(null);
    activeUserIdRef.current = null;
    activeSessionRef.current = null;

    // Redirect to login
    window.location.href = "/auth";
  };

  useEffect(() => {
    activeSessionRef.current = session;
  }, [session]);

  // Enforce single active session per account across tabs/windows and remote sites
  useEffect(() => {
    const myId = myInstanceIdRef.current;

    let bc: BroadcastChannel | null = null;
    if (typeof window !== "undefined" && "BroadcastChannel" in window) {
      try {
        bc = new BroadcastChannel(INSTANCE_BROADCAST_CHANNEL);
        bc.onmessage = (event) => {
          if (event.data?.type === "CLAIM_ACTIVE_INSTANCE" && event.data?.instanceId) {
            checkInstanceConflict(event.data.instanceId, event.data.userId);
          }
        };
      } catch (err) {
        console.warn("BroadcastChannel error:", err);
      }
    }

    const handleStorageChange = (e: StorageEvent) => {
      const myUserId = activeUserIdRef.current;
      if (myUserId && e.key === `${STORAGE_KEY_ACTIVE_INSTANCE_USER_PREFIX}${myUserId}` && e.newValue) {
        checkInstanceConflict(e.newValue, myUserId);
      }
    };
    window.addEventListener("storage", handleStorageChange);

    const checkActiveInstance = () => {
      const myUserId = activeUserIdRef.current;
      if (myUserId) {
        const activeIdForMyUser = localStorage.getItem(`${STORAGE_KEY_ACTIVE_INSTANCE_USER_PREFIX}${myUserId}`);
        if (activeIdForMyUser && activeIdForMyUser !== myId) {
          checkInstanceConflict(activeIdForMyUser, myUserId);
        }
        checkRemoteSameAccountConflict(myUserId);
      }
    };

    const intervalId = setInterval(checkActiveInstance, 3000);
    window.addEventListener("focus", checkActiveInstance);
    document.addEventListener("visibilitychange", checkActiveInstance);

    return () => {
      if (bc) {
        try {
          bc.close();
        } catch (e) {}
      }
      window.removeEventListener("storage", handleStorageChange);
      clearInterval(intervalId);
      window.removeEventListener("focus", checkActiveInstance);
      document.removeEventListener("visibilitychange", checkActiveInstance);
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    const handleAuthSession = async (event: string | null, currentSession: Session | null) => {
      if (!isMounted) return;

      // If this specific tab instance was marked as expired, do not restore the session
      if (sessionStorage.getItem("bhw_instance_expired") === "true") {
        setSession(null);
        setUser(null);
        setLoading(false);
        return;
      }

      const previousUserId = activeUserIdRef.current;
      const nextUserId = currentSession?.user?.id || null;

      // Facebook-style session expiration/override when another account authenticates in this browser
      if (hasInitializedAuthRef.current) {
        if (previousUserId && nextUserId && previousUserId !== nextUserId) {
          toast.warning(getSessionNoticeText("switched"), {
            duration: 10000,
            id: "session-switched-warning",
          });
        } else if (previousUserId && !nextUserId) {
          toast.info(getSessionNoticeText("logged_out"), {
            duration: 6000,
            id: "session-logged-out-info",
          });
        }
      }

      activeUserIdRef.current = nextUserId;
      activeSessionRef.current = currentSession;
      hasInitializedAuthRef.current = true;

      setSession(currentSession);
      setUser(currentSession?.user ?? null);

      if (currentSession?.user) {
        // Track active user ID & email for persistent settings and avatar synchronization
        localStorage.setItem("bhw_active_user_id", currentSession.user.id);
        if (currentSession.user.email) {
          localStorage.setItem("bhw_active_user_email", currentSession.user.email.toLowerCase().trim());
        }

        // Claim active instance for this tab & specific user account
        claimActiveInstance(myInstanceIdRef.current, currentSession.user.id);

        await Promise.all([
          fetchRole(currentSession.user.id),
          fetchProfile(currentSession.user.id, currentSession.user.email),
          updateOnlineStatus(currentSession.user.id, true, currentSession.user.email),
        ]);

        if (event === "SIGNED_IN") {
          startSession(currentSession.user.id).then((newId) => {
            if (newId) sessionStorage.setItem("bhw_current_session_id", newId);
          });
          logActivity("login", { description: "Signed in to the system" });
        } else {
          // Verify or initialize active session record in sessionStorage
          const existingSessionId = sessionStorage.getItem("bhw_current_session_id") || localStorage.getItem("active_session_id");
          if (!existingSessionId) {
            (supabase.from as any)("user_sessions")
              .select("id")
              .eq("user_id", currentSession.user.id)
              .is("logout_at", null)
              .order("login_at", { ascending: false })
              .limit(1)
              .maybeSingle()
              .then(({ data }: any) => {
                if (data?.id) {
                  sessionStorage.setItem("bhw_current_session_id", data.id);
                  localStorage.setItem("active_session_id", data.id);
                } else {
                  startSession(currentSession.user.id).then((newId) => {
                    if (newId) sessionStorage.setItem("bhw_current_session_id", newId);
                  });
                }
              });
          }
        }
      } else {
        setUserRole(null);
        setUsername(null);
        setFullName(null);
        setAvatarUrl(null);
        localStorage.removeItem("logged_in_username");
        localStorage.removeItem("logged_in_fullname");
        localStorage.removeItem("bhw_user_role");
      }

      if (isMounted) {
        setLoading(false);
      }
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      handleAuthSession(event, session);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      handleAuthSession(null, session);
    });

    // Check browser session on focus/visibility change so inactive tabs re-sync immediately
    const handleBrowserTabSync = async () => {
      if (document.visibilityState === "visible" || document.hasFocus()) {
        try {
          const { data } = await supabase.auth.getSession();
          const storedUserId = data.session?.user?.id || null;
          if (activeUserIdRef.current !== storedUserId) {
            handleAuthSession("SESSION_SYNC", data.session);
          }
        } catch (err) {
          console.error("Session sync check error:", err);
        }
      }
    };

    window.addEventListener("focus", handleBrowserTabSync);
    document.addEventListener("visibilitychange", handleBrowserTabSync);

    return () => {
      isMounted = false;
      subscription.unsubscribe();
      window.removeEventListener("focus", handleBrowserTabSync);
      document.removeEventListener("visibilitychange", handleBrowserTabSync);
    };
  }, []);

  const signOut = async () => {
    const prevUserId = activeUserIdRef.current;
    activeUserIdRef.current = null;
    activeSessionRef.current = null;
    sessionStorage.removeItem("bhw_instance_expired");
    sessionStorage.removeItem("bhw_current_session_id");
    localStorage.removeItem(STORAGE_KEY_ACTIVE_INSTANCE);
    localStorage.removeItem(STORAGE_KEY_ACTIVE_INSTANCE + "_time");
    if (prevUserId) {
      localStorage.removeItem(`${STORAGE_KEY_ACTIVE_INSTANCE_USER_PREFIX}${prevUserId}`);
      localStorage.removeItem(`${STORAGE_KEY_ACTIVE_INSTANCE_USER_PREFIX}${prevUserId}_time`);
    }
    if (user) {
      await logActivity("logout", { description: "Signed out of the system" });
      await endSession();
      await updateOnlineStatus(user.id, false, user.email);
    }
    localStorage.removeItem("logged_in_username");
    localStorage.removeItem("logged_in_fullname");
    localStorage.removeItem("bhw_user_role");
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setUserRole(null);
    setUsername(null);
    setFullName(null);
    setAvatarUrl(null);
  };

  return (
    <AuthContext.Provider value={{ session, user, userRole, isMidwife, username, fullName, avatarUrl, loading, signOut, setUsername, setAvatarUrl, refreshProfile, updateProfileState }}>
      {children}

      {/* Session Expired Modal - Single Account Across Sites Policy */}
      <AlertDialog open={sessionExpiredModalOpen}>
        <AlertDialogContent className="max-w-md bg-card border border-destructive/30 shadow-2xl p-6">
          <AlertDialogHeader className="space-y-3">
            <div className="mx-auto w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center text-destructive mb-1">
              <ShieldAlert className="h-7 w-7" />
            </div>
            <AlertDialogTitle className="text-xl font-bold text-center text-foreground">
              {localStorage.getItem("language") === "en" ? "Session Expired" : "Nag-expire ang Sesyon"}
            </AlertDialogTitle>
            <div className="flex justify-center">
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                {localStorage.getItem("language") === "en" ? "Single Account Policy • One Site at a Time" : "Patakaran sa Iisang Account • Isang Site Lamang"}
              </span>
            </div>
            <AlertDialogDescription className="text-sm text-muted-foreground text-center space-y-2 pt-2 leading-relaxed">
              <span className="block text-foreground font-medium">
                {localStorage.getItem("language") === "en"
                  ? "This account has been opened in another site or window."
                  : "Ang account na ito ay binuksan sa ibang site o window."}
              </span>
              <span className="block text-xs">
                {localStorage.getItem("language") === "en"
                  ? "You are not allowed to open the same account on any site simultaneously. You may only use different accounts on different sites simultaneously. The previous session in this window has expired. Please acknowledge to proceed to log out."
                  : "Hindi pinapayagang buksan ang parehong account sa alinmang site nang sabay. Maaari lamang gumamit ng magkaibang account sa magkaibang site nang sabay. Ang dating sesyon sa window na ito ay nag-expire na. Paki-acknowledge upang mag-log out."}
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6 sm:justify-center">
            <AlertDialogAction
              onClick={handleAcknowledgeSessionExpired}
              className="w-full bg-destructive hover:bg-destructive/90 text-destructive-foreground font-semibold py-2.5 flex items-center justify-center gap-2 shadow-md cursor-pointer"
            >
              <LogOut className="h-4 w-4" />
              {localStorage.getItem("language") === "en" ? "Acknowledge & Log Out" : "I-acknowledge at Mag-log Out"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AuthContext.Provider>
  );
};

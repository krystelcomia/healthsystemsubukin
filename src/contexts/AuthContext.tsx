import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { startSession, endSession, logActivity } from "@/lib/activityLogger";
import { recordWorkerPresence } from "@/lib/presenceTracker";

interface AuthContextType {
  session: Session | null;
  user: User | null;
  userRole: string | null;
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

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [fullName, setFullName] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchRole = async (userId: string) => {
    try {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .maybeSingle();

      if (data?.role) {
        setUserRole(data.role);
        return data.role;
      }

      // Fallback role detection if user_roles entry is missing
      const { data: userData } = await supabase.auth.getUser();
      const email = userData?.user?.email || "";
      const fallbackRole = (email === "adminsubukin@gmail.com" || email.includes("admin")) ? "supervisor" : "bhw";
      setUserRole(fallbackRole);
      return fallbackRole;
    } catch (e) {
      console.error("Error fetching user role:", e);
      setUserRole("bhw");
      return "bhw";
    }
  };

  const fetchProfile = async (userId: string) => {
    try {
      const { data } = await supabase
        .from("profiles")
        .select("username, full_name, avatar_url")
        .eq("user_id", userId)
        .maybeSingle();

      let userAvatar: string | null = (data as any)?.avatar_url || null;

      if (!userAvatar) {
        userAvatar = 
          localStorage.getItem("bhw_avatar_" + userId) ||
          (user?.email ? localStorage.getItem("bhw_avatar_" + user.email.toLowerCase().trim()) : null) ||
          (username ? localStorage.getItem("bhw_avatar_" + username.toLowerCase().trim()) : null);
      }

      if (userAvatar) {
        localStorage.setItem("bhw_avatar_" + userId, userAvatar);
        setAvatarUrl(userAvatar);
      } else {
        setAvatarUrl(null);
      }

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
      await fetchProfile(user.id);
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
          if (user.email) localStorage.setItem("bhw_avatar_" + user.email.toLowerCase().trim(), data.avatar_url);
        } else {
          localStorage.removeItem("bhw_avatar_" + user.id);
          if (user.email) localStorage.removeItem("bhw_avatar_" + user.email.toLowerCase().trim());
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

  // Heartbeat to keep active online status synced across devices and tabs
  useEffect(() => {
    if (!user) return;

    updateOnlineStatus(user.id, true, user.email);

    const interval = setInterval(() => {
      updateOnlineStatus(user.id, true, user.email);
    }, 12000);

    const handleBeforeUnload = () => {
      updateOnlineStatus(user.id, false, user.email);
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      clearInterval(interval);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [user]);

  useEffect(() => {
    let isMounted = true;

    const handleAuthSession = async (event: string | null, currentSession: Session | null) => {
      if (!isMounted) return;
      setSession(currentSession);
      setUser(currentSession?.user ?? null);

      if (currentSession?.user) {
        await Promise.all([
          fetchRole(currentSession.user.id),
          fetchProfile(currentSession.user.id),
          updateOnlineStatus(currentSession.user.id, true, currentSession.user.email),
        ]);

        if (event === "SIGNED_IN") {
          startSession(currentSession.user.id);
          logActivity("login", { description: "Signed in to the system" });
        }
      } else {
        setUserRole(null);
        setUsername(null);
        setFullName(null);
        setAvatarUrl(null);
        localStorage.removeItem("logged_in_username");
        localStorage.removeItem("logged_in_fullname");
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

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    if (user) {
      await logActivity("logout", { description: "Signed out of the system" });
      await endSession();
      await updateOnlineStatus(user.id, false, user.email);
    }
    localStorage.removeItem("logged_in_username");
    localStorage.removeItem("logged_in_fullname");
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setUserRole(null);
    setUsername(null);
    setFullName(null);
    setAvatarUrl(null);
  };

  return (
    <AuthContext.Provider value={{ session, user, userRole, username, fullName, avatarUrl, loading, signOut, setUsername, setAvatarUrl, refreshProfile, updateProfileState }}>
      {children}
    </AuthContext.Provider>
  );
};

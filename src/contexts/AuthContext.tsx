import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { startSession, endSession, logActivity } from "@/lib/activityLogger";

interface AuthContextType {
  session: Session | null;
  user: User | null;
  userRole: string | null;
  username: string | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  userRole: null,
  username: null,
  loading: true,
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchRole = async (userId: string) => {
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .maybeSingle();
    setUserRole(data?.role || null);
  };

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("username")
      .eq("user_id", userId)
      .maybeSingle();
    setUsername(data?.username || null);
  };

  const updateOnlineStatus = async (userId: string, online: boolean) => {
    await (supabase.from as any)("bhw_workers")
      .update({ is_online: online, last_seen: new Date().toISOString() })
      .eq("user_id", userId);
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          setTimeout(() => fetchRole(session.user.id), 0);
          setTimeout(() => fetchProfile(session.user.id), 0);
          setTimeout(() => updateOnlineStatus(session.user.id, true), 0);
          if (event === "SIGNED_IN") {
            setTimeout(() => {
              startSession(session.user.id);
              logActivity("login", { description: "Signed in to the system" });
            }, 0);
          }
        } else {
          setUserRole(null);
          setUsername(null);
        }
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchRole(session.user.id);
        fetchProfile(session.user.id);
        updateOnlineStatus(session.user.id, true);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    if (user) {
      await logActivity("logout", { description: "Signed out of the system" });
      await endSession();
      await updateOnlineStatus(user.id, false);
    }
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setUserRole(null);
    setUsername(null);
  };

  return (
    <AuthContext.Provider value={{ session, user, userRole, username, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

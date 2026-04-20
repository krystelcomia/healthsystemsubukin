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
    await (supabase.from as any)("user_activity_logs").insert({
      user_id: user.id,
      action,
      entity_type: opts?.entity_type ?? null,
      entity_id: opts?.entity_id ?? null,
      description: opts?.description ?? null,
    });
  } catch (e) {
    console.warn("logActivity failed", e);
  }
}

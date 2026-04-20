import { useEffect, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User, Pencil, Save, Camera, Mail, AtSign, IdCard, ShieldCheck, Loader2, X, Clock, LogIn, LogOut, Activity as ActivityIcon, Calendar } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useSettings } from "@/contexts/SettingsContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

const ProfilePage = () => {
  const { user, userRole } = useAuth();
  const { t } = useSettings();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Activity tracking
  const [sessions, setSessions] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [activityLoading, setActivityLoading] = useState(false);
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");

  const fetchActivity = async () => {
    if (!user) return;
    setActivityLoading(true);
    let sQ = (supabase.from as any)("user_sessions").select("*").eq("user_id", user.id).order("login_at", { ascending: false }).limit(200);
    let aQ = (supabase.from as any)("user_activity_logs").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(200);
    if (fromDate) { sQ = sQ.gte("login_at", fromDate); aQ = aQ.gte("created_at", fromDate); }
    if (toDate) {
      const end = new Date(toDate); end.setDate(end.getDate() + 1);
      sQ = sQ.lt("login_at", end.toISOString()); aQ = aQ.lt("created_at", end.toISOString());
    }
    const [{ data: sData }, { data: aData }] = await Promise.all([sQ, aQ]);
    setSessions(sData || []);
    setActivities(aData || []);
    setActivityLoading(false);
  };

  useEffect(() => { fetchActivity(); /* eslint-disable-next-line */ }, [user, fromDate, toDate]);

  useEffect(() => {
    if (!user) return;
    setEmail(user.email || "");
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("full_name, username, avatar_url")
        .eq("user_id", user.id)
        .maybeSingle();
      setFullName(data?.full_name || "");
      setUsername(data?.username || "");
      setAvatarUrl((data as any)?.avatar_url || null);
      setLoading(false);
    })();
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: fullName, username })
      .eq("user_id", user.id);
    if (error) toast.error(t("profile.saveFailed") || "Failed to save profile");
    else {
      toast.success(t("profile.updated") || "Profile updated!");
      setEditing(false);
    }
    setSaving(false);
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5MB");
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${user.id}/avatar-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
      const url = pub.publicUrl;
      const { error: updErr } = await supabase.from("profiles").update({ avatar_url: url } as any).eq("user_id", user.id);
      if (updErr) throw updErr;
      setAvatarUrl(url);
      toast.success("Profile picture updated!");
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const removeAvatar = async () => {
    if (!user) return;
    await supabase.from("profiles").update({ avatar_url: null } as any).eq("user_id", user.id);
    setAvatarUrl(null);
    toast.success("Profile picture removed");
  };

  const initials = (fullName || username || email || "U")
    .split(/\s+/).map((s) => s[0]).slice(0, 2).join("").toUpperCase();

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <Card className="w-full overflow-hidden border-border/50 shadow-sm">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex flex-col md:flex-row md:items-center gap-4">
              <div className="relative group">
                <Avatar className="h-32 w-32 ring-4 ring-background shadow-xl">
                  {avatarUrl && <AvatarImage src={avatarUrl} alt={fullName || "avatar"} />}
                  <AvatarFallback className="text-3xl font-heading bg-secondary text-secondary-foreground">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="absolute bottom-1 right-1 h-9 w-9 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:scale-105 transition-transform disabled:opacity-60"
                  aria-label="Change profile picture"
                >
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarChange}
                />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-heading font-bold text-foreground">
                  {fullName || username || t("profile.title")}
                </h1>
                <div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1"><AtSign className="h-3.5 w-3.5" />{username || "—"}</span>
                  <span className="hidden md:inline">•</span>
                  <span className="flex items-center gap-1"><Mail className="h-3.5 w-3.5" />{email}</span>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              {avatarUrl && (
                <Button variant="outline" size="sm" onClick={removeAvatar}>
                  <X className="h-4 w-4 mr-1" /> Remove photo
                </Button>
              )}
              {!editing && (
                <Button onClick={() => setEditing(true)}>
                  <Pencil className="h-4 w-4 mr-1" /> {t("common.edit")}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats / Quick info row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-border/50">
          <CardContent className="p-5 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t("profile.role") || "Role"}</p>
              <p className="font-semibold text-foreground capitalize">{userRole || "—"}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-5 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <IdCard className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">{t("profile.userId") || "User ID"}</p>
              <p className="font-mono text-xs text-foreground truncate">{user?.id || "—"}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-5 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <User className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t("profile.status") || "Status"}</p>
              <p className="font-semibold text-foreground">Active</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Personal information */}
      <Card className="border-border/50 shadow-sm">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-heading font-semibold text-foreground">{t("profile.info")}</h2>
              <p className="text-sm text-muted-foreground">{t("profile.desc")}</p>
            </div>
          </div>

          {loading ? (
            <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">{t("profile.fullName")}</Label>
                {editing ? (
                  <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder={t("profile.fullName")} />
                ) : (
                  <p className="text-foreground font-medium py-2 border-b border-border/50">{fullName || "—"}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">{t("profile.username")}</Label>
                {editing ? (
                  <Input value={username} onChange={(e) => setUsername(e.target.value)} placeholder={t("profile.username")} />
                ) : (
                  <p className="text-foreground font-medium py-2 border-b border-border/50">{username || "—"}</p>
                )}
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">{t("profile.email")}</Label>
                <p className="text-foreground font-medium py-2 border-b border-border/50 flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" /> {email}
                </p>
              </div>

              {editing && (
                <div className="md:col-span-2 flex gap-2 pt-2">
                  <Button onClick={handleSave} disabled={saving}>
                    <Save className="h-4 w-4 mr-1" /> {saving ? t("profile.saving") : t("common.save")}
                  </Button>
                  <Button variant="outline" onClick={() => setEditing(false)}>{t("common.cancel")}</Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Activity & Sessions */}
      <Card className="border-border/50 shadow-sm">
        <CardContent className="p-6 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <h2 className="text-lg font-heading font-semibold text-foreground flex items-center gap-2">
                <ActivityIcon className="h-5 w-5 text-primary" /> Activity & Sessions
              </h2>
              <p className="text-sm text-muted-foreground">Login times, hours, and what you did in the system</p>
            </div>
            <div className="flex items-end gap-2 flex-wrap">
              <div>
                <Label className="text-xs text-muted-foreground">From</Label>
                <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="h-9" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">To</Label>
                <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="h-9" />
              </div>
              {(fromDate || toDate) && (
                <Button variant="outline" size="sm" onClick={() => { setFromDate(""); setToDate(""); }}>Clear</Button>
              )}
            </div>
          </div>

          {/* Summary tiles */}
          {(() => {
            const totalMins = sessions.reduce((s, x) => s + (x.duration_minutes || 0), 0);
            const hrs = Math.floor(totalMins / 60);
            const mins = totalMins % 60;
            const completed = sessions.filter((s) => s.logout_at).length;
            return (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="rounded-lg border border-border/50 p-4">
                  <p className="text-xs text-muted-foreground flex items-center gap-1"><LogIn className="h-3 w-3" /> Sessions</p>
                  <p className="text-2xl font-heading font-bold mt-1">{sessions.length}</p>
                </div>
                <div className="rounded-lg border border-border/50 p-4">
                  <p className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" /> Total time</p>
                  <p className="text-2xl font-heading font-bold mt-1">{hrs}h {mins}m</p>
                </div>
                <div className="rounded-lg border border-border/50 p-4">
                  <p className="text-xs text-muted-foreground flex items-center gap-1"><LogOut className="h-3 w-3" /> Completed</p>
                  <p className="text-2xl font-heading font-bold mt-1">{completed}</p>
                </div>
                <div className="rounded-lg border border-border/50 p-4">
                  <p className="text-xs text-muted-foreground flex items-center gap-1"><ActivityIcon className="h-3 w-3" /> Actions</p>
                  <p className="text-2xl font-heading font-bold mt-1">{activities.length}</p>
                </div>
              </div>
            );
          })()}

          <Tabs defaultValue="sessions" className="w-full">
            <TabsList>
              <TabsTrigger value="sessions">Sessions</TabsTrigger>
              <TabsTrigger value="actions">Activity Log</TabsTrigger>
            </TabsList>

            <TabsContent value="sessions" className="mt-4">
              {activityLoading ? (
                <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
              ) : sessions.length === 0 ? (
                <p className="text-sm text-muted-foreground">No sessions in this range.</p>
              ) : (
                <div className="border border-border/50 rounded-lg divide-y divide-border/50 max-h-96 overflow-auto">
                  {sessions.map((s) => {
                    const login = new Date(s.login_at);
                    const logout = s.logout_at ? new Date(s.logout_at) : null;
                    const dur = s.duration_minutes;
                    return (
                      <div key={s.id} className="p-3 flex items-center justify-between gap-3 text-sm">
                        <div className="flex items-center gap-3 min-w-0">
                          <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                          <div className="min-w-0">
                            <p className="font-medium text-foreground">{login.toLocaleDateString()}</p>
                            <p className="text-xs text-muted-foreground">
                              <LogIn className="h-3 w-3 inline mr-1" />{login.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                              {logout && <> &nbsp;→&nbsp; <LogOut className="h-3 w-3 inline mr-1" />{logout.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</>}
                            </p>
                          </div>
                        </div>
                        {logout ? (
                          <Badge variant="secondary">{Math.floor((dur || 0) / 60)}h {(dur || 0) % 60}m</Badge>
                        ) : (
                          <Badge>Active</Badge>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            <TabsContent value="actions" className="mt-4">
              {activityLoading ? (
                <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
              ) : activities.length === 0 ? (
                <p className="text-sm text-muted-foreground">No activity in this range.</p>
              ) : (
                <div className="border border-border/50 rounded-lg divide-y divide-border/50 max-h-96 overflow-auto">
                  {activities.map((a) => {
                    const d = new Date(a.created_at);
                    return (
                      <div key={a.id} className="p-3 flex items-center justify-between gap-3 text-sm">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                            <ActivityIcon className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-foreground truncate">{a.description || a.action}</p>
                            <p className="text-xs text-muted-foreground">{d.toLocaleString()}</p>
                          </div>
                        </div>
                        <Badge variant="outline" className="capitalize whitespace-nowrap">{a.action.replace(/_/g, " ")}</Badge>
                      </div>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProfilePage;

import { useEffect, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User, Pencil, Save, Camera, Mail, AtSign, IdCard, ShieldCheck, Loader2, X, MapPin } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useSettings } from "@/contexts/SettingsContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getAssignedSitio, SUBUKIN_SITIOS } from "@/lib/sitioMapping";

const ProfilePage = () => {
  const { user, userRole } = useAuth();
  const { t } = useSettings();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [assignedSitio, setAssignedSitio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!user) return;
    setEmail(user.email || "");
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("full_name, username, avatar_url, assigned_sitio")
        .eq("user_id", user.id)
        .maybeSingle();

      const fName = data?.full_name || "";
      const uName = data?.username || "";
      setFullName(fName);
      setUsername(uName);
      setAvatarUrl((data as any)?.avatar_url || null);

      let sitio = (data as any)?.assigned_sitio;
      if (!sitio) {
        const { data: wData } = await (supabase.from("bhw_workers") as any)
          .select("assigned_sitio, address, name")
          .eq("user_id", user.id)
          .maybeSingle();
        sitio = wData?.assigned_sitio || wData?.address || getAssignedSitio(fName || uName || "");
      }
      setAssignedSitio(sitio || getAssignedSitio(fName || uName || "") || "Maligaya");
      setLoading(false);
    })();
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .upsert(
        { user_id: user.id, full_name: fullName, username, assigned_sitio: assignedSitio } as any,
        { onConflict: "user_id" }
      );
    await (supabase.from("bhw_workers") as any)
      .update({ assigned_sitio: assignedSitio } as any)
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
      const { error: updErr } = await (supabase.from("profiles") as any).upsert(
        { user_id: user.id, avatar_url: url },
        { onConflict: "user_id" }
      );
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
                  {assignedSitio && (
                    <>
                      <span className="hidden md:inline">•</span>
                      <span className="flex items-center gap-1 text-primary font-semibold">
                        <MapPin className="h-3.5 w-3.5" />Assigned Sitio: {assignedSitio}
                      </span>
                    </>
                  )}
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-border/50">
          <CardContent className="p-5 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t("profile.role") || "Role"}</p>
              <p className="font-semibold text-foreground capitalize">{userRole === "bns" ? "BNS" : userRole === "supervisory" ? "Supervisory" : (userRole || "—")}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardContent className="p-5 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <MapPin className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Assigned Sitio</p>
              <p className="font-semibold text-foreground truncate">{assignedSitio || "—"}</p>
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
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">Assigned Sitio</Label>
                {editing ? (
                  <Select value={assignedSitio} onValueChange={setAssignedSitio}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select Sitio" />
                    </SelectTrigger>
                    <SelectContent>
                      {SUBUKIN_SITIOS.map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="text-foreground font-medium py-2 border-b border-border/50 flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-primary" /> {assignedSitio || "—"}
                  </p>
                )}
              </div>
              <div className="space-y-2">
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
    </div>
  );
};

export default ProfilePage;

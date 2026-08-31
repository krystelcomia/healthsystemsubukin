import { useEffect, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User, Camera, Mail, AtSign, IdCard, ShieldCheck, Loader2, X, MapPin } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useSettings } from "@/contexts/SettingsContext";
import { getThemeStyle } from "@/lib/themeStyles";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { getAssignedSitio } from "@/lib/sitioMapping";

const resizeAvatarImage = (file: File, maxWidth = 380, maxHeight = 380, quality = 0.88): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (readerEvent) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL("image/jpeg", quality));
        } else {
          resolve(readerEvent.target?.result as string);
        }
      };
      img.onerror = () => resolve(readerEvent.target?.result as string);
      img.src = readerEvent.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

const ProfilePage = () => {
  const { user, userRole, updateProfileState } = useAuth();
  const { t } = useSettings();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [assignedSitio, setAssignedSitio] = useState("");
  const [removePhotoConfirm, setRemovePhotoConfirm] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
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

      // Load avatar from profiles table or persistent localStorage
      let persistentAvatar: string | null = (data as any)?.avatar_url || null;
      if (!persistentAvatar) {
        persistentAvatar = 
          localStorage.getItem("bhw_avatar_" + user.id) ||
          (user.email ? localStorage.getItem("bhw_avatar_" + user.email.toLowerCase().trim()) : null) ||
          (uName ? localStorage.getItem("bhw_avatar_" + uName.toLowerCase().trim()) : null);
      }

      if (persistentAvatar) {
        setAvatarUrl(persistentAvatar);
        localStorage.setItem("bhw_avatar_" + user.id, persistentAvatar);
      } else {
        setAvatarUrl(null);
      }

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

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Image file is too large. Please select a photo under 10MB.");
      return;
    }
    setUploading(true);
    try {
      // 1. Resize and optimize image
      const dataUrl = await resizeAvatarImage(file);
      
      // 2. Persist in localStorage across all sessions/logouts
      localStorage.setItem("bhw_avatar_" + user.id, dataUrl);
      if (user.email) {
        localStorage.setItem("bhw_avatar_" + user.email.toLowerCase().trim(), dataUrl);
      }
      if (username) {
        localStorage.setItem("bhw_avatar_" + username.toLowerCase().trim(), dataUrl);
      }

      // 3. Persist in database
      try {
        await (supabase.from("profiles") as any).upsert(
          { user_id: user.id, avatar_url: dataUrl },
          { onConflict: "user_id" }
        );
      } catch (dbErr) {
        console.warn("Profiles avatar upsert notice:", dbErr);
      }

      try {
        await (supabase.from("bhw_workers") as any)
          .update({ avatar_url: dataUrl })
          .eq("user_id", user.id);
      } catch (wErr) {
        if (user.email) {
          await (supabase.from("bhw_workers") as any)
            .update({ avatar_url: dataUrl })
            .eq("gmail", user.email);
        }
      }

      // 4. Update UI & context
      setAvatarUrl(dataUrl);
      updateProfileState({ avatar_url: dataUrl });
      toast.success("Profile picture updated! It will remain saved on your account.");
    } catch (err: any) {
      console.error("Avatar upload error:", err);
      toast.error(err.message || "Failed to update profile picture");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const removeAvatar = async () => {
    if (!user) return;
    try {
      localStorage.removeItem("bhw_avatar_" + user.id);
      if (user.email) localStorage.removeItem("bhw_avatar_" + user.email.toLowerCase().trim());
      if (username) localStorage.removeItem("bhw_avatar_" + username.toLowerCase().trim());

      try {
        await supabase.from("profiles").update({ avatar_url: null } as any).eq("user_id", user.id);
      } catch {}

      try {
        await (supabase.from("bhw_workers") as any).update({ avatar_url: null }).eq("user_id", user.id);
      } catch {}

      setAvatarUrl(null);
      updateProfileState({ avatar_url: null });
      toast.success("Profile picture removed");
    } catch (e: any) {
      toast.error("Failed to remove profile picture");
    } finally {
      setRemovePhotoConfirm(false);
    }
  };

  const initials = (fullName || username || email || "U")
    .split(/\s+/).map((s) => s[0]).slice(0, 2).join("").toUpperCase();

  return (
    <div className="w-full space-y-6">
      {/* Dynamic Theme Banner Header matching Dashboard */}
      <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-r ${getThemeStyle(colorTheme).heroGradient} p-6 md:p-8 text-white shadow-xl border ${getThemeStyle(colorTheme).heroBorder}`}>
        <div className="absolute right-0 top-0 -mt-10 -mr-10 h-64 w-64 rounded-full bg-white/10 blur-3xl pointer-events-none" />
        <div className="absolute left-1/3 bottom-0 h-48 w-48 rounded-full bg-white/5 blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="flex flex-col md:flex-row md:items-center gap-5">
            <div className="relative group shrink-0">
              <Avatar className="h-28 w-28 ring-4 ring-white/20 shadow-xl">
                {avatarUrl && <AvatarImage src={avatarUrl} alt={fullName || "avatar"} />}
                <AvatarFallback className="text-2xl font-heading bg-white/20 text-white font-bold backdrop-blur-md">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="absolute bottom-1 right-1 h-8 w-8 rounded-full bg-white text-slate-900 shadow-lg flex items-center justify-center hover:scale-110 transition-transform disabled:opacity-60"
                aria-label="Change profile picture"
              >
                {uploading ? <Loader2 className="h-4 w-4 animate-spin text-primary" /> : <Camera className="h-4 w-4 text-slate-900" />}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarChange}
              />
            </div>
            <div className="space-y-1.5">
              <div className={`inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-semibold border backdrop-blur-md ${getThemeStyle(colorTheme).badgeStyle}`}>
                <ShieldCheck className="h-3.5 w-3.5" />
                {role ? role.toUpperCase() : "BHW WORKER"}
              </div>
              <h1 className="text-2xl md:text-3xl font-heading font-extrabold text-white tracking-tight">
                {fullName || username || t("profile.title")}
              </h1>
              <div className="flex flex-wrap items-center gap-3 text-xs md:text-sm text-white/80">
                <span className="flex items-center gap-1"><AtSign className="h-3.5 w-3.5" />{username || "—"}</span>
                <span className="hidden md:inline text-white/40">•</span>
                <span className="flex items-center gap-1"><Mail className="h-3.5 w-3.5" />{email}</span>
                {assignedSitio && (
                  <>
                    <span className="hidden md:inline text-white/40">•</span>
                    <span className="flex items-center gap-1 text-emerald-300 font-semibold">
                      <MapPin className="h-3.5 w-3.5" />{t("profile.assignedSitio")}: {assignedSitio}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            {avatarUrl && (
              <Button variant="outline" size="sm" onClick={() => setRemovePhotoConfirm(true)} className="bg-white/10 hover:bg-white/20 text-white border-white/20 text-xs">
                <X className="h-3.5 w-3.5 mr-1" /> {t("profile.removePhoto")}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Stats / Quick info row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-border/50">
          <CardContent className="p-5 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t("profile.role")}</p>
              <p className="font-semibold text-foreground">
                {userRole === "supervisor" || userRole === "supervisory"
                  ? (t("profile.bhwSupervisory") || "BHW Supervisory")
                  : userRole === "midwife"
                  ? (t("profile.midwife") || "Midwife")
                  : userRole === "bns" 
                  ? t("profile.bns") 
                  : t("profile.bhwWorker")}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardContent className="p-5 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <MapPin className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">{t("profile.assignedSitio")}</p>
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
              <p className="text-xs text-muted-foreground">{t("profile.userId")}</p>
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
              <p className="text-xs text-muted-foreground">{t("profile.status")}</p>
              <p className="font-semibold text-foreground">{t("profile.active")}</p>
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
              <p className="text-sm text-muted-foreground">{t("profile.detailsDesc")}</p>
            </div>
          </div>

          {loading ? (
            <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">{t("profile.fullName")}</Label>
                <p className="text-foreground font-medium py-2 border-b border-border/50">{fullName || "—"}</p>
              </div>
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">{t("profile.username")}</Label>
                <p className="text-foreground font-medium py-2 border-b border-border/50">{username || "—"}</p>
              </div>
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">{t("profile.assignedSitio")}</Label>
                <p className="text-foreground font-medium py-2 border-b border-border/50 flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary" /> {assignedSitio || "—"}
                </p>
              </div>
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">{t("profile.email")}</Label>
                <p className="text-foreground font-medium py-2 border-b border-border/50 flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" /> {email}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Remove Photo Confirmation Dialog */}
      <AlertDialog open={removePhotoConfirm} onOpenChange={setRemovePhotoConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove profile picture?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove your profile photo?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                removeAvatar();
                setRemovePhotoConfirm(false);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ProfilePage;

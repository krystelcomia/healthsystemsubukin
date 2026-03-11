import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User, Pencil, Save } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useSettings } from "@/contexts/SettingsContext";

const ProfilePage = () => {
  const { user } = useAuth();
  const { t } = useSettings();
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    setEmail(user.email || "");
    const fetchProfile = async () => {
      const { data } = await supabase.from("profiles").select("full_name, username").eq("user_id", user.id).maybeSingle();
      setFullName(data?.full_name || ""); setUsername(data?.username || ""); setLoading(false);
    };
    fetchProfile();
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update({ full_name: fullName, username }).eq("user_id", user.id);
    if (error) { toast.error("Failed to save profile"); } else { toast.success("Profile updated!"); setEditing(false); }
    setSaving(false);
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold text-foreground flex items-center gap-2"><User className="h-6 w-6 text-primary" />{t("profile.title")}</h1>
        <p className="text-muted-foreground mt-1">{t("profile.desc")}</p>
      </div>

      <Card className="border-border/50 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg font-heading">{t("profile.info")}</CardTitle>
          {!editing && (<Button variant="outline" size="sm" onClick={() => setEditing(true)}><Pencil className="h-4 w-4 mr-1" /> {t("common.edit")}</Button>)}
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (<p className="text-sm text-muted-foreground">{t("common.loading")}</p>) : (
            <>
              <div><Label>{t("profile.username")}</Label>{editing ? (<Input value={username} onChange={(e) => setUsername(e.target.value)} placeholder={t("profile.username")} />) : (<p className="text-foreground mt-1">{username || "—"}</p>)}</div>
              <div><Label>{t("profile.fullName")}</Label>{editing ? (<Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder={t("profile.fullName")} />) : (<p className="text-foreground mt-1">{fullName || "—"}</p>)}</div>
              <div><Label>{t("profile.email")}</Label><p className="text-foreground mt-1">{email}</p></div>
              {editing && (<div className="flex gap-2 pt-2"><Button onClick={handleSave} disabled={saving}><Save className="h-4 w-4 mr-1" /> {saving ? t("profile.saving") : t("common.save")}</Button><Button variant="outline" onClick={() => setEditing(false)}>{t("common.cancel")}</Button></div>)}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ProfilePage;

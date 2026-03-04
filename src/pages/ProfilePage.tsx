import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User, Pencil, Save } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const ProfilePage = () => {
  const { user } = useAuth();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    setEmail(user.email || "");

    const fetchProfile = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("user_id", user.id)
        .maybeSingle();
      setFullName(data?.full_name || "");
      setLoading(false);
    };
    fetchProfile();
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: fullName })
      .eq("user_id", user.id);

    if (error) {
      toast.error("Hindi na-save ang profile: " + error.message);
    } else {
      toast.success("Na-update na ang profile!");
      setEditing(false);
    }
    setSaving(false);
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold text-foreground flex items-center gap-2">
          <User className="h-6 w-6 text-primary" />
          My Profile
        </h1>
        <p className="text-muted-foreground mt-1">Tingnan at i-edit ang iyong profile.</p>
      </div>

      <Card className="border-border/50 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg font-heading">Profile Information</CardTitle>
          {!editing && (
            <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
              <Pencil className="h-4 w-4 mr-1" /> Edit
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : (
            <>
              <div>
                <Label>Full Name</Label>
                {editing ? (
                  <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Enter your full name" />
                ) : (
                  <p className="text-foreground mt-1">{fullName || "—"}</p>
                )}
              </div>
              <div>
                <Label>Email</Label>
                <p className="text-foreground mt-1">{email}</p>
              </div>
              {editing && (
                <div className="flex gap-2 pt-2">
                  <Button onClick={handleSave} disabled={saving}>
                    <Save className="h-4 w-4 mr-1" /> {saving ? "Saving..." : "Save"}
                  </Button>
                  <Button variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ProfilePage;

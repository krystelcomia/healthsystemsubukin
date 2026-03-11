import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Heart, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useSettings } from "@/contexts/SettingsContext";

const ResetPassword = () => {
  const { t } = useSettings();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const hash = window.location.hash;
    if (!hash.includes("type=recovery")) { toast.error("Invalid reset link"); navigate("/auth"); }
  }, [navigate]);

  const handleReset = async () => {
    if (password.length < 6) { toast.error("Password must be at least 6 characters"); return; }
    if (password !== confirmPassword) { toast.error("Passwords do not match"); return; }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) { toast.error(error.message); } else { toast.success("Password updated!"); navigate("/auth"); }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md border-border/50 shadow-lg">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center"><Heart className="h-7 w-7 text-primary" /></div>
          <CardTitle className="text-xl font-heading">{t("reset.title")}</CardTitle>
          <CardDescription>{t("reset.desc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2"><Label>{t("reset.newPassword")}</Label><div className="relative"><Input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" /><button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div></div>
          <div className="space-y-2"><Label>{t("reset.confirmPassword")}</Label><Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="••••••••" /></div>
          <Button className="w-full" onClick={handleReset} disabled={loading}>{loading ? t("reset.updating") : t("reset.updatePassword")}</Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default ResetPassword;

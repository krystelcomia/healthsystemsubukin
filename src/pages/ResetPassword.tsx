import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff, KeyRound, ArrowLeft } from "lucide-react";
import barangayLogo from "@/assets/barangay-logo.png";
import loginBg from "@/assets/login-bg.jpg";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useSettings } from "@/contexts/SettingsContext";

const ResetPassword = () => {
  const { t } = useSettings();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const hash = window.location.hash;
    // Check if recovery token or hash is present
    if (hash && !hash.includes("type=recovery") && !hash.includes("access_token")) {
      toast.error("Invalid or expired reset link");
    }
  }, [navigate]);

  const handleReset = async () => {
    if (password.length < 6) { toast.error("Password must be at least 6 characters"); return; }
    if (password !== confirmPassword) { toast.error("Passwords do not match"); return; }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Password updated successfully! Please sign in with your new password.");
      navigate("/auth");
    }
    setLoading(false);
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: `url(${loginBg})` }}
    >
      <Card className="w-full max-w-md border border-white/20 bg-background/10 backdrop-blur-sm shadow-2xl text-white">
        <CardHeader className="text-center space-y-2">
          <img src={barangayLogo} alt="Barangay Subukin Logo" className="mx-auto h-20 w-20 rounded-full object-cover" />
          <CardTitle className="text-2xl font-heading text-white">{t("reset.title")}</CardTitle>
          <CardDescription className="text-white/80">{t("reset.desc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-white">{t("reset.newPassword")}</Label>
            <div className="relative">
              <Input
                className="bg-background/70 border-border/60 text-slate-900"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-white">{t("reset.confirmPassword")}</Label>
            <div className="relative">
              <Input
                className="bg-background/70 border-border/60 text-slate-900"
                type={showConfirm ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => setShowConfirm(!showConfirm)}
              >
                {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <Button className="w-full gap-2" onClick={handleReset} disabled={loading}>
            <KeyRound className="h-4 w-4" />
            {loading ? t("reset.updating") : t("reset.updatePassword")}
          </Button>

          <Button
            type="button"
            variant="ghost"
            className="w-full text-white/90 hover:text-white hover:bg-white/10 gap-1.5 text-xs"
            onClick={() => navigate("/auth")}
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {t("auth.backToSignIn")}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default ResetPassword;
